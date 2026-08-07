# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from google.cloud import bigquery

from database import get_db, get_dataset, run_query, run_query_single, run_dml, insert_rows
from models.claim import Claim
from models.beneficiary import Beneficiary
from models.provider import Provider
from models.agent_finding import AgentFinding
from models.decision import Decision
from schemas.claim import DecisionRequest, GenerateNotesRequest

router = APIRouter(prefix="/api/claims", tags=["claims"])


@router.get("")
async def list_claims(
    status: str | None = None,
    risk_level: str | None = None,
    batch_id: str | None = None,
    provider_id: str | None = None,
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    bq: bigquery.Client = Depends(get_db),
):
    ds = get_dataset()
    conditions = []
    params = []
    if status:
        # Decision-aware filtering: the claim status UPDATE may not go through
        # due to BQ streaming buffer, so we also consult the decisions table.
        if status == "flagged":
            conditions.append("c.status IN ('flagged', 'held')")
            # NOT EXISTS is NULL-safe (unlike NOT IN which fails if any claim_id is NULL)
            conditions.append(f"""NOT EXISTS (
                SELECT 1 FROM `{ds}.decisions` d WHERE d.claim_id = c.id
            )""")  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        elif status == "approved":
            conditions.append(f"""(
                c.status IN ('approved', 'disbursed')
                OR EXISTS (
                    SELECT 1 FROM `{ds}.decisions` d
                    WHERE d.claim_id = c.id AND d.decision_type = 'approved'
                )
            )""")
        elif status == "denied":
            conditions.append(f"""(
                c.status = 'denied'
                OR EXISTS (
                    SELECT 1 FROM `{ds}.decisions` d
                    WHERE d.claim_id = c.id AND d.decision_type = 'denied'
                )
            )""")
        else:
            conditions.append("c.status = @status")
            params.append(bigquery.ScalarQueryParameter("status", "STRING", status))
    if risk_level:
        conditions.append("c.risk_level = @risk_level")
        params.append(bigquery.ScalarQueryParameter("risk_level", "STRING", risk_level))
    if batch_id:
        conditions.append("c.batch_id = @batch_id")
        params.append(bigquery.ScalarQueryParameter("batch_id", "STRING", batch_id))
    if provider_id:
        conditions.append("c.provider_id = @provider_id")
        params.append(bigquery.ScalarQueryParameter("provider_id", "STRING", provider_id))

    params.append(bigquery.ScalarQueryParameter("lim", "INT64", limit))
    params.append(bigquery.ScalarQueryParameter("off", "INT64", offset))

    order_by = "c.created_at DESC"
    if status in ("flagged", "queued"):
        order_by = "c.billing_amount DESC, c.updated_at DESC"

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"""
        SELECT c.*, v.name_display as v_name_display, v.ssn_last4 as v_ssn_last4,
               v.date_of_birth as v_dob, v.date_of_death as v_dod, v.vital_status as v_vital_status,
               v.service_branch as v_service_branch, v.disability_rating as v_disability_rating,
               p.name as p_name, p.npi as p_npi, p.provider_type as p_provider_type,
               p.specialty as p_specialty, p.address as p_address, p.risk_score as p_risk_score,
               p.accreditation_status as p_accreditation_status
         FROM `{ds}.claims` c
         LEFT JOIN `{ds}.members` v ON c.beneficiary_id = v.id
         LEFT JOIN `{ds}.providers` p ON c.provider_id = p.id
         {where}
         ORDER BY {order_by}
         LIMIT @lim OFFSET @off
    """  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
    rows = await run_query(query, params or None)
    claims_list = []
    claim_ids = []
    for r in rows:
        claim = Claim.from_bq_row(r)
        claim.beneficiary = Beneficiary(
            id=r.beneficiary_id, name_display=r.v_name_display or "", ssn_last4=r.v_ssn_last4 or "",
            date_of_birth=r.v_dob, date_of_death=r.v_dod, vital_status=r.v_vital_status or "alive",
            service_branch=r.v_service_branch, disability_rating=r.v_disability_rating,
        )
        claim.provider = Provider(
            id=r.provider_id, name=r.p_name or "", npi=r.p_npi or "",
            provider_type=r.p_provider_type or "individual", specialty=r.p_specialty,
            address=json.loads(r.p_address) if isinstance(r.p_address, str) else (r.p_address or {}),
            risk_score=r.p_risk_score or 0, accreditation_status=r.p_accreditation_status or "accredited",
        )
        claims_list.append(claim)
        claim_ids.append(claim.id)

    # Batch-load agent findings for all claims
    if claim_ids:
        findings_query = f"""
            SELECT * FROM `{ds}.agent_findings`
            WHERE claim_id IN UNNEST(@claim_ids)
            ORDER BY created_at
        """  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        findings_rows = await run_query(
            findings_query,
            [bigquery.ArrayQueryParameter("claim_ids", "STRING", claim_ids)],
        )
        findings_by_claim: dict[str, list] = {}
        for fr in findings_rows:
            finding = AgentFinding.from_bq_row(fr)
            findings_by_claim.setdefault(finding.claim_id, []).append(finding)
        for claim in claims_list:
            claim.findings = findings_by_claim.get(claim.id, [])

    # Batch-load decisions for all claims (latest per claim wins)
    if claim_ids:
        decisions_query = f"""
            SELECT * FROM `{ds}.decisions`
            WHERE claim_id IN UNNEST(@claim_ids)
            ORDER BY created_at ASC
        """  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        decisions_rows = await run_query(
            decisions_query,
            [bigquery.ArrayQueryParameter("claim_ids", "STRING", claim_ids)],
        )
        decisions_by_claim: dict[str, Decision] = {}
        for dr in decisions_rows:
            decision = Decision.from_bq_row(dr)
            # Later rows overwrite earlier ones, so the most recent decision wins
            decisions_by_claim[decision.claim_id] = decision
        for claim in claims_list:
            claim.decision = decisions_by_claim.get(claim.id, None)

    return [c.to_dict() for c in claims_list]


@router.get("/agent-flags")
async def list_agent_flags(bq: bigquery.Client = Depends(get_db)):
    """Return all agent flags for the Agent Management page."""
    ds = get_dataset()
    rows = await run_query(
        f"SELECT * FROM `{ds}.agent_flags` ORDER BY created_at DESC"  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
    )
    return [
        {
            "id": r.id,
            "agentName": r.agent_name,
            "claimId": r.claim_id,
            "claimNumber": r.claim_number,
            "flaggedBy": r.flagged_by,
            "notes": r.notes,
            "timestamp": r.created_at,
        }
        for r in rows
    ]


@router.delete("/agent-flags/{flag_id}")
async def delete_agent_flag(flag_id: str, bq: bigquery.Client = Depends(get_db)):
    """Delete a single agent flag by ID."""
    ds = get_dataset()
    affected = await run_dml(
        f"DELETE FROM `{ds}.agent_flags` WHERE id = @flag_id",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("flag_id", "STRING", flag_id)],
    )
    if affected == 0:
        raise HTTPException(status_code=404, detail="Flag not found")
    return {"deleted": flag_id}


@router.get("/{claim_id}")
async def get_claim(claim_id: str, bq: bigquery.Client = Depends(get_db)):
    ds = get_dataset()
    row = await run_query_single(
        f"""SELECT c.*, v.name_display as v_name_display, v.ssn_last4 as v_ssn_last4,
               v.date_of_birth as v_dob, v.date_of_death as v_dod, v.vital_status as v_vital_status,
               v.service_branch as v_service_branch, v.disability_rating as v_disability_rating,
               v.benefits_enrolled as v_benefits_enrolled,
               p.name as p_name, p.npi as p_npi, p.provider_type as p_provider_type,
               p.specialty as p_specialty, p.address as p_address, p.risk_score as p_risk_score,
               p.accreditation_status as p_accreditation_status, p.claim_history as p_claim_history
        FROM `{ds}.claims` c
        LEFT JOIN `{ds}.members` v ON c.beneficiary_id = v.id
        LEFT JOIN `{ds}.providers` p ON c.provider_id = p.id
        WHERE c.id = @claim_id""",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("claim_id", "STRING", claim_id)],
    )
    if not row:
        raise HTTPException(status_code=404, detail="Claim not found")

    claim = Claim.from_bq_row(row)
    claim.beneficiary = Beneficiary(
        id=row.beneficiary_id, name_display=row.v_name_display or "", ssn_last4=row.v_ssn_last4 or "",
        date_of_birth=row.v_dob, date_of_death=row.v_dod, vital_status=row.v_vital_status or "alive",
        service_branch=row.v_service_branch, disability_rating=row.v_disability_rating,
        benefits_enrolled=json.loads(row.v_benefits_enrolled) if isinstance(row.v_benefits_enrolled, str) else row.v_benefits_enrolled,
    )
    claim.provider = Provider(
        id=row.provider_id, name=row.p_name or "", npi=row.p_npi or "",
        provider_type=row.p_provider_type or "individual", specialty=row.p_specialty,
        address=json.loads(row.p_address) if isinstance(row.p_address, str) else (row.p_address or {}),
        risk_score=row.p_risk_score or 0, accreditation_status=row.p_accreditation_status or "accredited",
        claim_history=json.loads(row.p_claim_history) if isinstance(row.p_claim_history, str) else (row.p_claim_history or {}),
    )

    # Load findings
    findings_rows = await run_query(
        f"SELECT * FROM `{ds}.agent_findings` WHERE claim_id = @claim_id ORDER BY created_at",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("claim_id", "STRING", claim_id)],
    )
    claim.findings = [AgentFinding.from_bq_row(f) for f in findings_rows]

    # Load decision (latest one wins when multiple exist)
    decision_row = await run_query_single(
        f"SELECT * FROM `{ds}.decisions` WHERE claim_id = @claim_id ORDER BY created_at DESC LIMIT 1",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("claim_id", "STRING", claim_id)],
    )
    claim.decision = Decision.from_bq_row(decision_row) if decision_row else None

    return claim.to_dict()


@router.get("/{claim_id}/findings")
async def get_claim_findings(claim_id: str, bq: bigquery.Client = Depends(get_db)):
    ds = get_dataset()
    rows = await run_query(
        f"SELECT * FROM `{ds}.agent_findings` WHERE claim_id = @claim_id ORDER BY created_at",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("claim_id", "STRING", claim_id)],
    )
    return [AgentFinding.from_bq_row(r).to_dict() for r in rows]


@router.get("/{claim_id}/summary")
async def get_claim_summary(claim_id: str, bq: bigquery.Client = Depends(get_db)):
    from services.chat_service import generate_executive_summary
    summary = await generate_executive_summary(claim_id, bq)
    return {"summary": summary}


@router.post("/{claim_id}/generate-notes")
async def generate_decision_notes(claim_id: str, body: GenerateNotesRequest, bq: bigquery.Client = Depends(get_db)):
    from services.chat_service import generate_decision_notes as gen_notes
    notes = await gen_notes(claim_id, body.decisionType, bq)
    return {"notes": notes}


@router.post("/{claim_id}/decide")
async def decide_claim(claim_id: str, body: DecisionRequest, bq: bigquery.Client = Depends(get_db)):
    ds = get_dataset()

    # Check claim exists
    claim_row = await run_query_single(
        f"SELECT * FROM `{ds}.claims` WHERE id = @claim_id",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("claim_id", "STRING", claim_id)],
    )
    if not claim_row:
        raise HTTPException(status_code=404, detail="Claim not found")

    # Check if decision already exists
    existing_decision = await run_query_single(
        f"SELECT * FROM `{ds}.decisions` WHERE claim_id = @claim_id LIMIT 1",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("claim_id", "STRING", claim_id)],
    )
    if existing_decision:
        raise HTTPException(status_code=400, detail="Decision already recorded for this claim")

    claim = Claim.from_bq_row(claim_row)
    normalized_decision = body.decisionType.lower()
    savings = float(claim.billing_amount) if normalized_decision in ("denied", "escalate", "held") else None

    decision_id = str(uuid.uuid4())
    audit_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    # Insert decision
    await insert_rows("decisions", [{
        "id": decision_id,
        "claim_id": claim_id,
        "decision_type": body.decisionType,
        "actor": body.actor,
        "actor_role": body.actorRole,
        "rationale": body.rationale,
        "savings_amount": savings,
        "created_at": now,
    }])

    # Update claim status (may fail if rows are in BigQuery streaming buffer)
    new_status = claim.status
    if normalized_decision in ("approved", "release"):
        new_status = "disbursed"
    elif normalized_decision in ("denied", "escalate", "held"):
        new_status = "held" if normalized_decision in ("escalate", "held") else "denied"
    try:
        await run_dml(
            f"UPDATE `{ds}.claims` SET status = @status WHERE id = @claim_id",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
            [
                bigquery.ScalarQueryParameter("status", "STRING", new_status),
                bigquery.ScalarQueryParameter("claim_id", "STRING", claim_id),
            ],
        )
    except Exception:
        # Streaming buffer prevents UPDATE — the decision row is still recorded
        # and the claim status will be derived from the decision table instead.
        pass

    # Insert audit log
    await insert_rows("audit_log", [{
        "id": audit_id,
        "timestamp": now,
        "actor": body.actor,
        "actor_type": "human",
        "action_type": "decision",
        "claim_id": claim_id,
        "details": json.dumps({
            "decision_type": body.decisionType,
            "actor_role": body.actorRole,
            "rationale": body.rationale,
            "savings_amount": savings,
        }),
        "confidence_score": None,
    }])

    # Insert agent flags if any agents were flagged during approval
    if body.flaggedAgents:
        flag_rows = []
        for af in body.flaggedAgents:
            flag_rows.append({
                "id": str(uuid.uuid4()),
                "agent_name": af.agentName,
                "claim_id": claim_id,
                "claim_number": claim.claim_number,
                "flagged_by": body.actor,
                "notes": af.notes or f"Agent rule was incorrect for claim {claim.claim_number}. Claim was approved despite flag.",
                "created_at": now,
            })
        if flag_rows:
            await insert_rows("agent_flags", flag_rows)

    msg = {
        "approved": "Payment authorized. Metadata transmitted to HIGLAS Downstream Systems.",
        "denied": "Claim Denied. Feedback loop updated.",
        "false_positive": "Marked as False Positive. Feedback ticket created.",
    }

    return {
        "id": decision_id,
        "claimId": claim_id,
        "decisionType": body.decisionType,
        "savingsAmount": savings,
        "message": msg.get(body.decisionType, "Decision recorded."),
    }


