# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from google.api_core.exceptions import BadRequest
from google.cloud import bigquery

from database import get_db, get_dataset, run_query, run_query_single, run_dml
from models.batch import Batch
from models.document import Document

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/batches", tags=["batches"])


@router.get("")
async def list_batches(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    bq: bigquery.Client = Depends(get_db),
):
    ds = get_dataset()
    rows = await run_query(
        f"SELECT * FROM `{ds}.batches` ORDER BY received_date DESC LIMIT @lim OFFSET @off",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [
            bigquery.ScalarQueryParameter("lim", "INT64", limit),
            bigquery.ScalarQueryParameter("off", "INT64", offset),
        ],
    )
    return [Batch.from_bq_row(r).to_dict() for r in rows]


@router.get("/{batch_id}")
async def get_batch(batch_id: str, bq: bigquery.Client = Depends(get_db)):
    ds = get_dataset()
    row = await run_query_single(
        f"SELECT * FROM `{ds}.batches` WHERE id = @batch_id",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("batch_id", "STRING", batch_id)],
    )
    if not row:
        raise HTTPException(status_code=404, detail="Batch not found")
    return Batch.from_bq_row(row).to_dict()


@router.get("/{batch_id}/documents")
async def list_batch_documents(batch_id: str, bq: bigquery.Client = Depends(get_db)):
    ds = get_dataset()
    rows = await run_query(
        f"SELECT * FROM `{ds}.documents` WHERE batch_id = @batch_id ORDER BY filename",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("batch_id", "STRING", batch_id)],
    )
    return [Document.from_bq_row(r).to_dict() for r in rows]


@router.post("/{batch_id}/process")
async def process_batch(batch_id: str, bq: bigquery.Client = Depends(get_db)):
    ds = get_dataset()
    row = await run_query_single(
        f"SELECT * FROM `{ds}.batches` WHERE id = @batch_id",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("batch_id", "STRING", batch_id)],
    )
    if not row:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Reset batch status (may fail if rows are in BigQuery streaming buffer)
    try:
        await run_dml(
            f"UPDATE `{ds}.batches` SET status = 'processing', flagged_count = 0, approved_count = 0 WHERE id = @batch_id",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
            [bigquery.ScalarQueryParameter("batch_id", "STRING", batch_id)],
        )
    except BadRequest as exc:
        if "streaming buffer" in str(exc):
            logger.warning("Could not update batch status (streaming buffer); continuing")
        else:
            raise

    # Reset all claims in this batch back to pending so they get reprocessed
    try:
        await run_dml(
            f"UPDATE `{ds}.claims` SET status = 'pending', risk_level = NULL WHERE batch_id = @batch_id",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
            [bigquery.ScalarQueryParameter("batch_id", "STRING", batch_id)],
        )
    except BadRequest as exc:
        if "streaming buffer" in str(exc):
            logger.warning("Could not reset claim statuses (streaming buffer); continuing")
        else:
            raise

    # Delete old agent findings for claims in this batch.
    # Rows inserted via BigQuery streaming API sit in a buffer that rejects
    # DELETE/UPDATE for up to ~30 min.  Catch that specific error so
    # re-processing isn't blocked by stale buffered rows.
    try:
        await run_dml(
            f"DELETE FROM `{ds}.agent_findings` WHERE claim_id IN (SELECT id FROM `{ds}.claims` WHERE batch_id = @batch_id)",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
            [bigquery.ScalarQueryParameter("batch_id", "STRING", batch_id)],
        )
    except BadRequest as exc:
        if "streaming buffer" in str(exc):
            logger.warning("Could not delete old agent_findings (streaming buffer); continuing with re-processing")
        else:
            raise

    return {"status": "processing", "batch_id": batch_id, "message": "Batch processing started. Connect to /api/batches/{id}/progress for updates."}


ALLOWED_TABLES = {
    "batches", "members", "providers", "documents", "claims",
    "agent_findings", "decisions", "audit_log",
}


@router.get("/{batch_id}/tables/{table_name}")
async def get_batch_table_data(
    batch_id: str,
    table_name: str,
    limit: int = Query(200, le=1000),
    offset: int = Query(0, ge=0),
    bq: bigquery.Client = Depends(get_db),
):
    """Return rows from a BigQuery table scoped to a specific batch."""
    if table_name not in ALLOWED_TABLES:
        raise HTTPException(status_code=400, detail=f"Invalid table name: {table_name}")
    ds = get_dataset()

    # Tables with a direct batch_id column
    if table_name in ("documents", "claims"):
        query = (
            f"SELECT * FROM `{ds}.{table_name}` "
            f"WHERE batch_id = @batch_id "
            f"ORDER BY created_at DESC LIMIT @lim OFFSET @off"  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        )
        params = [
            bigquery.ScalarQueryParameter("batch_id", "STRING", batch_id),
            bigquery.ScalarQueryParameter("lim", "INT64", limit),
            bigquery.ScalarQueryParameter("off", "INT64", offset),
        ]
    elif table_name == "batches":
        query = (
            f"SELECT * FROM `{ds}.batches` "
            f"WHERE id = @batch_id "
            f"LIMIT @lim OFFSET @off"  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        )
        params = [
            bigquery.ScalarQueryParameter("batch_id", "STRING", batch_id),
            bigquery.ScalarQueryParameter("lim", "INT64", limit),
            bigquery.ScalarQueryParameter("off", "INT64", offset),
        ]
    elif table_name in ("agent_findings", "decisions"):
        # Join through claims to filter by batch_id
        query = (
            f"SELECT t.* FROM `{ds}.{table_name}` t "
            f"JOIN `{ds}.claims` c ON t.claim_id = c.id "
            f"WHERE c.batch_id = @batch_id "
            f"ORDER BY t.created_at DESC LIMIT @lim OFFSET @off"  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        )
        params = [
            bigquery.ScalarQueryParameter("batch_id", "STRING", batch_id),
            bigquery.ScalarQueryParameter("lim", "INT64", limit),
            bigquery.ScalarQueryParameter("off", "INT64", offset),
        ]
    elif table_name == "members":
        # Join through claims to get members associated with this batch
        query = (
            f"SELECT DISTINCT v.* FROM `{ds}.members` v "
            f"JOIN `{ds}.claims` c ON v.id = c.beneficiary_id "
            f"WHERE c.batch_id = @batch_id "
            f"ORDER BY v.name_display LIMIT @lim OFFSET @off"  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        )
        params = [
            bigquery.ScalarQueryParameter("batch_id", "STRING", batch_id),
            bigquery.ScalarQueryParameter("lim", "INT64", limit),
            bigquery.ScalarQueryParameter("off", "INT64", offset),
        ]
    elif table_name == "providers":
        # Join through claims to get providers associated with this batch
        query = (
            f"SELECT DISTINCT p.* FROM `{ds}.providers` p "
            f"JOIN `{ds}.claims` c ON p.id = c.provider_id "
            f"WHERE c.batch_id = @batch_id "
            f"ORDER BY p.name LIMIT @lim OFFSET @off"  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        )
        params = [
            bigquery.ScalarQueryParameter("batch_id", "STRING", batch_id),
            bigquery.ScalarQueryParameter("lim", "INT64", limit),
            bigquery.ScalarQueryParameter("off", "INT64", offset),
        ]
    elif table_name == "audit_log":
        # Join through claims for claim-specific logs, plus batch-level logs
        query = (
            f"SELECT a.* FROM `{ds}.audit_log` a "
            f"LEFT JOIN `{ds}.claims` c ON a.claim_id = c.id "
            f"WHERE c.batch_id = @batch_id OR a.claim_id IS NULL "
            f"ORDER BY a.timestamp DESC LIMIT @lim OFFSET @off"  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        )
        params = [
            bigquery.ScalarQueryParameter("batch_id", "STRING", batch_id),
            bigquery.ScalarQueryParameter("lim", "INT64", limit),
            bigquery.ScalarQueryParameter("off", "INT64", offset),
        ]
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported table: {table_name}")

    rows = await run_query(query, params)
    return [dict(r) for r in rows]


@router.get("/{batch_id}/progress")
async def batch_progress(batch_id: str, bq: bigquery.Client = Depends(get_db)):
    """SSE endpoint for real-time batch processing progress.

    Uses the fast fake processor (no Gemini calls) for 20+ claims/sec throughput.
    """
    from services.fake_batch_service import process_batch_claims_fast

    async def event_stream():
        async for event in process_batch_claims_fast(batch_id, bq):
            yield f"event: {event['type']}\ndata: {json.dumps(event['data'])}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Content-Encoding": "identity",
        },
    )
