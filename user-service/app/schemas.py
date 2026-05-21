from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    CUSTOMER = "customer"
    RESTAURANT = "restaurant"
    DELIVERY_PARTNER = "delivery_partner"
    ADMIN = "admin"


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    phone_number: Optional[str]
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2)
    phone_number: Optional[str] = None


class NotificationSettings(BaseModel):
    push_enabled: bool = True
    sms_enabled: bool = True
    email_enabled: bool = True


class PrivacySettings(BaseModel):
    share_location: bool = False
    share_analytics: bool = False
    marketing_communications: bool = False


class LanguageSettings(BaseModel):
    language: str = Field("en", pattern="^(en|es|fr|zh)$")


class UserSettingsResponse(BaseModel):
    user_id: int
    notifications: NotificationSettings
    privacy: PrivacySettings
    language: str
    updated_at: Optional[datetime] = None
