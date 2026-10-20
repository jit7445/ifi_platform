import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKeyConstraint,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from Frontier_platform.platform.backend.app.core.db import Base, IdMixin


class Rubric(IdMixin, Base):
    __tablename__ = "rubrics"
    __table_args__ = (
        UniqueConstraint("org_id", "id"),
        ForeignKeyConstraint(["org_id", "project_id"], ["projects.org_id", "projects.id"], ondelete="CASCADE"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)


class RubricVersion(IdMixin, Base):
    __tablename__ = "rubric_versions"
    __table_args__ = (
        UniqueConstraint("org_id", "id"),
        UniqueConstraint("rubric_id", "version"),
        ForeignKeyConstraint(["org_id", "rubric_id"], ["rubrics.org_id", "rubrics.id"], ondelete="CASCADE"),
        CheckConstraint("status in ('draft','published','retired')", name="rubric_version_status_ck"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    rubric_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="draft")
    instructions_md: Mapped[str] = mapped_column(Text, nullable=False, default="")
    criteria: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    error_labels: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    require_correction: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    require_overall_comment: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    content_sha256: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
