# Tooling Agent: Working Notes and Verification Log

Agent: Tooling Research Agent
Access date for every source below: 2026-10-20
Method: GitHub REST API (`/repos/{owner}/{repo}`) for stars, license SPDX, `pushed_at`, `archived`; GitHub Atom feeds (`/releases.atom`, `/commits.atom`, default branch) for latest release and latest default-branch commit; PyPI JSON API and npm registry for package versions; WebFetch of official docs and pricing pages; WebSearch for acquisition news.

Evidence type legend: OD = official docs/pricing page, REPO = GitHub repo/API/license file, PKG = PyPI/npm registry, IND = independent press, INF = inferred by this agent.

Caveats:
- `pushed_at` reflects pushes to any branch (including bot branches), so the default-branch commit date from the Atom feed is the better maintenance signal. Both are recorded.
- Star counts are point-in-time snapshots from the GitHub API on 2026-10-20.
- WebFetch summaries are produced by a small model over the page; where a page did not state something, it is recorded as "not stated on page", not as absent from the product.

---

## 1. Raw repo snapshot (GitHub API + Atom feeds, 2026-10-20)

| Repo | Stars | License (SPDX) | Latest release (date) | Latest default-branch commit | Archived | Note |
|---|---|---|---|---|---|---|
| langfuse/langfuse | 36,051 | NOASSERTION (MIT core + ee/ license) | v4.64.0 (2026-10-19) | 2026-10-19 | No | Copyright now "ClickHouse, Inc." |
| HumanSignal/label-studio | 28,497 | Apache-2.0 | 1.23.2 (2026-09-29); 1.24.0.dev20261020 pre-release | 2026-10-19 | No | |
| HumanSignal/label-studio-sdk | 193 | Apache-2.0 | PyPI 2.1.2 (2026-09-25) | n/a | No | |
| argilla-io/argilla | 5,162 | Apache-2.0 | v2.8.0 (2025-03-11) | develop: 2025-08-05 (README edit) | No | README: no new features; bug fixes only |
| argilla-io/distilabel | 3,425 | Apache-2.0 | 1.5.3 (2025-01-28) | 2025-12-15 | No | Low activity |
| cvat-ai/cvat | 16,960 | MIT | v2.79.0 (2026-10-15) | 2026-10-19 | No | |
| doccano/doccano | 10,803 | MIT | GitHub v1.8.5 (2026-01-11); PyPI 1.8.4 (2023-07-20) | 2026-01-17 | No | Low activity |
| davidjurgens/potato | 436 | GPL-3.0 | v2.11.1 (2026-10-15) | 2026-10-19 | No | Very active, small community |
| comet-ml/opik | 22,755 | Apache-2.0 | PyPI 2.2.105 (2026-10-19) | 2026-10-19 | No | |
| Arize-ai/phoenix | 11,909 | NOASSERTION (Elastic License 2.0) | arize-phoenix v20.23.0 (2026-10-16) | 2026-10-20 | No | PyPI license field: Elastic-2.0 |
| openai/evals | 19,620 | NOASSERTION (LICENSE.md is MIT) | 3.0.1 (2024-05-01) | 2026-04-14 | No | Maintenance only |
| promptfoo/promptfoo | 26,162 | MIT | 0.124.1 (2026-10-08) | 2026-10-19 | No | Acquired by OpenAI (announced 2026-03-09, IND) |
| UKGovernmentBEIS/inspect_ai | 3,044 | MIT | v0.3.282 (2026-10-19) | 2026-10-19 | No | |
| EleutherAI/lm-evaluation-harness | 14,271 | MIT | v0.4.13 (2026-08-31) | 2026-09-14 | No | |
| confident-ai/deepeval | 18,972 | Apache-2.0 | PyPI 4.3.1 (2026-10-16) | 2026-10-19 | No | |
| vibrantlabsai/ragas (was explodinggradients/ragas) | 16,078 | Apache-2.0 | v0.4.3 (2026-01-13) | 2026-02-24 | No | Repo moved orgs; slowing |
| stanford-crfm/helm | 2,952 | Apache-2.0 | v0.5.16 (2026-04-30) | 2026-06-05 | No | |
| treeverse/dvc (was iterative/dvc) | 15,930 | Apache-2.0 | 3.67.1 (2026-03-31) | 2026-08-06 (dependency bump) | No | Repo moved to Treeverse (lakeFS) org |
| treeverse/lakeFS | 5,560 | NOASSERTION (BSL 1.1) | v1.88.0 (2026-10-01) | 2026-10-07 | No | BSL with internal-use-only grant |
| huggingface/datasets | 22,068 | Apache-2.0 | 5.1.0 (2026-10-05) | 2026-10-19 | No | |
| OpenLineage/OpenLineage | 2,715 | Apache-2.0 | 1.54.0 (2026-10-13) | 2026-10-19 | No | |
| MarquezProject/marquez | 2,295 | Apache-2.0 | 0.51.1 (2025-03-27) | 2026-04-12 | No | Low activity |
| SWE-bench/SWE-bench | 6,060 | MIT | v5.0.1 (2026-08-18) | 2026-09-02 | No | |
| sierra-research/tau-bench | 1,467 | MIT | none listed | 2026-03-18 | No | Superseded by tau2-bench |
| sierra-research/tau2-bench | 2,264 | MIT | 2.0.0 "Multilingual and Voice" (2026-10-20) | 2026-10-20 | No | |
| harbor-framework/harbor (was laude-institute/harbor) | 6,275 | Apache-2.0 | v0.24.0 (2026-10-05) | 2026-10-20 | No | |
| harbor-framework/terminal-bench-1 (was laude-institute/terminal-bench) | 2,603 | Apache-2.0 | none listed | 2026-07-11 | No | Renamed "-1"; INF: Harbor is the successor runtime |
| huggingface/lerobot | 28,305 | Apache-2.0 | v0.6.1 (2026-08-03) | 2026-10-19 | No | |
| google-research/rlds | 493 | Apache-2.0 | none | 2024-09-26 | Yes (archived) | Do not adopt as a dependency |
| tensorflow/datasets | 4,603 | Apache-2.0 | v4.9.10 (2026-05-08) | 2026-10-19 (automated) | No | |
| foxglove/mcap | 1,117 | MIT | rust v0.26.0, python ros2 support v0.6.0 (2026-10-19) | 2026-10-19 | No | PyPI mcap 1.6.0 (2026-10-19) |
| rerun-io/rerun | 11,613 | Apache-2.0 (SDK on PyPI: MIT OR Apache-2.0) | 0.39.0 (2026-10-12) | 2026-10-19 | No | |
| mlflow/mlflow | 28,454 | Apache-2.0 | MLflow 3.17.1 (2026-10-13) | 2026-10-20 | No | |
| wandb/weave | 1,142 | Apache-2.0 | v0.53.12 (2026-10-13) | 2026-10-19 | No | |
| HumanSignal/Adala | 1,643 | Apache-2.0 | unknown (not fetched) | pushed 2026-10-03 | No | |
| minio/minio | 61,314 | AGPL-3.0 | n/a | n/a | Yes (archived) | README: "THIS REPOSITORY IS NO LONGER MAINTAINED" |

Package registry checks (PKG, 2026-10-20): langfuse (PyPI) 5.0.2 on 2026-10-16, MIT; @langfuse/client (npm) 6.0.1; label-studio (PyPI) 1.23.2 on 2026-09-29; argilla (PyPI) 2.8.0 on 2025-03-10; potato-annotation 2.11.1 GPL-3.0-or-later; inspect-ai 0.3.282; arize-phoenix 20.23.0 Elastic-2.0; deepeval 4.3.1; lm-eval 0.4.13; crfm-helm 0.5.16; dvc 3.67.1; lerobot 0.6.1; rerun-sdk 0.39.0; @heartexlabs/label-studio (npm, standalone frontend) 1.8.0 last published 2023-06-06. Prodigy is not on public PyPI (commercial installer).

---

## 2. Langfuse verification log

| # | Claim | Result | Source | Type |
|---|---|---|---|---|
| L1 | Core is MIT; `ee/`, `web/src/ee/`, `worker/src/ee/` under separate Enterprise license | Verified in LICENSE text | https://github.com/langfuse/langfuse/blob/main/LICENSE | REPO |
| L2 | Copyright holder is ClickHouse, Inc. | Verified ("Copyright (c) 2023-2026 ClickHouse, Inc.") | same | REPO |
| L3 | ClickHouse acquired Langfuse, announced 2026-01-16; no planned licensing changes | Verified via Langfuse blog and press | https://langfuse.com/blog/joining-clickhouse ; https://www.infoworld.com/article/4118621/clickhouse-buys-langfuse-as-data-platforms-race-to-own-the-ai-feedback-loop.html | OD, IND |
| L4 | ee folders in web: admin-api, audit-log-viewer, billing, multi-tenant-sso, sfdc-sync, sso-settings, ui-customization, verified-domains | Verified via GitHub contents API | https://github.com/langfuse/langfuse/tree/main/web/src/ee/features | REPO |
| L5 | OSS includes "All product capabilities: tracing, evaluations, prompt management, experiments, annotation, the playground" | Verified | https://langfuse.com/docs/open-source | OD |
| L6 | Enterprise-only self-host: project-level RBAC, data retention management, audit logs, organization creators, UI customization, SCIM, Admin API, Instance management API, protected deployment labels, server-side data masking | Verified (pricing-self-host comparison table) | https://langfuse.com/pricing-self-host | OD |
| L7 | Enterprise SSO (Okta, EntraID) and SSO enforcement available in OSS self-host; org-level RBAC available in OSS | Verified per table ("Yes" for both plans) | https://langfuse.com/pricing-self-host | OD |
| L8 | Self-hosted Enterprise is custom priced, billed via AWS Marketplace or invoice, "additive to your ClickHouse commercial plan" | Verified | https://langfuse.com/pricing-self-host | OD |
| L9 | Cloud: Hobby free (50k units, 30 days, 2 users, 1 annotation queue); Core $29/mo (100k units, 90 days, unlimited users, 3 queues); Pro $199/mo (3 years, unlimited queues); Enterprise $2,499/mo; Teams add-on $300/mo; overage $8 per 100k units (100k-1M) graded down to $6 (50M+) | Verified | https://langfuse.com/pricing | OD |
| L10 | Architecture: langfuse web + langfuse worker containers; Postgres (transactional), ClickHouse (traces, observations, scores), Redis/Valkey (cache + queue), S3/blob (raw events, multimodal); optional LLM gateway | Verified | https://langfuse.com/self-hosting | OD |
| L11 | Docker Compose described as "Single VM without high availability, scaling, or backups"; production via Kubernetes (Helm), AWS, Azure, GCP | Verified | https://langfuse.com/self-hosting | OD |
| L12 | Default docker-compose images: langfuse:4, langfuse-worker:4, clickhouse-server:25.12, cgr.dev/chainguard/minio, redis:7, postgres 17 | Verified | https://github.com/langfuse/langfuse/blob/main/docker-compose.yml | REPO |
| L13 | Minimum resource requirements | Not stated on self-hosting overview page; unknown in this pass | https://langfuse.com/self-hosting | OD |
| L14 | Score data types: numeric, categorical, boolean, text; score configs (name, dataType, min/max, categories, description; immutable, archivable); score attaches to exactly one of trace, observation, session, dataset run; source API / EVAL / ANNOTATION | Verified | https://langfuse.com/docs/evaluation/scores/data-model | OD |
| L15 | Annotation queues: bulk add traces/observations/sessions; require score config(s); optional user assignment at creation; "Complete + next"; corrected outputs can be added; API management of queues | Verified | https://langfuse.com/docs/evaluation/evaluation-methods/annotation-queues | OD |
| L16 | Annotation queues: no documented multi-annotator overlap, adjudication, consensus, or human-human IRR; "measure agreement in Score Analytics" refers to human vs LLM judge calibration | Not stated on page (treated as unsupported, INF) | same | OD + INF |
| L17 | RBAC roles: Owner, Admin, Member, Viewer, None; Member can create scores; no role restricted to assigned items only; project-level roles require Enterprise or Pro + Teams add-on; self-host needs EE | Verified | https://langfuse.com/docs/administration/rbac | OD |
| L18 | Datasets: items with input, expected_output, metadata; link to source trace/observation; media items via SDK; JSON Schema validation on input/expectedOutput; every item add/update/delete/archive creates a new dataset version; fetch by timestamp; versioning applies to items, not schemas; experiments via SDK (`run_experiment` / `runExperiment`), UI, or OTel | Verified | https://langfuse.com/docs/evaluation/experiments/datasets | OD |
| L19 | LLM-as-a-judge: templates or custom prompts; numeric/categorical/boolean output; targets observations or experiments; trace-level evaluators deprecated in v4 (Cloud cutoff 2026-11-16); runs in worker; requires LLM Connection | Verified | https://langfuse.com/docs/evaluation/evaluation-methods/llm-as-a-judge | OD |
| L20 | Public API: Basic auth with project public/secret keys; OpenAPI spec published; observations v2, scores v3, experiments, metrics v2, prompts; OTel is the supported ingestion path; legacy ingestion API sunset on Cloud 2026-11-16; SDKs Python, JS/TS, Java; blob storage export | Verified | https://langfuse.com/docs/api-and-data-platform/features/public-api | OD |
| L21 | Expert marketplace, payments/payouts, credential verification, conflict-of-interest checks | No mention anywhere in docs reviewed; product scope is LLM engineering (INF) | docs above | INF |
| L22 | Customer-facing multi-tenant delivery portal | Langfuse has orgs/projects, but org creation control and UI customization are EE; no customer delivery/billing-per-dataset workflow documented (INF) | https://langfuse.com/pricing-self-host | OD + INF |

## 3. Label Studio verification log

| # | Claim | Result | Source | Type |
|---|---|---|---|---|
| S1 | Community is Apache-2.0 | Verified | https://github.com/HumanSignal/label-studio/blob/develop/LICENSE | REPO |
| S2 | Community lacks: task assignment, automatic distribution, reviewer assignment, overlap configuration, agreement metrics, annotator dashboards, RBAC, SSO (SAML/LDAP), workspaces, audit logs, prompts/LLM pre-labeling, advanced cloud storage | Verified (comparison table) | https://labelstud.io/guide/label_studio_compare | OD |
| S3 | Community includes: labeling UI, import/sync data, API/SDK and webhooks, ML backends | Verified | same | OD |
| S4 | Starter Cloud $99/month up to 12 users, $49/month each additional user; Enterprise custom | Verified (page shows both "$99 per month" and "Plans starting at $99/users/mo"; slight ambiguity noted) | https://humansignal.com/pricing/ | OD |
| S5 | GenAI templates: Supervised LLM Fine-Tuning, Human Preferences collection for RLHF, RAG Retrieval, LLM Response Moderation, LLM Response Grading, Side-by-Side LLM Output Comparison, Evaluate RAG with Human Feedback, Multi-Turn Chat Evaluation; Chat and Agent Evaluation interfaces are paid | Verified | https://labelstud.io/templates/gallery_generative_ai | OD |
| S6 | Export: JSON, JSON_MIN, CSV, TSV, COCO, YOLO, Pascal VOC, CoNLL2003, ASR_MANIFEST, brush to NumPy/PNG; spaCy via CoNLL conversion; Community UI export synchronous with ~90s proxy timeout risk; snapshot API for large exports | Verified | https://labelstud.io/guide/export | OD |
| S7 | Frontend embedding: `new LabelStudio(container, {config, interfaces, user, task})`, events `labelStudioLoad`, `submitAnnotation`; standalone LSF "deprecated as a separate library" since 1.11.0; npm @heartexlabs/label-studio last published 1.8.0 on 2023-06-06 | Verified | https://labelstud.io/guide/frontend ; npm registry | OD, PKG |

## 4. Argilla verification log

| # | Claim | Result | Source | Type |
|---|---|---|---|---|
| A1 | Latest release v2.8.0 (2025-03-11); PyPI 2.8.0 uploaded 2025-03-10 | Verified | https://github.com/argilla-io/argilla/releases ; https://pypi.org/project/argilla/ | REPO, PKG |
| A2 | Last default-branch (develop) commit 2025-08-05 (README update) | Verified | https://github.com/argilla-io/argilla/commits/develop | REPO |
| A3 | README banner: "The original authors have moved on to exciting new projects ... we won't be adding new features going forward, we're committed to solve bug fixes and publish patches as needed" and asks for new maintainers | Verified verbatim | https://github.com/argilla-io/argilla/blob/develop/README.md | REPO |
| A4 | Recent `pushed_at` (2026-10-19) is not evidence of activity (branch pushes); no release in 19 months | Verified/INF | GitHub API | REPO, INF |
| A5 | Fields: TextField, ImageField, ChatField, CustomField; Questions: Label, MultiLabel, Ranking, Rating, Span, Text; metadata terms/int/float; VectorField; guidelines | Verified | https://docs.argilla.io/latest/how_to_guides/dataset/ | OD |
| A6 | TaskDistribution(min_submitted) overlap; records pending/completed; no per-user assignment documented; min_submitted only changeable before responses exist | Verified | https://docs.argilla.io/latest/how_to_guides/distribution/ | OD |
| A7 | Docker deployment services: argilla-server, worker, postgres:14, elasticsearch 8.17.0, redis | Verified (compose file) | https://github.com/argilla-io/argilla/blob/develop/examples/deployments/docker/docker-compose.yaml | REPO |
| A8 | HF Hub import/export and HF Spaces deployment | HF Spaces deploy template linked from README (verified); Hub import/export documented in a separate guide not fetched in this pass | README | REPO |

## 5. Other tools: verification notes

- Opik (Comet): Apache-2.0, very active. Annotation queues for SMEs with feedback definitions, multiple reviewers averaged in automation rules; no per-reviewer item assignment documented; OSS availability of queues not stated on page. Source: https://www.comet.com/docs/opik/evaluation/annotation_queues (OD).
- Arize Phoenix: Elastic License 2.0 verified from LICENSE ("You may not provide the software to third parties as a hosted or managed service..."). Annotations on spans/traces via UI, code, or evals. Source: https://github.com/Arize-ai/phoenix/blob/main/LICENSE (REPO), https://arize.com/docs/phoenix/tracing/llm-traces/how-to-annotate-traces (OD).
- Braintrust: closed SaaS. Starter $0 (1 GB, 10k scores, 14-day retention, 1 human review score per project); Pro $249/month (5 GB, 50k scores, 30-day, RBAC); Enterprise custom with on-prem or hosted. Source: https://www.braintrust.dev/pricing (OD).
- Prodigy: Personal $390 lifetime; Company $490 per seat in packs of 5; 12 months upgrades; SSO via OIDC on company license. Source: https://prodi.gy/buy (OD).
- CVAT: MIT; cloud Solo $33/month monthly or $23/month yearly; Team $33 per user monthly or $23 yearly; SSO only on annual plans; Enterprise self-hosted pricing not shown. Source: https://www.cvat.ai/pricing/cloud (OD).
- Potato: GPL-3.0; covers text, audio, video, images, documents, agent traces; ACL 2026 demo paper. Source: https://github.com/davidjurgens/potato (REPO).
- Inspect AI: `human_cli` human agent for human baselining in sandboxed Linux tasks, same scorer as models, terminal sessions recorded. Source: https://inspect.aisi.org.uk/human-agent.html (OD).
- Harbor: "a framework for specifying sandboxed agent tasks for evaluation and optimization", from "the makers of terminal-bench". Source: https://harborframework.com/ (OD).
- promptfoo: OpenAI acquisition announced 2026-03-09; press says OpenAI committed to maintaining open-source tools (not verified from primary source). Sources: https://futurumgroup.com/?p=87434 , https://news.bgov.com/private-equity/openai-buying-ai-security-startup-promptfoo-to-safeguard-agents (IND).
- lakeFS: BSL 1.1, Licensed Work "lakeFS 1.87.0", Additional Use Grant limited to unmodified, internal business use; may not make functionality available to third parties; converts to Apache-2.0 four years after each version's release. Source: https://github.com/treeverse/lakeFS/blob/master/LICENSE (REPO). The date of the license switch from Apache-2.0 is unknown in this pass.
- MinIO: AGPL-3.0, archived, README says no longer maintained. Relevant because Langfuse's default compose uses a MinIO image. Source: https://github.com/minio/minio (REPO).

## 6. Not verified in this pass (marked unknown in report)

- Langfuse minimum CPU/RAM; Langfuse annotation queue per-role permission details.
- Label Studio Enterprise price; Label Studio Community database requirements (not fetched).
- Argilla HF Hub import/export doc page content (not fetched).
- Commercial references (Scale AI, Surge AI, Labelbox, SuperAnnotate, Toloka, Prolific): product scope described from general positioning only, not verified from docs in this pass; no prices claimed.
- OpenAI hosted Evals product, Foxglove commercial pricing, Rerun commercial offering, DeepEval/Confident AI cloud pricing: not fetched.
