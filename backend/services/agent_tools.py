from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from models import Product, Cart, CartItem, Order, OrderItem
import uuid

def search_products(
    db: Session,
    query: Optional[str] = None,
    category: Optional[str] = None,
    max_price: Optional[float] = None,
    min_price: Optional[float] = None,
    brand: Optional[str] = None,
    attributes: Optional[List[str]] = None,
    stock_required: bool = True,
    limit: int = 20,
) -> List[Product]:
    """
    Search database products strictly grounded in SQLAlchemy models.
    Filters by stock, category, price range, and keyword relevance.
    """
    q = db.query(Product)
    
    if stock_required:
        q = q.filter(Product.stock > 0)
        
    if max_price is not None:
        q = q.filter(Product.price <= max_price)
        
    if min_price is not None:
        q = q.filter(Product.price >= min_price)
        
    if category:
        category_clean = category.strip().lower()
        q = q.filter(
            or_(
                func.lower(Product.category) == category_clean,
                func.lower(Product.category).contains(category_clean),
                func.lower(Product.name).contains(category_clean)
            )
        )
        
    if brand:
        brand_clean = brand.strip().lower()
        q = q.filter(
            or_(
                func.lower(Product.name).contains(brand_clean),
                func.lower(Product.description).contains(brand_clean)
            )
        )
        
    all_filtered = q.all()
    
    # If a specific text query was provided, perform relevance filtering and ranking
    if query:
        query_words = [w.strip().lower() for w in query.split() if len(w.strip()) > 1]
        
        # Stopwords to exclude from strict matching
        stopwords = {"under", "around", "below", "above", "with", "need", "want", "find", "show", 
                     "looking", "for", "please", "the", "and", "under", "rs", "inr", "rupees", "budget", "best"}
        significant_keywords = [w for w in query_words if w not in stopwords and not w.isdigit()]
        
        if significant_keywords:
            scored_products = []
            for p in all_filtered:
                name_lower = (p.name or "").lower()
                desc_lower = (p.description or "").lower()
                cat_lower = (p.category or "").lower()
                
                score = 0
                matched_keywords = 0
                for kw in significant_keywords:
                    # Exact match in name gives highest score
                    if kw in name_lower:
                        score += 10
                        matched_keywords += 1
                    # Category match
                    elif kw in cat_lower:
                        score += 8
                        matched_keywords += 1
                    # Description match
                    elif kw in desc_lower:
                        score += 4
                        matched_keywords += 1
                        
                # Only include product if it matches at least one significant keyword
                if matched_keywords > 0:
                    scored_products.append((score, p))
                    
            # Sort by highest relevance score first
            scored_products.sort(key=lambda x: x[0], reverse=True)
            return [p for _, p in scored_products[:limit]]
            
        return all_filtered[:limit]
        
    return all_filtered[:limit]


def get_product(db: Session, product_id: str) -> Optional[Product]:
    """Retrieve a single verified product from the database."""
    return db.query(Product).filter(Product.id == product_id).first()


def compare_products(db: Session, product_ids: List[str]) -> List[Product]:
    """Retrieve multiple products by their verified IDs for side-by-side comparison."""
    if not product_ids:
        return []
    return db.query(Product).filter(Product.id.in_(product_ids)).all()


def check_stock(db: Session, product_id: str, quantity: int = 1) -> Dict[str, Any]:
    """Check stock availability for a specific product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return {"product_id": product_id, "available": False, "stock": 0, "message": "Product not found"}
        
    available = product.stock >= quantity
    return {
        "product_id": product_id,
        "product_name": product.name,
        "available": available,
        "stock": product.stock,
        "requested_quantity": quantity,
        "message": f"{product.name} has {product.stock} units in stock" if available else f"Insufficient stock (only {product.stock} available)"
    }


def get_related_products(db: Session, product_id: str, limit: int = 4) -> List[Product]:
    """Fetch related products in the same category or complementary accessories from DB."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return []
        
    # Same category first
    related = db.query(Product).filter(
        Product.id != product_id,
        Product.category == product.category,
        Product.stock > 0
    ).limit(limit).all()
    
    # If fewer than limit, add accessories if available
    if len(related) < limit and product.category != "Accessories":
        accessories = db.query(Product).filter(
            Product.category == "Accessories",
            Product.id != product_id,
            Product.stock > 0
        ).limit(limit - len(related)).all()
        related.extend(accessories)
        
    return related


def create_cart(db: Session, customer_id: str) -> Cart:
    """Ensure customer has an active Cart in the database."""
    cart = db.query(Cart).filter(Cart.customer_id == customer_id, Cart.status == "ACTIVE").first()
    if not cart:
        cart = Cart(id=f"cart_{uuid.uuid4().hex[:12]}", customer_id=customer_id, status="ACTIVE")
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


def add_to_cart(db: Session, customer_id: str, product_id: str, quantity: int = 1) -> Dict[str, Any]:
    """Add verified product to database cart with verified price."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise ValueError(f"Product {product_id} does not exist in database")
        
    if product.stock < quantity:
        raise ValueError(f"Insufficient stock: {product.name} only has {product.stock} in stock")
        
    cart = create_cart(db, customer_id)
    
    # Check if item already in cart
    existing_item = db.query(CartItem).filter(
        CartItem.cart_id == cart.id,
        CartItem.product_id == product_id
    ).first()
    
    if existing_item:
        existing_item.quantity += quantity
        db.commit()
        db.refresh(existing_item)
        item_id = existing_item.id
    else:
        new_item = CartItem(
            id=f"ci_{uuid.uuid4().hex[:12]}",
            cart_id=cart.id,
            product_id=product_id,
            quantity=quantity,
            price=product.price
        )
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        item_id = new_item.id
        
    return get_cart(db, customer_id)


def get_cart(db: Session, customer_id: str) -> Dict[str, Any]:
    """Retrieve full cart breakdown with live verified prices from DB."""
    cart = db.query(Cart).filter(Cart.customer_id == customer_id, Cart.status == "ACTIVE").first()
    if not cart:
        return {
            "cart_id": None,
            "customer_id": customer_id,
            "items": [],
            "total_amount": 0.0,
            "total_items": 0
        }
        
    items = []
    total_amount = 0.0
    total_items = 0
    
    for item in cart.items:
        prod = item.product
        if prod:
            item_total = prod.price * item.quantity
            items.append({
                "item_id": item.id,
                "product_id": prod.id,
                "name": prod.name,
                "category": prod.category,
                "price": prod.price,
                "quantity": item.quantity,
                "stock": prod.stock,
                "image_url": prod.image_url,
                "item_total": item_total
            })
            total_amount += item_total
            total_items += item.quantity
            
    return {
        "cart_id": cart.id,
        "customer_id": customer_id,
        "items": items,
        "total_amount": total_amount,
        "total_items": total_items
    }


def remove_from_cart(db: Session, customer_id: str, item_id: str) -> Dict[str, Any]:
    """Remove item from customer's active cart in DB."""
    cart = db.query(Cart).filter(Cart.customer_id == customer_id, Cart.status == "ACTIVE").first()
    if cart:
        db.query(CartItem).filter(CartItem.cart_id == cart.id, CartItem.id == item_id).delete()
        db.commit()
    return get_cart(db, customer_id)


def clear_cart(db: Session, customer_id: str) -> Dict[str, Any]:
    """Clear all items from active cart."""
    cart = db.query(Cart).filter(Cart.customer_id == customer_id, Cart.status == "ACTIVE").first()
    if cart:
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
        db.commit()
    return get_cart(db, customer_id)
