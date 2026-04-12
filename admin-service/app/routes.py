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
        .filter(models.Order.status == "pending")
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
        .filter(models.Order.status == "delivered")
        .scalar()
        or 0
    )
    total_revenue = db.query(func.coalesce(func.sum(models.Payment.total_amount), 0)).scalar() or 0

    return {
        "orders": {
            "total": int(total_orders),
            "pending": int(pending_orders),
            "priority": int(priority_orders),
            "delivered": int(delivered_orders),
        },
        "revenue": {"total": float(total_revenue)},
    }


@router.get("/dashboard", include_in_schema=False)
def admin_dashboard():
    return FileResponse(STATIC_DIR / "dashboard.html")


@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
    role: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
):
    q = db.query(models.User)
    if role:
        q = q.filter(models.User.role == role)
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
        .filter(models.Order.status == "pending")
        .order_by(models.Order.priority_score.desc(), models.Order.id.asc())
        .all()
    )
    rank_map = {o.id: i + 1 for i, o in enumerate(pending_ordered)}

    q = db.query(models.Order)
    if status_filter:
        q = q.filter(models.Order.status == status_filter)
    total = q.count()
    rows = q.order_by(models.Order.placed_at.desc()).offset(skip).limit(limit).all()

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
                "placed_at": o.placed_at.isoformat() if o.placed_at else None,
                "queue_rank": rank_map.get(o.id) if o.status == "pending" else None,
            }
            for o in rows
        ],
        "skip": skip,
        "limit": limit,
    }


@router.post("/dispatch/next")
def dispatch_next_priority(
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
    actor_id: int = Depends(require_admin_user_id),
):
    """Mark the highest-priority pending order as confirmed (demo dispatch)."""
    top = (
        db.query(models.Order)
        .filter(models.Order.status == "pending")
        .order_by(models.Order.priority_score.desc(), models.Order.id.asc())
        .first()
    )
    if not top:
        raise HTTPException(status_code=404, detail="No pending orders in queue")

    top.status = "confirmed"
    top.confirmed_at = datetime.utcnow()
    db.commit()
    db.refresh(top)

    _log_audit(
        db,
        actor_id,
        "dispatch_next",
        resource_type="order",
        resource_id=top.id,
        details=json.dumps({"new_status": "confirmed", "priority_score": float(top.priority_score or 0)}),
    )

    return {
        "dispatched_order_id": top.id,
        "status": top.status,
        "priority_score": top.priority_score,
    }


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
    return {
        "assignments": [
            {
                "id": a.id,
                "order_id": a.order_id,
                "delivery_partner_id": a.delivery_partner_id,
                "status": a.status,
                "eta_minutes": a.eta_minutes,
            }
            for a in rows
        ]
    }


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
