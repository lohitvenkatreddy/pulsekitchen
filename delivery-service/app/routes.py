import json

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pathlib import Path
from . import models, database, eta
from .schemas import (
    DeliveryAssignmentCreate,
    DeliveryAssignmentResponse,
    ETAResponse,
    PartnerResponse,
    LocationUpdate,
)
from datetime import datetime

router = APIRouter(prefix="/api/v1/delivery", tags=["Delivery"])
STATIC_DIR = Path(__file__).resolve().parent / "static"


def _safe_float(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _coords_are_valid(coords: dict) -> bool:
    lat = _safe_float(coords.get("latitude"))
    lon = _safe_float(coords.get("longitude"))
    return not (abs(lat) < 0.001 and abs(lon) < 0.001)


def _delivery_address_coords(raw, fallback: Optional[dict] = None) -> dict:
    if isinstance(raw, dict):
        d = raw
    else:
        try:
            d = json.loads(raw) if raw else {}
        except (json.JSONDecodeError, TypeError):
            d = {}
    coords = {
        "latitude": _safe_float(d.get("latitude")),
        "longitude": _safe_float(d.get("longitude")),
    }
    if _coords_are_valid(coords):
        return coords
    return fallback or coords


def _default_user_address_coords(order: models.Order, db: Session) -> dict:
    if not order or not order.user_id:
        return {"latitude": 0.0, "longitude": 0.0}

    address = (
        db.query(models.UserAddress)
        .filter(models.UserAddress.user_id == order.user_id)
        .order_by(models.UserAddress.is_default.desc(), models.UserAddress.id.desc())
        .first()
    )
    if not address:
        return {"latitude": 0.0, "longitude": 0.0}

    return {
        "latitude": _safe_float(address.latitude),
        "longitude": _safe_float(address.longitude),
    }


def _dropoff_coords_for_order(order: models.Order, db: Session) -> dict:
    return _delivery_address_coords(
        order.delivery_address,
        fallback=_default_user_address_coords(order, db),
    )


def _partner_payload(partner: models.DeliveryPartner, distance_km: Optional[float] = None):
    payload = {
        "id": partner.id,
        "user_id": partner.user_id,
        "latitude": partner.latitude,
        "longitude": partner.longitude,
        "is_available": partner.is_available,
        "rating": float(partner.rating or 0),
        "total_deliveries": int(partner.total_deliveries or 0),
    }
    if distance_km is not None:
        payload["distance_km"] = distance_km
    return PartnerResponse.model_validate(payload)


def _assignment_payload(assignment: models.DeliveryAssignment):
    order = assignment.order
    restaurant = order.restaurant if order else None
    return {
        "id": assignment.id,
        "order_id": assignment.order_id,
        "delivery_partner_id": assignment.delivery_partner_id,
        "status": assignment.status,
        "assigned_at": assignment.assigned_at,
        "picked_up_at": assignment.picked_up_at,
        "delivered_at": assignment.delivered_at,
        "eta_minutes": assignment.eta_minutes,
        "order": {
            "id": order.id,
            "status": order.status,
            "order_type": order.order_type,
            "priority_level": order.priority_level,
            "priority_score": float(order.priority_score or 0),
            "delivery_address": order.delivery_address,
            "total_amount": float(order.total_amount or 0),
            "special_instructions": order.special_instructions,
            "placed_at": order.placed_at,
        } if order else None,
        "restaurant": {
            "id": restaurant.id,
            "name": restaurant.name,
            "address": restaurant.address,
            "latitude": restaurant.latitude,
            "longitude": restaurant.longitude,
        } if restaurant else None,
    }


def _status_value(status_value) -> str:
    return status_value.value if hasattr(status_value, "value") else str(status_value)


def _eta_payload_for_order(order: models.Order, eta_data: dict, partner=None) -> dict:
    status_value = _status_value(order.status)
    standard_eta = int(eta_data.get("eta_minutes") or 0)
    priority_eta = eta.calculate_priority_eta_details(
        standard_eta,
        priority_level=str(order.priority_level or "normal"),
        order_type=str(order.order_type or "normal"),
        is_express=str(order.order_type or "").lower() == "express",
    )

    if status_value in {"delivered", "cancelled"}:
        priority_eta = {
            **priority_eta,
            "standard_eta_minutes": 0,
            "eta_minutes": 0,
            "eta_savings_minutes": 0,
        }

    return {
        "order_id": order.id,
        "status": status_value,
        "distance_km": eta_data.get("distance_km", 0.0),
        "order_type": order.order_type,
        "priority_level": order.priority_level,
        "priority_score": float(order.priority_score or 0),
        "eta_source": eta_data.get("eta_source"),
        "partner_location": {
            "latitude": partner.latitude,
            "longitude": partner.longitude,
        } if partner and partner.latitude else None,
        **priority_eta,
    }


@router.get("/dashboard", include_in_schema=False)
def delivery_dashboard():
    return FileResponse(
        STATIC_DIR / "dashboard.html",
        headers={"Cache-Control": "no-store, max-age=0"},
    )


@router.get("/partners", response_model=List[PartnerResponse])
def list_partners(db: Session = Depends(database.get_db)):
    partners = (
        db.query(models.DeliveryPartner)
        .join(models.User, models.User.id == models.DeliveryPartner.user_id)
        .filter(models.User.approval_status == "approved")
        .order_by(models.DeliveryPartner.id)
        .all()
    )
    return [_partner_payload(p) for p in partners]


@router.get("/partners/by-user/{user_id}", response_model=PartnerResponse)
def get_partner_by_user(user_id: int, db: Session = Depends(database.get_db)):
    partner = (
        db.query(models.DeliveryPartner)
        .join(models.User, models.User.id == models.DeliveryPartner.user_id)
        .filter(models.DeliveryPartner.user_id == user_id, models.User.approval_status == "approved")
        .first()
    )
    if not partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found")
    return _partner_payload(partner)


@router.get("/partners/{partner_id}/current")
def get_current_assignment(partner_id: int, db: Session = Depends(database.get_db)):
    partner = (
        db.query(models.DeliveryPartner)
        .filter(models.DeliveryPartner.id == partner_id)
        .first()
    )
    if not partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found")

    assignment = None
    if partner.current_order_id:
        assignment = (
            db.query(models.DeliveryAssignment)
            .filter(
                models.DeliveryAssignment.delivery_partner_id == partner_id,
                models.DeliveryAssignment.order_id == partner.current_order_id,
            )
            .order_by(models.DeliveryAssignment.id.desc())
            .first()
        )

    if not assignment:
        assignment = (
            db.query(models.DeliveryAssignment)
            .filter(
                models.DeliveryAssignment.delivery_partner_id == partner_id,
                models.DeliveryAssignment.status.in_(["assigned", "picked_up"]),
            )
            .order_by(models.DeliveryAssignment.id.desc())
            .first()
        )

    return {
        "partner": _partner_payload(partner),
        "assignment": _assignment_payload(assignment) if assignment else None,
    }


@router.post("/assign", response_model=DeliveryAssignmentResponse)
def assign_delivery_partner(
    assignment: DeliveryAssignmentCreate,
    db: Session = Depends(database.get_db)
):
    """
    Assign a delivery partner to an order.
    Uses priority-based assignment for high-priority orders.
    """
    # Check if order exists and is not already assigned
    order = db.query(models.Order).filter(models.Order.id == assignment.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.delivery_partner_id:
        raise HTTPException(status_code=400, detail="Order already has a delivery partner")

    if _status_value(order.status).lower() != "ready_for_pickup":
        raise HTTPException(
            status_code=400,
            detail="Order can be claimed only after the restaurant marks it ready for pickup",
        )

    # Check if partner exists and is available
    partner = db.query(models.DeliveryPartner).filter(
        models.DeliveryPartner.id == assignment.delivery_partner_id
    ).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found")

    partner_user = (
        db.query(models.User)
        .filter(models.User.id == partner.user_id)
        .first()
    )
    if not partner_user or partner_user.approval_status != "approved":
        raise HTTPException(status_code=400, detail="Delivery partner is not approved")

    if not partner.is_available:
        raise HTTPException(status_code=400, detail="Delivery partner is not available")

    # Calculate ETA
    restaurant = db.query(models.Restaurant).filter(
        models.Restaurant.id == order.restaurant_id
    ).first()

    dropoff = _dropoff_coords_for_order(order, db)

    if restaurant and restaurant.latitude and restaurant.longitude:
        eta_data = eta.calculate_eta(
            pickup_location={
                "latitude": float(restaurant.latitude),
                "longitude": float(restaurant.longitude),
            },
            dropoff_location=dropoff,
            partner_location={
                "latitude": partner.latitude,
                "longitude": partner.longitude,
            } if partner.latitude else None,
        )

        # Adjust ETA based on priority
        adjusted_eta = eta.calculate_priority_eta(
            eta_data["eta_minutes"],
            str(order.priority_level),
            order_type=str(order.order_type or "normal"),
            is_express=str(order.order_type or "").lower() == "express",
        )
    else:
        adjusted_eta = eta.calculate_priority_eta(
            30,
            str(order.priority_level),
            order_type=str(order.order_type or "normal"),
            is_express=str(order.order_type or "").lower() == "express",
        )

    # Create assignment
    db_assignment = models.DeliveryAssignment(
        order_id=assignment.order_id,
        delivery_partner_id=assignment.delivery_partner_id,
        eta_minutes=adjusted_eta,
    )

    # Update order with delivery partner. If the restaurant already handed the
    # order over, keep that visible until the driver marks it picked up.
    order.delivery_partner_id = assignment.delivery_partner_id
    if order.status not in {"ready_for_pickup", "out_for_delivery", "delivered"}:
        order.status = "confirmed"

    # Update partner availability
    partner.is_available = False
    partner.current_order_id = assignment.order_id

    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)

    return db_assignment


@router.post("/{order_id}/assign", response_model=DeliveryAssignmentResponse)
def assign_delivery_partner_for_order(
    order_id: int,
    body: dict,
    db: Session = Depends(database.get_db),
):
    partner_id = body.get("partnerId") or body.get("delivery_partner_id")
    if not partner_id:
        raise HTTPException(status_code=400, detail="delivery_partner_id is required")

    assignment = DeliveryAssignmentCreate(
        order_id=order_id,
        delivery_partner_id=int(partner_id),
    )
    return assign_delivery_partner(assignment, db)


@router.get("/partners/available", response_model=List[PartnerResponse])
def get_available_partners(
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    db: Session = Depends(database.get_db)
):
    """Get all available delivery partners, optionally filtered by location."""
    query = db.query(models.DeliveryPartner).filter(
        models.DeliveryPartner.is_available == True
    )

    partners = query.all()

    # If location provided, sort by distance
    if latitude is not None and longitude is not None:
        partners_with_distance = []
        for partner in partners:
            if partner.latitude and partner.longitude:
                distance = eta.haversine_distance(
                    latitude, longitude,
                    partner.latitude, partner.longitude
                )
                partners_with_distance.append(_partner_payload(partner, distance))

        partners_with_distance.sort(key=lambda x: x.distance_km or 0)
        return partners_with_distance

    return [_partner_payload(p) for p in partners]


@router.post("/{order_id}/track", response_model=ETAResponse)
def start_tracking(order_id: int, db: Session = Depends(database.get_db)):
    """
    Start tracking an order and get real-time ETA.
    """
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    partner = None
    if order.delivery_partner_id:
        partner = db.query(models.DeliveryPartner).filter(
            models.DeliveryPartner.id == order.delivery_partner_id
        ).first()

    restaurant = db.query(models.Restaurant).filter(
        models.Restaurant.id == order.restaurant_id
    ).first()

    dropoff = _dropoff_coords_for_order(order, db)
    eta_data = {"eta_minutes": 0, "distance_km": 0.0}

    if restaurant and restaurant.latitude and restaurant.longitude:
        eta_data = eta.calculate_routed_delivery_eta(
            pickup_location={
                "latitude": float(restaurant.latitude),
                "longitude": float(restaurant.longitude),
            },
            dropoff_location=dropoff,
        )

    return _eta_payload_for_order(order, eta_data, partner)


@router.post("/location")
def update_location(
    location: LocationUpdate,
    db: Session = Depends(database.get_db)
):
    """
    Update delivery partner's location (called from mobile app).
    """
    partner = db.query(models.DeliveryPartner).filter(
        models.DeliveryPartner.id == location.delivery_partner_id
    ).first()

    if not partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found")

    # Update partner location
    partner.latitude = location.latitude
    partner.longitude = location.longitude

    # Create tracking record
    tracking = models.DeliveryTracking(
        delivery_assignment_id=location.assignment_id,
        latitude=location.latitude,
        longitude=location.longitude,
        speed_kmh=location.speed_kmh,
    )

    db.add(tracking)
    db.commit()

    return {"status": "success", "message": "Location updated"}


@router.get("/{order_id}/eta", response_model=ETAResponse)
def get_eta(order_id: int, db: Session = Depends(database.get_db)):
    """Get current ETA for an order."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    partner = db.query(models.DeliveryPartner).filter(
        models.DeliveryPartner.id == order.delivery_partner_id
    ).first() if order.delivery_partner_id else None

    restaurant = db.query(models.Restaurant).filter(
        models.Restaurant.id == order.restaurant_id
    ).first()

    if not restaurant or not restaurant.latitude:
        return _eta_payload_for_order(
            order,
            {"eta_minutes": 0, "distance_km": 0, "eta_source": None},
            partner,
        )

    dropoff = _dropoff_coords_for_order(order, db)

    eta_data = eta.calculate_routed_delivery_eta(
        pickup_location={
            "latitude": float(restaurant.latitude),
            "longitude": float(restaurant.longitude),
        },
        dropoff_location=dropoff,
    )
    return _eta_payload_for_order(order, eta_data, partner)


@router.get("/{order_id}/status")
def get_delivery_status(order_id: int, db: Session = Depends(database.get_db)):
    eta_payload = get_eta(order_id, db)
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    assignment = (
        db.query(models.DeliveryAssignment)
        .filter(models.DeliveryAssignment.order_id == order_id)
        .order_by(models.DeliveryAssignment.id.desc())
        .first()
    )
    return {
        **eta_payload,
        "assignment_id": assignment.id if assignment else None,
        "delivery_partner_id": order.delivery_partner_id if order else None,
    }


@router.patch("/assignment/{assignment_id}/status")
def update_assignment_status(
    assignment_id: int,
    status_update: dict,
    db: Session = Depends(database.get_db)
):
    """Update delivery assignment status (picked_up, delivered, etc.)."""
    assignment = db.query(models.DeliveryAssignment).filter(
        models.DeliveryAssignment.id == assignment_id
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    new_status = status_update.get("status")
    if new_status:
        previous_status = assignment.status
        now = datetime.now()
        assignment.status = new_status

        if new_status == "picked_up":
            if not assignment.picked_up_at:
                assignment.picked_up_at = now
            assignment.order.status = "out_for_delivery"
            if not assignment.order.picked_up_at:
                assignment.order.picked_up_at = assignment.picked_up_at
        elif new_status == "delivered":
            if not assignment.picked_up_at:
                assignment.picked_up_at = now
            if not assignment.delivered_at:
                assignment.delivered_at = now
            assignment.order.status = "delivered"
            if not assignment.order.picked_up_at:
                assignment.order.picked_up_at = assignment.picked_up_at
            if not assignment.order.delivered_at:
                assignment.order.delivered_at = assignment.delivered_at
            assignment.delivery_partner.is_available = True
            assignment.delivery_partner.current_order_id = None
            if previous_status != "delivered":
                td = assignment.delivery_partner.total_deliveries or 0
                assignment.delivery_partner.total_deliveries = td + 1

    db.commit()

    return {"status": "success", "assignment_id": assignment_id, "new_status": new_status}
