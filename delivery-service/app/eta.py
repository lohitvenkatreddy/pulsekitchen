"""
ETA Calculation and Distance Computation Module
"""

from math import radians, cos, sin, asin, sqrt
from typing import Dict, Tuple
from .config import get_settings

settings = get_settings()


def haversine_distance(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """
    Calculate the great circle distance between two points on earth (in km)
    using the Haversine formula.
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * asin(sqrt(a))

    # Earth radius in kilometers
    r = 6371

    return c * r


def calculate_eta(
    pickup_location: Dict[str, float],
    dropoff_location: Dict[str, float],
    partner_location: Dict[str, float] = None,
) -> Dict[str, any]:
    """
    Calculate ETA for delivery.

    Args:
        pickup_location: {"latitude": float, "longitude": float}
        dropoff_location: {"latitude": float, "longitude": float}
        partner_location: Current location of delivery partner (optional)

    Returns:
        dict with eta_minutes, distance_km, and breakdown
    """
    pickup_lat = pickup_location.get("latitude", 0)
    pickup_lon = pickup_location.get("longitude", 0)
    dropoff_lat = dropoff_location.get("latitude", 0)
    dropoff_lon = dropoff_location.get("longitude", 0)

    # Calculate restaurant to customer distance
    delivery_distance = haversine_distance(
        pickup_lat, pickup_lon, dropoff_lat, dropoff_lon
    )

    # Calculate partner to restaurant distance (if partner location provided)
    partner_to_restaurant = 0
    if partner_location:
        partner_lat = partner_location.get("latitude", 0)
        partner_lon = partner_location.get("longitude", 0)
        partner_to_restaurant = haversine_distance(
            partner_lat, partner_lon, pickup_lat, pickup_lon
        )

    # Calculate time components
    preparation_time = settings.PREPARATION_TIME_MINUTES

    # Time for partner to reach restaurant
    partner_travel_time = (partner_to_restaurant / settings.AVERAGE_SPEED_KMH) * 60

    # Delivery travel time
    delivery_travel_time = (delivery_distance / settings.AVERAGE_SPEED_KMH) * 60

    # Buffer time for traffic, parking, etc. (10% of travel time)
    buffer_time = (partner_travel_time + delivery_travel_time) * 0.1

    # Total ETA
    total_eta = preparation_time + partner_travel_time + delivery_travel_time + buffer_time

    return {
        "eta_minutes": round(total_eta),
        "distance_km": round(delivery_distance, 2),
        "breakdown": {
            "preparation_time_min": preparation_time,
            "partner_to_restaurant_km": round(partner_to_restaurant, 2),
            "partner_travel_time_min": round(partner_travel_time),
            "delivery_distance_km": round(delivery_distance, 2),
            "delivery_travel_time_min": round(delivery_travel_time),
            "buffer_time_min": round(buffer_time),
        },
    }


def find_nearest_available_partner(
    restaurant_location: Dict[str, float],
    available_partners: list,
    max_distance_km: float = None,
) -> Dict[str, any]:
    """
    Find the nearest available delivery partner.

    Args:
        restaurant_location: {"latitude": float, "longitude": float}
        available_partners: List of partners with lat/lon
        max_distance_km: Maximum distance to search

    Returns:
        dict with nearest partner and distance
    """
    if max_distance_km is None:
        max_distance_km = settings.BASE_DELIVERY_RADIUS_KM

    nearest_partner = None
    min_distance = float("inf")

    for partner in available_partners:
        if not partner.get("is_available", False):
            continue

        partner_lat = partner.get("latitude", 0)
        partner_lon = partner.get("longitude", 0)

        distance = haversine_distance(
            restaurant_location.get("latitude", 0),
            restaurant_location.get("longitude", 0),
            partner_lat,
            partner_lon,
        )

        if distance < min_distance and distance <= max_distance_km:
            min_distance = distance
            nearest_partner = partner

    if nearest_partner:
        return {
            "partner": nearest_partner,
            "distance_km": round(min_distance, 2),
            "found": True,
        }

    return {"partner": None, "distance_km": 0, "found": False}


def calculate_priority_eta(
    base_eta: int,
    priority_level: str,
    is_express: bool = False,
) -> int:
    """
    Adjust ETA based on priority level.
    Higher priority orders get reduced ETA estimates.

    Args:
        base_eta: Standard ETA in minutes
        priority_level: low, normal, high, critical
        is_express: Whether this is an express order

    Returns:
        Adjusted ETA in minutes
    """
    # Priority multipliers (lower = faster)
    multipliers = {
        "critical": 0.6,  # 40% faster
        "high": 0.75,     # 25% faster
        "normal": 1.0,    # Standard
        "low": 1.15,      # 15% slower (during high load)
    }

    multiplier = multipliers.get(priority_level, 1.0)

    # Express orders get additional 20% reduction
    if is_express:
        multiplier *= 0.8

    adjusted_eta = base_eta * multiplier

    # Minimum ETA of 15 minutes
    return max(15, round(adjusted_eta))
