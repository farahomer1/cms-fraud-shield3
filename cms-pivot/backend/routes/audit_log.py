# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from google.cloud import bigquery
from pydantic import BaseModel

from database import get_db, get_dataset, run_query, run_query_single, insert_rows
from models.audit_log import AuditLog

router = APIRouter(prefix="/api/audit-log", tags=["audit-log"])


class AuditEventRequest(BaseModel):
    actor: str
    actor_type: str = "human"
    action_type: str = "system"
    claim_id: str | None = None
    details: dict = {}
    confidence_score: int | None = None


class AuditBatchRequest(BaseModel):
    entries: list[AuditEventRequest]


@router.post("/event")
async def create_audit_event(body: AuditEventRequest, bq: bigquery.Client = Depends(get_db)):
    """Create a new audit log entry (e.g., login/logout events)."""
    now = datetime.now(timezone.utc).isoformat()
    entry_id = str(uuid.uuid4())
    await insert_rows("audit_log", [{
        "id": entry_id,
        "timestamp": now,
        "actor": body.actor,
        "actor_type": body.actor_type,
        "action_type": body.action_type,
        "claim_id": body.claim_id,
        "details": json.dumps(body.details),
        "confidence_score": body.confidence_score,
    }])
    return {"id": entry_id, "status": "created"}


@router.post("/batch")
async def create_audit_events_batch(body: AuditBatchRequest, bq: bigquery.Client = Depends(get_db)):
    """Create multiple audit log entries in a single batch insert."""
    now = datetime.now(timezone.utc).isoformat()
    rows = []
    for entry in body.entries:
        rows.append({
            "id": str(uuid.uuid4()),
            "timestamp": now,
            "actor": entry.actor,
            "actor_type": entry.actor_type,
            "action_type": entry.action_type,
            "claim_id": entry.claim_id,
            "details": json.dumps(entry.details),
            "confidence_score": entry.confidence_score,
        })
    if rows:
        await insert_rows("audit_log", rows)
    return {"count": len(rows), "status": "created"}


@router.get("")
async def list_audit_logs(
    actor: str | None = None,
    action_type: str | None = None,
    claim_id: str | None = None,
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    bq: bigquery.Client = Depends(get_db),
):
    ds = get_dataset()
    conditions = []
    params = []
    if actor:
        conditions.append("actor = @actor")
        params.append(bigquery.ScalarQueryParameter("actor", "STRING", actor))
    if action_type:
        conditions.append("action_type = @action_type")
        params.append(bigquery.ScalarQueryParameter("action_type", "STRING", action_type))
    if claim_id:
        conditions.append("claim_id = @claim_id")
        params.append(bigquery.ScalarQueryParameter("claim_id", "STRING", claim_id))

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    params.append(bigquery.ScalarQueryParameter("lim", "INT64", limit))
    params.append(bigquery.ScalarQueryParameter("off", "INT64", offset))

    rows = await run_query(
        f"SELECT * FROM `{ds}.audit_log` {where} ORDER BY timestamp DESC LIMIT @lim OFFSET @off",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        params,
    )
    return [AuditLog.from_bq_row(r).to_dict() for r in rows]


@router.get("/{entry_id}")
async def get_audit_entry(entry_id: str, bq: bigquery.Client = Depends(get_db)):
    ds = get_dataset()
    row = await run_query_single(
        f"SELECT * FROM `{ds}.audit_log` WHERE id = @entry_id",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("entry_id", "STRING", entry_id)],
    )
    if not row:
        raise HTTPException(status_code=404, detail="Audit entry not found")
    return AuditLog.from_bq_row(row).to_dict()
