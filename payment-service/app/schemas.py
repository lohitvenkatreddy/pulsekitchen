from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class PaymentMethod(str, Enum):
    CARD = "card"
    UPI = "upi"
    WALLET = "wallet"
    CASH_ON_DELIVERY = "cash_on_delivery"
    NET_BANKING = "net_banking"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class PriorityType(str, Enum):
    NORMAL = "normal"
    HOSPITAL_EMERGENCY = "hospital_emergency"
    STUDENT_URGENT = "student_urgent"
    TRAVEL_EMERGENCY = "travel_emergency"
    VIP = "vip"


class PaymentCreate(BaseModel):
    order_id: int
    user_id: int
    amount: float
    payment_method: PaymentMethod
    priority_type: Optional[PriorityType] = PriorityType.NORMAL

    # Card details (for CARD payment method)
    card_token: Optional[str] = None
    card_last_four: Optional[str] = None
    card_brand: Optional[str] = None

    # UPI details (for UPI payment method)
    upi_id: Optional[str] = None

    # Metadata
    metadata: Optional[Dict[str, Any]] = None


class PaymentResponse(BaseModel):
    id: int
    order_id: int
    user_id: int
    amount: float
    currency: str
    payment_method: PaymentMethod
    priority_fee: float
    total_amount: float
    status: PaymentStatus
    transaction_id: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class PaymentIntentCreate(BaseModel):
    order_id: int
    amount: float
    priority_type: Optional[PriorityType] = PriorityType.NORMAL


class PaymentIntentResponse(BaseModel):
    client_secret: str
    order_id: int
    amount: float
    priority_fee: float
    total_amount: float
    currency: str


class RefundCreate(BaseModel):
    payment_id: int
    amount: Optional[float] = None  # Full refund if not specified
    reason: str


class RefundResponse(BaseModel):
    id: int
    payment_id: int
    amount: float
    reason: str
    status: str
    created_at: datetime
    processed_at: Optional[datetime]

    class Config:
        from_attributes = True


class SavedCardCreate(BaseModel):
    user_id: int
    card_token: str
    card_last_four: str
    card_brand: str
    card_exp_month: int
    card_exp_year: int
    is_default: bool = False


class SavedCardResponse(BaseModel):
    id: int
    method_type: str
    card_last_four: str
    card_brand: str
    card_exp_month: int
    card_exp_year: int
    is_default: bool

    class Config:
        from_attributes = True
