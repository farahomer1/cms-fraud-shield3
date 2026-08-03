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
