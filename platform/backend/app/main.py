import logging
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from Frontier_platform.platform.backend.app import jobs_registry  # noqa: F401
from Frontier_platform.platform.backend.app import models_registry  # noqa: F401
from Frontier_platform.platform.backend.app.core.config import get_settings
from Frontier_platform.platform.backend.app.core.db import app_engine
from Frontier_platform.platform.backend.app.core.errors import install_error_handlers
from Frontier_platform.platform.backend.app.modules.datasets.router import router as datasets
from Frontier_platform.platform.backend.app.modules.experts.router import router as experts
from Frontier_platform.platform.backend.app.modules.experts.staff_router import router as staff_experts
from Frontier_platform.platform.backend.app.modules.exports.router import router as exports
from Frontier_platform.platform.backend.app.modules.identity.router import router as identity
from Frontier_platform.platform.backend.app.modules.ingestion.router import router as ingestion
from Frontier_platform.platform.backend.app.modules.metrics.router import router as metrics
from Frontier_platform.platform.backend.app.modules.orgs.router import router as orgs
from Frontier_platform.platform.backend.app.modules.projects.router import router as projects
from Frontier_platform.platform.backend.app.modules.projects.staff_router import router as staff_projects
from Frontier_platform.platform.backend.app.modules.quality.router import router as gold
from Frontier_platform.platform.backend.app.modules.quality.staff_router import router as staff_qa
from Frontier_platform.platform.backend.app.modules.rubrics.router import router as rubrics
from Frontier_platform.platform.backend.app.modules.tasks.router import router as tasks

VERSION = "0.1.0"


@asynccontextmanager
async def lifespan(_: FastAPI):
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    get_settings()
    yield


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(title="Infollion Evaluation Platform API", version=VERSION, lifespan=lifespan,
                  docs_url="/docs" if s.env != "prod" else None, openapi_url="/openapi.json")
    install_error_handlers(app)
    app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in s.cors_origins.split(",") if o.strip()],
                       allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
    v1 = APIRouter(prefix="/v1")
    for r in (identity, orgs, projects, rubrics, ingestion, gold, metrics, datasets, exports, experts, tasks,
              staff_projects, staff_experts, staff_qa):
        v1.include_router(r)
    app.include_router(v1)

    @app.get("/healthz", tags=["ops"])
    def healthz():
        return {"status": "ok", "version": VERSION}

    @app.get("/readyz", tags=["ops"])
    def readyz():
        with app_engine().connect() as c:
            c.execute(text("select 1"))
        return {"status": "ready"}

    return app


app = create_app()
