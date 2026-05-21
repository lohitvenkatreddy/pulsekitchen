from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/food_delivery"
    REDIS_URL: str = "redis://localhost:6379"
    JWT_SECRET_KEY: str = "your-super-secret-jwt-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    BREVO_API_KEY: str = ""
    BREVO_SENDER_EMAIL: str = "no-reply@pulsekitchen.test"
    BREVO_SENDER_NAME: str = "PulseKitchen"
    SIGNUP_OTP_TTL_MINUTES: int = 10
    SIGNUP_OTP_RESEND_COOLDOWN_SECONDS: int = 60
    SIGNUP_OTP_MAX_ATTEMPTS: int = 5

@lru_cache()
def get_settings() -> Settings:
    return Settings()
