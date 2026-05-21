"""
ETA Calculation and Distance Computation Module
"""

from math import radians, cos, sin, asin, sqrt
from typing import Dict, Tuple
from .config import get_settings

settings = get_settings()

PRIORITY_LEVEL_ETA_MULTIPLIERS = {
    "critical": 0.6,
    "high": 0.75,
    "normal": 1.0,
    "low": 1.15,
}

ORDER_TYPE_ETA_MULTIPLIERS = {
    "normal": 1.0,
    "student_urgent": 0.9,
    "express": 0.8,
    "travel_emergency": 0.8,
    "vip": 0.7,
    "hospital_emergency": 0.6,
}


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
    
    # Validate coordinates - if invalid, return default ETA
    if (abs(pickup_lat) < 0.001 and abs(pickup_lon) < 0.001) or \
       (abs(dropoff_lat) < 0.001 and abs(dropoff_lon) < 0.001):
        # Invalid coordinates, return default values
        return {
            "eta_minutes": 30,
            "distance_km": 5.0,
            "breakdown": {
                "preparation_time_min": settings.PREPARATION_TIME_MINUTES,
                "partner_to_restaurant_km": 0,
                "partner_travel_time_min": 0,
                "delivery_distance_km": 5.0,
                "delivery_travel_time_min": 10,
                "buffer_time_min": 0,
            },
        }

    # Calculate restaurant to customer distance
    delivery_distance = haversine_distance(
        pickup_lat, pickup_lon, dropoff_lat, dropoff_lon
    )
    
    # Sanity check - if distance is unreasonably large (>100km), cap it
    if delivery_distance > 100:
        delivery_distance = 10.0  # Default to 10km for invalid data

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
    
    # Cap maximum ETA at 90 minutes to prevent unrealistic values
    total_eta = min(total_eta, 90)

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


def calculate_direct_delivery_eta(
    pickup_location: Dict[str, float],
    dropoff_location: Dict[str, float],
) -> Dict[str, any]:
    """
    Calculate customer-visible delivery travel time from restaurant to dropoff.
    This excludes preparation time and partner-to-restaurant travel.
    """
    pickup_lat = pickup_location.get("latitude", 0)
    pickup_lon = pickup_location.get("longitude", 0)
    dropoff_lat = dropoff_location.get("latitude", 0)
    dropoff_lon = dropoff_location.get("longitude", 0)

    if (abs(pickup_lat) < 0.001 and abs(pickup_lon) < 0.001) or (
        abs(dropoff_lat) < 0.001 and abs(dropoff_lon) < 0.001
    ):
        return {
            "eta_minutes": 0,
            "distance_km": 0.0,
            "breakdown": {
                "delivery_distance_km": 0.0,
                "delivery_travel_time_min": 0,
            },
        }

    delivery_distance = haversine_distance(
        pickup_lat, pickup_lon, dropoff_lat, dropoff_lon
    )
    if delivery_distance > 100:
        delivery_distance = 10.0

    travel_time = (delivery_distance / settings.AVERAGE_SPEED_KMH) * 60
    buffer_time = travel_time * 0.1
    eta_minutes = max(1, round(travel_time + buffer_time))

    return {
        "eta_minutes": eta_minutes,
        "distance_km": round(delivery_distance, 2),
        "eta_source": "straight_line_fallback",
        "breakdown": {
            "delivery_distance_km": round(delivery_distance, 2),
            "delivery_travel_time_min": round(travel_time),
            "buffer_time_min": round(buffer_time),
        },
    }


def calculate_routed_delivery_eta(
    pickup_location: Dict[str, float],
    dropoff_location: Dict[str, float],
) -> Dict[str, any]:
    """
    Calculate delivery ETA from real road routes.

    Google Distance Matrix is used when configured because it can include live
    traffic. Without a Google key, OSRM still gives a road-network ETA. If a
    routing provider is unavailable, we fall back to the straight-line estimate.
    """
    pickup_lat = pickup_location.get("latitude", 0)
    pickup_lon = pickup_location.get("longitude", 0)
    dropoff_lat = dropoff_location.get("latitude", 0)
    dropoff_lon = dropoff_location.get("longitude", 0)

    if (abs(pickup_lat) < 0.001 and abs(pickup_lon) < 0.001) or (
        abs(dropoff_lat) < 0.001 and abs(dropoff_lon) < 0.001
    ):
        return calculate_direct_delivery_eta(pickup_location, dropoff_location)

    if settings.GOOGLE_MAPS_API_KEY:
        google_eta = _calculate_google_distance_matrix_eta(
            pickup_lat,
            pickup_lon,
            dropoff_lat,
            dropoff_lon,
        )
        if google_eta:
            return google_eta

    osrm_eta = _calculate_osrm_route_eta(
        pickup_lat,
        pickup_lon,
        dropoff_lat,
        dropoff_lon,
    )
    if osrm_eta:
        return osrm_eta

    return calculate_direct_delivery_eta(pickup_location, dropoff_location)


def _calculate_google_distance_matrix_eta(
    pickup_lat: float,
    pickup_lon: float,
    dropoff_lat: float,
    dropoff_lon: float,
) -> Dict[str, any] | None:
    try:
        import requests

        response = requests.get(
            settings.GOOGLE_DISTANCE_MATRIX_URL,
            params={
                "origins": f"{pickup_lat},{pickup_lon}",
                "destinations": f"{dropoff_lat},{dropoff_lon}",
                "mode": "driving",
                "departure_time": "now",
                "traffic_model": "best_guess",
                "key": settings.GOOGLE_MAPS_API_KEY,
            },
            timeout=settings.ROUTING_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json()
        element = payload.get("rows", [{}])[0].get("elements", [{}])[0]
        if payload.get("status") != "OK" or element.get("status") != "OK":
            return None

        duration_seconds = (
            element.get("duration_in_traffic") or element.get("duration") or {}
        ).get("value")
        distance_meters = (element.get("distance") or {}).get("value")
        if not duration_seconds or not distance_meters:
            return None

        minutes = max(1, round(duration_seconds / 60))
        distance_km = round(distance_meters / 1000, 2)
        if distance_km > 100:
            return None
        return {
            "eta_minutes": minutes,
            "distance_km": distance_km,
            "eta_source": "google_distance_matrix",
            "breakdown": {
                "delivery_distance_km": distance_km,
                "route_duration_min": minutes,
                "traffic_aware": "duration_in_traffic" in element,
            },
        }
    except Exception:
        return None


def _calculate_osrm_route_eta(
    pickup_lat: float,
    pickup_lon: float,
    dropoff_lat: float,
    dropoff_lon: float,
) -> Dict[str, any] | None:
    try:
        import requests

        response = requests.get(
            f"{settings.OSRM_ROUTE_URL}/{pickup_lon},{pickup_lat};{dropoff_lon},{dropoff_lat}",
            params={"overview": "false", "alternatives": "false", "steps": "false"},
            timeout=settings.ROUTING_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json()
        routes = payload.get("routes") or []
        if payload.get("code") != "Ok" or not routes:
            return None

        route = routes[0]
        duration_seconds = route.get("duration")
        distance_meters = route.get("distance")
        if not duration_seconds or not distance_meters:
            return None

        minutes = max(1, round(duration_seconds / 60))
        distance_km = round(distance_meters / 1000, 2)
        if distance_km > 100:
            return None
        return {
            "eta_minutes": minutes,
            "distance_km": distance_km,
            "eta_source": "osrm_route",
            "breakdown": {
                "delivery_distance_km": distance_km,
                "route_duration_min": minutes,
                "traffic_aware": False,
            },
        }
    except Exception:
        return None


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
    order_type: str = None,
) -> int:
    """
    Adjust ETA based on priority level.
    Higher priority orders get reduced ETA estimates.

    Args:
        base_eta: Standard ETA in minutes
        priority_level: low, normal, high, critical
        is_express: Whether this is an express order
        order_type: normal, student_urgent, travel_emergency, vip, hospital_emergency

    Returns:
        Adjusted ETA in minutes
    """
    base_eta = max(0, round(base_eta or 0))
    if base_eta == 0:
        return 0

    multiplier = get_priority_eta_multiplier(
        priority_level=priority_level,
        order_type=order_type,
        is_express=is_express,
    )
    adjusted_eta = round(base_eta * multiplier)

    if multiplier < 1.0:
        minimum_eta = max(5, round(base_eta * 0.5)) if base_eta >= 10 else 1
    else:
        minimum_eta = 15 if base_eta >= 15 else max(1, base_eta)

    return max(minimum_eta, adjusted_eta)


def get_priority_eta_multiplier(
    priority_level: str,
    order_type: str = None,
    is_express: bool = False,
) -> float:
    """Return the ETA multiplier implied by queue priority and urgency type."""
    normalized_level = str(priority_level or "normal").lower()
    normalized_type = str(order_type or "normal").lower()

    level_multiplier = PRIORITY_LEVEL_ETA_MULTIPLIERS.get(normalized_level, 1.0)
    type_multiplier = (
        ORDER_TYPE_ETA_MULTIPLIERS.get(normalized_type)
        if normalized_type != "normal"
        else None
    )
    multiplier = min(level_multiplier, type_multiplier) if type_multiplier else level_multiplier

    if is_express and normalized_type != "express":
        multiplier *= 0.8

    return round(multiplier, 2)


def calculate_priority_eta_details(
    base_eta: int,
    priority_level: str,
    order_type: str = None,
    is_express: bool = False,
) -> Dict[str, any]:
    """Return standard ETA, adjusted ETA, savings, and multiplier metadata."""
    standard_eta = max(0, round(base_eta or 0))
    multiplier = get_priority_eta_multiplier(
        priority_level=priority_level,
        order_type=order_type,
        is_express=is_express,
    )
    adjusted_eta = calculate_priority_eta(
        standard_eta,
        priority_level=priority_level,
        is_express=is_express,
        order_type=order_type,
    )

    return {
        "standard_eta_minutes": standard_eta,
        "eta_minutes": adjusted_eta,
        "eta_savings_minutes": max(0, standard_eta - adjusted_eta),
        "priority_multiplier": multiplier,
    }
