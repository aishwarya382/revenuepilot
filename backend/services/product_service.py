from sqlalchemy.orm import Session
from sqlalchemy import func
from models import Product
from typing import List, Optional


def search_products(
    db: Session,
    category: Optional[str] = None,
    budget_min: Optional[float] = None,
    budget_max: Optional[float] = None,
    limit: int = 20,
) -> List[Product]:
    query = db.query(Product).filter(Product.stock > 0)
    if category:
        # Perform case‑insensitive category matching
        query = query.filter(func.lower(Product.category) == category.lower())
    if budget_min is not None:
        query = query.filter(Product.price >= budget_min)
    if budget_max is not None:
        query = query.filter(Product.price <= budget_max)
    return query.limit(limit).all()


def get_product_by_id(db: Session, product_id: str) -> Product:
    return db.query(Product).filter(Product.id == product_id).first()


def compare_products(db: Session, product_ids: List[str]) -> List[Product]:
    return db.query(Product).filter(Product.id.in_(product_ids)).all()


def check_stock(db: Session, product_id: str) -> int:
    product = db.query(Product).filter(Product.id == product_id).first()
    return product.stock if product else 0


def get_related_products(db: Session, product_id: str, limit: int = 5) -> List[Product]:
    # Simple relation: other products in same category, excluding the product itself
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return []
    related = (
        db.query(Product)
        .filter(Product.category == product.category, Product.id != product_id, Product.stock > 0)
        .limit(limit)
        .all()
    )
    return related
