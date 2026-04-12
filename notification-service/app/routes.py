from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from . import models, database, schemas
from datetime import datetime

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


# Notification templates for different events
NOTIFICATION_TEMPLATES = {
    "order_confirmed": {
        "title": "Order Confirmed! 🎉",
        "message": "Your order #{order_id} has been confirmed. Priority: {priority_level}",
    },
    "order_preparing": {
        "title": "Food Being Prepared 👨‍🍳",
        "message": "The restaurant is preparing your delicious meal!",
    },
    "order_out_for_delivery": {
        "title": "Out for Delivery! 🚴",
        "message": "Your order is on its way. ETA: {eta} minutes",
    },
    "order_delivered": {
        "title": "Order Delivered! ✅",
        "message": "Your order has been delivered. Enjoy your meal!",
    },
    "order_cancelled": {
        "title": "Order Cancelled",
        "message": "Your order #{order_id} has been cancelled.",
    },
    "payment_success": {
        "title": "Payment Successful 💳",
        "message": "Payment of ${amount} received for order #{order_id}",
    },
    "payment_failed": {
        "title": "Payment Failed ❌",
        "message": "Your payment could not be processed. Please try again.",
    },
    "general": {
        "title": "Notification",
        "message": "Update for order #{order_id} (priority: {priority_level}).",
    },
}

STATUS_TO_NOTIFICATION_TYPE = {
    "order_confirmed": models.NotificationType.ORDER_CONFIRMED,
    "order_preparing": models.NotificationType.ORDER_PREPARING,
    "order_out_for_delivery": models.NotificationType.ORDER_OUT_FOR_DELIVERY,
    "order_delivered": models.NotificationType.ORDER_DELIVERED,
    "order_cancelled": models.NotificationType.ORDER_CANCELLED,
    "payment_success": models.NotificationType.PAYMENT_SUCCESS,
    "payment_failed": models.NotificationType.PAYMENT_FAILED,
}


def send_push_notification(token: str, title: str, message: str, data: dict = None):
    """
    Send push notification via Firebase Cloud Messaging.
    In production, integrate with FCM/APNS.
    """
    # Placeholder for FCM integration
    # firebase_admin.messaging.send(...)
    print(f"[PUSH] To {token}: {title} - {message}")
    return True


def send_sms(phone_number: str, message: str):
    """
    Send SMS via Twilio.
    In production, integrate with Twilio API.
    """
    # Placeholder for Twilio integration
    # client.messages.create(...)
    print(f"[SMS] To {phone_number}: {message}")
    return True


def send_email(to_email: str, subject: str, body: str, html_body: str = None):
    """
    Send email via SendGrid.
    In production, integrate with SendGrid API.
    """
    # Placeholder for SendGrid integration
    # sg.send(...)
    print(f"[EMAIL] To {to_email}: {subject}")
    return True


@router.post("/", response_model=schemas.NotificationResponse)
def create_notification(
    notification: schemas.NotificationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db)
):
    """
    Create and send a notification through specified channels.
    """
    # Create notification record
    db_notification = models.Notification(
        user_id=notification.user_id,
        order_id=notification.order_id,
        title=notification.title,
        message=notification.message,
        notification_type=notification.notification_type.value,
        data=str(notification.data) if notification.data else None,
    )

    # Set channel flags
    if notification.channels:
        db_notification.sent_via_push = schemas.NotificationChannel.PUSH in notification.channels
        db_notification.sent_via_sms = schemas.NotificationChannel.SMS in notification.channels
        db_notification.sent_via_email = schemas.NotificationChannel.EMAIL in notification.channels

    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)

    # Send notifications in background
    if schemas.NotificationChannel.PUSH in notification.channels:
        background_tasks.add_task(
            send_push_notification_task,
            db,
            notification.user_id,
            notification.title,
            notification.message,
            notification.data,
        )

    if schemas.NotificationChannel.SMS in notification.channels:
        background_tasks.add_task(
            send_sms_task,
            db,
            notification.user_id,
            notification.message,
        )

    if schemas.NotificationChannel.EMAIL in notification.channels:
        background_tasks.add_task(
            send_email_task,
            db,
            notification.user_id,
            notification.title,
            notification.message,
        )

    db_notification.is_delivered = True
    db_notification.delivered_at = datetime.now()
    db.commit()

    return db_notification


@router.get("/user/{user_id}", response_model=List[schemas.NotificationResponse])
def get_user_notifications(
    user_id: int,
    limit: int = 20,
    unread_only: bool = False,
    db: Session = Depends(database.get_db)
):
    """Get notifications for a user."""
    query = db.query(models.Notification).filter(
        models.Notification.user_id == user_id
    )

    if unread_only:
        query = query.filter(models.Notification.is_read == False)

    notifications = query.order_by(
        models.Notification.created_at.desc()
    ).limit(limit).all()

    return notifications


@router.patch("/{notification_id}/read")
def mark_as_read(notification_id: int, db: Session = Depends(database.get_db)):
    """Mark a notification as read."""
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    notification.read_at = datetime.now()
    db.commit()

    return {"status": "success", "message": "Notification marked as read"}


@router.post("/register-push-token")
def register_push_token(
    request: schemas.RegisterPushTokenRequest,
    db: Session = Depends(database.get_db)
):
    """Register a push token for a user's device."""
    # Check if token already exists
    existing = db.query(models.PushToken).filter(
        models.PushToken.token == request.token
    ).first()

    if existing:
        existing.is_active = True
        existing.last_used_at = datetime.now()
        db.commit()
        return {"status": "success", "message": "Token updated"}

    # Create new token
    db_token = models.PushToken(
        user_id=request.user_id,
        token=request.token,
        device_type=request.device_type,
    )

    db.add(db_token)
    db.commit()

    return {"status": "success", "message": "Token registered"}


@router.post("/send-order-update")
def send_order_update(
    order_id: int,
    user_id: int,
    status_update: str,
    background_tasks: BackgroundTasks,
    priority_level: Optional[str] = "normal",
    eta: Optional[int] = None,
    db: Session = Depends(database.get_db),
):
    """
    Send order status update notification.
    This is the main endpoint called by order-service when status changes.
    """
    template = NOTIFICATION_TEMPLATES.get(status_update, NOTIFICATION_TEMPLATES["general"])

    # Format message with order details
    try:
        message = template["message"].format(
            order_id=order_id,
            priority_level=priority_level,
            eta=eta or 30,
            amount="0.00",
        )
    except KeyError:
        message = template["message"]

    notif_type = STATUS_TO_NOTIFICATION_TYPE.get(
        status_update, models.NotificationType.GENERAL
    )

    # Send push notification
    tokens = db.query(models.PushToken).filter(
        models.PushToken.user_id == user_id,
        models.PushToken.is_active == True,
    ).all()

    for token in tokens:
        background_tasks.add_task(
            send_push_notification,
            token.token,
            template["title"],
            message,
            {"order_id": order_id, "status": status_update},
        )

    # Create in-app notification
    db_notification = models.Notification(
        user_id=user_id,
        order_id=order_id,
        title=template["title"],
        message=message,
        notification_type=notif_type.value,
        is_delivered=True,
        delivered_at=datetime.now(),
    )

    db.add(db_notification)
    db.commit()

    return {"status": "success", "notification_id": db_notification.id}


@router.get("/priority-fees-info")
def get_priority_notification_info():
    """
    Get information about priority notification settings.
    High priority orders get instant notifications.
    """
    return {
        "priority_notification_rules": {
            "critical": "Immediate push + SMS + Email",
            "high": "Immediate push + SMS",
            "normal": "Immediate push",
            "low": "Batched notifications (5 min intervals)",
        }
    }


# Background task helpers
def send_push_notification_task(db, user_id, title, message, data):
    tokens = db.query(models.PushToken).filter(
        models.PushToken.user_id == user_id,
        models.PushToken.is_active == True,
    ).all()
    for token in tokens:
        send_push_notification(token.token, title, message, data)


def send_sms_task(db, user_id, message):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user and user.phone_number:
        send_sms(user.phone_number, message)


def send_email_task(db, user_id, subject, message):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user and user.email:
        send_email(user.email, subject, message)
