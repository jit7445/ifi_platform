"""Database-level guarantees that must hold even if an API check is missed. Runs after test_flow, whose data it reuses."""

import os

import psycopg
import pytest
from sqlalchemy import text

from Frontier_platform.platform.backend.app.core.db import new_app_session, new_ops_session, set_context


def _owner_conn():
    return psycopg.connect(os.environ["DATABASE_URL_OWNER"].replace("postgresql+psycopg://", "postgresql://"))


def _two_orgs_with_projects():
    ops = new_ops_session()
    try:
        rows = ops.execute(text("select distinct org_id from projects")).scalars().all()
    finally:
        ops.close()
    if len(rows) < 1:
        pytest.skip("needs a project from the flow test")
    return rows


def test_tenant_context_never_reads_another_orgs_rows(database):
    orgs = _two_orgs_with_projects()
    owner_org = orgs[0]
    ops = new_ops_session()
    try:
        other_org = ops.execute(
            text("select id from orgs where kind = 'customer' and id <> :o limit 1"), {"o": owner_org}
        ).scalar()
    finally:
        ops.close()
    assert other_org is not None
    db = new_app_session()
    try:
        set_context(db, other_org, None, "tenant")
        for table in ("projects", "dataset_items", "evaluation_tasks", "submissions", "audit_events"):
            leaked = db.execute(text(f"select count(*) from {table} where org_id = :o"), {"o": owner_org}).scalar()
            assert leaked == 0, f"{table} leaked rows across tenants"
        set_context(db, owner_org, None, "tenant")
        assert db.execute(text("select count(*) from projects")).scalar() > 0
    finally:
        db.rollback()
        db.close()


def test_app_role_cannot_insert_into_another_tenant(database):
    orgs = _two_orgs_with_projects()
    db = new_app_session()
    try:
        set_context(db, orgs[0], None, "tenant")
        other = "00000000-0000-7000-8000-000000000001"
        with pytest.raises(Exception, match="row-level security"):
            db.execute(text(
                "insert into audit_events (id, org_id, actor_kind, action, data, created_at)"
                " values (gen_random_uuid(), :o, 'system', 'probe', '{}'::jsonb, now())"
            ), {"o": other})
    finally:
        db.rollback()
        db.close()


@pytest.mark.parametrize(
    ("sql", "message"),
    [
        ("update rubric_versions set instructions_md = 'tampered' where status = 'published'", "rubric_immutable"),
        ("delete from rubric_versions where status = 'published'", "rubric_immutable"),
        ("update dataset_versions set notes = 'tampered' where status = 'frozen'", "dataset_frozen"),
        ("delete from dataset_version_items", "dataset_frozen"),
        ("update audit_events set action = 'tampered'", "append-only"),
        ("delete from audit_events", "append-only"),
    ],
)
def test_immutability_triggers_hold_even_for_the_owner(database, sql, message):
    with _owner_conn() as conn:
        count_sql = sql.replace("update ", "select count(*) from ").split(" set ")[0] if sql.startswith("update") else (
            sql.replace("delete from", "select count(*) from")
        )
        if conn.execute(count_sql).fetchone()[0] == 0:
            pytest.skip("no rows to protect yet")
        with pytest.raises(psycopg.errors.RaiseException, match=message):
            conn.execute(sql)
        conn.rollback()


def test_no_expert_holds_two_slots_of_one_task(database):
    with _owner_conn() as conn:
        dupes = conn.execute(
            "select task_id, expert_id, count(*) from task_assignments group by 1, 2 having count(*) > 1"
        ).fetchall()
        assert dupes == []
        total = conn.execute("select count(*) from task_assignments").fetchone()[0]
        if total == 0:
            pytest.skip("needs assignments from the flow test")
        task_id, expert_id, expert_user_id, org_id, project_id = conn.execute(
            "select task_id, expert_id, expert_user_id, org_id, project_id from task_assignments limit 1"
        ).fetchone()
        with pytest.raises(psycopg.errors.UniqueViolation):
            conn.execute(
                "insert into task_assignments (id, org_id, project_id, task_id, expert_id, expert_user_id, status,"
                " slot_map, feedback, created_at) values (gen_random_uuid(), %s, %s, %s, %s, %s, 'in_progress',"
                " '{}'::jsonb, '[]'::jsonb, now())",
                (org_id, project_id, task_id, expert_id, expert_user_id),
            )
        conn.rollback()
