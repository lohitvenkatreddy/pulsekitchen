from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/food_delivery"
    JWT_SECRET_KEY: str = "your-super-secret-jwt-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"

    AUTH_URL: str = "http://auth-service:8000"
    ORDER_URL: str = "http://order-service:8000"
    PAYMENT_URL: str = "http://payment-service:8000"
    NOTIFICATION_URL: str = "http://notification-service:8000"
    DELIVERY_URL: str = "http://delivery-service:8000"
    RESTAURANT_URL: str = "http://restaurant-service:8000"
    USER_URL: str = "http://user-service:8000"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
