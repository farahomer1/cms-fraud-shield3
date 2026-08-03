# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import json

from google.cloud import bigquery

from database import get_dataset, run_query
from models.claim import Claim
from services import gemini_client


async def get_anomaly_clusters(bq: bigquery.Client) -> list[dict]:
    ds = get_dataset()
    rows = await run_query(
        f"""SELECT p.name, p.risk_score, p.id,
               COUNT(af.id) as finding_count,
               AVG(af.confidence_score) as avg_confidence
        FROM `{ds}.providers` p
        JOIN `{ds}.claims` c ON c.provider_id = p.id
        JOIN `{ds}.agent_findings` af ON af.claim_id = c.id
        WHERE af.recommendation = 'flag'
        GROUP BY p.id, p.name, p.risk_score"""  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
    )
    clusters = []
    for row in rows:
        clusters.append({
            "provider_name": row.name,
            "provider_id": row.id,
            "risk_score": row.risk_score,
            "finding_count": row.finding_count,
            "avg_confidence": round(float(row.avg_confidence), 1),
        })
    return clusters


async def analyze_anomaly_landscape(bq: bigquery.Client) -> dict:
    clusters = await get_anomaly_clusters(bq)
    prompt = f"Analyze these provider anomaly clusters for VA fraud research:\n{json.dumps(clusters, indent=2)}"
    system = "You are PIVOT's Fraud Research AI. Identify high-risk providers, emerging patterns, and investigation priorities. Reference provider names and risk scores. Use VA terminology."

    try:
        text, _ = await gemini_client.generate_text(prompt=prompt, system_prompt=system, temperature=0.5)
        return {"analysis": text, "insights": text, "cluster_count": len(clusters), "clusters": clusters}
    except Exception as e:
        msg = f"Analysis unavailable: {str(e)}"
        return {"analysis": msg, "insights": msg, "cluster_count": len(clusters), "clusters": clusters}


async def search_patterns(query: str, bq: bigquery.Client) -> dict:
    ds = get_dataset()
    rows = await run_query(
        f"""SELECT c.*, v.name_display as v_name, p.name as p_name,
               (SELECT ARRAY_AGG(DISTINCT af.agent_name IGNORE NULLS)
                FROM `{ds}.agent_findings` af
                WHERE af.claim_id = c.id AND af.recommendation = 'flag') as flagging_agents
        FROM `{ds}.claims` c
        LEFT JOIN `{ds}.members` v ON c.beneficiary_id = v.id
        LEFT JOIN `{ds}.providers` p ON c.provider_id = p.id
        WHERE c.status IN ('flagged', 'held')
        LIMIT 50"""  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
    )

    claims_context = []
    for r in rows:
        claim = Claim.from_bq_row(r)
        claims_context.append({
            "claim_number": claim.claim_number,
            "provider": r.p_name or "Unknown",
            "beneficiary": r.v_name or "Unknown",
            "veteran": r.v_name or "Unknown", # transition safety alias
            "billing_amount": float(claim.billing_amount),
            "risk_level": claim.risk_level,
            "agents": list(r.flagging_agents) if r.flagging_agents else [],
        })

    prompt = f"Search for this pattern in PIVOT claim data: '{query}'\n\nClaim data:\n{json.dumps(claims_context, indent=2)}"
    system = "You are PIVOT's Fraud Pattern Search AI. Find matching cases and explain the pattern. Return specific claim numbers and evidence."

    try:
        text, _ = await gemini_client.generate_text(prompt=prompt, system_prompt=system, temperature=0.3)
        return {"query": query, "results": text, "summary": text, "text": text, "total_claims_searched": len(claims_context)}
    except Exception as e:
        msg = f"Search unavailable: {str(e)}"
        return {"query": query, "results": msg, "summary": msg, "text": msg, "total_claims_searched": 0}
