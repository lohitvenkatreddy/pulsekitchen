from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from .database import Base


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY_FOR_PICKUP = "ready_for_pickup"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class PriorityLevel(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    discount_type = Column(String(20), nullable=False)
    discount_value = Column(Float, nullable=False)
    min_order_amount = Column(Float, default=0)
    max_uses = Column(Integer)
    uses_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)


class User(Base):
    """Minimal `users` row mapping for relationship resolution."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True)


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    delivery_partner_id = Column(Integer, ForeignKey("delivery_partners.id"), nullable=True)

    # Order details
    items = Column(Text, nullable=False)  # JSON string of order items
    total_amount = Column(Float, nullable=False)
    delivery_address = Column(Text, nullable=False)  # JSON string with address details

    # Priority scoring (store as string to match seeded PostgreSQL schema)
    priority_level = Column(
        SQLEnum(PriorityLevel, native_enum=False, length=50),
        default=PriorityLevel.NORMAL,
    )
    priority_score = Column(Float, default=0.0)
    urgency_score = Column(Float, default=0.0)
    distance_score = Column(Float, default=0.0)
    waiting_time_score = Column(Float, default=0.0)

    # Status tracking
    status = Column(
        SQLEnum(OrderStatus, native_enum=False, length=50),
        default=OrderStatus.PENDING,
    )
    special_instructions = Column(Text, nullable=True)

    # Timestamps
    placed_at = Column(DateTime(timezone=True), server_default=func.now())
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    picked_up_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", backref="orders", foreign_keys=[user_id])
    restaurant = relationship("Restaurant", backref="orders", foreign_keys=[restaurant_id])
    delivery_partner = relationship(
        "DeliveryPartner",
        foreign_keys=[delivery_partner_id],
        overlaps="user,orders",
    )


class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(Text, nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    cuisine_type = Column(String)
    rating = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DeliveryPartner(Base):
    __tablename__ = "delivery_partners"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    is_available = Column(Boolean, default=True)
    current_order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    rating = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])
