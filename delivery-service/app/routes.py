import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from . import models, database, eta
from .schemas import (
    DeliveryAssignmentCreate,
    DeliveryAssignmentResponse,
    ETAResponse,
    PartnerResponse,
    LocationUpdate,
)

router = APIRouter(prefix="/api/v1/delivery", tags=["Delivery"])


def _delivery_address_coords(raw) -> dict:
    if isinstance(raw, dict):
        d = raw
    else:
        try:
            d = json.loads(raw) if raw else {}
        except (json.JSONDecodeError, TypeError):
            d = {}
    return {
        "latitude": float(d.get("latitude") or 0),
        "longitude": float(d.get("longitude") or 0),
    }


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

    # Check if partner exists and is available
    partner = db.query(models.DeliveryPartner).filter(
        models.DeliveryPartner.id == assignment.delivery_partner_id
    ).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found")

    if not partner.is_available:
        raise HTTPException(status_code=400, detail="Delivery partner is not available")

    # Calculate ETA
    restaurant = db.query(models.Restaurant).filter(
        models.Restaurant.id == order.restaurant_id
    ).first()

    dropoff = _delivery_address_coords(order.delivery_address)

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
        )
    else:
        adjusted_eta = 30  # Default ETA

    # Create assignment
    db_assignment = models.DeliveryAssignment(
        order_id=assignment.order_id,
        delivery_partner_id=assignment.delivery_partner_id,
        eta_minutes=adjusted_eta,
    )

    # Update order with delivery partner
    order.delivery_partner_id = assignment.delivery_partner_id
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

    if not order.delivery_partner_id:
        raise HTTPException(status_code=400, detail="No delivery partner assigned yet")

    partner = db.query(models.DeliveryPartner).filter(
        models.DeliveryPartner.id == order.delivery_partner_id
    ).first()

    restaurant = db.query(models.Restaurant).filter(
        models.Restaurant.id == order.restaurant_id
    ).first()

    if not restaurant or not restaurant.latitude:
        raise HTTPException(status_code=400, detail="Restaurant location not available")

    dropoff = _delivery_address_coords(order.delivery_address)

    # Calculate ETA
    eta_data = eta.calculate_eta(
        pickup_location={
            "latitude": float(restaurant.latitude),
            "longitude": float(restaurant.longitude),
        },
        dropoff_location=dropoff,
        partner_location={
            "latitude": partner.latitude,
            "longitude": partner.longitude,
        } if partner and partner.latitude else None,
    )

    # Adjust for priority
    adjusted_eta = eta.calculate_priority_eta(
        eta_data["eta_minutes"],
        str(order.priority_level),
    )

    return {
        "order_id": order_id,
        "status": order.status,
        "eta_minutes": adjusted_eta,
        "distance_km": eta_data["distance_km"],
        "priority_level": order.priority_level,
        "partner_location": {
            "latitude": partner.latitude,
            "longitude": partner.longitude,
        } if partner and partner.latitude else None,
    }


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
        return {
            "order_id": order_id,
            "status": order.status,
            "eta_minutes": 0,
            "distance_km": 0,
            "priority_level": order.priority_level,
            "partner_location": None,
        }

    dropoff = _delivery_address_coords(order.delivery_address)

    eta_data = eta.calculate_eta(
        pickup_location={
            "latitude": float(restaurant.latitude),
            "longitude": float(restaurant.longitude),
        },
        dropoff_location=dropoff,
    )

    adjusted_eta = eta.calculate_priority_eta(
        eta_data["eta_minutes"],
        str(order.priority_level),
    )

    return {
        "order_id": order_id,
        "status": order.status,
        "eta_minutes": adjusted_eta,
        "distance_km": eta_data["distance_km"],
        "priority_level": order.priority_level,
        "partner_location": {
            "latitude": partner.latitude,
            "longitude": partner.longitude,
        } if partner and partner.latitude else None,
    }


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
        assignment.status = new_status

        if new_status == "picked_up":
            assignment.picked_up_at = __import__("datetime").datetime.now()
            # Update order status
            assignment.order.status = "out_for_delivery"
        elif new_status == "delivered":
            assignment.delivered_at = __import__("datetime").datetime.now()
            assignment.order.status = "delivered"
            # Make partner available again
            assignment.delivery_partner.is_available = True
            assignment.delivery_partner.current_order_id = None
            td = assignment.delivery_partner.total_deliveries or 0
            assignment.delivery_partner.total_deliveries = td + 1

    db.commit()

    return {"status": "success", "assignment_id": assignment_id, "new_status": new_status}
