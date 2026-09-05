from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from schemas import ChatQueryRequest
from ai_service import process_customer_query

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.post("/chat")
def chat_ai(req: ChatQueryRequest, customer_id: Optional[str] = "cust_demo_01", db: Session = Depends(get_db)):
    result = process_customer_query(db=db, user_message=req.message, customer_id=customer_id)
    return result

# Direct endpoint to support `/api/chat` as called by some frontend components
@router.post("/process")
def process_ai(req: ChatQueryRequest, customer_id: Optional[str] = "cust_demo_01", db: Session = Depends(get_db)):
    result = process_customer_query(db=db, user_message=req.message, customer_id=customer_id)
    return result
