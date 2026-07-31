# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from google.cloud import bigquery

from config import settings
from database import get_db, get_dataset, run_query_single
from models.document import Document

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("/{doc_id}/raw")
async def get_raw_document(doc_id: str, bq: bigquery.Client = Depends(get_db)):
    ds = get_dataset()
    row = await run_query_single(
        f"SELECT * FROM `{ds}.documents` WHERE id = @doc_id",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("doc_id", "STRING", doc_id)],
    )
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = Document.from_bq_row(row)
    file_path = Path(doc.file_path)
    if not file_path.exists():
        file_path = Path(settings.data_dir).parent / doc.file_path
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    mime_types = {
        "pdf": "application/pdf",
        "edi_837p": "text/plain",
        "edi_837i": "text/plain",
        "ehr": "text/plain",
    }
    return FileResponse(file_path, media_type=mime_types.get(doc.file_type, "application/octet-stream"))


@router.post("/{doc_id}/parse")
async def parse_document(doc_id: str, bq: bigquery.Client = Depends(get_db)):
    from services.document_service import parse_document as do_parse
    result = await do_parse(doc_id, bq)
    return result


@router.get("/{doc_id}/parsed")
async def get_parsed_data(doc_id: str, bq: bigquery.Client = Depends(get_db)):
    ds = get_dataset()
    row = await run_query_single(
        f"SELECT * FROM `{ds}.documents` WHERE id = @doc_id",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("doc_id", "STRING", doc_id)],
    )
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = Document.from_bq_row(row)

    claim_row = await run_query_single(
        f"SELECT * FROM `{ds}.claims` WHERE raw_document_id = @doc_id",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("doc_id", "STRING", doc_id)],
    )

    from models.claim import Claim
    claim = Claim.from_bq_row(claim_row) if claim_row else None

    return {
        "document_id": doc_id,
        "parse_status": doc.parse_status,
        "normalized_data": claim.normalized_data if claim else None,
    }
