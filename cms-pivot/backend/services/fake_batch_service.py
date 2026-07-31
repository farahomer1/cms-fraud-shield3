# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""
Fast batch processing service that uses synthetic/fake agent results
instead of calling Gemini API. Achieves 20+ claims/second throughput.
"""
import hashlib
import json
import random
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator

from google.api_core.exceptions import BadRequest
from google.cloud import bigquery

from agents.registry import AGENT_REGISTRY, AGENT_DISPLAY_NAMES
from database import get_dataset, run_query, run_dml, insert_rows

import logging as _logging
_logger = _logging.getLogger(__name__)

# Maximum claims allowed in validation queue (flagged status)
MAX_VALIDATION_QUEUE = 60

# Fraud types per agent
FRAUD_TYPES = {
    "rules_engine": "rule-based anomaly detection",
    "data_validation": "data validation failure",
    "pension_poaching": "pension poaching scheme",
    "claim_sharking": "claim sharking pattern",
    "dbq_fraud": "DBQ questionnaire tampering",
    "overlapping_claims": "overlapping billing",
    "medical_record": "medical record inconsistency",
    "claim_discrepancy": "billing vs clinical discrepancy",
}

# Evidence summaries per agent (used when flagged)
FLAG_EVIDENCE = {
    "rules_engine": [
        "Multiple billing anomalies detected: procedure codes inconsistent with diagnosis.",
        "Billing amount exceeds 95th percentile for this procedure/diagnosis combination.",
        "Claim triggers 3+ automated fraud detection rules including duplicate billing patterns.",
        "Service date conflicts with veteran's recorded inpatient admission.",
    ],
    "data_validation": [
        "Veteran SSN last-4 mismatch with VA master record.",
        "Provider NPI validation failed against CMS NPPES registry.",
        "Service date precedes veteran's enrollment effective date.",
        "Deceased veteran flag triggered — claim filed after recorded date of death.",
    ],
    "pension_poaching": [
        "Provider has pattern of converting medical claims to pension benefits.",
        "Billing pattern consistent with known pension poaching scheme indicators.",
        "Multiple veterans from same provider filing similar pension claims within 30 days.",
    ],
    "claim_sharking": [
        "Provider solicitation pattern detected — high volume of new veteran patients.",
        "Billing amount significantly inflated compared to regional averages.",
        "Evidence of predatory billing practices targeting high-disability-rating veterans.",
    ],
    "dbq_fraud": [
        "DBQ responses show statistical improbability — all maximum severity ratings.",
        "Identical DBQ narrative text found across multiple unrelated veterans.",
        "DBQ completion timestamp indicates < 2 minutes for complex evaluation.",
    ],
    "overlapping_claims": [
        "Duplicate procedure codes billed within 7-day window for same veteran.",
        "Overlapping service dates with another approved claim for identical services.",
        "Provider billed both facility and professional fees for outpatient-only service.",
    ],
    "medical_record": [
        "Procedure billed not supported by documented medical necessity.",
        "Diagnosis code inconsistent with veteran's age/gender demographics.",
        "Treatment plan references conditions not documented in medical history.",
    ],
    "claim_discrepancy": [
        "Billed amount exceeds Medicare fee schedule by 300%+.",
        "Procedure complexity level (E&M code) not supported by documentation.",
        "Number of units billed exceeds clinical guidelines for this procedure.",
    ],
}

# Evidence summaries when passed
PASS_EVIDENCE = {
    "rules_engine": "All automated rules passed. No billing anomalies detected.",
    "data_validation": "All data fields validated successfully against VA records.",
    "pension_poaching": "No pension poaching indicators detected in billing pattern.",
    "claim_sharking": "Provider billing patterns within normal parameters.",
    "dbq_fraud": "DBQ responses consistent with documented medical condition.",
    "overlapping_claims": "No overlapping or duplicate claims found in lookback window.",
    "medical_record": "Medical records support billed procedures and diagnoses.",
    "claim_discrepancy": "Billing amounts and codes consistent with clinical documentation.",
}


def _generate_fake_finding(agent_name: str, claim_data: dict, rng: random.Random) -> dict:
    """Generate a synthetic agent finding without calling Gemini.

    Only a small fraction of claims get flagged (roughly 10-15%).
    Rules engine flags are slightly more common (20%).
    """
    fraud_type = FRAUD_TYPES.get(agent_name, "general fraud analysis")

    # Determine if this agent flags the claim
    # Base flag probability is low — most claims pass
    if agent_name == "rules_engine":
        flag_probability = 0.18  # Rules engine flags slightly more
    elif agent_name == "data_validation":
        flag_probability = 0.12
    else:
        flag_probability = 0.08  # Most agents rarely flag

    # Slightly increase flag probability for high-amount claims
    billing = claim_data.get("billing_amount", 0)
    if billing > 10000:
        flag_probability += 0.05
    if billing > 25000:
        flag_probability += 0.05

    flagged = rng.random() < flag_probability

    if flagged:
        confidence = rng.randint(55, 95)
        recommendation = "flag"
        evidence_list = FLAG_EVIDENCE.get(agent_name, ["Anomaly detected in claim data."])
        evidence = rng.choice(evidence_list)
        flagged_points = []
        if "billing" in evidence.lower() or "amount" in evidence.lower():
            flagged_points.append(f"billing_amount: ${billing:,.2f}")
        if "procedure" in evidence.lower():
            flagged_points.append(f"procedure_codes: {claim_data.get('procedure_codes', [])}")
        if "diagnosis" in evidence.lower():
            flagged_points.append(f"diagnosis_codes: {claim_data.get('diagnosis_codes', [])}")
        if not flagged_points:
            flagged_points.append(f"claim_number: {claim_data.get('claim_number', 'unknown')}")
    else:
        confidence = rng.randint(95, 100)
        recommendation = "pass"
        evidence = PASS_EVIDENCE.get(agent_name, "No anomalies detected.")
        flagged_points = []

    processing_time = rng.randint(15, 80)  # Fast fake processing (15-80ms)

    return {
        "agent_name": agent_name,
        "fraud_type": fraud_type,
        "confidence_score": confidence,
        "recommendation": recommendation,
        "flagged_data_points": flagged_points,
        "evidence_summary": evidence,
        "finding_details": {
            "analysis_type": "synthetic_fast",
            "billing_amount": billing,
            "claim_type": claim_data.get("claim_type", "unknown"),
        },
        "processing_time_ms": processing_time,
    }


async def _get_current_flagged_count() -> int:
    """Get current number of flagged claims in validation queue."""
    ds = get_dataset()
    rows = await run_query(
        f"SELECT COUNT(*) as cnt FROM `{ds}.claims` WHERE status = 'flagged'"  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
    )
    return rows[0].cnt if rows else 0


async def process_batch_claims_fast(batch_id: str, bq: bigquery.Client) -> AsyncGenerator[dict, None]:
    """Process all pending claims in a batch using fake agent results.

    Achieves 20+ claims/second by avoiding Gemini API calls.
    Respects validation queue cap of MAX_VALIDATION_QUEUE.
    """
    ds = get_dataset()

    # Load pending/parsed claims with veteran + provider data
    rows = await run_query(
        f"""SELECT c.*, v.name_display as v_name_display, v.ssn_last4 as v_ssn_last4,
               v.date_of_birth as v_dob, v.date_of_death as v_dod, v.vital_status as v_vital_status,
               v.service_branch as v_service_branch, v.disability_rating as v_disability_rating,
               p.name as p_name, p.npi as p_npi, p.provider_type as p_provider_type,
               p.specialty as p_specialty, p.risk_score as p_risk_score,
               p.accreditation_status as p_accreditation_status
        FROM `{ds}.claims` c
        LEFT JOIN `{ds}.veterans` v ON c.veteran_id = v.id
        LEFT JOIN `{ds}.providers` p ON c.provider_id = p.id
        WHERE c.batch_id = @batch_id AND c.status IN ('pending', 'parsed')
        ORDER BY c.claim_number""",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("batch_id", "STRING", batch_id)],
    )

    if not rows:
        yield {"type": "batch_complete", "data": {"batchId": batch_id, "totalClaims": 0, "flaggedCount": 0, "approvedCount": 0, "processingTimeMs": 0}}
        return

    total_agents = len(AGENT_REGISTRY)
    total_steps = len(rows) * (total_agents + 1)
    current_step = 0
    flagged_count = 0
    approved_count = 0

    # Get current validation queue size
    current_flagged_in_queue = await _get_current_flagged_count()

    # Use seeded RNG for reproducible results (hashlib is deterministic across restarts)
    seed = int(hashlib.md5(batch_id.encode(), usedforsecurity=False).hexdigest(), 16) & 0xFFFFFFFF
    rng = random.Random(seed)

    yield {"type": "batch_start", "data": {"batchId": batch_id, "totalClaims": len(rows), "totalAgents": total_agents}}

    # Batch all DML operations for speed — collect findings and audit entries
    # Process claims in groups for speed
    for claim_idx, row in enumerate(rows):
        claim_id = row.id
        claim_number = row.claim_number

        proc_codes = row.procedure_codes
        if isinstance(proc_codes, str):
            proc_codes = json.loads(proc_codes)
        diag_codes = row.diagnosis_codes
        if isinstance(diag_codes, str):
            diag_codes = json.loads(diag_codes)

        claim_data = {
            "claim_number": claim_number,
            "claim_type": row.claim_type,
            "billing_amount": float(row.billing_amount),
            "service_date": str(row.service_date),
            "diagnosis_codes": diag_codes or [],
            "procedure_codes": proc_codes or [],
        }

        # Parsing step
        current_step += 1
        yield {
            "type": "claim_start",
            "data": {
                "claimId": claim_id,
                "claimNumber": claim_number,
                "step": current_step,
                "totalSteps": total_steps,
                "message": f"Starting analysis of {claim_number}",
            },
        }

        # Update claim status to processing (may fail on streaming buffer — non-critical)
        try:
            await run_dml(
                f"UPDATE `{ds}.claims` SET status = 'processing' WHERE id = @cid",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
                [bigquery.ScalarQueryParameter("cid", "STRING", claim_id)],
            )
        except BadRequest as exc:
            if "streaming buffer" in str(exc):
                _logger.warning(f"Could not set claim {claim_id} to processing (streaming buffer); continuing")
            else:
                raise

        any_flagged = False
        max_confidence = 0
        flagged_agents = []
        now = datetime.now(timezone.utc).isoformat()

        # Run each agent (fake — no Gemini calls)
        findings_batch = []
        audit_batch = []

        for agent_idx, agent in enumerate(AGENT_REGISTRY):
            current_step += 1
            display_name = AGENT_DISPLAY_NAMES.get(agent.name, agent.name)

            yield {
                "type": "agent_start",
                "data": {
                    "claimId": claim_id,
                    "claimNumber": claim_number,
                    "agentName": agent.name,
                    "agentDisplayName": display_name,
                    "step": current_step,
                    "totalSteps": total_steps,
                    "message": f"{display_name} analyzing {claim_number}...",
                },
            }

            # Generate fake finding (no Gemini call!)
            finding = _generate_fake_finding(agent.name, claim_data, rng)
            finding_id = str(uuid.uuid4())

            findings_batch.append({
                "id": finding_id,
                "claim_id": claim_id,
                "agent_name": finding["agent_name"],
                "fraud_type": finding["fraud_type"],
                "confidence_score": int(finding["confidence_score"]),
                "recommendation": finding["recommendation"],
                "flagged_data_points": json.dumps(finding.get("flagged_data_points", [])),
                "evidence_summary": finding["evidence_summary"],
                "finding_details": json.dumps(finding.get("finding_details", {})),
                "processing_time_ms": finding.get("processing_time_ms", 0),
                "created_at": now,
            })

            audit_batch.append({
                "id": str(uuid.uuid4()),
                "timestamp": now,
                "actor": agent.name,
                "actor_type": "agent",
                "action_type": "finding",
                "claim_id": claim_id,
                "details": json.dumps({"recommendation": finding["recommendation"], "confidence": finding["confidence_score"]}),
                "confidence_score": finding["confidence_score"],
            })

            if finding["recommendation"] == "flag":
                any_flagged = True
                max_confidence = max(max_confidence, finding["confidence_score"])
                flagged_agents.append(agent.name)

            status = "flag" if finding["recommendation"] == "flag" else "pass"
            message_prefix = "[ALERT]" if status == "flag" else "[PASS]"

            yield {
                "type": "agent_complete",
                "data": {
                    "claimId": claim_id,
                    "claimNumber": claim_number,
                    "agentName": agent.name,
                    "agentDisplayName": display_name,
                    "status": status,
                    "recommendation": finding["recommendation"],
                    "confidenceScore": finding["confidence_score"],
                    "message": f"{message_prefix} {display_name}: {finding['evidence_summary'][:100]}",
                },
            }

        # Batch insert findings via DML for immediate availability
        for f in findings_batch:
            await run_dml(
                f"""INSERT INTO `{ds}.agent_findings`
                    (id, claim_id, agent_name, fraud_type, confidence_score,
                     recommendation, flagged_data_points, evidence_summary,
                     finding_details, processing_time_ms, created_at)
                    VALUES (@id, @claim_id, @agent_name, @fraud_type, @confidence_score,
                            @recommendation, PARSE_JSON(@flagged_data_points), @evidence_summary,
                            PARSE_JSON(@finding_details), @processing_time_ms, @created_at)""",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
                [
                    bigquery.ScalarQueryParameter("id", "STRING", f["id"]),
                    bigquery.ScalarQueryParameter("claim_id", "STRING", f["claim_id"]),
                    bigquery.ScalarQueryParameter("agent_name", "STRING", f["agent_name"]),
                    bigquery.ScalarQueryParameter("fraud_type", "STRING", f["fraud_type"]),
                    bigquery.ScalarQueryParameter("confidence_score", "INT64", f["confidence_score"]),
                    bigquery.ScalarQueryParameter("recommendation", "STRING", f["recommendation"]),
                    bigquery.ScalarQueryParameter("flagged_data_points", "STRING", f["flagged_data_points"]),
                    bigquery.ScalarQueryParameter("evidence_summary", "STRING", f["evidence_summary"]),
                    bigquery.ScalarQueryParameter("finding_details", "STRING", f["finding_details"]),
                    bigquery.ScalarQueryParameter("processing_time_ms", "INT64", f["processing_time_ms"]),
                    bigquery.ScalarQueryParameter("created_at", "STRING", f["created_at"]),
                ],
            )

        # Batch insert audit logs via streaming (faster, doesn't need immediate query)
        if audit_batch:
            await insert_rows("audit_log", audit_batch)

        # Classify claim — respect validation queue cap
        if any_flagged:
            # Check if adding to flagged would exceed queue limit
            if (current_flagged_in_queue + flagged_count + 1) <= MAX_VALIDATION_QUEUE:
                claim_status = "flagged"
                if max_confidence >= 90:
                    risk_level = "high"
                elif max_confidence >= 70:
                    risk_level = "medium"
                else:
                    risk_level = "low"
                flagged_count += 1
            else:
                # Queue is full — auto-approve instead of adding to queue
                claim_status = "approved"
                risk_level = None
                approved_count += 1
        else:
            claim_status = "approved"
            risk_level = None
            approved_count += 1

        try:
            await run_dml(
                f"UPDATE `{ds}.claims` SET status = @status, risk_level = @risk WHERE id = @cid",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
                [
                    bigquery.ScalarQueryParameter("status", "STRING", claim_status),
                    bigquery.ScalarQueryParameter("risk", "STRING", risk_level),
                    bigquery.ScalarQueryParameter("cid", "STRING", claim_id),
                ],
            )
        except BadRequest as exc:
            if "streaming buffer" in str(exc):
                _logger.warning(f"Could not update claim {claim_id} status (streaming buffer); continuing")
            else:
                raise

        yield {
            "type": "claim_complete",
            "data": {
                "claimId": claim_id,
                "claimNumber": claim_number,
                "status": claim_status,
                "riskLevel": risk_level,
                "flaggedAgents": flagged_agents,
            },
        }

    # Update batch (may fail on streaming buffer — non-critical)
    try:
        await run_dml(
            f"""UPDATE `{ds}.batches`
            SET status = 'completed', flagged_count = @flagged, approved_count = @approved, total_claims = @total
            WHERE id = @bid""",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
            [
                bigquery.ScalarQueryParameter("flagged", "INT64", flagged_count),
                bigquery.ScalarQueryParameter("approved", "INT64", approved_count),
                bigquery.ScalarQueryParameter("total", "INT64", len(rows)),
                bigquery.ScalarQueryParameter("bid", "STRING", batch_id),
            ],
        )
    except BadRequest as exc:
        if "streaming buffer" in str(exc):
            _logger.warning(f"Could not update batch {batch_id} status (streaming buffer); continuing")
        else:
            raise

    yield {
        "type": "batch_complete",
        "data": {
            "batchId": batch_id,
            "totalClaims": len(rows),
            "flaggedCount": flagged_count,
            "approvedCount": approved_count,
        },
    }
