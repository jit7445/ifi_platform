import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from Frontier_platform.platform.backend.app.core.db import Base, IdMixin


class Skill(Base):
    __tablename__ = "skills"

    key: Mapped[str] = mapped_column(Text, primary_key=True)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    domain: Mapped[str] = mapped_column(Text, nullable=False)


class ExpertProfile(IdMixin, Base):
    __tablename__ = "expert_profiles"
    __table_args__ = (
        UniqueConstraint("org_id", "id"),
        CheckConstraint("status in ('active','suspended','pending')", name="expert_status_ck"),
        CheckConstraint("tier in ('standard','senior')", name="expert_tier_ck"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orgs.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    pseudonym: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    headline: Mapped[str] = mapped_column(Text, nullable=False, default="")
    bio: Mapped[str] = mapped_column(Text, nullable=False, default="")
    years_experience: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    country: Mapped[str] = mapped_column(Text, nullable=False, default="")
    languages: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    weekly_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active")
    tier: Mapped[str] = mapped_column(String(16), nullable=False, default="standard")


class ExpertSkill(Base):
    __tablename__ = "expert_skills"
    __table_args__ = (
        ForeignKeyConstraint(["org_id", "expert_id"], ["expert_profiles.org_id", "expert_profiles.id"], ondelete="CASCADE"),
        CheckConstraint("level between 1 and 5", name="expert_skill_level_ck"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    expert_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    skill_key: Mapped[str] = mapped_column(Text, ForeignKey("skills.key"), primary_key=True)
    level: Mapped[int] = mapped_column(Integer, nullable=False)


class ExpertCredential(IdMixin, Base):
    __tablename__ = "expert_credentials"
    __table_args__ = (
        ForeignKeyConstraint(["org_id", "expert_id"], ["expert_profiles.org_id", "expert_profiles.id"], ondelete="CASCADE"),
        CheckConstraint(
            "kind in ('degree','license','certification','employment','publication')", name="credential_kind_ck"
        ),
        CheckConstraint("status in ('pending','verified','rejected')", name="credential_status_ck"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    expert_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    issuer: Mapped[str] = mapped_column(Text, nullable=False)
    year: Mapped[int | None] = mapped_column(Integer)
    identifier: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="pending")
    note: Mapped[str | None] = mapped_column(Text)
    verified_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ExpertConflict(IdMixin, Base):
    __tablename__ = "expert_conflicts"
    __table_args__ = (
        ForeignKeyConstraint(["org_id", "expert_id"], ["expert_profiles.org_id", "expert_profiles.id"], ondelete="CASCADE"),
        CheckConstraint(
            "relationship in ('employee','former_employee','consultant','investor','family','other')",
            name="conflict_relationship_ck",
        ),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    expert_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    organization_name: Mapped[str] = mapped_column(Text, nullable=False)
    relationship: Mapped[str] = mapped_column(String(24), nullable=False)
    until: Mapped[date | None] = mapped_column(Date)
