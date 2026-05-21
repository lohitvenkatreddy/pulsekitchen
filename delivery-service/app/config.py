from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/food_delivery"
    REDIS_URL: str = "redis://localhost:6379"
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672"

    # Delivery settings
    BASE_DELIVERY_RADIUS_KM: float = 10.0
    AVERAGE_SPEED_KMH: float = 30.0
    PREPARATION_TIME_MINUTES: int = 20
    GOOGLE_MAPS_API_KEY: str = ""
    GOOGLE_DISTANCE_MATRIX_URL: str = "https://maps.googleapis.com/maps/api/distancematrix/json"
    OSRM_ROUTE_URL: str = "https://router.project-osrm.org/route/v1/driving"
    ROUTING_TIMEOUT_SECONDS: float = 4.0

@lru_cache()
def get_settings() -> Settings:
    return Settings()
