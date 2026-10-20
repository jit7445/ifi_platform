import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from Frontier_platform.platform.backend.app.core.db import Base, IdMixin

PROJECT_STATUSES = ("draft", "submitted", "changes_requested", "approved", "active", "paused", "completed", "cancelled")


class Project(IdMixin, Base):
    __tablename__ = "projects"
    __table_args__ = (
        UniqueConstraint("org_id", "id"),
        UniqueConstraint("org_id", "code"),
        CheckConstraint("status in " + str(PROJECT_STATUSES), name="project_status_ck"),
        CheckConstraint(
            "task_type in ('rubric_scoring','pairwise_preference','sft_correction')", name="project_task_type_ck"
        ),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orgs.id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    code: Mapped[str] = mapped_column(String(24), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    domain: Mapped[str] = mapped_column(Text, nullable=False, default="")
    task_type: Mapped[str] = mapped_column(String(32), nullable=False)
    languages: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(16), nullable=False)
    target_volume: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deliverable_format: Mapped[str] = mapped_column(String(32), nullable=False)
    quality: Mapped[dict] = mapped_column(JSONB, nullable=False)
    required_skills: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    excluded_companies: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="draft")
    status_note: Mapped[str | None] = mapped_column(Text)
    current_rubric_version_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))


class ProjectExpert(IdMixin, Base):
    __tablename__ = "project_experts"
    __table_args__ = (
        UniqueConstraint("project_id", "expert_id"),
        ForeignKeyConstraint(["org_id", "project_id"], ["projects.org_id", "projects.id"], ondelete="CASCADE"),
        CheckConstraint("status in ('approved','removed')", name="project_expert_status_ck"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    expert_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("expert_profiles.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    max_tasks: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="approved")
    approved_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
