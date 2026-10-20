# MVP Scope (Phase 1: Evaluation MVP)

Date: 2026-10-20

## Goal

Run one paid or co-funded expert evaluation pilot end to end on the platform: a customer uploads prompts and model outputs, Infollion experts score them against a versioned rubric with corrections, a share of items is double-rated and adjudicated, and the customer receives a quality report and a JSONL export.

This is human evaluation and evaluation-data creation. It is not model training; Infollion does not train customer models.

## In scope

| Area | Included |
|---|---|
| Accounts | Organizations, users, memberships, roles (customer_admin, customer_member, expert, reviewer, project_manager, platform_admin). Email/password auth, TOTP MFA mandatory for every account (ADR-005; enforcement switchable off only in local development). |
| Projects | Create project with domain, task type, language, difficulty, volume, deadline, deliverable format, overlap percentage, review percentage. Status lifecycle: draft, submitted, in_review, active, paused, completed, cancelled. |
| Rubrics | Versioned rubrics with criteria (scale, binary, categorical), weights, error taxonomy, required explanation and correction flags. Publish makes a version immutable. |
| Ingestion | JSONL/CSV upload of items (prompt, context, one or more model responses with model label). Validation report. Dataset versions with content hashes. |
| Experts | Expert profiles, skills by domain, credentials with verification status, availability (hours per week), conflict declarations (organizations). |
| Matching | Ranked recommendations by domain match, verification, calibration accuracy, availability and conflicts, with a reason string. PM approves experts onto a project. |
| Tasks | Generate evaluation tasks per item; overlap creates multiple assignments; experts pull the next task (lease with expiry). |
| Expert workbench | Single response rubric scoring, pairwise comparison with preference strength and tie / both-bad, error labels, explanation, corrected answer. Client-side and server-side validation against the pinned rubric version. |
| QA | Gold items with expected answers, gold accuracy per expert, overlap agreement (percent agreement and Krippendorff's alpha), automatic flagging of low agreement, reviewer adjudication, return for rework. |
| Reports | Project dashboard: progress, throughput, per-criterion score distribution, model comparison, agreement, gold accuracy, error taxonomy counts. |
| Exports | Evaluation results JSONL, SFT JSONL (prompt + accepted corrected answer), preference pairs JSONL (prompt, chosen, rejected, strength, flags), with manifest. Downloads via short-lived signed URLs. |
| Audit | Append-only audit events for auth, project, rubric publish, assignment, submission, adjudication, export and download. |
| Billing | Usage records per accepted task (no automated invoicing). |

## Out of scope for Phase 1

- Enterprise SSO and SCIM.
- Automated payouts to experts (handled in the existing Infollion payment process; platform exports a payout report).
- Model API connectors and automated regression runs (Phase 3).
- Langfuse, Label Studio, Inspect AI integrations (Phase 3).
- LLM-as-a-judge pre-scoring (Phase 3, opt-in only per ADR-014).
- Image, audio, video annotation (Phase 3).
- Agent trajectories and sandboxed environments (Phase 3).
- Physical AI capture (Phase 5).
- Customer self-serve billing and payments (Phase 4).

## Success criteria

1. A pilot project of at least 500 items completes with at least 20% overlap and 5% gold items.
2. Every delivered label is traceable to item hash, rubric version, submission, expert pseudonym and QA decision.
3. Krippendorff's alpha is computed and shown for each criterion with overlap; items below threshold are adjudicated before export.
4. No cross-tenant access in automated tests (API and RLS level).
5. Customer can download a validated JSONL export and a quality report without staff intervention.
