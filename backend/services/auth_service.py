import os
from datetime import datetime, timedelta, timezone

import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def _get_jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise RuntimeError("JWT_SECRET is not set")
    return secret


def _get_jwt_algorithm() -> str:
    return os.getenv("JWT_ALGORITHM", "HS256")


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(subject: str, email: str) -> tuple[str, int]:
    ttl_minutes = int(os.getenv("JWT_ACCESS_TTL_MIN", "30"))
    expires_delta = timedelta(minutes=ttl_minutes)
    return _create_token(subject, email, "access", expires_delta), ttl_minutes * 60


def create_refresh_token(subject: str, email: str) -> tuple[str, int]:
    ttl_days = int(os.getenv("JWT_REFRESH_TTL_DAYS", "7"))
    expires_delta = timedelta(days=ttl_days)
    return _create_token(subject, email, "refresh", expires_delta), ttl_days * 24 * 60 * 60


def _create_token(subject: str, email: str, token_type: str, expires_delta: timedelta) -> str:
    now = _utc_now()
    payload = {
        "sub": subject,
        "email": email,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    return jwt.encode(payload, _get_jwt_secret(), algorithm=_get_jwt_algorithm())


def decode_token(token: str, token_type: str = "access") -> dict:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(
            token,
            _get_jwt_secret(),
            algorithms=[_get_jwt_algorithm()],
        )
    except ExpiredSignatureError as exc:
        raise ValueError("Token expired") from exc
    except InvalidTokenError as exc:
        raise ValueError("Invalid token") from exc

    if payload.get("type") != token_type:
        raise ValueError("Invalid token type")
    return payload
