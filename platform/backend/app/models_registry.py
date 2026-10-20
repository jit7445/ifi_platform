"""Imports every module's models so Base.metadata is complete."""

from Frontier_platform.platform.backend.app.core import models as _core  # noqa: F401
from Frontier_platform.platform.backend.app.modules.audit import models as _audit  # noqa: F401
from Frontier_platform.platform.backend.app.modules.datasets import models as _datasets  # noqa: F401
from Frontier_platform.platform.backend.app.modules.evaluation import models as _evaluation  # noqa: F401
from Frontier_platform.platform.backend.app.modules.experts import models as _experts  # noqa: F401
from Frontier_platform.platform.backend.app.modules.exports import models as _exports  # noqa: F401
from Frontier_platform.platform.backend.app.modules.identity import models as _identity  # noqa: F401
from Frontier_platform.platform.backend.app.modules.ingestion import models as _ingestion  # noqa: F401
from Frontier_platform.platform.backend.app.modules.metrics import models as _metrics  # noqa: F401
from Frontier_platform.platform.backend.app.modules.orgs import models as _orgs  # noqa: F401
from Frontier_platform.platform.backend.app.modules.projects import models as _projects  # noqa: F401
from Frontier_platform.platform.backend.app.modules.quality import models as _quality  # noqa: F401
from Frontier_platform.platform.backend.app.modules.rubrics import models as _rubrics  # noqa: F401
from Frontier_platform.platform.backend.app.modules.tasks import models as _tasks  # noqa: F401
from Frontier_platform.platform.backend.app.modules.usage import models as _usage  # noqa: F401
from Frontier_platform.platform.backend.app.core.db import Base

metadata = Base.metadata
