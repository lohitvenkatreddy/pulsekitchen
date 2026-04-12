from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Enum as SQLEnum
from sqlalchemy.sql import func
import enum
from .database import Base


class User(Base):
    """Minimal projection of `users` for lookups from this service."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255))
    phone_number = Column(String(50))


class NotificationType(str, enum.Enum):
    ORDER_CONFIRMED = "order_confirmed"
    ORDER_PREPARING = "order_preparing"
    ORDER_OUT_FOR_DELIVERY = "order_out_for_delivery"
    ORDER_DELIVERED = "order_delivered"
    ORDER_CANCELLED = "order_cancelled"
    PAYMENT_SUCCESS = "payment_success"
    PAYMENT_FAILED = "payment_failed"
    PROMOTION = "promotion"
    GENERAL = "general"


class NotificationChannel(str, enum.Enum):
    PUSH = "push"
    SMS = "sms"
    EMAIL = "email"
    IN_APP = "in_app"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)  # References user-service
    order_id = Column(Integer, nullable=True)  # References order-service

    # Notification content
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(SQLEnum(NotificationType), default=NotificationType.GENERAL)

    # Delivery channels
    sent_via_push = Column(Boolean, default=False)
    sent_via_sms = Column(Boolean, default=False)
    sent_via_email = Column(Boolean, default=False)

    # Status
    is_read = Column(Boolean, default=False)
    is_delivered = Column(Boolean, default=False)

    # Metadata
    data = Column(Text)  # JSON string for additional data

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)

    # No relationships - user and order are in other services


class PushToken(Base):
    __tablename__ = "push_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)  # References user-service
    token = Column(String, nullable=False, unique=True)
    device_type = Column(String)  # ios, android
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    # No relationships - user is in another service


class NotificationTemplate(Base):
    __tablename__ = "notification_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    notification_type = Column(SQLEnum(NotificationType), nullable=False)
    channel = Column(SQLEnum(NotificationChannel), nullable=False)

    # Template content
    subject = Column(String(255))  # For email
    body = Column(Text, nullable=False)

    # Variables that can be used in template (stored as JSON list)
    variables = Column(Text)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
