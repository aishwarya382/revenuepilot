from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from services.agent_tools import (
    get_cart,
    add_to_cart,
    remove_from_cart,
    clear_cart
)
from audit_service import log_event

router = APIRouter(prefix="/api/cart", tags=["cart"])

class AddToCartRequest(BaseModel):
    customer_id: str
    product_id: str
    quantity: int = 1

@router.get("/{customer_id}")
def get_customer_cart_endpoint(customer_id: str, db: Session = Depends(get_db)):
    """Retrieve verified database cart for the customer."""
    return get_cart(db, customer_id)

@router.post("/add")
def add_to_cart_endpoint(req: AddToCartRequest, db: Session = Depends(get_db)):
    """Add verified item to customer's database cart."""
    try:
        updated_cart = add_to_cart(db, req.customer_id, req.product_id, req.quantity)
        
        log_event(
            db=db,
            actor_type="CUSTOMER",
            actor_id=req.customer_id,
            action="Product Added to Cart",
            reason=f"Customer added product {req.product_id} (Qty: {req.quantity}) to active cart",
            metadata={"product_id": req.product_id, "quantity": req.quantity, "new_total": updated_cart["total_amount"]},
            status="COMPLETED"
        )
        return updated_cart
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{customer_id}/items/{item_id}")
def remove_from_cart_endpoint(customer_id: str, item_id: str, db: Session = Depends(get_db)):
    """Remove item from customer's database cart."""
    return remove_from_cart(db, customer_id, item_id)

@router.post("/{customer_id}/clear")
def clear_cart_endpoint(customer_id: str, db: Session = Depends(get_db)):
    """Clear all items from active cart."""
    return clear_cart(db, customer_id)
