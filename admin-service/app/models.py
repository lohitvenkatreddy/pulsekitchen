from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Numeric, Float
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255))
    full_name = Column(String(255))
    phone_number = Column(String(20))
    role = Column(String(50))
    is_active = Column(Boolean)
    is_verified = Column(Boolean)
    created_at = Column(DateTime(timezone=True))


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    restaurant_id = Column(Integer)
    status = Column(String(50))
    total_amount = Column(Float)
    priority_score = Column(Float)
    priority_level = Column(String(50))
    placed_at = Column(DateTime(timezone=True))
    confirmed_at = Column(DateTime(timezone=True))


class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True)
    owner_user_id = Column(Integer)
    name = Column(String(255))
    approval_status = Column(String(50))
    is_open = Column(Boolean)
    is_public = Column(Boolean)
    is_active = Column(Boolean)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    actor_user_id = Column(Integer)
    action = Column(String(100))
    resource_type = Column(String(50))
    resource_id = Column(Integer)
    details = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    title = Column(String(255))
    message = Column(Text)
    notification_type = Column(String(50))
    created_at = Column(DateTime(timezone=True))


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer)
    user_id = Column(Integer)
    total_amount = Column(Numeric(10, 2))
    status = Column(String(50))
    payment_method = Column(String(50))
    created_at = Column(DateTime(timezone=True))


class DeliveryAssignment(Base):
    __tablename__ = "delivery_assignments"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer)
    delivery_partner_id = Column(Integer)
    status = Column(String(50))
    eta_minutes = Column(Integer)
