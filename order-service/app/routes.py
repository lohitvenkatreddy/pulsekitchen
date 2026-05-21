import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import case
from sqlalchemy.orm import Session
from typing import List
from . import models, database, priority, student_verification, emergency_verification, email_service
from .auth_context import AuthContext, assert_customer_owns_user_id, get_auth_context
from .schemas import (
    OrderCreate,
    OrderResponse,
    OrderListResponse,
    OrderStatusUpdate,
    QueuePositionResponse,
    StudentIdVerificationResponse,
    EmergencyVerificationResponse,
)
from datetime import datetime

router = APIRouter(prefix="/api/v1/orders", tags=["Orders"])

DEMO_STATUS_SCHEDULE = [
    (20, models.OrderStatus.PENDING),
    (40, models.OrderStatus.CONFIRMED),
    (65, models.OrderStatus.PREPARING),
    (90, models.OrderStatus.OUT_FOR_DELIVERY),
]


def _current_demo_status(order: models.Order) -> models.OrderStatus:
    if not order.placed_at:
        return models.OrderStatus.PENDING

    now = datetime.now(order.placed_at.tzinfo) if getattr(order.placed_at, "tzinfo", None) else datetime.now()
    elapsed_seconds = max(0, (now - order.placed_at).total_seconds())

    for threshold, status_value in DEMO_STATUS_SCHEDULE:
        if elapsed_seconds < threshold:
            return status_value
    return models.OrderStatus.DELIVERED


def _refresh_demo_order_lifecycle(order: models.Order) -> bool:
    if order.status in {models.OrderStatus.CANCELLED, models.OrderStatus.DELIVERED}:
        return False

    next_status = _current_demo_status(order)
    changed = False

    if order.status != next_status:
        order.status = next_status
        changed = True

    if next_status in {models.OrderStatus.CONFIRMED, models.OrderStatus.PREPARING, models.OrderStatus.OUT_FOR_DELIVERY, models.OrderStatus.DELIVERED} and not order.confirmed_at:
        order.confirmed_at = order.placed_at
        changed = True
    if next_status in {models.OrderStatus.OUT_FOR_DELIVERY, models.OrderStatus.DELIVERED} and not order.picked_up_at:
        order.picked_up_at = order.placed_at
        changed = True
    if next_status == models.OrderStatus.DELIVERED and not order.delivered_at:
        order.delivered_at = datetime.now(order.placed_at.tzinfo) if getattr(order.placed_at, "tzinfo", None) else datetime.now()
        changed = True

    return changed


def _refresh_demo_lifecycle_for_orders(db: Session, orders: list[models.Order]) -> None:
    # Order state is now driven by restaurant and delivery workflows.
    return None


def _coupon_discount(db: Session, code: str, items_subtotal: float) -> float:
    c = (
        db.query(models.Coupon)
        .filter(
            models.Coupon.code == code.strip().upper(),
            models.Coupon.is_active == True,
        )
        .first()
    )
    if not c:
        raise HTTPException(status_code=400, detail="Invalid or inactive coupon")
    if items_subtotal < float(c.min_order_amount or 0):
        raise HTTPException(status_code=400, detail="Order subtotal below coupon minimum")
    if c.discount_type == "percent":
        return round(items_subtotal * float(c.discount_value) / 100.0, 2)
    return min(float(c.discount_value), items_subtotal)


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order: OrderCreate,
    db: Session = Depends(database.get_db),
    auth: AuthContext = Depends(get_auth_context),
):
    """
    Create a new order with priority-based scheduling.
    The order is assigned a priority score based on:
    - Urgency (VIP status, order type, time of day)
    - Distance (pickup to dropoff)
    - Waiting time (prevents starvation)
    """
    requested_order_type = str(getattr(order, "order_type", "normal") or "normal").lower()
    effective_user_id = auth.user_id if auth.is_customer_scope else order.user_id
    assert_customer_owns_user_id(auth, order.user_id)

    if requested_order_type == "student_urgent" and not student_verification.is_valid_verification(
        effective_user_id,
        order.student_verification_id,
    ):
        raise HTTPException(
            status_code=403,
            detail="Student ID verification is required for student priority ordering",
        )
    if requested_order_type in {"travel_emergency", "hospital_emergency"} and not emergency_verification.is_valid_verification(
        effective_user_id,
        requested_order_type,
        order.emergency_verification_id,
    ):
        raise HTTPException(
            status_code=403,
            detail="Emergency document verification is required for this priority option",
        )

    # Calculate priority scores
    order_data = {
        "is_vip": getattr(order, "is_vip", False),
        "user_type": getattr(order, "user_type", "regular"),
        "order_type": requested_order_type,
        "item_count": len(order.items),
        "pickup_location": order.pickup_location,
        "dropoff_location": order.dropoff_location,
        "placed_at": datetime.now(),
    }

    scores = priority.calculate_priority_score(order_data)
    priority_level_str = priority.get_priority_level(scores["priority_score"])

    items_subtotal = sum(float(i.price) * int(i.quantity) for i in order.items)
    final_total = float(order.total_amount)
    if order.coupon_code:
        disc = _coupon_discount(db, order.coupon_code, items_subtotal)
        final_total = max(0.01, float(order.total_amount) - disc)
        cup = (
            db.query(models.Coupon)
            .filter(models.Coupon.code == order.coupon_code.strip().upper())
            .first()
        )
        if cup:
            cup.uses_count = int((cup.uses_count or 0) + 1)
            db.add(cup)

    # Create order in database
    db_order = models.Order(
        user_id=effective_user_id,
        restaurant_id=order.restaurant_id,
        items=json.dumps([i.model_dump() for i in order.items]),
        total_amount=final_total,
        delivery_address=json.dumps(order.delivery_address),
        order_type=requested_order_type,
        priority_level=models.PriorityLevel(priority_level_str),
        priority_score=scores["priority_score"],
        urgency_score=scores["urgency_score"],
        distance_score=scores["distance_score"],
        waiting_time_score=scores["waiting_time_score"],
        special_instructions=order.special_instructions,
    )

    db.add(db_order)
    db.commit()
    db.refresh(db_order)

    try:
        customer = db.query(models.User).filter(models.User.id == db_order.user_id).first()
        restaurant = (
            db.query(models.Restaurant)
            .filter(models.Restaurant.id == db_order.restaurant_id)
            .first()
        )
        email_service.send_order_confirmation_email(db_order, customer, restaurant)
    except Exception as exc:
        print(f"[OrderEmail] Failed to send confirmation for order {db_order.id}: {exc}")

    return db_order


@router.get("/", response_model=OrderListResponse)
def list_orders(
    skip: int = 0,
    limit: int = 20,
    priority_filter: str = None,
    db: Session = Depends(database.get_db),
    auth: AuthContext = Depends(get_auth_context),
):
    """
    List orders sorted by priority score (highest first).
    This ensures high-priority orders are processed first.
    """
    query = db.query(models.Order)

    if auth.is_customer_scope:
        query = query.filter(models.Order.user_id == auth.user_id)

    if priority_filter:
        query = query.filter(models.Order.priority_level == priority_filter)

    orders = (
        query.order_by(models.Order.priority_score.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    _refresh_demo_lifecycle_for_orders(db, orders)
    total = query.count()

    return {"orders": orders, "total": total, "skip": skip, "limit": limit}


@router.get("/queue/pending", response_model=OrderListResponse)
def get_pending_order_queue(db: Session = Depends(database.get_db)):
    """
    Get active orders sorted by readiness and priority.
    Delivery partners can see the queue early, but can claim only ready orders.
    """
    queue_statuses = [
        models.OrderStatus.PENDING,
        models.OrderStatus.CONFIRMED,
        models.OrderStatus.PREPARING,
        models.OrderStatus.READY_FOR_PICKUP,
    ]
    ready_rank = case(
        (models.Order.status == models.OrderStatus.READY_FOR_PICKUP, 0),
        else_=1,
    )
    orders = (
        db.query(models.Order)
        .filter(models.Order.status.in_(queue_statuses))
        .order_by(ready_rank, models.Order.priority_score.desc(), models.Order.id.asc())
        .all()
    )
    _refresh_demo_lifecycle_for_orders(db, orders)
    orders = [order for order in orders if order.status in queue_statuses]

    return {"orders": orders, "total": len(orders), "skip": 0, "limit": len(orders)}


@router.post(
    "/student-verification/id-card",
    response_model=StudentIdVerificationResponse,
)
async def verify_student_id_card(
    user_id: int = Form(...),
    id_card: UploadFile = File(...),
    auth: AuthContext = Depends(get_auth_context),
):
    assert_customer_owns_user_id(auth, user_id)

    if not id_card.content_type or not id_card.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file")

    image_bytes = await id_card.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded ID card image is empty")

    try:
        verified, score = student_verification.compare_with_reference(image_bytes)
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail=(
                "Student ID template is not configured. Add your reference card at "
                f"{student_verification.REFERENCE_TEMPLATE_PATH}"
            ),
        )
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Student ID verification needs OpenCV installed in the order service",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not verified:
        return StudentIdVerificationResponse(
            verified=False,
            score=score,
            verification_id=None,
            message="ID card layout did not match the configured college template",
        )

    verification_id = student_verification.issue_verification(user_id, score)
    return StudentIdVerificationResponse(
        verified=True,
        score=score,
        verification_id=verification_id,
        message="Student ID card template matched successfully",
    )


@router.post(
    "/emergency-verification/document",
    response_model=EmergencyVerificationResponse,
)
async def verify_emergency_document(
    user_id: int = Form(...),
    emergencyType: str = Form(...),
    document: UploadFile = File(...),
    customerName: str | None = Form(None),
    orderId: str | None = Form(None),
    customerId: str | None = Form(None),
    auth: AuthContext = Depends(get_auth_context),
):
    assert_customer_owns_user_id(auth, user_id)

    if not document.content_type or not document.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload a JPG, PNG, or WEBP image")

    image_bytes = await document.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded emergency document is empty")

    try:
        result = emergency_verification.verify_document(
            image_bytes=image_bytes,
            mime_type=document.content_type,
            emergency_type=emergencyType,
            customer_name=customerName,
            order_id=orderId,
            customer_id=customerId,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    decision = result.get("decision")
    if decision == "APPROVED":
        verification_id = emergency_verification.issue_verification(
            user_id=user_id,
            emergency_type=emergencyType,
            result=result,
        )
        return EmergencyVerificationResponse(
            status="approved",
            message="Emergency verified. Your order is being prioritised.",
            reasons=[],
            verification_id=verification_id,
            result=result,
        )

    if decision == "REJECTED":
        reasons = result.get("fail_reasons") or ["We could not verify your document."]
        return EmergencyVerificationResponse(
            status="rejected",
            message="We could not verify your document.",
            reasons=reasons,
            verification_id=None,
            result=result,
        )

    return EmergencyVerificationResponse(
        status="pending",
        message="Your document is under review.",
        reasons=result.get("fail_reasons") or [],
        verification_id=None,
        result=result,
    )


@router.get("/{order_id}/queue-position", response_model=QueuePositionResponse)
def queue_position(
    order_id: int,
    db: Session = Depends(database.get_db),
    auth: AuthContext = Depends(get_auth_context),
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    assert_customer_owns_user_id(auth, order.user_id)
    _refresh_demo_lifecycle_for_orders(db, [order])
    pending = (
        db.query(models.Order)
        .filter(models.Order.status == models.OrderStatus.PENDING)
        .order_by(models.Order.priority_score.desc(), models.Order.id.asc())
        .all()
    )
    rank_map = {o.id: i + 1 for i, o in enumerate(pending)}
    return QueuePositionResponse(
        order_id=order.id,
        status=order.status.value if hasattr(order.status, "value") else str(order.status),
        queue_rank=rank_map.get(order.id) if order.status == models.OrderStatus.PENDING else None,
        pending_queue_length=len(pending),
        priority_score=float(order.priority_score or 0),
    )


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(database.get_db),
    auth: AuthContext = Depends(get_auth_context),
):
    """Get a specific order by ID."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    assert_customer_owns_user_id(auth, order.user_id)
    _refresh_demo_lifecycle_for_orders(db, [order])
    return order


@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    status_update: OrderStatusUpdate,
    db: Session = Depends(database.get_db),
    auth: AuthContext = Depends(get_auth_context),
):
    """Update the status of an order."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    assert_customer_owns_user_id(auth, order.user_id)

    new_status = models.OrderStatus(status_update.status.value)
    order.status = new_status

    # Set timestamps based on status
    if new_status == models.OrderStatus.CONFIRMED:
        order.confirmed_at = datetime.now()
    elif new_status == models.OrderStatus.OUT_FOR_DELIVERY:
        order.picked_up_at = datetime.now()
    elif new_status == models.OrderStatus.DELIVERED:
        order.delivered_at = datetime.now()
    elif new_status == models.OrderStatus.CANCELLED:
        order.cancelled_at = datetime.now()

    db.commit()
    db.refresh(order)
    return order
