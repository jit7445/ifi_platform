import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from Frontier_platform.platform.backend.app.core import storage
from Frontier_platform.platform.backend.app.core.audit import write_audit
from Frontier_platform.platform.backend.app.core.db import commit
from Frontier_platform.platform.backend.app.core.jobs import job, system_session
from Frontier_platform.platform.backend.app.modules.ingestion import parsing
from Frontier_platform.platform.backend.app.modules.ingestion.models import DatasetItem, Ingestion, ModelOutput, ModelRun, StoredObject
from Frontier_platform.platform.backend.app.modules.projects.models import Project

log = logging.getLogger("ifl.ingestion")


@job("ingestion.run")
def run_ingestion(ingestion_id: str, org_id: str) -> None:
    org = uuid.UUID(org_id)
    with system_session(org) as db:
        ing = db.execute(select(Ingestion).where(Ingestion.id == uuid.UUID(ingestion_id)).with_for_update()).scalar_one_or_none()
        if ing is None or ing.status not in ("queued", "running"):
            return
        ing.status = "running"
        commit(db)
        project = db.get(Project, ing.project_id)
        obj = db.get(StoredObject, ing.upload_id)
        try:
            data = storage.read_bytes(obj.object_key)
            expected = parsing.expected_outputs_for(project.task_type)
            result = parsing.parse_jsonl(data, expected) if ing.format == "jsonl" else parsing.parse_csv(data, expected)
        except UnicodeDecodeError:
            _finish(db, ing, "failed", 0, 0, 0, [{"row": 0, "message": "file is not valid UTF-8"}])
            return
        except Exception as e:
            log.exception("ingestion %s failed to read", ingestion_id)
            _finish(db, ing, "failed", 0, 0, 0, [{"row": 0, "message": f"could not read file: {type(e).__name__}"}])
            return

        existing = set(db.execute(select(DatasetItem.external_id).where(DatasetItem.project_id == project.id)).scalars())
        to_insert = []
        for r in result.rows:
            if r.external_id in existing:
                result.fail(r.row, f"id {r.external_id} already exists in this project")
            else:
                to_insert.append(r)
        if ing.on_error == "fail" and result.failed:
            _finish(db, ing, "failed", result.total, 0, result.failed, result.errors)
            return

        runs = {m.model_name: m.id for m in db.execute(select(ModelRun).where(ModelRun.project_id == project.id)).scalars()}
        for r in to_insert:
            for resp in r.responses:
                if resp["model"] not in runs:
                    db.execute(insert(ModelRun).values(id=uuid.uuid4(), org_id=org, project_id=project.id,
                                                       model_name=resp["model"]).on_conflict_do_nothing())
                    runs[resp["model"]] = db.execute(select(ModelRun.id).where(
                        ModelRun.project_id == project.id, ModelRun.model_name == resp["model"])).scalar_one()
            item = DatasetItem(org_id=org, project_id=project.id, ingestion_id=ing.id, external_id=r.external_id,
                               prompt=r.prompt, context=r.context, reference_answer=r.reference_answer,
                               item_metadata=r.metadata, content_sha256=r.content_sha256(), is_gold=False)
            db.add(item)
            db.flush()
            for pos, resp in enumerate(r.responses):
                db.add(ModelOutput(org_id=org, item_id=item.id, model_run_id=runs[resp["model"]], position=pos,
                                   text=resp["text"]))
        ok = len(to_insert)
        status = "succeeded" if result.failed == 0 else ("partially_succeeded" if ok else "failed")
        _finish(db, ing, status, result.total, ok, result.failed, result.errors)


def _finish(db, ing: Ingestion, status: str, total: int, ok: int, failed: int, errors: list[dict]) -> None:
    if status == "failed":
        db.rollback()
        from Frontier_platform.platform.backend.app.core.db import set_context

        set_context(db, ing.org_id, None, "system")
        ing = db.get(Ingestion, ing.id)
    ing.status, ing.rows_total, ing.rows_ok, ing.rows_failed = status, total, ok, failed
    ing.errors = errors[: parsing.MAX_ERRORS]
    ing.finished_at = datetime.now(UTC)
    write_audit(db, org_id=ing.org_id, actor_user_id=None, actor_kind="system", action=f"ingestion.{status}",
                target_type="ingestion", target_id=ing.id, data={"rows_ok": ok, "rows_failed": failed})
    commit(db)
