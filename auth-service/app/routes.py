from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from datetime import datetime, timedelta, timezone
import secrets
from . import models, schemas, auth, database, email_service
from .config import get_settings

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
bearer_scheme = HTTPBearer(auto_error=False)


def _role_value(role) -> str:
    return role if isinstance(role, str) else role.value


def _approval_value(status_value) -> str:
    return status_value if isinstance(status_value, str) else status_value.value


def _token_from_request(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> str:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_email(email: str) -> str:
    return str(email).strip().lower()


def _generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _hash_otp(email: str, otp_code: str) -> str:
    return auth.get_password_hash(f"{_normalize_email(email)}:{otp_code}")


def _verify_otp_hash(email: str, otp_code: str, otp_hash: str) -> bool:
    return auth.verify_password(f"{_normalize_email(email)}:{otp_code}", otp_hash)


def _is_expired(expires_at: datetime) -> bool:
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at <= _utc_now()


def _initial_approval_status(role: schemas.UserRole) -> str:
    if role in {schemas.UserRole.RESTAURANT, schemas.UserRole.DELIVERY_PARTNER}:
        return schemas.ApprovalStatus.PENDING.value
    return schemas.ApprovalStatus.APPROVED.value


def _create_user(
    *,
    db: Session,
    email: str,
    password: str,
    full_name: str,
    phone_number: Optional[str],
    role: schemas.UserRole,
) -> models.User:
    db_user = models.User(
        email=email,
        password_hash=auth.get_password_hash(password),
        full_name=full_name,
        phone_number=phone_number,
        role=_role_value(role),
        approval_status=_initial_approval_status(role),
        is_verified=True,
    )
    db.add(db_user)
    db.flush()
    return db_user


@router.post(
    "/register/request-otp",
    response_model=schemas.SignupOTPResponse,
)
def request_signup_otp(
    body: schemas.SignupOTPRequest,
    db: Session = Depends(database.get_db),
):
    settings = get_settings()
    email = _normalize_email(body.email)

    existing_user = db.query(models.User).filter(models.User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    latest_otp = (
        db.query(models.SignupEmailOTP)
        .filter(models.SignupEmailOTP.email == email, models.SignupEmailOTP.is_used.is_(False))
        .order_by(desc(models.SignupEmailOTP.created_at))
        .first()
    )
    if latest_otp and latest_otp.sent_at:
        sent_at = latest_otp.sent_at
        if sent_at.tzinfo is None:
            sent_at = sent_at.replace(tzinfo=timezone.utc)
        cooldown_until = sent_at + timedelta(seconds=settings.SIGNUP_OTP_RESEND_COOLDOWN_SECONDS)
        if cooldown_until > _utc_now():
            raise HTTPException(
                status_code=429,
                detail="Please wait before requesting another OTP",
            )

    otp_code = _generate_otp()
    expires_at = _utc_now() + timedelta(minutes=settings.SIGNUP_OTP_TTL_MINUTES)

    email_service.send_signup_otp_email(email, body.full_name, otp_code)

    db_otp = models.SignupEmailOTP(
        email=email,
        otp_hash=_hash_otp(email, otp_code),
        expires_at=expires_at,
        sent_at=_utc_now(),
    )
    db.add(db_otp)
    db.commit()

    return schemas.SignupOTPResponse(
        message="Verification code sent to your email",
        expires_in_minutes=settings.SIGNUP_OTP_TTL_MINUTES,
    )


@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    settings = get_settings()
    email = _normalize_email(user.email)
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    if user.role != schemas.UserRole.CUSTOMER:
        raise HTTPException(
            status_code=400,
            detail="Use the dedicated registration flow for restaurant owners or delivery agents",
        )

    if user.role == schemas.UserRole.CUSTOMER:
        if not user.email_otp:
            raise HTTPException(status_code=400, detail="Email OTP is required")

        otp_record = (
            db.query(models.SignupEmailOTP)
            .filter(models.SignupEmailOTP.email == email, models.SignupEmailOTP.is_used.is_(False))
            .order_by(desc(models.SignupEmailOTP.created_at))
            .first()
        )
        if not otp_record or _is_expired(otp_record.expires_at):
            raise HTTPException(status_code=400, detail="Email OTP has expired")
        if otp_record.attempts >= settings.SIGNUP_OTP_MAX_ATTEMPTS:
            raise HTTPException(status_code=400, detail="Too many invalid OTP attempts")
        if not _verify_otp_hash(email, user.email_otp, otp_record.otp_hash):
            otp_record.attempts += 1
            db.commit()
            raise HTTPException(status_code=400, detail="Invalid email OTP")

        otp_record.is_used = True

    db_user = _create_user(
        db=db,
        email=email,
        password=user.password,
        full_name=user.full_name,
        phone_number=user.phone_number,
        role=user.role,
    )
    db.commit()
    db.refresh(db_user)

    return db_user


@router.post(
    "/register/restaurant-owner",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_restaurant_owner(
    body: schemas.RestaurantOwnerRegistration,
    db: Session = Depends(database.get_db),
):
    email = _normalize_email(body.email)
    existing_user = db.query(models.User).filter(models.User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user = _create_user(
        db=db,
        email=email,
        password=body.password,
        full_name=body.full_name,
        phone_number=body.phone_number,
        role=schemas.UserRole.RESTAURANT,
    )

    db.add(
        models.Restaurant(
            owner_user_id=db_user.id,
            name=body.restaurant_name,
            address=body.restaurant_address,
            latitude=body.latitude,
            longitude=body.longitude,
            cuisine_type=body.cuisine_type,
            approval_status=schemas.ApprovalStatus.PENDING.value,
        )
    )
    db.commit()

    db.refresh(db_user)
    return db_user


@router.post(
    "/register/delivery-partner",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_delivery_partner(
    body: schemas.DeliveryPartnerRegistration,
    db: Session = Depends(database.get_db),
):
    email = _normalize_email(body.email)
    existing_user = db.query(models.User).filter(models.User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user = _create_user(
        db=db,
        email=email,
        password=body.password,
        full_name=body.full_name,
        phone_number=body.phone_number,
        role=schemas.UserRole.DELIVERY_PARTNER,
    )
    db.add(
        models.DeliveryPartner(
            user_id=db_user.id,
            latitude=body.latitude,
            longitude=body.longitude,
            is_available=False,
            rating=0.0,
            total_deliveries=0,
        )
    )
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/login", response_model=schemas.Token)
def login(user_credentials: schemas.UserLogin, db: Session = Depends(database.get_db)):
    # Find user by email
    user = db.query(models.User).filter(models.User.email == user_credentials.email).first()

    if not user or not auth.verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Account not verified")
    if user.role in {
        schemas.UserRole.RESTAURANT.value,
        schemas.UserRole.DELIVERY_PARTNER.value,
    } and user.approval_status != schemas.ApprovalStatus.APPROVED.value:
        detail = (
            "Your application is waiting for admin approval"
            if user.approval_status == schemas.ApprovalStatus.PENDING.value
            else "Your application was rejected by the admin"
        )
        raise HTTPException(status_code=403, detail=detail)

    # Create access token
    access_token = auth.create_access_token(
        data={"sub": user.email, "user_id": user.id, "role": _role_value(user.role)}
    )

    return schemas.Token(
        access_token=access_token,
        token_type="bearer",
        user=schemas.UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            phone_number=user.phone_number,
            role=user.role,
            approval_status=_approval_value(user.approval_status),
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at,
        )
    )


@router.put("/change-password")
def change_password(
    body: schemas.PasswordChange,
    token: str = Depends(_token_from_request),
    db: Session = Depends(database.get_db),
):
    payload = auth.decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(models.User).filter(models.User.id == payload.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not auth.verify_password(body.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if body.current_password == body.new_password:
        raise HTTPException(status_code=400, detail="New password must be different")

    user.password_hash = auth.get_password_hash(body.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@router.get("/me", response_model=schemas.UserResponse)
def get_current_user(
    token: str = Depends(_token_from_request),
    db: Session = Depends(database.get_db),
):
    payload = auth.decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(models.User).filter(models.User.id == payload.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user
