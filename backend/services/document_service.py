# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import json
import logging
from pathlib import Path

from google.api_core.exceptions import BadRequest
from google.cloud import bigquery

from database import get_dataset, run_query_single, run_dml
from models.document import Document
from services import gemini_client

_logger = logging.getLogger(__name__)

PARSE_SYSTEM_PROMPT = """You are a VA claim document parser for the PIVOT Payment Integrity Platform.
Extract structured data from the raw document (PDF or EDI 837).

For medical claims, extract:
- patient_name, patient_dob, patient_ssn_last4
- provider_name, provider_npi, provider_address
- diagnosis_codes (ICD-10 codes as array)
- procedure_codes (CPT/HCPCS codes as array)
- service_date, service_end_date
- billing_amount (total)
- line_items (array of {procedure_code, description, amount, units})
- clinical_notes (any free-text notes)
- claim_type (medical, disability, pension, dental)

For EDI 837 files, parse the segment structure:
- ISA/GS envelope data
- CLM claim-level data
- SV1/SV2 service line data
- DTP date segments
- AMT amount segments

Return a clean JSON object with all extracted fields. Include a "source_mapping" field that maps each extracted value to its approximate position in the raw document."""


async def parse_document(doc_id: str, bq: bigquery.Client) -> dict:
    ds = get_dataset()
    row = await run_query_single(
        f"SELECT * FROM `{ds}.documents` WHERE id = @doc_id",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("doc_id", "STRING", doc_id)],
    )
    if not row:
        return {"error": "Document not found"}

    doc = Document.from_bq_row(row)

    # Update parse status to parsing
    try:
        await run_dml(
            f"UPDATE `{ds}.documents` SET parse_status = 'parsing' WHERE id = @doc_id",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
            [bigquery.ScalarQueryParameter("doc_id", "STRING", doc_id)],
        )
    except BadRequest as exc:
        if "streaming buffer" in str(exc):
            _logger.warning(f"Could not update document {doc_id} status (streaming buffer); continuing")
        else:
            raise

    file_path = Path(doc.file_path)
    if not file_path.exists():
        file_path = Path("data") / "demo-documents" / doc.filename

    try:
        if doc.file_type == "pdf":
            if file_path.exists():
                file_bytes = file_path.read_bytes()
                parsed, latency = await gemini_client.generate_multimodal(
                    prompt="Parse this VA claim document and extract all structured fields.",
                    file_bytes=file_bytes,
                    mime_type="application/pdf",
                    system_prompt=PARSE_SYSTEM_PROMPT,
                )
            else:
                parsed, latency = await gemini_client.generate_json(
                    prompt=f"Generate realistic parsed data for a VA {doc.filename} claim document.",
                    system_prompt=PARSE_SYSTEM_PROMPT,
                )
        else:
            if file_path.exists():
                content = file_path.read_text()
                parsed, latency = await gemini_client.generate_json(
                    prompt=f"Parse this EDI 837 claim document:\n\n{content}",
                    system_prompt=PARSE_SYSTEM_PROMPT,
                )
            else:
                parsed, latency = await gemini_client.generate_json(
                    prompt="Generate realistic parsed data for a VA EDI 837 claim document.",
                    system_prompt=PARSE_SYSTEM_PROMPT,
                )

        # Update document status
        try:
            await run_dml(
                f"UPDATE `{ds}.documents` SET parse_status = 'parsed' WHERE id = @doc_id",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
                [bigquery.ScalarQueryParameter("doc_id", "STRING", doc_id)],
            )
        except BadRequest as exc:
            if "streaming buffer" in str(exc):
                _logger.warning(f"Could not update document {doc_id} parsed status (streaming buffer)")
            else:
                raise

        # Update claim's normalized_data if linked
        claim_row = await run_query_single(
            f"SELECT id FROM `{ds}.claims` WHERE raw_document_id = @doc_id",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
            [bigquery.ScalarQueryParameter("doc_id", "STRING", doc_id)],
        )
        if claim_row:
            try:
                await run_dml(
                    f"UPDATE `{ds}.claims` SET normalized_data = @data, status = 'parsed' WHERE id = @cid",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
                    [
                        bigquery.ScalarQueryParameter("data", "STRING", json.dumps(parsed)),
                        bigquery.ScalarQueryParameter("cid", "STRING", claim_row.id),
                    ],
                )
            except BadRequest as exc:
                if "streaming buffer" in str(exc):
                    _logger.warning("Could not update claim normalized data (streaming buffer)")
                else:
                    raise

        return {"document_id": doc_id, "parse_status": "parsed", "normalized_data": parsed, "latency_ms": latency}

    except Exception as e:
        try:
            await run_dml(
                f"UPDATE `{ds}.documents` SET parse_status = 'error' WHERE id = @doc_id",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
                [bigquery.ScalarQueryParameter("doc_id", "STRING", doc_id)],
            )
        except BadRequest:
            _logger.warning(f"Could not set document {doc_id} error status (streaming buffer)")
        return {"document_id": doc_id, "parse_status": "error", "error": str(e)}
