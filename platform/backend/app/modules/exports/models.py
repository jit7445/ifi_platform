import uuid
from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKeyConstraint, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from Frontier_platform.platform.backend.app.core.db import Base, IdMixin


class Export(IdMixin, Base):
    __tablename__ = "exports"
    __table_args__ = (
        UniqueConstraint("org_id", "id"),
        ForeignKeyConstraint(["org_id", "project_id"], ["projects.org_id", "projects.id"], ondelete="CASCADE"),
        ForeignKeyConstraint(
            ["org_id", "dataset_version_id"], ["dataset_versions.org_id", "dataset_versions.id"]
        ),
        CheckConstraint(
            "format in ('evaluation_results_jsonl','sft_jsonl','preference_pairs_jsonl')", name="export_format_ck"
        ),
        CheckConstraint("status in ('queued','running','succeeded','failed')", name="export_status_ck"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    dataset_version_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    format: Mapped[str] = mapped_column(String(32), nullable=False)
    options: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="queued")
    row_count: Mapped[int | None] = mapped_column(Integer)
    sha256: Mapped[str | None] = mapped_column(Text)
    size_bytes: Mapped[int | None] = mapped_column(BigInteger)
    object_key: Mapped[str | None] = mapped_column(Text)
    filename: Mapped[str | None] = mapped_column(Text)
    error: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
