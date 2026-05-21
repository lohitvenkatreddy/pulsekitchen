import json
from datetime import datetime
from typing import Any, List, Optional
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models
from .config import get_settings
from .database import get_db
from .deps import require_admin, require_admin_user_id

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])
settings = get_settings()
STATIC_DIR = Path(__file__).resolve().parent / "static"


def _log_audit(
    db: Session,
    actor_id: int,
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[int] = None,
    details: Optional[str] = None,
):
    row = models.AuditLog(
        actor_user_id=actor_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
    )
    db.add(row)
    db.commit()


@router.get("/stats/overview")
def stats_overview(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    total_orders = db.query(func.count(models.Order.id)).scalar() or 0
    pending_orders = (
        db.query(func.count(models.Order.id))
        .filter(func.lower(models.Order.status) == "pending")
        .scalar()
        or 0
    )
    priority_orders = (
        db.query(func.count(models.Order.id))
        .filter(models.Order.priority_level.in_(["high", "critical"]))
        .scalar()
        or 0
    )
    delivered_orders = (
        db.query(func.count(models.Order.id))
        .filter(func.lower(models.Order.status) == "delivered")
        .scalar()
        or 0
    )
    active_assignments = (
        db.query(func.count(models.DeliveryAssignment.id))
        .filter(models.DeliveryAssignment.status.in_(["assigned", "picked_up"]))
        .scalar()
        or 0
    )
    available_partners = (
        db.query(func.count(models.DeliveryPartner.id))
        .filter(models.DeliveryPartner.is_available == True)
        .scalar()
        or 0
    )
    busy_partners = (
        db.query(func.count(models.DeliveryPartner.id))
        .filter(models.DeliveryPartner.is_available == False)
        .scalar()
        or 0
    )
    gross_revenue = (
        db.query(func.coalesce(func.sum(models.Payment.total_amount), 0))
        .filter(func.lower(models.Payment.status) == "completed")
        .scalar()
        or 0
    )
    admin_commission = round(float(gross_revenue) * 0.02, 2)
    restaurant_payout = round(float(gross_revenue) - admin_commission, 2)

    return {
        "orders": {
            "total": int(total_orders),
            "pending": int(pending_orders),
            "priority": int(priority_orders),
            "delivered": int(delivered_orders),
        },
        "delivery": {
            "active_assignments": int(active_assignments),
            "available_partners": int(available_partners),
            "busy_partners": int(busy_partners),
        },
        "revenue": {
            "gross": round(float(gross_revenue), 2),
            "admin_commission_rate": 0.02,
            "admin_commission": admin_commission,
            "restaurant_payout": restaurant_payout,
        },
    }


@router.get("/dashboard", include_in_schema=False)
def admin_dashboard():
    return FileResponse(
        STATIC_DIR / "dashboard.html",
        headers={"Cache-Control": "no-store, max-age=0"},
    )


@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
    role: Optional[str] = Query(None),
    approval_status: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
):
    q = db.query(models.User)
    if role:
        q = q.filter(models.User.role == role)
    if approval_status:
        q = q.filter(models.User.approval_status == approval_status)
    total = q.count()
    rows = q.order_by(models.User.id).offset(skip).limit(limit).all()
    return {
        "total": total,
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "phone_number": u.phone_number,
                "role": u.role,
                "approval_status": u.approval_status,
                "is_active": u.is_active,
                "is_verified": u.is_verified,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in rows
        ],
    }


@router.get("/orders")
def list_orders_admin(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = 0,
    limit: int = 200,
):
    pending_ordered = (
        db.query(models.Order)
        .filter(func.lower(models.Order.status) == "pending")
        .order_by(models.Order.priority_score.desc(), models.Order.id.asc())
        .all()
    )
    rank_map = {o.id: i + 1 for i, o in enumerate(pending_ordered)}

    q = db.query(models.Order)
    if status_filter:
        q = q.filter(func.lower(models.Order.status) == str(status_filter).lower())
    total = q.count()
    rows = q.order_by(models.Order.placed_at.desc()).offset(skip).limit(limit).all()
    payment_map = {}
    if rows:
        payments = db.query(models.Payment).filter(models.Payment.order_id.in_([o.id for o in rows])).all()
        payment_map = {p.order_id: p for p in payments}

    return {
        "total": total,
        "orders": [
            {
                "id": o.id,
                "user_id": o.user_id,
                "restaurant_id": o.restaurant_id,
                "status": o.status,
                "total_amount": float(o.total_amount) if o.total_amount is not None else None,
                "priority_score": float(o.priority_score) if o.priority_score is not None else None,
                "priority_level": o.priority_level,
                "priority_benefit": _priority_benefit(o.priority_level, o.priority_score),
                "priority_fee": float(payment_map[o.id].priority_fee) if o.id in payment_map and payment_map[o.id].priority_fee is not None else 0,
                "delivery_partner_id": o.delivery_partner_id,
                "special_instructions": o.special_instructions,
                "placed_at": o.placed_at.isoformat() if o.placed_at else None,
                "confirmed_at": o.confirmed_at.isoformat() if o.confirmed_at else None,
                "picked_up_at": o.picked_up_at.isoformat() if o.picked_up_at else None,
                "delivered_at": o.delivered_at.isoformat() if o.delivered_at else None,
                "queue_rank": rank_map.get(o.id) if str(o.status).lower() == "pending" else None,
            }
            for o in rows
        ],
        "skip": skip,
        "limit": limit,
    }


def _priority_benefit(priority_level: Optional[str], priority_score: Optional[float]) -> str:
    level = str(priority_level or "normal").lower()
    score = float(priority_score or 0)
    if level == "critical":
        return f"Top queue treatment, fastest ETA band ({score:.1f})"
    if level == "high":
        return f"Moves ahead of normal orders ({score:.1f})"
    if level == "normal":
        return f"Standard queue position ({score:.1f})"
    return f"Low urgency queue ({score:.1f})"


@router.get("/notifications/recent")
def notifications_recent(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
    limit: int = 50,
):
    rows = (
        db.query(models.Notification)
        .order_by(models.Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    return {
        "notifications": [
            {
                "id": n.id,
                "user_id": n.user_id,
                "title": n.title,
                "message": n.message,
                "notification_type": n.notification_type,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in rows
        ]
    }


@router.get("/payments/recent")
def payments_recent(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
    limit: int = 100,
):
    rows = (
        db.query(models.Payment)
        .order_by(models.Payment.created_at.desc())
        .limit(limit)
        .all()
    )
    return {
        "payments": [
            {
                "id": p.id,
                "order_id": p.order_id,
                "user_id": p.user_id,
                "total_amount": float(p.total_amount) if p.total_amount is not None else None,
                "status": p.status,
                "payment_method": p.payment_method,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in rows
        ]
    }


@router.get("/delivery/assignments")
def delivery_assignments(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
    limit: int = 100,
):
    rows = db.query(models.DeliveryAssignment).order_by(models.DeliveryAssignment.id.desc()).limit(limit).all()
    order_ids = [a.order_id for a in rows]
    order_map = {}
    if order_ids:
        orders = (
            db.query(models.Order)
            .filter(models.Order.id.in_(order_ids))
            .all()
        )
        order_map = {o.id: o for o in orders}

    return {
        "assignments": [
            {
                "id": a.id,
                "order_id": a.order_id,
                "delivery_partner_id": a.delivery_partner_id,
                "status": a.status,
                "eta_minutes": a.eta_minutes,
                "assigned_at": a.assigned_at.isoformat() if a.assigned_at else None,
                "picked_up_at": a.picked_up_at.isoformat() if a.picked_up_at else None,
                "delivered_at": a.delivered_at.isoformat() if a.delivered_at else None,
                "order_status": order_map[a.order_id].status if a.order_id in order_map else None,
                "order_priority": order_map[a.order_id].priority_level if a.order_id in order_map else None,
            }
            for a in rows
        ]
    }


@router.get("/delivery/partners")
def delivery_partners(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    rows = (
        db.query(models.DeliveryPartner)
        .order_by(models.DeliveryPartner.id.asc())
        .all()
    )
    return {
        "partners": [
            {
                "id": p.id,
                "user_id": p.user_id,
                "is_available": bool(p.is_available),
                "current_order_id": p.current_order_id,
                "total_deliveries": int(p.total_deliveries or 0),
                "rating": float(p.rating or 0),
                "latitude": p.latitude,
                "longitude": p.longitude,
            }
            for p in rows
        ]
    }


@router.get("/partner-applications")
def partner_applications(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    users = (
        db.query(models.User)
        .filter(models.User.role.in_(["restaurant", "delivery_partner"]))
        .order_by(models.User.created_at.desc(), models.User.id.desc())
        .all()
    )
    restaurant_map = {
        restaurant.owner_user_id: restaurant
        for restaurant in db.query(models.Restaurant).all()
        if restaurant.owner_user_id is not None
    }
    partner_map = {
        partner.user_id: partner
        for partner in db.query(models.DeliveryPartner).all()
    }
    applications = []
    for user in users:
        restaurant = restaurant_map.get(user.id)
        partner = partner_map.get(user.id)
        applications.append(
            {
                "user_id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "phone_number": user.phone_number,
                "role": user.role,
                "approval_status": user.approval_status,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "restaurant": {
                    "id": restaurant.id,
                    "name": restaurant.name,
                    "address": restaurant.address,
                    "cuisine_type": restaurant.cuisine_type,
                    "approval_status": restaurant.approval_status,
                } if restaurant else None,
                "delivery_partner": {
                    "id": partner.id,
                    "is_available": bool(partner.is_available),
                    "current_order_id": partner.current_order_id,
                    "rating": float(partner.rating or 0),
                    "total_deliveries": int(partner.total_deliveries or 0),
                } if partner else None,
            }
        )
    return {"applications": applications}


@router.patch("/restaurants/{restaurant_id}/approval")
def restaurant_approval(
    restaurant_id: int,
    body: dict,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
    actor_id: int = Depends(require_admin_user_id),
):
    r = db.query(models.Restaurant).filter(models.Restaurant.id == restaurant_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    if "approval_status" in body:
        r.approval_status = body["approval_status"]
    if "is_open" in body:
        r.is_open = bool(body["is_open"])
    if "is_public" in body:
        r.is_public = bool(body["is_public"])
    if "is_active" in body:
        r.is_active = bool(body["is_active"])

    db.commit()
    _log_audit(
        db,
        actor_id,
        "restaurant_approval_update",
        resource_type="restaurant",
        resource_id=restaurant_id,
        details=json.dumps(body),
    )
    return {"id": r.id, "approval_status": r.approval_status, "is_open": r.is_open, "is_public": r.is_public}


@router.patch("/users/{user_id}/approval")
def update_user_approval(
    user_id: int,
    body: dict,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
    actor_id: int = Depends(require_admin_user_id),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role not in {"restaurant", "delivery_partner"}:
        raise HTTPException(status_code=400, detail="Approval is only supported for partner roles")

    approval_status = str(body.get("approval_status") or "").lower()
    if approval_status not in {"pending", "approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Unsupported approval status")

    user.approval_status = approval_status
    user.approved_by_user_id = actor_id
    user.approved_at = datetime.utcnow()

    if user.role == "restaurant":
        restaurant = db.query(models.Restaurant).filter(models.Restaurant.owner_user_id == user.id).first()
        if restaurant:
            restaurant.approval_status = approval_status
            restaurant.is_public = approval_status == "approved"
            restaurant.is_open = approval_status == "approved" and bool(restaurant.is_open)
            restaurant.is_active = approval_status != "rejected"
    if user.role == "delivery_partner":
        partner = db.query(models.DeliveryPartner).filter(models.DeliveryPartner.user_id == user.id).first()
        if partner:
            partner.is_available = approval_status == "approved"

    db.commit()
    _log_audit(
        db,
        actor_id,
        "user_approval_update",
        resource_type="user",
        resource_id=user_id,
        details=json.dumps({"approval_status": approval_status, "role": user.role}),
    )
    return {
        "id": user.id,
        "role": user.role,
        "approval_status": user.approval_status,
        "approved_by_user_id": user.approved_by_user_id,
        "approved_at": user.approved_at.isoformat() if user.approved_at else None,
    }


@router.get("/audit-logs")
def audit_logs(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
    skip: int = 0,
    limit: int = 200,
):
    rows = (
        db.query(models.AuditLog)
        .order_by(models.AuditLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {
        "logs": [
            {
                "id": x.id,
                "actor_user_id": x.actor_user_id,
                "action": x.action,
                "resource_type": x.resource_type,
                "resource_id": x.resource_id,
                "details": x.details,
                "created_at": x.created_at.isoformat() if x.created_at else None,
            }
            for x in rows
        ]
    }


@router.get("/health/services")
async def health_services(_: dict = Depends(require_admin)):
    """Aggregate health from peer microservices."""
    targets = {
        "auth": f"{settings.AUTH_URL}/health",
        "user": f"{settings.USER_URL}/health",
        "restaurant": f"{settings.RESTAURANT_URL}/health",
        "order": f"{settings.ORDER_URL}/health",
        "delivery": f"{settings.DELIVERY_URL}/health",
        "payment": f"{settings.PAYMENT_URL}/health",
        "notification": f"{settings.NOTIFICATION_URL}/health",
    }
    out: dict[str, Any] = {}
    async with httpx.AsyncClient(timeout=5.0) as client:
        for name, url in targets.items():
            try:
                r = await client.get(url)
                out[name] = {"ok": r.status_code == 200, "status_code": r.status_code, "body": r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text[:200]}
            except Exception as e:
                out[name] = {"ok": False, "error": str(e)}
    return {"services": out, "checked_at": datetime.utcnow().isoformat() + "Z"}
