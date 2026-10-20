import secrets
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from Frontier_platform.platform.backend.app.core.audit import platform_org_id, write_audit
from Frontier_platform.platform.backend.app.core.config import get_settings
from Frontier_platform.platform.backend.app.core.db import set_context
from Frontier_platform.platform.backend.app.core.errors import AppError, conflict
from Frontier_platform.platform.backend.app.core.security import (
    hash_password,
    issue_access_token,
    needs_rehash,
    new_refresh_token,
    sha256_hex,
    verify_password,
    verify_totp,
)
from Frontier_platform.platform.backend.app.modules.identity.models import LoginAttempt, RefreshToken, User
from Frontier_platform.platform.backend.app.modules.orgs.models import Membership, Org


def normalize_email(email: str) -> str:
    return email.strip().lower()


def new_org_alias(db: Session) -> str:
    while True:
        alias = secrets.token_hex(2).upper()
        if db.execute(select(Org.id).where(Org.alias == alias)).first() is None:
            return alias


def audit_auth(db: Session, user: User, action: str, data: dict | None = None, org_id: uuid.UUID | None = None) -> None:
    """Auth events happen before a tenant context exists; they are filed under the user's home org."""
    if org_id is None:
        org_id = db.execute(
            select(Membership.org_id).where(Membership.user_id == user.id).order_by(Membership.created_at)
        ).scalar() or platform_org_id(db)
    set_context(db, org_id, user.id, "auth")
    write_audit(db, org_id=org_id, actor_user_id=user.id, action=action, target_type="user", target_id=user.id, data=data)


def issue_refresh(db: Session, user_id: uuid.UUID, family_id: uuid.UUID | None = None) -> tuple[str, RefreshToken]:
    token, digest = new_refresh_token()
    row = RefreshToken(
        user_id=user_id,
        family_id=family_id or uuid.uuid4(),
        token_hash=digest,
        expires_at=datetime.now(UTC) + timedelta(days=get_settings().refresh_token_ttl_days),
    )
    db.add(row)
    db.flush()
    return token, row


def signup(db: Session, email: str, password: str, full_name: str, org_name: str) -> User:
    email = normalize_email(email)
    if db.execute(select(User.id).where(User.email == email)).first():
        raise conflict("email_taken", "an account with this email already exists")
    user = User(email=email, password_hash=hash_password(password), full_name=full_name.strip(), is_active=True, mfa_enabled=False)
    org = Org(name=org_name.strip(), kind="customer", alias=new_org_alias(db))
    db.add_all([user, org])
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise conflict("email_taken", "an account with this email already exists")
    db.add(Membership(org_id=org.id, user_id=user.id, roles=["customer_admin"]))
    db.flush()
    audit_auth(db, user, "auth.signup", {"org_name": org.name}, org_id=org.id)
    return user


def _attempt_key(email: str) -> str:
    return f"email:{email}"


def _check_rate(db: Session, key: str) -> None:
    s = get_settings()
    row = db.get(LoginAttempt, key)
    if row and row.window_start > datetime.now(UTC) - timedelta(seconds=s.login_window_seconds):
        if row.failures >= s.login_max_failures:
            raise AppError(429, "too_many_attempts", "too many failed sign-in attempts; try again later",
                           headers={"Retry-After": str(s.login_window_seconds)})


def _record_failure(db: Session, key: str) -> None:
    s = get_settings()
    cutoff = datetime.now(UTC) - timedelta(seconds=s.login_window_seconds)
    stmt = insert(LoginAttempt).values(key=key, failures=1, window_start=datetime.now(UTC))
    stmt = stmt.on_conflict_do_update(
        index_elements=[LoginAttempt.key],
        set_={
            "failures": _case_failures(cutoff),
            "window_start": _case_window(cutoff),
        },
    )
    db.execute(stmt)


def _case_failures(cutoff):
    from sqlalchemy import case

    return case((LoginAttempt.window_start < cutoff, 1), else_=LoginAttempt.failures + 1)


def _case_window(cutoff):
    from sqlalchemy import case, func

    return case((LoginAttempt.window_start < cutoff, func.now()), else_=LoginAttempt.window_start)


def login(db: Session, email: str, password: str, totp_code: str | None) -> User:
    from Frontier_platform.platform.backend.app.core.db import commit

    email = normalize_email(email)
    key = _attempt_key(email)
    _check_rate(db, key)
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    ok = verify_password(user.password_hash if user else None, password)
    if not ok or user is None or not user.is_active:
        _record_failure(db, key)
        if user is not None:
            audit_auth(db, user, "auth.login_failed", {"reason": "bad_password" if not ok else "inactive"})
        commit(db)
        raise AppError(401, "invalid_credentials", "email or password is incorrect")
    if user.mfa_enabled and not verify_totp(user.mfa_secret, totp_code):
        if totp_code:
            _record_failure(db, key)
            audit_auth(db, user, "auth.login_failed", {"reason": "bad_totp"})
            commit(db)
        raise AppError(401, "mfa_required", "a valid authenticator code is required")
    db.query(LoginAttempt).filter(LoginAttempt.key == key).delete()
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
    audit_auth(db, user, "auth.login")
    return user


def rotate_refresh(db: Session, raw_token: str | None) -> tuple[uuid.UUID, str]:
    if not raw_token:
        raise AppError(401, "unauthorized", "missing refresh token")
    row = db.execute(select(RefreshToken).where(RefreshToken.token_hash == sha256_hex(raw_token.encode()))).scalar_one_or_none()
    now = datetime.now(UTC)
    if row is None:
        raise AppError(401, "unauthorized", "invalid refresh token")
    if row.revoked_at is not None:
        # A rotated token came back: assume theft and end the whole session family.
        db.execute(update(RefreshToken).where(RefreshToken.family_id == row.family_id, RefreshToken.revoked_at.is_(None))
                   .values(revoked_at=now))
        user = db.get(User, row.user_id)
        if user:
            audit_auth(db, user, "auth.refresh_reuse_detected", {"family_id": str(row.family_id)})
        from Frontier_platform.platform.backend.app.core.db import commit

        commit(db)
        raise AppError(401, "unauthorized", "refresh token reuse detected")
    if row.expires_at <= now:
        raise AppError(401, "unauthorized", "refresh token expired")
    user = db.get(User, row.user_id)
    if user is None or not user.is_active:
        raise AppError(401, "unauthorized", "user inactive")
    token, new_row = issue_refresh(db, row.user_id, row.family_id)
    row.revoked_at = now
    row.replaced_by = new_row.id
    db.flush()
    return row.user_id, token


def revoke_refresh(db: Session, raw_token: str | None) -> uuid.UUID | None:
    if not raw_token:
        return None
    row = db.execute(select(RefreshToken).where(RefreshToken.token_hash == sha256_hex(raw_token.encode()))).scalar_one_or_none()
    if row is None:
        return None
    db.execute(update(RefreshToken).where(RefreshToken.family_id == row.family_id, RefreshToken.revoked_at.is_(None))
               .values(revoked_at=datetime.now(UTC)))
    return row.user_id


def access_for(user_id: uuid.UUID) -> dict:
    token, ttl = issue_access_token(user_id)
    return {"access_token": token, "token_type": "Bearer", "expires_in": ttl}
