from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.lms import User
from app.schemas.auth import UserCreate, UserLogin, UserResponse, Token
from app.api.v1.deps import get_current_user

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == user_in.email))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists in the system."
        )
    
    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role or "student",
        avatar_url=user_in.avatar_url
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/login", response_model=Token)
async def login(
    user_in: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalars().first()
    if not user or not user.hashed_password or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(subject=str(user.id))
    return {"access_token": access_token, "token_type": "bearer"}

from pydantic import BaseModel
from typing import Optional
import uuid

class AzureSSORequest(BaseModel):
    email: str
    full_name: str
    azure_oid: Optional[str] = None

@router.post("/azure-sso", response_model=Token)
async def azure_sso(
    payload: AzureSSORequest,
    db: AsyncSession = Depends(get_db)
):
    # Find existing user by azure_oid or email
    res = await db.execute(
        select(User).where((User.email == payload.email) | (User.azure_oid == payload.azure_oid))
    )
    user = res.scalars().first()

    if not user:
        # Auto-provision user from Microsoft Entra ID
        user = User(
            id=uuid.uuid4(),
            email=payload.email,
            full_name=payload.full_name,
            role="student",
            azure_oid=payload.azure_oid,
            avatar_url="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    elif payload.azure_oid and not user.azure_oid:
        user.azure_oid = payload.azure_oid
        db.add(user)
        await db.commit()

    access_token = create_access_token(subject=str(user.id))
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user)
):
    return current_user

