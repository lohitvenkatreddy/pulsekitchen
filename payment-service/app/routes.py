from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from . import models, database, schemas
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/v1/payment", tags=["Payment"])

# Priority delivery fees
PRIORITY_FEES = {
    "normal": 0.0,
    "hospital_emergency": 5.0,
    "student_urgent": 3.0,
    "travel_emergency": 4.0,
    "vip": 6.0,
}


@router.post("/create-intent", response_model=schemas.PaymentIntentResponse)
def create_payment_intent(
    intent: schemas.PaymentIntentCreate,
    db: Session = Depends(database.get_db)
):
    """
    Create a payment intent with priority fee calculation.
    Returns client secret for frontend payment processing.
    """
    # Calculate priority fee
    priority_fee = PRIORITY_FEES.get(intent.priority_type.value, 0.0)
    total_amount = intent.amount + priority_fee

    # In production, this would call Stripe/Payment Gateway API
    # client_secret = stripe.PaymentIntent.create(...)["client_secret"]
    client_secret = f"pi_{uuid.uuid4().hex}"

    return {
        "client_secret": client_secret,
        "order_id": intent.order_id,
        "amount": intent.amount,
        "priority_fee": priority_fee,
        "total_amount": total_amount,
        "currency": "USD",
    }


@router.post("/", response_model=schemas.PaymentResponse, status_code=status.HTTP_201_CREATED)
def process_payment(
    payment_data: schemas.PaymentCreate,
    db: Session = Depends(database.get_db)
):
    """
    Process a payment for an order.
    Supports multiple payment methods including priority delivery fees.
    """
    # Check if payment already exists for this order
    existing = db.query(models.Payment).filter(
        models.Payment.order_id == payment_data.order_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Payment already exists for this order")

    # Calculate priority fee
    priority_fee = PRIORITY_FEES.get(payment_data.priority_type.value, 0.0)
    total_amount = payment_data.amount + priority_fee

    # Generate transaction ID
    transaction_id = f"TXN{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:8].upper()}"

    # Create payment record
    db_payment = models.Payment(
        order_id=payment_data.order_id,
        user_id=payment_data.user_id,
        amount=payment_data.amount,
        currency="USD",
        payment_method=payment_data.payment_method.value,
        priority_fee=priority_fee,
        total_amount=total_amount,
        status=models.PaymentStatus.PROCESSING,
        transaction_id=transaction_id,
        payment_metadata=str(payment_data.metadata) if payment_data.metadata else None,
    )

    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)

    # Simulate payment processing
    # In production, this would call the actual payment gateway
    try:
        # Simulate successful payment
        db_payment.status = models.PaymentStatus.COMPLETED
        db_payment.completed_at = datetime.now()
        db_payment.gateway_response = str({
            "status": "success",
            "transaction_id": transaction_id,
            "amount": total_amount,
        })

        db.commit()
        db.refresh(db_payment)

        return db_payment

    except Exception as e:
        db_payment.status = models.PaymentStatus.FAILED
        db.commit()
        raise HTTPException(status_code=400, detail=f"Payment failed: {str(e)}")


@router.get("/{payment_id}", response_model=schemas.PaymentResponse)
def get_payment(payment_id: int, db: Session = Depends(database.get_db)):
    """Get payment details by ID."""
    payment = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


@router.get("/order/{order_id}", response_model=schemas.PaymentResponse)
def get_payment_by_order(order_id: int, db: Session = Depends(database.get_db)):
    """Get payment details for an order."""
    payment = db.query(models.Payment).filter(models.Payment.order_id == order_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found for this order")
    return payment


@router.post("/refund", response_model=schemas.RefundResponse)
def process_refund(
    refund_data: schemas.RefundCreate,
    db: Session = Depends(database.get_db)
):
    """
    Process a refund for a payment.
    """
    payment = db.query(models.Payment).filter(models.Payment.id == refund_data.payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment.status != models.PaymentStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Can only refund completed payments")

    refund_amount = refund_data.amount or payment.total_amount

    if refund_amount > payment.total_amount:
        raise HTTPException(status_code=400, detail="Refund amount exceeds payment")

    # Create refund record
    refund_transaction_id = f"REF{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:8].upper()}"

    db_refund = models.Refund(
        payment_id=refund_data.payment_id,
        amount=refund_amount,
        reason=refund_data.reason,
        status="processed",
        refund_transaction_id=refund_transaction_id,
        processed_at=datetime.now(),
    )

    # Update payment status
    if refund_amount >= payment.total_amount:
        payment.status = models.PaymentStatus.REFUNDED
        payment.refunded_at = datetime.now()
    else:
        payment.status = models.PaymentStatus.PROCESSING  # Partial refund

    db.add(db_refund)
    db.commit()
    db.refresh(db_refund)

    return db_refund


@router.post("/saved-methods", response_model=schemas.SavedCardResponse)
def save_payment_method(
    card_data: schemas.SavedCardCreate,
    db: Session = Depends(database.get_db)
):
    """Save a payment method for future use."""
    # If this is set as default, unset other defaults
    if card_data.is_default:
        db.query(models.SavedPaymentMethod).filter(
            models.SavedPaymentMethod.user_id == card_data.user_id
        ).update({"is_default": False})

    db_card = models.SavedPaymentMethod(
        user_id=card_data.user_id,
        method_type=models.PaymentMethod.CARD,
        card_last_four=card_data.card_last_four,
        card_brand=card_data.card_brand,
        card_exp_month=card_data.card_exp_month,
        card_exp_year=card_data.card_exp_year,
        payment_token=card_data.card_token,
        is_default=card_data.is_default,
    )

    db.add(db_card)
    db.commit()
    db.refresh(db_card)

    return db_card


@router.get("/saved-methods/{user_id}", response_model=List[schemas.SavedCardResponse])
def get_saved_payment_methods(user_id: int, db: Session = Depends(database.get_db)):
    """Get saved payment methods for a user."""
    methods = db.query(models.SavedPaymentMethod).filter(
        models.SavedPaymentMethod.user_id == user_id
    ).order_by(models.SavedPaymentMethod.is_default.desc()).all()

    return methods


@router.get("/priority-fees")
def get_priority_fees():
    """Get available priority delivery options and their fees."""
    return {
        "priority_options": [
            {"type": "normal", "name": "Normal Delivery", "fee": 0.0, "icon": "🚚"},
            {"type": "hospital_emergency", "name": "Hospital Emergency 🚨", "fee": 5.0, "icon": "🚨"},
            {"type": "student_urgent", "name": "Student (Time-bound) 🎓", "fee": 3.0, "icon": "🎓"},
            {"type": "travel_emergency", "name": "Travel Emergency ✈️", "fee": 4.0, "icon": "✈️"},
            {"type": "vip", "name": "VIP Priority ⭐", "fee": 6.0, "icon": "⭐"},
        ],
        "currency": "USD",
    }
