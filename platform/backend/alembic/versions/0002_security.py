"""roles, grants, row-level security, integrity triggers, security-definer helpers

Revision ID: 0002_security
Revises: 0001_schema
"""
import sqlalchemy as sa
from alembic import op

from Frontier_platform.platform.backend.app.core.config import get_settings

revision = "0002_security"
down_revision = "0001_schema"
branch_labels = None
depends_on = None

ACTIVE = "('in_progress','submitted','rework','accepted')"

# Identity and reference tables (users, orgs, memberships, refresh_tokens, login_attempts, skills)
# are read before any tenant context exists, so they are protected by the application layer only.

# Tenant data never visible to experts.
TENANT_ONLY = [
    "stored_objects",
    "ingestions",
    "model_runs",
    "gold_items",
    "gold_results",
    "reviews",
    "adjudications",
    "task_results",
    "metric_runs",
    "dataset_versions",
    "dataset_version_items",
    "exports",
    "usage_records",
]
# Tenant data experts may read inside the org context of an assignment they hold.
TENANT_EXPERT_READ = ["rubrics", "rubric_versions"]

HELPERS = """
CREATE OR REPLACE FUNCTION app_current_org() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.org_id', true), '')::uuid $$;
CREATE OR REPLACE FUNCTION app_current_user() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;
CREATE OR REPLACE FUNCTION app_role_scope() RETURNS text LANGUAGE sql STABLE AS
$$ SELECT coalesce(nullif(current_setting('app.role_scope', true), ''), 'none') $$;
"""


def _rls(table: str) -> list[str]:
    return [f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY", f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY"]


def _tenant_rw(table: str, allow_expert: bool = False) -> str:
    cond = "org_id = app_current_org()" + ("" if allow_expert else " AND app_role_scope() <> 'expert'")
    return f"CREATE POLICY tenant_rw ON {table} FOR ALL USING ({cond}) WITH CHECK ({cond})"


def _policies() -> list[str]:
    s: list[str] = []
    for t in TENANT_ONLY:
        s += _rls(t) + [_tenant_rw(t)]
    for t in TENANT_EXPERT_READ:
        s += _rls(t) + [_tenant_rw(t), f"CREATE POLICY expert_read ON {t} FOR SELECT USING (org_id = app_current_org())"]

    s += _rls("projects") + [
        _tenant_rw("projects"),
        """CREATE POLICY expert_read ON projects FOR SELECT USING (
             app_role_scope() = 'expert' AND EXISTS (
               SELECT 1 FROM project_experts pe WHERE pe.project_id = projects.id
                 AND pe.user_id = app_current_user() AND pe.status = 'approved'))""",
    ]
    s += _rls("project_experts") + [
        _tenant_rw("project_experts"),
        """CREATE POLICY expert_own ON project_experts FOR SELECT USING (
             app_role_scope() = 'expert' AND user_id = app_current_user())""",
    ]
    # ADR-017: experts reach items, outputs and tasks only through a live assignment of their own.
    s += _rls("task_assignments") + [
        _tenant_rw("task_assignments"),
        """CREATE POLICY expert_own ON task_assignments FOR ALL
             USING (app_role_scope() = 'expert' AND expert_user_id = app_current_user())
             WITH CHECK (app_role_scope() = 'expert' AND expert_user_id = app_current_user())""",
    ]
    s += _rls("evaluation_tasks") + [
        _tenant_rw("evaluation_tasks"),
        f"""CREATE POLICY expert_assigned ON evaluation_tasks FOR SELECT USING (
             app_role_scope() = 'expert' AND org_id = app_current_org() AND EXISTS (
               SELECT 1 FROM task_assignments a WHERE a.task_id = evaluation_tasks.id
                 AND a.expert_user_id = app_current_user() AND a.status IN {ACTIVE}))""",
    ]
    s += _rls("dataset_items") + [
        _tenant_rw("dataset_items"),
        f"""CREATE POLICY expert_assigned ON dataset_items FOR SELECT USING (
             app_role_scope() = 'expert' AND org_id = app_current_org() AND EXISTS (
               SELECT 1 FROM task_assignments a JOIN evaluation_tasks t ON t.id = a.task_id
               WHERE t.item_id = dataset_items.id AND a.expert_user_id = app_current_user()
                 AND a.status IN {ACTIVE}))""",
    ]
    s += _rls("model_outputs") + [
        _tenant_rw("model_outputs"),
        f"""CREATE POLICY expert_assigned ON model_outputs FOR SELECT USING (
             app_role_scope() = 'expert' AND org_id = app_current_org() AND EXISTS (
               SELECT 1 FROM task_assignments a JOIN evaluation_tasks t ON t.id = a.task_id
               WHERE t.item_id = model_outputs.item_id AND a.expert_user_id = app_current_user()
                 AND a.status IN {ACTIVE}))""",
    ]
    s += _rls("submissions") + [
        _tenant_rw("submissions"),
        """CREATE POLICY expert_own ON submissions FOR ALL
             USING (app_role_scope() = 'expert' AND org_id = app_current_org() AND expert_user_id = app_current_user())
             WITH CHECK (app_role_scope() = 'expert' AND org_id = app_current_org() AND expert_user_id = app_current_user())""",
    ]

    # Expert profile tables live in the platform org. Experts are platform-org members, so org match
    # alone would expose every profile to every expert; staff and system scopes get the org rule.
    staff_cond = "org_id = app_current_org() AND app_role_scope() IN ('staff','system')"
    s += _rls("expert_profiles") + [
        f"CREATE POLICY staff_rw ON expert_profiles FOR ALL USING ({staff_cond}) WITH CHECK ({staff_cond})",
        """CREATE POLICY self_rw ON expert_profiles FOR ALL
             USING (user_id = app_current_user()) WITH CHECK (user_id = app_current_user())""",
    ]
    for t in ("expert_skills", "expert_credentials", "expert_conflicts"):
        own = f"EXISTS (SELECT 1 FROM expert_profiles p WHERE p.id = {t}.expert_id AND p.user_id = app_current_user())"
        s += _rls(t) + [
            f"CREATE POLICY staff_rw ON {t} FOR ALL USING ({staff_cond}) WITH CHECK ({staff_cond})",
            f"CREATE POLICY self_rw ON {t} FOR ALL USING ({own}) WITH CHECK ({own})",
        ]

    s += _rls("audit_events") + [
        "CREATE POLICY tenant_read ON audit_events FOR SELECT USING (org_id = app_current_org() AND app_role_scope() <> 'expert')",
        "CREATE POLICY tenant_append ON audit_events FOR INSERT WITH CHECK (org_id = app_current_org())",
    ]
    s += _rls("outbox_events") + [
        "CREATE POLICY tenant_append ON outbox_events FOR INSERT WITH CHECK (org_id = app_current_org())",
        "CREATE POLICY dispatcher ON outbox_events FOR ALL USING (app_role_scope() = 'system') WITH CHECK (app_role_scope() = 'system')",
    ]
    s += _rls("idempotency_keys") + [
        """CREATE POLICY own_keys ON idempotency_keys FOR ALL
             USING (user_id = app_current_user()) WITH CHECK (user_id = app_current_user())""",
    ]
    return s


TRIGGERS = r"""
CREATE OR REPLACE FUNCTION forbid_published_rubric_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'rubric_immutable: rubric version % is %', OLD.id, OLD.status USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'published' AND NEW.status = 'retired'
     AND NEW.instructions_md = OLD.instructions_md AND NEW.criteria = OLD.criteria
     AND NEW.error_labels = OLD.error_labels AND NEW.require_correction = OLD.require_correction
     AND NEW.require_overall_comment = OLD.require_overall_comment
     AND NEW.content_sha256 IS NOT DISTINCT FROM OLD.content_sha256 THEN
    RETURN NEW;
  END IF;
  IF OLD.status IN ('published','retired') THEN
    RAISE EXCEPTION 'rubric_immutable: rubric version % is %', OLD.id, OLD.status USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER rubric_versions_immutable BEFORE UPDATE OR DELETE ON rubric_versions
  FOR EACH ROW EXECUTE FUNCTION forbid_published_rubric_change();

CREATE OR REPLACE FUNCTION forbid_frozen_dataset_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'frozen' THEN
    RAISE EXCEPTION 'dataset_frozen: dataset version % is frozen', OLD.id USING ERRCODE = 'P0001';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER dataset_versions_immutable BEFORE UPDATE OR DELETE ON dataset_versions
  FOR EACH ROW EXECUTE FUNCTION forbid_frozen_dataset_change();

CREATE OR REPLACE FUNCTION forbid_frozen_dataset_item_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM dataset_versions
   WHERE id = CASE WHEN TG_OP = 'DELETE' THEN OLD.dataset_version_id ELSE NEW.dataset_version_id END;
  IF v_status = 'frozen' THEN
    RAISE EXCEPTION 'dataset_frozen: dataset version is frozen' USING ERRCODE = 'P0001';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER dataset_version_items_immutable BEFORE INSERT OR UPDATE OR DELETE ON dataset_version_items
  FOR EACH ROW EXECUTE FUNCTION forbid_frozen_dataset_item_change();

CREATE OR REPLACE FUNCTION forbid_submission_content_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' OR NEW.payload <> OLD.payload OR NEW.resolved <> OLD.resolved
     OR NEW.rubric_version_id <> OLD.rubric_version_id OR NEW.revision <> OLD.revision
     OR NEW.expert_id <> OLD.expert_id OR NEW.assignment_id <> OLD.assignment_id THEN
    RAISE EXCEPTION 'submission_immutable: only status may change' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER submissions_immutable BEFORE UPDATE OR DELETE ON submissions
  FOR EACH ROW EXECUTE FUNCTION forbid_submission_content_change();

CREATE OR REPLACE FUNCTION forbid_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only' USING ERRCODE = 'P0001';
END $$;
CREATE TRIGGER audit_events_append_only BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION forbid_audit_mutation();
CREATE TRIGGER audit_events_no_truncate BEFORE TRUNCATE ON audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION forbid_audit_mutation();
"""

# Experts cannot see unassigned tasks through RLS, so pulling the next task runs as the table owner.
# The function re-checks approval, project status and max_tasks itself and only ever creates an
# assignment for the calling user.
DEFINER_FUNCTIONS = f"""
CREATE OR REPLACE FUNCTION app_claim_next_task(p_project uuid, p_user uuid, p_lease_hours int)
RETURNS TABLE(assignment_id uuid, reason text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_proj projects%ROWTYPE;
  v_expert expert_profiles%ROWTYPE;
  v_pe project_experts%ROWTYPE;
  v_used int;
  v_task evaluation_tasks%ROWTYPE;
  v_taken int;
  v_outputs uuid[];
  v_slots jsonb;
  v_id uuid;
  v_skip uuid[] := '{{}}';
  v_attempt int := 0;
BEGIN
  IF p_user IS DISTINCT FROM app_current_user() THEN
    RETURN QUERY SELECT NULL::uuid, 'forbidden'::text; RETURN;
  END IF;
  SELECT * INTO v_proj FROM projects WHERE id = p_project;
  IF NOT FOUND THEN RETURN QUERY SELECT NULL::uuid, 'not_found'::text; RETURN; END IF;
  SELECT * INTO v_expert FROM expert_profiles WHERE user_id = p_user;
  IF NOT FOUND THEN RETURN QUERY SELECT NULL::uuid, 'not_found'::text; RETURN; END IF;
  SELECT * INTO v_pe FROM project_experts
   WHERE project_id = p_project AND expert_id = v_expert.id AND status = 'approved' FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT NULL::uuid, 'not_found'::text; RETURN; END IF;
  IF v_expert.status <> 'active' THEN RETURN QUERY SELECT NULL::uuid, 'expert_inactive'::text; RETURN; END IF;
  IF v_proj.status <> 'active' THEN RETURN QUERY SELECT NULL::uuid, 'project_not_active'::text; RETURN; END IF;

  SELECT count(*) INTO v_used FROM task_assignments
   WHERE project_id = p_project AND expert_id = v_expert.id AND status IN {ACTIVE};
  IF v_used >= v_pe.max_tasks THEN RETURN QUERY SELECT NULL::uuid, 'max_tasks_reached'::text; RETURN; END IF;

  LOOP
    v_attempt := v_attempt + 1;
    EXIT WHEN v_attempt > 20;
    SELECT t.* INTO v_task FROM evaluation_tasks t
     WHERE t.project_id = p_project AND t.status IN ('open','in_progress')
       AND NOT (t.id = ANY(v_skip))
       AND NOT EXISTS (SELECT 1 FROM task_assignments a WHERE a.task_id = t.id AND a.expert_id = v_expert.id)
       AND (SELECT count(*) FROM task_assignments a WHERE a.task_id = t.id AND a.status IN {ACTIVE}) < t.required_overlap
     ORDER BY t.created_at, t.id
     LIMIT 1 FOR UPDATE SKIP LOCKED;
    IF NOT FOUND THEN RETURN QUERY SELECT NULL::uuid, 'no_tasks_available'::text; RETURN; END IF;

    -- Recount under the row lock: the candidate query's snapshot may predate a concurrent claim.
    SELECT count(*) INTO v_taken FROM task_assignments a WHERE a.task_id = v_task.id AND a.status IN {ACTIVE};
    IF v_taken >= v_task.required_overlap THEN
      v_skip := v_skip || v_task.id;
      CONTINUE;
    END IF;

    SELECT array_agg(o.id ORDER BY o.position) INTO v_outputs FROM model_outputs o WHERE o.item_id = v_task.item_id;
    IF coalesce(array_length(v_outputs, 1), 0) = 2 THEN
      IF random() < 0.5 THEN
        v_slots := jsonb_build_object('A', v_outputs[1], 'B', v_outputs[2]);
      ELSE
        v_slots := jsonb_build_object('A', v_outputs[2], 'B', v_outputs[1]);
      END IF;
    ELSIF coalesce(array_length(v_outputs, 1), 0) = 1 THEN
      v_slots := jsonb_build_object('A', v_outputs[1]);
    ELSE
      v_skip := v_skip || v_task.id;
      CONTINUE;
    END IF;

    v_id := gen_random_uuid();
    INSERT INTO task_assignments (id, created_at, org_id, project_id, task_id, expert_id, expert_user_id, status,
                                  slot_map, feedback, lease_expires_at, due_at)
    VALUES (v_id, now(), v_task.org_id, p_project, v_task.id, v_expert.id, p_user, 'in_progress',
            v_slots, '[]'::jsonb, now() + make_interval(hours => p_lease_hours),
            least(coalesce(v_proj.deadline, 'infinity'::timestamptz), now() + make_interval(hours => p_lease_hours)));
    UPDATE evaluation_tasks SET status = 'in_progress' WHERE id = v_task.id AND status = 'open';
    RETURN QUERY SELECT v_id, 'ok'::text;
    RETURN;
  END LOOP;
  RETURN QUERY SELECT NULL::uuid, 'no_tasks_available'::text;
END $$;

CREATE OR REPLACE FUNCTION app_expert_available_tasks(p_project uuid, p_user uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE WHEN p_user IS DISTINCT FROM app_current_user() THEN 0 ELSE (
    SELECT count(*)::int FROM evaluation_tasks t
     JOIN project_experts pe ON pe.project_id = t.project_id AND pe.user_id = p_user AND pe.status = 'approved'
     WHERE t.project_id = p_project AND t.status IN ('open','in_progress')
       AND NOT EXISTS (SELECT 1 FROM task_assignments a WHERE a.task_id = t.id AND a.expert_user_id = p_user)
       AND (SELECT count(*) FROM task_assignments a WHERE a.task_id = t.id AND a.status IN {ACTIVE}) < t.required_overlap
  ) END
$$;

-- Lets staff code paths find which tenant a record belongs to before setting the RLS context.
CREATE OR REPLACE FUNCTION app_resolve_org(p_kind text, p_id uuid)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v uuid;
BEGIN
  IF p_kind = 'project' THEN SELECT org_id INTO v FROM projects WHERE id = p_id;
  ELSIF p_kind = 'review' THEN SELECT org_id INTO v FROM reviews WHERE id = p_id;
  ELSIF p_kind = 'adjudication' THEN SELECT org_id INTO v FROM adjudications WHERE id = p_id;
  ELSE RAISE EXCEPTION 'unknown kind %', p_kind;
  END IF;
  RETURN v;
END $$;

REVOKE ALL ON FUNCTION app_claim_next_task(uuid, uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_expert_available_tasks(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_resolve_org(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_claim_next_task(uuid, uuid, int) TO ifl_app;
GRANT EXECUTE ON FUNCTION app_expert_available_tasks(uuid, uuid) TO ifl_app;
GRANT EXECUTE ON FUNCTION app_resolve_org(text, uuid) TO ifl_app;
"""

ROLES = """
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ifl_app') THEN
    EXECUTE 'CREATE ROLE ifl_app LOGIN NOBYPASSRLS PASSWORD ' || quote_literal(current_setting('ifl.app_pw'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ifl_ops') THEN
    EXECUTE 'CREATE ROLE ifl_ops LOGIN BYPASSRLS PASSWORD ' || quote_literal(current_setting('ifl.ops_pw'));
  END IF;
END $$;
"""

GRANTS = """
GRANT USAGE ON SCHEMA public TO ifl_app, ifl_ops;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ifl_app, ifl_ops;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ifl_app, ifl_ops;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_events FROM ifl_app, ifl_ops;
REVOKE INSERT, UPDATE, DELETE ON skills FROM ifl_app;
"""


def _raw(sql: str) -> None:
    # Straight to psycopg so plpgsql '%' placeholders and multi-statement bodies pass through untouched.
    op.get_bind().connection.driver_connection.execute(sql)


def upgrade() -> None:
    s = get_settings()
    bind = op.get_bind()
    bind.execute(sa.text("select set_config('ifl.app_pw', :a, true), set_config('ifl.ops_pw', :o, true)"),
                 {"a": s.app_role_password, "o": s.ops_role_password})
    _raw(ROLES)
    _raw(HELPERS)
    for stmt in _policies():
        _raw(stmt)
    _raw(TRIGGERS)
    _raw(DEFINER_FUNCTIONS)
    _raw(GRANTS)


def downgrade() -> None:
    raise NotImplementedError("security baseline is not reversible; recreate the database instead")
