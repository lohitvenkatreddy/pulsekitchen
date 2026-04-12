from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/food_delivery"
    REDIS_URL: str = "redis://localhost:6379"

    # Payment gateway settings (Stripe example)
    STRIPE_SECRET_KEY: str = "sk_test_xxx"
    STRIPE_PUBLISHABLE_KEY: str = "pk_test_xxx"

    # Payment settings
    CURRENCY: str = "USD"
    PAYMENT_TIMEOUT_MINUTES: int = 15

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
