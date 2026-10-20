import uuid

from sqlalchemy import (
    CheckConstraint,
    ForeignKeyConstraint,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from Frontier_platform.platform.backend.app.core.db import Base, IdMixin


class Submission(IdMixin, Base):
    __tablename__ = "submissions"
    __table_args__ = (
        UniqueConstraint("org_id", "id"),
        UniqueConstraint("assignment_id", "revision"),
        ForeignKeyConstraint(
            ["org_id", "assignment_id"], ["task_assignments.org_id", "task_assignments.id"], ondelete="CASCADE"
        ),
        ForeignKeyConstraint(["org_id", "task_id"], ["evaluation_tasks.org_id", "evaluation_tasks.id"], ondelete="CASCADE"),
        CheckConstraint(
            "status in ('submitted','accepted','rework_requested','rejected','superseded')", name="submission_status_ck"
        ),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    task_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    assignment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    expert_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    expert_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    # Copied at submit time so customer-scoped reads never need the platform-org expert tables.
    expert_pseudonym: Mapped[str] = mapped_column(Text, nullable=False)
    rubric_version_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    revision: Mapped[int] = mapped_column(Integer, nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    # Slot letters replaced by model names and output ids; what QA, metrics and exports read.
    resolved: Mapped[dict] = mapped_column(JSONB, nullable=False)
    confidence: Mapped[int] = mapped_column(Integer, nullable=False)
    time_spent_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    flags: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="submitted")
