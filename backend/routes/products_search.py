from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Optional
from sqlalchemy.orm import Session
from database import get_db
from schemas import ProductResponse, ProductCompareRequest
from services.product_service import (
    search_products,
    get_product_by_id,
    compare_products,
    check_stock,
    get_related_products,
)
from audit_service import log_event

router = APIRouter(prefix="/api/products", tags=["products"])

@router.get("/search", response_model=List[ProductResponse])
def search_endpoint(
    category: Optional[str] = Query(None, description="Product category"),
    budget_min: Optional[float] = Query(None, ge=0, description="Minimum price"),
    budget_max: Optional[float] = Query(None, ge=0, description="Maximum price"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Search products based on filters. Returns only in‑stock items."""
    results = search_products(
        db,
        category=category,
        budget_min=budget_min,
        budget_max=budget_max,
        limit=limit,
    )
    log_event(
        db,
        actor_type="AI_AGENT",
        actor_id="cust_demo_01",
        action="Product search",
        reason="AI performed product search",
        metadata={"category": category, "budget_min": budget_min, "budget_max": budget_max, "limit": limit},
        status="COMPLETED",
    )
    return results

@router.get("/{product_id}", response_model=ProductResponse)
def get_product_endpoint(product_id: str, db: Session = Depends(get_db)):
    product = get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    log_event(
        db,
        actor_type="AI_AGENT",
        actor_id="cust_demo_01",
        action="Get product",
        reason=f"Retrieve product {product_id}",
        metadata={"product_id": product_id},
        status="COMPLETED",
    )
    return product

@router.post("/compare", response_model=List[ProductResponse])
def compare_endpoint(request: ProductCompareRequest, db: Session = Depends(get_db)):
    products = compare_products(db, request.product_ids)
    if not products:
        raise HTTPException(status_code=404, detail="No matching products found")
    log_event(
        db,
        actor_type="AI_AGENT",
        actor_id="cust_demo_01",
        action="Compare products",
        reason="AI compared product IDs",
        metadata={"product_ids": request.product_ids},
        status="COMPLETED",
    )
    return products

@router.get("/{product_id}/stock")
def stock_endpoint(product_id: str, db: Session = Depends(get_db)):
    stock = check_stock(db, product_id)
    log_event(
        db,
        actor_type="AI_AGENT",
        actor_id="cust_demo_01",
        action="Check stock",
        reason=f"Check stock for product {product_id}",
        metadata={"product_id": product_id},
        status="COMPLETED",
    )
    return {"product_id": product_id, "stock": stock}

@router.get("/{product_id}/related", response_model=List[ProductResponse])
def related_endpoint(product_id: str, limit: int = Query(5, ge=1, le=20), db: Session = Depends(get_db)):
    related = get_related_products(db, product_id, limit=limit)
    log_event(
        db,
        actor_type="AI_AGENT",
        actor_id="cust_demo_01",
        action="Get related products",
        reason=f"Fetch related for {product_id}",
        metadata={"product_id": product_id, "limit": limit},
        status="COMPLETED",
    )
    return related
