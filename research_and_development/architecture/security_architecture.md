# Security Architecture

Prepared by: Security & Data Governance Agent
Date: 2026-10-20
Applies to: Infollion expert-powered AI evaluation and training-data platform (Track A now, Track B later).
Builds on: `architecture/database_design.md` (tenancy model, RLS roles, audit table, consent table), `product/user_personas_and_roles.md` (roles and permissions).
Legal and threat context: `research/security_and_compliance.md` (threat IDs T1 to T20, source IDs S1 to S38).

> Controls here are engineering decisions. Where a control exists because of a legal requirement, the source is cited. Legal interpretations flagged "COUNSEL" in the research doc are not settled; the design takes the stricter reading.

---

## 0. Design principles

1. **Customer content is radioactive.** It is visible only to the people assigned to work on it, only for as long as they need it, and every view is attributable.
2. **Defence in depth for tenancy:** API authorisation, then PostgreSQL RLS, then per-tenant KMS keys. Any one layer failing must not leak data.
3. **India-resident by default.** Primary region `ap-south-1`. Logs required by CERT-In stay in India [S8].
4. **No third-party AI on customer data by default.**
5. **Content never goes into logs.** Logs carry identifiers and hashes, not prompts, outputs or PII.
6. **Deletion is designed in:** per-tenant keys allow cryptographic erase.
7. **Provenance is a deliverable:** every delivered item can be traced to signed contributor rights and a rubric version.

---

## 1. Data classification

| Level | Name | Examples | Handling summary |
|---|---|---|---|
| C0 | Public | Marketing site, public docs | No restrictions. |
| C1 | Internal | Internal runbooks, aggregate metrics without customer names | Staff only, SSO. |
| C2 | Confidential (customer default) | Customer prompts, model outputs, rubrics, expert ratings and rationales, datasets | Tenant-isolated, assignment-scoped access, encrypted with tenant key, watermarked expert view, no third-party AI, 5-minute presigned URLs. |
| C3 | Restricted | C2 plus any of: personal data of end users, health data, legal privileged material, financial non-public data, unreleased frontier-model outputs flagged by customer, expert KYC and bank details | Everything in C2 plus: PII redaction before expert view, proxy streaming only (no presigned URL to expert browsers), managed-device or VDI option, single concurrent session, stricter export approval, shorter retention defaults, expert pool restricted by project allow-list and country. |
| C4 | Restricted-Biometric (Track B) | Video, audio, depth of identifiable people; consent records; participant identity | Separate AWS account or at minimum separate buckets and keys; face blurring before expert review where possible; jurisdiction gating; no export without signed consent manifest; never processed by third-party AI. |

Rules:
- Classification is set per **project** at creation (default C2) and can be raised per dataset or item (e.g. PII detector hits raise item to C3). It can never be lowered below the project level by experts.
- The classification is stored on `projects.data_classification` and `dataset_items.classification`, propagated into audit events and into S3 object tags (`classification=C3`).

---

## 2. Identity and authentication

### 2.1 Population and methods

| Population | MVP | Later |
|---|---|---|
| Infollion staff (PM, ops, admins) | SSO via company IdP (OIDC), phishing-resistant MFA (passkeys/FIDO2 security keys) enforced at IdP; no local passwords. | Device posture check (MDM) via IdP conditional access. |
| Experts | Email + password (Argon2id) **plus mandatory second factor**: passkey (WebAuthn) preferred, TOTP allowed; SMS OTP only as recovery with friction. Identity verification (KYC) at onboarding; liveness selfie re-check on new device and periodically. | Passkey-only for C3 projects; optional managed-device certificate. |
| Customer users | Email + password + mandatory TOTP or passkey. | SAML 2.0 / OIDC SSO per customer org, SCIM provisioning, enforced IdP MFA, domain capture. |
| Customer machines | Org-scoped API keys: random 256-bit, shown once, stored as SHA-256 hash with prefix for lookup, scopes (`items:upload`, `results:read`, `exports:create`), expiry (default 90 days, max 365), IP allow-list optional. | OAuth 2.0 client credentials with short-lived JWTs; mTLS option. |
| Services | IAM roles for tasks (no static AWS keys); DB credentials from Secrets Manager or IAM DB auth. | Workload identity across accounts. |

### 2.2 Sessions

| Control | Value (default) |
|---|---|
| Session token | Opaque, server-side session (or short JWT 10 min + rotating refresh token), `HttpOnly`, `Secure`, `SameSite=Lax` (Strict for admin console), `__Host-` prefix. |
| Idle timeout | Experts and customers: 30 min (C2), 15 min (C3). Staff admin console: 15 min. |
| Absolute lifetime | 12 h (experts, customers); 8 h staff. |
| Concurrent sessions | Experts on C3 projects: 1. Others: max 3, listed and revocable in UI. |
| Step-up auth | Re-authenticate with second factor (within last 5 min) for: export creation, API key creation, role changes, payout detail changes, viewing expert real identity, disabling MFA. |
| New device | Email notice; for experts, liveness re-check before first C3 task on that device. |
| Revocation | Immediate global session revocation on password reset, MFA reset, offboarding, suspected compromise. |
| Brute-force | Per-account and per-IP throttling, credential-stuffing detection (breached password check via k-anonymity range API or local list), CAPTCHA after threshold. |

---

## 3. Authorisation model: RBAC plus assignment-scoped ABAC

### 3.1 Layers

1. **RBAC (coarse):** roles from `user_personas_and_roles.md` grant permission strings (e.g. `task:claim`, `results:export`). Roles are bound at org scope or project scope.
2. **ABAC (fine):** every request for customer content is evaluated against attributes:
   - subject: `user_id`, `actor_kind` (expert | customer | staff | system), roles, `expert_tier`, `country`, `device_trust`, `mfa_age`, `nda_versions_signed`, `coi_declarations`.
   - resource: `org_id`, `project_id`, `task_id`, `classification`, `expert_country_allow_list`, `blind_customer`.
   - relationship: live `task_assignment` (status in `accepted`, `in_progress`, or `submitted` within edit window), `project_staff` membership, customer project membership.
   - environment: time, IP reputation, session age.
3. **Database enforcement:** RLS policies (section 4) re-check tenant and assignment so an API bug cannot widen access.
4. **Key enforcement:** objects are encrypted with tenant keys; only the content service role can decrypt, and only under the tenant's encryption context.

### 3.2 Core decision rules (pseudo-policy)

```text
allow read(task_content) if
    subject.actor_kind == "expert"
    and exists live assignment(subject.expert_id, task.id)
    and project.status == "active"
    and subject.nda_versions_signed contains project.required_nda_version
    and not subject.coi_blocks(project)
    and (project.expert_country_allow_list is empty or subject.country in it)
    and (task.classification < C3 or (subject.mfa_method in ["passkey","totp"] and subject.device_trust >= project.min_device_trust))

allow read(task_content) if
    subject.actor_kind == "staff"
    and subject is in project_staff(project.id) with role in ["pm","reviewer"]

allow read(task_content) if
    subject.actor_kind == "customer"
    and subject.org_id == task.org_id
    and (subject has "project:view_all" or subject in project_members(project.id))

deny everything else (default deny)
```

Implementation: a single Python policy module (`authz.py`) called from FastAPI dependencies, unit-tested with a decision table; no per-endpoint ad hoc checks. Later candidates: OPA or Cedar if policies grow, but not needed for MVP.

### 3.3 Object identifiers

- UUIDv7 IDs are not secrets. Every lookup still authorises (OWASP API1 BOLA [S32]).
- API responses use allow-listed serializers per role to avoid excessive property exposure (API3).

---

## 4. Tenant isolation in PostgreSQL (RLS)

Baseline already defined in `database_design.md` section 6: `app_rw` is `NOBYPASSRLS`, every tenant table has `ENABLE` and `FORCE ROW LEVEL SECURITY`, request context via `SET LOCAL`. PostgreSQL applies RLS to table owners only with `FORCE` and never to `BYPASSRLS` roles [S26]. Additions below close the "expert can see the whole tenant once `app.org_id` is set" gap.

### 4.1 Context helpers (additions)

```sql
CREATE FUNCTION app.current_actor_kind() RETURNS text
  LANGUAGE sql STABLE PARALLEL SAFE AS
$$ SELECT nullif(current_setting('app.actor_kind', true), '') $$;

CREATE FUNCTION app.current_project_ids() RETURNS uuid[]
  LANGUAGE sql STABLE PARALLEL SAFE AS
$$ SELECT coalesce(nullif(current_setting('app.project_ids', true), '')::uuid[], '{}') $$;
```

Request wrapper (every transaction):

```sql
SET LOCAL app.org_id      = '<tenant org uuid>';
SET LOCAL app.user_id     = '<user uuid>';
SET LOCAL app.actor_kind  = 'expert';            -- expert | customer | staff | system
SET LOCAL app.expert_id   = '<expert uuid or empty>';
SET LOCAL app.project_ids = '{<uuid>,<uuid>}';    -- staffed or member projects; empty for org admins
```

### 4.2 Tenant policy (unchanged, permissive)

```sql
ALTER TABLE app.evaluation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.evaluation_tasks FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON app.evaluation_tasks
  USING (org_id = app.current_org_id())
  WITH CHECK (org_id = app.current_org_id());
```

### 4.3 Assignment-scoped restriction for experts (new, RESTRICTIVE)

Restrictive policies are AND-ed with permissive ones [S26], so these narrow the tenant policy.

```sql
-- Unknown actor kinds are denied: a missing SET LOCAL fails closed.
CREATE POLICY actor_kind_required ON app.evaluation_tasks AS RESTRICTIVE
  USING (app.current_actor_kind() IN ('expert','customer','staff','system'));

CREATE POLICY expert_assigned_tasks ON app.evaluation_tasks AS RESTRICTIVE
  USING (
    app.current_actor_kind() <> 'expert'
    OR EXISTS (
      SELECT 1 FROM app.task_assignments a
      WHERE a.org_id   = evaluation_tasks.org_id
        AND a.task_id  = evaluation_tasks.id
        AND a.expert_id = app.current_expert_id()
        AND a.status IN ('accepted','in_progress','submitted')
    )
  );

-- Model outputs are reachable by experts only through a task they hold.
CREATE POLICY expert_assigned_outputs ON app.model_outputs AS RESTRICTIVE
  USING (
    app.current_actor_kind() <> 'expert'
    OR EXISTS (
      SELECT 1
      FROM app.evaluation_task_outputs eto
      JOIN app.task_assignments a
        ON a.org_id = eto.org_id AND a.task_id = eto.task_id
      WHERE eto.org_id = model_outputs.org_id
        AND eto.model_output_id = model_outputs.id
        AND a.expert_id = app.current_expert_id()
        AND a.status IN ('accepted','in_progress','submitted')
    )
  );

-- Experts write and read only their own submissions.
CREATE POLICY expert_own_submissions ON app.evaluation_submissions AS RESTRICTIVE
  USING (
    app.current_actor_kind() <> 'expert'
    OR EXISTS (
      SELECT 1 FROM app.task_assignments a
      WHERE a.org_id = evaluation_submissions.org_id
        AND a.id = evaluation_submissions.assignment_id
        AND a.expert_id = app.current_expert_id()
    )
  )
  WITH CHECK (
    app.current_actor_kind() <> 'expert'
    OR EXISTS (
      SELECT 1 FROM app.task_assignments a
      WHERE a.org_id = evaluation_submissions.org_id
        AND a.id = evaluation_submissions.assignment_id
        AND a.expert_id = app.current_expert_id()
        AND a.status IN ('accepted','in_progress')
    )
  );
```

The same `expert_assigned_*` pattern is generated by the migration helper for `dataset_items`, `stored_objects` (content objects), and any table holding task content. Tables experts never need (exports, usage, billing, api_keys) get:

```sql
CREATE POLICY no_experts ON app.exports AS RESTRICTIVE
  USING (app.current_actor_kind() <> 'expert');
```

### 4.4 Project scoping for staff and non-admin customer users (RESTRICTIVE)

```sql
CREATE POLICY project_scope ON app.evaluation_tasks AS RESTRICTIVE
  USING (
    app.current_actor_kind() IN ('expert','system')
    OR cardinality(app.current_project_ids()) = 0      -- org admin: whole tenant
    OR project_id = ANY (app.current_project_ids())
  );
```

The API only leaves `app.project_ids` empty for subjects holding `project:view_all` in that org; this is unit-tested.

### 4.5 Guard rails

- CI test fails if any `app.*` table with an `org_id` column lacks `relrowsecurity` and `relforcerowsecurity`, or lacks `actor_kind_required` (extends the existing check in database_design.md).
- Cross-tenant integration test suite: two seeded tenants, every API endpoint called as each role with the other tenant's IDs; expected 404.
- `app_platform` (BYPASSRLS) only from operator endpoints; every use emits `platform.bypass_rls_used`.
- Read replicas used by BI connect as a role with RLS enforced and only aggregate views exposed.
- Index support: `task_assignments (task_id, expert_id)` partial unique index already exists, so policy subqueries are index lookups.

---

## 5. Encryption

| Layer | Control |
|---|---|
| In transit, public | TLS 1.2+ only (prefer 1.3), HSTS with preload, modern cipher suites at ALB/CloudFront; HTTP redirected; certificates via ACM. |
| In transit, internal | TLS to RDS (`rds.force_ssl=1`), to Redis/queues, between services where supported; S3 bucket policy denies `aws:SecureTransport = false`. |
| At rest, database | RDS PostgreSQL storage encryption with a platform KMS key; automated backups and snapshots encrypted; snapshot sharing disabled. |
| At rest, objects | SSE-KMS with **per-tenant customer managed keys** (section 6.2); S3 Bucket Keys enabled to reduce KMS request cost. |
| Field level | Expert bank details, government ID numbers, API key secrets, webhook secrets: application-level envelope encryption (KMS data key, AES-256-GCM) or one-way hash where only comparison is needed. |
| Backups | AWS Backup vault in India region with vault lock; cross-region copy only to another India region. |
| Keys | KMS automatic annual rotation on; key policies separate administrators from users; deletion requires 30-day waiting period and two-person approval. |

DPDP Rule 6(1)(a) names encryption, obfuscation, masking and tokenisation as baseline measures [S2].

---

## 6. Storage layout, keys and presigned URLs

### 6.1 Buckets (per environment, region ap-south-1)

| Bucket | Purpose | Notes |
|---|---|---|
| `inf-{env}-ingest-quarantine` | Raw uploads before scanning | No read access for experts; 30-day lifecycle expiry. |
| `inf-{env}-content` | Clean customer content (items, model outputs, attachments) | Per-tenant prefixes and keys; versioning on; Block Public Access on. |
| `inf-{env}-derived` | Redacted copies, renders, thumbnails, watermarked renditions | Same tenant prefixes and keys. |
| `inf-{env}-exports` | Delivery artifacts | 30-day lifecycle; per-tenant keys. |
| `inf-{env}-capture` (Track B, later) | Raw video and sensor data | Separate AWS account preferred; C4 keys; Object Lock off (must support deletion on withdrawal). |
| `inf-{env}-audit-archive` | Audit exports, hash-chain anchors, CERT-In log archive | Object Lock **compliance mode**; no user including root can delete before retention ends [S28]. |
| `inf-{env}-logs` | ALB, CloudFront, VPC flow, CloudTrail | In India; lifecycle to Glacier after 30 days; retained at least 1 year (section 9). |

### 6.2 Key layout

```text
s3://inf-prod-content/tenants/{org_id}/projects/{project_id}/datasets/{dataset_id}/items/{item_id}/{sha256}.{ext}
s3://inf-prod-content/tenants/{org_id}/projects/{project_id}/outputs/{model_run_id}/{output_id}.json
s3://inf-prod-derived/tenants/{org_id}/projects/{project_id}/redacted/{item_id}/{redaction_version}.json
s3://inf-prod-exports/tenants/{org_id}/exports/{export_id}/{filename}
s3://inf-prod-capture/tenants/{org_id}/sessions/{capture_session_id}/{stream}/{chunk}.mp4
```

Rules: no customer names, file names or PII in keys (keys appear in logs); original filenames live only in the encrypted DB column.

KMS:
- One customer managed key per tenant per environment: alias `alias/inf/{env}/tenant/{org_id}`. Track B gets a separate key per tenant: `alias/inf/{env}/tenant/{org_id}/capture`.
- Key policy grants `kms:Decrypt` and `kms:GenerateDataKey` only to the content-service role, conditioned on the S3 encryption context, so a key can only decrypt that tenant's prefix:

```json
{
  "Sid": "TenantPrefixOnly",
  "Effect": "Allow",
  "Principal": {"AWS": "arn:aws:iam::<acct>:role/inf-prod-content-svc"},
  "Action": ["kms:Decrypt", "kms:GenerateDataKey"],
  "Resource": "*",
  "Condition": {
    "StringLike": {
      "kms:EncryptionContext:aws:s3:arn": [
        "arn:aws:s3:::inf-prod-content/tenants/<org_id>/*",
        "arn:aws:s3:::inf-prod-derived/tenants/<org_id>/*",
        "arn:aws:s3:::inf-prod-exports/tenants/<org_id>/*"
      ]
    }
  }
}
```

  With S3 Bucket Keys enabled the encryption context is the bucket ARN rather than the object ARN, so the per-prefix condition above cannot be used together with Bucket Keys. Decision: **use the per-prefix condition and disable Bucket Keys on `content`** for C3 tenants (accept higher KMS request cost), and allow Bucket Keys plus IAM prefix conditions for C2 tenants. Verify this behaviour in the AWS docs during implementation.
- Bucket policy denies `PutObject` unless `s3:x-amz-server-side-encryption = aws:kms`; the upload service chooses the tenant key from the authenticated org, never from client input.
- Enterprise option (later): customer-provided key in the customer's AWS account via cross-account key policy (customer can revoke, which makes data unreadable: "kill switch").
- Offboarding: schedule key deletion after the deletion workflow (section 10) for cryptographic erase of any residual copies (backups, versions) per NIST SP 800-88r2 cryptographic erase [S34].

### 6.3 Presigned URL policy

AWS facts: SigV4 presigned URLs can be valid up to 7 days with long-term keys, but if signed with temporary role credentials they expire when those credentials expire [S27]. Infollion signs only with a dedicated short-session role and applies its own much shorter TTLs.

| Use | Who gets it | Method | TTL | Scope and conditions |
|---|---|---|---|---|
| Customer upload | Customer user or API key with `items:upload` | `PUT` (or POST policy) to quarantine bucket | 15 min | Single key generated server-side (`tenants/{org}/uploads/{uuid}`); `Content-Type` and max size enforced in POST policy; SSE-KMS headers bound in signature. |
| Expert view, C2 | Assigned expert | `GET` from `derived` (watermarked rendition) | 5 min | Single object; `response-content-disposition=inline`; issued only after ABAC check; one URL per view; audit `content.url_issued`. |
| Expert view, C3 and C4 | Assigned expert | **No presigned URL.** Streamed through `content-proxy` service | n/a | Server-side watermark burned into rendition; no direct S3 access from the browser; range requests limited. |
| Staff review | PM/reviewer on project | `GET` | 5 min | Same as expert. |
| Customer results view | Customer user | `GET` | 10 min | Within own tenant only. |
| Export download | Customer user with `results:export` after step-up MFA | `GET` from exports | 15 min, max 3 issuances per export | `content-disposition=attachment`; download events audited; export file expires in 30 days. |
| Webhook payloads | Customer endpoint | Not URLs: HMAC-signed payload with IDs only | n/a | Customer fetches content via authenticated API. |

Additional rules: presigned URLs are never logged in full (strip `X-Amz-Signature` in logs); never embedded in emails; `Referrer-Policy: no-referrer` on pages that use them; CloudFront in front of `derived` is optional later with signed cookies scoped to a single path.

---

## 7. Expert workspace controls

Honest framing for customers: these controls **deter, slow down and attribute** leaks. They do not make screen capture impossible on an unmanaged personal device (residual risk in the research doc section 5.3).

| Control | Mechanism | Tier | Effect |
|---|---|---|---|
| Assignment-only visibility | ABAC + RLS (sections 3, 4) | All | Limits blast radius per expert to assigned tasks. |
| Task leasing | Lease of N minutes; content unavailable once lease expires or task is submitted (except edit window) | All | Prevents hoarding of open tasks. |
| Rate limiting of content views | Per expert: max tasks opened per hour and per day (project-configurable); spike alerts | All | Blocks scraping. |
| Visible watermark | Semi-transparent tiled overlay: expert pseudonym ID, session short-ID, UTC timestamp; rendered in a canvas layer, and for C3 burned server-side into images/PDF renders | All (burned-in for C3) | Attribution of photos and screenshots. |
| Invisible watermark | Per-session zero-width character or whitespace pattern in rendered text, per-session subtle pixel pattern in images; mapping stored server-side | C2 optional, C3 on | Attribution of copied text when visible marks are cropped. Can be stripped by a careful attacker. |
| Copy friction | Disable context menu, text selection and `copy`/`cut` events on content panes; block drag; intercept `beforeprint` and print CSS that hides content; large paste-out not possible from content panes | C2 configurable, C3 on | Stops casual copy. Trivially bypassed with dev tools or OCR. |
| Clipboard telemetry | Log (count and length only, not content) of copy attempts in the workbench | All | Signal for anomaly scoring. |
| Focus and visibility | Blur content when window loses focus or tab hidden (configurable); pause lease timers | C3 | Reduces screen-share leakage. |
| Content Security Policy | `default-src 'self'`; no third-party scripts in workbench; `frame-ancestors 'none'`; Trusted Types | All | Blocks extension-injected exfil scripts partially and XSS. |
| No downloads | Attachments rendered as images or view-only PDF renditions; originals not downloadable by experts | All | Removes bulk file exfil path. |
| Device trust | Device registration, max 2 devices per expert; new device requires liveness re-check for C3 | C3 | Reduces account sharing. |
| Managed-device tier | Customer-mandated: only Infollion-managed laptops (MDM, disk encryption, no USB mass storage, browser extension allow-list) | Optional premium | Stronger endpoint controls. |
| VDI tier | Workbench delivered via a virtual desktop (e.g. AWS WorkSpaces Secure Browser or similar) in India region; clipboard and file transfer disabled | Optional premium (frontier labs) | Content never reaches endpoint storage. Screen photography still possible. |
| Geo and network rules | Project country allow-list; block known anonymising proxies for C3; impossible-travel detection | Configurable | Satisfies customer location restrictions. |
| Behavioural anomaly scoring | Signals: views per hour, time-on-task vs content length, copy attempts, devtools open heuristics, multiple accounts on one device fingerprint, IP sharing | All | Triggers review, suspension. |
| Contract and training | NDA, project addendum click-through per project, annual confidentiality training, explicit notice of monitoring and watermarking | All | Legal deterrence; supports consent basis. |

---

## 8. Audit logging

Table: `audit.audit_events` in database_design.md (append-only via trigger, partitioned monthly, hash-chained, anchored daily to Object Lock bucket). This section fixes the event schema and catalogue.

### 8.1 Event schema (canonical JSON, also mapped to table columns)

```json
{
  "schema_version": 1,
  "id": 123456789,
  "event_uuid": "0192f0c4-...",
  "occurred_at": "2026-10-20T09:15:02.123Z",
  "org_id": "uuid or null",
  "project_id": "uuid or null",
  "actor": {
    "type": "user | api_key | system | support_impersonation",
    "id": "uuid",
    "kind": "expert | customer | staff | system",
    "roles": ["expert"],
    "impersonator_id": "uuid or null"
  },
  "action": "task.content_viewed",
  "outcome": "success | denied | error",
  "reason": "policy rule id or error code",
  "target": {"type": "evaluation_task", "id": "uuid"},
  "context": {
    "assignment_id": "uuid or null",
    "classification": "C2",
    "session_id": "short id",
    "device_id": "uuid",
    "request_id": "trace id",
    "ip": "203.0.113.5",
    "country": "IN",
    "user_agent_hash": "sha256"
  },
  "changes": {"field": {"from": "x", "to": "y"}},
  "prev_hash": "base64",
  "hash": "base64"
}
```

Rules:
- `changes` never contains content bodies, secrets, or full PII; sensitive fields are recorded as `"[redacted]"` with a hash if comparison is needed.
- Denied authorisation decisions are logged (`outcome = denied`) because they are the main signal for BOLA probing.
- Time source: Amazon Time Sync Service on all hosts; confirm with counsel that it satisfies the CERT-In NIC/NPL-traceability requirement, otherwise point chrony at NPL/NIC servers [S8].

### 8.2 Event catalogue (MVP)

| Domain | Actions |
|---|---|
| Authentication | `auth.login_succeeded`, `auth.login_failed`, `auth.mfa_enrolled`, `auth.mfa_reset`, `auth.step_up_succeeded`, `auth.session_revoked`, `auth.password_reset`, `auth.new_device`, `auth.liveness_checked` |
| Identity and roles | `user.invited`, `user.role_granted`, `user.role_revoked`, `user.deactivated`, `api_key.created`, `api_key.revoked`, `sso.config_changed` |
| Experts | `expert.kyc_submitted`, `expert.kyc_approved`, `expert.agreement_signed`, `expert.nda_signed`, `expert.coi_declared`, `expert.suspended`, `expert.identity_revealed` |
| Projects | `project.created`, `project.classification_changed`, `project.launch_approved`, `project.staff_added`, `project.staff_removed`, `project.settings_changed` (incl. watermark, third-party AI authorisation, country allow-list) |
| Data ingest | `upload.url_issued`, `upload.received`, `upload.scan_failed`, `pii.scan_completed`, `pii.redaction_applied`, `pii.override_approved` |
| Tasks and content | `assignment.offered`, `assignment.accepted`, `assignment.released`, `assignment.revoked`, `task.content_viewed`, `content.url_issued`, `content.proxy_streamed`, `task.copy_attempted` (count only), `submission.created`, `submission.revised` |
| Exports | `export.requested`, `export.approved`, `export.generated`, `export.download_url_issued`, `export.downloaded`, `export.expired` |
| Third-party AI | `ai_gateway.request_allowed`, `ai_gateway.request_blocked`, `ai_provider.authorisation_granted`, `ai_provider.authorisation_revoked` |
| Data lifecycle | `retention.policy_changed`, `deletion.requested`, `deletion.approved`, `deletion.executed`, `deletion.certificate_issued`, `key.deletion_scheduled`, `legal_hold.applied`, `legal_hold.released` |
| Privacy rights | `dsr.received`, `dsr.verified`, `dsr.fulfilled`, `consent.granted`, `consent.withdrawn`, `grievance.received`, `grievance.resolved` |
| Platform operations | `platform.bypass_rls_used`, `support.impersonation_started`, `support.impersonation_ended`, `config.secret_rotated`, `security.alert_raised`, `incident.declared`, `incident.notified` |
| Track B (later) | `capture.session_created`, `capture.consent_verified`, `capture.uploaded`, `capture.blur_applied`, `capture.withdrawal_processed` |

### 8.3 Tamper evidence and retention

- Append-only: trigger blocks UPDATE/DELETE; `app_rw` lacks UPDATE/DELETE/TRUNCATE on `audit.*` (already in database_design.md).
- Hash chain: single writer computes `hash = sha256(prev_hash || canonical_json(event))`. Nightly job verifies the chain and writes the day's head hash plus a signed manifest to `inf-{env}-audit-archive` with Object Lock compliance mode.
- Daily export of the previous day's partition (JSONL, compressed, encrypted) to the archive bucket.
- Retention: 13 months hot in Postgres, 7 years in archive (configurable per contract; legal retention floors in section 9).
- Customer access: org admins can query their own tenant's audit events in the portal and via API (SOC 2 and customer audit asks).

### 8.4 Infrastructure and security logs

CloudTrail (all regions, organisation trail, log file validation on), VPC Flow Logs, ALB/WAF logs, RDS logs (connections, DDL, errors; `pgaudit` for `app_platform` and admin roles), container stdout via a structured logger with a content-redaction filter. All stored in India region buckets for at least 1 year (covers CERT-In 180 days and DPDP Rule 6(1)(e) one year) [S2, S8].

---

## 9. Retention schedule (defaults)

Configurable per customer contract within the legal floors. Legal floors win over contract shorter terms only for **logs**; for customer content Infollion follows the customer's instruction, and counsel must confirm how DPDP Rule 8(3) applies to content held as processor (research doc P1).

| Data | Default retention | Floor / driver | Deletion method |
|---|---|---|---|
| Quarantined uploads | 30 days | Ops | S3 lifecycle |
| Customer content (items, outputs, attachments) | Project end + 90 days, then delete unless customer extends | Contract (DPA return/delete) | Deletion workflow + key deletion at tenant offboarding |
| Redacted and derived renditions | Same as source | Contract | Deleted with source |
| Expert submissions and rationales (customer deliverable) | Same as customer content | Contract | Same |
| Exports | 30 days after generation | Ops | S3 lifecycle |
| Drafts not submitted | 90 days | Ops (database_design.md) | Job |
| Gold and calibration items | Project lifetime | Contract | With project |
| Expert profile and KYC | Duration of engagement + 3 years for disputes and tax, unless law requires longer (tax record rules: COUNSEL) | DPDP s.8(7) (erase when purpose served unless law requires) | Erase; keep minimal record of payments for statutory period |
| Expert payout records | 8 years (Indian tax/accounting practice; COUNSEL to confirm) | Tax law | Archive then delete |
| Customer account data | Contract + 1 year | Contract, DPDP Rule 8(3) min 1 year logs | Delete |
| Audit events | 13 months hot, 7 years archive | DPDP Rule 6(1)(e) and 8(3) (1 year min), CERT-In 180 days, SOC 2 evidence | Partition drop after archive; archive expires via Object Lock retention |
| Infra and access logs | 1 year minimum (13 months), India-resident | CERT-In 180 days rolling [S8]; DPDP Rule 6(1)(e) one year [S2] | Lifecycle |
| Consent records (experts, Track B participants) | Life of data use + 7 years | Proof of consent (DPDP s.6(10) burden of proof); Consent Manager analogue is 7 years [S2 First Schedule Part B item 4(c)] | Archive |
| Track B raw capture | Until delivery + 90 days, or as contract; withdrawal processed within 30 days | Consent terms, BIPA retention policy (if ever applicable) | Delete objects and key material for withdrawn participant |
| Backups | 35 days (RDS PITR), AWS Backup monthly snapshots 12 months | Ops | Vault lock expiry; crypto-shred at offboarding |
| Incident records | 7 years | Legal defence | Archive |

---

## 10. Deletion workflow

Triggers: contract end, customer deletion request, dataset deletion, DPDP or GDPR erasure request relayed by the controller, expert offboarding, Track B consent withdrawal.

```text
1. Request      Customer admin (step-up MFA) or Infollion DPO creates deletion request:
                scope = tenant | project | dataset | item | data principal
                audit: deletion.requested
2. Hold check   System checks legal holds and statutory floors (logs, consent records).
                If held: record reason, notify requester, stop.
3. Approval     Two-person rule for tenant/project scope (customer admin + Infollion PM or DPO).
                audit: deletion.approved
4. Freeze       Revoke all live assignments, presigned URLs (short TTL makes this near-instant),
                export links; mark scope read-only.
5. Execute      a. DB: delete rows by (org_id, project_id ...) in FK order, inside a job using app_platform
                   with audit; tombstone row keeps ids and counts only.
                b. S3: delete all object versions under the tenant/project prefix (versioned buckets).
                c. Derived stores: search indexes, caches, analytics replicas, vector stores (if any).
                d. Third parties: issue deletion instructions to any authorised sub-processor; collect confirmations.
                e. Experts: reminder of contractual duty to destroy any notes (no local copies should exist).
6. Backups      Data in backups expires with backup retention (max 12 months); for tenant offboarding,
                schedule KMS key deletion (30-day wait) to crypto-shred residual copies.
7. Verify       Automated verification query and S3 inventory check return zero objects for the scope.
8. Certificate  Generate deletion certificate (scope, timestamps, verification hashes, residual items
                retained under law with reason and expiry). audit: deletion.certificate_issued
9. SLA          Customer content: within 30 days of approval. Data principal requests relayed by a
                customer: within the customer's deadline (contract), never later than 30 days.
                DPDP grievance response: within 90 days [S2 Rule 14(3)].
```

---

## 11. PII detection and redaction pipeline

Tooling: Microsoft Presidio (now under Data Privacy Stack), self-hosted in the VPC: Analyzer (NER, regex, rules, checksum, context words), Anonymizer (replace, mask, hash, encrypt), Image Redactor (OCR) [S30]. Presidio's own docs warn there is no guarantee it finds all sensitive information, so it is a risk-reduction layer, not a guarantee.

```text
upload -> quarantine bucket
  -> malware scan (ClamAV or managed equivalent), file-type sniffing, size and archive-depth limits
  -> parse to canonical JSON (text segments, image refs)
  -> Presidio Analyzer (self-hosted, no internet egress)
       recognizers: built-in (PERSON, EMAIL_ADDRESS, PHONE_NUMBER, CREDIT_CARD, IBAN_CODE, IP_ADDRESS,
       LOCATION, DATE_TIME, US_SSN, MEDICAL_LICENSE, ...) plus India recognizers (PAN, Aadhaar with
       Verhoeff checksum, UPI ID, IFSC, Indian mobile, vehicle registration, passport, voter ID;
       verify which are built-in in the pinned Presidio release and add custom ones for the rest),
       plus customer-supplied deny-lists (internal codenames, customer names)
  -> policy engine per project:
       mode = detect_only | redact_for_experts | redact_everywhere
       action per entity = replace with typed placeholder (<PERSON_1>) | mask | keep
  -> outputs:
       a. original (encrypted, tenant key) - kept only if customer allows; visible to customer and to
          experts only when project explicitly requires raw content (e.g. PII-labelling projects)
       b. redacted rendition in derived bucket - default view for experts
       c. findings record (entity types, counts, offsets, confidence; no raw values) -> item classification
          raised to C3 if any high-risk entity found
  -> human QA: PM samples N% of redacted items per batch; experts can flag missed PII (task:flag)
     which re-queues the item and raises project-level alert
  -> images: Presidio Image Redactor (OCR + analyzer) for screenshots and documents
  -> video (Track B): face and licence-plate detection plus blur before expert review; audio voice
     anonymisation optional; this needs a separate model choice (not Presidio)
```

Metrics: per-project recall estimate from labelled samples; target recall above 0.95 on high-risk entity types before enabling `redact_for_experts` as the only view for C3. Health projects: customer must de-identify before upload (no PHI at MVP); Presidio is a backstop, not the de-identification method.

---

## 12. Third-party AI usage policy

**Policy statement:** No customer data (content, metadata that reveals content, file names, rubric text, outputs, expert rationales) may be sent to any third-party AI service (LLM API, embedding API, transcription, OCR SaaS, translation SaaS, browser AI extension) unless the customer has given explicit, written, per-project authorisation that names the provider, model family, region, and purpose.

| Rule | Implementation |
|---|---|
| Default deny egress | Application subnets have no general internet egress; outbound only via an egress proxy with domain allow-list. AI provider domains are not on the allow-list by default. |
| AI gateway | Single internal service is the only path to any external AI provider. It checks `project.ai_authorisations` (provider, model, purpose, expiry, approved_by customer user id, document hash) before forwarding; logs `ai_gateway.request_allowed` or `request_blocked` with token counts and hashes only. |
| Provider requirements | Enterprise or API terms with no training on inputs, zero or minimal retention, region pinning where available, DPA and sub-processor listing, breach notice. Reviewed annually. |
| Self-hosted first | Internal features (PII detection, dedupe, QA heuristics, translation for internal use) run on self-hosted open-weight models inside the VPC, which do not count as third-party AI. |
| Expert-side AI | Experts contractually prohibited from pasting customer content into any AI tool; workbench copy friction; managed-device tier blocks AI extensions; disclosure required if a project permits AI assistance. |
| Customer's own models | Calling the customer's model endpoint to generate outputs for evaluation is allowed when the customer configures it; credentials stored per tenant in Secrets Manager; treated as customer-authorised egress. |
| Staff tools | Staff may not paste customer data into general-purpose AI assistants. Company-approved assistants may be used for non-customer data only. |
| Sub-processor list | Any authorised AI provider appears on the customer's sub-processor list for that project. |
| Prompt-injection hygiene | Internal LLM features never have tool or write access; outputs are treated as untrusted [S33]. |

---

## 13. Secrets management

| Control | Detail |
|---|---|
| Store | AWS Secrets Manager (India region) for DB credentials, third-party API keys, webhook signing keys, customer model endpoint credentials (per-tenant secret path `/inf/{env}/tenants/{org_id}/...`). SSM Parameter Store for non-secret config. |
| Access | Each service's IAM task role can read only its own secret paths; no human read access in prod except break-glass. |
| No static cloud keys | IAM roles for ECS/EKS tasks, GitHub Actions OIDC federation for CI/CD; no long-lived IAM user keys. |
| Rotation | DB credentials 30 days (or IAM auth); provider API keys 90 days; webhook secrets on demand with dual-secret overlap. |
| Detection | Pre-commit and CI secret scanning (e.g. gitleaks); GitHub push protection; image scanning for embedded secrets. |
| Local dev | `.env` files are git-ignored and never contain production secrets; developers use separate dev accounts; structure documented in an examples folder. |
| Break-glass | Sealed emergency role with hardware-key MFA, two-person approval, automatic alert and audit, credentials rotated after use. |

---

## 14. Application and platform security baseline

| Area | Control |
|---|---|
| Secure SDLC | Threat model per epic; PR review with ASVS L2 checklist [S31]; SAST (e.g. Semgrep), SCA (Dependabot/OSV), container scan (Trivy), IaC scan (Checkov); branch protection; signed commits for release tags. |
| Rendering untrusted content | Customer content rendered as text with escaping; markdown via sanitiser with allow-list; HTML only inside sandboxed iframe on a separate origin; no `dangerouslySetInnerHTML` on content; strict CSP with nonces and Trusted Types. |
| API | OWASP API Top 10 2023 [S32]: object-level checks (API1), property allow-lists (API3), rate limits and payload caps (API4), function-level role checks (API5), SSRF protection on customer model endpoint calls (API7: block private IP ranges, metadata endpoint, DNS rebinding), inventory of endpoints via OpenAPI (API9), validate third-party API responses (API10). |
| Uploads | Quarantine, AV, magic-byte checks, archive bomb limits, max sizes, no server-side execution of content. |
| Network | VPC with private subnets; RDS not public; security groups least privilege; WAF managed rules plus rate rules; Shield Standard. |
| Containers | Minimal base images, non-root, read-only root FS, image signing and verification, no SSH; ECR scan on push. |
| Cloud accounts | AWS Organizations with separate prod, staging, security (log archive), and later Track B accounts; SCPs denying region use outside India regions for data services, denying disabling CloudTrail/GuardDuty; GuardDuty, Security Hub (FSBP, CIS), Config, IAM Access Analyzer on. |
| Testing | Annual third-party penetration test (web, API, cloud config) plus before major launches; cross-tenant test suite in CI; bug bounty later. |
| Staff | Background checks for staff with production access (Indian law-compliant), least privilege, quarterly access reviews, security training. |

---

## 15. Incident response runbook (outline)

### 15.1 Clocks to track from the moment of awareness

| Obligation | Deadline | Source |
|---|---|---|
| CERT-In report of Annexure I incident | **6 hours** from noticing | [S8] |
| Customer notification (contract) | Recommended commitment: without undue delay, target **24 hours** for confirmed incidents affecting their data | GDPR Art. 33(2) processor duty [S11]; customer DPAs |
| DPDP Board initial intimation (as fiduciary, once in force) | Without delay | Rule 7(2)(a) [S2] |
| DPDP Board detailed report | **72 hours** (extendable on request) | Rule 7(2)(b) [S2] |
| DPDP affected data principals | Without delay | Rule 7(1) [S2] |
| GDPR supervisory authority | Controller's duty (72 hours); Infollion supports | Art. 33(1) [S11] |
| HIPAA | Per BAA (only if HIPAA tier exists) | [S22] |

### 15.2 Severity

| Sev | Definition | Example |
|---|---|---|
| SEV1 | Confirmed unauthorised access to C3/C4 data, cross-tenant exposure, ransomware, compromise of prod credentials | Expert scraped and published unreleased model outputs |
| SEV2 | Confirmed unauthorised access to C2 data limited in scope, or high-confidence attempt with partial success | One expert account takeover, 20 tasks viewed |
| SEV3 | Suspicious activity without confirmed access; vulnerability with exploit path | BOLA found in pentest, not exploited |
| SEV4 | Policy violation without data exposure | Expert attempted copy repeatedly |

### 15.3 Phases

1. **Detect and triage (0 to 1 h):** alert sources (GuardDuty, WAF, anomaly scoring, customer report, expert report, bug report). On-call security lead opens incident, assigns severity, starts the incident timeline doc and clock. `incident.declared`.
2. **Contain (0 to 4 h):** revoke sessions and API keys; suspend accounts; rotate secrets; disable affected integrations or AI gateway routes; block IPs; isolate hosts; preserve evidence (snapshots, logs exported to Object Lock bucket); legal hold on relevant data.
3. **Assess and notify (by hour 6):** decide CERT-In reportability with counsel on call (pre-agreed decision tree: when in doubt, report); file via CERT-In channels (email incident@cert-in.org.in, phone, or portal per current CERT-In instructions) [S8]; notify affected customers per contract; prepare DPDP Board intimation if Infollion is fiduciary for affected data.
4. **Investigate (hours to days):** scope via audit events (who viewed what: `task.content_viewed`, `content.url_issued`), watermark attribution of leaked material, root cause.
5. **Eradicate and recover:** patch, redeploy from clean images, restore from backups if needed, verify integrity via audit hash chain.
6. **Post-incident (within 10 business days):** written report to customers, DPDP 72-hour detailed report content (facts, causes, mitigation, findings about the person responsible, remedial measures, report on principal notifications) [S2 Rule 7(2)(b)], lessons learned, control changes tracked as SEC items.

### 15.4 Readiness

- Named CERT-In Point of Contact registered and kept current [S8].
- Pre-approved notification templates (CERT-In, customer, DPDP Board, data principals, experts).
- 24x7 on-call rota (security lead and engineering lead) with escalation to CEO and counsel.
- Tabletop exercise twice a year, including an "expert leaks frontier content" scenario and a "cross-tenant bug" scenario.
- Contact list of each customer's security contact captured at onboarding.

---

## 16. Contributor consent, IP and provenance controls (technical side)

| Control | Implementation |
|---|---|
| Versioned agreements | Expert Services Agreement, NDA, IP assignment, project addenda stored as versioned documents with SHA-256; acceptance recorded in `consent_records` (method, IP, timestamp, document hash). |
| Gating | An expert cannot be offered an assignment unless the project's required agreement versions are signed; enforced in ABAC and in the assignment service. |
| Contribution ledger | Each `evaluation_submission` stores `expert_id`, agreement version hash in force at submission, rubric version, AI-assistance declaration. |
| Provenance manifest | Every export includes `provenance.jsonl`: item id, source dataset version, task ids, contributor pseudonyms, agreement version hashes, rubric version, QA path, redaction version, consent basis for Track B items. Signed (KMS asymmetric key) so customers can verify integrity. |
| Datasheet | Every export includes a datasheet: purpose, collection process, annotator pool description (aggregate: countries, credential types, tiers), instructions, QA metrics, known limitations, licence, contact. Supports customer AI Act Art. 10 and Art. 53 documentation [S12]. |
| Delivery block | Export job fails if any contributing submission lacks a valid signed assignment or any Track B item lacks valid unrevoked consent. |
| Withdrawal (Track B) | Consent withdrawal triggers deletion workflow for undelivered data and a notice to customers holding delivered data per contract. |

---

## 17. Track B additional controls (later phase)

1. Separate AWS account, buckets, KMS keys (C4), IAM boundaries; no cross-account access from Track A services except the export job.
2. Participant onboarding: identity verification, age check (adults only), jurisdiction check against allow-list (deny Illinois and Texas until approved by counsel) [S20, S21], consent flow with comprehension check, versioned consent per capture type.
3. Capture app: encrypted local storage, upload over TLS, local deletion after confirmed upload, no gallery export.
4. Bystander policy: capture guidelines, automatic face blur for any non-participant face before human review.
5. No biometric template extraction; participant linked by opaque ID.
6. Access: only staff and experts on the Track B project with C4 clearance; VDI or proxy streaming only.
7. Retention and withdrawal per section 9; deletion includes all derived clips and annotations linked to the participant.

---

## 18. Security requirements register

Phase key: **MVP** = before first paying customer data; **P2** = before SOC 2 Type I / first frontier-lab or regulated customer (about months 3 to 9); **P3** = later (months 9+ or when feature launches).

| ID | Requirement | Phase | Driver / threat |
|---|---|---|---|
| SEC-001 | All human accounts require a second factor; passkeys supported; SMS not a primary factor. | MVP | T4; ASVS V6 |
| SEC-002 | Staff authenticate only via company IdP SSO with phishing-resistant MFA. | MVP | T4, T8 |
| SEC-003 | Passwords hashed with Argon2id; breached-password check; lockout and throttling. | MVP | T4 |
| SEC-004 | Session controls per section 2.2 (idle, absolute, concurrent limits, revocation). | MVP | T4, T5 |
| SEC-005 | Step-up MFA for exports, API keys, role changes, payout changes, identity reveal. | MVP | T7 |
| SEC-006 | Expert KYC at onboarding; liveness re-check on new device for C3. | MVP (KYC), P2 (liveness) | T5 |
| SEC-007 | Customer API keys hashed, scoped, expiring, revocable, optional IP allow-list. | MVP | T7 |
| SEC-008 | Customer SSO (SAML/OIDC) and SCIM. | P3 | T4 |
| SEC-010 | Data classification C0 to C4 stored on project and item, propagated to S3 tags and audit events. | MVP | All |
| SEC-011 | PII detector hits auto-raise item classification to C3. | P2 | T11 |
| SEC-012 | Classification cannot be lowered below project level except by customer admin with audit. | MVP | T11 |
| SEC-020 | Central ABAC policy module; default deny; decision-table unit tests. | MVP | T2, T3 |
| SEC-021 | RLS ENABLE + FORCE on every tenant table; `app_rw` NOBYPASSRLS; CI check. | MVP | T3 |
| SEC-022 | RESTRICTIVE `actor_kind_required` policy on every tenant table (fail closed). | MVP | T2, T3 |
| SEC-023 | RESTRICTIVE assignment-scoped policies for expert access to tasks, outputs, items, objects, submissions. | MVP | T2 |
| SEC-024 | RESTRICTIVE project-scope policy for staff and non-admin customer users. | MVP | T2 |
| SEC-025 | Cross-tenant and cross-assignment integration test suite in CI covering every endpoint. | MVP | T2, T3 |
| SEC-026 | `app_platform` BYPASSRLS use limited to operator endpoints and always audited. | MVP | T8 |
| SEC-030 | Task leasing; content unavailable outside lease or edit window. | MVP | T1 |
| SEC-031 | Per-expert content view rate limits with alerts. | MVP | T1 |
| SEC-032 | Visible per-session watermark on all expert content views; burned-in server-side for C3. | MVP (visible), P2 (burn-in) | T1 |
| SEC-033 | Workbench CSP without third-party scripts, Trusted Types, `frame-ancestors 'none'`. | MVP | T12, T13 |
| SEC-034 | Copy, print and drag friction on content panes (configurable per project). | MVP | T1 |
| SEC-035 | Invisible text and image watermarking with server-side mapping. | P2 | T1 |
| SEC-036 | Behavioural anomaly scoring and review queue. | P2 | T1, T5 |
| SEC-037 | Device registration and per-expert device limit. | P2 | T5 |
| SEC-038 | Project country allow-list and anonymising-proxy blocking for C3. | P2 | T1 |
| SEC-039 | Managed-device and VDI delivery tiers. | P3 | T1, T12 |
| SEC-040 | Per-tenant KMS customer managed keys; tenant chosen server-side; key policy bound to tenant prefix encryption context (C3). | MVP | T3, T16 |
| SEC-041 | S3 Block Public Access, versioning, deny non-TLS, deny unencrypted PUT on all buckets. | MVP | T3, T6 |
| SEC-042 | Customer-held keys (cross-account CMK) option. | P3 | Customer demand |
| SEC-045 | Presigned URL TTLs and scopes per section 6.3; signing via short-session role only. | MVP | T6 |
| SEC-046 | No presigned URLs to expert browsers for C3/C4; proxy streaming only. | P2 | T6 |
| SEC-047 | Presigned URL signatures stripped from all logs; `Referrer-Policy: no-referrer`. | MVP | T6 |
| SEC-048 | Storage keys contain no names, filenames or PII. | MVP | T6 |
| SEC-049 | Exports: step-up MFA, optional admin approval, 15-min download URLs, max issuances, 30-day expiry, full audit. | MVP | T7 |
| SEC-050 | TLS 1.2+ everywhere, HSTS; RDS forced SSL. | MVP | Rule 6 [S2] |
| SEC-051 | RDS, snapshots, backups encrypted; backups confined to India regions with vault lock. | MVP | T16, [S8] |
| SEC-052 | Field-level encryption for bank details, ID numbers, secrets. | MVP | SPDI, T9 |
| SEC-060 | Append-only audit table with hash chain; daily anchor to Object Lock compliance bucket. | MVP | T8 |
| SEC-061 | Audit event catalogue (section 8.2) implemented for all listed actions, including denied decisions. | MVP | T2, T8 |
| SEC-062 | Audit and access logs retained at least 1 year in India; CloudTrail with log file validation. | MVP | [S2], [S8] |
| SEC-063 | Clock sync to an NIC/NPL-traceable source (confirm Amazon Time Sync acceptability). | MVP | [S8] |
| SEC-064 | Customer-facing audit log view and API for their tenant. | P2 | Customer demand, SOC 2 |
| SEC-070 | Secrets only in Secrets Manager; per-service least-privilege access. | MVP | T9 |
| SEC-071 | No long-lived cloud keys; CI uses OIDC federation. | MVP | T9 |
| SEC-072 | Secret scanning pre-commit, CI, and push protection. | MVP | T9 |
| SEC-073 | Rotation schedule per section 13. | P2 | T9 |
| SEC-074 | Break-glass procedure with two-person approval and alerting. | P2 | T8 |
| SEC-080 | Upload quarantine, AV scan, type and size validation. | MVP | T14 |
| SEC-081 | Self-hosted Presidio analyzer with India recognizers and customer deny-lists. | MVP | T11, Rule 6 [S2] |
| SEC-082 | Per-project redaction policy; redacted rendition default for experts on C3. | MVP | T11 |
| SEC-083 | Expert "missed PII" flag and PM sampling QA. | MVP | T11 |
| SEC-084 | Image redaction via OCR pipeline. | P2 | T11 |
| SEC-085 | Redaction recall measurement per project. | P2 | T11 |
| SEC-086 | Video face and plate blurring (Track B). | P3 | T17 |
| SEC-090 | Default-deny egress; AI provider domains not allow-listed by default. | MVP | T10 |
| SEC-091 | AI gateway with per-project written customer authorisation records and audit. | MVP (gateway can be "block all"), P2 (authorised routing) | T10 |
| SEC-092 | AI provider due diligence: no-training, retention, region, DPA. | P2 | T10 |
| SEC-093 | Contractual prohibition on experts and staff using external AI with customer data. | MVP | T10 |
| SEC-094 | Internal LLM features self-hosted, no tool access, outputs untrusted. | P2 | T10, [S33] |
| SEC-095 | Customer model endpoint calls: SSRF protections and per-tenant credentials. | MVP | API7 [S32] |
| SEC-100 | Escaped rendering of customer content; sanitised markdown; HTML only in sandboxed separate-origin iframe. | MVP | T13 |
| SEC-101 | ASVS 5.0 Level 2 checklist in PR review; Level 3 on authn, access control, logging. | MVP | [S31] |
| SEC-102 | SAST, SCA, container and IaC scanning in CI with blocking thresholds. | MVP | T20 |
| SEC-103 | Annual external penetration test plus pre-launch test. | P2 | All |
| SEC-104 | Upload safety limits (archive depth, size, magic bytes). | MVP | T14 |
| SEC-105 | WAF with managed and rate-based rules; API quotas per key and user. | MVP | T15 |
| SEC-106 | Minimal, non-root, signed container images; dependency lockfiles. | MVP | T20 |
| SEC-107 | AWS Organizations account separation, SCP region restriction to India regions for data services, GuardDuty, Security Hub, Config. | MVP | T3, [S8] |
| SEC-110 | Retention engine implementing section 9 defaults, configurable per contract. | MVP | DPDP s.8(7), Rule 8 |
| SEC-111 | Deletion workflow per section 10 with two-person approval and verification. | MVP | T16 |
| SEC-112 | Deletion certificates generated for customers. | MVP | DPA |
| SEC-113 | Tenant offboarding schedules KMS key deletion (crypto-shred). | P2 | T16, [S34] |
| SEC-114 | Legal hold mechanism overriding deletion with audit. | P2 | Litigation |
| SEC-115 | Data principal rights intake (access, correction, erasure, grievance) with 90-day max response and routing to controller where Infollion is processor. | P2 (before DPDP substantive commencement, target 13 Nov 2026) | DPDP ss.11 to 13, Rule 14 [S1, S2] |
| SEC-116 | Privacy notices per DPDP Rule 3 for experts and customer users, available in English and on request in Eighth Schedule languages. | P2 (target 13 Nov 2026) | DPDP s.5, Rule 3 |
| SEC-120 | Track B in separate account with C4 keys and access boundaries. | P3 | T17 |
| SEC-121 | Track B participant consent workflow with versioned documents and comprehension check. | P3 | T17 |
| SEC-122 | Jurisdiction allow-list at participant onboarding (block IL, TX until approved). | P3 | [S20], [S21] |
| SEC-123 | Adults only; age verification. | P3 | DPDP s.9 |
| SEC-124 | Bystander face blurring before human review. | P3 | T17 |
| SEC-125 | No biometric template extraction. | P3 | BIPA, GDPR Art. 9 |
| SEC-126 | Withdrawal processing within 30 days, including derived data. | P3 | T17 |
| SEC-127 | Track B data never routed to third-party AI. | P3 | T10, T17 |
| SEC-128 | Capture app local encryption and post-upload wipe. | P3 | T17 |
| SEC-130 | Versioned agreements and acceptance records in `consent_records`; assignment gating on required versions. | MVP | T18 |
| SEC-131 | Contribution ledger fields on submissions (agreement hash, rubric version, AI-assist declaration). | MVP | T18 |
| SEC-132 | Signed provenance manifest and datasheet in every export. | P2 | T18, AI Act Art. 10/53 [S12] |
| SEC-133 | Export blocked if any contribution lacks valid rights or consent. | P2 | T18 |
| SEC-140 | Incident response plan with clocks in section 15.1; CERT-In PoC registered. | MVP | [S8] |
| SEC-141 | On-call rota and escalation including counsel. | MVP | T19 |
| SEC-142 | Pre-approved notification templates. | MVP | T19 |
| SEC-143 | Evidence preservation procedure to Object Lock bucket. | MVP | T8, T19 |
| SEC-144 | Twice-yearly tabletop exercises. | P2 | T19 |
| SEC-145 | Customer security contacts captured at onboarding. | MVP | T19 |
| SEC-150 | Standard DPA (GDPR Art. 28, DPDP processor, CCPA service provider) with SCCs and UK Addendum; public sub-processor list. | MVP (before first EU/US customer) | [S11], [S15], [S18] |
| SEC-151 | Expert Services Agreement with NDA, present IP assignment, monitoring notice, AI prohibition. | MVP | [S10], [S24] |
| SEC-152 | No PHI accepted until HIPAA tier exists; customer warranty of de-identification. | MVP | [S22] |
| SEC-153 | Policy set (InfoSec, access, classification, retention, IR, vendor, SDLC, acceptable use) approved and published internally. | MVP | SOC 2, ISO 27001 |
| SEC-154 | Quarterly access reviews; vendor risk reviews. | P2 | SOC 2 |
| SEC-155 | SOC 2 Type I, then Type II; ISO/IEC 27001:2022 certification. | P3 | Customer demand [S38] |
| SEC-156 | Security and confidentiality training for staff and experts (onboarding and annual). | MVP | T1 |
| SEC-157 | Background checks for staff with production access. | P2 | T8 |

---

## 19. Open items for the architecture team

1. Confirm whether S3 Bucket Keys must be disabled for prefix-bound KMS key policies (section 6.2) and measure KMS cost.
2. Pick the watermark library or build in-house; test survivability of invisible marks through screenshots and OCR.
3. Decide the expert workbench rendering strategy for C3 (server-rendered images vs canvas) and its accessibility impact.
4. Confirm Presidio release and which India recognizers are built-in; build missing recognizers with tests.
5. Confirm ap-south-2 (Hyderabad) service coverage for DR and log archive copies.
6. Validate the auth library (Better Auth per database_design.md) supports passkeys, TOTP, step-up and session revocation as specified; otherwise choose an alternative.
