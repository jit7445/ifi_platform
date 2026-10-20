from fastapi import APIRouter, Cookie, Depends, Response
from pydantic import EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from Frontier_platform.platform.backend.app.core.config import get_settings
from Frontier_platform.platform.backend.app.core.db import commit, get_db, set_context
from Frontier_platform.platform.backend.app.core.deps import Principal, principal_allow_no_mfa
from Frontier_platform.platform.backend.app.core.errors import AppError, conflict
from Frontier_platform.platform.backend.app.core.schemas import StrictModel
from Frontier_platform.platform.backend.app.core.security import new_totp_secret, totp_uri, verify_totp
from Frontier_platform.platform.backend.app.modules.identity import service
from Frontier_platform.platform.backend.app.modules.identity.models import User

router = APIRouter(tags=["auth"])


class SignupIn(StrictModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=256)
    full_name: str = Field(min_length=1, max_length=200)
    org_name: str = Field(min_length=1, max_length=200)


class LoginIn(StrictModel):
    # Not EmailStr: it rejects reserved TLDs such as .local, which internal and seeded accounts use.
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=256)
    totp_code: str | None = Field(default=None, max_length=12)


class MfaVerifyIn(StrictModel):
    code: str = Field(min_length=6, max_length=12)


def user_out(u: User) -> dict:
    return {"id": str(u.id), "email": u.email, "full_name": u.full_name, "mfa_enabled": u.mfa_enabled}


def _set_cookie(response: Response, token: str) -> None:
    s = get_settings()
    response.set_cookie(
        s.refresh_cookie_name,
        token,
        max_age=s.refresh_token_ttl_days * 86400,
        path=s.refresh_cookie_path,
        httponly=True,
        secure=s.cookie_secure,
        samesite="strict",
    )


def _clear_cookie(response: Response) -> None:
    s = get_settings()
    response.delete_cookie(s.refresh_cookie_name, path=s.refresh_cookie_path, httponly=True,
                           secure=s.cookie_secure, samesite="strict")


@router.post("/auth/signup", status_code=201)
def signup(body: SignupIn, response: Response, db: Session = Depends(get_db)):
    user = service.signup(db, body.email, body.password, body.full_name, body.org_name)
    token, _ = service.issue_refresh(db, user.id)
    commit(db)
    _set_cookie(response, token)
    return {**service.access_for(user.id), "user": user_out(user)}


@router.post("/auth/login")
def login(body: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = service.login(db, body.email, body.password, body.totp_code)
    token, _ = service.issue_refresh(db, user.id)
    commit(db)
    _set_cookie(response, token)
    return {**service.access_for(user.id), "user": user_out(user)}


@router.post("/auth/refresh")
def refresh(response: Response, db: Session = Depends(get_db), ifl_refresh: str | None = Cookie(default=None)):
    user_id, token = service.rotate_refresh(db, ifl_refresh)
    commit(db)
    _set_cookie(response, token)
    return service.access_for(user_id)


@router.post("/auth/logout", status_code=204)
def logout(response: Response, db: Session = Depends(get_db), ifl_refresh: str | None = Cookie(default=None)):
    user_id = service.revoke_refresh(db, ifl_refresh)
    if user_id:
        user = db.get(User, user_id)
        if user:
            service.audit_auth(db, user, "auth.logout")
    commit(db)
    _clear_cookie(response)
    response.status_code = 204
    return response


@router.post("/auth/mfa/setup")
def mfa_setup(p: Principal = Depends(principal_allow_no_mfa), db: Session = Depends(get_db)):
    user = db.get(User, p.user_id)
    if user.mfa_enabled:
        raise conflict("mfa_already_enabled", "MFA is already enabled")
    user.mfa_secret = new_totp_secret()
    service.audit_auth(db, user, "auth.mfa_setup_started")
    commit(db)
    return {"secret": user.mfa_secret, "otpauth_url": totp_uri(user.mfa_secret, user.email)}


@router.post("/auth/mfa/verify")
def mfa_verify(body: MfaVerifyIn, p: Principal = Depends(principal_allow_no_mfa), db: Session = Depends(get_db)):
    user = db.get(User, p.user_id)
    if user.mfa_enabled:
        return {"mfa_enabled": True}
    if not verify_totp(user.mfa_secret, body.code):
        raise AppError(422, "validation_error", "invalid code", [{"field": "code", "code": "invalid", "message": "code did not verify"}])
    user.mfa_enabled = True
    service.audit_auth(db, user, "auth.mfa_enabled")
    commit(db)
    return {"mfa_enabled": True}


@router.get("/me")
def me(p: Principal = Depends(principal_allow_no_mfa), db: Session = Depends(get_db)):
    from Frontier_platform.platform.backend.app.modules.experts.models import ExpertProfile

    expert_id = None
    if p.platform:
        set_context(db, p.platform.org_id, p.user_id, "expert")
        expert_id = db.execute(select(ExpertProfile.id).where(ExpertProfile.user_id == p.user_id)).scalar()
    return {
        "user": {"id": str(p.user_id), "email": p.email, "full_name": p.full_name, "mfa_enabled": p.mfa_enabled},
        "memberships": [
            {"org_id": str(m.org_id), "org_name": m.org_name, "org_kind": m.org_kind, "roles": m.roles} for m in p.memberships
        ],
        "expert_profile_id": str(expert_id) if expert_id else None,
        "mfa_required_but_missing": get_settings().require_mfa and not p.mfa_enabled,
    }
