import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from . import models, database, priority
from .schemas import (
    OrderCreate,
    OrderResponse,
    OrderListResponse,
    OrderStatusUpdate,
    QueuePositionResponse,
)
from datetime import datetime

router = APIRouter(prefix="/api/v1/orders", tags=["Orders"])


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
def create_order(order: OrderCreate, db: Session = Depends(database.get_db)):
    """
    Create a new order with priority-based scheduling.
    The order is assigned a priority score based on:
    - Urgency (VIP status, order type, time of day)
    - Distance (pickup to dropoff)
    - Waiting time (prevents starvation)
    """
    # Calculate priority scores
    order_data = {
        "is_vip": getattr(order, "is_vip", False),
        "user_type": getattr(order, "user_type", "regular"),
        "order_type": getattr(order, "order_type", "normal"),
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
        user_id=order.user_id,
        restaurant_id=order.restaurant_id,
        items=json.dumps([i.model_dump() for i in order.items]),
        total_amount=final_total,
        delivery_address=json.dumps(order.delivery_address),
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

    return db_order


@router.get("/", response_model=OrderListResponse)
def list_orders(
    skip: int = 0,
    limit: int = 20,
    priority_filter: str = None,
    db: Session = Depends(database.get_db)
):
    """
    List orders sorted by priority score (highest first).
    This ensures high-priority orders are processed first.
    """
    query = db.query(models.Order)

    if priority_filter:
        query = query.filter(models.Order.priority_level == priority_filter)

    total = query.count()
    orders = (
        query.order_by(models.Order.priority_score.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {"orders": orders, "total": total, "skip": skip, "limit": limit}


@router.get("/queue/pending", response_model=OrderListResponse)
def get_pending_order_queue(db: Session = Depends(database.get_db)):
    """
    Get the pending order queue sorted by priority.
    This is the main endpoint used by delivery partners to fetch orders.
    """
    orders = (
        db.query(models.Order)
        .filter(models.Order.status == models.OrderStatus.PENDING)
        .order_by(models.Order.priority_score.desc())
        .all()
    )

    return {"orders": orders, "total": len(orders), "skip": 0, "limit": len(orders)}


@router.get("/{order_id}/queue-position", response_model=QueuePositionResponse)
def queue_position(order_id: int, db: Session = Depends(database.get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
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
def get_order(order_id: int, db: Session = Depends(database.get_db)):
    """Get a specific order by ID."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    status_update: OrderStatusUpdate,
    db: Session = Depends(database.get_db)
):
    """Update the status of an order."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

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
