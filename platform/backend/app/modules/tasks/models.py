import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from Frontier_platform.platform.backend.app.core.db import Base, IdMixin

ACTIVE_ASSIGNMENT_STATUSES = ("in_progress", "submitted", "rework", "accepted")


class EvaluationTask(IdMixin, Base):
    __tablename__ = "evaluation_tasks"
    __table_args__ = (
        UniqueConstraint("org_id", "id"),
        UniqueConstraint("project_id", "item_id"),
        ForeignKeyConstraint(["org_id", "project_id"], ["projects.org_id", "projects.id"], ondelete="CASCADE"),
        ForeignKeyConstraint(["org_id", "item_id"], ["dataset_items.org_id", "dataset_items.id"], ondelete="CASCADE"),
        ForeignKeyConstraint(["org_id", "rubric_version_id"], ["rubric_versions.org_id", "rubric_versions.id"]),
        CheckConstraint(
            "status in ('open','in_progress','qa','adjudication','completed')", name="task_status_ck"
        ),
        CheckConstraint("required_overlap between 1 and 5", name="task_overlap_ck"),
        Index("evaluation_tasks_pull_idx", "project_id", "status", "created_at"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    rubric_version_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    required_overlap: Mapped[int] = mapped_column(Integer, nullable=False)
    is_gold: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="open")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class TaskAssignment(IdMixin, Base):
    __tablename__ = "task_assignments"
    __table_args__ = (
        UniqueConstraint("org_id", "id"),
        # One slot per expert per task, ever: a released or rejected slot goes to someone else.
        UniqueConstraint("task_id", "expert_id"),
        ForeignKeyConstraint(["org_id", "task_id"], ["evaluation_tasks.org_id", "evaluation_tasks.id"], ondelete="CASCADE"),
        CheckConstraint(
            "status in ('in_progress','submitted','rework','accepted','rejected','released','expired')",
            name="assignment_status_ck",
        ),
        Index("task_assignments_expert_idx", "expert_user_id", "status"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    task_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    expert_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("expert_profiles.id"), nullable=False)
    expert_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="in_progress")
    # {"A": model_output_id, "B": model_output_id}, randomised per assignment so slot order carries no signal.
    slot_map: Mapped[dict] = mapped_column(JSONB, nullable=False)
    draft: Mapped[dict | None] = mapped_column(JSONB)
    feedback: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    lease_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
