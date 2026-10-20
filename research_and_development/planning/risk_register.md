# Risk Register

Date: 2026-10-20. Likelihood (L) and Impact (I) on a 1 to 5 scale; Score = L x I. Owners are roles, to be named by Infollion.

| ID | Risk | Category | L | I | Score | Mitigation | Owner | Phase |
|---|---|---|---|---|---|---|---|---|
| R-01 | No paying design partner for the pilot; platform built ahead of demand | Market | 3 | 5 | 15 | Sell the Expert Evaluation Pilot before Phase 1 ends; run first pilot partly manually if needed | Business lead | 0-1 |
| R-02 | Infollion experts are consultants, not trained raters; low agreement and slow throughput | Operations | 4 | 4 | 16 | Calibration batch, gold items, rubric co-design, tiering; pay per hour for pilots | Ops lead | 1 |
| R-03 | Expert pay expectations (benchmarks USD 40 to 180/hr) erode margin | Economics | 3 | 4 | 12 | Price per item from measured time; India-based expert cost advantage; reserve senior experts for review | Finance | 1-2 |
| R-04 | Cross-tenant data leak | Security | 2 | 5 | 10 | Composite tenant FKs, RLS (ADR-003, ADR-017), automated isolation tests, pentest before launch | Eng lead | 1 |
| R-05 | Expert exfiltrates or reuses customer prompts | Security / IP | 3 | 5 | 15 | NDA and IP assignment before assignment, assignment-scoped access, watermarking for C3, download blocks, audit, anomaly review | Security lead | 1 |
| R-06 | DPDP obligations start earlier than 13 May 2027 (proposed 13 Nov 2026) | Legal | 3 | 4 | 12 | Plan readiness for 13 Nov 2026; counsel review | Counsel | 0-1 |
| R-07 | Expert IP assignment unenforceable as drafted (Copyright Act s.19 defaults) | Legal | 3 | 4 | 12 | Counsel-drafted assignment specifying duration, territory, moral-rights waiver where permitted | Counsel | 0 |
| R-08 | EU/UK customers require SCCs, TIA and certifications Infollion lacks | Commercial / Legal | 4 | 3 | 12 | DPA template, SCCs, ISO 27001 / SOC 2 roadmap from Phase 4; lead with India-resident customers and pilots | Counsel / Security | 1-4 |
| R-09 | Langfuse licensing or ownership changes affect self-hosted features | Vendor | 2 | 2 | 4 | Adapter (ADR-007); not in critical path | Eng lead | 3 |
| R-10 | Label Studio enterprise-gated features needed for multimodal review | Vendor | 3 | 2 | 6 | Our assignment and review layer around Community edition; evaluate CVAT for video | Eng lead | 3 |
| R-11 | Procrastinate or Postgres queue limits throughput | Technical | 2 | 3 | 6 | Load test 50 jobs/s; facade; PgQueuer or Dramatiq fallback | Eng lead | 1 |
| R-12 | LLM-judge pre-scoring biases human experts (anchoring) | Quality | 3 | 3 | 9 | Hide judge scores from first-pass experts by default; report judge-human agreement | Product | 3 |
| R-13 | Customer expects model training or fine-tuning services | Scope | 3 | 3 | 9 | State scope clearly in SOWs; partner referral | Business lead | 1 |
| R-14 | Competitors (Appen, Scale, Surge, Mercor, Nxted) out-price or out-recruit | Market | 4 | 3 | 12 | Niche domains, India-domain and Indic-language depth, published QA methodology, transparent pilot | Business lead | 1-4 |
| R-15 | Unverified market and pricing figures used in sales material | Reputation | 3 | 3 | 9 | Use only sources marked verified in `sources/research_sources.md` | Marketing | 0 |
| R-16 | CERT-In 6-hour reporting missed | Compliance | 2 | 4 | 8 | Runbook, on-call, log retention 180 days in India, NTP sync | Security lead | 1 |
| R-17 | Physical AI demand pursued early, diverting focus and capital | Strategy | 2 | 4 | 8 | Phase 5 gate (ADR-015) | Leadership | 5 |
| R-18 | Biometric and bystander consent issues in Track B | Legal | 3 | 5 | 15 | Counsel approval, consent records, redaction, exclude Illinois/Texas participants until cleared | Counsel | 5 |
| R-19 | Contamination: evaluation items leak into customer or third-party training data | Quality / Contract | 2 | 4 | 8 | Usage-rights tag per item, canary strings for benchmarks, contract clauses | Product | 2 |
| R-20 | Expert payment, TDS, GST and worker classification errors | Finance / Legal | 3 | 3 | 9 | Use existing Infollion payout process; counsel and tax review | Finance | 1 |
| R-21 | Small team and key-person dependency | Delivery | 3 | 3 | 9 | Modular monolith, documentation, ADRs, CI | Eng lead | 1-4 |
| R-22 | Archived local storage emulator (MinIO) breaks dev setup | Technical | 2 | 1 | 2 | Pinned image, vendor-neutral adapter (ADR-011) | Eng lead | 1 |
