from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime

# User Schemas
class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: Optional[str] = "customer"

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str

    class Config:
        orm_mode = True

# Product Schemas
class ProductResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    category: str
    price: float
    stock: int
    image_url: Optional[str]

    class Config:
        orm_mode = True

class ProductCompareRequest(BaseModel):
    product_ids: List[str]

# Razorpay / Payment Schemas
class CreateRazorpayOrderRequest(BaseModel):
    amount: float
    items: Optional[List[Dict[str, Any]]] = []

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: Optional[str] = None

class SimulateFailureRequest(BaseModel):
    razorpay_order_id: str
    amount: float
    reason: Optional[str] = "Test payment failure (Gateway timeout)"

# AI & Simulation Schemas
class ChatQueryRequest(BaseModel):
    message: str

class SimulationApproveRequest(BaseModel):
    simulation_id: str
    title: Optional[str] = "Approved Campaign"
    expected_revenue: Optional[float] = 180000.0
