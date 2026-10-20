import uuid

from sqlalchemy import CheckConstraint, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from Frontier_platform.platform.backend.app.core.db import Base, IdMixin


class Org(IdMixin, Base):
    __tablename__ = "orgs"
    __table_args__ = (CheckConstraint("kind in ('platform','customer')", name="orgs_kind_ck"),)

    name: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    alias: Mapped[str] = mapped_column(String(8), nullable=False, unique=True)


class Membership(IdMixin, Base):
    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("org_id", "user_id"),)

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orgs.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    roles: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False)
