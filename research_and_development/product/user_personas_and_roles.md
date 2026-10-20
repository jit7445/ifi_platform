# User Personas and Roles

Prepared by: Product & Operations Agent
Date: 2026-10-20
Scope: Infollion expert-powered AI evaluation and training-data platform (working name "Infollion Evals").

Principles:
- Least privilege, role-based access control (RBAC) scoped by **organization** and **project**.
- Customer data is visible to experts only at the task level, never as bulk export.
- Expert identity is pseudonymous to customers by default (rater IDs), revealed only if the SOW requires it and the expert consents.
- Every privileged action produces an audit event (see workflows.md).

---

## 1. Role summary

| Role | Org side | Scope | Primary surface |
|---|---|---|---|
| Customer Admin | Customer | Customer org | Customer portal |
| Customer ML Engineer | Customer | Assigned projects | Customer portal plus API |
| Customer Viewer (secondary) | Customer | Assigned projects, read-only | Customer portal |
| Expert (Rater / Author) | Infollion network | Assigned tasks only | Expert workbench (web, mobile-responsive) |
| Senior Reviewer | Infollion network or staff | Assigned projects, review queues | Review console |
| Project Manager (PM) | Infollion staff | Assigned projects | Ops console |
| Ops / Finance | Infollion staff | All projects (finance views), payouts, invoices | Finance console |
| Vetting / Expert Ops | Infollion staff | Expert pool | Expert ops console |
| Platform Admin | Infollion staff (small group) | Global config, RBAC, integrations | Admin console |

---

## 2. Personas

### 2.1 Customer Admin: "Priya, Head of AI Platform at a fintech"
- **Goals:** procure trustworthy domain evaluation quickly; control spend; satisfy InfoSec and legal.
- **Pain points:** long vendor onboarding; opaque quality; data leaving approved regions.
- **Jobs:** sign NDA/DPA/SOW; manage users and API keys; approve budgets and project launches; download invoices; set data-retention policy.
- **Permissions:** `org:manage_users`, `org:manage_api_keys`, `project:create`, `project:approve_launch`, `project:view_all`, `billing:view`, `data:set_retention`, `data:export`.
- **Cannot:** see expert real identities (unless SOW plus consent), modify expert pay, access other orgs.

### 2.2 Customer ML Engineer: "Arjun, applied scientist"
- **Goals:** get high-signal labels in a schema his pipeline ingests; iterate on rubrics; integrate via API.
- **Pain points:** inconsistent labels, format drift, slow turnaround, no way to inspect disagreements.
- **Jobs:** upload items (UI or API), co-design rubric, review calibration batch results, inspect disagreements, pull exports, subscribe to webhooks.
- **Permissions:** `project:edit_draft`, `rubric:propose`, `items:upload`, `results:view`, `results:export` (if granted by admin), `webhook:manage`, `feedback:submit`.
- **Cannot:** launch production without admin approval if org policy requires; change pricing.

### 2.3 Expert: "Dr. Meera, consultant cardiologist, existing Infollion expert"
- **Goals:** meaningful, flexible, well-paid work; clear instructions; fast payment; protect professional reputation.
- **Pain points:** ambiguous rubrics, unpaid qualification time, task droughts, rejected work without explanation.
- **Jobs:** accept project invitation, complete qualification and calibration, claim tasks, submit evaluations with rationales, respond to feedback, view earnings, raise COI or content concerns.
- **Permissions:** `task:claim`, `task:submit`, `task:flag`, `profile:edit_self`, `earnings:view_self`, `coi:declare`.
- **Cannot:** view other experts' work (except blind in adjudication if role granted), export data, see customer identity when project is "blind customer".
- **Constraints:** workload cap per day/week; COI blocks; must accept project-level confidentiality addendum.

### 2.4 Senior Reviewer: "Rahul, ex-Big Four tax partner, Tier 3"
- **Goals:** maintain quality; mentor; higher pay band.
- **Jobs:** review sampled submissions, adjudicate disagreements, maintain gold items, write rubric clarifications, score experts.
- **Permissions:** all Expert permissions plus `review:perform`, `adjudication:resolve`, `gold:propose`, `rubric:comment`, `expert:score` (within project).
- **Cannot:** remove experts from network (recommend only), change rubric version without PM approval.

### 2.5 Project Manager: "Neha, Infollion delivery lead"
- **Goals:** hit SLA, quality and margin; keep customer and experts happy.
- **Jobs:** scope with customer, configure project and rubric versions, recruit and invite experts, set overlap/gold/review ratios, monitor dashboards, manage escalations, approve deliveries, track budget burn.
- **Permissions:** `project:configure`, `rubric:publish`, `pool:invite`, `allocation:configure`, `qa:configure`, `delivery:approve`, `escalation:manage`, `expert:pause` (within project), `budget:view`.
- **Cannot:** change payout rates beyond approved band without Finance; access projects not assigned.

### 2.6 Ops / Finance: "Vikram, finance controller"
- **Goals:** accurate payouts and invoices, tax compliance (TDS, GST, foreign remittance), cash-flow.
- **Jobs:** approve payout batches, manage rate cards, issue invoices, reconcile, handle tax documents (PAN, GSTIN, W-8BEN or equivalents), handle disputes.
- **Permissions:** `payout:approve`, `ratecard:manage`, `invoice:issue`, `tax:manage`, `finance:reports`.
- **Cannot:** view task content (finance views show metadata only).

### 2.7 Vetting / Expert Ops: "Sana"
- **Jobs:** import existing Infollion profiles, credential verification, screening tests, tier changes, removal decisions, COI register.
- **Permissions:** `expert:verify`, `expert:tier_change`, `expert:suspend`, `expert:remove` (with second approver), `coi:manage`, `qualification:manage`.

### 2.8 Platform Admin: "Kiran, platform engineering lead"
- **Jobs:** global configuration, RBAC role definitions, SSO, integrations, data residency settings, incident response, break-glass access.
- **Permissions:** `admin:*` with mandatory justification and dual approval for content access (break-glass), all actions logged and alerted.

---

## 3. Permission matrix (abbreviated)

| Capability | Cust Admin | Cust ML Eng | Expert | Sr Reviewer | PM | Ops/Fin | Vetting | Plat Admin |
|---|---|---|---|---|---|---|---|---|
| Create project draft | Y | Y | - | - | Y | - | - | - |
| Approve launch (customer side) | Y | org policy | - | - | - | - | - | - |
| Publish rubric version | approve | propose | - | comment | Y | - | - | - |
| Upload items | Y | Y | - | - | Y | - | - | - |
| Claim / submit tasks | - | - | Y | Y | - | - | - | - |
| Review / adjudicate | - | - | - | Y | Y (override) | - | - | - |
| View results | Y | Y | own only | project | project | metadata | - | break-glass |
| Export data | Y | if granted | - | - | Y (on behalf) | - | - | break-glass |
| Invite experts to project | - | - | - | - | Y | - | Y | - |
| Change expert tier / remove | - | - | - | recommend | recommend | - | Y (dual) | - |
| Approve payouts | - | - | - | - | - | Y | - | - |
| Manage API keys | Y | own | - | - | - | - | - | Y |
| Configure SSO / RBAC | Y (org) | - | - | - | - | - | - | Y |

---

## 4. Persona-driven requirements

1. Customer ML Engineer needs a stable export schema and versioned rubrics: every label carries `rubric_version_id`.
2. Expert needs transparent feedback on every rejection, visible earnings, and paid calibration.
3. Senior Reviewer needs side-by-side disagreement view with rationales and gold answer.
4. PM needs real-time dashboards: throughput, agreement, gold accuracy, budget burn, SLA risk.
5. Finance needs per-expert per-period earning ledgers with tax fields and payout status.
6. Customer Admin needs a data-handling summary per project (region, retention, who accessed).
