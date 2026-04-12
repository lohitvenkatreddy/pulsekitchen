"""
Priority-Based Order Scheduling System

This module implements the core priority algorithm for order processing.
Priority Score = w1 * urgency + w2 * distance + w3 * waiting_time
"""

from datetime import datetime
from typing import Dict, Any
from math import sqrt
from .config import get_settings

settings = get_settings()


def calculate_urgency_score(order_data: Dict[str, Any]) -> float:
    """
    Calculate urgency score based on various factors:
    - User type (VIP, regular)
    - Order type (express, normal)
    - Time of day (peak hours = higher urgency)
    - Special circumstances (hospital, emergency)

    Returns: float between 0 and 100
    """
    score = 50.0  # Base score

    # User type factor
    if order_data.get("is_vip"):
        score += 20.0
    if order_data.get("user_type") == "hospital":
        score += 30.0

    # Order type factor
    if order_data.get("order_type") == "express":
        score += 25.0

    # Peak hours factor (12-2 PM, 7-9 PM)
    hour = datetime.now().hour
    if hour in [12, 13, 14, 19, 20, 21]:
        score += 10.0

    # Large order factor (needs faster processing)
    if order_data.get("item_count", 0) > 5:
        score += 5.0

    return min(100.0, max(0.0, score))


def calculate_distance_score(pickup: Dict[str, float], dropoff: Dict[str, float]) -> float:
    """
    Calculate distance score using Haversine formula.
    Shorter distances get higher priority scores.

    Returns: float between 0 and 100
    """
    if not pickup or not dropoff:
        return 50.0  # Default if coordinates not available

    lat1, lon1 = pickup.get("latitude", 0), pickup.get("longitude", 0)
    lat2, lon2 = dropoff.get("latitude", 0), dropoff.get("longitude", 0)

    # Haversine formula for distance calculation
    R = 6371  # Earth's radius in km

    dlat = (lat2 - lat1) * 3.14159 / 180
    dlon = (lon2 - lon1) * 3.14159 / 180

    a = (
        (dlat / 2) ** 2 +
        (lat1 * 3.14159 / 180) * (lat2 * 3.14159 / 180) * (dlon / 2) ** 2
    )
    c = 2 * sqrt(a)
    distance_km = R * c

    # Score inversely proportional to distance
    # 0-2 km = 90-100, 2-5 km = 70-90, 5-10 km = 50-70, >10 km = 0-50
    if distance_km <= 2:
        score = 90 + (2 - distance_km) * 5
    elif distance_km <= 5:
        score = 70 + (5 - distance_km) * (20 / 3)
    elif distance_km <= 10:
        score = 50 + (10 - distance_km) * 4
    else:
        score = max(0, 50 - (distance_km - 10) * 5)

    return min(100.0, max(0.0, score))


def calculate_waiting_time_score(placed_at: datetime) -> float:
    """
    Calculate waiting time score.
    Orders waiting longer get higher priority to prevent starvation.

    Returns: float between 0 and 100
    """
    if not placed_at:
        return 0.0

    waiting_minutes = (datetime.now() - placed_at).total_seconds() / 60

    # Score increases with waiting time
    # 0-5 min = 0-20, 5-15 min = 20-50, 15-30 min = 50-80, >30 min = 80-100
    if waiting_minutes <= 5:
        score = waiting_minutes * 4
    elif waiting_minutes <= 15:
        score = 20 + (waiting_minutes - 5) * 3
    elif waiting_minutes <= 30:
        score = 50 + (waiting_minutes - 15) * 2
    else:
        score = 80 + min(20, (waiting_minutes - 30) * 0.5)

    return min(100.0, max(0.0, score))


def calculate_priority_score(order_data: Dict[str, Any]) -> Dict[str, float]:
    """
    Calculate the overall priority score for an order.

    Priority Score = w1 * urgency + w2 * distance + w3 * waiting_time

    Returns: dict with individual scores and final priority score
    """
    urgency = calculate_urgency_score(order_data)

    pickup = order_data.get("pickup_location", {})
    dropoff = order_data.get("dropoff_location", {})
    distance = calculate_distance_score(pickup, dropoff)

    placed_at = order_data.get("placed_at")
    waiting = calculate_waiting_time_score(placed_at) if placed_at else 0.0

    # Calculate weighted final score
    final_score = (
        settings.WEIGHT_URGENCY * urgency +
        settings.WEIGHT_DISTANCE * distance +
        settings.WEIGHT_WAITING_TIME * waiting
    )

    return {
        "urgency_score": urgency,
        "distance_score": distance,
        "waiting_time_score": waiting,
        "priority_score": final_score,
    }


def get_priority_level(priority_score: float) -> str:
    """
    Convert priority score to priority level.

    Returns: PriorityLevel enum value
    """
    if priority_score >= 80:
        return "critical"
    elif priority_score >= 60:
        return "high"
    elif priority_score >= 40:
        return "normal"
    else:
        return "low"
