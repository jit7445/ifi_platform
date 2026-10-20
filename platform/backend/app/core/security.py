import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pyotp
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from Frontier_platform.platform.backend.app.core.config import get_settings
from Frontier_platform.platform.backend.app.core.errors import AppError

# argon2-cffi defaults are Argon2id with RFC 9106 low-memory parameters.
_hasher = PasswordHasher()
_DUMMY_HASH = _hasher.hash("timing-equaliser-not-a-password")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(stored_hash: str | None, password: str) -> bool:
    try:
        return _hasher.verify(stored_hash or _DUMMY_HASH, password) and stored_hash is not None
    except (VerificationError, InvalidHashError):
        return False


def needs_rehash(stored_hash: str) -> bool:
    return _hasher.check_needs_rehash(stored_hash)


def issue_access_token(user_id: uuid.UUID) -> tuple[str, int]:
    s = get_settings()
    now = datetime.now(UTC)
    claims = {
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=s.access_token_ttl_seconds)).timestamp()),
        "typ": "access",
        "jti": secrets.token_hex(8),
    }
    return jwt.encode(claims, s.jwt_secret, algorithm=s.jwt_algorithm), s.access_token_ttl_seconds


def decode_access_token(token: str) -> uuid.UUID:
    s = get_settings()
    try:
        claims = jwt.decode(token, s.jwt_secret, algorithms=[s.jwt_algorithm], options={"require": ["exp", "sub"]})
    except jwt.ExpiredSignatureError:
        raise AppError(401, "token_expired", "access token expired", headers={"WWW-Authenticate": "Bearer"})
    except jwt.PyJWTError:
        raise AppError(401, "unauthorized", "invalid access token", headers={"WWW-Authenticate": "Bearer"})
    if claims.get("typ") != "access":
        raise AppError(401, "unauthorized", "invalid access token")
    try:
        return uuid.UUID(claims["sub"])
    except ValueError:
        raise AppError(401, "unauthorized", "invalid access token")


def new_refresh_token() -> tuple[str, str]:
    token = secrets.token_urlsafe(32)
    return token, sha256_hex(token.encode())


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def new_totp_secret() -> str:
    return pyotp.random_base32()


def totp_uri(secret: str, email: str) -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name="Infollion")


def verify_totp(secret: str | None, code: str | None) -> bool:
    if not secret or not code:
        return False
    return pyotp.TOTP(secret).verify(code.strip(), valid_window=1)
