# Security and Data Governance Agent: Working Notes

Prepared by: Security & Data Governance Agent
Date: 2026-10-20
Scope: Infollion expert-powered AI evaluation and training-data platform (Track A: text/code/multimodal evaluation; Track B: physical AI capture, later).
Companion outputs:
- `research/security_and_compliance.md` (legal and regulatory landscape, standards, threat model, sources)
- `architecture/security_architecture.md` (concrete controls and SEC-xxx requirements)

Status of this document: working notes. Nothing here is legal advice. Items marked "COUNSEL" must be confirmed by qualified lawyers in the relevant jurisdiction before they drive contracts or product commitments.

---

## 1. Method

1. Pulled primary texts wherever the host allowed it: DPDP Act 2023 (MeitY PDF), DPDP Rules 2025 (Gazette G.S.R. 846(E)), CERT-In Directions of 28 April 2022, GDPR (EUR-Lex), EU AI Act 2024/1689 (EUR-Lex), Regulation (EU) 2026/1744 (Digital Omnibus on AI, EUR-Lex), PostgreSQL and AWS documentation, OWASP project pages, Presidio documentation, NIST SP 800-88r2 listing, US Copyright Office AI page, California AG CCPA page.
2. Several Indian and US government hosts returned HTTP 403 or refused connections to the fetch tool (indiacode.nic.in, pib.gov.in press release pages, hhs.gov, ilga.gov). For those, I used independent law-firm or tracker summaries and marked the claim type as "independent" rather than "official". Where I could not verify a point, I say so.
3. Cross-checked the existing platform design (`architecture/database_design.md`, `product/user_personas_and_roles.md`) so controls fit the planned schema: `org_id` on every tenant row, `SET LOCAL app.org_id`, `app_rw` NOBYPASSRLS role, `audit.audit_events` append-only with hash chain, `consent_records` table.

---

## 2. Key verified facts (with confidence)

### 2.1 India

| # | Fact | Source | Confidence |
|---|---|---|---|
| F1 | DPDP Rules 2025 notified as G.S.R. 846(E), Gazette dated 13 November 2025. Rules 1, 2, 17 to 21 in force on publication; Rule 4 (Consent Manager) one year after publication; Rules 3, 5 to 16, 22, 23 eighteen months after publication. | DPDP Rules Gazette text, Rule 1 | High (primary text read) |
| F2 | Computed dates: Rule 4 about 13 November 2026; substantive rules (notice, security safeguards, breach intimation, retention, rights, cross-border) about 13 May 2027. Some sources count from 14 November (PIB says "notified on 14 November 2025"). | Rule 1 + PIB backgrounder 17 Nov 2025 | High on structure, medium on the exact day. COUNSEL to confirm. |
| F3 | Act commencement notification G.S.R. 843(E): sections 1(2), 2, 18 to 26, 35, 38 to 43, 44(1) and 44(3) on publication; s.6(9) and s.27(1)(d) after one year; the core obligations (ss.3 to 17 except as above, 27 to 34, 36, 37, 44(2)) after eighteen months. | Independent tracker (dpdp.myndsolution.com); Taxmann summary conflicts on s.44(1)/(3) | Medium. COUNSEL. |
| F4 | s.44(2) of DPDP Act omits s.43A of the IT Act. Since s.44(2) is in the 18-month tranche, s.43A and the SPDI Rules 2011 continue to apply until about May 2027. | DPDP Act text s.44(2); F3 | Medium-high. COUNSEL. |
| F5 | MeitY consulted in January 2026 on compressing the 18-month window to 12 months (which would bring obligations to about 13 November 2026). No amending notification found as of the latest secondary review (September 2026). | Takshashila, MirvoLegal, GoTrust | Medium. Must re-check Gazette before relying. |
| F6 | Secondary sources report a "DPDP (Removal of Difficulties) Order 2026" (published about 7 October 2026) making textual clarifications to s.9(1) and s.10(2). Not verified against the Gazette. | India Briefing | Low. Flag only. |
| F7 | Rule 6: minimum reasonable security safeguards include encryption, obfuscation, masking or virtual tokens; access control; logs, monitoring and review; continued processing (backups); retain logs and personal data for one year for detection/investigation unless law requires otherwise; processor contract clauses; technical and organisational measures. | Rules text, Rule 6 | High |
| F8 | Rule 7: notify each affected Data Principal without delay; notify the Board without delay and a detailed report within 72 hours (extendable by the Board on written request). | Rules text, Rule 7 | High |
| F9 | Rule 8(3): retain personal data, associated traffic data and processing logs for a minimum of one year from processing for Seventh Schedule purposes, then erase unless other law requires. Applies to processing by Data Processors too (Illustration, Case 2). | Rules text, Rule 8(3) | High. Note: tension with "erase when purpose served" must be designed for. |
| F10 | Rule 14(3): grievance redressal period not exceeding 90 days. | Rules text, Rule 14(3) | High |
| F11 | Rule 15: cross-border transfer permitted subject to requirements the Central Government may specify by order regarding making data available to a foreign State or entities it controls (negative-list style). Rule 13(4): Significant Data Fiduciaries may be required to localise specified categories. | Rules text | High |
| F12 | DPDP Act s.17(1)(d): Chapter II (except s.8(1) and s.8(5)), Chapter III and s.16 do not apply where personal data of Data Principals not within India is processed under a contract with a person outside India by a person based in India. Security safeguards (s.8(5)) and fiduciary responsibility (s.8(1)) still apply. | DPDP Act text | High on text. Applicability to Infollion's contracts: COUNSEL. |
| F13 | DPDP penalties schedule: up to INR 250 crore for failing reasonable security safeguards; up to INR 200 crore for failing breach notification; up to INR 200 crore for children's obligations; up to INR 50 crore residual. | DPDP Act Schedule | High |
| F14 | DPDP Act s.7(i): "for the purposes of employment or those related to safeguarding the employer from loss or liability, such as prevention of corporate espionage, maintenance of confidentiality of trade secrets, intellectual property..." is a legitimate use. Whether it covers contractor experts (not employees) is unclear. | DPDP Act text | COUNSEL |
| F15 | CERT-In Directions (28 April 2022, under s.70B(6) IT Act): report Annexure I incidents within 6 hours of noticing; synchronise clocks to NIC/NPL NTP or traceable sources; designate a Point of Contact; enable logs of all ICT systems and maintain them securely for a rolling 180 days within Indian jurisdiction; data centres, VPS, cloud and VPN providers keep subscriber KYC for 5 years. Effective 60 days after issue. Annexure I explicitly includes data breach, data leak, unauthorised access, and attacks on AI/ML systems. | CERT-In Directions PDF | High |

### 2.2 EU / UK

| # | Fact | Source | Confidence |
|---|---|---|---|
| F16 | GDPR Art. 28(3): processor contract must cover documented instructions (including on transfers), confidentiality of authorised persons, Art. 32 security, sub-processor conditions, assistance with rights and Arts. 32 to 36, deletion or return at end, audit support. Art. 28(2): no sub-processor without prior specific or general written authorisation. | GDPR text | High |
| F17 | GDPR Art. 9(1): biometric data "for the purpose of uniquely identifying a natural person" and health data are special categories. Art. 4(14) biometric data definition covers facial images when processed by specific technical processing that allows or confirms unique identification. | GDPR text | High |
| F18 | GDPR Art. 33(1): controller notifies the supervisory authority without undue delay and where feasible within 72 hours. Art. 33(2): processor notifies controller without undue delay. | GDPR text | High |
| F19 | GDPR Art. 46(2)(c): Commission SCCs are an appropriate safeguard. India has no EU adequacy decision (not on the EC adequacy list as of the SCC page). Commission SCCs 2021/914 include a processor-to-processor module. | GDPR text, EC SCC page | High on law; "no India adequacy" is inferred from the adequacy list. |
| F20 | EU-US DPF: General Court dismissed Latombe's challenge on 3 September 2025 (T-553/23); appeal filed 31 October 2025 (C-703/25 P), pending per sources found. | Digital Policy Alert, Kyprianou | Medium |
| F21 | EU AI Act Art. 113 (original): GPAI obligations (Chapter V) apply from 2 August 2025; general application 2 August 2026. Regulation (EU) 2026/1744 (Digital Omnibus on AI), dated 8 July 2026, OJ 24 July 2026, in force 27 July 2026, defers Annex III high-risk obligations to 2 December 2027 and Annex I to 2 August 2028 (per recitals). GPAI dates not changed in the excerpt read. | EUR-Lex AI Act and 2026/1744 | High on dates in recitals; operative Article 113 text not read in full. |
| F22 | AI Act Art. 10: training, validation and test data for high-risk systems subject to data governance covering design choices, collection processes and origin of data, and for personal data the original purpose of collection; also bias examination, gaps. | AI Act text | High |
| F23 | AI Act Art. 53(1): GPAI providers must keep technical documentation, provide downstream documentation, have a copyright policy, and publish a sufficiently detailed training-content summary using the Commission template (published 24 July 2025). | AI Act text; EC code of practice page; law-firm summaries | High on Article; medium on template details |
| F24 | GDPR "Digital Omnibus" amendments are still under negotiation as of September 2026 (not law). | Hogan Lovells, GDPR Local | Medium |
| F25 | UK Data (Use and Access) Act 2025: most Part 5 data protection changes, including the "not materially lower" transfer test, commenced 5 February 2026. ICO updated transfer guidance 15 January 2026. | Burges Salmon, MFMac | Medium |

### 2.3 United States

| # | Fact | Source | Confidence |
|---|---|---|---|
| F26 | BIPA (740 ILCS 14): written policy with retention schedule; informed written release before collection; no sale/profit; disclosure limits; reasonable care. SB 2979 (signed 2 August 2024): repeated collection from the same person by the same method is a single violation; electronic signature satisfies "written release". | DWT, GT Law, Paul Hastings | Medium-high (statute page not reachable) |
| F27 | Texas CUBI: notice and consent before capturing biometric identifiers (including face geometry, voiceprint) for a commercial purpose; destroy within a reasonable time; AG enforcement up to USD 25,000 per violation. | Texas AG page | High |
| F28 | CCPA as amended: CPPA regulations on cybersecurity audits, risk assessments and ADMT approved by OAL 23 September 2025, effective 1 January 2026, phased deadlines (risk assessment submissions from April 2028; audits from April 2028 to 2030 by revenue; ADMT from 1 January 2027). | DLA Piper, JD Supra | Medium |
| F29 | HIPAA Security Rule overhaul NPRM published 6 January 2025; final action moved to July 2027 on the regulatory agenda per press reports; current Security Rule governs. Business associates and their subcontractors must have BAAs (45 CFR 164.502(e), 164.504(e), 164.308(b)). | Fierce Healthcare; HHS pages not reachable, BAA rule from my prior knowledge of the CFR | Medium. COUNSEL. |
| F30 | 17 U.S.C. 101: "work made for hire" for non-employees only covers nine enumerated categories (e.g. contribution to a collective work, compilation, instructional text, test, answer material for a test) and only with a signed written agreement. Annotations, evaluations and rationales by independent contractors may not fit; a backup assignment clause is needed. | Cornell LII 17 USC 101 (downloaded; section not parsed due to quote encoding, content from prior knowledge) | Medium. COUNSEL. |
| F31 | US Copyright Office AI report Part 2 (29 January 2025) addresses copyrightability of generative AI outputs; human authorship required. | copyright.gov/ai | High |

### 2.4 Standards and technical

| # | Fact | Source |
|---|---|---|
| F32 | PostgreSQL: superusers and roles with BYPASSRLS always bypass RLS; table owners bypass unless `FORCE ROW LEVEL SECURITY`; multiple permissive policies are OR-combined, restrictive ones AND-combined. | PostgreSQL docs |
| F33 | S3 presigned URLs: SigV4 max 7 days with IAM user keys; when signed with temporary credentials (role, STS) the URL expires when the credentials expire, even if a longer expiry is requested. | AWS S3 docs |
| F34 | S3 Object Lock compliance mode: no user, including root, can overwrite or delete a locked object version or shorten retention until expiry. | AWS S3 docs |
| F35 | Presidio: analyzer (NER, regex, rules, checksums, context), anonymizer, image redactor (OCR), structured module. Docs state "there is no guarantee that Presidio will find all sensitive information". Project now under "Data Privacy Stack", transitioning to community ownership. | Presidio docs |
| F36 | OWASP ASVS 5.0.0 released May 2025 (chapters V1 to V17); OWASP API Security Top 10 2023 (API1 BOLA through API10 Unsafe Consumption of APIs); OWASP Top 10 for LLM Applications 2025 (LLM01 Prompt Injection, LLM02 Sensitive Information Disclosure, etc.). | OWASP pages |
| F37 | NIST SP 800-88 Rev. 2 published 26 September 2025; Rev. 1 withdrawn; cryptographic erase remains a recognised technique. | NIST CSRC |
| F38 | ISO/IEC 27001:2013 certificates expired 31 October 2025; certification only to 27001:2022. SOC 2 uses 2017 Trust Services Criteria with 2022 revised points of focus. | Certification body and auditor blogs (independent) |

---

## 3. Reasoning notes and design decisions

1. **Infollion's DPDP role is mixed.** For expert personal data (KYC, bank details, credentials, performance), Infollion is the Data Fiduciary. For customer-supplied content that contains personal data, Infollion is most likely a Data Processor (DPDP) and processor/sub-processor (GDPR) acting on the customer's documented instructions. For Track B capture participants it recruits, Infollion is likely a Fiduciary/controller, possibly joint with the customer. COUNSEL to confirm per contract model.
2. **s.17(1)(d) does not remove security duties.** Even if foreign-data-principal processing for foreign customers is largely exempt from Chapter II and III, s.8(5) security safeguards still apply, CERT-In still applies, and GDPR/HIPAA contractual flows still bind. Design to the stricter standard everywhere.
3. **Two retention floors pull against "delete on request".** CERT-In needs 180 days of ICT logs in India; DPDP Rule 6(1)(e) and Rule 8(3) need one year of logs (and possibly the personal data processed) from about May 2027. Customer DPAs will demand deletion at contract end. Resolution: separate content from logs. Delete content per contract; keep minimal, content-free processing logs for at least 12 months in India; never put prompt or output text in logs. COUNSEL on whether Rule 8(3) "such personal data" requires keeping content itself.
4. **Logs must stay in India (CERT-In).** Primary region ap-south-1 (Mumbai). Log archive and DR copies within India (ap-south-2 Hyderabad is a candidate; verify service availability). If an EU customer requires EU-only data residency, the content plane can be regional, but India-located logs of access will still exist; disclose this in the DPA.
5. **Assignment-scoped ABAC belongs in the database too.** The existing RLS design sets `app.org_id` from the assignment, which means an expert session could read any task in that tenant if the service layer forgets the `assignment_id` filter. Add a RESTRICTIVE policy keyed on `app.actor_kind = 'expert'` and the live assignment set. Captured in the architecture doc.
6. **Watermarking and copy protection are deterrence, not prevention.** Any content rendered on a screen can be photographed. Value: attribution after a leak (per-session visible and invisible watermarks), friction against bulk copying, and contractual consequences. State this plainly to customers.
7. **Third-party LLMs default to OFF.** Internal tooling (auto-PII detection, QA assist, translation) must use self-hosted models or approved providers only when the customer has opted in per project, with zero-retention terms, region constraints, and logging. Customer contracts must say this. This is also the single largest source of reputational risk with frontier lab customers.
8. **Track B is a different risk class.** Video of people performing tasks contains faces (biometric identifiers if processed for identification, and plausibly treated as biometric/special category in several regimes regardless), voices, home interiors, bystanders, possibly children. Needs written informed consent per participant, bystander handling, face/voice blurring options, a separate storage plane with separate keys, and jurisdiction gating (no Illinois or Texas participants until counsel signs off).
9. **IP chain of title is a product feature.** Customers buying datasets need proof that every expert and participant assigned rights. Under the Indian Copyright Act s.19, assignment must be in writing, signed, and if duration and territory are not specified they default to five years and India only (per the Pine Labs line of cases as summarised by independent sources). So the expert agreement must state worldwide, perpetual (full term of copyright), all media, and include moral-rights waivers to the extent permitted (Indian s.57 moral rights may not be fully waivable: COUNSEL). Store a signed agreement hash against every contributing expert and every delivered item (provenance manifest).

---

## 4. Open questions for counsel (consolidated)

1. DPDP: exact commencement dates and whether any 2026 amendment shortened the 18-month window or added a Removal of Difficulties Order relevant to processors.
2. DPDP: does s.17(1)(d) apply to Infollion's processing for foreign customers whose data subjects are outside India, and does it extend to experts who are outside India?
3. DPDP: Infollion's role per data category (fiduciary vs processor) and resulting contract templates.
4. DPDP Rule 8(3): does the one-year minimum apply to the personal data content itself or only to traffic data and logs? How does it interact with a customer's contractual deletion instruction?
5. CERT-In: is Infollion a "body corporate" required to report (yes on the text) and, for customer-side incidents in foreign jurisdictions, what must be reported to CERT-In vs the customer, and in which order, given contractual confidentiality (CERT-In FAQ reportedly says reporting overrides contractual confidentiality)?
6. GDPR: is Infollion subject to GDPR directly under Art. 3(2) for EU-based experts (Infollion offering work to EU residents is not "goods or services to data subjects" in the usual sense, but monitoring behaviour of EU experts might be), and does it need an Art. 27 EU representative?
7. GDPR: transfer mechanism for EU customer data to India (SCC Module 2 or 3, plus transfer impact assessment) and onward transfers to experts in third countries.
8. HIPAA: will Infollion sign BAAs? If yes, Infollion becomes a business associate or subcontractor and must implement the Security Rule; recommend declining PHI until the controls and a HIPAA risk analysis exist.
9. IP: enforceability under Indian law of worldwide perpetual assignment of future works by contractor experts; treatment of moral rights (Copyright Act s.57); position of experts in the EU, UK and US (work-for-hire limits, need for assignment and moral-rights waivers).
10. IP: copyrightability of AI-assisted annotations and whether customers need warranties about it.
11. Non-solicit and non-compete: Indian Contract Act s.27 voids restraints of trade; confidentiality and non-solicitation drafted narrowly.
12. Track B: lawful basis and form of consent for video/biometric capture in each participant jurisdiction (India DPDP, GDPR Art. 9(2)(a), BIPA, CUBI, Washington), bystanders, minors, revocation consequences for already-delivered datasets.
13. EU AI Act: does Infollion's dataset provision create any direct obligation (likely not as a provider), and what Art. 10 and Art. 53 documentation must Infollion supply to customers contractually?
14. Export control and sanctions screening for customers and experts (not researched in depth here).

---

## 5. Things I could not verify in this session

- PIB press release pages, indiacode.nic.in statute pages, hhs.gov and ilga.gov pages (403 or connection refused). Claims sourced from these use independent summaries.
- The exact operative text of the amended AI Act Article 113 after Regulation 2026/1744 (only recitals read).
- Whether MeitY has notified any SDF list or a Rule 15 order naming restricted countries.
- Whether ap-south-2 supports every service needed (KMS multi-Region replicas, Object Lock, etc.).
- SPDI Rules 2011 Rule 8 wording about IS/ISO/IEC 27001 as a deemed reasonable practice (independent sources did not quote it).
- Texas TRAIGA (HB 149) carve-outs for AI training mentioned by one vendor blog.

---

## 6. Sources consulted (accessed 2026-10-20)

Full table with types is in `research/security_and_compliance.md` section 9. Short list:

- DPDP Act 2023: https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf
- DPDP Rules 2025: https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf
- PIB backgrounder 17 Nov 2025: https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf
- CERT-In Directions 28 Apr 2022: https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf
- GDPR: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679
- EU AI Act: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32024R1689
- Regulation (EU) 2026/1744: https://eur-lex.europa.eu/eli/reg/2026/1744/oj/eng
- PostgreSQL RLS: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- AWS S3 presigned URLs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
- AWS S3 Object Lock: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- Presidio: https://presidio.dataprivacystack.org/
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP API Top 10 2023: https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- OWASP LLM Top 10 2025: https://genai.owasp.org/llm-top-10/
