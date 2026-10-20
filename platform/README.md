# Infollion Evaluation Platform (Phase 1 MVP)

## Quick start

Requirement: Docker Desktop running. Nothing else needs to be installed to see the demo.

```bash
cd platform
./run.sh            # builds, starts, loads demo data, prints the logins
```

Then open **http://localhost:3000**. Every demo account uses the password `ChangeMe-dev-123!`.

| Role | Email |
|---|---|
| Customer (AI company) | `customer@acme.local` |
| Project manager | `pm@infollion.local` |
| Reviewer | `reviewer@infollion.local` |
| Expert | `expert1@infollion.local` (also `expert2` to `expert5`) |
| Platform admin | `admin@infollion.local` |

Other commands:

| Command | What it does |
|---|---|
| `./run.sh stop` | Stop everything; data is kept |
| `./run.sh status` | Show which services are up |
| `./run.sh logs` | Follow the logs |
| `./run.sh reset` | Delete all local data and start fresh with the demo (asks first) |
| `./run.sh test` | Run backend and frontend tests (needs `uv` and Node 22) |

### Demo walkthrough (about 15 minutes)

Use one browser window per role (normal, incognito, another browser): a browser shares one login across its tabs.

1. **Customer** `customer@acme.local`: open project **DEMO-PAIR** (8 medical questions, two AI answers each). Look at the Data and Rubric tabs.
2. **Expert 1** `expert1@infollion.local`: click **Start next task**. Score answers A and B, add an error label, choose the better answer with a rationale, submit. Repeat for a few tasks.
3. **Expert 2** `expert2@infollion.local`: rate the same tasks. On one question prefer the *other* answer to create a disagreement.
4. **Reviewer** `reviewer@infollion.local`: open **Adjudications**, compare the two experts side by side, pick the correct one and resolve. Check **Reviews** for sampled or too-fast submissions.
5. **Project manager** `pm@infollion.local`: open DEMO-PAIR in **Staff projects**, try **Recommend experts** (expert4 is excluded for a conflict of interest), view expert quality.
6. **Customer** again: **Quality** tab, click **Recompute** for agreement (Krippendorff's alpha), win rates and error counts. Then **Datasets & exports**: freeze a version, export preference pairs, download. See also **Audit log** and **Usage**.

To start a project from scratch, create one as the customer and upload `backend/sample_data/pairwise.jsonl`. Build and publish a rubric (`backend/sample_data/rubric_pairwise.json` shows one), then submit. The project manager then approves, generates tasks, activates, recommends and assigns experts.

If a page looks logged out, sign in again. API docs: http://localhost:8010/docs

| Path | What |
|---|---|
| `backend/` | FastAPI API, procrastinate worker, Alembic migrations, seed, tests |
| `frontend/` | Next.js client (see `frontend/README.md`) |
| `docs/mvp_api_contract.md` | Binding API contract between the two |
| `backend/openapi.json` | Generated OpenAPI spec (`python -m app.cli openapi`) |
| `docker-compose.yml` | Local stack |

## Local stack

```bash
docker compose up -d --build              # postgres, seaweedfs, migrate, storage-init, api, worker
docker compose run --rm api python -m app.cli seed     # demo users, skills and a demo project
docker compose --profile web up -d --build web         # optional: the frontend on :3000
```

| Service | Host port | Notes |
|---|---|---|
| API | `${API_PORT:-8010}` | `http://localhost:8010/docs`, `/healthz`, `/readyz` |
| Postgres 17 | `${POSTGRES_PORT:-5434}` | db `ifl`; owner `ifl_owner`, runtime roles `ifl_app` (RLS enforced) and `ifl_ops` (BYPASSRLS, audited) |
| S3 (SeaweedFS 4.48) | `${S3_PORT:-8333}` | bucket `ifl-local`, keys `ifl_local_key` / `ifl_local_secret` |
| Web | `${WEB_PORT:-3000}` | only with `--profile web` |

Ports 8000 and 5432 are deliberately avoided (another project uses them). For `npm run dev` outside Docker the frontend's `API_URL` is `http://localhost:8010`.

### Object storage

Local object storage is SeaweedFS's S3 gateway (Apache-2.0), pinned to release `4.48` and used for local development only (ADR-011). The backend only speaks plain S3 through boto3 (`app/core/storage.py`), so AWS S3 or any other S3-compatible store works by changing the `S3_*` settings. The `storage-init` one-shot creates the bucket and applies a CORS rule for `http://localhost:3000`; SeaweedFS also gets `-s3.allowedOrigins=http://localhost:3000`, so browser uploads to presigned URLs work even if bucket CORS is not honoured. Presigned URLs are signed for `S3_PUBLIC_ENDPOINT_URL` (`http://localhost:8333`), the host the browser uses.

### Seeded accounts (`python -m app.cli seed`)

All share `SEED_PASSWORD` (default `ChangeMe-dev-123!`).

| Email | Roles |
|---|---|
| `admin@infollion.local` | platform_admin |
| `pm@infollion.local` | project_manager |
| `reviewer@infollion.local` | reviewer |
| `expert1..5@infollion.local` | expert (profiles, skills, verified credentials; expert4 declares a conflict with Acme AI Labs) |
| `customer@acme.local` | customer_admin of Acme AI Labs |
| `analyst@acme.local` | customer_member of Acme AI Labs |

The demo project `DEMO-PAIR` (pairwise, overlap 2) is active with 8 items and tasks, and expert1..3 are approved on it. `--no-demo` skips it.

## Backend development

```bash
cd backend
uv sync
uv run pytest                    # unit tests; DB tests skip unless Postgres is on localhost:5434
docker compose up -d postgres    # then the integration tests run against a fresh ifl_test database
uv run python -m app.cli migrate
uv run uvicorn app.main:app --port 8010 --reload
uv run python -m app.worker
uv run python -m app.cli openapi --out openapi.json
```

Settings come from environment variables (see `app/core/config.py`). `JOBS_MODE=inline` runs background jobs in the API process right after commit (tests use it); the default `procrastinate` mode needs the worker.

## How it fits together

- **Tenancy.** Every tenant table carries `org_id` and Postgres row-level security is forced. Each request sets `app.org_id`, `app.user_id` and `app.role_scope` (`tenant`, `staff`, `expert`, `system`, `auth`) for its transaction. Cross-org staff lists and maintenance use the `ifl_ops` connection, and every such use writes an `ops.bypass_rls` audit event.
- **Experts** see items, outputs and tasks only through a live assignment of their own (RLS), never see model names or the customer's name (`Customer #ALIAS`), and get outputs in a per-assignment random A/B order. Pulling the next task is a `SECURITY DEFINER` function that re-checks approval, project status and limits.
- **Slots.** At submit time the expert's slot letters are resolved to output ids and model names (`submissions.resolved`). QA, consensus, agreement, gold checks, metrics and exports only read the resolved form, so two experts who saw A/B swapped but preferred the same model agree. Staff screens show canonical slots (A = first output of the item).
- **QA** (`app/modules/quality/pipeline.py`) follows contract section 7: gold checks, `too_fast` reviews, review sampling at `review_rate`, disagreement to adjudication for overlap >= 2, consensus otherwise; finalising writes `task_results` and a usage record.
- **Metrics** use Krippendorff's alpha (ordinal for likert, nominal for binary, categorical and preference), checked against the published worked example, plus bootstrap CIs for per-model means and pairwise win rates.
- **Datasets and exports.** A dataset version freezes per-item snapshots and a manifest hash (DB triggers block later edits). Exports write the JSONL file and `manifest.json` under `orgs/{org_id}/exports/{export_id}/`; download URLs last 5 minutes and are audited.
- **Jobs** go through a transactional outbox: the outbox row commits with the business change and is handed to procrastinate after commit; a periodic sweep retries anything left pending. Another periodic job expires task leases after 24 hours.
- **Auth.** Argon2id passwords, 15-minute HS256 access tokens, rotating refresh tokens in an httpOnly cookie on `Path=/v1/auth` with reuse detection, optional TOTP MFA (`REQUIRE_MFA`), failed-login throttling.
