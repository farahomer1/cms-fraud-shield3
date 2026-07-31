# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from fastapi import APIRouter, Depends, Query
from google.cloud import bigquery

from database import get_db, get_dataset, run_query
from models.claim import Claim

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("/recent")
async def get_recent_alerts(limit: int = Query(10, le=50), bq: bigquery.Client = Depends(get_db)):
    ds = get_dataset()
    # Get flagged claims with veteran, provider info, and flagging agents in a single query
    rows = await run_query(
        f"""SELECT c.*, v.name_display as v_name_display, p.name as p_name,
               ARRAY_AGG(DISTINCT af.agent_name IGNORE NULLS) as flagging_agents
        FROM `{ds}.claims` c
        LEFT JOIN `{ds}.veterans` v ON c.veteran_id = v.id
        LEFT JOIN `{ds}.providers` p ON c.provider_id = p.id
        LEFT JOIN `{ds}.agent_findings` af ON af.claim_id = c.id AND af.recommendation = 'flag'
        WHERE c.status = 'flagged'
        GROUP BY c.id, c.claim_number, c.claim_type, c.status, c.risk_level,
                 c.veteran_id, c.provider_id, c.batch_id, c.billing_amount,
                 c.service_date, c.diagnosis_codes, c.procedure_codes,
                 c.normalized_data, c.created_at, c.updated_at,
                 v.name_display, p.name
        ORDER BY c.updated_at DESC
        LIMIT @lim""",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("lim", "INT64", limit)],
    )

    alerts = []
    for r in rows:
        claim = Claim.from_bq_row(r)
        agents = list(r.flagging_agents) if r.flagging_agents else []
        alerts.append({
            "claim_id": claim.id,
            "claim_number": claim.claim_number,
            "risk_level": claim.risk_level,
            "flagging_agents": agents,
            "veteran_name": r.v_name_display or "Unknown",
            "provider_name": r.p_name or "Unknown",
            "billing_amount": float(claim.billing_amount),
            "timestamp": claim.updated_at.isoformat() if claim.updated_at else (claim.created_at.isoformat() if claim.created_at else ""),
        })
    return alerts
