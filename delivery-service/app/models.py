from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base


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


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    approval_status = Column(String(50), default="approved")


class DeliveryPartner(Base):
    __tablename__ = "delivery_partners"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    is_available = Column(Boolean, default=True)
    current_order_id = Column(Integer, nullable=True)
    rating = Column(Float, default=0.0)
    total_deliveries = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserAddress(Base):
    __tablename__ = "user_addresses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    label = Column(String(100))
    line1 = Column(Text, nullable=False)
    line2 = Column(Text)
    city = Column(String(100))
    region = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(100), default="US")
    latitude = Column(Float)
    longitude = Column(Float)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    delivery_partner_id = Column(Integer, ForeignKey("delivery_partners.id"), nullable=True)
    total_amount = Column(Float, nullable=False)
    delivery_address = Column(Text, nullable=False)
    order_type = Column(String, default="normal")
    priority_level = Column(String, default="normal")
    priority_score = Column(Float, default=0.0)
    status = Column(String, default="pending")
    special_instructions = Column(Text, nullable=True)
    placed_at = Column(DateTime(timezone=True), server_default=func.now())
    picked_up_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)

    restaurant = relationship("Restaurant")
    delivery_partner = relationship("DeliveryPartner", foreign_keys=[delivery_partner_id])
    assignments = relationship("DeliveryAssignment", back_populates="order")


class DeliveryAssignment(Base):
    __tablename__ = "delivery_assignments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    delivery_partner_id = Column(Integer, ForeignKey("delivery_partners.id"), nullable=False)
    status = Column(String, default="assigned")
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    picked_up_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    eta_minutes = Column(Integer)
    actual_distance_km = Column(Float)

    delivery_partner = relationship("DeliveryPartner")
    order = relationship("Order", back_populates="assignments")


class DeliveryTracking(Base):
    __tablename__ = "delivery_tracking"

    id = Column(Integer, primary_key=True, index=True)
    delivery_assignment_id = Column(Integer, ForeignKey("delivery_assignments.id"), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed_kmh = Column(Float)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    assignment = relationship("DeliveryAssignment")
