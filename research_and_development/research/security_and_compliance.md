# Security and Compliance Research

Prepared by: Security & Data Governance Agent
Date: 2026-10-20
Platform: Infollion expert-powered AI evaluation and training-data platform. Multi-tenant. Customers (frontier labs, LLM companies, healthcare/legal/finance AI firms, possibly US/EU) upload confidential prompts and model outputs; Infollion experts in India and abroad evaluate and correct them; datasets are delivered. Track B (later): physical AI capture, video of people performing tasks.
Assumed stack: Next.js, FastAPI, PostgreSQL, S3, Docker, AWS ap-south-1 (Mumbai).

> Not legal advice. This document maps the landscape so engineering and commercial teams can ask the right questions. Every row marked "Counsel: Yes" needs a qualified lawyer's sign-off before it shapes a contract, a product promise or a go/no-go decision. Dates marked "computed" are derived from notification text and may shift by a day depending on the counting convention.

---

## 1. Executive summary

1. **India is the home jurisdiction and its regime is in transition.** The DPDP Act 2023 and DPDP Rules 2025 (Gazette 13 November 2025) phase in: Board and procedural rules now; Consent Manager rules about 13 November 2026; the substantive obligations (notice, consent, security safeguards, breach intimation, retention, rights, cross-border) about 13 May 2027 [S1, S2, S5]. A January 2026 MeitY consultation proposed compressing this to 12 months; no amending notification was found [S6]. Until s.44(2) commences, IT Act s.43A and the SPDI Rules 2011 still apply [S1, S5, S9].
2. **CERT-In is already binding and is the tightest operational constraint:** report qualifying incidents within 6 hours, keep ICT logs for a rolling 180 days inside India, sync clocks to NIC/NPL-traceable NTP, name a Point of Contact [S8].
3. **For foreign customers, Infollion will mostly be a processor.** GDPR Art. 28 terms, SCCs for EU-to-India transfers (India has no EU adequacy decision), and HIPAA BAAs (only if Infollion accepts PHI) flow down contractually [S11, S15, S22]. DPDP s.17(1)(d) exempts much of Chapter II and III for foreign data principals processed under a foreign contract, but not the security duty in s.8(5) [S1]. Counsel must confirm applicability.
4. **AI-specific law touches Infollion indirectly.** The EU AI Act puts data governance (Art. 10) on high-risk providers and documentation and copyright duties (Art. 53) on GPAI providers [S12]. Infollion's customers will push these into contracts: provenance, collection process, consent basis, bias notes. Regulation (EU) 2026/1744 deferred high-risk dates to 2 December 2027 (Annex III) and 2 August 2028 (Annex I); GPAI duties have applied since 2 August 2025 [S12, S13].
5. **IP chain of title is make-or-break.** Indian Copyright Act s.19 requires written, signed assignments; silence on duration or territory defaults to five years and India only [S10]. US work-for-hire does not cover most contractor output; assignment is needed [S24]. Every delivered item needs traceable, signed rights from every contributor.
6. **Track B (video of people) is a separate, higher legal risk class:** biometric laws (BIPA private right of action; Texas CUBI; GDPR Art. 9), bystanders, minors, revocation. Gate by jurisdiction and do not launch without counsel [S11, S20, S21].
7. **Third-party LLM APIs are a contractual and confidentiality hazard.** Default: no customer data to any third-party AI service unless the customer explicitly authorises it per project.

---

## 2. Legal and regulatory landscape

Legend for "Counsel": **Yes** = must have legal sign-off; **Confirm** = engineering can proceed on the stated assumption but legal should confirm; **No** = operational/technical, no specific legal question.

### 2.1 India

| Law / instrument | Applies when | Key obligations (summary) | Platform implication | Counsel? |
|---|---|---|---|---|
| **Digital Personal Data Protection Act 2023** [S1] | Processing of digital personal data in India; or outside India in connection with offering goods/services to Data Principals in India (s.3). Core obligations commence about 13 May 2027 (computed) [S5]. | Notice and consent (ss.5, 6) or legitimate use (s.7); fiduciary accountable for processors (s.8(1)); processors only under valid contract (s.8(2)); reasonable security safeguards (s.8(5)); breach intimation to Board and each affected principal (s.8(6)); erase when purpose served or consent withdrawn, and cause processors to erase (s.8(7)); grievance redressal (s.8(10), s.13); children's verifiable parental consent, no tracking or targeted ads (s.9); rights to access, correction, erasure, nomination (ss.11 to 14); government may restrict transfers to notified countries (s.16). Penalties up to INR 250 crore (security), 200 crore (breach notice, children), 50 crore residual (Schedule). | Infollion is Data Fiduciary for expert data (KYC, payout details, credentials, performance) and Track B participant data it recruits. Likely Data Processor for customer content containing personal data. Build consent records, notices in English and Eighth Schedule languages on request (s.5(3)), rights workflows, breach workflow, retention engine. | Yes (role mapping, dates) |
| DPDP Act s.17(1)(d) exemption [S1] | Personal data of Data Principals **not within India**, processed under a contract with a person **outside India**, by a person based in India. | Chapter II (except s.8(1) and s.8(5)), Chapter III and s.16 do not apply. Security safeguards and fiduciary responsibility still apply. | Likely relevant to foreign-customer projects. Does not cover Indian experts' own data, or customer data about Indian residents. Do not lower security for exempt data. | Yes |
| DPDP s.7(i) legitimate use [S1] | Processing "for the purposes of employment" or safeguarding the employer from loss (espionage, trade secrets, IP). | Basis without consent. | May support monitoring of experts (session logs, watermark attribution) if experts are employees; unclear for independent contractors, so also obtain consent in the expert agreement. | Yes |
| **DPDP Rules 2025** (G.S.R. 846(E), 13 Nov 2025) [S2] | Rules 1, 2, 17 to 21 from publication; Rule 4 after one year (about 13 Nov 2026); Rules 3, 5 to 16, 22, 23 after 18 months (about 13 May 2027). | Rule 3 notice content (itemised data, specific purposes, withdrawal and complaint links). Rule 6 minimum safeguards: encryption/obfuscation/masking/tokenisation; access control; logging, monitoring, review; backups for continuity; **retain logs and personal data one year** for detection and investigation; processor contract clauses. Rule 7 breach: each affected principal without delay; Board without delay plus detailed report **within 72 hours**. Rule 8(3): **retain personal data, traffic data and processing logs at least one year** from processing (also by processors), then erase. Rule 10 verifiable parental consent. Rule 13 SDF duties incl. annual DPIA and audit, possible localisation. Rule 14(3) grievance response within 90 days. Rule 15 cross-border transfers allowed subject to government orders on foreign State access. | Design retention engine with a 12-month content-free log floor; breach runbook with 72-hour Board report; notice templates per Rule 3; data principal rights portal; processor contracts with safeguards clauses. | Confirm (dates), Yes (Rule 8(3) scope) |
| Proposed DPDP timeline compression [S6] | MeitY consultation January 2026 (12 months instead of 18). | If adopted, obligations would start about 13 Nov 2026. No Gazette amendment found. | Plan to be DPDP-ready by **13 November 2026** as a safety margin; this costs little since controls are needed for customers anyway. | Confirm |
| "DPDP (Removal of Difficulties) Order 2026" [S7] | Reported published about 7 Oct 2026 (unverified). | Reported textual clarifications to s.9(1) and s.10(2)(c). | No design impact identified. | Confirm |
| **CERT-In Directions, 28 April 2022** (s.70B(6) IT Act) [S8] | Service providers, intermediaries, data centres, **body corporate** and government organisations. In force since 60 days after issue. | (i) Sync ICT clocks to NIC or NPL NTP or traceable sources. (ii) Report Annexure I incidents **within 6 hours** of noticing (incl. unauthorised access, data breach, data leak, attacks on cloud systems, attacks on AI/ML systems). (iii) Designate a Point of Contact; comply with CERT-In information orders. (iv) Enable logs of **all ICT systems**, maintain securely for **rolling 180 days within Indian jurisdiction**. (v) Cloud/VPS/VPN/DC providers: subscriber KYC 5 years. | Incident runbook with 6-hour clock; India-resident log archive; NTP config (Amazon Time Sync is traceable to standard time but confirm acceptability); registered PoC. | Confirm (NTP, which incidents) |
| **IT Act 2000 s.43A and SPDI Rules 2011** [S9] | Body corporate handling "sensitive personal data or information" (passwords, financial details, health, sexual orientation, medical records, biometric information). Remains until DPDP s.44(2) commences (about May 2027) [S1, S5]. | Reasonable security practices (ISO/IEC 27001 is commonly cited as a deemed-compliant standard; Rule 8 wording not verified in this session), privacy policy, consent for SPDI collection, disclosure limits, grievance officer. Compensation liability for negligence causing wrongful loss. | Applies today to expert bank details, ID documents, any health data, and Track B biometrics. Publish a privacy policy and grievance officer now. | Confirm |
| **Copyright Act 1957** ss.17 to 19, 57 [S10] | Ownership of literary/artistic works produced by experts (rationales, rewritten answers, rubrics, red-team prompts) and Track B recordings (cinematograph films, performers' rights). | s.17: author is first owner unless made under a contract of service (employment), absent agreement. Contractors are not employees. s.18/19: assignment in writing, signed, identify work, rights, duration, territory, consideration; **default 5 years and India only if unspecified**; s.19(4) lapse if rights not exercised within one year unless otherwise specified. s.57 moral rights (waivability uncertain). | Expert agreement must be a present assignment of future works, worldwide, full copyright term, all media, with consideration stated, and a licence-back fallback. Track B: performer consents and producer rights. | Yes |
| **Indian Contract Act 1872** s.27 (not fetched this session) | Restraints of trade in contracts. | Agreements in restraint of a lawful profession are void (well-known rule; verify). | Do not rely on expert non-competes. Use confidentiality, non-solicit of customers narrowly, conflict-of-interest declarations. | Yes |
| Sector rules (RBI, SEBI, IRDAI, ABDM) | Customer is a regulated Indian entity (bank, broker, insurer, health). Not researched in depth. | Outsourcing, data localisation (e.g. payment data), audit rights. | Customer contracts may impose localisation and regulator audit access. | Yes (per deal) |

### 2.2 European Union and United Kingdom

| Law / instrument | Applies when | Key obligations | Platform implication | Counsel? |
|---|---|---|---|---|
| **GDPR (EU) 2016/679** Art. 28, 32, 33 [S11] | EU customer (controller) sends personal data to Infollion (processor or sub-processor). Possibly direct application under Art. 3(2) for EU-based experts. | Art. 28(3) mandatory DPA content: documented instructions incl. transfers, confidentiality of personnel, Art. 32 security, sub-processor approval and flow-down, assistance with data subject rights and Arts. 32 to 36, deletion/return at end, audits. Art. 28(2) no sub-processor without written authorisation. Art. 32 security appropriate to risk. Art. 33(2) processor notifies controller without undue delay. | Standard Infollion DPA aligned to Art. 28; public sub-processor list with notice-and-objection; per-tenant deletion certificate; breach notice to customer target 24 hours (contract) so they can meet 72 hours. | Yes (templates) |
| GDPR Art. 9 special categories [S11] | Health data in medical AI projects; biometric data for unique identification (Track B if any face/voice identification). | Prohibited unless an Art. 9(2) condition (e.g. explicit consent) applies. Art. 4(14) defines biometric data. | Healthcare projects: require customer to warrant lawful basis and pseudonymisation before upload. Track B: explicit consent, no identification processing unless required, blur by default for delivery where customer allows. | Yes |
| GDPR Chapter V transfers, Art. 46 SCCs [S11, S15] | EU personal data processed in India or accessed by experts outside the EEA. India has no EU adequacy decision (inferred from EC list). | SCCs (Commission Decision 2021/914; Module 2 controller-to-processor, Module 3 processor-to-processor) plus transfer impact assessment and supplementary measures. | Sign SCCs with EU customers; TIA documenting India surveillance law context; supplementary measures: encryption with customer-scoped keys, no bulk export, access logging, data minimisation. Onward transfers to experts in other countries need flow-down. | Yes |
| EU-US Data Privacy Framework [S16] | Transfers EU to certified US entities. | General Court upheld DPF (3 Sept 2025, T-553/23); appeal C-703/25 P pending. | Relevant only if US sub-processors receive EU data. Prefer SCCs as backstop. | Confirm |
| **EU AI Act (EU) 2024/1689** Art. 10, 53, 113 [S12] | Infollion's customers who are providers of high-risk systems or GPAI models placed on the EU market. Infollion is generally a data supplier, not a provider. | Art. 10: data governance for training, validation, test sets (design choices, collection processes, data origin, original purpose for personal data, preparation operations like annotation and labelling, bias examination, gap identification). Art. 53: technical documentation, downstream info, copyright policy, public training-content summary per Commission template. Chapter V GPAI applies from 2 August 2025. | Ship a **dataset datasheet** with every delivery: collection process, annotator pool profile (aggregated), instructions/rubric version, QA method, known gaps, consent basis, licence, provenance manifest. Contractual "AI Act cooperation" clause. | Confirm |
| **Regulation (EU) 2026/1744** (Digital Omnibus on AI) [S13] | Published OJ 24 July 2026, in force 27 July 2026. | Defers Annex III high-risk obligations to 2 December 2027 and Annex I to 2 August 2028; transitional period for Art. 50 marking (per recitals). | Customer pressure for Art. 10 evidence arrives later than originally planned for high-risk; GPAI documentation pressure is already live. | Confirm |
| GDPR "Digital Omnibus" proposals [S24b] | Under negotiation (Council compromise text September 2026). | Possible changes to personal data definition and AI-training legitimate interest. Not law. | No design change; monitor. | No |
| **UK GDPR and Data (Use and Access) Act 2025** [S17] | UK customers or UK-based experts. Most DUAA Part 5 changes commenced 5 Feb 2026. | Processor terms similar to EU; transfers under UK IDTA or UK Addendum to EU SCCs; new "not materially lower" transfer test. | UK Addendum alongside EU SCCs; refresh TRAs. | Yes |

### 2.3 United States

| Law / instrument | Applies when | Key obligations | Platform implication | Counsel? |
|---|---|---|---|---|
| **HIPAA** Privacy and Security Rules, BAAs (45 CFR 164.502(e), 164.504(e), 164.308(b)) [S22, S23] | A US covered entity or business associate customer sends PHI to Infollion. Infollion would be a business associate or subcontractor BA. | Signed BAA before PHI; Security Rule administrative, physical, technical safeguards; breach notification to the covered entity; flow-down BAAs to subcontractors (including experts' employer entity if any). Security Rule overhaul NPRM (Jan 2025) not final; agenda target moved to July 2027. | **MVP policy: no PHI.** Customers must de-identify (HIPAA Safe Harbor or Expert Determination) before upload and warrant it. Offer a HIPAA tier later after a HIPAA risk analysis and BAA template. | Yes |
| **CCPA as amended by CPRA** [S18, S19] | California consumers' personal information handled for a covered business. Infollion as "service provider" or "contractor" to a customer. | Service provider contract terms (purpose limitation, no selling/sharing, assist with requests, notify if unable to comply); sensitive PI limits. New CPPA regs effective 1 Jan 2026: cybersecurity audits, risk assessments, ADMT on phased timelines. | Add CCPA service-provider addendum to standard DPA; customers may flow down audit and risk-assessment evidence requests from 2028. | Confirm |
| **Illinois BIPA** (740 ILCS 14) [S20] | Collection of biometric identifiers (face geometry, voiceprint, etc.) from Illinois residents. | Public written retention and destruction policy; informed written release before collection (electronic signature allowed since Aug 2024); no sale or profit; disclosure limits; private right of action; per-person single violation after SB 2979. | Track B: do not recruit Illinois participants, and do not process face/voice templates, until counsel approves. Geo-gate participant onboarding. | Yes |
| **Texas CUBI** (Bus. & Com. Code ch. 503) [S21] | Capture of biometric identifiers for a commercial purpose from Texas individuals. | Notice and consent before capture; no sale; destroy within reasonable time; AG penalties up to USD 25,000 per violation. | Same gate as BIPA. | Yes |
| Other state biometric/health data laws (e.g. Washington My Health My Data Act) | Not researched in depth. | Consent and specific notices for consumer health data and biometrics. | Track B jurisdiction allow-list. | Yes |
| **US Copyright Act** 17 U.S.C. 101, 201 [S24, S25] | US-based experts; US customers expecting ownership. | Work made for hire for non-employees only in nine statutory categories with a signed writing; otherwise author owns, so an express assignment is needed. Copyright Office: AI-generated material without sufficient human authorship is not protectable. | Expert agreement: work-for-hire acknowledgement where applicable plus present assignment and moral-rights waiver; disclose AI assistance in provenance. | Yes |

### 2.4 Contractual frameworks Infollion needs (not statutes, but legally load-bearing)

| Instrument | Parties | Must contain | Counsel? |
|---|---|---|---|
| Master Services Agreement + SOW | Infollion and customer | Scope, confidentiality, data ownership (customer owns inputs and deliverables), IP assignment of deliverables on payment, warranties (originality, no third-party AI unless authorised), liability caps with carve-outs for confidentiality breach, audit rights, termination and data return/deletion. | Yes |
| Data Processing Agreement (GDPR Art. 28 / DPDP processor / CCPA service provider) + SCCs + UK Addendum | Infollion and customer | Art. 28(3) items, sub-processor list, transfer mechanism, breach notice SLA, deletion certification, security annex mapping to SEC requirements. | Yes |
| BAA | Infollion and HIPAA customer | Only when HIPAA tier exists. | Yes |
| Expert Services Agreement + NDA + IP assignment | Infollion and each expert | Independent contractor status, confidentiality surviving termination, present assignment of all rights in work product (worldwide, full term, all media, consideration stated), moral-rights waiver or consent to modification and non-attribution where lawful, AI-tool prohibition unless authorised, device and workspace rules, monitoring and watermarking notice and consent, data protection notice (DPDP Rule 3), conflict-of-interest declaration, return/destruction obligations, governing law. | Yes |
| Project confidentiality addendum (click-through per project) | Infollion and expert | Project-specific restrictions (customer identity blind or disclosed, content warnings, PHI or legal privilege notes). | Confirm |
| Track B participant consent and release | Infollion (and possibly customer) and each participant | Plain-language description of capture, purposes (AI training, evaluation), recipients (customer type), retention, biometric notice, withdrawal and its limits after delivery, compensation, likeness/performer release, minors excluded, bystander rules, jurisdiction-specific addenda (BIPA, CUBI). | Yes |
| Dataset licence / delivery terms | Infollion and customer | Licence or assignment, permitted uses, attribution none, provenance manifest, warranty scope, takedown/withdrawal process for Track B. | Yes |
| Third-party AI provider terms | Infollion and LLM vendor | Zero data retention, no training on inputs, region, sub-processor disclosure, breach notice. | Confirm |

---

## 3. Standards and frameworks

| Standard | Use at Infollion | Status / notes |
|---|---|---|
| **OWASP ASVS 5.0.0** (May 2025) [S31] | Target Level 2 for the whole platform; Level 3 controls for authentication, access control, logging, and data protection on customer-content paths. Use as the security requirements checklist in PR review and pentest scope. | 5.0.0 renumbered chapters V1 to V17. Reference requirements as `v5.0.0-x.y.z`. |
| **OWASP API Security Top 10 2023** [S32] | Primary threat list for FastAPI. API1 BOLA and API3 BOPLA map directly to tenant and assignment checks; API4 to rate limiting; API9 to inventory; API10 to unsafe consumption of third-party APIs (LLM vendors). | |
| **OWASP Top 10 for LLM Applications 2025** [S33] | For any internal AI assist feature and for red-teaming projects: LLM01 prompt injection, LLM02 sensitive information disclosure, LLM03 supply chain, LLM06 excessive agency. | |
| **ISO/IEC 27001:2022** [S38] | ISMS certification target in phase 2 (12 to 18 months). Many Indian enterprise and EU customers ask for it; it also supports "reasonable security practices" arguments. | 2013 certificates expired 31 Oct 2025. |
| **ISO/IEC 27701** | Privacy extension, phase 3. | Not researched in depth. |
| **SOC 2 Type I then Type II** (AICPA 2017 TSC, 2022 points of focus) [S38] | US frontier labs typically require SOC 2 Type II. Type I at about month 9 to 12, Type II after a 3 to 6 month observation window. Scope: Security, Confidentiality; add Privacy later. | |
| **NIST SP 800-88 Rev. 2** (Sept 2025) [S34] | Media sanitisation program; cryptographic erase via KMS key deletion for tenant offboarding. | |
| CIS AWS Foundations Benchmark, AWS Security Hub FSBP | Cloud baseline from day 1. | Not fetched; widely used. |
| Datasheets for Datasets / Data Cards | Dataset documentation format to satisfy customer AI Act Art. 10 and Art. 53 needs. | Industry practice. |

### SOC 2 / ISO 27001 roadmap (proposed)

| Phase | Window | Deliverables |
|---|---|---|
| 0. Foundations | Month 0 to 3 (MVP build) | Policies (InfoSec, acceptable use, access control, data classification, retention, incident response, vendor management, secure SDLC); asset inventory; risk register; MFA everywhere; logging to India archive; CERT-In PoC registered; background checks policy for staff; expert agreement v1; DPA v1. |
| 1. Readiness | Month 3 to 9 | Compliance automation tool or spreadsheet control matrix mapping SEC-xxx to SOC 2 CC series and ISO Annex A; quarterly access reviews; vendor risk reviews; annual penetration test (external firm, ASVS L2 scope); tabletop exercise; security awareness training for staff and experts. |
| 2. SOC 2 Type I + ISO 27001 Stage 1 | Month 9 to 12 | Auditor engagement; evidence collection; gap remediation. |
| 3. SOC 2 Type II + ISO 27001 certification | Month 12 to 18 | 3 to 6 month observation; Stage 2 audit. |
| 4. Privacy and sector | Month 18+ | ISO 27701; HIPAA tier (risk analysis, BAA); possibly a DPDP audit if notified as SDF. |

---

## 4. Data categories handled

| Category | Examples | Who controls | Highest-applicable regimes |
|---|---|---|---|
| Customer confidential content | Prompts, model outputs, system prompts, eval rubrics, unreleased model behaviour | Customer | Contract (NDA, MSA), trade secret law |
| Personal data inside customer content | Names, emails in chats, user conversations, medical notes, legal case facts | Customer (controller); Infollion processor | GDPR, DPDP, CCPA, HIPAA (if PHI) |
| Expert-created work product | Ratings, rationales, corrected answers, red-team prompts, rubrics | Customer after assignment | Copyright Act (India), 17 USC, contract |
| Expert personal data | Identity, KYC, PAN/Aadhaar-derived data, bank details, credentials, performance, device/session telemetry | Infollion (fiduciary) | DPDP, SPDI Rules, GDPR for EU experts |
| Customer user data | Customer staff accounts, API keys | Infollion (fiduciary) for account data | DPDP, GDPR |
| Track B capture data | Video, audio, depth/IMU, faces, voices, home interiors, bystanders | Infollion and/or customer | GDPR Art. 9, BIPA, CUBI, DPDP, performer rights |
| Operational logs | Access logs, audit events, IPs | Infollion | CERT-In (180 days India), DPDP Rule 6/8 (1 year) |

---

## 5. Threat model

Method: asset-centric STRIDE with attacker profiles relevant to an expert network. Ratings: likelihood (L) and impact (I) on a 1 to 3 scale.

### 5.1 Actors

| Actor | Motivation | Capability |
|---|---|---|
| A1 Curious or opportunistic expert | Personal interest, side income, posting "interesting" prompts online | Legitimate access to assigned tasks; phone camera; browser tools |
| A2 Malicious or recruited expert (insider) | Paid by a competitor lab or a journalist to exfiltrate unreleased model behaviour | Multiple accounts, scripting, screen capture, collusion |
| A3 Account takeover attacker | Credential stuffing, phishing experts (large, diverse, less-managed population) | Commodity tooling |
| A4 Cross-tenant attacker (another customer) | Competitive intelligence | Valid customer API key; ID enumeration |
| A5 Infollion staff insider | Error or misuse | Admin consoles, DB access |
| A6 External attacker | Ransomware, data theft | Web app exploits, supply chain |
| A7 Third-party AI vendor / sub-processor | Data retention or training on inputs, breach at vendor | Receives data through integrations |
| A8 Track B participant or bystander | Withdraws consent, alleges unlawful capture | Legal claims |

### 5.2 Threats

| ID | Asset | Threat (STRIDE) | Actor | L | I | Primary controls (see SEC ids in architecture doc) |
|---|---|---|---|---|---|---|
| T1 | Customer content | Expert copies or photographs content and leaks it (Information disclosure) | A1, A2 | 3 | 3 | Assignment-scoped access, per-session watermark, copy friction, rate limits, anomaly detection, NDA + forensic attribution (SEC-030 to SEC-038) |
| T2 | Customer content | Expert reads tasks not assigned (BOLA) | A1, A2 | 2 | 3 | Assignment ABAC in API + RESTRICTIVE RLS (SEC-020 to SEC-024) |
| T3 | Tenant data | Customer A reads customer B data via ID guessing or missing filter (BOLA, Elevation) | A4 | 2 | 3 | RLS FORCE, tenant-scoped KMS keys, composite FKs, CI RLS test (SEC-020, SEC-025, SEC-040) |
| T4 | Expert accounts | Account takeover, then mass task access (Spoofing) | A3 | 3 | 3 | Phishing-resistant MFA, device binding, session limits, new-device step-up (SEC-001 to SEC-008) |
| T5 | Expert accounts | Account sharing or subcontracting work to unvetted people (Spoofing, Repudiation) | A1 | 3 | 2 | Liveness re-verification, device limits, behavioural signals, contract terms (SEC-006, SEC-036) |
| T6 | Storage | Long-lived or over-broad presigned URLs leaked in logs, chats, browser history | A1, A6 | 2 | 3 | 5-minute TTL, single object, proxy streaming for high-sensitivity tiers (SEC-045 to SEC-048) |
| T7 | Exports | Bulk export by compromised customer account | A3, A4 | 2 | 3 | Export requires step-up MFA, admin approval optional, export audit events, short-lived download (SEC-049) |
| T8 | Audit log | Insider deletes evidence (Tampering, Repudiation) | A5 | 1 | 3 | Append-only, hash chain, Object Lock anchor (SEC-060 to SEC-064) |
| T9 | Secrets | API keys in code, env files, images (Information disclosure) | A5, A6 | 2 | 3 | Secrets Manager, scanning, short-lived credentials (SEC-070 to SEC-074) |
| T10 | Third-party AI | Customer data sent to an LLM API that retains or trains on it | A5, A7 | 2 | 3 | Default-deny egress, AI gateway with per-project authorisation (SEC-090 to SEC-095) |
| T11 | PII in content | Experts see unnecessary PII; PII leaks into datasets | A1 | 3 | 2 | Presidio redaction pipeline, human review, classification (SEC-080 to SEC-086) |
| T12 | Expert devices | Malware on personal laptops scrapes rendered content | A6 | 2 | 3 | Browser hardening, CSP, managed-device requirement for Restricted tier, VDI for highest tier (SEC-033, SEC-039) |
| T13 | Web app | XSS via customer-supplied content rendered to experts (Elevation) | A4, A6 | 2 | 3 | Strict CSP, sanitised rendering, sandboxed iframes for HTML/markdown, no inline script (SEC-100 to SEC-103) |
| T14 | Uploads | Malicious files (macros, zip bombs, polyglots) uploaded by customer | A4, A6 | 2 | 2 | Quarantine bucket, AV scan, type validation, size caps (SEC-104) |
| T15 | Availability | DDoS or resource exhaustion on API | A6 | 2 | 2 | WAF, rate limits, quotas (SEC-105) |
| T16 | Deletion | Data persists after contract end in backups, caches, expert devices | A5 | 2 | 3 | Crypto-shred per tenant key, backup expiry, deletion certificate (SEC-110 to SEC-116) |
| T17 | Track B | Unlawful biometric capture, bystander capture, minors (legal) | A8 | 2 | 3 | Jurisdiction gating, consent workflow, blurring, separate plane (SEC-120 to SEC-128) |
| T18 | Provenance | Dataset contains work without valid rights assignment (legal) | A1 | 2 | 3 | Contract hash per contribution, provenance manifest, blocking delivery if missing (SEC-130 to SEC-133) |
| T19 | Incident handling | Missed 6-hour CERT-In window or customer SLA | A5 | 2 | 2 | Runbook, on-call, pre-drafted notices (SEC-140 to SEC-145) |
| T20 | Supply chain | Compromised npm/PyPI dependency or container base image | A6 | 2 | 3 | Lockfiles, SCA, image signing, minimal base images (SEC-106) |

### 5.3 Residual risk statement

Screen-level leakage by a determined insider (T1) cannot be prevented technically on unmanaged devices. The platform reduces volume (assignment scoping, rate limits), raises cost (copy friction, managed-device tier), and enables attribution (watermarks, audit trail) and legal recourse (NDA, assignment, CERT-In and police reporting). Customers with frontier-model secrecy needs should be offered the VDI or managed-device tier and a vetted, smaller expert pool.

---

## 6. Third-party model-provider (LLM API) risk

| Risk | Detail | Policy response |
|---|---|---|
| Confidentiality breach | Customer prompts and unreleased model outputs sent to another lab's API could reach a competitor. | Never send customer data to any third-party AI without explicit written per-project authorisation from the customer naming the provider. |
| Retention and training | Vendor default retention for abuse monitoring; possible training on inputs depending on terms. | Only vendors with zero-data-retention or equivalent contractual terms; enterprise agreements; no consumer endpoints. |
| Cross-border | Vendor region outside customer-approved regions. | Region pinning; record in transfer register. |
| Expert-side tools | Experts pasting content into ChatGPT-like tools or browser AI extensions. | Contractual prohibition; paste-out friction; detection of large clipboard events; managed-device tier with extension allow-list. |
| AI-assisted work product | Experts using AI to write rationales undermines quality and copyright claims. | Disclosure requirement; detection signals; QA. |
| Prompt injection via customer content | Internal AI assist features reading untrusted content. | No tool access for internal LLM features; output treated as untrusted (OWASP LLM01, LLM06). |

---

## 7. Track B (physical AI capture) specific considerations

1. **Consent architecture:** per-participant written (electronic) informed consent, versioned and hashed, stored in `consent_records` with `capture_recording`, `capture_biometric`, `likeness_release` types (already in schema).
2. **Bystanders:** capture protocols that avoid third parties; automatic face blurring for non-consenting faces before any expert sees footage.
3. **Minors:** excluded. DPDP s.9 bars tracking or behavioural monitoring of children and requires verifiable parental consent [S1]; GDPR and US laws add further requirements.
4. **Jurisdiction allow-list:** start with India-only participants under DPDP plus SPDI (biometric information is SPDI today), then add others one by one after counsel review. Block Illinois and Texas at onboarding until approved.
5. **Biometric minimisation:** do not extract face templates or voiceprints; if customer needs identity linkage, use opaque participant IDs.
6. **Withdrawal:** define what withdrawal means after a dataset has been delivered (stop future use vs recall). This is a contract and counsel question.
7. **Separate plane:** dedicated S3 buckets, KMS keys, and IAM roles for Track B with stricter access.

---

## 8. Questions requiring qualified counsel (prioritised)

| Priority | Question | Jurisdiction |
|---|---|---|
| P0 | Infollion's role (fiduciary vs processor) per data category, and whether DPDP s.17(1)(d) applies to foreign-customer projects. | India |
| P0 | Exact DPDP commencement dates and any 2026 amendment; whether to treat 13 Nov 2026 as the target. | India |
| P0 | Expert agreement: enforceable present assignment of future works worldwide and perpetual; moral rights (s.57); contractor status; consideration wording. | India, US, EU/UK for overseas experts |
| P0 | Standard DPA + SCC module choice + TIA for EU customers; UK Addendum. | EU, UK |
| P0 | Policy on PHI and BAAs (recommend no PHI at MVP). | US |
| P1 | DPDP Rule 8(3) one-year retention: content vs logs, and interaction with customer deletion instructions. | India |
| P1 | CERT-In reporting for incidents affecting foreign customers, and sequencing with customer notice obligations. | India |
| P1 | Monitoring and watermarking of experts: lawful basis (consent vs legitimate use) and notice wording. | India, EU |
| P1 | Track B consent, biometric, performer, bystander, withdrawal; jurisdiction allow-list. | India, EU, US states |
| P2 | Whether Infollion needs an EU Art. 27 representative or UK representative. | EU, UK |
| P2 | Dataset licensing model (assignment vs exclusive licence), warranties about AI-assisted content. | All |
| P2 | Export controls and sanctions screening for customers and experts. | India, US, EU |

---

## 9. Sources (all accessed 2026-10-20)

Type key: **official** = government/regulator/standards body or vendor's own documentation; **legal text** = statute, regulation or gazette text; **independent** = law firm, tracker, press; **inferred** = reasoning from sources, not directly stated.

| ID | Title | URL | Type | Notes |
|---|---|---|---|---|
| S1 | The Digital Personal Data Protection Act, 2023 (No. 22 of 2023), Gazette of India | https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf | legal text | Read in full (ss.3, 5 to 17, 44, Schedule). |
| S2 | Digital Personal Data Protection Rules, 2025, G.S.R. 846(E), 13 Nov 2025 | https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf | legal text | Read Rules 1 to 23 and Schedules. |
| S3 | PIB Backgrounder "DPDP Rules, 2025 Notified", 17 Nov 2025 | https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf | official | States 18-month phased compliance; 90-day rights response. |
| S4 | PIB press release "Government notifies DPDP Rules..." (PRID 2190014) | https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190014 | official | Page returned 403; content via search snippet. |
| S5 | G.S.R. 843(E) commencement schedule (tracker) | https://dpdp.myndsolution.com/wiki/notifications/gsr-843e-2025-commencement/ | independent | Taxmann summary conflicts on s.44(1)/(3): https://www.taxmann.com/post/blog/govt-notifies-commencement-dates-for-dpdp-act/ |
| S6 | MeitY considers reducing DPDPA compliance timelines (26 Jan 2026); DPDP Rules timeline as at Sept 2026 | https://takshashila.org.in/content/blogs/20260126-meity-considers-reducing-dpdpa-compliance-timelines.html ; https://www.mirvolegal.com/insights/dpdp-rules-2025-compliance-timeline/ | independent | No amendment found. |
| S7 | DPDP (Removal of Difficulties) Order 2026 | https://www.india-briefing.com/news/dpdp-removal-of-difficulties-order-2026-consent-data-audit-47274.html | independent | Unverified against Gazette. |
| S8 | CERT-In Directions under s.70B(6) IT Act, No. 20(3)/2022-CERT-In, 28 Apr 2022 | https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf | official | Read in full. |
| S9 | SPDI Rules 2011 summary (S.S. Rana) | https://ssrana.in/articles/information-technology-reasonable-security-practices-and-procedures-and-sensitive-personal-data-or-information/ | independent | Primary text not fetched. |
| S10 | Copyright Act 1957 (India Code PDF); s.17 to 19 summaries; Pine Labs v Gemalto summary | https://www.indiacode.nic.in/bitstream/123456789/1367/1/a195714.pdf ; https://vidhijudicial.com/sec-17-to-21-chapter-iv-(ownership-of-copyright-and-the-rights-of-the-owner)-the-copyright-act,-1957.html ; https://www.khuranaandkhurana.com/2011/05/25/pine-labs-pvt-ltd-vs-gemalto-terminals-india-pvt-ltd-others | legal text (not retrievable) / independent | India Code host refused fetch; relied on summaries. |
| S11 | Regulation (EU) 2016/679 (GDPR) | https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679 | legal text | Arts. 4(14), 9, 28, 33, 46 read. |
| S12 | Regulation (EU) 2024/1689 (AI Act) | https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32024R1689 | legal text | Arts. 10, 53, 113 read. |
| S13 | Regulation (EU) 2026/1744 (Digital Omnibus on AI) | https://eur-lex.europa.eu/eli/reg/2026/1744/oj/eng | legal text | Recitals 38, 40, 46 read; operative text not fully read. |
| S14 | European Commission, General-Purpose AI Code of Practice | https://digital-strategy.ec.europa.eu/en/policies/ai-code-practice | official | Via search; template published 24 July 2025 per law-firm summaries. |
| S15 | European Commission, Standard Contractual Clauses (SCC) | https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/standard-contractual-clauses-scc_en | official | Downloaded. |
| S16 | Latombe v Commission appeal (C-703/25 P) | https://digitalpolicyalert.org/event/35459-latombe-filed-appeal-against-general-court-dismissal-of-challenge-to-european-unionunited-states-data-protection-framework-adequacy-decision-in-latombe-v-commission | independent | |
| S17 | UK Data (Use and Access) Act 2025 commencement and transfers | https://www.burges-salmon.com/articles/102mh1d/the-data-use-and-access-act-2025-key-implications-for-businesses-as-the-new-in/ ; https://www.mfmac.com/insights/manufacturing-media-technology/major-provisions-of-the-uk-data-use-and-access-act-2025-take-effect/ | independent | ICO page: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/international-data-transfer-agreement-and-guidance/ (official, downloaded) |
| S18 | California AG, CCPA | https://oag.ca.gov/privacy/ccpa | official | |
| S19 | CPPA updated regulations (DLA Piper, Sept 2025) | https://www.dlapiper.com/en/insights/publications/2025/09/ccpa-2025-updated-regulations | independent | |
| S20 | BIPA amendment SB 2979 (Davis Wright Tremaine, Aug 2024); statute page | https://dwt.com/blogs/privacy--security-law-blog/2024/08/illinois-bipa-biometrics-law-amended-for-damages ; https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004&ChapterID=57 | independent / legal text (not retrievable) | |
| S21 | Texas AG, Capture or Use of Biometric Identifier Act | https://www.texasattorneygeneral.gov/consumer-protection/file-consumer-complaint/consumer-privacy-rights/biometric-identifier-act | official | |
| S22 | HHS, Business Associates; Sample BAA provisions | https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/business-associates/index.html ; https://www.hhs.gov/hipaa/for-professionals/covered-entities/sample-business-associate-agreement-provisions/index.html | official | Host refused fetch; BAA rule references from prior knowledge of 45 CFR. |
| S23 | "Feds push back HIPAA security rule overhaul to July 2027" (Fierce Healthcare) | https://www.fiercehealthcare.com/health-tech/feds-push-back-hipaa-security-rule-overhaul-july-2027 | independent | |
| S24 | 17 U.S.C. 101 (Cornell LII) | https://www.law.cornell.edu/uscode/text/17/101 | legal text | |
| S24b | EU Digital Omnibus (GDPR) status (Hogan Lovells) | https://hlc.com/en/publications/eu-digital-omnibus-where-simplification-is-likely-and-what-businesses-should-plan-for | independent | |
| S25 | US Copyright Office, Copyright and Artificial Intelligence | https://www.copyright.gov/ai/ | official | Part 2 (29 Jan 2025). |
| S26 | PostgreSQL documentation, Row Security Policies | https://www.postgresql.org/docs/current/ddl-rowsecurity.html | official | |
| S27 | AWS, Sharing objects with presigned URLs | https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html | official | |
| S28 | AWS, S3 Object Lock | https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html | official | |
| S29 | AWS KMS, ABAC for AWS KMS | https://docs.aws.amazon.com/kms/latest/developerguide/abac.html | official | Downloaded; general reference. |
| S30 | Presidio documentation | https://presidio.dataprivacystack.org/ | official (project) | "no guarantee that Presidio will find all sensitive information". |
| S31 | OWASP ASVS project page; release v5.0.0 | https://owasp.org/www-project-application-security-verification-standard/ ; https://github.com/OWASP/ASVS/releases | official | |
| S32 | OWASP API Security Top 10 2023 | https://owasp.org/API-Security/editions/2023/en/0x11-t10/ | official | |
| S33 | OWASP Top 10 for LLM Applications 2025 | https://genai.owasp.org/llm-top-10/ | official | |
| S34 | NIST SP 800-88 Rev. 2, Guidelines for Media Sanitization | https://csrc.nist.gov/pubs/sp/800/88/r2/final | official | |
| S35 | Indian Contract Act 1872 s.27 | (not fetched) | inferred | Well-known rule; verify with counsel. |
| S36 | Texas TRAIGA AI-training carve-outs to CUBI | https://itecsonline.com/post/texas-biometric-identifier-act-cubi-a-compliance-guide-for-businesses-capturing-fingerprints-faces-or-voices | independent | Vendor blog; unverified. |
| S37 | General Court Latombe judgment analysis | https://www.kyprianou.com/?p=19190 | independent | |
| S38 | ISO/IEC 27001:2022 transition (BSI guide); SOC 2 2022 points of focus (Barr Advisory) | https://www.bsigroup.com/globalassets/localfiles/en-au/ISO%2027001/documents/iso-iec-27001-transition-guide.pdf ; https://www.barradvisory.com/blog/whats-new-with-soc-2 | independent | |
