from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Order, OrderItem
from typing import List, Dict, Any

router = APIRouter(prefix="/api/orders", tags=["orders"])

@router.get("/customer/{customer_id}")
def get_customer_orders(customer_id: str, db: Session = Depends(get_db)):
    """Retrieve all verified database orders for a specific customer."""
    orders = db.query(Order).filter(Order.customer_id == customer_id).order_by(Order.created_at.desc()).all()
    
    result = []
    for o in orders:
        items_data = []
        for item in o.items:
            prod_name = item.product.name if item.product else "Verified Item"
            items_data.append({
                "product_id": item.product_id,
                "name": prod_name,
                "quantity": item.quantity,
                "price": item.price,
                "item_total": item.price * item.quantity
            })
            
        result.append({
            "id": o.id,
            "customer_id": o.customer_id,
            "total_amount": o.total_amount,
            "status": o.status,
            "razorpay_order_id": o.razorpay_order_id,
            "razorpay_payment_id": o.razorpay_payment_id,
            "items": items_data,
            "created_at": o.created_at.isoformat() if o.created_at else None
        })
        
    return result

@router.get("/{order_id}")
def get_order_by_id(order_id: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    items_data = []
    for item in order.items:
        items_data.append({
            "product_id": item.product_id,
            "name": item.product.name if item.product else "Item",
            "quantity": item.quantity,
            "price": item.price
        })
        
    return {
        "id": order.id,
        "customer_id": order.customer_id,
        "total_amount": order.total_amount,
        "status": order.status,
        "razorpay_order_id": order.razorpay_order_id,
        "razorpay_payment_id": order.razorpay_payment_id,
        "items": items_data,
        "created_at": order.created_at.isoformat() if order.created_at else None
    }
