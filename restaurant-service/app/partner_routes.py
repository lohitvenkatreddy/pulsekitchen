from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
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
