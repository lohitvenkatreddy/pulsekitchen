from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/food_delivery"
    REDIS_URL: str = "redis://localhost:6379"

    # Payment gateway settings (Stripe example)
    STRIPE_SECRET_KEY: str = "sk_test_xxx"
    STRIPE_PUBLISHABLE_KEY: str = "pk_test_xxx"

    # Payment settings
    CURRENCY: str = "INR"
    PAYMENT_TIMEOUT_MINUTES: int = 15

@lru_cache()
def get_settings() -> Settings:
    return Settings()
