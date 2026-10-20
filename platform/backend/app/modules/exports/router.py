import json
import uuid
from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from pydantic import Field
from sqlalchemy import select

from Frontier_platform.platform.backend.app.core import idempotency
from Frontier_platform.platform.backend.app.core import storage
from Frontier_platform.platform.backend.app.core.audit import write_audit
from Frontier_platform.platform.backend.app.core.db import commit, set_context
from Frontier_platform.platform.backend.app.core.deps import OrgContext, idempotency_key, org_context
from Frontier_platform.platform.backend.app.core.errors import AppError, field_error, not_found, validation
from Frontier_platform.platform.backend.app.core.jobs import enqueue, job, system_session
from Frontier_platform.platform.backend.app.core.pagination import paginate
from Frontier_platform.platform.backend.app.core.schemas import StrictModel
from Frontier_platform.platform.backend.app.modules.datasets.models import DatasetVersion, DatasetVersionItem
from Frontier_platform.platform.backend.app.modules.exports import formats
from Frontier_platform.platform.backend.app.modules.exports.models import Export
from Frontier_platform.platform.backend.app.modules.projects.models import Project
from Frontier_platform.platform.backend.app.modules.projects.service import get_project
from Frontier_platform.platform.backend.app.modules.rubrics.models import RubricVersion

router = APIRouter(prefix="/orgs/{org_id}", tags=["exports"])


class Options(StrictModel):
    include_rationales: bool = False
    drop_ties: bool = True
    include_both_bad: bool = False


class ExportIn(StrictModel):
    dataset_version_id: uuid.UUID
    format: Literal["evaluation_results_jsonl", "sft_jsonl", "preference_pairs_jsonl"]
    options: Options = Field(default_factory=Options)


def export_out(e: Export) -> dict:
    return {"id": str(e.id), "project_id": str(e.project_id), "dataset_version_id": str(e.dataset_version_id),
            "status": e.status, "format": e.format, "options": e.options, "row_count": e.row_count, "sha256": e.sha256,
            "size_bytes": e.size_bytes, "filename": e.filename, "error": e.error, "created_at": e.created_at,
            "finished_at": e.finished_at}


@router.post("/projects/{pid}/exports", status_code=202)
def create_export(pid: uuid.UUID, body: ExportIn, ctx: OrgContext = Depends(org_context),
                  key: str | None = Depends(idempotency_key)):
    db = ctx.db
    raw = body.model_dump(mode="json")
    replay = idempotency.replay(db, ctx.user_id, key, f"export:{pid}", raw)
    if replay:
        return replay
    p = get_project(db, ctx.org_id, pid)
    dv = db.execute(select(DatasetVersion).where(DatasetVersion.id == body.dataset_version_id,
                                                 DatasetVersion.project_id == p.id)).scalar_one_or_none()
    if dv is None:
        raise not_found("dataset version")
    rv = db.get(RubricVersion, p.current_rubric_version_id) if p.current_rubric_version_id else None
    problem = formats.compatible(body.format, p.task_type, bool(rv and rv.require_correction))
    if problem:
        raise validation([field_error("format", "incompatible", problem)], "export format is not compatible with this project")
    e = Export(org_id=ctx.org_id, project_id=p.id, dataset_version_id=dv.id, format=body.format, options=raw["options"],
               status="queued", created_by=ctx.user_id)
    db.add(e)
    db.flush()
    enqueue(db, ctx.org_id, "exports.build", export_id=e.id, org_id=ctx.org_id)
    write_audit(db, org_id=ctx.org_id, actor_user_id=ctx.user_id, action="export.requested", target_type="export",
                target_id=e.id, data={"format": body.format, "dataset_version": dv.version})
    out = {"export_id": str(e.id), "status": "queued"}
    idempotency.remember(db, ctx.user_id, key, f"export:{pid}", raw, 202, out)
    commit(db)
    return JSONResponse(out, status_code=202)


@router.get("/projects/{pid}/exports")
def list_exports(pid: uuid.UUID, limit: int = 50, cursor: str | None = None, ctx: OrgContext = Depends(org_context)):
    get_project(ctx.db, ctx.org_id, pid)
    page, nxt = paginate(ctx.db, select(Export).where(Export.project_id == pid), Export, limit, cursor)
    return {"data": [export_out(r[0]) for r in page], "next_cursor": nxt}


def _export(ctx: OrgContext, eid: uuid.UUID) -> Export:
    e = ctx.db.execute(select(Export).where(Export.id == eid, Export.org_id == ctx.org_id)).scalar_one_or_none()
    if e is None:
        raise not_found("export")
    return e


@router.get("/projects/{pid}/exports/{eid}")
def get_export(pid: uuid.UUID, eid: uuid.UUID, ctx: OrgContext = Depends(org_context)):
    e = _export(ctx, eid)
    if e.project_id != pid:
        raise not_found("export")
    return export_out(e)


@router.get("/exports/{eid}/download-url")
def download_url(eid: uuid.UUID, ctx: OrgContext = Depends(org_context)):
    e = _export(ctx, eid)
    if e.status != "succeeded":
        raise AppError(409, "export_not_ready", f"export is {e.status}")
    url, expires = storage.presign_get(e.object_key, e.filename)
    write_audit(ctx.db, org_id=ctx.org_id, actor_user_id=ctx.user_id, action="export.download_url_issued",
                target_type="export", target_id=e.id, data={"expires_at": expires.isoformat()})
    commit(ctx.db)
    return jsonable_encoder({"url": url, "expires_at": expires, "filename": e.filename, "sha256": e.sha256})


@job("exports.build")
def build_export(export_id: str, org_id: str) -> None:
    org = uuid.UUID(org_id)
    with system_session(org) as db:
        e = db.get(Export, uuid.UUID(export_id))
        if e is None or e.status not in ("queued", "running"):
            return
        e.status = "running"
        commit(db)
        try:
            p = db.get(Project, e.project_id)
            dv = db.get(DatasetVersion, e.dataset_version_id)
            snaps = [r.snapshot for r in db.execute(select(DatasetVersionItem).where(
                DatasetVersionItem.dataset_version_id == dv.id).order_by(DatasetVersionItem.task_id)).scalars()]
            rows = formats.build(e.format, snaps, e.options or {})
            data = formats.to_jsonl(rows)
            filename = f"{p.code}-v{dv.version}-{e.format.removesuffix('_jsonl')}.jsonl"
            prefix = f"orgs/{org}/exports/{e.id}"
            created = datetime.now(UTC)
            man = formats.manifest(project_code=p.code, dataset_version=dv.version, dataset_manifest_sha256=dv.manifest_sha256,
                                   rubric_content_sha256=dv.rubric_content_sha256, fmt=e.format, filename=filename,
                                   data=data, row_count=len(rows), created_at=created.isoformat())
            storage.put_bytes(f"{prefix}/{filename}", data, "application/x-ndjson")
            storage.put_bytes(f"{prefix}/manifest.json", json.dumps(man, indent=2).encode(), "application/json")
            e.status, e.row_count, e.sha256, e.size_bytes = "succeeded", len(rows), man["sha256"], len(data)
            e.object_key, e.filename, e.finished_at = f"{prefix}/{filename}", filename, created
        except Exception as ex:
            db.rollback()
            set_context(db, org, None, "system")
            e = db.get(Export, uuid.UUID(export_id))
            e.status, e.error, e.finished_at = "failed", f"{type(ex).__name__}: {ex}"[:2000], datetime.now(UTC)
        write_audit(db, org_id=org, actor_user_id=None, actor_kind="system", action=f"export.{e.status}",
                    target_type="export", target_id=e.id, data={"row_count": e.row_count})
        commit(db)
