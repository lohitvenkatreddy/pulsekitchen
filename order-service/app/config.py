from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/food_delivery"
    REDIS_URL: str = "redis://localhost:6379"
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672"

    # Priority scoring weights
    WEIGHT_URGENCY: float = 0.4
    WEIGHT_DISTANCE: float = 0.35
    WEIGHT_WAITING_TIME: float = 0.25
    JWT_SECRET_KEY: str = "your-super-secret-jwt-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    BREVO_API_KEY: str = ""
    BREVO_SENDER_EMAIL: str = "no-reply@pulsekitchen.test"
    BREVO_SENDER_NAME: str = "PulseKitchen"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
