import re
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserCreate, UserLogin, UserResponse, TokenResponse
from auth import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

def validate_email_format(email: str):
    if not email or not EMAIL_REGEX.match(email.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format. Please provide a valid email address."
        )

@router.post("/signup", response_model=TokenResponse)
@router.post("/register", response_model=TokenResponse)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new customer or merchant user with Argon2 password hashing and generate JWT."""
    name = user_in.name.strip() if user_in.name else ""
    if len(name) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter your full name (at least 2 characters)."
        )

    clean_email = user_in.email.strip().lower()
    validate_email_format(clean_email)

    if not user_in.password or len(user_in.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    if user_in.confirm_password and user_in.password != user_in.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match. Please verify your password."
        )

    target_role = (user_in.role or "customer").strip().lower()
    if target_role not in ["customer", "merchant"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role specified. Allowed roles are 'customer' or 'merchant'."
        )

    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please log in instead."
        )

    user_id = f"{'merchant' if target_role == 'merchant' else 'cust'}_{uuid.uuid4().hex[:12]}"
    merchant_id = user_id if target_role == "merchant" else None

    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        id=user_id,
        name=name,
        email=clean_email,
        password_hash=hashed_pwd,
        role=target_role,
        merchant_id=merchant_id,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={
        "sub": user.id,
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "merchant_id": user.merchant_id
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserResponse.from_orm(user)
    }

@router.post("/login", response_model=TokenResponse)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    """Authenticate a user, verify password hash, validate role, and return JWT."""
    clean_email = user_in.email.strip().lower()
    validate_email_format(clean_email)

    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if not verify_password(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if not getattr(user, 'is_active', True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is currently inactive."
        )

    # Role validation if provided
    if user_in.role:
        req_role = user_in.role.strip().lower()
        if user.role != req_role:
            registered_role_name = "Merchant" if user.role == "merchant" else "Customer"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This account is registered as a {registered_role_name}."
            )

    token = create_access_token(data={
        "sub": user.id,
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "merchant_id": user.merchant_id
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserResponse.from_orm(user)
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve the currently authenticated user based on JWT token."""
    return current_user

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """Logout endpoint for structured session clearance."""
    return {
        "status": "SUCCESS",
        "message": "Successfully logged out."
    }
