# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.appeals_service import AppealsService

router = APIRouter(prefix="/api/appeals", tags=["Appeals"])


class AppealRequest(BaseModel):
    claim_id: str


@router.post("")
async def file_appeal(request: AppealRequest):
    """POST endpoint to file and process a prepayment hold appeal."""
    result = await AppealsService.process_appeal(request.claim_id)
    if not result.get("success", False):
        raise HTTPException(status_code=400, detail=result.get("msg", "Error processing appeal"))
    return result


@router.get("/alj-queue")
async def get_alj_queue():
    """GET endpoint to fetch all claims escalated to the Level 2 ALJ manual review queue."""
    from database import run_query, get_dataset
    ds = get_dataset()
    query = f"""
        SELECT c.*, a.entered_at_sim 
        FROM `{ds}.claims` c
        JOIN `{ds}.alj_queue` a ON c.id = a.claim_id
        ORDER BY c.billing_amount DESC, a.entered_at_sim DESC
    """
    rows = await run_query(query)
    return rows
