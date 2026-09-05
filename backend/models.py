import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, ForeignKey, Text, DateTime, Boolean
from sqlalchemy.orm import relationship
from database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="customer") # "customer" or "merchant"
    created_at = Column(DateTime, default=datetime.utcnow)

    carts = relationship("Cart", back_populates="customer")
    orders = relationship("Order", back_populates="customer")

class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=generate_uuid)
    merchant_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    stock = Column(Integer, default=50)
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Cart(Base):
    __tablename__ = "carts"

    id = Column(String, primary_key=True, default=generate_uuid)
    customer_id = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="ACTIVE") # "ACTIVE", "CHECKOUT", "COMPLETED"

    customer = relationship("User", back_populates="carts")
    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")

class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    cart_id = Column(String, ForeignKey("carts.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, default=1)
    price = Column(Float, nullable=False)

    cart = relationship("Cart", back_populates="items")
    product = relationship("Product")

class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, default=generate_uuid)
    customer_id = Column(String, ForeignKey("users.id"), nullable=False)
    merchant_id = Column(String, ForeignKey("users.id"), nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(String, default="CREATED") # "CREATED", "PAID", "FAILED"
    razorpay_order_id = Column(String, nullable=True, index=True)
    razorpay_payment_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    order_id = Column(String, ForeignKey("orders.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, default=1)
    price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")

class AIRecommendation(Base):
    __tablename__ = "ai_recommendations"

    id = Column(String, primary_key=True, default=generate_uuid)
    customer_id = Column(String, ForeignKey("users.id"), nullable=True)
    recommendation_type = Column(String, nullable=False) # "BUNDLE", "PRODUCT_MATCH", "UPSELL"
    reason = Column(Text, nullable=False)
    products = Column(Text, nullable=False) # JSON array of product IDs or names
    predicted_conversion = Column(Float, default=0.72)
    created_at = Column(DateTime, default=datetime.utcnow)

class Simulation(Base):
    __tablename__ = "simulations"

    id = Column(String, primary_key=True, default=generate_uuid)
    merchant_id = Column(String, ForeignKey("users.id"), nullable=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=True)
    intervention = Column(String, nullable=False) # "BUNDLE", "DISCOUNT", "FREE_ACCESSORY"
    predicted_conversion = Column(Float, default=0.75)
    predicted_revenue = Column(Float, nullable=False)
    status = Column(String, default="PENDING") # "PENDING", "APPROVED", "REJECTED"
    created_at = Column(DateTime, default=datetime.utcnow)

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(String, primary_key=True, default=generate_uuid)
    merchant_id = Column(String, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False) # "BUNDLE_PROMO", "CART_RECOVERY", "CROSS_SELL"
    status = Column(String, default="ACTIVE") # "ACTIVE", "COMPLETED"
    expected_revenue = Column(Float, nullable=False)
    actual_revenue = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    actor_type = Column(String, nullable=False) # "CUSTOMER", "MERCHANT", "AI_AGENT", "CHECKOUT_AGENT"
    actor_id = Column(String, nullable=True)
    action = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True)
    status = Column(String, default="COMPLETED") # "COMPLETED", "FAILED", "PENDING"
    created_at = Column(DateTime, default=datetime.utcnow)
