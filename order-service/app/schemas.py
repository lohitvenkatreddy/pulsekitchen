from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum


class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY_FOR_PICKUP = "ready_for_pickup"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class PriorityLevel(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class OrderItem(BaseModel):
    item_id: int
    name: str
    quantity: int
    price: float
    special_instructions: Optional[str] = None


class OrderCreate(BaseModel):
    user_id: int
    restaurant_id: int
    items: List[OrderItem]
    total_amount: float
    delivery_address: Dict[str, Any]
    pickup_location: Optional[Dict[str, float]] = None
    dropoff_location: Optional[Dict[str, float]] = None
    special_instructions: Optional[str] = None
    is_vip: Optional[bool] = False
    user_type: Optional[str] = "regular"
    order_type: Optional[str] = "normal"
    coupon_code: Optional[str] = None
    tax_rate: Optional[float] = Field(default=0.0, ge=0, le=0.25)
    student_verification_id: Optional[str] = None
    emergency_verification_id: Optional[str] = None


class StudentIdVerificationResponse(BaseModel):
    verified: bool
    score: float
    verification_id: Optional[str] = None
    message: str


class EmergencyVerificationResponse(BaseModel):
    status: str
    message: str
    reasons: Optional[List[str]] = None
    verification_id: Optional[str] = None
    result: Dict[str, Any]


class OrderResponse(BaseModel):
    id: int
    user_id: int
    restaurant_id: int
    delivery_partner_id: Optional[int]
    items: str
    total_amount: float
    delivery_address: str
    order_type: Optional[str] = "normal"
    priority_level: PriorityLevel
    priority_score: float
    urgency_score: float
    distance_score: float
    waiting_time_score: float
    status: OrderStatus
    special_instructions: Optional[str]
    placed_at: datetime
    confirmed_at: Optional[datetime]
    picked_up_at: Optional[datetime]
    delivered_at: Optional[datetime]
    cancelled_at: Optional[datetime]

    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    orders: List[OrderResponse]
    total: int
    skip: int
    limit: int


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class QueuePositionResponse(BaseModel):
    order_id: int
    status: str
    queue_rank: Optional[int] = None
    pending_queue_length: int = 0
    priority_score: float
