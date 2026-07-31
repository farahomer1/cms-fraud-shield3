# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""Routes for Data Normalization sample data.

Provides endpoints for the Data Normalization panel to display
EDI/NCPDP parsing examples and CMS-1500 Gemini extraction.
"""


from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from services.normalization_service import (
    get_edi_samples,
    parse_cms1500,
    CMS1500_PDF,
)

router = APIRouter(prefix="/api/normalization", tags=["normalization"])


@router.get("/samples")
async def get_normalization_samples():
    """Return all EDI/NCPDP test case samples with raw and parsed data."""
    samples = get_edi_samples()
    return {"samples": samples, "count": len(samples)}


@router.post("/parse-cms1500")
async def extract_cms1500():
    """Use Gemini to extract structured fields from the CMS-1500 sample PDF."""
    result = await parse_cms1500()
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/cms1500-pdf")
async def get_cms1500_pdf():
    """Serve the CMS-1500 sample PDF file."""
    if not CMS1500_PDF.exists():
        raise HTTPException(status_code=404, detail="cms1500-sample.pdf not found")
    return FileResponse(CMS1500_PDF, media_type="application/pdf")
