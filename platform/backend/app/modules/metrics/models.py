import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKeyConstraint, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from Frontier_platform.platform.backend.app.core.db import Base, IdMixin


class MetricRun(IdMixin, Base):
    __tablename__ = "metric_runs"
    __table_args__ = (
        ForeignKeyConstraint(["org_id", "project_id"], ["projects.org_id", "projects.id"], ondelete="CASCADE"),
        CheckConstraint("status in ('queued','running','succeeded','failed')", name="metric_run_status_ck"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="queued")
    result: Mapped[dict | None] = mapped_column(JSONB)
    error: Mapped[str | None] = mapped_column(Text)
    requested_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    computed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
