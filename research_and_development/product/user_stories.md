# User Stories

Date: 2026-10-20
Related: `product_requirements.md` (FR IDs), `acceptance_criteria.md` (Given/When/Then for Phase 1 and 2 stories), `user_personas_and_roles.md` (personas).

Format: "As a <persona>, I want <capability>, so that <outcome>." Each story lists linked FR IDs and its phase (1 to 5, "1c" = Phase 1 conditional on a stated trigger). IDs are grouped in numeric blocks per persona; gaps are intentional.

Personas: Customer Admin (Priya), Customer ML Engineer (Arjun), Expert (Dr. Meera), Senior Reviewer (Rahul), Project Manager (Neha), Ops / Finance (Vikram) together with Vetting / Expert Ops (Sana), Platform Admin (Kiran).

---

## 1. Customer Admin

| ID | Story | FR | Phase |
|---|---|---|---|
| US-001 | As a customer admin, I want to invite colleagues by email with a role, so that only the people I choose can access our projects. | FR-002, FR-003, FR-280 | 1 |
| US-002 | As a customer admin, I want every user in my org to be forced to enrol MFA, so that a stolen password alone cannot expose our model outputs. | FR-005, FR-007 | 1 |
| US-003 | As a customer admin, I want to create, scope, expire and revoke API keys, so that our pipelines can integrate without sharing personal credentials. | FR-008, FR-006 | 1 |
| US-004 | As a customer admin, I want to launch a project only after contracts, an approved rubric and a budget cap are in place, so that work never starts on unclear terms. | FR-024, FR-026, FR-044 | 1 |
| US-005 | As a customer admin, I want to set a budget cap and see burn against it, so that spend never exceeds what I approved. | FR-253, FR-182, FR-025 | 1 |
| US-006 | As a customer admin, I want to set the project's data classification and see the storage region, so that our InfoSec requirements are met. | FR-023, FR-013, NFR-040 | 1 |
| US-007 | As a customer admin, I want to download exports of approved items through short-lived links, so that our data is not left on long-lived public URLs. | FR-215, FR-221, FR-006 | 1 |
| US-008 | As a customer admin, I want to see each rater's verified credential summary under a pseudonym, so that I can trust expertise without exposing personal identities. | FR-015, FR-082 | 1 |
| US-009 | As a customer admin, I want third-party AI processing to be off unless I authorize a named provider, so that our data is never sent to external models without consent. | FR-030 | 1 |
| US-010 | As a customer admin, I want to request deletion of a project's data and receive a deletion certificate, so that I can satisfy our retention obligations. | FR-269 | 1 |
| US-011 | As a customer admin, I want to view my org's audit log and a per-project data-handling summary, so that I can answer internal audit questions about who accessed what. | FR-270, FR-271 | 2 |
| US-012 | As a customer admin, I want to accept or dispute a delivery, so that I only pay for data that meets the agreed quality. | FR-225, FR-164 | 2 |
| US-013 | As a customer admin, I want my users to sign in with our corporate SSO and be provisioned by SCIM, so that joiners and leavers are handled centrally. | FR-010 | 4 |
| US-014 | As a customer admin, I want GST-compliant invoices generated from accepted usage, so that procurement can pay without manual reconciliation. | FR-257, FR-250 | 4 |
| US-015 | As a customer admin, I want to configure retention per project, so that data is deleted on our contractual schedule. | FR-274 | 4 |

## 2. Customer ML Engineer

| ID | Story | FR | Phase |
|---|---|---|---|
| US-020 | As an ML engineer, I want to create a draft project with domain, task type, languages, volume and deliverable format, so that Infollion can scope the work. | FR-020, FR-021, FR-022 | 1 |
| US-021 | As an ML engineer, I want to upload JSONL or CSV, map fields and receive a row-level validation report, so that I can fix bad rows before experts see them. | FR-060, FR-061, FR-062, FR-063, FR-065 | 1 |
| US-022 | As an ML engineer, I want to submit items through the API with an idempotency key, so that retries in my pipeline never create duplicates. | FR-066, FR-008 | 1 |
| US-023 | As an ML engineer, I want to co-design a rubric with criteria, anchors, weights and an error taxonomy, so that experts judge what matters for my model. | FR-040, FR-041, FR-042 | 1 |
| US-024 | As an ML engineer, I want to review calibration results and approve the rubric version, so that production starts only once experts converge. | FR-118, FR-044, FR-180 | 1 |
| US-025 | As an ML engineer, I want a dashboard with per-criterion scores, model comparison and agreement with CIs, so that I can judge which model is better and how much to trust the result. | FR-182, FR-180, FR-186 | 1 |
| US-026 | As an ML engineer, I want preference pairs that include strength, tie, both-bad and absolute acceptability, so that I can filter pairs safely for DPO or reward modeling. | FR-217, FR-131, FR-220 | 1 |
| US-027 | As an ML engineer, I want an SFT JSONL built only from accepted expert corrections, so that I never fine-tune on unreviewed text. | FR-216, FR-119, FR-219 | 1 |
| US-028 | As an ML engineer, I want every export to carry a manifest with item hashes, rubric version, submission IDs, rater pseudonyms and QA status, so that I can trace and filter every label. | FR-218, FR-201, FR-200 | 1 |
| US-029 | As an ML engineer, I want to download a quality report with methodology and metrics, so that I can share evidence of label quality internally. | FR-185 | 1 |
| US-030 | As an ML engineer, I want the platform to block items with personal data when our DPA does not permit it, so that we do not leak user data to experts. | FR-064, FR-222 | 1 |
| US-031 | As an ML engineer, I want signed webhooks for ingestion, freeze, export and delivery events, so that my pipeline reacts without polling. | FR-283 | 2 |
| US-032 | As an ML engineer, I want to curate, freeze and diff dataset versions, so that I can reproduce exactly what I trained or evaluated on. | FR-203, FR-200, FR-204 | 2 |
| US-033 | As an ML engineer, I want Parquet, Hugging Face, TRL and OpenAI formats that load without schema errors, so that data flows straight into my training jobs. | FR-223, FR-224, FR-226 | 2 |
| US-034 | As an ML engineer, I want to inspect individual votes and rationales on disagreed items, so that I can understand genuine ambiguity in my task. | FR-191 | 2 |
| US-035 | As an ML engineer, I want ranking tasks over more than two responses, so that I can collect richer comparisons per prompt. | FR-121, FR-142, FR-181 | 2 |
| US-036 | As an ML engineer, I want a red-team project with a hazard taxonomy and safety failure rates per category, so that I have safety evidence before release. | FR-122, FR-188, FR-091 | 2 |
| US-037 | As an ML engineer, I want to pull finalized results incrementally with a cursor, so that I can monitor progress without waiting for a full delivery. | FR-228 | 2 |
| US-038 | As an ML engineer, I want a private benchmark with reference answers, grading rubrics and two-expert validation, so that I can measure my model on held-out items. | FR-123, FR-224, FR-202 | 2 |
| US-039 | As an ML engineer, I want to register a model endpoint and re-run a frozen benchmark, so that I can compare a new model version with the previous one. | FR-241, FR-192 | 3 |
| US-040 | As an ML engineer, I want a monitoring program with recurring cycles, scorecards and regression alerts, so that production quality is watched continuously. | FR-235 to FR-240, FR-245 | 3 |
| US-041 | As an ML engineer, I want to connect Langfuse so traces flow in and expert scores flow back, so that human judgments sit next to my observability data. | FR-242 | 3 |
| US-042 | As an ML engineer, I want opt-in LLM-judge pre-scoring with judge-human agreement reported, so that I can scale evaluation without false confidence. | FR-244, FR-166, FR-030 | 3 |
| US-043 | As an ML engineer, I want agent trajectories and multimodal items evaluated by experts, so that my agent and vision models get the same rigor as text. | FR-124, FR-125, FR-070, FR-071, FR-143, FR-230 | 3 |

## 3. Expert

| ID | Story | FR | Phase |
|---|---|---|---|
| US-050 | As an expert, I want to enrol MFA and accept the Expert Services Agreement once, so that I can start receiving work securely. | FR-005, FR-084, FR-085 | 1 |
| US-051 | As an expert, I want to maintain my domains, languages, availability and credentials, so that I am matched to work I am qualified for. | FR-080, FR-082 | 1 |
| US-052 | As an expert, I want to declare conflicts of interest, so that I am never assigned work that compromises my professional obligations. | FR-083, FR-102 | 1 |
| US-053 | As an expert, I want to accept a project invitation, read the guidelines and take a paid qualification, so that I know what is expected before production. | FR-101, FR-086, FR-084 | 1 |
| US-054 | As an expert, I want to pull my next task and hold it under a lease, so that I can work without someone else taking the same item. | FR-113, FR-114, FR-111 | 1 |
| US-055 | As an expert, I want a rubric form with error labels, explanation and corrected answer, so that I can record a complete professional judgment. | FR-130, FR-132 | 1 |
| US-056 | As an expert, I want to compare two responses, choose a preference strength, mark ties or both-bad, and rate each response's acceptability, so that my judgment is not forced into a false choice. | FR-131, FR-137 | 1 |
| US-057 | As an expert, I want my work autosaved, so that I do not lose progress on refresh or network loss. | FR-134 | 1 |
| US-058 | As an expert, I want to release a task or flag it as PII, harmful, unclear or outside my expertise, so that I am not forced to judge items I should not. | FR-115 | 1 |
| US-059 | As an expert, I want immediate validation messages when my submission is incomplete, so that I can fix it before it is rejected. | FR-133 | 1 |
| US-060 | As an expert, I want written feedback on every rework or rejection and to see rubric clarifications, so that I can improve and dispute unfair outcomes. | FR-140, FR-155, FR-046 | 1 |
| US-061 | As an expert, I want to see my own gold accuracy, agreement and review pass rate, so that I know where I stand before any probation decision. | FR-183, FR-089 | 1 |
| US-062 | As an expert, I want to see my earnings ledger per task with its QA status, so that I know what I will be paid and why. | FR-251, FR-089 | 1 |
| US-063 | As an expert, I want daily and weekly workload caps enforced, so that fatigue does not hurt my quality or wellbeing. | FR-088 | 1 |
| US-064 | As an expert, I want to rework a returned task with the reviewer's feedback in view, so that I can correct it without starting over. | FR-155, FR-157 | 1 |
| US-065 | As an expert, I want to declare whether I used AI assistance on a submission, so that my contribution record is honest and compliant. | FR-141 | 1 |
| US-066 | As an expert on a harmful-content project, I want content warnings, exposure caps and opt-out without penalty, so that I can protect my wellbeing. | FR-091 | 2 |
| US-067 | As an expert, I want a payout statement with tax details per period, so that I can reconcile payments and file taxes. | FR-255, FR-092 | 2 |
| US-068 | As an expert, I want to author SFT demonstrations and benchmark items in a proper editor, so that I can produce high-quality original content. | FR-123, FR-142 | 2 |
| US-069 | As an expert, I want to progress through tiers based on calibrated performance, so that strong work leads to better-paid assignments. | FR-090 | 2 |

## 4. Senior Reviewer

| ID | Story | FR | Phase |
|---|---|---|---|
| US-070 | As a senior reviewer, I want a review queue filtered by project, reason, risk and age, so that I review the most important work first. | FR-154, FR-160 | 1 |
| US-071 | As a senior reviewer, I want a side-by-side view with verdict buttons and feedback templates, so that I can review quickly and consistently. | FR-155 | 1 |
| US-072 | As a senior reviewer, I want to adjudicate disagreements blind to rater identity with all rationales visible, so that my decision is fair and recorded with a reason. | FR-156, FR-153 | 1 |
| US-073 | As a senior reviewer, I want to propose items as gold, so that the gold set grows from verified consensus. | FR-150 | 1 |
| US-074 | As a senior reviewer, I want to mark rubric ambiguity and draft clarifications, so that recurring confusion is fixed at the source. | FR-046, FR-158 | 1 |
| US-075 | As a senior reviewer, I want to perform the pre-delivery audit sample, so that the first delivery on every project is independently checked. | FR-161 | 1 |
| US-076 | As a senior reviewer, I want to re-adjudicate items disputed by the customer, so that disputes are resolved on the evidence. | FR-164 | 2 |
| US-077 | As a senior reviewer, I want a share of my decisions audited by a peer, so that reviewer drift is caught. | FR-163 | 2 |

## 5. Project Manager

| ID | Story | FR | Phase |
|---|---|---|---|
| US-080 | As a PM, I want to configure overlap, gold, review rates and agreement thresholds, so that quality controls match the package and risk. | FR-022 | 1 |
| US-081 | As a PM, I want to publish a rubric version that then cannot be edited, so that every label is tied to a fixed definition. | FR-042, FR-043, FR-045 | 1 |
| US-082 | As a PM, I want to record NDA, DPA and SOW status for a project, so that launch is blocked until contracts are active. | FR-024 | 1 |
| US-083 | As a PM, I want ranked expert recommendations with reasons and conflicts already excluded, so that I staff projects quickly and defensibly. | FR-100, FR-102 | 1 |
| US-084 | As a PM, I want to approve experts and send invitations in one step, so that onboarding starts immediately. | FR-101, FR-280 | 1 |
| US-085 | As a PM, I want an estimate and a capacity check against the SLA, so that I do not launch work we cannot deliver. | FR-025, FR-103 | 1 |
| US-086 | As a PM, I want to run a calibration batch and see agreement per criterion, so that I can revise the rubric before production. | FR-118, FR-180 | 1 |
| US-087 | As a PM, I want live dashboards for throughput, agreement, gold accuracy, budget and SLA risk, so that I can intervene early. | FR-182, FR-183, FR-184 | 1 |
| US-088 | As a PM, I want to triage expert flags and escalations, so that defective items and rubric ambiguity are handled quickly. | FR-115, FR-158, FR-162, FR-281 | 1 |
| US-089 | As a PM, I want experts below gold thresholds put on probation or removed from the project with history kept, so that quality is protected fairly. | FR-159, FR-087 | 1 |
| US-090 | As a PM, I want to pause, resume or cancel a project, so that I can respond to customer or quality issues. | FR-027 | 1 |
| US-091 | As a PM, I want to generate exports on the customer's behalf, so that I can support customers who prefer not to self-serve. | FR-215 to FR-222 | 1 |
| US-092 | As a PM, I want to build, validate and release a delivery with datasheet and quality certificate, so that every delivery is complete and documented. | FR-225, FR-205, FR-190, FR-227 | 2 |
| US-093 | As a PM, I want a calibration program and expert tiering, so that I can staff harder work with proven experts. | FR-090 | 2 |
| US-094 | As a PM, I want project and rubric templates per package, so that new projects start from proven settings. | FR-031, FR-048 | 2 |
| US-095 | As a PM, I want to be alerted when a monitoring cycle risks breaching SLA and to add backup experts, so that scorecards publish on time. | FR-245, FR-106, FR-237 | 3 |

## 6. Ops / Finance and Expert Ops

| ID | Story | FR | Phase |
|---|---|---|---|
| US-100 | As a finance controller, I want a usage and earnings CSV per period, so that I can invoice and pay through existing Infollion processes. | FR-250, FR-252 | 1 |
| US-101 | As a finance controller, I want earnings to move through pending, approved, rework and void states with reasons, so that payouts are accurate and defensible. | FR-251 | 1 |
| US-102 | As a finance controller, I want finance views that show metadata only, so that I can do my job without seeing customer content. | FR-003 | 1 |
| US-103 | As a finance controller, I want each project's task rate set within a band I approved, so that margin is protected. | FR-254 | 1 |
| US-104 | As an expert ops lead, I want to import existing Infollion expert profiles in bulk, so that the pilot pool is ready on day one. | FR-081 | 1 |
| US-105 | As an expert ops lead, I want to verify credentials and record KYC status, so that customers can trust credential summaries. | FR-082, FR-085 | 1 |
| US-106 | As an expert ops lead, I want network-level suspension and removal to require a second approver, so that no single person can end an expert's work unfairly. | FR-087 | 1 |
| US-107 | As a finance controller, I want a payout report per expert with tax fields, so that TDS, GST and foreign remittance are handled correctly. | FR-255, FR-092 | 2 |
| US-108 | As a finance controller, I want rate cards per package and tier, so that pricing is consistent across projects. | FR-256 | 4 |
| US-109 | As a finance controller, I want automated GST invoicing and payout integration, so that billing scales without manual work. | FR-257, FR-258, FR-260 | 4 |

## 7. Platform Admin

| ID | Story | FR | Phase |
|---|---|---|---|
| US-120 | As a platform admin, I want to create customer organizations with a data region and default classification, so that tenancy and residency are correct from the start. | FR-001, FR-013 | 1 |
| US-121 | As a platform admin, I want a default-deny permission model with decision-table tests, so that new endpoints cannot accidentally expose data. | FR-003, NFR-002 | 1 |
| US-122 | As a platform admin, I want a cross-tenant and cross-assignment test suite that blocks merges, so that isolation regressions never ship. | FR-117, NFR-003, NFR-004 | 1 |
| US-123 | As a platform admin, I want an AI egress gate that blocks all third-party AI calls by default and audits each decision, so that ADR-014 is enforced in code. | FR-030, NFR-009 | 1 |
| US-124 | As a platform admin, I want a hash-chained, append-only audit log including denied decisions, so that tampering is detectable and investigations are possible. | FR-265, FR-266, FR-267, FR-268 | 1 |
| US-125 | As a platform admin, I want deletion to require two-person approval and produce a verified certificate, so that data is removed safely and provably. | FR-269 | 1 |
| US-126 | As a platform admin, I want staff to sign in through the company IdP, so that staff access follows Infollion's joiner and leaver process. | FR-009 | 1c |
| US-127 | As a platform admin, I want operations alerts for metrics lag, SLA risk and job failures, so that problems are caught before customers notice. | FR-282, FR-184 | 1 |
| US-128 | As a platform admin, I want C3 content streamed through an authenticated, watermarking proxy, so that restricted content is never exposed as a raw object URL. | FR-139, FR-135 | 1c |
| US-129 | As a platform admin, I want break-glass access with two-person approval and customer-visible audit, so that emergency access is controlled. | FR-014 | 2 |
| US-130 | As a platform admin, I want a data principal rights intake routed to the controller, so that DPDP obligations are met. | FR-016 | 2 |
| US-131 | As a platform admin, I want legal holds that override deletion, so that litigation obligations are respected. | FR-272 | 2 |
| US-132 | As a platform admin, I want a cross-region replica and regular DR drills, so that RPO 5 minutes and RTO 4 hours are met for enterprise customers. | NFR-033 | 4 |
| US-133 | As a platform admin, I want per-tenant keys with crypto-shredding on offboarding, so that tenant data can be made unreadable on request. | FR-274, NFR-008 | 4 |

---

## Summary

| Persona | Stories | Phase 1 (incl. 1c) | Phase 2 | Phase 3 | Phase 4 |
|---|---|---|---|---|---|
| Customer Admin | 15 | 10 | 2 | 0 | 3 |
| Customer ML Engineer | 24 | 11 | 8 | 5 | 0 |
| Expert | 20 | 16 | 4 | 0 | 0 |
| Senior Reviewer | 8 | 6 | 2 | 0 | 0 |
| Project Manager | 16 | 12 | 3 | 1 | 0 |
| Ops / Finance and Expert Ops | 10 | 7 | 1 | 0 | 2 |
| Platform Admin | 14 | 9 | 3 | 0 | 2 |
| **Total** | **107** | **71** | **23** | **6** | **7** |

No Phase 5 stories are written; Track B stories will be drafted only when the ADR-015 gate is met.
