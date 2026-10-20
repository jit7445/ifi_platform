"""Importing this registers every background job handler (API inline mode and the worker both need it)."""

from Frontier_platform.platform.backend.app import maintenance as _maintenance  # noqa: F401
from Frontier_platform.platform.backend.app.modules.exports import router as _exports  # noqa: F401
from Frontier_platform.platform.backend.app.modules.ingestion import jobs as _ingestion  # noqa: F401
from Frontier_platform.platform.backend.app.modules.metrics import router as _metrics  # noqa: F401
from Frontier_platform.platform.backend.app.modules.quality import pipeline as _qa  # noqa: F401
