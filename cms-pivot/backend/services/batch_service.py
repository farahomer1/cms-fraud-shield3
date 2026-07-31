# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import json
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator

import logging as _logging

from google.api_core.exceptions import BadRequest
from google.cloud import bigquery

from agents.registry import AGENT_REGISTRY, AGENT_DISPLAY_NAMES
from database import get_dataset, run_query, insert_rows, run_dml

_logger = _logging.getLogger(__name__)


async def process_batch_claims(batch_id: str, bq: bigquery.Client) -> AsyncGenerator[dict, None]:
    """Process all pending claims in a batch, yielding SSE events."""
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

    # Get all claims in batch for overlapping analysis
    all_batch_rows = await run_query(
        f"""SELECT claim_number, veteran_id, provider_id, service_date,
               billing_amount, procedure_codes, diagnosis_codes
        FROM `{ds}.claims` WHERE batch_id = @batch_id""",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("batch_id", "STRING", batch_id)],
    )
    batch_claims_data = []
    for c in all_batch_rows:
        proc_codes = c.procedure_codes
        if isinstance(proc_codes, str):
            proc_codes = json.loads(proc_codes)
        diag_codes = c.diagnosis_codes
        if isinstance(diag_codes, str):
            diag_codes = json.loads(diag_codes)
        batch_claims_data.append({
            "claim_number": c.claim_number,
            "veteran_id": c.veteran_id,
            "provider_id": c.provider_id,
            "service_date": str(c.service_date),
            "billing_amount": float(c.billing_amount),
            "procedure_codes": proc_codes or [],
            "diagnosis_codes": diag_codes or [],
        })

    total_agents = len(AGENT_REGISTRY)
    total_steps = len(rows) * (total_agents + 1)  # +1 for parsing step
    current_step = 0
    flagged_count = 0
    approved_count = 0

    yield {"type": "batch_start", "data": {"batchId": batch_id, "totalClaims": len(rows), "totalAgents": total_agents}}

    for claim_idx, row in enumerate(rows):
        claim_id = row.id
        claim_number = row.claim_number

        proc_codes = row.procedure_codes
        if isinstance(proc_codes, str):
            proc_codes = json.loads(proc_codes)
        diag_codes = row.diagnosis_codes
        if isinstance(diag_codes, str):
            diag_codes = json.loads(diag_codes)
        norm_data = row.normalized_data
        if isinstance(norm_data, str):
            norm_data = json.loads(norm_data)

        claim_data = {
            "claim_number": claim_number,
            "claim_type": row.claim_type,
            "billing_amount": float(row.billing_amount),
            "service_date": str(row.service_date),
            "diagnosis_codes": diag_codes or [],
            "procedure_codes": proc_codes or [],
            "normalized_data": norm_data or {},
        }

        veteran_data = None
        if row.v_name_display:
            veteran_data = {
                "name_display": row.v_name_display,
                "ssn_last4": row.v_ssn_last4 or "",
                "date_of_birth": str(row.v_dob) if row.v_dob else None,
                "date_of_death": str(row.v_dod) if row.v_dod else None,
                "vital_status": row.v_vital_status or "alive",
                "service_branch": row.v_service_branch,
                "disability_rating": row.v_disability_rating,
            }

        provider_data = None
        if row.p_name:
            provider_data = {
                "name": row.p_name,
                "npi": row.p_npi or "",
                "provider_type": row.p_provider_type or "individual",
                "specialty": row.p_specialty,
                "risk_score": row.p_risk_score or 0,
                "accreditation_status": row.p_accreditation_status or "accredited",
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

        # Run each agent
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

            # Run agent
            finding = await agent.analyze(
                claim_data=claim_data,
                veteran_data=veteran_data,
                provider_data=provider_data,
                batch_claims=batch_claims_data,
            )

            # Save finding (use DML INSERT instead of streaming insert so rows
            # are immediately eligible for UPDATE/DELETE on batch re-processing)
            now = datetime.now(timezone.utc).isoformat()
            finding_id = str(uuid.uuid4())
            await run_dml(
                f"""INSERT INTO `{ds}.agent_findings`
                    (id, claim_id, agent_name, fraud_type, confidence_score,
                     recommendation, flagged_data_points, evidence_summary,
                     finding_details, processing_time_ms, created_at)
                    VALUES (@id, @claim_id, @agent_name, @fraud_type, @confidence_score,
                            @recommendation, PARSE_JSON(@flagged_data_points), @evidence_summary,
                            PARSE_JSON(@finding_details), @processing_time_ms, @created_at)""",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
                [
                    bigquery.ScalarQueryParameter("id", "STRING", finding_id),
                    bigquery.ScalarQueryParameter("claim_id", "STRING", claim_id),
                    bigquery.ScalarQueryParameter("agent_name", "STRING", finding["agent_name"]),
                    bigquery.ScalarQueryParameter("fraud_type", "STRING", finding["fraud_type"]),
                    bigquery.ScalarQueryParameter("confidence_score", "INT64", int(finding["confidence_score"])),
                    bigquery.ScalarQueryParameter("recommendation", "STRING", finding["recommendation"]),
                    bigquery.ScalarQueryParameter("flagged_data_points", "STRING", json.dumps(finding.get("flagged_data_points", []))),
                    bigquery.ScalarQueryParameter("evidence_summary", "STRING", finding["evidence_summary"]),
                    bigquery.ScalarQueryParameter("finding_details", "STRING", json.dumps(finding.get("finding_details", {}))),
                    bigquery.ScalarQueryParameter("processing_time_ms", "INT64", finding.get("processing_time_ms", 0)),
                    bigquery.ScalarQueryParameter("created_at", "STRING", now),
                ],
            )

            # Audit log
            await insert_rows("audit_log", [{
                "id": str(uuid.uuid4()),
                "timestamp": now,
                "actor": agent.name,
                "actor_type": "agent",
                "action_type": "finding",
                "claim_id": claim_id,
                "details": json.dumps({"recommendation": finding["recommendation"], "confidence": finding["confidence_score"]}),
                "confidence_score": finding["confidence_score"],
            }])

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

        # Classify claim
        if any_flagged:
            claim_status = "flagged"
            if max_confidence >= 90:
                risk_level = "high"
            elif max_confidence >= 70:
                risk_level = "medium"
            else:
                risk_level = "low"
            flagged_count += 1
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
