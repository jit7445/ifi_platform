import uuid
from dataclasses import dataclass, field

from fastapi import Depends, Header, Path
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from Frontier_platform.platform.backend.app.core.config import get_settings
from Frontier_platform.platform.backend.app.core.db import get_db, set_context
from Frontier_platform.platform.backend.app.core.errors import AppError, forbidden, not_found
from Frontier_platform.platform.backend.app.core.security import decode_access_token

STAFF_ROLES = {"platform_admin", "project_manager"}
REVIEW_ROLES = STAFF_ROLES | {"reviewer"}
CUSTOMER_ROLES = {"customer_admin", "customer_member"}


@dataclass
class OrgMembership:
    org_id: uuid.UUID
    org_name: str
    org_kind: str
    alias: str
    roles: list[str]


@dataclass
class Principal:
    user_id: uuid.UUID
    email: str
    full_name: str
    mfa_enabled: bool
    memberships: list[OrgMembership] = field(default_factory=list)

    def membership(self, org_id: uuid.UUID) -> OrgMembership | None:
        return next((m for m in self.memberships if m.org_id == org_id), None)

    @property
    def platform(self) -> OrgMembership | None:
        return next((m for m in self.memberships if m.org_kind == "platform"), None)

    def platform_roles(self) -> set[str]:
        return set(self.platform.roles) if self.platform else set()

    @property
    def is_staff(self) -> bool:
        return bool(self.platform_roles() & STAFF_ROLES)

    @property
    def is_reviewer(self) -> bool:
        return bool(self.platform_roles() & REVIEW_ROLES)

    @property
    def is_expert(self) -> bool:
        return "expert" in self.platform_roles()


def load_principal(db: Session, user_id: uuid.UUID) -> Principal:
    from Frontier_platform.platform.backend.app.modules.identity.models import User
    from Frontier_platform.platform.backend.app.modules.orgs.models import Membership, Org

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise AppError(401, "unauthorized", "user not found or inactive", headers={"WWW-Authenticate": "Bearer"})
    rows = db.execute(
        select(Membership.roles, Org.id, Org.name, Org.kind, Org.alias)
        .join(Org, Org.id == Membership.org_id)
        .where(Membership.user_id == user_id)
        .order_by(Org.kind.desc(), Org.created_at)
    ).all()
    return Principal(
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        mfa_enabled=user.mfa_enabled,
        memberships=[OrgMembership(r.id, r.name, r.kind, r.alias, list(r.roles)) for r in rows],
    )


def _bearer(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AppError(401, "unauthorized", "missing bearer token", headers={"WWW-Authenticate": "Bearer"})
    return authorization[7:].strip()


def principal_allow_no_mfa(
    authorization: str | None = Header(default=None), db: Session = Depends(get_db)
) -> Principal:
    return load_principal(db, decode_access_token(_bearer(authorization)))


def current_principal(p: Principal = Depends(principal_allow_no_mfa)) -> Principal:
    if get_settings().require_mfa and not p.mfa_enabled:
        raise AppError(403, "mfa_required", "multi-factor authentication must be enabled")
    return p


@dataclass
class OrgContext:
    principal: Principal
    org_id: uuid.UUID
    db: Session
    scope: str

    @property
    def user_id(self) -> uuid.UUID:
        return self.principal.user_id

    @property
    def is_admin(self) -> bool:
        m = self.principal.membership(self.org_id)
        return self.scope == "staff" or bool(m and "customer_admin" in m.roles)

    def require_admin(self) -> None:
        if not self.is_admin:
            raise forbidden("customer_admin role required")


def org_context(
    org_id: uuid.UUID = Path(...),
    p: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> OrgContext:
    m = p.membership(org_id)
    if m and m.org_kind == "customer" and set(m.roles) & CUSTOMER_ROLES:
        scope = "tenant"
    elif p.is_staff:
        from Frontier_platform.platform.backend.app.modules.orgs.models import Org

        if db.get(Org, org_id) is None:
            raise not_found("organization")
        scope = "staff"
    else:
        raise not_found("organization")
    set_context(db, org_id, p.user_id, scope)
    return OrgContext(p, org_id, db, scope)


@dataclass
class StaffContext:
    principal: Principal
    db: Session

    @property
    def user_id(self) -> uuid.UUID:
        return self.principal.user_id

    @property
    def platform_org_id(self) -> uuid.UUID:
        assert self.principal.platform is not None
        return self.principal.platform.org_id

    def use_org(self, org_id: uuid.UUID) -> None:
        set_context(self.db, org_id, self.user_id, "staff")

    def use_platform(self) -> None:
        self.use_org(self.platform_org_id)

    def resolve(self, kind: str, obj_id: uuid.UUID, what: str) -> uuid.UUID:
        org_id = self.db.execute(text("select app_resolve_org(:k, :i)"), {"k": kind, "i": obj_id}).scalar()
        if org_id is None:
            raise not_found(what)
        self.use_org(org_id)
        return org_id


def _staff(p: Principal, db: Session, allowed: set[str]) -> StaffContext:
    if not (p.platform_roles() & allowed):
        raise forbidden("staff role required")
    ctx = StaffContext(p, db)
    ctx.use_platform()
    return ctx


def staff_context(p: Principal = Depends(current_principal), db: Session = Depends(get_db)) -> StaffContext:
    return _staff(p, db, STAFF_ROLES)


def reviewer_context(p: Principal = Depends(current_principal), db: Session = Depends(get_db)) -> StaffContext:
    return _staff(p, db, REVIEW_ROLES)


@dataclass
class ExpertContext:
    principal: Principal
    db: Session

    @property
    def user_id(self) -> uuid.UUID:
        return self.principal.user_id

    @property
    def platform_org_id(self) -> uuid.UUID:
        assert self.principal.platform is not None
        return self.principal.platform.org_id

    def use_org(self, org_id: uuid.UUID) -> None:
        set_context(self.db, org_id, self.user_id, "expert")


def expert_context(p: Principal = Depends(current_principal), db: Session = Depends(get_db)) -> ExpertContext:
    if not p.is_expert:
        raise forbidden("expert role required")
    ctx = ExpertContext(p, db)
    ctx.use_org(ctx.platform_org_id)
    return ctx


def idempotency_key(idempotency_key: str | None = Header(default=None, alias="Idempotency-Key")) -> str | None:
    if idempotency_key is not None and not (1 <= len(idempotency_key) <= 255):
        raise AppError(422, "validation_error", "Idempotency-Key must be 1..255 characters")
    return idempotency_key
