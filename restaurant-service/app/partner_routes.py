from pathlib import Path
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Optional

from . import database, models, schemas
from .security import require_restaurant_or_admin

router = APIRouter(prefix="/api/v1/restaurants/partner", tags=["RestaurantPartner"])
STATIC_DIR = Path(__file__).resolve().parent / "static"


def _get_restaurant_for_actor(
    db: Session,
    restaurant_id: int,
    payload: dict,
) -> models.Restaurant:
    r = db.query(models.Restaurant).filter(models.Restaurant.id == restaurant_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    role = payload.get("role")
    uid = payload.get("user_id")
    if role == "admin":
        return r
    if role == "restaurant" and r.owner_user_id == uid:
        return r
    raise HTTPException(status_code=403, detail="Not allowed to manage this restaurant")


@router.get("/dashboard", include_in_schema=False)
def restaurant_dashboard():
    return FileResponse(STATIC_DIR / "dashboard.html")


@router.get("/mine", response_model=list[schemas.RestaurantSummaryExtended])
def list_my_restaurants(
    db: Session = Depends(database.get_db),
    payload: dict = Depends(require_restaurant_or_admin),
):
    role = payload.get("role")
    uid = payload.get("user_id")

    query = db.query(models.Restaurant)
    if role != "admin":
        query = query.filter(models.Restaurant.owner_user_id == uid)

    rows = query.order_by(models.Restaurant.id).all()
    return [schemas.RestaurantSummaryExtended(**_to_summary(row, db)) for row in rows]


@router.patch("/{restaurant_id}/profile", response_model=schemas.RestaurantSummaryExtended)
def update_profile(
    restaurant_id: int,
    body: schemas.RestaurantProfileUpdate,
    db: Session = Depends(database.get_db),
    payload: dict = Depends(require_restaurant_or_admin),
):
    r = _get_restaurant_for_actor(db, restaurant_id, payload)
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(r, k, v)
    db.commit()
    db.refresh(r)
    return schemas.RestaurantSummaryExtended(**_to_summary(r, db))


@router.post("/{restaurant_id}/menu/items", response_model=schemas.MenuItemResponse)
def add_menu_item(
    restaurant_id: int,
    item: schemas.MenuItemCreate,
    db: Session = Depends(database.get_db),
    payload: dict = Depends(require_restaurant_or_admin),
):
    _get_restaurant_for_actor(db, restaurant_id, payload)
    row = models.MenuItem(
        restaurant_id=restaurant_id,
        name=item.name,
        description=item.description,
        image_url=item.image_url,
        price=item.price,
        is_available=item.is_available,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{restaurant_id}/menu/items/{item_id}", response_model=schemas.MenuItemResponse)
def update_menu_item(
    restaurant_id: int,
    item_id: int,
    body: schemas.MenuItemPatch,
    db: Session = Depends(database.get_db),
    payload: dict = Depends(require_restaurant_or_admin),
):
    _get_restaurant_for_actor(db, restaurant_id, payload)
    m = (
        db.query(models.MenuItem)
        .filter(
            models.MenuItem.id == item_id,
            models.MenuItem.restaurant_id == restaurant_id,
        )
        .first()
    )
    if not m:
        raise HTTPException(status_code=404, detail="Menu item not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(m, k, v)
    db.commit()
    db.refresh(m)
    return m


@router.get("/{restaurant_id}/menu", response_model=list[schemas.MenuItemResponse])
def get_partner_menu(
    restaurant_id: int,
    db: Session = Depends(database.get_db),
    payload: dict = Depends(require_restaurant_or_admin),
):
    _get_restaurant_for_actor(db, restaurant_id, payload)
    items = (
        db.query(models.MenuItem)
        .filter(models.MenuItem.restaurant_id == restaurant_id)
        .order_by(models.MenuItem.name)
        .all()
    )
    return items


@router.get("/{restaurant_id}/orders")
def get_restaurant_orders(
    restaurant_id: int,
    db: Session = Depends(database.get_db),
    payload: dict = Depends(require_restaurant_or_admin),
):
    _get_restaurant_for_actor(db, restaurant_id, payload)
    rows = (
        db.query(models.Order)
        .filter(models.Order.restaurant_id == restaurant_id)
        .order_by(models.Order.placed_at.desc())
        .limit(100)
        .all()
    )
    return {
        "orders": [
            {
                "id": o.id,
                "user_id": o.user_id,
                "items": json.loads(o.items or "[]"),
                "total_amount": float(o.total_amount or 0),
                "delivery_address": o.delivery_address,
                "priority_level": o.priority_level,
                "priority_score": float(o.priority_score or 0),
                "status": o.status,
                "special_instructions": o.special_instructions,
                "delivery_partner_id": o.delivery_partner_id,
                "placed_at": o.placed_at.isoformat() if o.placed_at else None,
            }
            for o in rows
        ]
    }


@router.get("/{restaurant_id}/revenue")
def get_restaurant_revenue(
    restaurant_id: int,
    db: Session = Depends(database.get_db),
    payload: dict = Depends(require_restaurant_or_admin),
):
    _get_restaurant_for_actor(db, restaurant_id, payload)
    completed_statuses = ["completed"]
    rows = (
        db.query(models.Payment, models.Order)
        .join(models.Order, models.Payment.order_id == models.Order.id)
        .filter(
            models.Order.restaurant_id == restaurant_id,
            func.lower(models.Payment.status).in_(completed_statuses),
        )
        .all()
    )

    gross_revenue = sum(float(payment.total_amount or 0) for payment, _order in rows)
    admin_commission = round(gross_revenue * 0.02, 2)
    owner_payout = round(gross_revenue - admin_commission, 2)
    delivered_orders = sum(1 for _payment, order in rows if str(order.status).lower() == "delivered")

    return {
        "gross_revenue": round(gross_revenue, 2),
        "admin_commission_rate": 0.02,
        "admin_commission": admin_commission,
        "owner_payout": owner_payout,
        "paid_orders": len(rows),
        "delivered_orders": delivered_orders,
    }


@router.patch("/{restaurant_id}/orders/{order_id}/status")
def update_restaurant_order_status(
    restaurant_id: int,
    order_id: int,
    body: dict,
    db: Session = Depends(database.get_db),
    payload: dict = Depends(require_restaurant_or_admin),
):
    _get_restaurant_for_actor(db, restaurant_id, payload)
    row = (
        db.query(models.Order)
        .filter(models.Order.id == order_id, models.Order.restaurant_id == restaurant_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Order not found")

    new_status = str(body.get("status") or "").lower()
    allowed = {"confirmed", "preparing", "ready_for_pickup"}
    if new_status not in allowed:
        raise HTTPException(status_code=400, detail="Unsupported restaurant order status")

    current_status = str(row.status or "").lower()
    if current_status in {"out_for_delivery", "delivered", "cancelled"}:
        raise HTTPException(
            status_code=400,
            detail="Order status is already controlled by delivery progress",
        )

    row.status = new_status
    if new_status in {"confirmed", "preparing", "ready_for_pickup"} and not row.confirmed_at:
        row.confirmed_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return {"id": row.id, "status": row.status}


@router.delete("/{restaurant_id}/menu/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_menu_item(
    restaurant_id: int,
    item_id: int,
    db: Session = Depends(database.get_db),
    payload: dict = Depends(require_restaurant_or_admin),
):
    _get_restaurant_for_actor(db, restaurant_id, payload)
    m = (
        db.query(models.MenuItem)
        .filter(
            models.MenuItem.id == item_id,
            models.MenuItem.restaurant_id == restaurant_id,
        )
        .first()
    )
    if not m:
        raise HTTPException(status_code=404, detail="Menu item not found")
    db.delete(m)
    db.commit()
    return None


def _to_summary(r: models.Restaurant, db: Session) -> dict:
    rc = db.query(models.Review).filter(models.Review.restaurant_id == r.id).count()
    return {
        "id": r.id,
        "name": r.name,
        "address": r.address,
        "latitude": r.latitude,
        "longitude": r.longitude,
        "cuisine_type": r.cuisine_type,
        "rating": float(r.rating or 0),
        "review_count": r.review_count or rc,
        "approval_status": r.approval_status,
        "is_open": r.is_open,
        "is_public": r.is_public,
        "is_active": r.is_active,
    }
