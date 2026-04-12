from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class MenuItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float = Field(gt=0)
    is_available: bool = True


class MenuItemPatch(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(default=None, gt=0)
    is_available: Optional[bool] = None


class RestaurantProfileUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    cuisine_type: Optional[str] = None
    is_open: Optional[bool] = None
    is_public: Optional[bool] = None


class RestaurantSummaryExtended(BaseModel):
    id: int
    name: str
    address: str
    latitude: Optional[float]
    longitude: Optional[float]
    cuisine_type: Optional[str]
    rating: float
    review_count: int = 0
    approval_status: Optional[str] = None
    is_open: bool = True
    is_public: bool = True
    is_active: bool = True

    class Config:
        from_attributes = True


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    order_id: Optional[int] = None


class ReviewResponse(BaseModel):
    id: int
    user_id: int
    restaurant_id: int
    rating: int
    comment: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class MenuItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price: float
    is_available: bool

    class Config:
        from_attributes = True


class RestaurantSummary(BaseModel):
    id: int
    name: str
    address: str
    latitude: Optional[float]
    longitude: Optional[float]
    cuisine_type: Optional[str]
    rating: float
    review_count: int = 0
    distance_km: Optional[float] = None
    is_open: bool = True
    is_public: bool = True

    class Config:
        from_attributes = True


class RestaurantDetail(RestaurantSummary):
    menu_items: List[MenuItemResponse] = []
    approval_status: Optional[str] = None


class RestaurantListResponse(BaseModel):
    restaurants: List[RestaurantSummary]
    total: int
