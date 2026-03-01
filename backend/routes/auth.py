import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from dependencies import get_db
from models.db_models import EmailVerification, OAuthAccount, User
from schemas.auth import (
    LoginRequest,
    MessageResponse,
    ProfileUpdateRequest,
    RefreshRequest,
    RegisterRequest,
    ResendRequest,
    TokenResponse,
    UserOut,
    VerifyRequest,
)
from services.auth_service import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from services.email_service import send_verification_email
from auth_dependencies import get_current_user


auth_router = APIRouter(prefix="/auth", tags=["Auth"])

oauth = OAuth()

oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)

def _ensure_tz(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _code_secret() -> str:
    return os.getenv("EMAIL_CODE_SECRET") or os.getenv("JWT_SECRET", "")


def _hash_code(code: str) -> str:
    payload = f"{_code_secret()}:{code}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _verification_ttl_minutes() -> int:
    return int(os.getenv("EMAIL_VERIFY_TTL_MINUTES", "10"))


def _verification_max_attempts() -> int:
    return int(os.getenv("EMAIL_VERIFY_MAX_ATTEMPTS", "5"))


def _resend_cooldown_seconds() -> int:
    return int(os.getenv("EMAIL_VERIFY_RESEND_COOLDOWN_SECONDS", "60"))


def _user_out(user: User) -> UserOut:
    prefs = user.preferences or {}
    return UserOut(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        is_verified=user.is_verified,
        is_active=user.is_active,
        created_via=user.created_via or "email",
        university=prefs.get("university"),
        field_of_study=prefs.get("field_of_study"),
        academic_level=prefs.get("academic_level"),
    )


def _issue_tokens(user: User) -> TokenResponse:
    access_token, access_expires = create_access_token(str(user.id), user.email)
    refresh_token, _ = create_refresh_token(str(user.id), user.email)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=access_expires,
        user=_user_out(user),
    )


def _ensure_password_length(password: str) -> None:
    if not password:
        raise HTTPException(status_code=400, detail="Password is required")
    if len(password.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="Password must be 72 bytes or fewer")


def _create_and_send_code(db: Session, user: User) -> None:
    db.query(EmailVerification).filter(EmailVerification.user_id == user.id).delete()

    code = f"{secrets.randbelow(10 ** 6):06d}"
    expires_at = _utc_now() + timedelta(minutes=_verification_ttl_minutes())

    verification = EmailVerification(
        user_id=user.id,
        code_hash=_hash_code(code),
        expires_at=expires_at,
        attempts=0,
    )
    db.add(verification)
    db.commit()

    send_verification_email(user.email, code)


@auth_router.post("/register", response_model=MessageResponse)
async def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    _ensure_password_length(payload.password)
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        if existing.is_verified:
            raise HTTPException(status_code=409, detail="Email already registered")
        # If not verified, resend a code instead of failing
        try:
            _create_and_send_code(db, existing)
        except Exception as exc:
            return MessageResponse(
                message=(
                    "Account exists but verification email could not be sent. "
                    "Please use resend code after configuring email."
                )
            )
        return MessageResponse(message="Account exists. Verification code resent.")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        created_via="email",
        is_verified=False,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    try:
        _create_and_send_code(db, user)
        return MessageResponse(message="Account created. Verification code sent.")
    except Exception:
        # Keep the user; allow resend later instead of failing registration
        return MessageResponse(
            message=(
                "Account created but verification email could not be sent. "
                "Please configure email and use resend code."
            )
        )


@auth_router.post("/verify", response_model=MessageResponse)
async def verify_email(payload: VerifyRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    verification = (
        db.query(EmailVerification)
        .filter(EmailVerification.user_id == user.id)
        .order_by(EmailVerification.created_at.desc())
        .first()
    )

    if not verification:
        raise HTTPException(status_code=400, detail="Verification code not found")

    if _ensure_tz(verification.expires_at) < _utc_now():
        raise HTTPException(status_code=400, detail="Verification code expired")

    if verification.attempts >= _verification_max_attempts():
        raise HTTPException(status_code=400, detail="Verification attempts exceeded")

    if verification.code_hash != _hash_code(payload.code):
        verification.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid verification code")

    user.is_verified = True
    db.query(EmailVerification).filter(EmailVerification.user_id == user.id).delete()
    db.commit()

    return MessageResponse(message="Email verified. You can now log in.")


@auth_router.post("/resend-code", response_model=MessageResponse)
async def resend_code(payload: ResendRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return MessageResponse(message="If the account exists, a code was sent.")

    if user.is_verified:
        return MessageResponse(message="Account already verified.")

    last_verification = (
        db.query(EmailVerification)
        .filter(EmailVerification.user_id == user.id)
        .order_by(EmailVerification.created_at.desc())
        .first()
    )

    if last_verification:
        elapsed = (_utc_now() - _ensure_tz(last_verification.created_at)).total_seconds()
        if elapsed < _resend_cooldown_seconds():
            raise HTTPException(
                status_code=429,
                detail="Please wait before requesting another code.",
            )

    try:
        _create_and_send_code(db, user)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Verification email failed: {exc}") from exc

    return MessageResponse(message="Verification code resent.")


@auth_router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: Session = Depends(get_db)):
    _ensure_password_length(payload.password)
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    # Update last login timestamp
    user.last_login_at = _utc_now()
    db.commit()

    return _issue_tokens(user)


@auth_router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: RefreshRequest, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for a new access token."""
    try:
        claims = decode_token(payload.refresh_token, token_type="refresh")
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))

    user = db.query(User).filter(User.id == claims["sub"]).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return _issue_tokens(user)


@auth_router.get("/me", response_model=UserOut)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return _user_out(current_user)


@auth_router.put("/profile", response_model=UserOut)
async def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the current user's profile."""
    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip()
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url

    # Persist extra profile fields in the preferences JSONB column
    prefs = dict(current_user.preferences or {})
    for field in ("university", "field_of_study", "academic_level"):
        val = getattr(payload, field, None)
        if val is not None:
            prefs[field] = val.strip() if val.strip() else None
    current_user.preferences = prefs

    db.commit()
    db.refresh(current_user)

    return _user_out(current_user)


@auth_router.get("/google/login")
async def google_login(request: Request):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URL")

    if not client_id or not client_secret or not redirect_uri:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured")

    redirect_target = request.query_params.get("redirect")
    if redirect_target:
        request.session["redirect"] = redirect_target

    return await oauth.google.authorize_redirect(request, redirect_uri)


@auth_router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URL")

    if not client_id or not client_secret or not redirect_uri:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured")

    token = await oauth.google.authorize_access_token(request)
    userinfo = token.get("userinfo")
    if not userinfo:
        userinfo = await oauth.google.parse_id_token(request, token)

    email = userinfo.get("email")
    sub = userinfo.get("sub")
    email_verified = userinfo.get("email_verified", False)

    if not email or not sub:
        raise HTTPException(status_code=400, detail="Google login failed")

    oauth_account = (
        db.query(OAuthAccount)
        .filter(OAuthAccount.provider == "google", OAuthAccount.provider_sub == sub)
        .first()
    )

    if oauth_account:
        user = oauth_account.user
    else:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                password_hash=None,
                is_verified=bool(email_verified),
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            if email_verified and not user.is_verified:
                user.is_verified = True
                db.commit()

        oauth_account = OAuthAccount(
            user_id=user.id,
            provider="google",
            provider_sub=sub,
        )
        db.add(oauth_account)
        db.commit()

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    tokens = _issue_tokens(user)

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5500").rstrip("/")
    login_url = f"{frontend_url}/login.html"

    redirect_target = request.session.pop("redirect", None)
    if not redirect_target or not redirect_target.startswith(frontend_url):
        redirect_target = f"{frontend_url}/frontend/html/analyzer.html"

    query = urlencode(
        {
            "access_token": tokens.access_token,
            "refresh_token": tokens.refresh_token,
            "redirect": redirect_target,
        }
    )
    redirect_url = f"{login_url}?{query}"
    return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
