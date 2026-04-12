from typing import Optional
from jose import JWTError, jwt
from .config import get_settings

settings = get_settings()


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None
