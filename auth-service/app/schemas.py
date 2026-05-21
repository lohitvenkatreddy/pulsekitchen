from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    CUSTOMER = "customer"
    RESTAURANT = "restaurant"
    DELIVERY_PARTNER = "delivery_partner"
    ADMIN = "admin"


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    phone_number: Optional[str] = None
    role: UserRole = UserRole.CUSTOMER
    email_otp: Optional[str] = Field(None, min_length=6, max_length=6)


class RestaurantOwnerRegistration(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    phone_number: Optional[str] = None
    restaurant_name: str = Field(..., min_length=2)
    restaurant_address: str = Field(..., min_length=5)
    cuisine_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class DeliveryPartnerRegistration(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    phone_number: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class SignupOTPRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2)


class SignupOTPResponse(BaseModel):
    message: str
    expires_in_minutes: int


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    phone_number: Optional[str]
    role: UserRole
    approval_status: Optional[ApprovalStatus] = ApprovalStatus.APPROVED
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
