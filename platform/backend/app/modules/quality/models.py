import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKeyConstraint,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from Frontier_platform.platform.backend.app.core.db import Base, IdMixin


class GoldItem(IdMixin, Base):
    __tablename__ = "gold_items"
    __table_args__ = (
        UniqueConstraint("org_id", "id"),
        UniqueConstraint("item_id"),
        ForeignKeyConstraint(["org_id", "project_id"], ["projects.org_id", "projects.id"], ondelete="CASCADE"),
        ForeignKeyConstraint(["org_id", "item_id"], ["dataset_items.org_id", "dataset_items.id"], ondelete="CASCADE"),
        CheckConstraint("tolerance in (0,1)", name="gold_tolerance_ck"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    expected: Mapped[dict] = mapped_column(JSONB, nullable=False)
    tolerance: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class GoldResult(IdMixin, Base):
    __tablename__ = "gold_results"
    __table_args__ = (
        UniqueConstraint("submission_id"),
        ForeignKeyConstraint(["org_id", "submission_id"], ["submissions.org_id", "submissions.id"], ondelete="CASCADE"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    task_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    submission_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    expert_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    details: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)


class Review(IdMixin, Base):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("org_id", "id"),
        ForeignKeyConstraint(["org_id", "submission_id"], ["submissions.org_id", "submissions.id"], ondelete="CASCADE"),
        CheckConstraint("kind in ('sample','low_agreement','gold_fail','too_fast')", name="review_kind_ck"),
        CheckConstraint("status in ('open','claimed','done')", name="review_status_ck"),
        CheckConstraint(
            "decision is null or decision in ('accept','request_rework','reject','escalate')", name="review_decision_ck"
        ),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    task_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    submission_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="open")
    claimed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    decision: Mapped[str | None] = mapped_column(String(16))
    feedback: Mapped[str | None] = mapped_column(Text)
    decided_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Adjudication(IdMixin, Base):
    __tablename__ = "adjudications"
    __table_args__ = (
        UniqueConstraint("org_id", "id"),
        ForeignKeyConstraint(["org_id", "task_id"], ["evaluation_tasks.org_id", "evaluation_tasks.id"], ondelete="CASCADE"),
        CheckConstraint("status in ('open','resolved')", name="adjudication_status_ck"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    task_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="open")
    reason: Mapped[str] = mapped_column(String(24), nullable=False, default="disagreement")
    summary: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    submission_ids: Mapped[list[uuid.UUID]] = mapped_column(ARRAY(UUID(as_uuid=True)), nullable=False)
    resolution: Mapped[str | None] = mapped_column(String(24))
    selected_submission_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    final_result: Mapped[dict | None] = mapped_column(JSONB)
    rationale: Mapped[str | None] = mapped_column(Text)
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class TaskResult(IdMixin, Base):
    __tablename__ = "task_results"
    __table_args__ = (
        UniqueConstraint("task_id"),
        ForeignKeyConstraint(["org_id", "task_id"], ["evaluation_tasks.org_id", "evaluation_tasks.id"], ondelete="CASCADE"),
        CheckConstraint(
            "final_source in ('single','consensus','review','adjudication')", name="task_result_source_ck"
        ),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    task_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    final_scores: Mapped[dict] = mapped_column(JSONB, nullable=False)
    final_preference: Mapped[dict | None] = mapped_column(JSONB)
    final_correction: Mapped[dict | None] = mapped_column(JSONB)
    final_error_labels: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    final_source: Mapped[str] = mapped_column(String(16), nullable=False)
    agreement: Mapped[float | None] = mapped_column(Float)
    submission_ids: Mapped[list[uuid.UUID]] = mapped_column(ARRAY(UUID(as_uuid=True)), nullable=False)
