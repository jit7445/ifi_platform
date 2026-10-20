import re
import uuid
from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from pydantic import Field
from sqlalchemy import select

from Frontier_platform.platform.backend.app.core import idempotency
from Frontier_platform.platform.backend.app.core import storage
from Frontier_platform.platform.backend.app.core.audit import write_audit
from Frontier_platform.platform.backend.app.core.config import get_settings
from Frontier_platform.platform.backend.app.core.db import commit
from Frontier_platform.platform.backend.app.core.deps import OrgContext, idempotency_key, org_context
from Frontier_platform.platform.backend.app.core.errors import AppError, field_error, not_found, validation
from Frontier_platform.platform.backend.app.core.ids import uuid7
from Frontier_platform.platform.backend.app.core.jobs import enqueue
from Frontier_platform.platform.backend.app.core.pagination import paginate
from Frontier_platform.platform.backend.app.core.schemas import StrictModel
from Frontier_platform.platform.backend.app.modules.ingestion.models import DatasetItem, Ingestion, ModelOutput, ModelRun, StoredObject
from Frontier_platform.platform.backend.app.modules.projects.service import get_project

router = APIRouter(prefix="/orgs/{org_id}", tags=["ingestion"])

CONTENT_TYPES = {"application/x-ndjson", "text/csv", "application/json"}


class UploadIn(StrictModel):
    filename: str = Field(min_length=1, max_length=255)
    content_type: str
    size_bytes: int = Field(gt=0)


class IngestionIn(StrictModel):
    upload_id: uuid.UUID
    format: Literal["jsonl", "csv"]
    on_error: Literal["skip_row", "fail"] = "skip_row"


def safe_filename(name: str) -> str:
    base = name.replace("\\", "/").rsplit("/", 1)[-1]
    base = re.sub(r"[^A-Za-z0-9._-]", "_", base).strip("._") or "upload"
    return base[:120]


def ingestion_out(i: Ingestion) -> dict:
    return {
        "id": str(i.id), "project_id": str(i.project_id), "upload_id": str(i.upload_id), "format": i.format,
        "on_error": i.on_error, "status": i.status, "rows_total": i.rows_total, "rows_ok": i.rows_ok,
        "rows_failed": i.rows_failed, "errors": i.errors, "dataset_version_id": None,
        "created_at": i.created_at, "finished_at": i.finished_at,
    }


@router.post("/uploads", status_code=201)
def create_upload(body: UploadIn, ctx: OrgContext = Depends(org_context)):
    errs = []
    if body.content_type not in CONTENT_TYPES:
        errs.append(field_error("content_type", "unsupported", f"content_type must be one of {sorted(CONTENT_TYPES)}"))
    if body.size_bytes > get_settings().max_upload_bytes:
        errs.append(field_error("size_bytes", "too_large", f"max upload size is {get_settings().max_upload_bytes} bytes"))
    if errs:
        raise validation(errs)
    upload_id = uuid7()
    fname = safe_filename(body.filename)
    key = f"orgs/{ctx.org_id}/uploads/{upload_id}/{fname}"
    obj = StoredObject(id=upload_id, org_id=ctx.org_id, object_key=key, filename=fname, content_type=body.content_type,
                       declared_size=body.size_bytes, purpose="ingestion", status="pending_upload", created_by=ctx.user_id)
    ctx.db.add(obj)
    url, headers, expires = storage.presign_put(key, body.content_type)
    write_audit(ctx.db, org_id=ctx.org_id, actor_user_id=ctx.user_id, action="upload.created", target_type="stored_object",
                target_id=upload_id, data={"filename": fname, "size_bytes": body.size_bytes})
    commit(ctx.db)
    return {"upload_id": str(upload_id), "method": "PUT", "url": url, "headers": headers, "expires_at": expires}


@router.post("/uploads/{upload_id}:complete")
def complete_upload(upload_id: uuid.UUID, ctx: OrgContext = Depends(org_context)):
    obj = ctx.db.execute(select(StoredObject).where(StoredObject.id == upload_id, StoredObject.org_id == ctx.org_id)
                         .with_for_update()).scalar_one_or_none()
    if obj is None:
        raise not_found("upload")
    if obj.status == "available":
        return {"status": "available", "size_bytes": obj.size_bytes, "sha256": obj.sha256}
    if storage.head(obj.object_key) is None:
        raise AppError(409, "upload_missing", "the file has not been uploaded yet")
    digest, size = storage.sha256_of(obj.object_key)
    if size > get_settings().max_upload_bytes:
        raise AppError(413, "upload_too_large", "uploaded file exceeds the size limit")
    obj.sha256, obj.size_bytes, obj.status = digest, size, "available"
    write_audit(ctx.db, org_id=ctx.org_id, actor_user_id=ctx.user_id, action="upload.completed",
                target_type="stored_object", target_id=obj.id, data={"sha256": digest, "size_bytes": size})
    commit(ctx.db)
    return {"status": "available", "size_bytes": size, "sha256": digest}


@router.post("/projects/{pid}/ingestions", status_code=202)
def create_ingestion(pid: uuid.UUID, body: IngestionIn, ctx: OrgContext = Depends(org_context),
                     key: str | None = Depends(idempotency_key)):
    db = ctx.db
    scope = f"ingestion:{pid}"
    replay = idempotency.replay(db, ctx.user_id, key, scope, body.model_dump(mode="json"))
    if replay:
        return replay
    p = get_project(db, ctx.org_id, pid)
    if p.status in ("completed", "cancelled"):
        raise AppError(409, "project_closed", f"project is {p.status}")
    obj = db.execute(select(StoredObject).where(StoredObject.id == body.upload_id, StoredObject.org_id == ctx.org_id)).scalar_one_or_none()
    if obj is None:
        raise not_found("upload")
    if obj.status != "available":
        raise AppError(409, "upload_not_complete", "complete the upload before ingesting it")
    ing = Ingestion(org_id=ctx.org_id, project_id=p.id, upload_id=obj.id, format=body.format, on_error=body.on_error,
                    status="queued", errors=[])
    db.add(ing)
    db.flush()
    enqueue(db, ctx.org_id, "ingestion.run", ingestion_id=ing.id, org_id=ctx.org_id)
    write_audit(db, org_id=ctx.org_id, actor_user_id=ctx.user_id, action="ingestion.queued", target_type="ingestion",
                target_id=ing.id, data={"upload_id": str(obj.id)})
    out = {"ingestion_id": str(ing.id), "status": "queued"}
    idempotency.remember(db, ctx.user_id, key, scope, body.model_dump(mode="json"), 202, out)
    commit(db)
    return JSONResponse(jsonable_encoder(out), status_code=202)


@router.get("/projects/{pid}/ingestions")
def list_ingestions(pid: uuid.UUID, limit: int = 50, cursor: str | None = None, ctx: OrgContext = Depends(org_context)):
    get_project(ctx.db, ctx.org_id, pid)
    page, nxt = paginate(ctx.db, select(Ingestion).where(Ingestion.project_id == pid), Ingestion, limit, cursor)
    return {"data": [ingestion_out(r[0]) for r in page], "next_cursor": nxt}


@router.get("/projects/{pid}/ingestions/{iid}")
def get_ingestion(pid: uuid.UUID, iid: uuid.UUID, ctx: OrgContext = Depends(org_context)):
    i = ctx.db.execute(select(Ingestion).where(Ingestion.id == iid, Ingestion.project_id == pid,
                                               Ingestion.org_id == ctx.org_id)).scalar_one_or_none()
    if i is None:
        raise not_found("ingestion")
    return ingestion_out(i)


def outputs_by_item(db, item_ids: list[uuid.UUID]) -> dict[uuid.UUID, list[dict]]:
    out: dict[uuid.UUID, list[dict]] = {i: [] for i in item_ids}
    if not item_ids:
        return out
    rows = db.execute(
        select(ModelOutput, ModelRun.model_name).join(ModelRun, ModelRun.id == ModelOutput.model_run_id)
        .where(ModelOutput.item_id.in_(item_ids)).order_by(ModelOutput.item_id, ModelOutput.position)
    ).all()
    for o, model in rows:
        out[o.item_id].append({"output_id": str(o.id), "model_run_id": str(o.model_run_id), "model": model,
                               "text": o.text, "position": o.position})
    return out


@router.get("/projects/{pid}/items")
def list_items(pid: uuid.UUID, limit: int = 50, cursor: str | None = None, ctx: OrgContext = Depends(org_context)):
    get_project(ctx.db, ctx.org_id, pid)
    page, nxt = paginate(ctx.db, select(DatasetItem).where(DatasetItem.project_id == pid), DatasetItem, limit, cursor,
                         newest_first=False)
    items = [r[0] for r in page]
    outs = outputs_by_item(ctx.db, [i.id for i in items])
    return {
        "data": [
            {"id": str(i.id), "external_id": i.external_id, "prompt": i.prompt, "context": i.context,
             "reference_answer": i.reference_answer, "metadata": i.item_metadata, "is_gold": i.is_gold,
             "responses": [{"model_run_id": o["model_run_id"], "model": o["model"], "text": o["text"]} for o in outs[i.id]]}
            for i in items
        ],
        "next_cursor": nxt,
    }
