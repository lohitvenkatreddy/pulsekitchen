from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator
import enum
from .database import Base


class PaymentMethod(str, enum.Enum):
    CARD = "card"
    UPI = "upi"
    WALLET = "wallet"
    CASH_ON_DELIVERY = "cash_on_delivery"
    NET_BANKING = "net_banking"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class EnumValueString(TypeDecorator):
    impl = String
    cache_ok = True

    def __init__(self, enum_cls, *args, **kwargs):
        self.enum_cls = enum_cls
        super().__init__(*args, **kwargs)

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, self.enum_cls):
            return value.value
        return self.enum_cls(str(value).lower()).value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        normalized = str(value).lower()
        try:
            return self.enum_cls(normalized)
        except ValueError:
            return self.enum_cls[str(value).upper()]


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, unique=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Payment details
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    payment_method = Column(EnumValueString(PaymentMethod, length=50), nullable=False)

    # Priority delivery fee
    priority_fee = Column(Float, default=0.0)
    total_amount = Column(Float, nullable=False)

    # Status
    status = Column(EnumValueString(PaymentStatus, length=50), default=PaymentStatus.PENDING)
    transaction_id = Column(String, unique=True)
    gateway_response = Column(Text)  # JSON response from payment gateway

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    refunded_at = Column(DateTime(timezone=True), nullable=True)

    # Metadata
    payment_metadata = Column(Text)  # JSON string for additional data


class Refund(Base):
    __tablename__ = "refunds"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False)
    amount = Column(Float, nullable=False)
    reason = Column(Text)
    status = Column(String, default="pending")
    refund_transaction_id = Column(String, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)

    payment = relationship("Payment")


class SavedPaymentMethod(Base):
    __tablename__ = "saved_payment_methods"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    method_type = Column(EnumValueString(PaymentMethod, length=50), nullable=False)

    # Card details (tokenized - never store full card number)
    card_last_four = Column(String(4))
    card_brand = Column(String)
    card_exp_month = Column(Integer)
    card_exp_year = Column(Integer)
    payment_token = Column(String)  # Token from payment gateway

    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
