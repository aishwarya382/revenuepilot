from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Product, Order, OrderItem, Campaign, User
from schemas import SimulationApproveRequest
from audit_service import log_event
from auth import get_current_user
import uuid

router = APIRouter(prefix="/api/merchant", tags=["merchant"])

class ProductCreateRequest(BaseModel):
    name: str
    category: str
    price: float
    stock: int = 20
    description: Optional[str] = ""
    image_url: Optional[str] = "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80"

@router.get("/products")
def get_merchant_products(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return all products currently stored in the database."""
    products = db.query(Product).filter(Product.merchant_id == current_user.id).order_by(Product.created_at.desc()).all()
    return products

@router.post("/products")
def create_merchant_product(req: ProductCreateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new product and assign it to the authenticated merchant."""
    new_id = f"prod_{uuid.uuid4().hex[:8]}"
    product = Product(
        id=new_id,
        merchant_id=current_user.id,
        name=req.name.strip(),
        category=req.category.strip(),
        price=float(req.price),
        stock=int(req.stock),
        description=req.description.strip() if req.description else f"{req.name} ({req.category})",
        image_url=req.image_url.strip() if req.image_url else "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80"
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    
    log_event(
        db=db,
        actor_type="MERCHANT",
        actor_id=current_user.id,
        action="Product Published",
        reason=f"Merchant added new product '{product.name}' in category '{product.category}' (Price: ₹{product.price})",
        metadata={"product_id": product.id, "name": product.name, "category": product.category, "price": product.price, "stock": product.stock},
        status="COMPLETED"
    )
    
    return {
        "status": "SUCCESS",
        "message": f"Product '{product.name}' uploaded successfully and is now searchable by AI Shopping Agent!",
        "product": product
    }

@router.delete("/products/{product_id}")
def delete_merchant_product(product_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id, Product.merchant_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or not owned by merchant")
    db.delete(product)
    db.commit()
    return {"status": "SUCCESS", "message": f"Product {product_id} removed"}

@router.get("/orders")
def get_merchant_orders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Retrieve all orders belonging to the authenticated merchant."""
    orders = db.query(Order).filter(Order.merchant_id == current_user.id).order_by(Order.created_at.desc()).all()
    result = []
    for o in orders:
        items = []
        for item in o.items:
            items.append({
                "product_id": item.product_id,
                "name": item.product.name if item.product else "Item",
                "quantity": item.quantity,
                "price": item.price
            })
        result.append({
            "id": o.id,
            "customer_id": o.customer_id,
            "total_amount": o.total_amount,
            "status": o.status,
            "razorpay_order_id": o.razorpay_order_id,
            "razorpay_payment_id": o.razorpay_payment_id,
            "items": items,
            "created_at": o.created_at.isoformat() if o.created_at else None
        })
    return result

@router.get("/insights")
def get_insights(db: Session = Depends(get_db)):
    """Calculate real metrics strictly from the database without fabrication."""
    paid_orders = db.query(Order).filter(Order.status == "PAID").all()
    total_sales = sum(o.total_amount for o in paid_orders)
    total_orders_count = db.query(Order).count()
    paid_orders_count = len(paid_orders)
    products_count = db.query(Product).count()
    customers_count = db.query(User).filter(User.role == "customer").count()
    
    # Check if there is enough data
    has_sufficient_data = paid_orders_count > 0 or total_orders_count > 0
    
    # Calculate real conversion if data exists
    conversion_rate = f"{(paid_orders_count / total_orders_count * 100):.1f}%" if total_orders_count > 0 else "Not enough data yet"
    
    # Generate opportunities grounded in real products in catalog
    top_products = db.query(Product).order_by(Product.stock.desc()).limit(3).all()
    opportunities = []
    for idx, p in enumerate(top_products):
        opportunities.append({
            "id": f"opp_0{idx+1}",
            "target": f"{p.category} Category Growth",
            "observation": f"{p.name} currently has {p.stock} units in inventory at ₹{int(p.price):,}.",
            "recommended_action": f"Launch promotional bundle or target recommendation for {p.category}",
            "expected_impact": f"Potential revenue lift for {p.name}",
            "action_type": "BUNDLE_PROMO",
            "product_id": p.id,
            "discount_val": 1000.0 if p.price > 10000 else 200.0
        })

    active_campaigns = db.query(Campaign).filter(Campaign.status == "ACTIVE").all()
    campaigns_data = [{
        "id": c.id,
        "name": c.name,
        "type": c.type,
        "status": c.status,
        "expected_revenue": c.expected_revenue,
        "actual_revenue": c.actual_revenue,
        "created_at": c.created_at.isoformat() if c.created_at else None
    } for c in active_campaigns]

    return {
        "has_data": has_sufficient_data,
        "metrics": {
            "total_sales": total_sales,
            "total_orders": total_orders_count,
            "paid_orders": paid_orders_count,
            "active_catalog_products": products_count,
            "registered_customers": customers_count,
            "conversion_rate": conversion_rate,
            "status_notice": "Real-time metrics computed directly from database." if has_sufficient_data else "Not enough data yet. Metrics will update when customers complete purchases."
        },
        "next_best_actions": opportunities,
        "active_campaigns": campaigns_data
    }

@router.post("/approve-campaign")
def approve_campaign(req: SimulationApproveRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    campaign = Campaign(
        id=f"camp_{uuid.uuid4().hex[:8]}",
        merchant_id=current_user.id,
        name=req.title or "Approved Campaign",
        type="BUNDLE_PROMO",
        status="ACTIVE",
        expected_revenue=req.expected_revenue or 180000.0,
        actual_revenue=0.0
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    log_event(
        db=db,
        actor_type="MERCHANT",
        actor_id=current_user.id,
        action="Campaign approved by merchant",
        reason=f"Merchant approved campaign '{campaign.name}'",
        metadata={"campaign_id": campaign.id, "expected_revenue": campaign.expected_revenue},
        status="COMPLETED"
    )

    return {
        "status": "APPROVED",
        "campaign_id": campaign.id,
        "message": f"Campaign '{campaign.name}' is now active on storefront!"
    }
