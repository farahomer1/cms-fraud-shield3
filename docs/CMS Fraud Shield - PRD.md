# PRD: CMS Fraud Shield (Prototype)

## 0\. Document Purpose

This PRD defines the functional requirements for a working prototype of **CMS Fraud Shield**, a four-agent AI platform that intercepts Medicare fraud before payment. It is written for the development team building the prototype and for the business sponsor who authored the source materials. It consolidates four inputs: the pitch deck (`cms_fraud_shield_presentation.pdf`), the fraud-detection rule set (`cms_rules_provided.docx`, rules R-01–R-04), the sponsor's first answer set (`updates.md`), and the sponsor's scoring-and-appeals response (2026-07-30), which resolved OQ-1–OQ-4. A validation pass (rubric \+ adversarial review, 2026-07-30; see `validation-report.md`) has been folded in: gaps the dev team can resolve carry a proposed default tagged `[ASSUMPTION]`, and decisions that reshape the sponsor's story are routed to §8. Requirements are grouped by feature with globally numbered, stable FR IDs; all inline assumptions are indexed in §9. **§8 Open Questions is the authoritative list of items still requiring sponsor input.**

## 1\. Vision

CMS Fraud Shield demonstrates a shift from Medicare's historical "pay-and-chase" posture — recovering fraudulent payments months after disbursement — to real-time, pre-payment prevention. Four cooperating AI agents simulate emerging fraud vectors, hold suspect claims before any money moves, harden enrollment and prior-authorization controls, and hand prosecution-ready referrals to federal law enforcement. Legitimate providers caught in a false-positive hold are cleared in seconds by an automated Level 1 appeals check, keeping care friction below a hard KPI.

The prototype proves this story end-to-end against a realistic, fully synthetic recreation of the 2023–2024 DME catheter fraud pattern: the **Viktor Scenario**, in which a fraud syndicate acquires 15 dormant DME suppliers, buys 100,000+ stolen MBIs, and submits $400M in fake catheter claims across 8 states. Success means the system ingests a mixed stream of legitimate and fraudulent synthetic claims, detects the scheme via policy-grounded rules R-01–R-04, disburses $0 against it, protects legitimate providers from wrongful holds, and outputs a referral dossier — running live on GCP services, not as a scripted playback.

## 2\. Target User

### 2.1 Jobs To Be Done

- **Business sponsor / presenter:** demonstrate to CMS Center for Program Integrity (CPI) stakeholders that pre-payment, multi-agent fraud interception is real and buildable — not slideware.  
- **CMS integrity analyst (demo persona "Sarah"):** see fraud flagged, held, and packaged for enforcement in minutes rather than months, with human review preserved for borderline cases.  
- **Development team:** build against explicit, testable requirements rather than inventing domain behavior.

### 2.2 Non-Users (v1)

- Actual CMS production systems, real claims processors, and real law-enforcement recipients. The prototype is demonstration-only; nothing it emits leaves the demo environment.

### 2.3 Key User Journeys

- **UJ-1. The Viktor Scenario is intercepted end-to-end.**  
    
  - **Persona \+ context:** Sarah, a CMS integrity lead, watches the platform respond to an active fraud campaign.  
  - **Entry state:** Synthetic claim traffic (normal \+ embedded Viktor scheme) is streaming into the system on the simulation clock (FR-28); all four agents are running.  
  - **Path:** (1) Agent 1 detects a spike in dormant-supplier ownership transfers and simulates a multi-state catheter billing attack vector, raising an early warning. (2) As the scheme's claims arrive, Agent 2 scores them against R-01–R-04; claims with ≥2 corroborating rule hits (Score 0.95) are held pre-payment in real time. (3) Agent 3 audits enrollment links across the held claims, unmasks the 15-supplier shell network, and locks down compromised MBIs and prior-auth gaps. (4) Agent 4 compiles the DOJ NFED referral dossier and recommends a nationwide claim-edit policy update.  
  - **Climax:** Sarah sees the scheme total: $0 disbursed, shell enrollments flagged for revocation, dossier generated.  
  - **Resolution:** Single-rule-hit claims (Score 0.70) sit in the 24-hour Auditor Review Queue; clean traffic disburses immediately through simulated HIGLAS.  
  - **Edge case:** A legitimate provider's claim trips one rule (Score 0.70); it routes to the Auditor Review Queue instead of an instant hold, and is released without payment disruption beyond the review window.


- **UJ-2. A false-positive hold is auto-released in seconds (Eleanor Vance).**  
    
  - **Persona \+ context:** Eleanor Vance, a legitimate beneficiary with severe urological needs, whose billing exceeds her R-01 quantity cap; her clinic is a genuine provider. Her MBI is among the 100K+ stolen by the syndicate.  
  - **Entry state:** Her claim reaches Score 0.95 via two rule hits: **R-01** (quantity over her cap, with no prior auth or modifier attached to this claim) plus **R-03** (her stolen MBI is simultaneously billed by Viktor shell suppliers, tripping the 3-NPIs-in-48-hours velocity rule). `[ASSUMPTION: dev-proposed rule-hit pair for the narrative — claim-scoped, so it does not propagate 0.95 scores across her clinic's other patients; see OQ-14.]`  
  - **Path:** (1) The clinic files an electronic appeal (fired by the demo scenario driver, FR-29). (2) The Level 1 Pre-Payment Appeals check cross-references clinical consult registries and finds a valid CPT-99214 telehealth urology consult (with ICD-10 N31.9) on record within 10 days of the held claim's service date. (3) The hold is auto-released.  
  - **Climax:** Release completes in under 3 seconds — the demo surface reports $0.00 administrative cost, versus a 120-day manual backlog.  
  - **Resolution:** The claim disburses; the release is counted in the false-positive friction metric, which stays below the 1.5% KPI.


- **UJ-3. A fraudulent appeal fails and escalates (William Jackson).**  
    
  - **Persona \+ context:** "William Jackson" is a synthetic identity billed by a Viktor shell company attempting to siphon 1,500 catheters.  
  - **Entry state:** The claim is under an instant Pre-Payment Hold; the syndicate files an electronic appeal to shake it loose.  
  - **Path:** (1) The Level 1 check runs the exact same registry search. (2) No supporting telehealth consult or clinical modifier exists. (3) Level 1 auto-release is rejected.  
  - **Climax:** The hold remains locked; the claim routes to the Level 2 ALJ Queue.  
  - **Resolution:** The case feeds long-term enforcement — its evidence lands in Agent 4's FBI/DOJ dossier.

## 3\. Glossary

- **Claim** — A synthetic Medicare billing record for DME supplies, carrying at minimum: MBI, billing NPI, HCPCS code, billed quantity, service date, billed amount, state, prior-authorization/modifier indicators, and a ground-truth legitimate/fraudulent label (demo-internal, never visible to the rules engine). `[ASSUMPTION: field set derived from public CMS claim formats (837P/CMS-1500); see OQ-7.]`  
- **Beneficiary** — A synthetic Medicare enrollee identified by an MBI, with an assigned medical condition that determines their catheter quantity cap.  
- **MBI** — Medicare Beneficiary Identifier; the beneficiary's ID as it appears on Claims.  
- **Supplier** — A synthetic DME provider identified by an NPI, with a billing history and a PECOS enrollment record.  
- **NPI** — National Provider Identifier for a Supplier.  
- **Dormant Supplier** — A Supplier with less than $5,000 in billing over the trailing 180 days (per R-02).  
- **PECOS Record** — A synthetic provider enrollment record including Authorized Official (AO), practice address, and a history of ownership/AO/address change events.  
- **CMRA List** — A list of commercial mail-receiving-agency / mail-drop addresses used by R-04. `[ASSUMPTION: simulated for the prototype; see OQ-6.]`  
- **Catheter Codes** — HCPCS A4351, A4352, A4353 (intermittent urinary catheters), the DME codes targeted by the Viktor Scenario.  
- **LCD Cap** — The clinical quantity ceiling from CMS LCD L33803, assigned per Beneficiary by medical condition: 30–150 catheter units/month.  
- **Rule (R-01–R-04)** — The four policy-grounded fraud-detection rules defined in `cms_rules_provided.docx` and specified in FR-5–FR-8. All rule time windows are **rolling** windows evaluated on the Simulation Clock. `[ASSUMPTION: rolling, not calendar; see OQ-5.]`  
- **Risk Score** — A discrete score assigned to each Claim by the Rule-Hit Scoring Model: **0.00** (no rule hits), **0.70** (exactly one rule hit), **0.95** (two or more corroborating rule hits). Sponsor-confirmed 2026-07-30, superseding the earlier continuous-score assumption. An active MBI lock (FR-18) counts as one corroborating hit. `[ASSUMPTION: lock-as-hit; see OQ-15.]`  
- **Simulation Clock** — The compressed virtual clock (FR-28) that maps the multi-month rule windows onto a minutes-long live demo; all Synthetic Dataset timestamps and rule-window evaluations use it.  
- **HIGLAS** — CMS's Healthcare Integrated General Ledger Accounting System; the prototype simulates it as the disbursement endpoint for safe claims.  
- **Pre-Payment Hold** — Disposition in which a Claim's disbursement is stopped ($0 paid) before payout. Triggered at Score 0.95.  
- **Auditor Review Queue** — The 24-hour (simulated-time) human review queue receiving medium-risk Claims (Score 0.70).  
- **Level 1 Pre-Payment Appeals** — The automated appeals check ("Appeals Sandbox"): on electronic appeal of a hold, cross-references clinical consult registries for Qualifying Evidence and auto-releases the hold if it exists.  
- **Level 2 ALJ Queue** — The simulated Administrative Law Judge manual queue receiving appeals that fail Level 1; the long-term enforcement and evidence-gathering path.  
- **Consult Registry** — Synthetic clinical consultation records (CPT code, ICD-10 diagnosis, consult date, MBI) queried by Level 1 appeals.  
- **Qualifying Evidence** — A matching telehealth consultation code (CPT-99214) on record within 10 days of the held Claim's service date, or a valid clinical modifier on the Claim. `[ASSUMPTION: anchor = service date, window = either side; clinical modifier accepted per the sponsor's William Jackson description; see OQ-11.]`  
- **Referral Dossier** — The prosecution-support packet Agent 4 generates: financial trail, beneficiary impact summary, and billing logs in a standardized format. `[ASSUMPTION: outline dev-drafted, sponsor-approved; see OQ-18.]`  
- **NFED** — DOJ's National Fraud Enforcement Division, the (simulated) recipient of the Referral Dossier.  
- **Viktor Scenario** — The embedded fraud storyline in the Synthetic Dataset: 15 Dormant Suppliers acquired, 100K+ stolen MBIs, \~$400M in fake Catheter Code claims across 8 states, exhibiting the patterns R-01–R-04 detect. Includes the "William Jackson" synthetic-identity case.  
- **Synthetic Dataset** — The generated corpus of Beneficiaries, Suppliers, PECOS Records, Consult Registry entries, and Claims containing normal traffic plus the Viktor Scenario, with pre-aged history consistent with the Simulation Clock. No real CMS or PHI data.

## 4\. Features

### 4.1 Synthetic Data Generation

**Description:** The prototype cannot use real CMS data, so it generates a Synthetic Dataset realistic enough to pass domain review: baseline legitimate claim traffic (including beneficiaries with genuine high catheter usage, prior authorizations, and modifiers) with the Viktor Scenario woven in. The sponsor directed that data definitions come from explicit claim and PECOS field definitions in documentation rather than waiting for real CMS data (`updates.md`). Realism is accepted when the sponsor (or their domain reviewer) signs off on the drafted schemas and traffic parameters, using the historical fraud distributions in `addendum.md` as the reference (per OQ-7). Realizes UJ-1, UJ-2, UJ-3.

**Functional Requirements:**

#### FR-1: Synthetic claims generation

The system can generate a stream of synthetic Claims comprising normal DME billing traffic and the embedded Viktor Scenario, with pre-aged history consistent with the Simulation Clock (FR-28).

**Consequences (testable):**

- Dataset contains legitimate Claims that individually resemble fraud signals (high quantities with valid prior auth; new-but-honest suppliers) so false-positive behavior is exercised.  
- Viktor Scenario Claims collectively exhibit the trigger conditions of all four Rules (R-01–R-04).  
- Every Claim carries the fields required to evaluate R-01–R-03 and a ground-truth legitimate/fraudulent label (consumed only by the friction-rate metric, FR-23 — never by the rules engine).  
- The dataset includes the Eleanor Vance case — a legitimate beneficiary whose claim trips **R-01** (over-cap, no prior auth or modifier on that claim) and **R-03** (her stolen MBI concurrently billed by ≥2 Viktor shells within 48 simulated hours), reaching Score 0.95 with a Qualifying Consult on record — and the William Jackson case (synthetic identity billed by a shell Supplier for 1,500 catheters, with no supporting clinical record). `[ASSUMPTION: Eleanor's rule-hit pair is dev-proposed — see OQ-14.]`  
- Dataset scale is parameterized: total claim count, legitimate:fraud ratio, stream rate, and demo runtime are generator inputs. Defaults: ≥100,000 total Claims with ≥50,000 legitimate (so the 1.5% KPI is statistically meaningful); the "100,000+ stolen MBIs" figure is literally generated as Beneficiary records, with claim volume sampled against a subset. `[ASSUMPTION: dev-proposed scale parameters — see OQ-16.]`  
- The trailing-180-day billing history each Supplier needs for R-02, PECOS event timestamps for R-04, and consult dates for Level 1 are pre-seeded consistently with the Simulation Clock.

#### FR-2: Synthetic provider enrollment (PECOS) generation

The system can generate PECOS Records for all Suppliers, including a history of AO, ownership, and practice-address change events.

**Consequences (testable):**

- The 15 Viktor shell Suppliers have Dormant Supplier billing histories (\<$5k/180 days) followed by acquisition-driven AO/address changes within 90 days of their billing spike.  
- Changed addresses for shell Suppliers match entries on the CMRA List.

#### FR-3: Synthetic beneficiary generation

The system can generate Beneficiaries with MBIs and an assigned condition that determines each Beneficiary's applicable LCD Cap (30–150 units/month). `[ASSUMPTION: condition→cap assignment is stored on the Beneficiary record so R-01 knows which cap applies — see OQ-5.]`

**Consequences (testable):**

- 100,000+ MBIs are marked compromised (stolen) and available to Viktor Scenario Claims.  
- Compromised MBIs also belong to real (synthetic) Beneficiaries with legitimate claim history, enabling the Eleanor Vance victim narrative.  
- The dataset includes fully fabricated identities (e.g., William Jackson) that correspond to no legitimate Beneficiary history.

#### FR-4: Simulated CMRA list

The system provides a simulated CMRA List for R-04 matching. `[ASSUMPTION: no commercial data source is licensed for the prototype — see OQ-6.]`

**Consequences (testable):**

- All 15 Viktor shell Suppliers' post-change addresses appear on the list.  
- At least one legitimate (non-shell) Supplier also uses a CMRA address with stable billing, so R-04's negative case is exercised.  
- List size and format are documented alongside the schemas reviewed under OQ-7.

#### FR-24: Synthetic clinical consult registry

The system generates Consult Registry records (CPT code, ICD-10 diagnosis, consult date, MBI) supporting Level 1 appeals adjudication. *(Numbered out of section order to keep FR IDs stable.)*

**Consequences (testable):**

- Legitimate high-quantity beneficiaries (e.g., Eleanor Vance: CPT-99214 with ICD-10 N31.9) have Qualifying Evidence within 10 days of their held Claims' service dates.  
- Viktor Scenario identities (e.g., William Jackson) have no Qualifying Consult and no clinical modifier on record.

### 4.2 Fraud Detection Rules Engine (R-01–R-04)

**Description:** The policy-grounded rule set from `cms_rules_provided.docx`, as amended by `updates.md`. Rules evaluate Claims and enrollment events on the Simulation Clock and produce rule-hit results consumed by Risk Scoring (§4.3). All windows are rolling. Realizes UJ-1.

**Functional Requirements:**

#### FR-5: R-01 — Quantity cap violation

The system flags any Claim for Catheter Codes where the Beneficiary's billed quantity exceeds their assigned LCD Cap — evaluated both on the single Claim and aggregated across all NPIs for that MBI over a rolling 30-day window — **unless** a valid prior authorization or physician modifier is attached to the Claim (per `updates.md`). `[ASSUMPTION: the rules doc's "30 units/30 days" and "150/month across NPIs" figures are the cap range's floor and ceiling, applied per the Beneficiary's condition-assigned cap rather than as universal thresholds; rolling windows — see OQ-5.]`

**Consequences (testable):**

- A Claim of 600 catheters against a 30-cap MBI with no prior auth → R-01 hit.  
- The same Claim with a valid prior-auth indicator → no R-01 hit.  
- Two Claims of 25 units each, 10 days apart, against a 30-cap MBI (50 units in a rolling 30 days) → R-01 hit on the second Claim (aggregate reading).  
- A 150-cap Beneficiary billed 100 units in 30 days → no R-01 hit.  
- Aggregation detects one MBI billed over-cap when split across multiple NPIs.

#### FR-6: R-02 — Dormant supplier spike

The system flags any Supplier (NPI) with less than $5,000 in billing over the trailing 180 days whose billing exceeds $100,000 within any 14-day window.

**Consequences (testable):**

- Each of the 15 Viktor shell Suppliers triggers R-02 during the scheme burst.  
- A legitimate new Supplier ramping gradually below the spike threshold does not trigger.

#### FR-7: R-03 — MBI multi-provider velocity

The system flags any MBI billed by 3 or more distinct NPIs within 48 hours.

**Consequences (testable):**

- Compromised MBIs billed across Viktor shell Suppliers in multiple states within 48 hours → R-03 hit.  
- A Beneficiary legitimately seeing two providers in 48 hours does not trigger.

#### FR-8: R-04 — PECOS ownership red flag

The system flags any Supplier whose PECOS Record shows AO or practice-address changes matching the CMRA List within 90 days of a high-volume billing spike.

**Consequences (testable):**

- Viktor shell Suppliers (mail-drop addresses \+ spike) → R-04 hit.  
- A Supplier relocating to a non-CMRA address with stable billing does not trigger.  
- The legitimate CMRA-address Supplier from FR-4 (stable billing, no spike) does not trigger.

### 4.3 Risk Scoring & Claim Disposition

**Description:** Each Claim receives a discrete Risk Score under the sponsor-confirmed **Rule-Hit Scoring Model** (2026-07-30), which supersedes the earlier continuous-weight assumption. The model is deliberately transparent: the score is a direct function of how many of R-01–R-04 hit. This is the pre-payment control at the heart of the story: corroborated fraud is stopped instantly with $0 disbursed, single-signal cases get human review, and clean claims disburse immediately. `[ASSUMPTION: "corroborating hits" means two or more distinct rules (R-01–R-04) implicating the same Claim; supplier-level hits (R-02, R-04) count toward each of that Supplier's Claims in the trigger window — see OQ-10.]` Realizes UJ-1.

**Functional Requirements:**

#### FR-9: Discrete Rule-Hit Risk Score

The system computes each Claim's Risk Score from its Rule results: **0 rule hits → 0.00; exactly 1 rule hit → 0.70; ≥2 corroborating rule hits → 0.95.** An active MBI lock (FR-18) counts as one corroborating hit for this computation. `[ASSUMPTION: lock-as-hit keeps the three-value model intact while closing the FR-18 loophole — see OQ-15.]`

**Consequences (testable):**

- A Viktor claim tripping R-01+R-02+R-03 scores exactly 0.95.  
- A claim tripping only R-01 scores exactly 0.70.  
- A claim with no hits scores exactly 0.00; no other score values occur.  
- A zero-rule-hit claim against a locked MBI scores 0.70 (lock counts as its one hit) and routes to the Auditor Review Queue — it never auto-disburses.

#### FR-10: Instant pre-payment hold

The system places an instant Pre-Payment Hold ($0 disbursed) on any Claim scoring 0.95 (≥2 corroborating hits), before disbursement.

**Consequences (testable):**

- No payment is recorded for any held Claim.  
- Hold is applied within the claim-processing flow (pre-payment), not retroactively.  
- A held Claim remains locked unless released via Level 1 appeals (FR-26) or human action; it never silently disburses.

#### FR-11: Auditor Review Queue

The system routes Claims scoring 0.70 (exactly one rule hit) to the Auditor Review Queue for manual inspection within 24 simulated hours, with payment deferred but not denied.

**Consequences (testable):**

- Queued Claims appear with their rule-hit evidence attached.  
- A reviewer can release (approve for payment) or escalate (convert to Pre-Payment Hold) a queued Claim. `[ASSUMPTION: minimum reviewer action set; unchanged from v1 — indexed in §9.]`  
- A queued Claim unreviewed at the 24-hour mark **remains deferred** and is flagged "SLA breached" — it never auto-pays and never auto-holds. `[ASSUMPTION: dev-proposed expiry behavior protecting the $0-disbursed guarantee under clock compression.]`

#### FR-12: Immediate disbursement of safe claims

Claims scoring 0.00 (no rule hits, no active MBI lock) disburse immediately through the simulated HIGLAS endpoint.

**Consequences (testable):**

- Safe claims show a completed HIGLAS disbursement record, within the decisioning latency bound of NFR-1.

### 4.4 Agent 1 — Threat Simulation ("Trust Defender")

**Description:** The autonomous "ethical adversary." In the demo choreography it opens the story: it detects the spike in Dormant Supplier ownership transfers and simulates a multi-state catheter billing attack vector in shadow mode, producing an early warning that primes Agent 2\. Realizes UJ-1 (beat 1).

**Functional Requirements:**

#### FR-13: Ownership-transfer anomaly detection

Agent 1 can detect an anomalous cluster of ownership/AO changes among Dormant Suppliers from the PECOS event stream and raise an early-warning signal. `[ASSUMPTION: dev-proposed trigger — ≥5 Dormant Suppliers with ownership/AO changes within a rolling 30 simulated days sharing at least one attribute (AO, address, or acquiring entity); threshold tunable — see OQ-17.]`

**Consequences (testable):**

- The 15-supplier Viktor acquisition wave produces one early-warning event identifying the affected NPIs.  
- Baseline (non-scheme) ownership-change traffic in the dataset produces **zero** early-warning events.

#### FR-14: Shadow-mode fraud simulation

Agent 1 can generate a simulated multi-state catheter billing burst (shadow traffic, clearly segregated from the demo claim stream) exercising the patterns of the anticipated attack, and publish the resulting threat profile to Agent 2\.

**Consequences (testable):**

- Shadow traffic never affects real (synthetic-live) claim dispositions or payment tallies.  
- The published threat profile identifies the Catheter Codes, geographic spread, and Supplier set to watch.

### 4.5 Agent 2 — Pre-Payment Claims Hold ("Crush Fraud")

**Description:** The interception engine. Consumes the live synthetic claim stream, evaluates the Rules Engine (§4.2), computes Risk Scores and dispositions (§4.3), and triages flagged cases for investigators. Decisioning latency is bounded by NFR-1. Realizes UJ-1 (beat 2).

**Functional Requirements:**

#### FR-15: Real-time pre-payment decisioning

Agent 2 evaluates every incoming Claim against R-01–R-04, computes its Risk Score, and applies the disposition (hold / review / pay) before payment occurs.

**Consequences (testable):**

- Across the full demo run, every Viktor Scenario Claim receives a pre-payment disposition; $0 total disbursed to scheme Claims (per Definition of Done).  
- Every disposition completes within the NFR-1 latency bound at demo throughput.

#### FR-16: Investigator triage

Agent 2 ranks flagged cases by potential loss value for human investigator review.

**Consequences (testable):**

- The Auditor Review Queue and hold list are ordered by dollar exposure, highest first.

### 4.6 Agent 3 — Enrollment Audit & Unmasking ("System Resilience")

**Description:** Once claims are held, Agent 3 pivots from claims to the provider network: it audits enrollment links across held Claims, unmasks the shell-supplier network, locks down compromised MBIs, and hardens prior-authorization checks so the scheme cannot re-enter. Realizes UJ-1 (beat 3).

**Functional Requirements:**

#### FR-17: Shell network unmasking

Agent 3 can correlate held Claims with PECOS Records to identify the connected shell-Supplier network (shared AOs, addresses, acquisition timing) and flag the involved enrollments for revocation.

**Consequences (testable):**

- All 15 Viktor shell Suppliers are identified as one linked network; the demo reports "15 bad-actor enrollments flagged/revoked."

#### FR-18: Compromised-MBI lockdown and prior-auth hardening

Agent 3 can mark compromised MBIs so subsequent Claims against them are elevated for scrutiny, and can recommend updated prior-authorization checks closing the exploited gap.

**Consequences (testable):**

- A late-arriving scheme Claim against a locked MBI scores at least 0.70 via the lock-as-hit mechanic (FR-9) and is routed to the Auditor Review Queue or held — it never auto-disburses.  
- The prior-auth-hardening recommendation names the exploited gap (e.g., missing prior-auth enforcement on Catheter Codes for new suppliers) and the proposed check, and is visible as a demo artifact.

### 4.7 Agent 4 — Policy & Referral ("Program Integrity Ops")

**Description:** Translates findings into action: compiles the prosecution-support Referral Dossier for DOJ NFED / FBI (simulated recipients) and recommends nationwide claim-edit/policy updates to prevent recurrence. Realizes UJ-1 (beat 4), UJ-3 (evidence intake).

**Functional Requirements:**

#### FR-19: Referral Dossier generation

Agent 4 generates a Referral Dossier for the detected scheme containing the financial trail (claims, amounts, suppliers, timeline), beneficiary impact summary, and billing logs, in a standardized document format whose outline the sponsor approves before build (OQ-18).

**Consequences (testable):**

- Dossier is produced as a reviewable artifact (per Definition of Done: "outputs the referral packet").  
- Dossier contents are traceable to the underlying synthetic Claims and PECOS events.  
- Failed appeals routed to the Level 2 ALJ Queue (FR-27) contribute their evidence (denied appeal, absent clinical record) to the dossier.

#### FR-20: Policy edit recommendation

Agent 4 produces a recommended nationwide claim-edit/policy update derived from the detected pattern (e.g., a national catheter quantity threshold edit).

**Consequences (testable):**

- Recommendation names the HCPCS codes, threshold logic, and rationale grounded in the demo run's evidence.

### 4.8 Orchestration & Demo Execution

**Description:** The four agents run concurrently over the live stream; the sponsor-confirmed 1→2→3→4 choreography (`updates.md`) is realized as the order of each agent's **first-milestone event** in the demo narrative — early warning before first hold, first hold before network finding, network finding before dossier — not as strict sequential execution stages, which streaming decisioning makes impossible. The prototype is a fully functional system on real GCP services executing the Viktor narrative dynamically (live rule evaluation over streaming synthetic data), not a scripted playback of precomputed results. Realizes UJ-1.

**Functional Requirements:**

#### FR-21: Agent choreography as milestone sequence

The system runs all four agents concurrently, with defined handoff events between them, and guarantees the narrative milestone order: Agent 1 early warning → Agent 2 first hold → Agent 3 network finding → Agent 4 dossier. `[ASSUMPTION: event/message contracts between agents are dev-team-proposed; sponsor confirmed the story order and each agent's role — the concurrent-execution reading is dev-proposed and flagged for sponsor awareness under OQ-13's time-model confirmation.]`

**Consequences (testable):**

- Each handoff is an observable event (early warning → threat profile → held-claim set → network findings → dossier inputs) visible in the demo.  
- Milestone events surface in the 1→2→3→4 order in every run, even though agents execute concurrently.  
- Appeal and review events (FR-25, FR-11) interleave with the agent sequence without breaking it.

#### FR-22: Dynamic execution

The system produces its dispositions, findings, and artifacts by live evaluation of the Synthetic Dataset at demo time; altering the input data (e.g., changing scheme size or timing) changes the outputs accordingly.

**Consequences (testable):**

- Re-running with a modified Viktor Scenario (different supplier count or claim volumes) yields correspondingly different holds, network findings, and dossier contents without code changes.

#### FR-23: Demo observability

The system exposes the story's key moments in a form a non-technical audience can follow live. `[ASSUMPTION: pending OQ-8, the dev-team default surface is a minimal event-timeline dashboard; the sponsor's` DMELoopholeSimulator.tsx `panel is out of scope unless OQ-8 says otherwise.]`

**Consequences (testable):**

- Each of the following is observable during a run, on whatever surface OQ-8 confirms: (1) Agent 1's early warning; (2) holds accumulating with a running count; (3) a live "$0 disbursed to scheme" tally; (4) the live false-positive friction rate vs. the 1.5% KPI (computed from FR-1's ground-truth labels per OQ-12 semantics); (5) the Eleanor Vance auto-release with its \<3s timing and $0.00 administrative-cost figure; (6) the William Jackson rejection and ALJ routing; (7) Agent 3's network unmasking ("15 enrollments flagged"); (8) the dossier's availability.

#### FR-28: Simulation time model

The system runs the demo on a compressed virtual Simulation Clock: all Synthetic Dataset timestamps (claim service dates, PECOS events, billing history, consult dates) are expressed in simulated time; all rule windows (180d/90d/30d/14d/48h/24h/10d) evaluate against it; and it maps to demo wall-clock at a configurable compression ratio. `[ASSUMPTION: dev-proposed model — pre-aged history is generated "in the past" of the simulation start, and the demo replays a compressed active window (e.g., 14 simulated days in ~10 wall-clock minutes) so the Review Queue's 24-hour SLA and the R-02 spike visibly elapse; see OQ-13.]`

**Consequences (testable):**

- A rule window's result is identical regardless of compression ratio (windows evaluate in simulated time, not wall time).  
- The full demo narrative — including at least one visible Review Queue SLA elapse — completes within the NFR-2 runtime bound.  
- Generated history satisfies every rule's look-back requirement at simulation start (180-day billing baselines, PECOS change events inside their 90-day correlation window, consults inside the 10-day window).

#### FR-29: Demo scenario driver

The system includes a scenario driver that fires the scripted interactive beats at defined simulation-clock times: the Eleanor Vance appeal, the William Jackson appeal, and any presenter-triggered auditor actions. `[ASSUMPTION: appeals are scripted driver events; the Auditor Review Queue reviewer is played live by the presenter (with a driver fallback if untouched) — see OQ-8 for the presenter surface.]`

**Consequences (testable):**

- Both appeal beats fire at their scripted times in every run without manual intervention.  
- A presenter can optionally perform one live release/escalate action on the Review Queue; if they don't, the driver's fallback keeps the narrative on schedule.

### 4.9 Appeals & Hold Release (Level 1 / Level 2\)

**Description:** Sponsor-confirmed (2026-07-30), resolving the former hold-release gap. When a provider appeals a Pre-Payment Hold, the **Level 1 Pre-Payment Appeals** check ("Appeals Sandbox") adjudicates automatically against clinical evidence; genuine providers are cleared in seconds while fraudulent appeals stay locked and escalate. This is the demo's redemption beat (Eleanor Vance) and its enforcement beat (William Jackson). Realizes UJ-2, UJ-3.

**Functional Requirements:**

#### FR-25: Electronic appeal intake

A provider can file an electronic appeal against a Pre-Payment Hold (in the demo, filed by the scenario driver per FR-29), which immediately triggers Level 1 adjudication.

**Consequences (testable):**

- Both demo appeal cases (Eleanor Vance's clinic; the William Jackson shell) are filed by the driver and visibly adjudicated during the run.

#### FR-26: Level 1 automated adjudication and auto-release

On appeal, the system cross-references the Consult Registry; if Qualifying Evidence exists for the Claim's MBI (CPT-99214 consult within 10 days of the Claim's service date, or a valid clinical modifier), the hold is auto-released and the Claim proceeds to disbursement.

**Consequences (testable):**

- Eleanor Vance's appeal auto-releases: the CPT-99214 / ICD-10 N31.9 consult is located and the hold clears in **under 3 seconds** (measured, end-to-end from appeal receipt to release).  
- The demo surface displays an administrative-cost figure of **$0.00** for the auto-release (display requirement — the prototype has no cost model to measure).  
- Auto-release requires Qualifying Evidence; nothing else releases a hold automatically.

#### FR-27: Level 2 ALJ escalation

If no Qualifying Evidence exists, Level 1 rejects the auto-release, the Pre-Payment Hold remains locked, and the Claim routes to the Level 2 ALJ Queue for manual review and enforcement evidence-gathering.

**Consequences (testable):**

- The William Jackson appeal is rejected; the hold stays locked, the case appears in the Level 2 ALJ Queue, and its evidence is available to Agent 4's dossier (FR-19).  
- No payment ever occurs on a claim in the Level 2 ALJ Queue during the demo.

### 4.10 Cross-Cutting Non-Functional Requirements

Demo-scale bounds; production-scale throughput remains a Non-Goal (§5).

- **NFR-1 — Decisioning latency:** every Claim disposition (score \+ hold/queue/pay) completes within **5 seconds** of claim arrival at demo throughput. `[ASSUMPTION: dev-proposed bound; sponsor may tighten toward the deck's sub-second aspiration — see OQ-16.]` (FR-12, FR-15)  
- **NFR-2 — Demo runtime:** the full Viktor narrative (all UJ-1/2/3 beats) executes within a presentable session — target **≤15 minutes** wall-clock at the default compression ratio. `[ASSUMPTION: dev-proposed; final number depends on OQ-8's demo format — see OQ-13.]` (FR-28)  
- **NFR-3 — Appeal latency:** Level 1 auto-release completes in **\<3 seconds** end-to-end (sponsor-set, 2026-07-30). (FR-26)

## 5\. Non-Goals (Explicit)

- **No real data.** No real CMS claims, PECOS, or beneficiary data; no PHI/PII. Synthetic only.  
- **No production integration.** No connection to actual CMS FPS/CRUSH/HIGLAS systems, real PECOS, real ALJ dockets, dark-web sources, UPICs, or state Medicaid systems. HIGLAS disbursement and the ALJ queue are simulated demo constructs.  
- **No real enforcement transmission.** The Referral Dossier is generated, never sent to actual FBI/DOJ endpoints.  
- **No multi-cloud build-out.** The deck's AWS/BigQuery Omni/Palantir Foundry interoperability story is out of scope; the prototype runs on GCP.  
- **No compliance certification.** FedRAMP High and related accreditations are positioning for the eventual product, not prototype requirements.  
- **No adaptive/ML rule learning.** The deck's "adaptive pattern learning" (auto-adjusting rules as fraud shifts to other DME items) is out of scope; the prototype detects via R-01–R-04 and the discrete Rule-Hit Scoring Model. `[NON-GOAL for MVP — revisit for v2 if the demo lands.]`  
- **No production-scale throughput.** "Billion-claim scale in milliseconds" is aspirational; the prototype proves the pattern at the demo scale parameterized in FR-1.

## 6\. MVP Scope

### 6.1 In Scope

- Synthetic Dataset generator (Claims, Beneficiaries, PECOS Records, CMRA List, Consult Registry) with embedded Viktor Scenario, pre-aged history, ground-truth labels, and the Eleanor Vance / William Jackson cases (FR-1–FR-4, FR-24).  
- Rules Engine implementing R-01–R-04 on the Simulation Clock (FR-5–FR-8).  
- Discrete Rule-Hit Risk Scoring with 0.00 / 0.70 / 0.95 dispositions: immediate HIGLAS disbursement, 24-hour Auditor Review Queue with defined expiry, instant hold; MBI-lock interaction (FR-9–FR-12).  
- Level 1 / Level 2 appeals: electronic appeal intake, automated consult-registry adjudication with \<3s auto-release, ALJ escalation (FR-25–FR-27).  
- Four agents with confirmed roles, running concurrently with the 1→2→3→4 milestone choreography on GCP; simulation time model; demo scenario driver (FR-13–FR-22, FR-28, FR-29).  
- Referral Dossier and policy-edit recommendation outputs (FR-19, FR-20).  
- Demo-observable execution of the full Viktor narrative with the eight enumerated visible moments, including the live friction-rate display (FR-23).

### 6.2 Out of Scope for MVP

- Everything in §5 Non-Goals.  
- Level 2 ALJ adjudication mechanics beyond the queue itself — the demo shows cases entering the queue and feeding the dossier, not an ALJ ruling on them.  
- Scheme variants beyond the Viktor Scenario (e.g., orthotics pivot) — pending OQ-9 on how far "dynamic" generalization must stretch.  
- The sponsor's `DMELoopholeSimulator.tsx` panel, unless OQ-8 brings it in.

## 7\. Success Metrics

Derived from the sponsor's Definition of Done (`updates.md`) and the 2026-07-30 scoring-and-appeals response.

**Primary**

- **SM-1**: Scheme detection — each of R-01–R-04 fires at least once against Viktor Scenario traffic during a live run, and ≥95% of scheme Claims receive at least one rule hit. `[ASSUMPTION: 95% floor is dev-proposed to make "full detection" measurable; scheme claims missed by all rules must still be caught via SM-2's disposition net or the miss is a finding.]` Validates FR-5–FR-9, FR-15.  
- **SM-2**: Pre-payment interception — $0 disbursed against Viktor Scenario Claims; 100% of scheme claims held or queued pre-disbursement (queued claims never auto-pay per FR-11); fraudulent appeals (William Jackson) fail Level 1 and stay held. Validates FR-10, FR-11, FR-15, FR-27.  
- **SM-3**: Enforcement output — Referral Dossier generated with traceable evidence; shell network (15 Suppliers) fully identified. Validates FR-17, FR-19.

**Secondary**

- **SM-4**: Dynamic execution — modified scenario inputs produce correspondingly different outputs without code changes. Validates FR-22.  
- **SM-5**: Appeal responsiveness — a legitimate false-positive hold with Qualifying Evidence auto-releases in under 3 seconds (measured), with the $0.00 administrative-cost figure displayed. Validates FR-26, NFR-3.

**Counter-metrics (do not optimize)**

- **SM-C1**: False-positive friction — **fewer than 1.5% of legitimate synthetic Claims delayed** (held or queued), the sponsor's gold-standard payment-integrity threshold (2026-07-30). Computed live from FR-1's ground-truth labels and displayed per FR-23. Counterbalances SM-1/SM-2: a system that holds everything trivially achieves $0 disbursed. `[ASSUMPTION: a hold cleared by Level 1 auto-release within seconds still counts as "delayed" unless the sponsor says otherwise — see OQ-12.]`

## 8\. Open Questions

### Resolved 2026-07-30 (sponsor scoring-and-appeals response)

- **OQ-1 — Risk Score derivation.** ✅ Resolved: discrete Rule-Hit Scoring Model — 0 hits \= 0.00, 1 hit \= 0.70, ≥2 corroborating hits \= 0.95 (FR-9). Definition of "corroborating" spawned OQ-10.  
- **OQ-2 — Sub-threshold and hold governance.** ✅ Resolved: 0.00 claims disburse immediately via simulated HIGLAS (FR-12); instant holds remain locked unless released via Level 1 appeals or escalate to Level 2 ALJ (FR-10, FR-26, FR-27).  
- **OQ-3 — Hold release & appeal path.** ✅ Resolved: electronic appeal → Level 1 automated consult-registry check → \<3s auto-release with qualifying evidence, else Level 2 ALJ Queue (FR-25–FR-27). Evidence-window details spawned OQ-11.  
- **OQ-4 — False-positive tolerance.** ✅ Resolved: fewer than 1.5% of legitimate claims delayed (SM-C1). Measurement detail spawned OQ-12.

### Open

**Owner: Sponsor** items need the business sponsor's input; **Owner: Dev team** items carry a proposed default already written into the FRs — a "confirmed" unblocks them, and build proceeds on the default meanwhile. **OQ-8 is the one item that blocks build planning outright.**

- **OQ-5 — R-01 cap semantics.** Confirm: (a) the applicable LCD Cap is a condition attribute on the Beneficiary record; (b) the cap applies per-Beneficiary (30–150) rather than 30/150 as universal thresholds — FR-5 is now written this way; (c) windows are rolling, not calendar; (d) the check is both per-claim and aggregated across claims/NPIs in the window; (e) how prior-auth/modifier exemptions are represented. *Owner: Dev team proposes (defaults in FR-5); Sponsor confirms.* (FR-3, FR-5)  
- **OQ-6 — CMRA list source.** Confirm the mail-drop address list is simulated for the prototype (no commercial data purchase). *Owner: Sponsor confirms.* (FR-4, FR-8)  
- **OQ-7 — Schema confirmation loop.** Confirm the dev team derives schemas from public CMS formats and the sponsor (or a named domain reviewer) reviews the drafted schemas **and traffic parameters** for realism before build-out, using the addendum's historical distributions as the reference. Covers Claims, PECOS, Beneficiary, CMRA, and Consult Registry schemas. *Owner: Dev team drafts; Sponsor reviews.* (FR-1–FR-4, FR-24)  
- **OQ-8 — Demo surface, audience, and date.** ⚠ **Blocking.** What does the audience watch — a dashboard, a narrated console, slides driven by live output? Does the prototype power, replicate, or replace the sponsor's `DMELoopholeSimulator.tsx` React panel? Who is the audience, and when is the demo date? Drives FR-23, FR-29, and NFR-2 materially. **Dev default if unanswered by build start:** minimal event-timeline dashboard; sponsor panel out of scope. *Owner: Sponsor.* (FR-23, FR-29)  
- **OQ-9 — Degree of generalization.** "Executes the Viktor narrative dynamically" — confirm the bar is: live computation over regenerable synthetic data (FR-22), not detection of unscripted novel scheme types. *Owner: Sponsor confirms.* (FR-22, §6.2)  
- **OQ-10 — "Corroborating hits" semantics.** Confirm ≥2 hits means two or more *distinct rules* implicating the same Claim, and that supplier-level hits (R-02, R-04) count toward every Claim from that Supplier inside the trigger window. *Owner: Dev team proposes (default in §4.3); Sponsor confirms.* (FR-9)  
- **OQ-11 — Qualifying-evidence details.** Confirm: (a) the 10-day consult window anchors to the claim's **service date** (sponsor phrased it both "of the hold" and "of the transaction"); (b) the window runs either side of that date; (c) a valid clinical modifier alone also qualifies (per the William Jackson description); (d) whether CPT-99214 is the only qualifying code or a stand-in for a small set. *Owner: Dev team proposes (defaults in Glossary/FR-26); Sponsor confirms.* (FR-24, FR-26)  
- **OQ-12 — Friction measurement.** Confirm whether claims auto-released by Level 1 in seconds still count as "delayed" for the 1.5% KPI (current default: they count), and the computation window (default: cumulative per demo run over all ground-truth-legitimate claims). *Owner: Dev team proposes; Sponsor confirms.* (SM-C1, FR-23)  
- **OQ-13 — Simulation time model.** Confirm the compressed virtual-clock design in FR-28 (pre-aged history \+ compressed active window; rule windows evaluate in simulated time), the default compression target (\~14 simulated days in \~10 wall-clock minutes), and the concurrent-agents/milestone-order reading of the choreography (FR-21). *Owner: Dev team proposes (defaults in FR-28/FR-21); Sponsor confirms.* (FR-21, FR-28, NFR-2)  
- **OQ-14 — Eleanor Vance's rule-hit pair.** Her instant hold requires ≥2 hits; the proposed pair is R-01 (over-cap, no prior auth on that claim) \+ R-03 (her stolen MBI billed by Viktor shells within 48h) — claim-scoped, narratively strong (she is held *because* she is a theft victim), and without supplier-level blast radius on her clinic. Confirm this is the story you want told. *Owner: Sponsor confirms.* (FR-1, UJ-2)  
- **OQ-15 — Locked-MBI scoring interaction.** An MBI lock (FR-18) must affect disposition or Agent 3's hardening beat is hollow; the proposed default is "an active lock counts as one corroborating hit" (zero-hit claim on locked MBI → 0.70 → queue; any additional rule hit → 0.95 → hold). This slightly amends the transparent three-input scoring story. *Owner: Sponsor confirms.* (FR-9, FR-18)  
- **OQ-16 — Dataset scale and latency bound.** Confirm FR-1's scale defaults (≥100k claims, ≥50k legitimate; 100K+ MBIs literally generated) and NFR-1's 5-second decisioning bound — or set the numbers you want the demo to claim. *Owner: Dev team proposes; Sponsor confirms.* (FR-1, NFR-1)  
- **OQ-17 — Agent 1 early-warning trigger.** Confirm the proposed anomaly definition in FR-13 (≥5 dormant-supplier ownership changes in 30 simulated days sharing an attribute). *Owner: Dev team proposes; Sponsor confirms.* (FR-13)  
- **OQ-18 — Dossier outline.** Sponsor provides or approves the Referral Dossier outline (sections \+ required fields) before build; dev team will draft one from public DOJ referral practice if preferred. *Owner: Sponsor.* (FR-19)  
- **OQ-19 — Product name.** Confirm "CMS Fraud Shield" as the name that appears on the demo surface and dossier artifacts. *Owner: Sponsor.* (title)

## 9\. Assumptions Index

- §3/§4.1 (Claim, FR-1–FR-3) — Schemas derived from public CMS claim/PECOS formats; sponsor reviews schemas \+ traffic parameters for realism. → OQ-7  
- §3/§4.1 (CMRA List, FR-4) — Mail-drop list is simulated, not licensed. → OQ-6  
- §4.1 (FR-3) / §4.2 (FR-5) — Beneficiary condition attribute determines the applicable LCD cap; caps are per-Beneficiary with rolling windows and per-claim \+ aggregate checks. → OQ-5  
- §4.1 (FR-1) — Eleanor Vance's hold comes from R-01 \+ R-03 (stolen-MBI velocity). → OQ-14  
- §4.1 (FR-1) — Dataset scale defaults (≥100k claims, ≥50k legitimate; MBIs literally generated). → OQ-16  
- §4.3 (FR-9) — "Corroborating hits" \= ≥2 distinct rules; supplier-level hits propagate to the supplier's claims in-window. → OQ-10  
- §4.3 (FR-9, FR-18) — An active MBI lock counts as one corroborating hit. → OQ-15  
- §4.3 (FR-11) — Minimum reviewer actions are release/escalate; queue expiry \= remain deferred, flagged "SLA breached," never auto-pay. *(No OQ — dev-team operational default.)*  
- §4.4 (FR-13) — Early-warning trigger: ≥5 dormant-supplier ownership changes in 30 simulated days sharing an attribute. → OQ-17  
- §3 / §4.9 (FR-26) — Consult window anchored to claim service date, either side; clinical modifier accepted as alternative evidence; CPT-99214 possibly a stand-in for a code set. → OQ-11  
- §4.8 (FR-21) — Inter-agent event contracts are dev-team-proposed; concurrent execution with milestone ordering realizes the sponsor's sequential story. → OQ-13  
- §4.8 (FR-23) — Default demo surface: minimal event-timeline dashboard; sponsor panel out of scope. → OQ-8  
- §4.8 (FR-28) — Compressed virtual clock with pre-aged history; \~14 simulated days in \~10 wall-clock minutes. → OQ-13  
- §4.8 (FR-29) — Appeals are scripted driver events; queue reviewer is presenter-played with driver fallback. → OQ-8  
- §4.10 (NFR-1, NFR-2) — 5-second decisioning bound; ≤15-minute demo runtime. → OQ-16, OQ-13  
- §7 (SM-1) — ≥95% of scheme claims receive ≥1 rule hit. *(No OQ — dev-team measurability floor; sponsor may adjust.)*  
- §7 (SM-C1) — Auto-released holds still count toward the 1.5% delayed-claims KPI. → OQ-12  
- §3 (Referral Dossier, FR-19) — Dossier outline dev-drafted, sponsor-approved. → OQ-18

