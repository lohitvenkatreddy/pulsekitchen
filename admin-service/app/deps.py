from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from typing import Optional

from . import auth, database

bearer = HTTPBearer(auto_error=False)


def get_db():
    yield from database.get_db()


def get_token_payload(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> dict:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    payload = auth.decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return payload


def require_admin(payload: dict = Depends(get_token_payload)) -> dict:
    role = payload.get("role")
    if role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return payload


def require_admin_user_id(admin: dict = Depends(require_admin)) -> int:
    uid = admin.get("user_id")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return int(uid)
