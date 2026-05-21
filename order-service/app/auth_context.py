from dataclasses import dataclass

from fastapi import Header, HTTPException
from jose import JWTError, jwt

from .config import get_settings

settings = get_settings()

PRIVILEGED_ROLES = {"admin", "restaurant", "restaurant_partner", "delivery", "staff"}


@dataclass(frozen=True)
class AuthContext:
    user_id: int | None = None
    role: str | None = None

    @property
    def is_customer_scope(self) -> bool:
        return self.user_id is not None and (self.role or "customer") not in PRIVILEGED_ROLES


def get_auth_context(authorization: str | None = Header(None)) -> AuthContext:
    if not authorization:
        return AuthContext()

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("user_id")
    return AuthContext(
        user_id=int(user_id) if user_id is not None else None,
        role=str(payload.get("role") or "customer").lower(),
    )


def assert_customer_owns_user_id(auth: AuthContext, user_id: int) -> None:
    if auth.is_customer_scope and int(auth.user_id) != int(user_id):
        raise HTTPException(status_code=403, detail="You can only access your own orders")

