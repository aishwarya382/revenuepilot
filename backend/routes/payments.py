from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from database import get_db
from razorpay_service import create_order as razorpay_create_order, verify_payment_signature
from audit_service import log_event
from models import Order, OrderItem, Cart, CartItem, Product
from services.agent_tools import clear_cart
import uuid

router = APIRouter(tags=["payments"])

class CreatePaymentOrderRequest(BaseModel):
    amount: float
    customer_id: Optional[str] = "cust_demo_01"
    items: Optional[List[Dict[str, Any]]] = []

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: Optional[str] = None
    customer_id: Optional[str] = "cust_demo_01"

class SimulateFailureRequest(BaseModel):
    razorpay_order_id: str
    amount: float
    reason: Optional[str] = "Test payment failure (Gateway timeout)"
    customer_id: Optional[str] = "cust_demo_01"


def _handle_create_order(req: CreatePaymentOrderRequest, db: Session):
    order_data = razorpay_create_order(req.amount)
    
    order = Order(
        id=f"ord_{uuid.uuid4().hex[:10]}",
        customer_id=req.customer_id or "cust_demo_01",
        total_amount=req.amount,
        status="CREATED",
        razorpay_order_id=order_data["id"]
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # Save order items if provided
    if req.items:
        for it in req.items:
            prod_id = it.get("product_id") or it.get("id")
            if prod_id:
                # verify product
                prod = db.query(Product).filter(Product.id == prod_id).first()
                if prod:
                    qty = int(it.get("quantity", 1))
                    price = float(it.get("price", prod.price))
                    order_item = OrderItem(
                        id=f"oi_{uuid.uuid4().hex[:10]}",
                        order_id=order.id,
                        product_id=prod.id,
                        quantity=qty,
                        price=price
                    )
                    db.add(order_item)
        db.commit()

    log_event(
        db=db,
        actor_type="CHECKOUT_AGENT",
        actor_id=req.customer_id or "cust_demo_01",
        action="Razorpay Test Order Initiated",
        reason=f"Customer initiated checkout for amount ₹{req.amount:,.2f}",
        metadata={"razorpay_order_id": order_data["id"], "amount": req.amount, "item_count": len(req.items)},
        status="COMPLETED"
    )

    order_data["db_order_id"] = order.id
    order_data["customer_id"] = order.customer_id
    return order_data


def _handle_verify_payment(req: VerifyPaymentRequest, db: Session):
    is_valid = verify_payment_signature(req.razorpay_order_id, req.razorpay_payment_id, req.razorpay_signature)
    
    order = db.query(Order).filter(Order.razorpay_order_id == req.razorpay_order_id).first()
    if order:
        order.status = "PAID" if is_valid else "FAILED"
        order.razorpay_payment_id = req.razorpay_payment_id
        db.commit()

        # If payment succeeded, clear the customer's active cart
        if is_valid:
            clear_cart(db, order.customer_id)

    log_event(
        db=db,
        actor_type="CHECKOUT_AGENT",
        actor_id=req.customer_id or "cust_demo_01",
        action="Razorpay Payment Verified",
        reason=f"Verified payment signature for Razorpay Order {req.razorpay_order_id}",
        metadata={"order_id": req.razorpay_order_id, "payment_id": req.razorpay_payment_id, "status": "PAID" if is_valid else "FAILED"},
        status="COMPLETED" if is_valid else "FAILED"
    )

    return {
        "status": "SUCCESS" if is_valid else "FAILED",
        "message": "Payment verified and recorded in database!" if is_valid else "Payment verification failed",
        "order_id": req.razorpay_order_id,
        "payment_id": req.razorpay_payment_id,
        "db_order_id": order.id if order else None
    }


# Endpoints under /api/payments and /api/razorpay
@router.post("/api/payments/create-order")
@router.post("/api/razorpay/create-order")
def create_order_endpoint(req: CreatePaymentOrderRequest, db: Session = Depends(get_db)):
    return _handle_create_order(req, db)


@router.post("/api/payments/verify")
@router.post("/api/razorpay/verify-payment")
def verify_payment_endpoint(req: VerifyPaymentRequest, db: Session = Depends(get_db)):
    return _handle_verify_payment(req, db)


@router.post("/api/payments/simulate-failure")
def simulate_failure_endpoint(req: SimulateFailureRequest, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.razorpay_order_id == req.razorpay_order_id).first()
    if order:
        order.status = "FAILED"
        db.commit()

    log_event(
        db=db,
        actor_type="CHECKOUT_AGENT",
        actor_id=req.customer_id or "cust_demo_01",
        action="Payment Failed",
        reason=f"Razorpay test payment failed: {req.reason}",
        metadata={"order_id": req.razorpay_order_id, "automatic_retry": False},
        status="FAILED"
    )

    return {
        "status": "FAILED",
        "error_code": "PAYMENT_FAILED",
        "reason": req.reason,
        "razorpay_order_id": req.razorpay_order_id,
        "ai_explanation": {
            "title": "Payment Didn't Go Through",
            "message": f"Gateway simulation: {req.reason}. No funds were charged to your account.",
            "automatic_retry": False,
            "customer_approval": "REQUIRED",
            "options": [
                {"id": "retry", "label": "Retry Payment", "primary": True},
                {"id": "cancel", "label": "Cancel Order", "primary": False}
            ]
        }
    }
