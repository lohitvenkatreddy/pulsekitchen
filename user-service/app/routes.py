from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from . import database, models, schemas, settings_models
from .security import get_token_payload

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


@router.get("/{user_id}", response_model=schemas.UserResponse)
def get_user(user_id: int, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: int,
    body: schemas.UserUpdate,
    db: Session = Depends(database.get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    data = body.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


def _get_user_or_404(user_id: int, db: Session) -> models.User:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def _get_or_create_settings(user_id: int, db: Session) -> settings_models.UserSettings:
    settings = (
        db.query(settings_models.UserSettings)
        .filter(settings_models.UserSettings.user_id == user_id)
        .first()
    )
    if settings:
        return settings

    settings = settings_models.UserSettings(user_id=user_id)
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


def _settings_response(settings: settings_models.UserSettings) -> schemas.UserSettingsResponse:
    return schemas.UserSettingsResponse(
        user_id=settings.user_id,
        notifications=schemas.NotificationSettings(
            push_enabled=settings.push_enabled,
            sms_enabled=settings.sms_enabled,
            email_enabled=settings.email_enabled,
        ),
        privacy=schemas.PrivacySettings(
            share_location=settings.share_location,
            share_analytics=settings.share_analytics,
            marketing_communications=settings.marketing_communications,
        ),
        language=settings.language,
        updated_at=settings.updated_at,
    )


@router.get("/{user_id}/settings", response_model=schemas.UserSettingsResponse)
def get_user_settings(user_id: int, db: Session = Depends(database.get_db)):
    _get_user_or_404(user_id, db)
    settings = _get_or_create_settings(user_id, db)
    return _settings_response(settings)


@router.put("/{user_id}/settings/notifications", response_model=schemas.UserSettingsResponse)
def update_notification_settings(
    user_id: int,
    body: schemas.NotificationSettings,
    db: Session = Depends(database.get_db),
):
    _get_user_or_404(user_id, db)
    settings = _get_or_create_settings(user_id, db)
    settings.push_enabled = body.push_enabled
    settings.sms_enabled = body.sms_enabled
    settings.email_enabled = body.email_enabled
    db.commit()
    db.refresh(settings)
    return _settings_response(settings)


@router.put("/{user_id}/settings/privacy", response_model=schemas.UserSettingsResponse)
def update_privacy_settings(
    user_id: int,
    body: schemas.PrivacySettings,
    db: Session = Depends(database.get_db),
):
    _get_user_or_404(user_id, db)
    settings = _get_or_create_settings(user_id, db)
    settings.share_location = body.share_location
    settings.share_analytics = body.share_analytics
    settings.marketing_communications = body.marketing_communications
    db.commit()
    db.refresh(settings)
    return _settings_response(settings)


@router.put("/{user_id}/settings/language", response_model=schemas.UserSettingsResponse)
def update_language_settings(
    user_id: int,
    body: schemas.LanguageSettings,
    db: Session = Depends(database.get_db),
):
    _get_user_or_404(user_id, db)
    settings = _get_or_create_settings(user_id, db)
    settings.language = body.language
    db.commit()
    db.refresh(settings)
    return _settings_response(settings)


@router.delete("/{user_id}/account")
def delete_account(
    user_id: int,
    db: Session = Depends(database.get_db),
    payload: dict = Depends(get_token_payload),
):
    actor_id = payload.get("user_id")
    actor_role = payload.get("role")
    if int(actor_id) != int(user_id) and actor_role != models.UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete another user")

    user = _get_user_or_404(user_id, db)
    if user.role == models.UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin accounts cannot be deleted here")

    user.is_active = False
    db.commit()
    return {"message": "Account deactivated successfully"}
