# CMS Fraud Shield — PRD Compliance Findings & Recommended Code Updates

**Date:** Jul 30, 2026   
**Repo / Branch:** cms-pivot (`cms-fraud-shield)`  
**Requirements source:** `PRD` (FR-1–FR-29, NFR-1–3, SM-1–SM-C1)

---

## How to read this report

Each finding follows the same format: **the requirement**, **the code as it exists today** (with file and line references), **why it doesn't comply**, and **a suggested update**. Findings are grouped the same way the PRD groups features. Because most gaps share a handful of root causes, those are described once in "Foundational gaps" and referenced throughout — fixing the foundations resolves the majority of the per-FR issues.

This is written to be actionable, not critical. The current codebase is a solid working demo platform — it's just still the *VA PIVOT* platform underneath, and the CMS Fraud Shield requirements describe a substantially different system that has so far been represented in the frontend narrative layer rather than implemented in the backend.

---

## Executive summary

**Status: 0 of 29 functional requirements currently pass. 23 have no implementation; 6 have adjacent code that behaves differently than the requirement specifies.**

The pattern behind nearly every finding is the same: **the CMS story lives in the frontend; the backend is still the VA platform.** The Viktor Scenario, rules R-01–R-04, the 0.00/0.70/0.95 scoring model, pre-payment holds, the two-tier appeals process, and the DOJ referral dossier all appear on screen — but they are produced by hardcoded values and timed animations in React components (chiefly `DMELoopholeSimulator.tsx`), not by the backend. The backend continues to run the eight VA-era Gemini agents over 358 static VA claims.

This matters commercially because the PRD's own success bar (§1, §4.8) is *"a fully functional system … executing the Viktor narrative dynamically … not a scripted playback of precomputed results."* In the current build, an audience member asking to change an input ("what if there were 20 shell companies?") or drill into any number on screen would find nothing behind it. The good news: the gaps are well-defined, the PRD is unusually precise about expected behavior (every FR has testable consequences), and there is one genuinely strong building block already in the repo (the enrollment-integrity ADK engine) whose deterministic-detection pattern is exactly the style the rest of the system needs.

---

## Foundational gaps (referenced by the findings below)

### F-1. The data model is still VA — the CMS entities don't exist

`backend/schema.py:21-141` defines these BigQuery tables: `batches, veterans, providers, documents, claims, agent_findings, decisions, chat_messages, overpayments, audit_log, agent_flags`. There are **no** tables for Beneficiaries/MBIs, Supplier billing history, PECOS records or change events, the CMRA list, the Consult Registry, MBI locks, appeals, an ALJ queue, or disbursements. The `claims` table (`schema.py:68-85`) has no MBI, quantity, state, prior-auth/modifier, or ground-truth-label fields. Seed data (`data/seed/`) is 358 hand-written VA claims, 25 veterans, and 14 providers.

**Fix:** add the CMS entity tables to the `TABLES` dict and build a parameterized generator (see FR-1–FR-4, FR-24).

### F-2. There is no deterministic rules engine

The module named `rules_engine` (`backend/agents/rules_engine.py:6-31`) is a Gemini prompt agent whose instructions are **VA Financial Policy** checks (date-of-death, NPI accreditation, \>$10k billing). The high-throughput demo path (`backend/services/fake_batch_service.py:107-108`) decides "rule hits" with a random number generator (`flag_probability = 0.18`). Neither path evaluates R-01–R-04, and neither is deterministic or reproducible — which the PRD's transparent scoring story depends on.

**Fix:** implement R-01–R-04 as SQL/Python window computations (see FR-5–FR-8).

### F-3. There is no payment lifecycle

Claims move between `processing / flagged / approved / denied` (`backend/services/batch_service.py:138-251`, `backend/routes/claims.py:289-296`). There is no `held` state, no disbursement record, no simulated HIGLAS endpoint, and no ledger — so "$0 disbursed to the scheme," the demo's headline number, cannot currently be computed or guaranteed by the system.

**Fix:** add hold/disbursement states and a disbursements ledger (see FR-10–FR-12).

### F-4. There is no Simulation Clock

Every timestamp in the backend uses wall-clock `datetime.now()` (e.g., `seed.py:76`, `batch_service.py:179`, `analytics_service.py:53`). The PRD's rule windows (180d / 90d / 30d / 14d / 48h / 24h / 10d) require a compressed virtual clock (FR-28); without it, none of the rolling-window rules can run in a minutes-long demo, and the static 2025 seed dates are already stale.

**Fix:** introduce a `SimulationClock` service (see FR-28) before implementing any rule.

### F-5. The demo moments are frontend animations, not system output

`frontend/src/components/fraud-research/DMELoopholeSimulator.tsx` makes **no network calls**. Its counters are `setInterval` animations (lines 165-194), its appeal outcomes are decided by which dropdown item is selected (lines 140-160), and its scheme facts are constants (`ringSize: 15`, `estLeakAnnual: '$400,000,000.00'`, lines 63-74). The same pattern appears in `NFEDReferralsPage.tsx` (hardcoded referral cases) and `EnrollmentPage.tsx` (address string-matching). These panels made the story presentable early — but per the PRD they now need to become *views* of real backend events rather than the source of the story.

---

# Findings by feature area

## §4.1 Synthetic Data Generation

### FR-1: Synthetic claims generation — NOT MET

**Requirement:** Generate a stream of synthetic claims (normal DME traffic \+ the embedded Viktor Scenario) with pre-aged history, ground-truth labels hidden from the rules engine, parameterized scale (default ≥100,000 claims, ≥50,000 legitimate), and the Eleanor Vance / William Jackson cases.

**Code today:** `backend/seed.py:184-201` loads `data/seed/claims.json` verbatim — 358 static VA medical claims. Field set: `id, claim_number, batch_id, veteran_id, provider_id, claim_type, status, risk_level, billing_amount, service_date, diagnosis_codes, procedure_codes, normalized_data`. The UI dropdown (`DMELoopholeSimulator.tsx:697-701`) references "CLM-1001000224 \- Eleanor Vance," **which does not exist in the seed data**; "CLM-1001000023" exists but is an unrelated $9,800 back-pain claim.

**Why it doesn't comply:** there is no generator at all, no DME/quantity/MBI/prior-auth fields to evaluate rules against, no fraud/legitimate labels to compute the 1.5% friction KPI from, and the two named demo personas aren't in the data. The claim count is \~280× short of the default scale.

**Suggested update:** create a `backend/datagen/` package with a CLI (`python -m datagen --claims 100000 --legit-ratio 0.5 --compression 14d:10m`):

- Extend the `claims` table with `mbi, billing_npi, hcpcs_code, quantity, state, prior_auth, modifier, sim_service_date`.  
- Store the ground-truth label in a **separate** `claim_labels` table that rule queries never join (satisfies the "never visible to the rules engine" constraint by construction).  
- Generate baseline traffic (including legitimate high-quantity beneficiaries with prior auths), then overlay the Viktor Scenario (15 shells, stolen MBIs, catheter codes A4351-3) and explicitly author the Vance claim (over-cap \+ stolen-MBI velocity, with a qualifying consult) and Jackson claim (1,500 catheters, no clinical record).  
- Generate all history relative to the Simulation Clock's start (FR-28) so 180-day baselines and 90-day PECOS windows are satisfied on day one.

### FR-2: Synthetic PECOS generation — NOT MET (different feature exists)

**Requirement:** PECOS records for all suppliers with a history of AO/ownership/address change events; the 15 Viktor shells show dormant billing then acquisition-driven changes to CMRA addresses within 90 days of their spike.

**Code today:** the claims backend has no PECOS table (`schema.py:21-141`) and providers carry only an aggregate `claim_history` blob (`data/seed/providers.json`). A real generator exists in `enrollment_integrity_adk/.../enrollment_data_build/synthetic_data.py`, but it builds a *different* storyline (a Georgia "phoenix provider" with \~7 suspect entities), contains **no billing data**, models addresses as static (entities are formed at CMRA suites, never *change* to them), uses its own hardcoded date (`TODAY = date(2026, 7, 13)`, line 252), and loads into its own datastore, disconnected from claims.

**Why it doesn't comply:** FR-2's consequences are about *change events correlated with billing* — dormancy followed by a spike, address changes matching the CMRA list. Neither the claims backend (no PECOS at all) nor the ADK (no billing, no change events) can express that.

**Suggested update:** add `pecos_records` and `pecos_events` tables (`npi, event_type [AO_CHANGE|OWNERSHIP|ADDRESS], old_value, new_value, sim_event_date`) to `schema.py`; extend the FR-1 generator to give each of the 15 shells a \<$5k/180-day billing history, then AO+address change events within 90 sim-days before their burst, with new addresses drawn from the CMRA table (FR-4). Reuse the ADK's deterministic generation style — it's the right pattern, just aimed at the wrong story.

### FR-3: Synthetic beneficiary generation — NOT MET

**Requirement:** Beneficiaries with MBIs and a condition that assigns each one an LCD cap (30–150 units/month); 100,000+ compromised MBIs; compromised MBIs belong to real beneficiaries with legitimate history; fully fabricated identities (William Jackson) exist too.

**Code today:** the schema defines `veterans` (`schema.py:34-45` — SSN last-4, service branch, disability rating); 25 records in `data/seed/veterans.json`. The string "MBI" appears in **zero** backend files.

**Why it doesn't comply:** the Beneficiary entity doesn't exist. Without MBIs and per-beneficiary caps, R-01 (cap check) and R-03 (MBI velocity) have nothing to evaluate, and the stolen-identity narrative (Vance as a theft victim) can't be represented.

**Suggested update:** add a `beneficiaries` table: `mbi, name, condition, lcd_cap (30–150 derived from condition), is_compromised, is_fabricated`. Generate 100k+ records in the FR-1 pipeline; mark the stolen population `is_compromised = TRUE`; give them genuine claim history; add fabricated identities with no history. Retire (or leave dormant) the `veterans` table so nothing CMS-facing reads it.

### FR-4: Simulated CMRA list — NOT MET

**Requirement:** A simulated commercial-mail-drop (CMRA) address list for R-04 matching; all 15 shells' post-change addresses on it; at least one *legitimate* supplier at a CMRA address with stable billing (the negative case); size/format documented.

**Code today:** no CMRA table or data file exists in the claims backend. The frontend "detects" CMRA membership by string-matching the address text: `app.address.includes('Ste') || app.address.includes('Suite 214')…` (`EnrollmentPage.tsx:203`). The ADK has an `is_cmra` boolean on its own addresses (`synthetic_data.py:46`) for enrollment screening.

**Why it doesn't comply:** there's no list artifact for R-04 to match against, and substring-matching "Ste" in the UI would misclassify ordinary suite addresses.

**Suggested update:** add a `cmra_addresses` table (address, city, state, source note), seeded by the generator; include the 15 shell post-change addresses plus legitimate CMRA tenants with stable billing so R-04's no-trigger case is exercised. Replace the frontend `includes()` check with data returned by the API. Document the list format alongside the OQ-7 schema review.

### FR-24: Synthetic clinical consult registry — NOT MET

**Requirement:** Consult Registry records (CPT, ICD-10, consult date, MBI) supporting Level 1 appeals — Vance has a CPT-99214/N31.9 consult within 10 days of her held claim's service date; Jackson has nothing.

**Code today:** no consult table, seed file, or query exists anywhere. The Level 1 "check" prints a hardcoded success string — `DMELoopholeSimulator.tsx:145`: *"\[SUCCESS\] Specialist consult modifier found: CPT-99214 \+ ICD-10 N31.9…"* — and the scripted text says "past 180 days," contradicting the PRD's 10-day window.

**Why it doesn't comply:** the registry that Level 1 adjudication (FR-26) must query doesn't exist; nothing can be "found" or "not found."

**Suggested update:** add `consult_registry` (`mbi, cpt_code, icd10_code, sim_consult_date`) to `schema.py`; generate consults for legitimate high-quantity beneficiaries within ±10 sim-days of their claims (Vance explicitly), and none for fabricated identities.

---

## §4.2 Fraud Detection Rules Engine (R-01–R-04)

*All four rules share foundational gaps F-1/F-2/F-4. The only written definitions of the rules in the codebase are display strings at `DMELoopholeSimulator.tsx:622-625` — and those differ from the PRD in three ways (universal 30-unit cap with no prior-auth exemption; an added "≥2 state lines" condition on R-03; missing spike-correlation on R-04). **Do not implement from the UI copy** — implement from the PRD, and update the UI copy to match.*

The suggested home for all four: a new `backend/services/rules_service.py` that runs deterministic BigQuery queries per claim (or micro-batch), returning a list of rule hits with evidence. Keep Gemini out of rule evaluation — the PRD's scoring model requires reproducible, explainable hits.

### FR-5: R-01 quantity cap violation — NOT MET

**Requirement:** Flag catheter-code claims where billed quantity exceeds the beneficiary's assigned LCD cap — per-claim **and** aggregated across all NPIs for that MBI over a rolling 30-day window — unless a valid prior auth or physician modifier is attached.

**Code today:** no quantity, cap, or MBI field exists (F-1); the closest text is the VA prompt's "$10,000 billing reasonableness" check (`rules_engine.py:18`) and the divergent UI copy above.

**Why it doesn't comply:** nothing evaluates quantities against caps; the prior-auth exemption isn't representable; aggregation across NPIs is impossible without MBIs.

**Suggested update (sketch):**

```sql
-- R-01: per-claim + rolling 30-day aggregate, exemptions honored
SELECT c.claim_id FROM claims c
JOIN beneficiaries b ON c.mbi = b.mbi
WHERE c.hcpcs_code IN ('A4351','A4352','A4353')
  AND c.prior_auth = FALSE AND c.modifier IS NULL
  AND ( c.quantity > b.lcd_cap
     OR b.lcd_cap < (SELECT SUM(quantity) FROM claims c2
                     WHERE c2.mbi = c.mbi
                       AND c2.sim_service_date BETWEEN
                           DATE_SUB(c.sim_service_date, INTERVAL 30 DAY)
                           AND c.sim_service_date) )
```

### FR-6: R-02 dormant supplier spike — NOT MET

**Requirement:** Flag any NPI with \<$5,000 billing in the trailing 180 days whose billing exceeds $100,000 in any 14-day window.

**Code today:** no supplier billing history exists; the constants $5,000/$100,000 appear nowhere in backend code (only in UI copy). The fake path's nearest analog is `billing > 25000` (`fake_batch_service.py:118`).

**Suggested update:** in `rules_service.py`, compute per-NPI trailing-180-day and rolling-14-day sums (window functions over `claims.sim_service_date`), flag where `trailing_180 < 5000 AND rolling_14 > 100000`. The generator must give shells the dormant-then-burst shape and give one honest new supplier a gradual ramp (the required negative case).

### FR-7: R-03 MBI multi-provider velocity — NOT MET

**Requirement:** Flag any MBI billed by ≥3 distinct NPIs within 48 hours. (Note: **no** state-line condition — the UI copy adds one that isn't in the PRD.)

**Code today:** no MBI concept; no distinct-NPI window query anywhere.

**Suggested update:** `COUNT(DISTINCT billing_npi) >= 3` over a rolling 48-sim-hour window per MBI. Include the negative case in data: one beneficiary legitimately seeing two providers within 48 hours.

### FR-8: R-04 PECOS ownership red flag — NOT MET

**Requirement:** Flag suppliers whose PECOS AO/address changes match the CMRA list within 90 days of a high-volume billing spike.

**Code today:** no PECOS events or CMRA table (F-1). The ADK's "Rule 4" CMRA-cluster check (`enrollment_agent/engine/detection.py:131-143`) is enrollment screening with no billing correlation — it would flag a stable-billing CMRA supplier, which is exactly FR-8's required *no-trigger* case.

**Suggested update:** join `pecos_events` (address/AO changes) × `cmra_addresses` × the R-02-style spike computation, requiring the change within 90 sim-days of the spike. The FR-4 legitimate-CMRA supplier and a non-CMRA relocator must both come back clean.

---

## §4.3 Risk Scoring & Claim Disposition

### FR-9: Discrete rule-hit risk score — NOT MET (current behavior diverges)

**Requirement:** Score \= 0.00 (no hits), 0.70 (exactly one hit), 0.95 (≥2 corroborating hits from distinct rules; supplier-level hits propagate to the supplier's in-window claims). An active MBI lock counts as one hit; a zero-hit claim on a locked MBI scores 0.70 and goes to the queue.

**Code today:** the live path produces a **continuous 0–100 Gemini confidence** with a pass/flag recommendation — `backend/agents/base_agent.py:72-73`: `max(0, min(100, int(result.get("confidence_score", 50))))`. Aggregation is `max_confidence` \+ "did any agent flag?" (`batch_service.py:216-246`); the fast path derives flags from hashes/RNG. No MBI-lock concept exists.

**Why it doesn't comply:** the scoring model on screen (three transparent values) and the scoring model in the code (LLM confidence) are different systems. The sponsor confirmed the discrete model specifically because it's explainable; LLM confidence is neither discrete nor reproducible.

**Suggested update:** a pure function in `rules_service.py`:

```py
def score_claim(rule_hits: set[str], mbi_locked: bool) -> float:
    hits = len(rule_hits) + (1 if mbi_locked else 0)
    return 0.00 if hits == 0 else (0.70 if hits == 1 else 0.95)
```

with supplier-level hits (R-02/R-04) joined onto each of that supplier's claims in the trigger window before counting. The Gemini agents can remain as *narrative enrichment* on flagged claims — they just can't be the scorer.

### FR-10: Instant pre-payment hold — NOT MET

**Requirement:** Any 0.95 claim gets an instant hold, $0 disbursed, applied in the processing flow before payment; releasable only by Level 1 appeal or human action.

**Code today:** no `held` status exists in either path or the seed vocabulary; approval writes `status='approved'` and returns *"Payment authorized. Metadata transmitted to VA Downstream Systems"* (`routes/claims.py:289-296, 340`). There is no payment step for the hold to precede (F-3).

**Suggested update:** add statuses `held / queued / disbursed` and a `disbursements` ledger table. The disposition step (FR-15) writes `held` for 0.95 claims *and never writes a ledger row for them* — making "$0 disbursed to the scheme" a queryable fact instead of a slide claim. Only the appeals service (FR-26) or an authenticated reviewer action may transition `held → released`.

### FR-11: Auditor Review Queue — NOT MET (and one behavior actively contradicts it)

**Requirement:** 0.70 claims go to a 24-sim-hour review queue with rule-hit evidence; reviewer can **release or escalate** (payment deferred, *not denied*); unreviewed claims at 24h stay deferred and get flagged "SLA breached" — they never auto-pay and never auto-hold.

**Code today:** flagged claims are reviewed with **approve/deny** actions (`routes/claims.py:289-292`) — "deny" being precisely what FR-11 says the queue must not do. There is no SLA tracking (the "4.0h" figure at `AuditResponseTime.tsx:35` is a chart constant). Most importantly, the fast path **auto-approves flagged claims when the queue exceeds 60**:

```py
# backend/services/fake_batch_service.py:378-382
else:
    # Queue is full — auto-approve instead of adding to queue
    claim_status = "approved"
```

**Why it doesn't comply:** auto-approving a fraud-flagged claim is the exact "auto-pay" failure the requirement (and success metric SM-2's $0-disbursed guarantee) exists to prevent — and it lives in the path the demo UI actually uses.

**Suggested update:** remove the queue-cap auto-approve entirely (an unbounded queue is fine at demo scale; if a cap is wanted, overflow should *stay deferred*, never approve). Change reviewer actions to `release` / `escalate_to_hold`. Add `queued_at_sim_time` and a sim-clock sweep that marks `sla_breached = TRUE` at \+24 sim-hours without changing disposition. Attach the rule-hit evidence list (from FR-5–FR-8) to each queue entry.

### FR-12: Immediate disbursement of safe claims — NOT MET

**Requirement:** 0.00 claims (no hits, no MBI lock) disburse immediately through a simulated HIGLAS endpoint, leaving a completed disbursement record.

**Code today:** "HIGLAS" appears nowhere in the backend; clean claims get `status='approved'` with no payment record (`batch_service.py:248-251`).

**Suggested update:** a small `higlas_service.py` that writes a `disbursements` row (`claim_id, amount, sim_disbursed_at`) and stamps the claim `disbursed`. This is mostly bookkeeping — but it's the bookkeeping every headline metric depends on.

---

## §4.4–§4.7 The Four Agents

*Context: `backend/agents/registry.py:13-22` registers the eight VA-era agents (rules\_engine, data\_validation, pension\_poaching, claim\_sharking, dbq\_fraud, overlapping\_claims, medical\_record, claim\_discrepancy). The PRD's four agents — Trust Defender, Crush Fraud, System Resilience, Program Integrity Ops — have no implementations. The recommended shape: four new services emitting events (FR-21) rather than four more Gemini prompt subclasses; Gemini can narrate findings, but detection must be computed.*

### FR-13: Agent 1 — ownership-transfer anomaly detection — NOT MET

**Requirement:** Detect an anomalous cluster of ownership/AO changes among dormant suppliers (proposed: ≥5 in 30 sim-days sharing an attribute) and raise **one** early-warning event listing the NPIs; baseline churn raises zero.

**Code today:** no PECOS event stream, no dormancy computation, no early-warning event type (F-1). The ADK's ownership-transfer rule (`detection.py:105-117`) screens one applicant at a time at enrollment — no clustering, no dormancy, no warning artifact.

**Suggested update:** an `agent1_service` that scans `pecos_events` on the sim clock, groups changes among dormant NPIs (reusing R-02's dormancy computation) by shared AO/address/acquirer within a rolling 30-sim-day window, and emits a single `early_warning` event (with the NPI list) when the threshold trips. The generator must include benign ownership churn to prove the zero-false-warning consequence.

### FR-14: Agent 1 — shadow-mode fraud simulation — NOT MET (different feature exists)

**Requirement:** Generate a simulated multi-state catheter billing burst as clearly segregated shadow traffic, and publish a threat profile (codes, geography, supplier set) to Agent 2\.

**Code today:** the "$400M Catheter Phantom Billing Syndicate" burst is a client-side animation with fixture data (`DMELoopholeSimulator.tsx:63-74, 165-194`) — no request leaves the browser. The ADK's adversarial probe (`adversarial.py:25-58`) is real computation, but it probes enrollment screening with 4 fixtures, not billing.

**Suggested update:** generate shadow claims into a `shadow_claims` table (or a `is_shadow` flag that every disposition/ledger/metric query excludes — enforced in one shared query helper so segregation can't be forgotten), then emit a `threat_profile` event consumed by Agent 2 (FR-21).

### FR-15: Agent 2 — real-time pre-payment decisioning — NOT MET

**Requirement:** Every incoming claim is evaluated against R-01–R-04, scored, and dispositioned (hold/review/pay) before payment; $0 to scheme claims across the run; within NFR-1's 5-second bound.

**Code today:** both processing paths are *batch* loops over uploaded claims (`batch_service.py:76,152`), not a stream; neither evaluates rules or writes payment outcomes. The demo UI's SSE endpoint is wired to the RNG-based fast path (`routes/batches.py:212-227`), and the real Gemini path isn't reachable from the UI at all. On top of that, the frontend *fabricates its own* 10,000-claim ingestion animation client-side while connected (`useBatchProcessing.ts:203-255, 378-402`).

**Suggested update:** this becomes thin once FR-5–FR-12 exist: a per-claim pipeline `evaluate rules → score → dispose (hold/queue/disburse) → emit SSE event`, run over the generator's stream on the sim clock. Deterministic SQL evaluation easily meets 5s/claim (log `decision_latency_ms` per claim to prove NFR-1). Remove `startFakeEvents` from `useBatchProcessing.ts` so the UI shows only real events.

### FR-16: Investigator triage by dollar exposure — NOT MET

**Requirement:** The review queue and hold list are ordered by potential loss value, highest first.

**Code today:** every claim listing orders by recency — `ORDER BY created_at` (`routes/claims.py:81,108,126,148`).

**Suggested update:** the smallest fix in this report: `ORDER BY billing_amount DESC` on the queue/hold endpoints (once those endpoints exist), with `billing_amount` surfaced as "exposure" in the UI.

### FR-17: Agent 3 — shell network unmasking — NOT MET (strong building block exists)

**Requirement:** Correlate **held claims** with PECOS records to identify the connected shell network (shared AOs, addresses, acquisition timing); flag the 15 enrollments for revocation; demo reports "15 bad-actor enrollments flagged/revoked."

**Code today:** the ADK's detection engine (`enrollment_agent/engine/detection.py:83-166`) genuinely computes network signals — shared registered agents, CMRA clustering, phoenix similarity — deterministically, which is exactly the right pattern. But it runs on its own \~7-entity enrollment fixture world, has zero linkage to claims (no held claims exist anyway), and outputs screening-tier recommendations, not revocation flags. Note also: it's wired in via a `sys.path` hack that **raises at import and crashes app startup** if the ADK directory is missing (`routes/enrollment_integrity.py:19-22`) — worth fixing regardless.

**Suggested update:** port the ADK's correlation logic into an `agent3_service` that starts from the held-claim set, joins to `pecos_records`/`pecos_events`, unions suppliers sharing AO/address/acquirer into connected components, and emits a `network_finding` event (`supplier_npis[], link_evidence, action='revocation_flagged'`). Against the generated data this yields "15" as a computed result rather than a UI constant. Make the ADK import optional (log-and-disable instead of raise).

### FR-18: Compromised-MBI lockdown & prior-auth hardening — NOT MET

**Requirement:** Mark compromised MBIs so later claims are elevated (lock counts as one rule hit per FR-9 — so a zero-hit claim on a locked MBI scores 0.70 and never auto-disburses); produce a prior-auth-hardening recommendation naming the exploited gap, visible as a demo artifact.

**Code today:** no MBI or lock concept exists (F-1). The only generated "hardening" text is the ADK probe's enrollment-seam finding (`adversarial.py:44-52`) — a different gap than catheter prior-auth.

**Suggested update:** an `mbi_locks` table (`mbi, locked_at_sim_time, reason, source_event`) written by Agent 3 for MBIs on held scheme claims; the FR-9 scorer checks it (`mbi_locked` parameter above). Emit a `hardening_recommendation` artifact (JSON/markdown) naming the gap ("no prior-auth enforcement on A4351-3 for suppliers \<N months old") and the proposed check, rendered by the demo surface.

### FR-19: Referral dossier generation — NOT MET

**Requirement:** Agent 4 generates the DOJ/NFED referral dossier — financial trail, beneficiary impact, billing logs — traceable to the underlying claims and PECOS events, incorporating failed-appeal evidence.

**Code today:** `NFEDReferralsPage.tsx:43-113` renders a hardcoded `REFERRAL_CASES` array (one entry even still cites "25 distinct **veterans**"); the Compile/Download flow is a staged animation that assembles a text file from those fixtures in the browser (lines 129-186). The page imports no API service. "Dossier" appears in zero backend files.

**Suggested update:** a `dossier_service.py` that queries actual run state — held claims and amounts by supplier (financial trail), affected MBIs (beneficiary impact), rule-hit evidence per claim (billing log), the Agent 3 network finding, and Level-2 ALJ entries (failed-appeal evidence) — into a structured JSON dossier, rendered/exported by the API. Every figure in it becomes click-through traceable, which is the PRD's point. `NFEDReferralsPage` then fetches instead of hardcoding.

### FR-20: Policy edit recommendation — NOT MET

**Requirement:** A recommended nationwide claim-edit derived from the detected pattern, naming HCPCS codes, threshold logic, and evidence-grounded rationale.

**Code today:** HCPCS codes and thresholds appear only as frontend animation constants (`DMELoopholeSimulator.tsx:63-101`, `policyEnforced` toggle).

**Suggested update:** generate it from run statistics in `dossier_service` (or a sibling): the flagged HCPCS codes, the observed quantity distribution vs. caps, and a proposed edit ("national quantity threshold edit on A4351-3 absent prior auth"), emitted as the fourth milestone artifact.

---

## §4.8 Orchestration & Demo Execution

### FR-21: Agent choreography as milestone sequence — NOT MET

**Requirement:** All four agents run concurrently with observable handoff events, and the milestone order (early warning → first hold → network finding → dossier) holds in every run.

**Code today:** processing is a nested sequential `for` loop (claims × agents — `batch_service.py:76,152`); there is no event bus, no milestone event types, and no `asyncio.gather`/task/queue usage anywhere in the backend.

**Suggested update:** a `system_events` table \+ SSE fan-out with typed events (`early_warning, threat_profile, claim_held, network_finding, hardening_recommendation, dossier_ready, appeal_*, sla_breached`), with agents running as concurrent asyncio tasks over the stream. Milestone ordering falls out of the data dependencies (Agent 3 consumes held claims; Agent 4 consumes network findings) rather than needing artificial gates — but assert the order in an integration test per the FR's "every run" language.

### FR-22: Dynamic execution — NOT MET (current behavior diverges)

**Requirement:** Dispositions, findings, and artifacts come from live evaluation; changing the input data (scheme size, timing) changes the outputs with no code changes.

**Code today:** the outputs that matter are constants: `ringSize: 15` and `$400M` (`DMELoopholeSimulator.tsx:63-74`), appeal outcomes keyed off a dropdown string (lines 140-160), browser-fabricated claim streams (lines 165-194; `useBatchProcessing.ts:203-255`), and hardcoded dossier fixtures. Re-running with different data changes nothing on screen.

**Why it matters:** this is the FR a sponsor can falsify in one sentence ("make it 20 suppliers"). It's also the PRD's explicit definition of success.

**Suggested update:** this FR is *earned* by the rest of the report rather than built directly: once counts, tallies, and artifacts are computed from generated data (FR-1–FR-20), re-running the generator with `--shells 20` changes every downstream number. The specific code action here is **deleting** the fabrication: the `DME_SCENARIOS` constants, the fake `setInterval` streams, and `startFakeEvents`.

### FR-23: Demo observability (8 moments) — NOT MET (0 of 8 backed by the system)

**Requirement:** Eight live-observable moments: early warning; hold count accumulating; "$0 disbursed to scheme" tally; live friction rate vs the 1.5% KPI; the Vance auto-release (\<3s, $0.00 admin cost); the Jackson rejection \+ ALJ routing; "15 enrollments flagged"; dossier availability.

**Code today:** moments 5, 6, and 8 are scripted animations (see FR-26/27/19); moments 1, 2, 3, 4, and 7 have no source of truth at all. There are no ground-truth labels to compute the friction rate from; "1.5%" appears once as static text (`DMELoopholeSimulator.tsx:676`). The analytics charts nearest these metrics are fabricated arrays (`RulePerformanceChart.tsx:23-38`; `CaseOfficerFalsePositiveChart.tsx:23-31` — whose fake data averages \~5.2%, above the advertised KPI).

**Suggested update:** a `metrics_service.py` computing, from the ledger and labels: hold count, scheme-disbursement total (must be $0), friction rate \= delayed legitimate claims ÷ all legitimate claims (per OQ-12, auto-released holds still count). Expose via `/api/metrics/live` \+ SSE; drive an event-timeline dashboard (the PRD's default surface pending OQ-8) from `system_events`. Each of the 8 moments maps to an event type or metric — build the panel *from* them.

### FR-28: Simulation time model — NOT MET

**Requirement:** A compressed virtual Simulation Clock; all dataset timestamps in sim time; all rule windows evaluated against it; configurable compression; results invariant to compression ratio; pre-aged history satisfying every look-back at sim start.

**Code today:** no clock abstraction exists; `datetime.now(timezone.utc)` is used throughout (`seed.py:76`, `batch_service.py:179`, `fake_batch_service.py:263`, `monitoring_service.py:9`, `analytics_service.py:53,87`, `routes/claims.py:273`); seed dates are static 2025 strings.

**Suggested update:** build this **first** — every rule and SLA depends on it:

```py
class SimulationClock:
    def __init__(self, sim_start: datetime, compression: float):
        self._sim_start, self._compression = sim_start, compression
        self._wall_start = datetime.now(timezone.utc)
    def now(self) -> datetime:  # simulated now
        elapsed = datetime.now(timezone.utc) - self._wall_start
        return self._sim_start + elapsed * self._compression
```

Rule windows compare *stored sim timestamps* to each other (never wall time), which is what makes results compression-invariant. The generator writes all history relative to `sim_start`. Ban direct `datetime.now()` in domain code (a lint/grep check keeps it honest).

### FR-29: Demo scenario driver — NOT MET

**Requirement:** A driver fires the scripted beats (Vance appeal, Jackson appeal, auditor-action fallback) at defined sim-clock times, every run, without manual intervention; a presenter *may* act live, with the driver as fallback.

**Code today:** the only beats are presenter-clicked buttons (`handleSimulateAppeal`, `DMELoopholeSimulator.tsx:125`; `handleLaunchSimulation`, `EnrollmentPage.tsx:424`) — the inverse of "without manual intervention." No scheduler or fallback exists.

**Suggested update:** a `scenario_driver.py` reading a YAML script (`- at: sim+6d, action: file_appeal, claim: <vance_claim_id>`), scheduling actions on the sim clock via the real APIs (the appeals endpoint of FR-25, the reviewer endpoint of FR-11). Presenter actions supersede pending driver actions for the same beat; otherwise the driver fires.

---

## §4.9 Appeals & Hold Release

*Shared fact for all three FRs: `grep -r "appeal" backend/ --include='*.py'` returns **zero matches**. The entire two-tier appeals flow currently exists as one frontend function — `handleSimulateAppeal` (`DMELoopholeSimulator.tsx:125-159`) — which appends log strings on 1.0s/2.5s timers and branches on `if (appealClaim === 'vance')`. It makes no network calls.*

### FR-25: Electronic appeal intake — NOT MET

**Requirement:** A provider can file an electronic appeal against a hold, immediately triggering Level 1 adjudication; both demo cases are filed by the scenario driver.

**Suggested update:** `POST /api/appeals` (`claim_id`) → validates the claim is `held` → creates an `appeals` row (`status='level1_pending'`) → invokes Level 1 (FR-26) inline → emits `appeal_filed` / `appeal_adjudicated` events. New `appeals` table: `appeal_id, claim_id, filed_at_sim, level, status, evidence_found, decided_at_wall`.

### FR-26: Level 1 automated adjudication & auto-release — NOT MET

**Requirement:** Cross-reference the Consult Registry; if Qualifying Evidence exists (CPT-99214 within ±10 days of the claim's *service date* for the claim's MBI, or a valid clinical modifier on the claim), auto-release the hold and disburse. Vance's release completes in **under 3 seconds, measured**; the surface shows a $0.00 admin-cost figure; nothing else auto-releases a hold.

**Code today:** the outcome is predetermined by the dropdown selection; the "consult found" message, the "$0.00 administrative cost" line, and the "\<3 seconds" claim are all literal strings (`DMELoopholeSimulator.tsx:145-146, 728`); the 2.5-second `setTimeout` is a pacing constant, not a measurement. There is no registry to query (FR-24) and no hold to release (FR-10).

**Suggested update:**

```py
async def adjudicate_level1(appeal, clock):
    t0 = time.monotonic()
    claim = await get_claim(appeal.claim_id)
    evidence = await query_consults(          # FR-24 table
        mbi=claim.mbi, cpt="99214",
        window=(claim.sim_service_date - 10d, claim.sim_service_date + 10d),
    ) or claim.modifier is not None
    if evidence:
        await release_hold(claim); await disburse(claim)   # FR-10/FR-12
    else:
        await escalate_to_alj(appeal)                      # FR-27
    appeal.latency_ms = (time.monotonic() - t0) * 1000     # NFR-3, measured
```

Emit the measured latency and the $0.00 admin-cost display value in the `appeal_adjudicated` event so the UI reports real numbers. The release path must be the *only* automatic route out of `held`.

### FR-27: Level 2 ALJ escalation — NOT MET

**Requirement:** No qualifying evidence → rejection, hold stays locked, claim routes to the Level 2 ALJ queue; its evidence is available to Agent 4's dossier; no payment ever occurs on ALJ-queued claims.

**Code today:** the "ALJ routing" is local React state and display strings that reset when the dropdown changes (`DMELoopholeSimulator.tsx:150-158, 693-694`); no table, endpoint, or page exists.

**Suggested update:** `alj_queue` table (`claim_id, appeal_id, entered_at_sim, evidence_summary`); the FR-26 else-branch writes to it and leaves the claim `held`; `dossier_service` (FR-19) joins it for failed-appeal evidence; assert in tests that no `disbursements` row can exist for an ALJ-queued claim.

---

## Non-functional requirements & success metrics

| Item | Today | Suggested update |
| :---- | :---- | :---- |
| **NFR-1** (≤5s decisioning) | Per-agent latency is recorded (`base_agent.py:59-88`) but never bounded; Gemini calls have no timeouts; the fast path "meets" latency only by fabricating results | Log `decision_latency_ms` in the FR-15 pipeline; assert p100 ≤ 5000ms in an integration test; deterministic SQL rules make this comfortable |
| **NFR-2** (≤15 min demo) | No runtime budget or end-to-end timing | Derives from FR-28/FR-29 config: compression ratio \+ driver script define runtime; time a full rehearsal run in CI |
| **NFR-3** (\<3s appeal, measured) | The 2.5s `setTimeout` is pacing, not measurement | Measured in the FR-26 code above; display the measured figure |
| **SM-1…SM-5, SM-C1** | No instrumentation; dashboard numbers are hardcoded arrays | `metrics_service.py` (FR-23) computes all six from the ledger, labels, and events; replace the fabricated chart datasets with API data |

**Test coverage note:** none of the 161 backend tests exercises any FR consequence above (all cover the VA-era stack), and the frontend has no test setup. The PRD's "Consequences (testable)" bullets are effectively a ready-made acceptance-test suite — recommend writing them as pytest cases as each FR lands (e.g., FR-5's "600 catheters vs 30-cap → hit; same claim \+ prior auth → no hit").

---

## Recommended sequence

The dependencies are strict, so order matters:

1. **FR-28 Simulation Clock \+ F-1 schema** — the substrate everything reads and writes.  
2. **FR-1–FR-4, FR-24 data generator** — entities, Viktor Scenario, Vance/Jackson, labels, pre-aged history.  
3. **FR-5–FR-8 deterministic rules → FR-9 scoring → FR-10–FR-12 dispositions/ledger** — the core control loop; remove the queue-full auto-approve (FR-11) here.  
4. **FR-25–FR-27 appeals** — small once holds and the consult registry exist.  
5. **FR-13–FR-20 agents \+ FR-21 events** — computed milestones replacing scripted ones.  
6. **FR-29 driver, FR-23 dashboard/metrics, FR-22 cleanup** — delete the fabricated frontend data last, after real events exist to replace it.

Two immediate quick wins regardless of sequence: remove the auto-approve-on-full-queue block (`fake_batch_service.py:378-382` — it contradicts the product's core guarantee), and correct the rule definitions in the UI copy (`DMELoopholeSimulator.tsx:622-625`) so nobody implements from the divergent text.  
