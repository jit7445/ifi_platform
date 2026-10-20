# Product & Operations Agent: Findings and Working Notes

Agent: Product & Operations Agent
Date: 2026-10-20
Outputs:
- `research/market_and_business_model.md` (market, competitor pricing, pay benchmarks, packages, unit economics, sources S1-S27)
- `product/user_personas_and_roles.md`
- `product/workflows.md`
- this file (ops design, Track B, KPIs, notes)

Source IDs below refer to the sources table in `research/market_and_business_model.md`. All pricing proposed for Infollion is **HYPOTHESIS**. Nothing here is legal or tax advice; items marked **[COUNSEL]** need review by Indian tax and legal counsel.

---

## 1. Key findings (working notes)

1. Expert data is sales-led and opaque on price. Only Nxted.ai (S17), Prolific (S13), Labelbox (S15) and Toloka (S16) publish customer prices.
2. Nxted.ai is the closest analogue: UK entity, India-sourced experts and tradespeople, two products (Expert and Capture), cheap trial entry points (free 20-output kit, GBP 249 sprint, USD 2,500 physical test kit), monthly plans from GBP 1,500, Capture from USD 35-120/hr by skill tier, "Data Trust Pack" with consent, redaction, provenance, DPDP/GDPR DPA (S17). Infollion should expect to be compared directly.
3. US expert pay: USD 40-180/hr for credentialed experts (S7, S8); Mercor average USD 85+/hr (S3). Gross take rates around 30-40% (S3, inferred from S13).
4. Litigation risk in the sector around worker classification and promised vs actual pay (S5, S23). Infollion's pay policy must be transparent: pay for calibration, publish rate before task acceptance, written reason for any non-payment.
5. DPDP Rules 2025 notified November 2025; consent manager provisions around November 2026; core obligations around May 2027 (S25). Design to comply now.
6. India tax items for counsel: TDS under Section 194J on professional fees (10% professional, 2% technical, threshold INR 50,000 from FY2025-26 per secondary sources) and possible renumbering under Income Tax Act 2025 from April 2026 (S26, unconfirmed); GST zero-rating of export of services under IGST Section 16 with LUT (S27).
7. Gaps not resolved: Appen, Scale, Surge customer price cards; Appen expert pay (only low-reliability review sites); India-specific expert pay on global platforms; Handshake page read via aggregator not first-party.

---

## 2. Customer onboarding

| Step | Owner | Output | Typical duration (hypothesis) |
|---|---|---|---|
| 1. Discovery / scoping call | Sales plus PM plus solutions lead | Use case, domains, volume, SLA, data sensitivity, success metric | Day 0 |
| 2. Mutual NDA | Legal | Signed NDA (org-level) | 1-3 days |
| 3. Security questionnaire | Security agent / InfoSec | Completed questionnaire, data flow diagram | 3-10 days, parallel |
| 4. Pilot proposal | PM | Pilot scope (200-500 items), rubric draft, quality targets, price | 2 days |
| 5. DPA (and SCCs/IDTA if EU/UK data) | Legal **[COUNSEL]** | Signed DPA: roles (Infollion as processor), sub-processors (experts as sub-processors or personnel), retention, breach notice, cross-border | 1-3 weeks |
| 6. Pilot SOW or order form | Sales, Finance | Signed SOW: deliverables, acceptance, IP assignment, pricing, payment terms | parallel with DPA |
| 7. Rubric co-design workshop | PM, customer ML engineer, 1-2 senior experts | Rubric v1 with anchors and examples, gold candidates | 1-2 sessions |
| 8. Calibration batch | PM, 3-5 experts | Agreement report, disagreement review, rubric v2 | 3-5 days |
| 9. Pilot production and report | PM | Delivery plus quality report plus findings memo | 1-3 weeks |
| 10. Production SOW / MSA | Sales | Volume tiers, SLAs, monthly plan or T&M | after pilot |

Exit criteria from pilot to production: agreement target met, customer accepts at least 95% of delivered items, unit cost within 15% of estimate.

---

## 3. Expert qualification and lifecycle

### 3.1 Sourcing from existing Infollion network
- Import existing profiles (employment history, domains, seniority, prior engagement ratings, compliance attestations) via internal sync. Re-consent required: experts must opt in to AI-training work and accept a new contributor agreement and privacy notice (DPDP) because the purpose differs from expert calls **[COUNSEL]**.
- Tag each profile with taxonomy codes (domain, sub-domain, jurisdiction, language).

### 3.2 Verification
| Check | Method | Applies to |
|---|---|---|
| Identity | Government ID via KYC vendor; liveness check | All |
| Professional licence | Registry lookup (for example NMC/state medical council for doctors, Bar Council enrolment, ICAI membership for CAs) or document plus manual verification | Regulated professions |
| Degree | Document review; university verification for T3+ where claimed PhD | Where relevant |
| Employment | Existing Infollion verification; LinkedIn cross-check | All |
| Sanctions / adverse media | Screening vendor | International experts and T3+ |

### 3.3 Screening and calibration
1. **Domain screening test** (paid if over 20 minutes): 10-20 items with known answers, graded automatically plus senior review for open-ended. Pass mark per domain.
2. **Writing and reasoning sample**: one rubric-based evaluation with rationale.
3. **AI-use policy acknowledgement** and short test on identifying LLM failure modes.
4. **Project calibration** (paid): 20-50 items per project before production access.

### 3.4 Ongoing scoring and tiering
- Rolling metrics: gold accuracy, agreement with consensus, review pass rate, throughput vs median, SLA adherence, flags quality.
- Tiers T1-T4 (see market file section 4). Promotion after N tasks above thresholds plus senior nomination; demotion after sustained underperformance.
- Probation: 100% review, coaching feedback, 2-week window.
- Removal: project-level removal by PM; network-level removal by Vetting with second approver; reasons recorded; appeal channel.
- Misconduct (confirmed LLM-generated submissions against policy, data leakage, identity fraud): immediate suspension, earnings hold pending investigation **[COUNSEL]** on lawful holdback.

### 3.5 Conflict of interest
- Expert declares current employer, advisory roles, and competitor relationships (reuse existing Infollion compliance declarations).
- Customer can supply an exclusion list (competitor names, own employees).
- Automated checks: expert employer vs customer org and exclusion list; entity mentions in item metadata.
- Blind-customer projects: customer name hidden from experts where SOW allows.
- Former employees of the customer within a cooling-off period (default 12 months) excluded.

### 3.6 Availability
- Experts set weekly availability (hours, time zones); allocation engine respects it.
- Workload caps (default 6h/day, 30h/week; tighter for harmful-content projects).
- Bench management: keep pool size at about 1.5-2x required concurrent capacity for SLA projects; pay for calibration so bench members stay warm.

### 3.7 Payment
| Item | Design |
|---|---|
| Pay model | Per task (rate shown before claim, derived from expected minutes x tier hourly rate) or per hour (time tracked, for open-ended authoring and red-teaming). Calibration and qualification paid. |
| Cycle | Weekly or biweekly ledger close; payout within 7 days after QA approval. |
| India payouts | Bank transfer (NEFT/IMPS) via payout provider; PAN mandatory. |
| International payouts | Payout platforms (for example Payoneer, Wise, or Stripe Connect) subject to provider coverage; collect tax forms (W-8BEN or local equivalent). |
| TDS **[COUNSEL]** | Resident individual experts: likely Section 194J (professional fees 10% / technical services 2%) vs 194C, depending on characterization; threshold INR 50,000 per FY from FY2025-26 per secondary sources (S26). Confirm effect of Income Tax Act 2025 renumbering. |
| Non-resident experts **[COUNSEL]** | Section 195 withholding and DTAA applicability; Form 15CA/15CB for remittances; FEMA reporting. |
| GST on expert fees **[COUNSEL]** | Experts above GST registration threshold may charge GST; Infollion input credit; reverse charge not generally applicable for individuals' professional services but confirm. |
| GST on customer invoices **[COUNSEL]** | Export of services to foreign customers potentially zero-rated under IGST Section 16 with LUT if all Section 2(6) conditions met (S27); domestic customers charged GST (likely 18%; confirm SAC classification). |
| Worker classification **[COUNSEL]** | Independent contractor model; avoid control indicators; review against Indian labour codes (social security code provisions on gig/platform workers) and foreign jurisdictions for international experts. |
| Disputes | Expert can dispute any reduction within 14 days; Finance plus PM review; outcome logged. |

---

## 4. Task allocation, review and escalation

### 4.1 Matching
Score = eligibility gate (qualification active, COI clear, cap not reached, availability window) then rank by: domain match specificity, quality score, project familiarity (pool continuity), cost tier vs budget, fairness (spread work so pool stays engaged).

### 4.2 Overlap and gold
- Default overlap 20-30% in production, 100% x3 in calibration; reduce as reliability is proven.
- Gold 5-10% default; refresh gold set regularly to avoid memorisation.

### 4.3 SLAs (hypothesis defaults)
| Package | Standard SLA | Expedited |
|---|---|---|
| Evaluation / preference | 5 business days per 1,000 items | 48h (premium 25-50%) |
| Monitoring cycle | 72h | 24h |
| Benchmark authoring | per milestone plan | n/a |
| Red-team | engagement calendar | n/a |

### 4.4 Review, adjudication, rework, escalation
See `product/workflows.md` Workflow 3. Escalation ladder: Expert to Senior Reviewer (content), to PM (rubric, schedule, customer), to Delivery Head (SLA breach, margin breach), to Legal/Security (data incident, harmful content discovery, COI breach). Incident response: data incidents notified per DPA timeline.

---

## 5. Operational risks register (top items)

| Risk | Impact | Mitigation |
|---|---|---|
| Experts use LLMs to produce answers | Data poisoning, customer churn | Policy, detection heuristics, gold, behavioural signals, penalties |
| Customer data leak by expert | Contract breach, legal | NDA plus addendum, no bulk access, short-lived URLs, watermarks, access logs |
| Expert opportunity cost too high vs pay | Low supply of senior experts | Tiered pay, flexible scheduling, prestige framing, use T3 only where needed |
| Demand lumpiness | Bench cost, expert churn | Monitoring subscriptions for baseload, cross-project pools |
| Misclassification / pay disputes | Litigation (sector precedent S23) | Transparent rates, paid calibration, documented QA |
| Harmful content exposure (red-team) | Wellbeing, attrition | Exposure caps, opt-out, counselling access |
| Concentration on few customers | Revenue shock (Appen lost Google, S14; Scale and Google, S1) | Diversify across labs and enterprises |
| Cross-border data restrictions | Lost deals | Regional storage, SCCs, DPDP-aligned notices |

---

## 6. Track B: Physical AI data collection

### 6.1 Recommendation
**Do not include Track B in the initial product (Phase 1).** Plan it as **Phase 3 (roughly months 9-18)**, gated on: (a) Phase 1 delivering at least two paying expert-evaluation customers, (b) at least one robotics customer willing to co-fund a paid pilot with signed consent framework, (c) counsel sign-off on consent, bystander privacy and worker welfare model.

Optional earlier step (Phase 2, months 4-9): a **partnered pilot** where Infollion supplies skilled-trade experts and annotation/QA of egocentric footage while a capture partner supplies hardware and capture ops. This tests demand without capex.

Rationale:
- Physical capture is a different business: hardware capex, field logistics, on-site supervision, heavy storage, and labour-practice reputational risk (press coverage of low-paid headcam workers in India, S24).
- Infollion's moat (vetted professionals, compliance, expert-call trust) maps directly to text and multimodal evaluation; it maps only partially to physical capture (L3-L4 skilled professionals, for example technicians and clinicians, are a fit; L1 household tasks are not differentiated).
- A direct competitor (Nxted Capture) already publishes tiered per-hour pricing USD 35-120+/hr (S17); entering without operational readiness risks quality and price competition.

### 6.2 Equipment (indicative; architecture/tools agents to confirm models and costs)
| Category | Examples (indicative, not endorsements) | Purpose |
|---|---|---|
| Head-mounted / egocentric cameras | Action cameras with head mounts (GoPro-class), smartphone head rigs, research egocentric glasses where programs allow access | First-person RGB video |
| Depth sensors | Stereo/ToF depth cameras (Intel RealSense-class, Orbbec-class) | Depth for 3D hand-object interaction |
| Hand tracking / gloves | Data gloves (Manus-class, Rokoko-class), or vision-based hand pose post-hoc | Finger joint angles, contact |
| Motion capture | IMU suits or optical mocap (OptiTrack-class) for lab setups | Body pose, 6-DoF trajectories |
| Wrist/third-person cameras | Additional synced cameras | Multi-view for labeling and validation |
| Sync and calibration | Timecode/genlock or software sync, calibration boards | Multi-sensor alignment |
| Compute and storage | Field laptops, rugged SSDs, encrypted NAS, cloud object storage with lifecycle tiers | Raw footage is large (multi-GB per hour per stream, estimate) |
| Privacy tooling | Face/PII blurring pipeline, audio muting | Bystander and PII protection |

### 6.3 Specialist staff
Capture technicians (rigging, calibration), field supervisors, data engineers (sync, format conversion to LeRobot/RLDS/HDF5), annotators for action segmentation and language labels, QA lead, safety officer for industrial sites, consent and welfare coordinator, legal counsel.

### 6.4 Processes
1. Customer task spec (task taxonomy, success definition, environment, hours needed).
2. Site and participant recruitment (Infollion skilled-trade experts, employer permission for workplace capture).
3. Consent: informed, written, in local language, separate consent for face/voice, right to withdraw and deletion workflow, bystander signage and consent or exclusion.
4. Safety briefing; equipment checks; no capture in unsafe conditions.
5. Capture sessions with real-time quality checks (framing, sync, lighting).
6. Ingest, encrypt, redact (faces, documents, screens), segment, label actions, QA.
7. Package with dataset card, consent records, provenance log, QA report (benchmark: Nxted "Data Trust Pack", S17).

### 6.5 Consent and legal needs **[COUNSEL]**
- DPDP Act and Rules 2025 notice and consent requirements (S25); biometric-like data (face, voice, gait) handling.
- Workplace capture: employer agreements, trade secret exposure, union or works council considerations where applicable.
- No minors (match industry practice, S17).
- Cross-border transfer terms for foreign robotics customers.
- Fair pay policy above local market rates with transparent hours (reputational issue noted in S24).
- IP and licensing of footage; participant likeness rights.

---

## 7. Operations KPIs

| Area | KPI | Target (initial hypothesis) |
|---|---|---|
| Quality | Customer acceptance rate of delivered items | at least 97% |
| Quality | Gold accuracy (pool average) | at least 90% |
| Quality | Inter-rater agreement vs project target | at or above target on at least 90% of batches |
| Quality | Rework rate | under 10% |
| Quality | Dispute rate after delivery | under 2% of items |
| Speed | SLA attainment | at least 95% of batches/cycles |
| Speed | Median time from launch to first delivery | under 10 business days |
| Speed | Queue age p95 | under 24h |
| Supply | Time to staff a new domain pool (qualified experts) | under 7 days for common domains |
| Supply | Qualification pass rate | track; investigate if under 30% or over 80% |
| Supply | Expert 90-day retention (active) | at least 60% |
| Supply | Utilization of qualified pool | 40-70% (too low means bench cost, too high means SLA risk) |
| Expert experience | Payout on-time rate | at least 99% |
| Expert experience | Expert NPS / satisfaction | track quarterly |
| Expert experience | Effective hourly earnings vs published band | within band |
| Economics | Gross margin by project vs plan | within 5 points |
| Economics | Estimate vs actual unit cost variance | within 15% |
| Economics | PM hours per 1,000 items | trending down |
| Commercial | Pilot-to-production conversion | at least 40% |
| Commercial | Net revenue retention | track |
| Risk | Data incidents | zero; any incident triggers RCA |
| Risk | COI violations | zero |
| Risk | Confirmed policy-violating AI-generated submissions | under 0.5% and falling |

---

## 8. Recommended packaging and phasing (summary)

| Phase | Packages |
|---|---|
| Phase 1 (launch) | Expert Evaluation Pilot; Evaluation and Preference Data; SFT Dataset Creation; Domain Benchmark Creation |
| Phase 2 | Ongoing Model-Quality Monitoring (subscription); AI Agent Evaluation; AI Red-Teaming (start with Indic and BFSI/health domains); partnered physical-AI annotation pilot |
| Phase 3 | Multimodal annotation at scale (partner tooling); Physical AI data collection (own capture ops) |

---

## 9. Open questions for other agents / leadership
1. Architecture: confirm entity schema and whether to build workbench or adopt open-source tools (Label Studio, Argilla) for v1.
2. Security: content watermarking, expert device posture requirements, break-glass design.
3. Legal: contributor agreement, classification, TDS/GST positions, DPA template, consent for re-purposing existing expert profiles.
4. Leadership: willingness to accept low-margin pilots; FX and currency for customer billing (USD vs INR).
5. Validate pay bands with a survey of 50-100 existing Infollion experts across tiers.
