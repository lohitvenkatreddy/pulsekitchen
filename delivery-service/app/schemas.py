from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class DeliveryAssignmentCreate(BaseModel):
    order_id: int
    delivery_partner_id: int


class DeliveryAssignmentResponse(BaseModel):
    id: int
    order_id: int
    delivery_partner_id: int
    status: str
    assigned_at: datetime
    picked_up_at: Optional[datetime]
    delivered_at: Optional[datetime]
    eta_minutes: int
    actual_distance_km: Optional[float]

    class Config:
        from_attributes = True


class ETAResponse(BaseModel):
    order_id: int
    status: str
    eta_minutes: int
    distance_km: float
    priority_level: str
    partner_location: Optional[Dict[str, float]]


class PartnerResponse(BaseModel):
    id: int
    user_id: int
    latitude: Optional[float]
    longitude: Optional[float]
    is_available: bool
    rating: float
    total_deliveries: int
    distance_km: Optional[float] = None


class LocationUpdate(BaseModel):
    delivery_partner_id: int
    assignment_id: int
    latitude: float
    longitude: float
    speed_kmh: Optional[float] = None
