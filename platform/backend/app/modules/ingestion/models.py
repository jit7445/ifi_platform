import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from Frontier_platform.platform.backend.app.core.db import Base, IdMixin


class StoredObject(IdMixin, Base):
    __tablename__ = "stored_objects"
    __table_args__ = (
        UniqueConstraint("org_id", "id"),
        CheckConstraint("status in ('pending_upload','available','deleted')", name="stored_object_status_ck"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orgs.id"), nullable=False)
    object_key: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    filename: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str] = mapped_column(Text, nullable=False)
    declared_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    size_bytes: Mapped[int | None] = mapped_column(BigInteger)
    sha256: Mapped[str | None] = mapped_column(Text)
    purpose: Mapped[str] = mapped_column(String(32), nullable=False, default="ingestion")
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="pending_upload")
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))


class Ingestion(IdMixin, Base):
    __tablename__ = "ingestions"
    __table_args__ = (
        UniqueConstraint("org_id", "id"),
        ForeignKeyConstraint(["org_id", "project_id"], ["projects.org_id", "projects.id"], ondelete="CASCADE"),
        ForeignKeyConstraint(["org_id", "upload_id"], ["stored_objects.org_id", "stored_objects.id"]),
        CheckConstraint(
            "status in ('queued','running','succeeded','partially_succeeded','failed')", name="ingestion_status_ck"
        ),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    upload_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    format: Mapped[str] = mapped_column(String(8), nullable=False)
    on_error: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="queued")
    rows_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rows_ok: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rows_failed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    errors: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class DatasetItem(IdMixin, Base):
    __tablename__ = "dataset_items"
    __table_args__ = (
        UniqueConstraint("org_id", "id"),
        UniqueConstraint("project_id", "external_id"),
        ForeignKeyConstraint(["org_id", "project_id"], ["projects.org_id", "projects.id"], ondelete="CASCADE"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    ingestion_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    external_id: Mapped[str] = mapped_column(Text, nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    context: Mapped[str | None] = mapped_column(Text)
    reference_answer: Mapped[str | None] = mapped_column(Text)
    item_metadata: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)
    content_sha256: Mapped[str] = mapped_column(Text, nullable=False)
    is_gold: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class ModelRun(IdMixin, Base):
    __tablename__ = "model_runs"
    __table_args__ = (
        UniqueConstraint("org_id", "id"),
        UniqueConstraint("project_id", "model_name"),
        ForeignKeyConstraint(["org_id", "project_id"], ["projects.org_id", "projects.id"], ondelete="CASCADE"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    model_name: Mapped[str] = mapped_column(Text, nullable=False)


class ModelOutput(IdMixin, Base):
    __tablename__ = "model_outputs"
    __table_args__ = (
        UniqueConstraint("org_id", "id"),
        UniqueConstraint("item_id", "model_run_id"),
        ForeignKeyConstraint(["org_id", "item_id"], ["dataset_items.org_id", "dataset_items.id"], ondelete="CASCADE"),
        ForeignKeyConstraint(["org_id", "model_run_id"], ["model_runs.org_id", "model_runs.id"]),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    model_run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
