# Open Questions

Date: 2026-10-20. Questions marked **Counsel** need qualified legal or tax advice; the research does not answer them.

## Business and product

| ID | Question | Why it matters | Owner | Needed by |
|---|---|---|---|---|
| OQ-01 | Which domain and customer will the first pilot target? | Determines rubric templates, expert recruitment and demo data | Business lead | Phase 1 start |
| OQ-02 | Pricing model for pilots: per item, per expert hour, or fixed package? | Billing schema meters and SOW templates | Business lead | Phase 1 |
| OQ-03 | How many experts in the pilot domain can commit 5 to 20 hours per week, and at what pay? | Capacity and unit economics | Ops lead | Phase 1 |
| OQ-04 | Do any launch customers require SSO, SCIM, or non-India data residency in the first 6 months? | Revisits ADR-005 and ADR-012 | Business lead | Phase 1 |
| OQ-05 | Should customers ever see named experts (for regulated sign-off)? | ADR-013 default is pseudonymous | Product | Phase 1 |
| OQ-06 | Is LLM-judge pre-scoring wanted by early customers? | Pulls Langfuse and ADR-014 opt-in earlier | Product | Phase 2 |
| OQ-07 | Largest expected single upload (rows, GB)? | Ingestion limits (MVP 2 GiB per file) | Product | Phase 1 |
| OQ-08 | Can existing Infollion expert profile data be imported, and under what consent? | Matching quality from day one; DPDP purpose limitation | Ops lead, Counsel | Phase 1 |
| OQ-09 | Is the existing Infollion expert payment process reusable for task-based pay? | Payout scope in Phase 1 | Finance | Phase 1 |
| OQ-10 | Preferred cloud provider and existing contracts? | ADR-012 | IT / Leadership | Phase 1 |
| OQ-11 | Which identity provider do Infollion staff use (Google Workspace, Microsoft Entra)? | Staff OIDC login (ADR-005) | IT | Phase 1 |

## Legal and compliance (Counsel)

| ID | Question |
|---|---|
| OQ-20 | For each data category, is Infollion a Data Fiduciary or Data Processor under the DPDP Act 2023? Does the s.17(1)(d) exemption apply to processing for foreign customers, and how does the s.8(5) security duty still apply? |
| OQ-21 | Which DPDP commencement date should we plan against: 13 May 2027 under the 2025 Rules, or the proposed 13 Nov 2026? Status of the reported October 2026 order (unverified). |
| OQ-22 | Does Rule 8(3) one-year minimum retention apply to content or only logs, and how does it interact with customer deletion instructions? |
| OQ-23 | Form of expert IP assignment under Copyright Act s.19 (duration, territory, moral rights) and compatibility with US work-for-hire expectations of customers. |
| OQ-24 | EU and UK customers: DPA, SCCs, transfer impact assessment, UK addendum; does the EU AI Act place obligations on Infollion as a data provider? |
| OQ-25 | Should Infollion sign HIPAA BAAs, or exclude US PHI entirely? |
| OQ-26 | Expert worker classification (contractor vs employee), TDS section and GST treatment of export of services. |
| OQ-27 | CERT-In reporting sequence relative to customer contractual notice; clock source compliance. |
| OQ-28 | Track B: biometric consent (BIPA, Texas CUBI, GDPR Art. 9), bystanders, minors, withdrawal of consent, worker welfare. |

## Technical

| ID | Question |
|---|---|
| OQ-40 | Agreement thresholds per task type: confirm defaults (alpha 0.800 reliable, 0.667 tentative) after the first three projects. |
| OQ-41 | Watermarking approach for C3 text content in the expert workbench (visible overlay vs per-viewer text perturbation). |
| OQ-42 | Whether customers need a self-hosted or VPC deployment option (affects Phase 4 scope). |
