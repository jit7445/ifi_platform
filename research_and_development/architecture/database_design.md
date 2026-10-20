# Database Design

> **Reconciliation note (2026-10-20):** Where this document differs from `planning/architecture_decisions.md`, the ADRs there are authoritative. In particular: Phase 1 authentication is FastAPI-native with MFA for every account (ADR-005), Langfuse and model connectors are Phase 3 (ADR-007), enterprise SSO is Phase 4, Track B is Phase 5 (ADR-015), and experts get assignment-scoped RLS (ADR-017).

Status: proposed for MVP build (Track A), with Track B extension points.
Owner: Architecture Agent. Date: 2026-10-20.
Target engine: PostgreSQL 18 (Amazon RDS for PostgreSQL 18 is GA since Nov 2025; 18.x minors available). PostgreSQL 17 is an acceptable fallback; the only PG18-specific feature relied on is the built-in `uuidv7()` function, which can be replaced by application-generated UUIDv7 on PG17.

Related: [system_architecture.md](system_architecture.md), [api_design.md](api_design.md), [data_pipeline.md](data_pipeline.md), ER diagram source [diagrams/database_erd.mmd](diagrams/database_erd.mmd).

---

## 1. Conventions

| Topic | Rule |
|---|---|
| Schemas | `app` (all application tables), `auth` (Better Auth tables, owned by the web tier), `procrastinate` (job queue tables), `audit` (audit log partitions). |
| Primary keys | `uuid DEFAULT uuidv7()`. Time-ordered UUIDs keep B-tree inserts local and are safe to expose in URLs. Exceptions: `audit.audit_events` and `app.outbox_events` use `bigint GENERATED ALWAYS AS IDENTITY` for strict ordering. |
| Tenant column | Every tenant-owned row has `org_id uuid NOT NULL`. Child tables repeat `org_id` (denormalised on purpose) so RLS never needs a join. |
| Tenant integrity | Parents expose `UNIQUE (org_id, id)`; children reference `(org_id, parent_id)` with a composite FK. A row can therefore never point at a parent in another tenant, even through an application bug. |
| Enumerations | `text` + `CHECK (col IN (...))` instead of `CREATE TYPE ... AS ENUM`. Adding a value is a single constraint swap inside a migration, no `ALTER TYPE` lock issues. |
| Money | `bigint` minor units (`*_minor`) + `char(3)` ISO currency. Never floats. |
| Timestamps | `timestamptz`, UTC. `created_at DEFAULT now()`, `updated_at` maintained by a shared trigger `app.touch_updated_at()`. |
| Soft delete | Only where business requires (`projects`, `datasets`, `users`) via `deleted_at`. Evaluation artifacts are never deleted, they are superseded. |
| Immutability | Published `rubric_versions`, frozen `dataset_versions`, submitted `evaluation_submissions`, `audit_events` are immutable, enforced by triggers (section 7). |
| JSONB | Used for genuinely variable payloads (prompts as chat messages, model output bodies, scoring config, export options). Anything filtered or joined on is a real column. |
| Large payloads | Payloads over 256 KB go to object storage, referenced through `stored_objects` (section 8). |

Extensions: `citext`, `pgcrypto` (digest for hash chain), `btree_gist` (exclusion constraints on ranges), `pg_trgm` (expert search), `pg_stat_statements`.

---

## 2. Domain map

```
identity/orgs      organizations, users, roles, permissions, role_permissions, memberships, api_keys
experts            expert_profiles, expert_credentials, skills, expert_skills, expert_availability,
                   conflict_declarations, expert_qualifications
projects           projects, project_requirements, project_staff, task_batches
rubrics            rubrics, rubric_versions, rubric_criteria, error_taxonomies, error_taxonomy_labels
data               stored_objects, ingestion_jobs, datasets, dataset_versions, dataset_items,
                   dataset_version_items, model_runs, model_outputs
tasks              evaluation_tasks, evaluation_task_outputs, task_assignments
evaluation         evaluation_submissions, scores, submission_error_labels, preference_judgments,
                   corrected_outputs, red_team_items
qa                 review_tasks, adjudications, gold_items
metrics            metric_runs, quality_metrics
delivery           deliverables, exports
billing            rate_cards, usage_records, invoices, invoice_line_items
compliance/audit   consent_records, audit_events
platform           outbox_events, notifications, webhook_endpoints, webhook_deliveries,
                   integration_connections
```

---

## 3. Tenancy model

- Every customer is an `organizations` row with `kind = 'customer'`.
- Infollion itself is a single `organizations` row with `kind = 'platform'` (the "platform org"). Internal staff (project managers, reviewers, internal org admins, platform operators) and experts are members of the platform org.
- Customer data (projects, datasets, rubrics, tasks, submissions, metrics, exports, usage) carries the **customer's** `org_id`, even rows created by experts. An expert submission on a customer task has `org_id = <customer org>`. This keeps every customer's data partitionable, exportable and deletable by `org_id`.
- Expert identity data (`expert_profiles`, credentials, skills, availability, conflicts) carries the **platform org** `org_id`. Customers never read these tables directly; they see a pseudonymous projection via the API (`pseudonym`, verified credential summary, quality tier).

---

## 4. DDL

The DDL below is the implementable baseline for the first Alembic migrations. Indexes listed are the ones required by known MVP queries; add more only from `pg_stat_statements` evidence.

### 4.1 Shared helpers

```sql
CREATE SCHEMA IF NOT EXISTS app;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Request context, set with SET LOCAL at the start of every transaction by the API/worker.
CREATE FUNCTION app.current_org_id() RETURNS uuid
  LANGUAGE sql STABLE PARALLEL SAFE AS
$$ SELECT nullif(current_setting('app.org_id', true), '')::uuid $$;

CREATE FUNCTION app.current_user_id() RETURNS uuid
  LANGUAGE sql STABLE PARALLEL SAFE AS
$$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;

CREATE FUNCTION app.current_expert_id() RETURNS uuid
  LANGUAGE sql STABLE PARALLEL SAFE AS
$$ SELECT nullif(current_setting('app.expert_id', true), '')::uuid $$;

CREATE FUNCTION app.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS
$$ BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
```

### 4.2 Identity, organizations, RBAC

```sql
CREATE TABLE app.organizations (
  id               uuid PRIMARY KEY DEFAULT uuidv7(),
  kind             text NOT NULL CHECK (kind IN ('customer','platform')),
  name             text NOT NULL,
  slug             citext NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  status           text NOT NULL DEFAULT 'pending_verification'
                   CHECK (status IN ('pending_verification','active','suspended','closed')),
  data_region      text NOT NULL DEFAULT 'ap-south-1',
  billing_currency char(3) NOT NULL DEFAULT 'INR',
  gstin            text,
  settings         jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
-- exactly one platform org
CREATE UNIQUE INDEX organizations_one_platform ON app.organizations ((kind)) WHERE kind = 'platform';

CREATE TABLE app.users (
  id                 uuid PRIMARY KEY,               -- equals auth."user".id (Better Auth)
  email              citext NOT NULL UNIQUE,
  display_name       text NOT NULL,
  status             text NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','disabled')),
  is_platform_staff  boolean NOT NULL DEFAULT false,
  locale             text NOT NULL DEFAULT 'en-IN',
  timezone           text NOT NULL DEFAULT 'Asia/Kolkata',
  last_login_at      timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz
);

CREATE TABLE app.roles (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  key         text NOT NULL UNIQUE,     -- customer_admin, customer_member, expert, reviewer, project_manager,
                                        -- internal_org_admin, platform_operator, superadmin
  scope       text NOT NULL CHECK (scope IN ('customer_org','platform_org')),
  name        text NOT NULL,
  is_system   boolean NOT NULL DEFAULT true
);

CREATE TABLE app.permissions (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  key         text NOT NULL UNIQUE CHECK (key ~ '^[a-z_]+\.[a-z_]+$'),   -- e.g. project.create
  description text NOT NULL
);

CREATE TABLE app.role_permissions (
  role_id       uuid NOT NULL REFERENCES app.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES app.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE app.memberships (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id      uuid NOT NULL REFERENCES app.organizations(id),
  user_id     uuid NOT NULL REFERENCES app.users(id),
  role_id     uuid NOT NULL REFERENCES app.roles(id),
  status      text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','suspended','removed')),
  invited_by  uuid REFERENCES app.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id, role_id)
);
CREATE INDEX memberships_user_idx ON app.memberships (user_id) WHERE status = 'active';

CREATE TABLE app.api_keys (
  id           uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id       uuid NOT NULL REFERENCES app.organizations(id),
  name         text NOT NULL,
  key_prefix   text NOT NULL UNIQUE,          -- first 12 chars, shown in UI, used for lookup
  key_hash     bytea NOT NULL,                -- sha256(secret); secret shown once
  scopes       text[] NOT NULL CHECK (cardinality(scopes) > 0),
  created_by   uuid NOT NULL REFERENCES app.users(id),
  last_used_at timestamptz,
  expires_at   timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
```

### 4.3 Experts

```sql
CREATE TABLE app.expert_profiles (
  id                     uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id                 uuid NOT NULL REFERENCES app.organizations(id),   -- platform org
  user_id                uuid NOT NULL UNIQUE REFERENCES app.users(id),
  pseudonym              text NOT NULL UNIQUE,         -- e.g. EXP-7Q4K; the only identity customers see
  headline               text,
  country                char(2) NOT NULL DEFAULT 'IN',
  timezone               text NOT NULL DEFAULT 'Asia/Kolkata',
  languages              text[] NOT NULL DEFAULT '{}', -- BCP 47 tags
  years_experience       smallint CHECK (years_experience BETWEEN 0 AND 70),
  status                 text NOT NULL DEFAULT 'applicant'
                         CHECK (status IN ('applicant','vetting','active','paused','offboarded','rejected')),
  quality_tier           text NOT NULL DEFAULT 'new' CHECK (quality_tier IN ('new','standard','senior','principal')),
  weekly_capacity_hours  numeric(5,2) NOT NULL DEFAULT 10 CHECK (weekly_capacity_hours BETWEEN 0 AND 80),
  max_concurrent_tasks   smallint NOT NULL DEFAULT 20 CHECK (max_concurrent_tasks > 0),
  hourly_rate_minor      bigint CHECK (hourly_rate_minor >= 0),
  rate_currency          char(3) NOT NULL DEFAULT 'INR',
  rolling_quality_score  numeric(5,4),                  -- denormalised from quality_metrics nightly
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, id)
);
CREATE INDEX expert_profiles_active_idx ON app.expert_profiles (status, quality_tier) WHERE status = 'active';
CREATE INDEX expert_profiles_languages_gin ON app.expert_profiles USING gin (languages);

CREATE TABLE app.skills (                     -- global reference taxonomy, not tenant data
  id         uuid PRIMARY KEY DEFAULT uuidv7(),
  key        text NOT NULL UNIQUE,            -- e.g. medicine.cardiology, law.in.corporate
  name       text NOT NULL,
  parent_id  uuid REFERENCES app.skills(id),
  domain     text NOT NULL
);
CREATE INDEX skills_name_trgm ON app.skills USING gin (name gin_trgm_ops);

CREATE TABLE app.expert_skills (
  org_id       uuid NOT NULL,
  expert_id    uuid NOT NULL,
  skill_id     uuid NOT NULL REFERENCES app.skills(id),
  level        smallint NOT NULL CHECK (level BETWEEN 1 AND 5),
  years        smallint CHECK (years >= 0),
  source       text NOT NULL CHECK (source IN ('self_declared','verified','assessed')),
  verified_at  timestamptz,
  PRIMARY KEY (expert_id, skill_id),
  FOREIGN KEY (org_id, expert_id) REFERENCES app.expert_profiles(org_id, id) ON DELETE CASCADE
);
CREATE INDEX expert_skills_skill_idx ON app.expert_skills (skill_id, level DESC);

CREATE TABLE app.expert_credentials (
  id                  uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id              uuid NOT NULL,
  expert_id           uuid NOT NULL,
  kind                text NOT NULL CHECK (kind IN ('degree','license','certification','employment','publication','other')),
  title               text NOT NULL,
  issuer              text NOT NULL,
  issued_on           date,
  expires_on          date,
  verification_status text NOT NULL DEFAULT 'unverified'
                      CHECK (verification_status IN ('unverified','pending','verified','rejected','expired')),
  verified_by         uuid REFERENCES app.users(id),
  verified_at         timestamptz,
  evidence_object_id  uuid,                      -- FK to stored_objects added after that table
  created_at          timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, expert_id) REFERENCES app.expert_profiles(org_id, id) ON DELETE CASCADE,
  CHECK (expires_on IS NULL OR issued_on IS NULL OR expires_on >= issued_on)
);
CREATE INDEX expert_credentials_expert_idx ON app.expert_credentials (expert_id, verification_status);

CREATE TABLE app.expert_availability (
  id              uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id          uuid NOT NULL,
  expert_id       uuid NOT NULL,
  kind            text NOT NULL CHECK (kind IN ('available','unavailable')),
  period          tstzrange NOT NULL CHECK (NOT isempty(period)),
  hours_available numeric(5,2) CHECK (hours_available >= 0),
  note            text,
  FOREIGN KEY (org_id, expert_id) REFERENCES app.expert_profiles(org_id, id) ON DELETE CASCADE,
  EXCLUDE USING gist (expert_id WITH =, kind WITH =, period WITH &&)
);

CREATE TABLE app.conflict_declarations (
  id               uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id           uuid NOT NULL,                -- platform org
  expert_id        uuid NOT NULL,
  subject_type     text NOT NULL CHECK (subject_type IN ('organization','company','domain_name')),
  subject_org_id   uuid REFERENCES app.organizations(id),   -- set when the conflicted party is a platform customer
  subject_name     text NOT NULL,
  subject_domain   citext,                       -- e.g. competitorlabs.ai, matched against org domains
  relationship     text NOT NULL CHECK (relationship IN
                    ('employee','former_employee','contractor','advisor','investor','family','competitor_engagement','other')),
  period           daterange NOT NULL,
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','withdrawn')),
  declared_at      timestamptz NOT NULL DEFAULT now(),
  reviewed_by      uuid REFERENCES app.users(id),
  FOREIGN KEY (org_id, expert_id) REFERENCES app.expert_profiles(org_id, id) ON DELETE CASCADE
);
CREATE INDEX conflict_subject_org_idx ON app.conflict_declarations (subject_org_id) WHERE status = 'active';
CREATE INDEX conflict_subject_domain_idx ON app.conflict_declarations (subject_domain) WHERE status = 'active';
```

### 4.4 Projects

```sql
CREATE TABLE app.projects (
  id                       uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id                   uuid NOT NULL REFERENCES app.organizations(id),
  code                     text NOT NULL CHECK (code ~ '^[A-Z0-9-]{2,24}$'),
  name                     text NOT NULL CHECK (length(name) BETWEEN 3 AND 200),
  description              text,
  domain                   text NOT NULL,          -- skills.domain value, e.g. medicine
  task_type                text NOT NULL CHECK (task_type IN
                            ('rubric_scoring','pairwise_preference','ranking','sft_correction',
                             'red_team','classification','freeform_review')),
  languages                text[] NOT NULL CHECK (cardinality(languages) > 0),
  difficulty               text NOT NULL CHECK (difficulty IN ('standard','advanced','expert')),
  target_volume            integer NOT NULL CHECK (target_volume > 0),
  deadline                 timestamptz,
  deliverable_format       text NOT NULL CHECK (deliverable_format IN
                            ('eval_benchmark','sft_jsonl','preference_pairs','red_team_set','csv')),
  status                   text NOT NULL DEFAULT 'draft' CHECK (status IN
                            ('draft','submitted','in_review','changes_requested','approved','active',
                             'paused','completed','cancelled')),
  overlap_k                smallint NOT NULL DEFAULT 1 CHECK (overlap_k BETWEEN 1 AND 7),
  second_review_rate       numeric(4,3) NOT NULL DEFAULT 0.10 CHECK (second_review_rate BETWEEN 0 AND 1),
  gold_rate                numeric(4,3) NOT NULL DEFAULT 0.05 CHECK (gold_rate BETWEEN 0 AND 0.5),
  agreement_threshold      numeric(4,3) NOT NULL DEFAULT 0.667 CHECK (agreement_threshold BETWEEN 0 AND 1),
  requires_calibration     boolean NOT NULL DEFAULT true,
  current_rubric_version_id uuid,                  -- FK added after rubric_versions
  pm_user_id               uuid REFERENCES app.users(id),
  settings                 jsonb NOT NULL DEFAULT '{}',    -- SLA, blind_customer_identity, etc.
  created_by               uuid NOT NULL REFERENCES app.users(id),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  deleted_at               timestamptz,
  UNIQUE (org_id, id),
  UNIQUE (org_id, code)
);
CREATE INDEX projects_org_status_idx ON app.projects (org_id, status) WHERE deleted_at IS NULL;
CREATE INDEX projects_pm_idx ON app.projects (pm_user_id) WHERE status IN ('submitted','in_review','active');

CREATE TABLE app.project_requirements (
  id           uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id       uuid NOT NULL,
  project_id   uuid NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('skill','credential_kind','language','country',
                                             'min_years','min_quality_tier','exclude_company')),
  skill_id     uuid REFERENCES app.skills(id),
  value        jsonb NOT NULL DEFAULT '{}',   -- {"min_level":4} | {"lang":"hi"} | {"company":"Acme"}
  is_mandatory boolean NOT NULL DEFAULT true,
  weight       numeric(4,2) NOT NULL DEFAULT 1 CHECK (weight >= 0),
  FOREIGN KEY (org_id, project_id) REFERENCES app.projects(org_id, id) ON DELETE CASCADE,
  CHECK (kind <> 'skill' OR skill_id IS NOT NULL)
);
CREATE INDEX project_requirements_project_idx ON app.project_requirements (project_id);

CREATE TABLE app.project_staff (              -- internal staff assigned to a customer project
  org_id      uuid NOT NULL,                  -- customer org of the project
  project_id  uuid NOT NULL,
  user_id     uuid NOT NULL REFERENCES app.users(id),
  staff_role  text NOT NULL CHECK (staff_role IN ('project_manager','reviewer','adjudicator')),
  added_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id, staff_role),
  FOREIGN KEY (org_id, project_id) REFERENCES app.projects(org_id, id) ON DELETE CASCADE
);
CREATE INDEX project_staff_user_idx ON app.project_staff (user_id);

CREATE TABLE app.task_batches (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id      uuid NOT NULL,
  project_id  uuid NOT NULL,
  name        text NOT NULL,
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','released','completed','cancelled')),
  released_at timestamptz,
  UNIQUE (org_id, id),
  FOREIGN KEY (org_id, project_id) REFERENCES app.projects(org_id, id)
);
```

### 4.5 Rubrics and error taxonomies

```sql
CREATE TABLE app.error_taxonomies (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id      uuid NOT NULL REFERENCES app.organizations(id),   -- platform org for templates
  name        text NOT NULL,
  version     integer NOT NULL CHECK (version > 0),
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','retired')),
  is_template boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, id),
  UNIQUE (org_id, name, version)
);

CREATE TABLE app.error_taxonomy_labels (
  id           uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id       uuid NOT NULL,
  taxonomy_id  uuid NOT NULL,
  key          text NOT NULL CHECK (key ~ '^[a-z0-9_.]+$'),   -- e.g. factual.hallucinated_citation
  label        text NOT NULL,
  description  text,
  parent_id    uuid REFERENCES app.error_taxonomy_labels(id),
  default_severity text CHECK (default_severity IN ('minor','major','critical')),
  UNIQUE (taxonomy_id, key),
  FOREIGN KEY (org_id, taxonomy_id) REFERENCES app.error_taxonomies(org_id, id) ON DELETE CASCADE
);

CREATE TABLE app.rubrics (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id      uuid NOT NULL REFERENCES app.organizations(id),
  project_id  uuid,                                   -- null = org-level library rubric
  name        text NOT NULL,
  task_type   text NOT NULL,
  created_by  uuid NOT NULL REFERENCES app.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, id),
  FOREIGN KEY (org_id, project_id) REFERENCES app.projects(org_id, id)
);

CREATE TABLE app.rubric_versions (
  id                 uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id             uuid NOT NULL,
  rubric_id          uuid NOT NULL,
  version            integer NOT NULL CHECK (version > 0),
  status             text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','published','retired')),
  instructions_md    text NOT NULL,
  scoring_config     jsonb NOT NULL DEFAULT '{}',  -- aggregation, pass rule, agreement metric per criterion
  error_taxonomy_id  uuid,
  changelog          text,
  content_sha256     bytea,                        -- set on publish over canonical JSON of version+criteria
  created_by         uuid NOT NULL REFERENCES app.users(id),
  published_by       uuid REFERENCES app.users(id),
  published_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, id),
  UNIQUE (rubric_id, version),
  FOREIGN KEY (org_id, rubric_id) REFERENCES app.rubrics(org_id, id),
  CHECK (status <> 'published' OR (published_at IS NOT NULL AND content_sha256 IS NOT NULL))
);
-- one draft at a time per rubric
CREATE UNIQUE INDEX rubric_versions_one_draft ON app.rubric_versions (rubric_id) WHERE status IN ('draft','in_review');

ALTER TABLE app.projects
  ADD CONSTRAINT projects_current_rubric_fk
  FOREIGN KEY (org_id, current_rubric_version_id) REFERENCES app.rubric_versions(org_id, id);

CREATE TABLE app.rubric_criteria (
  id                 uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id             uuid NOT NULL,
  rubric_version_id  uuid NOT NULL,
  key                text NOT NULL CHECK (key ~ '^[a-z][a-z0-9_]{0,63}$'),
  label              text NOT NULL,
  description        text NOT NULL,
  scale_type         text NOT NULL CHECK (scale_type IN ('likert','binary','numeric','categorical','text')),
  scale_min          numeric,
  scale_max          numeric,
  options            jsonb,              -- categorical values
  anchors            jsonb,              -- {"1":"Dangerous or wrong", "5":"Expert-level"}
  weight             numeric(5,3) NOT NULL DEFAULT 1 CHECK (weight >= 0),
  is_required        boolean NOT NULL DEFAULT true,
  explanation_required_below numeric,    -- force rationale when score below threshold
  position           smallint NOT NULL,
  UNIQUE (org_id, id),
  UNIQUE (rubric_version_id, key),
  UNIQUE (rubric_version_id, position),
  FOREIGN KEY (org_id, rubric_version_id) REFERENCES app.rubric_versions(org_id, id) ON DELETE CASCADE,
  CHECK (scale_type NOT IN ('likert','numeric') OR (scale_min IS NOT NULL AND scale_max > scale_min)),
  CHECK (scale_type <> 'categorical' OR jsonb_typeof(options) = 'array')
);
```

### 4.6 Object storage metadata, ingestion, datasets, model runs

```sql
CREATE TABLE app.stored_objects (
  id              uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id          uuid NOT NULL REFERENCES app.organizations(id),
  bucket          text NOT NULL,
  object_key      text NOT NULL,
  kind            text NOT NULL CHECK (kind IN ('upload_source','dataset_manifest','item_payload',
                     'export','error_report','credential_evidence','consent_evidence','invoice_pdf',
                     'media_video','media_sensor','attachment')),
  content_type    text NOT NULL,
  size_bytes      bigint CHECK (size_bytes >= 0),
  sha256          bytea,
  status          text NOT NULL DEFAULT 'pending_upload' CHECK (status IN
                     ('pending_upload','uploaded','scanning','available','quarantined','deleted')),
  retention_until timestamptz,
  legal_hold      boolean NOT NULL DEFAULT false,
  created_by      uuid REFERENCES app.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, id),
  UNIQUE (bucket, object_key)
);
CREATE INDEX stored_objects_pending_idx ON app.stored_objects (created_at) WHERE status = 'pending_upload';

ALTER TABLE app.expert_credentials
  ADD CONSTRAINT expert_credentials_evidence_fk FOREIGN KEY (evidence_object_id) REFERENCES app.stored_objects(id);

CREATE TABLE app.datasets (
  id           uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id       uuid NOT NULL REFERENCES app.organizations(id),
  project_id   uuid,
  name         text NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('input','benchmark','deliverable','red_team','capture')),
  item_schema  text NOT NULL CHECK (item_schema IN
                 ('prompt','prompt_response','prompt_multi_response','conversation','capture_episode')),
  description  text,
  created_by   uuid NOT NULL REFERENCES app.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  UNIQUE (org_id, id),
  UNIQUE (org_id, name),
  FOREIGN KEY (org_id, project_id) REFERENCES app.projects(org_id, id)
);

CREATE TABLE app.dataset_versions (
  id                 uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id             uuid NOT NULL,
  dataset_id         uuid NOT NULL,
  version            integer NOT NULL CHECK (version > 0),
  parent_version_id  uuid,
  status             text NOT NULL DEFAULT 'building' CHECK (status IN ('building','frozen','failed','archived')),
  source             text NOT NULL CHECK (source IN ('upload','api','connector','derived','curation')),
  item_count         integer NOT NULL DEFAULT 0 CHECK (item_count >= 0),
  manifest_object_id uuid,
  manifest_sha256    bytea,
  provenance         jsonb NOT NULL DEFAULT '{}',   -- see data_pipeline.md section 6
  notes              text,
  created_by         uuid NOT NULL REFERENCES app.users(id),
  frozen_at          timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, id),
  UNIQUE (dataset_id, version),
  FOREIGN KEY (org_id, dataset_id) REFERENCES app.datasets(org_id, id),
  FOREIGN KEY (org_id, parent_version_id) REFERENCES app.dataset_versions(org_id, id),
  FOREIGN KEY (org_id, manifest_object_id) REFERENCES app.stored_objects(org_id, id),
  CHECK (status <> 'frozen' OR (frozen_at IS NOT NULL AND manifest_sha256 IS NOT NULL))
);

-- Content-addressed items: identical content across versions is stored once.
CREATE TABLE app.dataset_items (
  id                 uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id             uuid NOT NULL,
  dataset_id         uuid NOT NULL,
  external_id        text NOT NULL,                    -- customer's id, or generated "row-000123"
  content_sha256     bytea NOT NULL,                   -- sha256 of canonical JSON of prompt+reference+metadata
  prompt             jsonb NOT NULL,                   -- {"messages":[{"role":"user","content":"..."}]} or {"text":"..."}
  reference_answer   jsonb,
  metadata           jsonb NOT NULL DEFAULT '{}',
  language           text,
  payload_object_id  uuid,                             -- set when body > 256 KB; prompt then holds a stub
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, id),
  UNIQUE (dataset_id, external_id, content_sha256),
  FOREIGN KEY (org_id, dataset_id) REFERENCES app.datasets(org_id, id),
  FOREIGN KEY (org_id, payload_object_id) REFERENCES app.stored_objects(org_id, id)
);

CREATE TABLE app.dataset_version_items (
  org_id             uuid NOT NULL,
  dataset_version_id uuid NOT NULL,
  dataset_item_id    uuid NOT NULL,
  position           integer NOT NULL,
  split              text CHECK (split IN ('train','validation','test','holdout')),
  PRIMARY KEY (dataset_version_id, dataset_item_id),
  UNIQUE (dataset_version_id, position),
  FOREIGN KEY (org_id, dataset_version_id) REFERENCES app.dataset_versions(org_id, id),
  FOREIGN KEY (org_id, dataset_item_id) REFERENCES app.dataset_items(org_id, id)
);
CREATE INDEX dataset_version_items_item_idx ON app.dataset_version_items (dataset_item_id);

CREATE TABLE app.model_runs (
  id                  uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id              uuid NOT NULL,
  project_id          uuid NOT NULL,
  dataset_version_id  uuid NOT NULL,
  label               text NOT NULL,                  -- "candidate-2026-10-18"
  model_name          text NOT NULL,
  model_version       text NOT NULL,
  provider            text,
  params              jsonb NOT NULL DEFAULT '{}',    -- temperature, system prompt hash, etc.
  source              text NOT NULL CHECK (source IN ('upload','api','connector')),
  baseline_run_id     uuid,                           -- regression comparison target
  status              text NOT NULL DEFAULT 'importing' CHECK (status IN ('importing','ready','failed','archived')),
  created_by          uuid NOT NULL REFERENCES app.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, id),
  UNIQUE (project_id, label),
  FOREIGN KEY (org_id, project_id) REFERENCES app.projects(org_id, id),
  FOREIGN KEY (org_id, dataset_version_id) REFERENCES app.dataset_versions(org_id, id),
  FOREIGN KEY (org_id, baseline_run_id) REFERENCES app.model_runs(org_id, id)
);

CREATE TABLE app.model_outputs (
  id               uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id           uuid NOT NULL,
  model_run_id     uuid NOT NULL,
  dataset_item_id  uuid NOT NULL,
  sample_index     smallint NOT NULL DEFAULT 0 CHECK (sample_index >= 0),
  output           jsonb NOT NULL,                     -- {"text":"..."} or {"messages":[...]}
  output_object_id uuid,
  content_sha256   bytea NOT NULL,
  latency_ms       integer,
  usage            jsonb,                              -- token counts
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, id),
  UNIQUE (model_run_id, dataset_item_id, sample_index),
  FOREIGN KEY (org_id, model_run_id) REFERENCES app.model_runs(org_id, id),
  FOREIGN KEY (org_id, dataset_item_id) REFERENCES app.dataset_items(org_id, id)
);
CREATE INDEX model_outputs_item_idx ON app.model_outputs (dataset_item_id);

CREATE TABLE app.ingestion_jobs (
  id                         uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id                     uuid NOT NULL,
  project_id                 uuid NOT NULL,
  dataset_id                 uuid NOT NULL,
  source_type                text NOT NULL CHECK (source_type IN ('csv','jsonl','api_batch','langfuse')),
  source_object_id           uuid,
  column_mapping             jsonb NOT NULL DEFAULT '{}',
  model_run_id               uuid,                    -- when the file carries model outputs
  status                     text NOT NULL DEFAULT 'queued' CHECK (status IN
                               ('queued','scanning','validating','importing','succeeded',
                                'partially_succeeded','failed','cancelled')),
  rows_total                 integer,
  rows_ok                    integer,
  rows_failed                integer,
  error_report_object_id     uuid,
  result_dataset_version_id  uuid,
  idempotency_key            text,
  requested_by               uuid NOT NULL REFERENCES app.users(id),
  created_at                 timestamptz NOT NULL DEFAULT now(),
  finished_at                timestamptz,
  UNIQUE (org_id, id),
  UNIQUE (org_id, idempotency_key),
  FOREIGN KEY (org_id, project_id) REFERENCES app.projects(org_id, id),
  FOREIGN KEY (org_id, dataset_id) REFERENCES app.datasets(org_id, id),
  FOREIGN KEY (org_id, source_object_id) REFERENCES app.stored_objects(org_id, id),
  FOREIGN KEY (org_id, model_run_id) REFERENCES app.model_runs(org_id, id)
);
```

### 4.7 Tasks and assignments

```sql
CREATE TABLE app.evaluation_tasks (
  id                 uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id             uuid NOT NULL,
  project_id         uuid NOT NULL,
  batch_id           uuid,
  dataset_item_id    uuid NOT NULL,
  rubric_version_id  uuid NOT NULL,
  task_type          text NOT NULL,
  status             text NOT NULL DEFAULT 'pending' CHECK (status IN
                       ('pending','ready','in_progress','awaiting_review','in_adjudication',
                        'rework','completed','cancelled')),
  required_overlap   smallint NOT NULL CHECK (required_overlap BETWEEN 1 AND 7),
  submitted_count    smallint NOT NULL DEFAULT 0,
  priority           smallint NOT NULL DEFAULT 100,
  is_gold            boolean NOT NULL DEFAULT false,
  gold_item_id       uuid,
  is_calibration     boolean NOT NULL DEFAULT false,
  generation_key     text NOT NULL,     -- hash(project, item, rubric_version, run ids); makes generation idempotent
  final_result       jsonb,             -- resolved label after agreement/adjudication
  final_source       text CHECK (final_source IN ('consensus','single','review','adjudication')),
  due_at             timestamptz,
  completed_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, id),
  UNIQUE (project_id, generation_key),
  FOREIGN KEY (org_id, project_id) REFERENCES app.projects(org_id, id),
  FOREIGN KEY (org_id, batch_id) REFERENCES app.task_batches(org_id, id),
  FOREIGN KEY (org_id, dataset_item_id) REFERENCES app.dataset_items(org_id, id),
  FOREIGN KEY (org_id, rubric_version_id) REFERENCES app.rubric_versions(org_id, id),
  CHECK (status <> 'completed' OR (final_result IS NOT NULL AND completed_at IS NOT NULL))
);
CREATE INDEX evaluation_tasks_queue_idx ON app.evaluation_tasks (project_id, priority, id)
  WHERE status IN ('ready','in_progress');
CREATE INDEX evaluation_tasks_status_idx ON app.evaluation_tasks (project_id, status);

CREATE TABLE app.evaluation_task_outputs (    -- which model outputs a task shows, and in which slot
  org_id           uuid NOT NULL,
  task_id          uuid NOT NULL,
  slot             char(1) NOT NULL CHECK (slot ~ '^[A-H]$'),
  model_output_id  uuid NOT NULL,
  PRIMARY KEY (task_id, slot),
  UNIQUE (task_id, model_output_id),
  FOREIGN KEY (org_id, task_id) REFERENCES app.evaluation_tasks(org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, model_output_id) REFERENCES app.model_outputs(org_id, id)
);

CREATE TABLE app.task_assignments (
  id             uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id         uuid NOT NULL,              -- customer org (of the task)
  task_id        uuid NOT NULL,
  expert_id      uuid NOT NULL REFERENCES app.expert_profiles(id),
  status         text NOT NULL DEFAULT 'recommended' CHECK (status IN
                   ('recommended','approved','offered','accepted','in_progress','submitted',
                    'declined','expired','released','revoked')),
  match_score    numeric(6,4),
  match_explain  jsonb,                       -- per-factor contributions, for PM transparency
  approved_by    uuid REFERENCES app.users(id),
  approved_at    timestamptz,
  offered_at     timestamptz,
  accepted_at    timestamptz,
  due_at         timestamptz,
  submitted_at   timestamptz,
  lease_expires_at timestamptz,               -- auto-release if the expert goes idle
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, id),
  FOREIGN KEY (org_id, task_id) REFERENCES app.evaluation_tasks(org_id, id),
  CHECK (status NOT IN ('approved','offered','accepted','in_progress','submitted') OR approved_by IS NOT NULL)
);
-- an expert holds at most one live assignment per task (overlap uses different experts)
CREATE UNIQUE INDEX task_assignments_live_uniq ON app.task_assignments (task_id, expert_id)
  WHERE status NOT IN ('declined','expired','released','revoked');
CREATE INDEX task_assignments_expert_queue_idx ON app.task_assignments (expert_id, status, due_at)
  WHERE status IN ('offered','accepted','in_progress');
CREATE INDEX task_assignments_lease_idx ON app.task_assignments (lease_expires_at)
  WHERE status IN ('accepted','in_progress');
```

### 4.8 Evaluation artifacts

```sql
CREATE TABLE app.evaluation_submissions (
  id                  uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id              uuid NOT NULL,
  task_id             uuid NOT NULL,
  assignment_id       uuid NOT NULL,
  expert_id           uuid NOT NULL REFERENCES app.expert_profiles(id),
  rubric_version_id   uuid NOT NULL,
  revision            smallint NOT NULL DEFAULT 1 CHECK (revision > 0),
  status              text NOT NULL DEFAULT 'draft' CHECK (status IN
                        ('draft','submitted','superseded','accepted','rejected')),
  overall_comment     text,
  confidence          smallint CHECK (confidence BETWEEN 1 AND 5),
  time_spent_seconds  integer CHECK (time_spent_seconds >= 0),
  client_meta         jsonb NOT NULL DEFAULT '{}',   -- app version, focus-loss count
  submitted_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, id),
  UNIQUE (assignment_id, revision),
  FOREIGN KEY (org_id, task_id) REFERENCES app.evaluation_tasks(org_id, id),
  FOREIGN KEY (org_id, assignment_id) REFERENCES app.task_assignments(org_id, id),
  FOREIGN KEY (org_id, rubric_version_id) REFERENCES app.rubric_versions(org_id, id),
  CHECK (status = 'draft' OR submitted_at IS NOT NULL)
);
CREATE UNIQUE INDEX submissions_one_open_uniq ON app.evaluation_submissions (assignment_id)
  WHERE status IN ('draft','submitted','accepted');
CREATE INDEX submissions_task_idx ON app.evaluation_submissions (task_id) WHERE status IN ('submitted','accepted');
CREATE INDEX submissions_expert_time_idx ON app.evaluation_submissions (expert_id, submitted_at DESC);

CREATE TABLE app.scores (
  id             uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id         uuid NOT NULL,
  submission_id  uuid NOT NULL,
  criterion_id   uuid NOT NULL,
  model_output_id uuid,                     -- which output was scored (multi-output tasks)
  value_numeric  numeric,
  value_label    text,
  explanation    text,
  UNIQUE NULLS NOT DISTINCT (submission_id, criterion_id, model_output_id),
  FOREIGN KEY (org_id, submission_id) REFERENCES app.evaluation_submissions(org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, criterion_id) REFERENCES app.rubric_criteria(org_id, id),
  FOREIGN KEY (org_id, model_output_id) REFERENCES app.model_outputs(org_id, id),
  CHECK (value_numeric IS NOT NULL OR value_label IS NOT NULL OR explanation IS NOT NULL)
);
CREATE INDEX scores_criterion_idx ON app.scores (criterion_id);

CREATE TABLE app.submission_error_labels (
  id                 uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id             uuid NOT NULL,
  submission_id      uuid NOT NULL,
  taxonomy_label_id  uuid NOT NULL,
  model_output_id    uuid,
  severity           text NOT NULL CHECK (severity IN ('minor','major','critical')),
  span               jsonb,                -- {"start":120,"end":188} character offsets in the output
  note               text,
  FOREIGN KEY (org_id, submission_id) REFERENCES app.evaluation_submissions(org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (taxonomy_label_id) REFERENCES app.error_taxonomy_labels(id),
  FOREIGN KEY (org_id, model_output_id) REFERENCES app.model_outputs(org_id, id)
);
CREATE INDEX submission_error_labels_sub_idx ON app.submission_error_labels (submission_id);

CREATE TABLE app.preference_judgments (
  id                  uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id              uuid NOT NULL,
  submission_id       uuid NOT NULL UNIQUE,
  task_id             uuid NOT NULL,
  kind                text NOT NULL CHECK (kind IN ('pairwise','ranking')),
  chosen_output_id    uuid,
  rejected_output_id  uuid,
  is_tie              boolean NOT NULL DEFAULT false,
  strength            smallint CHECK (strength BETWEEN 1 AND 3),   -- slight, clear, strong
  ranking             uuid[],                                      -- model_output ids best to worst
  rationale           text NOT NULL CHECK (length(rationale) >= 20),
  FOREIGN KEY (org_id, submission_id) REFERENCES app.evaluation_submissions(org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, task_id) REFERENCES app.evaluation_tasks(org_id, id),
  FOREIGN KEY (org_id, chosen_output_id) REFERENCES app.model_outputs(org_id, id),
  FOREIGN KEY (org_id, rejected_output_id) REFERENCES app.model_outputs(org_id, id),
  CHECK (kind <> 'pairwise' OR is_tie OR (chosen_output_id IS NOT NULL AND rejected_output_id IS NOT NULL
                                          AND chosen_output_id <> rejected_output_id)),
  CHECK (kind <> 'ranking' OR cardinality(ranking) >= 2)
);

CREATE TABLE app.corrected_outputs (
  id                     uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id                 uuid NOT NULL,
  submission_id          uuid NOT NULL,
  task_id                uuid NOT NULL,
  source_model_output_id uuid,              -- null when written from scratch
  corrected              jsonb NOT NULL,     -- {"text":"..."} or {"messages":[...]}
  edit_distance          integer,
  rationale              text,
  UNIQUE NULLS NOT DISTINCT (submission_id, source_model_output_id),
  FOREIGN KEY (org_id, submission_id) REFERENCES app.evaluation_submissions(org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, task_id) REFERENCES app.evaluation_tasks(org_id, id),
  FOREIGN KEY (org_id, source_model_output_id) REFERENCES app.model_outputs(org_id, id)
);

CREATE TABLE app.red_team_items (
  id               uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id           uuid NOT NULL,
  submission_id    uuid NOT NULL,
  project_id       uuid NOT NULL,
  attack_category  text NOT NULL,           -- key from the project's error taxonomy or a harm taxonomy
  technique        text,
  prompt           jsonb NOT NULL,
  expected_safe_behavior text NOT NULL,
  observed_output  jsonb,
  succeeded        boolean,
  severity         text CHECK (severity IN ('low','medium','high','critical')),
  FOREIGN KEY (org_id, submission_id) REFERENCES app.evaluation_submissions(org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, project_id) REFERENCES app.projects(org_id, id)
);
CREATE INDEX red_team_items_project_idx ON app.red_team_items (project_id, attack_category);
```

### 4.9 QA: review, adjudication, gold, calibration

```sql
CREATE TABLE app.gold_items (
  id                uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id            uuid NOT NULL,
  project_id        uuid NOT NULL,
  dataset_item_id   uuid NOT NULL,
  rubric_version_id uuid NOT NULL,
  purpose           text NOT NULL CHECK (purpose IN ('calibration','hidden_qa','both')),
  expected_result   jsonb NOT NULL,   -- {"scores":{"accuracy":5},"preference":"A","labels":["factual.x"]}
  tolerance         jsonb NOT NULL DEFAULT '{}',   -- {"accuracy":1} allowed absolute deviation
  explanation       text NOT NULL,    -- shown to the expert after a calibration attempt
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','retired')),
  created_by        uuid NOT NULL REFERENCES app.users(id),
  approved_by       uuid REFERENCES app.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, id),
  UNIQUE (project_id, dataset_item_id, rubric_version_id),
  FOREIGN KEY (org_id, project_id) REFERENCES app.projects(org_id, id),
  FOREIGN KEY (org_id, dataset_item_id) REFERENCES app.dataset_items(org_id, id),
  FOREIGN KEY (org_id, rubric_version_id) REFERENCES app.rubric_versions(org_id, id),
  CHECK (status <> 'active' OR approved_by IS NOT NULL)
);

ALTER TABLE app.evaluation_tasks
  ADD CONSTRAINT evaluation_tasks_gold_fk FOREIGN KEY (org_id, gold_item_id) REFERENCES app.gold_items(org_id, id);

CREATE TABLE app.expert_qualifications (
  id                 uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id             uuid NOT NULL,             -- customer org of the project
  project_id         uuid NOT NULL,
  expert_id          uuid NOT NULL REFERENCES app.expert_profiles(id),
  rubric_version_id  uuid NOT NULL,
  status             text NOT NULL DEFAULT 'invited' CHECK (status IN
                       ('invited','in_calibration','qualified','failed','revoked')),
  calibration_score  numeric(5,4),
  attempts           smallint NOT NULL DEFAULT 0,
  qualified_at       timestamptz,
  UNIQUE (project_id, expert_id, rubric_version_id),
  FOREIGN KEY (org_id, project_id) REFERENCES app.projects(org_id, id),
  FOREIGN KEY (org_id, rubric_version_id) REFERENCES app.rubric_versions(org_id, id)
);

CREATE TABLE app.review_tasks (
  id             uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id         uuid NOT NULL,
  task_id        uuid NOT NULL,
  submission_id  uuid,
  kind           text NOT NULL CHECK (kind IN ('second_review','gold_check','rework_review','spot_check','customer_dispute')),
  reason         text NOT NULL CHECK (reason IN ('sampled','low_agreement','low_confidence','gold_fail',
                                                  'new_expert','manual','customer')),
  reviewer_id    uuid REFERENCES app.users(id),
  status         text NOT NULL DEFAULT 'open' CHECK (status IN ('open','claimed','completed','cancelled')),
  decision       text CHECK (decision IN ('accept','accept_with_edits','request_rework','reject','escalate')),
  feedback       text,
  score_overrides jsonb,              -- {"criterion_key": value}
  due_at         timestamptz,
  claimed_at     timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, id),
  FOREIGN KEY (org_id, task_id) REFERENCES app.evaluation_tasks(org_id, id),
  FOREIGN KEY (org_id, submission_id) REFERENCES app.evaluation_submissions(org_id, id),
  CHECK (status <> 'completed' OR (decision IS NOT NULL AND completed_at IS NOT NULL)),
  CHECK (decision NOT IN ('request_rework','reject') OR length(coalesce(feedback,'')) >= 10)
);
CREATE INDEX review_tasks_open_idx ON app.review_tasks (org_id, status, created_at) WHERE status IN ('open','claimed');
CREATE INDEX review_tasks_reviewer_idx ON app.review_tasks (reviewer_id, status);

CREATE TABLE app.adjudications (
  id                    uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id                uuid NOT NULL,
  task_id               uuid NOT NULL,
  trigger               text NOT NULL CHECK (trigger IN ('low_agreement','review_escalation','customer_dispute','manual')),
  adjudicator_id        uuid REFERENCES app.users(id),
  status                text NOT NULL DEFAULT 'open' CHECK (status IN ('open','claimed','resolved','cancelled')),
  input_submission_ids  uuid[] NOT NULL,
  resolution            text CHECK (resolution IN ('select_submission','merge','new_answer','discard_item')),
  selected_submission_id uuid,
  final_result          jsonb,
  rationale             text,
  resolved_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, id),
  FOREIGN KEY (org_id, task_id) REFERENCES app.evaluation_tasks(org_id, id),
  CHECK (status <> 'resolved' OR (resolution IS NOT NULL AND rationale IS NOT NULL AND resolved_at IS NOT NULL)),
  CHECK (resolution <> 'select_submission' OR selected_submission_id IS NOT NULL)
);
CREATE UNIQUE INDEX adjudications_one_open_per_task ON app.adjudications (task_id) WHERE status IN ('open','claimed');
```

### 4.10 Metrics

```sql
CREATE TABLE app.metric_runs (
  id            uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id        uuid NOT NULL,
  project_id    uuid NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('agreement','gold_accuracy','expert_quality','model_comparison','full')),
  params        jsonb NOT NULL DEFAULT '{}',
  inputs_sha256 bytea,                 -- hash of the submission id set; identical inputs reuse results
  status        text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed')),
  requested_by  uuid REFERENCES app.users(id),
  started_at    timestamptz,
  finished_at   timestamptz,
  error         text,
  UNIQUE (org_id, id),
  FOREIGN KEY (org_id, project_id) REFERENCES app.projects(org_id, id)
);

CREATE TABLE app.quality_metrics (
  id            uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id        uuid NOT NULL,
  project_id    uuid NOT NULL,
  metric_run_id uuid NOT NULL,
  scope_type    text NOT NULL CHECK (scope_type IN ('project','batch','criterion','expert','task',
                                                    'rubric_version','model_run','model_pair')),
  scope_id      uuid,                   -- null for scope_type = project
  scope_key     text,                   -- criterion key or "runA:runB"
  metric        text NOT NULL CHECK (metric IN ('krippendorff_alpha','fleiss_kappa','cohen_kappa',
                   'percent_agreement','gold_accuracy','review_acceptance_rate','rework_rate',
                   'mean_score','win_rate','tie_rate','elo','score_delta','throughput_per_day',
                   'median_time_seconds')),
  value         double precision NOT NULL,
  ci_low        double precision,
  ci_high       double precision,
  sample_size   integer NOT NULL CHECK (sample_size >= 0),
  details       jsonb NOT NULL DEFAULT '{}',
  computed_at   timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, project_id) REFERENCES app.projects(org_id, id),
  FOREIGN KEY (org_id, metric_run_id) REFERENCES app.metric_runs(org_id, id) ON DELETE CASCADE
);
CREATE INDEX quality_metrics_lookup_idx
  ON app.quality_metrics (project_id, metric, scope_type, scope_id, computed_at DESC);
```

### 4.11 Delivery and exports

```sql
CREATE TABLE app.deliverables (
  id                 uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id             uuid NOT NULL,
  project_id         uuid NOT NULL,
  name               text NOT NULL,
  format             text NOT NULL,
  dataset_version_id uuid NOT NULL,
  status             text NOT NULL DEFAULT 'draft' CHECK (status IN
                       ('draft','internal_qa','ready','delivered','accepted','rejected')),
  quality_summary    jsonb NOT NULL DEFAULT '{}',   -- snapshot of key metrics at delivery
  delivered_at       timestamptz,
  accepted_by        uuid REFERENCES app.users(id),
  accepted_at        timestamptz,
  customer_feedback  text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, id),
  FOREIGN KEY (org_id, project_id) REFERENCES app.projects(org_id, id),
  FOREIGN KEY (org_id, dataset_version_id) REFERENCES app.dataset_versions(org_id, id)
);

CREATE TABLE app.exports (
  id                 uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id             uuid NOT NULL,
  project_id         uuid NOT NULL,
  dataset_version_id uuid NOT NULL,
  deliverable_id     uuid,
  format             text NOT NULL CHECK (format IN ('eval_benchmark_jsonl','sft_jsonl','preference_pairs_jsonl',
                       'red_team_jsonl','csv','parquet','lerobot','rlds','hdf5')),
  options            jsonb NOT NULL DEFAULT '{}',
  status             text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','expired')),
  object_id          uuid,
  row_count          integer,
  sha256             bytea,
  error              text,
  idempotency_key    text,
  requested_by       uuid NOT NULL REFERENCES app.users(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  started_at         timestamptz,
  finished_at        timestamptz,
  expires_at         timestamptz,
  UNIQUE (org_id, id),
  UNIQUE (org_id, idempotency_key),
  FOREIGN KEY (org_id, project_id) REFERENCES app.projects(org_id, id),
  FOREIGN KEY (org_id, dataset_version_id) REFERENCES app.dataset_versions(org_id, id),
  FOREIGN KEY (org_id, deliverable_id) REFERENCES app.deliverables(org_id, id),
  FOREIGN KEY (org_id, object_id) REFERENCES app.stored_objects(org_id, id),
  CHECK (status <> 'succeeded' OR (object_id IS NOT NULL AND sha256 IS NOT NULL))
);
```

### 4.12 Billing

```sql
CREATE TABLE app.rate_cards (
  id               uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id           uuid NOT NULL REFERENCES app.organizations(id),
  project_id       uuid,
  meter            text NOT NULL,
  unit_price_minor bigint NOT NULL CHECK (unit_price_minor >= 0),
  currency         char(3) NOT NULL,
  valid           daterange NOT NULL,
  FOREIGN KEY (org_id, project_id) REFERENCES app.projects(org_id, id),
  EXCLUDE USING gist (org_id WITH =, (coalesce(project_id,'00000000-0000-0000-0000-000000000000'::uuid)) WITH =,
                      meter WITH =, valid WITH &&)
);

CREATE TABLE app.usage_records (
  id                uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id            uuid NOT NULL,
  project_id        uuid,
  meter             text NOT NULL CHECK (meter IN ('task_completed','review_completed','adjudication_completed',
                        'expert_minutes','storage_gb_month','export_generated','api_requests','capture_minutes')),
  quantity          numeric(14,4) NOT NULL CHECK (quantity >= 0),
  unit_price_minor  bigint,             -- resolved from rate_cards at rating time
  currency          char(3),
  occurred_at       timestamptz NOT NULL,
  source_type       text NOT NULL,      -- evaluation_task, review_task, export, ...
  source_id         uuid,
  idempotency_key   text NOT NULL UNIQUE,   -- e.g. "task_completed:<task_id>"
  invoice_id        uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, project_id) REFERENCES app.projects(org_id, id)
);
CREATE INDEX usage_records_unbilled_idx ON app.usage_records (org_id, occurred_at) WHERE invoice_id IS NULL;

CREATE TABLE app.invoices (
  id              uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id          uuid NOT NULL REFERENCES app.organizations(id),
  number          text NOT NULL UNIQUE,        -- INF/2026-27/000123 (Indian FY sequence)
  period          daterange NOT NULL,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','paid','void')),
  currency        char(3) NOT NULL,
  subtotal_minor  bigint NOT NULL DEFAULT 0,
  tax_minor       bigint NOT NULL DEFAULT 0,   -- GST
  total_minor     bigint NOT NULL DEFAULT 0,
  tax_details     jsonb NOT NULL DEFAULT '{}', -- CGST/SGST/IGST split, place of supply, SAC code
  pdf_object_id   uuid,
  issued_at       timestamptz,
  due_at          timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, id),
  CHECK (total_minor = subtotal_minor + tax_minor)
);
ALTER TABLE app.usage_records
  ADD CONSTRAINT usage_records_invoice_fk FOREIGN KEY (org_id, invoice_id) REFERENCES app.invoices(org_id, id);

CREATE TABLE app.invoice_line_items (
  id               uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id           uuid NOT NULL,
  invoice_id       uuid NOT NULL,
  project_id       uuid,
  meter            text NOT NULL,
  description      text NOT NULL,
  quantity         numeric(14,4) NOT NULL,
  unit_price_minor bigint NOT NULL,
  amount_minor     bigint NOT NULL,
  FOREIGN KEY (org_id, invoice_id) REFERENCES app.invoices(org_id, id) ON DELETE CASCADE
);
```

### 4.13 Consent and audit

```sql
CREATE TABLE app.consent_records (
  id                  uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id              uuid NOT NULL REFERENCES app.organizations(id),
  subject_user_id     uuid REFERENCES app.users(id),
  subject_external_ref text,             -- Track B capture participant without a login
  consent_type        text NOT NULL CHECK (consent_type IN ('platform_terms','expert_agreement','nda',
                        'data_processing','capture_recording','capture_biometric','likeness_release')),
  document_version    text NOT NULL,
  document_sha256     bytea NOT NULL,
  scope               jsonb NOT NULL DEFAULT '{}',   -- {"project_id":"...","purposes":["training"]}
  method              text NOT NULL CHECK (method IN ('clickwrap','esign','paper_scan','verbal_recorded')),
  granted_at          timestamptz NOT NULL,
  revoked_at          timestamptz,
  evidence_object_id  uuid REFERENCES app.stored_objects(id),
  ip                  inet,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (subject_user_id IS NOT NULL OR subject_external_ref IS NOT NULL),
  CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);
CREATE INDEX consent_subject_idx ON app.consent_records (subject_user_id, consent_type) WHERE revoked_at IS NULL;

CREATE SCHEMA IF NOT EXISTS audit;
CREATE TABLE audit.audit_events (
  id            bigint GENERATED ALWAYS AS IDENTITY,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  org_id        uuid,                 -- null for platform-level events
  actor_type    text NOT NULL CHECK (actor_type IN ('user','api_key','system','support_impersonation')),
  actor_id      uuid,
  actor_roles   text[] NOT NULL DEFAULT '{}',
  action        text NOT NULL,        -- "project.approve", "export.download_url_issued"
  target_type   text NOT NULL,
  target_id     uuid,
  request_id    text,
  ip            inet,
  user_agent    text,
  changes       jsonb,                -- field-level before/after; secrets and free-text bodies excluded
  prev_hash     bytea,
  hash          bytea NOT NULL,
  PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);
-- monthly partitions created by a scheduled job 3 months ahead, e.g.:
CREATE TABLE audit.audit_events_2026_10 PARTITION OF audit.audit_events
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE INDEX audit_events_org_time_idx ON audit.audit_events (org_id, occurred_at DESC);
CREATE INDEX audit_events_target_idx ON audit.audit_events (target_type, target_id);
```

### 4.14 Platform plumbing

```sql
CREATE TABLE app.outbox_events (                -- transactional outbox, see data_pipeline.md
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id         uuid,
  event_type     text NOT NULL,                 -- "submission.submitted"
  aggregate_type text NOT NULL,
  aggregate_id   uuid NOT NULL,
  payload        jsonb NOT NULL,
  occurred_at    timestamptz NOT NULL DEFAULT now(),
  dispatched_at  timestamptz
);
CREATE INDEX outbox_undispatched_idx ON app.outbox_events (id) WHERE dispatched_at IS NULL;

CREATE TABLE app.idempotency_keys (
  principal_id   uuid NOT NULL,                 -- user id or api key id
  key            text NOT NULL CHECK (length(key) BETWEEN 8 AND 128),
  route          text NOT NULL,
  request_sha256 bytea NOT NULL,
  response_status smallint,
  response_body  jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (principal_id, key, route)
);
CREATE INDEX idempotency_keys_created_idx ON app.idempotency_keys (created_at);   -- 24 h purge

CREATE TABLE app.notifications (
  id         uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id     uuid NOT NULL,
  user_id    uuid NOT NULL REFERENCES app.users(id),
  kind       text NOT NULL,
  payload    jsonb NOT NULL,
  channel    text NOT NULL CHECK (channel IN ('in_app','email','webhook')),
  sent_at    timestamptz,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_unread_idx ON app.notifications (user_id, created_at DESC) WHERE read_at IS NULL;

CREATE TABLE app.integration_connections (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id      uuid NOT NULL REFERENCES app.organizations(id),
  kind        text NOT NULL CHECK (kind IN ('langfuse','openai_compatible','s3_bucket','webhook')),
  config      jsonb NOT NULL DEFAULT '{}',   -- non-secret config only
  secret_ref  text,                          -- AWS Secrets Manager ARN; secret never stored in DB
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','error')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.webhook_endpoints (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id      uuid NOT NULL REFERENCES app.organizations(id),
  url         text NOT NULL CHECK (url ~ '^https://'),
  events      text[] NOT NULL,
  secret_ref  text NOT NULL,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.webhook_deliveries (
  id            uuid PRIMARY KEY DEFAULT uuidv7(),
  org_id        uuid NOT NULL,
  endpoint_id   uuid NOT NULL REFERENCES app.webhook_endpoints(id),
  outbox_id     bigint NOT NULL,
  attempt       smallint NOT NULL DEFAULT 1,
  response_code smallint,
  status        text NOT NULL CHECK (status IN ('pending','succeeded','failed','dead')),
  next_retry_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (endpoint_id, outbox_id, attempt)
);
```

---

## 5. Key state machines (enforced in service layer, guarded by CHECKs)

| Entity | Transitions |
|---|---|
| projects | draft -> submitted -> in_review -> (changes_requested -> submitted) / approved -> active <-> paused -> completed; any non-terminal -> cancelled |
| rubric_versions | draft -> in_review -> published -> retired. Published is immutable; edits create version n+1. |
| dataset_versions | building -> frozen / failed; frozen -> archived. Frozen is immutable. |
| evaluation_tasks | pending -> ready -> in_progress -> awaiting_review -> (rework -> in_progress) / in_adjudication -> completed; any -> cancelled |
| task_assignments | recommended -> approved -> offered -> accepted -> in_progress -> submitted; offered -> declined/expired; accepted/in_progress -> released (lease expiry) ; any live -> revoked |
| evaluation_submissions | draft -> submitted -> accepted / rejected / superseded (rework creates revision+1) |

Transitions use `UPDATE ... SET status = :new WHERE id = :id AND status = :expected` and check the affected row count (optimistic, no long locks). Assignment claim from a pool uses `SELECT ... FOR UPDATE SKIP LOCKED`.

---

## 6. Row-level security (RLS)

### 6.1 Recommendation

Enable RLS on every table carrying `org_id`, as **defense in depth** behind the application's own authorization checks. The application remains the primary enforcement point (permission checks, project staffing, assignment ownership); RLS guarantees that a forgotten `WHERE org_id = ...` cannot leak another tenant's rows.

### 6.2 Database roles

| DB role | Used by | Properties |
|---|---|---|
| `app_owner` | Alembic migrations only | Owns tables. Not used at runtime. |
| `app_rw` | API and workers | `NOBYPASSRLS`. All tables `FORCE ROW LEVEL SECURITY`. No UPDATE/DELETE on `audit.*`. |
| `app_platform` | Platform-operator endpoints, cross-tenant reports, billing run | `BYPASSRLS`. Separate connection pool, only reachable from code paths that require `superadmin`/`platform_operator`, every use audited. |
| `app_readonly` | Metabase/analytics replica, support | Read replica only, RLS enforced with `app.org_id` set by tooling or restricted to aggregate views. |

### 6.3 Per-request context

At the start of every transaction (FastAPI dependency / worker job wrapper):

```sql
SET LOCAL app.org_id = '<tenant org uuid>';
SET LOCAL app.user_id = '<user uuid>';
SET LOCAL app.expert_id = '<expert uuid or empty>';
SET LOCAL app.staff_org_ids = '{uuid1,uuid2}';   -- orgs whose projects this staff user is staffed on
```

`SET LOCAL` is transaction-scoped, so it is safe with PgBouncer/RDS Proxy in transaction pooling mode. Session-level `SET` must never be used.

### 6.4 Policies

```sql
-- Standard tenant policy applied to all customer-tenant tables (generated by a migration helper):
ALTER TABLE app.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.projects FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON app.projects
  USING (org_id = app.current_org_id())
  WITH CHECK (org_id = app.current_org_id());

-- Experts see their own assignments across tenants (needed for "my tasks"):
CREATE POLICY expert_own_assignments ON app.task_assignments FOR SELECT
  USING (expert_id = app.current_expert_id());

-- Expert identity tables live in the platform org; experts may read/write their own profile rows:
CREATE POLICY expert_self ON app.expert_profiles
  USING (org_id = app.current_org_id() OR user_id = app.current_user_id());
```

Flow for an expert opening a task: the API reads the assignment via `expert_own_assignments`, verifies it is live, then sets `app.org_id` to the assignment's `org_id` for the rest of the transaction. All task, item, output, rubric and submission reads then pass the standard tenant policy, and the service layer additionally filters by `assignment_id`.

Flow for internal staff: the API checks `project_staff`, then sets `app.org_id` to the project's org. Cross-project PM queues are served by a query per staffed org, or via `app_platform` for operators.

### 6.5 Trade-offs

| Benefit | Cost / risk | Mitigation |
|---|---|---|
| A missing tenant filter cannot leak data | Policy predicates add a filter per table scan | `org_id` leads composite indexes; `current_setting` wrapped in STABLE functions so the planner evaluates it once per statement. |
| Auditable, declarative isolation | Easy to forget enabling RLS on a new table | CI test lists all `app.*` tables with an `org_id` column and fails if `relrowsecurity` or `relforcerowsecurity` is false. |
| Works with any query path (ORM, raw SQL, reports) | Context must be set on every transaction, including workers | Single `tenant_session()` context manager; jobs carry `org_id` in their payload and the worker wrapper sets it. |
| | Cross-tenant platform work needs a bypass role | Separate `app_platform` pool, narrow code paths, audited. |
| | Debugging "zero rows" surprises | Dev middleware logs current `app.*` settings on empty results in debug mode. |

Alternatives considered: schema-per-tenant (migration fan-out, poor fit for cross-tenant expert workflows) and database-per-tenant (only for an enterprise customer demanding physical isolation; the `organizations.data_region` and per-org bucket prefixes keep that door open). Rejected for MVP.

---

## 7. Integrity triggers

```sql
-- Block changes to published rubric versions and their criteria.
CREATE FUNCTION app.forbid_published_rubric_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('published','retired') AND NOT (OLD.status = 'published' AND NEW.status = 'retired'
       AND NEW.instructions_md = OLD.instructions_md AND NEW.scoring_config = OLD.scoring_config) THEN
    RAISE EXCEPTION 'rubric_version % is immutable', OLD.id USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER rubric_versions_immutable BEFORE UPDATE ON app.rubric_versions
  FOR EACH ROW EXECUTE FUNCTION app.forbid_published_rubric_change();
-- Same pattern for: rubric_criteria (parent published), dataset_versions (frozen),
-- dataset_version_items (parent frozen), evaluation_submissions (status <> 'draft': only status column may change).

-- Audit log is append-only.
CREATE FUNCTION audit.forbid_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'audit_events is append-only'; END $$;
CREATE TRIGGER audit_events_no_update BEFORE UPDATE OR DELETE ON audit.audit_events
  FOR EACH ROW EXECUTE FUNCTION audit.forbid_mutation();
REVOKE UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA audit FROM app_rw;
```

Hash chain (optional, recommended): audit rows are written by a single writer (an outbox consumer with an advisory lock), computing `hash = sha256(prev_hash || canonical_json(row))`. A nightly job verifies the chain and writes the day's head hash to an S3 Object Lock (compliance mode) bucket, so tampering with the database is detectable even by someone with `app_owner`. Retention by dropping whole partitions only after export to the locked bucket.

---

## 8. Object storage metadata pattern

1. Client calls `POST /v1/uploads` with filename, size, content type, sha256 (optional) and purpose.
2. API validates (size, type allow-list, permission), inserts `stored_objects` with `status = 'pending_upload'` and a server-generated key, and returns a presigned PUT (or multipart upload parts for > 100 MB).
3. Client uploads directly to S3/MinIO.
4. Client calls `POST /v1/uploads/{id}/complete`. API issues `HeadObject`, verifies size and checksum, sets `status = 'uploaded'`, and enqueues scanning/validation.
5. Malware scan and format sniffing set `available` or `quarantined`.
6. A janitor job deletes objects stuck in `pending_upload` for more than 24 h (S3 lifecycle also aborts incomplete multipart uploads after 1 day).

Rules:
- Object keys are generated by the server and never contain user-supplied filenames (original name kept in metadata only).
- The database is the source of truth for what exists and who may access it; S3 is never listed to answer user queries.
- Reads always go through `GET /v1/objects/{id}/download-url`, which checks permission on the owning entity and returns a short-lived presigned GET (see api_design.md).
- Key layout: see [data_pipeline.md](data_pipeline.md) section 9.

---

## 9. Partitioning, retention, size estimates

MVP volume assumption (year 1): 50 customer orgs, 300 projects, 2 M dataset items, 5 M model outputs, 6 M submissions, 40 M score rows, 50 M audit events. This fits comfortably on a single `db.r7g.large`/`xlarge` primary with no partitioning except `audit_events` (monthly, time-based).

Partition candidates once a table exceeds roughly 100 M rows or 100 GB: `scores` and `evaluation_submissions` by hash of `org_id` (keeps tenant locality), `quality_metrics` by month. Not needed for MVP.

Retention defaults (configurable per org contract): drafts not submitted for 90 days purged; quarantined uploads 30 days; export artifacts 30 days (`exports.expires_at`, regenerated on demand from the frozen version); audit events 7 years in cold storage, 13 months hot.

---

## 10. Track B extension points (schema only, not built in MVP)

- `stored_objects.kind` already allows `media_video`, `media_sensor`; `datasets.kind = 'capture'`, `item_schema = 'capture_episode'`; `exports.format` allows `lerobot`, `rlds`, `hdf5`; `consent_records` covers recording, biometric and likeness consent with external subjects.
- Future tables: `capture_sessions` (device, operator, location, consent_record_id), `capture_streams` (session, modality, sensor calibration, object_id, fps, time base), `episodes` (session, time range, task description, success flag), `episode_segments` (episode, start_ns, end_ns, label, annotator submission). Episodes will be linked to `dataset_items` one-to-one so versioning, tasks, review and exports reuse the Track A pipeline unchanged.
