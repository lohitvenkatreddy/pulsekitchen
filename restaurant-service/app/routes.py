from math import asin, cos, radians, sin, sqrt

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from . import database, models, schemas
from .security import get_token_payload

router = APIRouter(prefix="/api/v1/restaurants", tags=["Restaurants"])


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * r * asin(sqrt(min(1.0, a)))


@router.get("/", response_model=schemas.RestaurantListResponse)
def list_restaurants(
    cuisine: Optional[str] = None,
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    max_distance_km: Optional[float] = Query(None, ge=0),
    open_only: bool = False,
    public_only: bool = True,
    approved_only: bool = True,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(database.get_db),
):
    q = (
        db.query(models.Restaurant)
        .options(joinedload(models.Restaurant.menu_items))
        .filter(models.Restaurant.is_active == True)
    )
    if public_only:
        q = q.filter(models.Restaurant.is_public == True)
    if approved_only:
        q = q.filter(models.Restaurant.approval_status == "approved")
    if open_only:
        q = q.filter(models.Restaurant.is_open == True)
    if cuisine:
        q = q.filter(models.Restaurant.cuisine_type.ilike(f"%{cuisine}%"))
    if min_rating is not None:
        q = q.filter(models.Restaurant.rating >= min_rating)

    rows = q.order_by(models.Restaurant.rating.desc()).all()

    out = []
    for r in rows:
        rc = (
            db.query(func.count())
            .select_from(models.Review)
            .filter(models.Review.restaurant_id == r.id)
            .scalar()
        )
        dist = None
        if lat is not None and lng is not None and r.latitude is not None and r.longitude is not None:
            dist = _haversine_km(lat, lng, float(r.latitude), float(r.longitude))
            if max_distance_km is not None and dist > max_distance_km:
                continue
        out.append(
            schemas.RestaurantSummary(
                id=r.id,
                name=r.name,
                address=r.address,
                latitude=r.latitude,
                longitude=r.longitude,
                cuisine_type=r.cuisine_type,
                rating=float(r.rating or 0),
                review_count=int(rc or 0),
                distance_km=round(dist, 2) if dist is not None else None,
                is_open=bool(r.is_open),
                is_public=bool(r.is_public),
                approval_status=r.approval_status,
                menu_items=[i for i in r.menu_items if i.is_available],
            )
        )

    if lat is not None and lng is not None:
        out.sort(key=lambda x: (x.distance_km is None, x.distance_km or 1e9))

    total = len(out)
    page = out[skip : skip + limit]
    return {"restaurants": page, "total": total}


@router.get("/search", response_model=schemas.RestaurantListResponse)
def search_restaurants(
    q: str = Query(..., min_length=1),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(database.get_db),
):
    query = (
        db.query(models.Restaurant)
        .outerjoin(models.MenuItem)
        .options(joinedload(models.Restaurant.menu_items))
        .filter(
            models.Restaurant.is_active == True,
            models.Restaurant.is_public == True,
            models.Restaurant.approval_status == "approved",
        )
        .filter(
            (models.Restaurant.name.ilike(f"%{q}%"))
            | (models.Restaurant.cuisine_type.ilike(f"%{q}%"))
            | (models.Restaurant.address.ilike(f"%{q}%"))
            | (
                (models.MenuItem.is_available == True)
                & (
                    (models.MenuItem.name.ilike(f"%{q}%"))
                    | (models.MenuItem.description.ilike(f"%{q}%"))
                )
            )
        )
        .order_by(models.Restaurant.rating.desc())
        .distinct()
    )
    rows = query.offset(skip).limit(limit).all()
    restaurants = [
        schemas.RestaurantSummary(
            id=r.id,
            name=r.name,
            address=r.address,
            latitude=r.latitude,
            longitude=r.longitude,
            cuisine_type=r.cuisine_type,
            rating=float(r.rating or 0),
            review_count=int(r.review_count or 0),
            distance_km=None,
            is_open=bool(r.is_open),
            is_public=bool(r.is_public),
            approval_status=r.approval_status,
            menu_items=[i for i in r.menu_items if i.is_available],
        )
        for r in rows
    ]
    return {"restaurants": restaurants, "total": query.count()}


@router.get("/cuisine/{cuisine}", response_model=schemas.RestaurantListResponse)
def restaurants_by_cuisine(
    cuisine: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(database.get_db),
):
    return list_restaurants(
        cuisine=cuisine,
        skip=skip,
        limit=limit,
        db=db,
    )


@router.get("/{restaurant_id}/menu", response_model=List[schemas.MenuItemResponse])
def get_menu(restaurant_id: int, db: Session = Depends(database.get_db)):
    exists = db.query(models.Restaurant).filter(models.Restaurant.id == restaurant_id).first()
    if not exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")

    items = (
        db.query(models.MenuItem)
        .filter(
            models.MenuItem.restaurant_id == restaurant_id,
            models.MenuItem.is_available == True,
        )
        .order_by(models.MenuItem.name)
        .all()
    )
    return items


@router.get("/{restaurant_id}/reviews", response_model=List[schemas.ReviewResponse])
def list_reviews(restaurant_id: int, db: Session = Depends(database.get_db), limit: int = 50):
    exists = db.query(models.Restaurant).filter(models.Restaurant.id == restaurant_id).first()
    if not exists:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    rows = (
        db.query(models.Review)
        .filter(models.Review.restaurant_id == restaurant_id)
        .order_by(models.Review.created_at.desc())
        .limit(limit)
        .all()
    )
    return rows


@router.post("/{restaurant_id}/reviews", response_model=schemas.ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    restaurant_id: int,
    body: schemas.ReviewCreate,
    db: Session = Depends(database.get_db),
    payload: dict = Depends(get_token_payload),
):
    role = payload.get("role")
    if role not in ("customer", "admin"):
        raise HTTPException(status_code=403, detail="Only customers may leave reviews")
    uid = payload.get("user_id")
    r = db.query(models.Restaurant).filter(models.Restaurant.id == restaurant_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    rev = models.Review(
        user_id=uid,
        restaurant_id=restaurant_id,
        order_id=body.order_id,
        rating=body.rating,
        comment=body.comment,
    )
    db.add(rev)
    db.commit()
    db.refresh(rev)

    avg = (
        db.query(func.avg(models.Review.rating))
        .filter(models.Review.restaurant_id == restaurant_id)
        .scalar()
    )
    cnt = (
        db.query(func.count())
        .select_from(models.Review)
        .filter(models.Review.restaurant_id == restaurant_id)
        .scalar()
    )
    r.rating = round(float(avg or 0), 2)
    r.review_count = int(cnt or 0)
    db.commit()

    return rev


@router.get("/{restaurant_id}", response_model=schemas.RestaurantDetail)
def get_restaurant(restaurant_id: int, db: Session = Depends(database.get_db)):
    r = (
        db.query(models.Restaurant)
        .options(joinedload(models.Restaurant.menu_items))
        .filter(models.Restaurant.id == restaurant_id)
        .first()
    )
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")

    rc = (
        db.query(func.count())
        .select_from(models.Review)
        .filter(models.Review.restaurant_id == restaurant_id)
        .scalar()
    )
    items = [i for i in r.menu_items if i.is_available]
    return schemas.RestaurantDetail(
        id=r.id,
        name=r.name,
        address=r.address,
        latitude=r.latitude,
        longitude=r.longitude,
        cuisine_type=r.cuisine_type,
        rating=float(r.rating or 0),
        review_count=int(rc or 0),
        is_open=bool(r.is_open),
        is_public=bool(r.is_public),
        approval_status=r.approval_status,
        menu_items=items,
    )
