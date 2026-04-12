from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class NotificationType(str, Enum):
    ORDER_CONFIRMED = "order_confirmed"
    ORDER_PREPARING = "order_preparing"
    ORDER_OUT_FOR_DELIVERY = "order_out_for_delivery"
    ORDER_DELIVERED = "order_delivered"
    ORDER_CANCELLED = "order_cancelled"
    PAYMENT_SUCCESS = "payment_success"
    PAYMENT_FAILED = "payment_failed"
    PROMOTION = "promotion"
    GENERAL = "general"


class NotificationChannel(str, Enum):
    PUSH = "push"
    SMS = "sms"
    EMAIL = "email"
    IN_APP = "in_app"


class NotificationCreate(BaseModel):
    user_id: int
    order_id: Optional[int] = None
    title: str
    message: str
    notification_type: Optional[NotificationType] = NotificationType.GENERAL
    channels: Optional[List[NotificationChannel]] = [NotificationChannel.IN_APP]
    data: Optional[Dict[str, Any]] = None


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    order_id: Optional[int]
    title: str
    message: str
    notification_type: NotificationType
    is_read: bool
    is_delivered: bool
    created_at: datetime
    delivered_at: Optional[datetime]

    class Config:
        from_attributes = True


class PushNotificationRequest(BaseModel):
    user_id: int
    title: str
    message: str
    data: Optional[Dict[str, Any]] = None
    order_id: Optional[int] = None


class SMSRequest(BaseModel):
    phone_number: str
    message: str


class EmailRequest(BaseModel):
    to_email: EmailStr
    subject: str
    body: str
    html_body: Optional[str] = None


class BulkNotificationRequest(BaseModel):
    user_ids: List[int]
    title: str
    message: str
    notification_type: Optional[NotificationType] = NotificationType.GENERAL


class RegisterPushTokenRequest(BaseModel):
    user_id: int
    token: str
    device_type: str = "android"  # ios or android
