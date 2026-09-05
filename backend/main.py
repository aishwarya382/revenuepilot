import pydantic_patch
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal, get_db
from models import Product, User, AuditLog
from auth import get_password_hash
from schemas import ChatQueryRequest
from ai_service import process_customer_query

# Import routers
from routes.auth import router as auth_router
from routes.products import router as products_router
from routes.cart import router as cart_router
from routes.orders import router as orders_router
from routes.payments import router as payments_router
from routes.ai import router as ai_router
from routes.products_search import router as products_search_router
from routes.merchant import router as merchant_router
from routes.audit import router as audit_router

app = FastAPI(
    title="Revenue Pilot AI Commerce Platform API",
    description="Tool-using AI shopping agent grounded in SQLite / SQLAlchemy database with Razorpay Test Mode integration",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all modular routers
app.include_router(auth_router)
app.include_router(products_router)
app.include_router(cart_router)
app.include_router(orders_router)
app.include_router(payments_router)
app.include_router(ai_router)
app.include_router(products_search_router)
app.include_router(merchant_router)
app.include_router(audit_router)

# Direct Compatibility Endpoints
@app.post("/api/chat")
def chat_direct(req: ChatQueryRequest, db: Session = Depends(get_db)):
    """Direct route for AI Agent natural language shopping assistant."""
    return process_customer_query(db=db, user_message=req.message)

@app.get("/api/audit-logs")
def get_audit_logs_direct(db: Session = Depends(get_db)):
    """Direct route to retrieve audit trail logs."""
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(50).all()
    return {
        "audit_logs": [
            {
                "id": log.id,
                "timestamp": log.created_at.strftime("%H:%M:%S") if log.created_at else "Just now",
                "agent": log.actor_type,
                "action": log.action,
                "reason": log.reason,
                "status": log.status,
                "metadata": log.metadata_json
            } for log in logs
        ]
    }

@app.on_event("startup")
def startup_event():
    # Create tables
    Base.metadata.create_all(bind=engine)

    # Seed products if catalog is empty
    db = SessionLocal()
    if db.query(Product).count() == 0:
        seed_products = [
            Product(
                id="prod_laptop_01",
                name="HP Pavilion Plus 14 (ZenBook Edition)",
                category="Laptop",
                price=60000.0,
                stock=25,
                description="Intel i5 13th Gen • 16GB RAM • 512GB SSD • 14hr Battery. Perfect for programming, work, and college.",
                image_url="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=600&q=80"
            ),
            Product(
                id="prod_mouse_01",
                name="ErgoGrip Wireless Silent Mouse",
                category="Accessories",
                price=1500.0,
                stock=60,
                description="Ergonomic dual-mode Bluetooth & 2.4Ghz silent click mouse with 24-month battery life.",
                image_url="https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80"
            ),
            Product(
                id="prod_cake_01",
                name="Chocolate Fudge Truffle Cake (1kg)",
                category="Cake",
                price=1500.0,
                stock=30,
                description="Rich Belgian chocolate truffle cake with smooth dark chocolate ganache. Freshly baked.",
                image_url="https://images.unsplash.com/photo-1604948092472-ec53b69b5e1c?auto=format&fit=crop&w=600&q=80"
            ),
            Product(
                id="prod_bag_01",
                name="ShieldPack Anti-Theft Water-Resistant Bag",
                category="Bags",
                price=2000.0,
                stock=40,
                description="Premium ergonomic backpack with padded 15.6\" laptop compartment, USB charging port, and water-repellent fabric.",
                image_url="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80"
            ),
            Product(
                id="prod_laptop_02",
                name="Titanium RTX Gaming Beast 16",
                category="Laptop",
                price=120000.0,
                stock=10,
                description="Intel i9 14th Gen • RTX 4070 8GB GPU • 32GB DDR5 RAM • 1TB NVMe Gen4 SSD • 240Hz QHD Display.",
                image_url="https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=600&q=80"
            ),
            Product(
                id="prod_headphones_01",
                name="AcousticPro ANC Wireless Gaming Headphones",
                category="Accessories",
                price=4500.0,
                stock=35,
                description="Active noise cancelling wireless gaming headphones with low-latency mode, spatial audio, and 40-hr battery.",
                image_url="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80"
            ),
            Product(
                id="prod_camera_01",
                name="VlogMaster 4K Compact Creator Camera",
                category="Electronics",
                price=45000.0,
                stock=15,
                description="Ultra-compact 4K 60fps creator camera with optical stabilization, flip touchscreen, and external mic input.",
                image_url="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80"
            )
        ]
        db.add_all(seed_products)
        db.commit()

    # Seed or ensure required demo accounts exist in database
    demo_accounts = [
        {
            "id": "merchant_demo_01",
            "name": "Demo Merchant",
            "email": "merchant@revenuepilot.ai",
            "password": "Demo@12345",
            "role": "merchant",
            "merchant_id": "merchant_demo_01"
        },
        {
            "id": "cust_demo_01",
            "name": "Demo Customer",
            "email": "customer@revenuepilot.ai",
            "password": "Demo@12345",
            "role": "customer",
            "merchant_id": None
        },
        {
            "id": "cust_demo_aarav",
            "name": "Aarav Sharma",
            "email": "aarav@college.edu",
            "password": "Demo@12345",
            "role": "customer",
            "merchant_id": None
        },
        {
            "id": "merchant_demo_techstore",
            "name": "TechStore Admin",
            "email": "admin@techstore.in",
            "password": "Demo@12345",
            "role": "merchant",
            "merchant_id": "merchant_demo_01"
        }
    ]

    for acc in demo_accounts:
        existing_user = db.query(User).filter(User.email == acc["email"]).first()
        if not existing_user:
            new_u = User(
                id=acc["id"],
                name=acc["name"],
                email=acc["email"],
                password_hash=get_password_hash(acc["password"]),
                role=acc["role"],
                merchant_id=acc["merchant_id"],
                is_active=True
            )
            db.add(new_u)
        else:
            # Update password hash to ensure Demo@12345 is active and valid Argon2 hash
            existing_user.password_hash = get_password_hash(acc["password"])
            existing_user.role = acc["role"]
            existing_user.is_active = True
            if acc["merchant_id"]:
                existing_user.merchant_id = acc["merchant_id"]
    
    db.commit()
    db.close()

@app.get("/")
def root():
    return {
        "status": "online",
        "system": "Revenue Pilot AI Commerce Platform API",
        "engine": "Tool-Using AI Shopping Agent",
        "database": "SQLite / SQLAlchemy compliant",
        "payment": "Razorpay Test Mode API"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
