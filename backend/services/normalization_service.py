# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""Service for Data Normalization sample parsing.

Provides:
- EDI/NCPDP parsing using the HealthcareParser from processing_pipeline
- CMS-1500 PDF structured extraction via Gemini
"""

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any

from services import gemini_client

SHOLTZ_DIR = Path(__file__).resolve().parent.parent.parent / "processing_pipeline"
TESTS_TXT = SHOLTZ_DIR / "tests.txt"
CMS1500_PDF = SHOLTZ_DIR / "cms1500-sample.pdf"

CMS1500_SYSTEM_PROMPT = """You are a medical claims document parser. Extract ALL structured fields
from this CMS-1500 claim form into a clean JSON object.

Extract these field groups:
- patient_info: name, dob, gender, address, phone, ssn_last4, relationship_to_insured
- insured_info: name, id_number, group_number, plan_name, employer
- provider_info: name, npi, tax_id, address, phone, specialty
- claim_info: diagnosis_codes (ICD-10), procedure_codes (CPT/HCPCS), service_dates, place_of_service
- line_items: array of {procedure_code, modifier, diagnosis_pointer, charge, units, rendering_provider_npi}
- billing_info: total_charge, amount_paid, balance_due, accept_assignment
- authorization: prior_auth_number, referral_number
- additional_info: any other fields visible on the form

Return a well-structured JSON object with all extracted data."""


# ── EDI/NCPDP Parser (ported from processing_pipeline/edi-parser.py) ──────────


def _parse_x12(raw_data: str) -> dict[str, Any]:
    if len(raw_data) < 106:
        return {"error": "Malformed EDI"}

    el_sep = raw_data[3]
    seg_sep = raw_data[105]
    segments = [s.strip() for s in raw_data.split(seg_sep) if s.strip()]

    data: dict[str, Any] = {
        "format": "X12 EDI",
        "metadata": {},
        "claim": {"services": [], "attachments": []},
    }

    for seg in segments:
        p = seg.split(el_sep)
        if not p:
            continue
        tag = p[0]

        if tag == "ISA" and len(p) > 6:
            data["metadata"]["sender"] = p[6].strip()
        if tag == "ISA" and len(p) > 8:
            data["metadata"]["receiver"] = p[8].strip()
        if tag == "NM1" and len(p) > 4:
            if p[1] == "85":
                data["claim"]["billing_provider"] = p[3]
            if p[1] == "IL":
                data["claim"]["patient_name"] = f"{p[4]} {p[3]}" if len(p) > 4 else p[3]
        elif tag == "CLM" and len(p) > 2:
            data["claim"]["id"] = p[1]
            data["claim"]["total_charge"] = p[2]
        elif tag == "DMG" and len(p) > 3:
            data["claim"]["patient_gender"] = p[3].strip()
            try:
                dob = datetime.strptime(p[2], "%Y%m%d")
                data["claim"]["patient_age"] = datetime.now().year - dob.year
            except Exception:
                data["claim"]["patient_age"] = 0
        elif tag in ("SV1", "SV2", "SV3"):
            charge_val = p[3] if tag == "SV2" else p[2]
            svc: dict[str, str] = {"proc_code": p[1], "charge": charge_val}
            if len(p) > 3 and tag != "SV2":
                svc["units"] = p[4] if len(p) > 4 else "1"
            data["claim"]["services"].append(svc)
        elif tag == "HI" and len(p) > 1:
            codes = [c.split(":")[-1] for c in p[1:] if ":" in c]
            if codes:
                data["claim"]["diagnosis_codes"] = codes
        elif tag == "DTP" and len(p) > 2:
            data["claim"]["service_date"] = p[2]
        elif tag == "PWK" and len(p) > 2:
            data["claim"]["attachments"].append(
                {
                    "evidence_type": p[1],
                    "transmission_method": p[2],
                    "control_number": p[3] if len(p) > 3 else None,
                }
            )

    return data


def _parse_ncpdp(raw_data: str) -> dict[str, Any]:
    data: dict[str, Any] = {
        "format": "NCPDP Pharmacy",
        "claim": {
            "id": raw_data[16:26].strip() if len(raw_data) > 26 else "UNKNOWN",
            "billing_provider": "Pharmacy Provider",
            "services": [],
        },
    }

    ndc_val = "UNKNOWN"
    if "D7" in raw_data:
        start = raw_data.find("D7") + 2
        end = len(raw_data)
        for sep in ["^", "\x1c", "\x1e", "\n"]:
            pos = raw_data.find(sep, start)
            if pos != -1 and pos < end:
                end = pos
        ndc_val = raw_data[start:end].strip()

    charge_val = "0.00"
    if "D9" in raw_data:
        start = raw_data.find("D9") + 2
        end = len(raw_data)
        for sep in ["^", "\x1c", "\x1e", "\n"]:
            pos = raw_data.find(sep, start)
            if pos != -1 and pos < end:
                end = pos
        amt_str = raw_data[start:end].strip()
        numeric_val = "".join(c for c in amt_str if c.isdigit() or c == ".")
        charge_val = f"{float(numeric_val):.2f}" if numeric_val else "0.00"

    data["claim"]["services"].append(
        {"proc_code": ndc_val, "charge": charge_val, "units": "1"}
    )
    data["claim"]["total_charge"] = charge_val
    return data


def _split_test_cases(content: str) -> list[dict[str, Any]]:
    """Parse tests.txt into individual test case records with raw data and metadata."""
    pattern = r"(TC-[A-Z]-\d{3}\.(?:edi|ncpdp))\s*\(([^)]+)\)\n(.*?)(?=\n(?:TC-[A-Z]-\d{3}\.|ASC |NCPDP |Forensic )|$)"
    matches = re.finditer(pattern, content, re.DOTALL)

    cases: list[dict[str, Any]] = []
    for match in matches:
        filename = match.group(1).strip()
        description = match.group(2).strip()
        raw_lines = match.group(2 + 1).strip().split("\n")

        is_edi = filename.endswith(".edi")

        if is_edi:
            processed_lines = []
            for line in raw_lines:
                clean_line = line.strip()
                if not clean_line:
                    continue
                if clean_line.startswith("ISA"):
                    base_isa = clean_line.replace("~", "")
                    clean_line = base_isa.ljust(105) + "~"
                processed_lines.append(clean_line)
            raw_data = "".join(processed_lines)
        else:
            raw_data = "\n".join(line.strip() for line in raw_lines if line.strip())

        # Determine claim type
        if "837P" in filename or filename.startswith("TC-P-") or filename.startswith("TC-X-"):
            claim_type = "837P Professional"
        elif "837I" in filename or filename.startswith("TC-I-"):
            claim_type = "837I Institutional"
        elif "837D" in filename or filename.startswith("TC-D-"):
            claim_type = "837D Dental"
        elif filename.endswith(".ncpdp") or filename.startswith("TC-N-"):
            claim_type = "NCPDP Pharmacy"
        else:
            claim_type = "Unknown"

        is_pass = description.lower().startswith("pass")

        cases.append(
            {
                "filename": filename,
                "description": description,
                "claim_type": claim_type,
                "is_pass": is_pass,
                "raw_data": raw_data,
            }
        )

    return cases


def get_edi_samples() -> list[dict[str, Any]]:
    """Parse all test cases from tests.txt and return raw + parsed pairs."""
    if not TESTS_TXT.exists():
        return []

    content = TESTS_TXT.read_text()
    cases = _split_test_cases(content)

    results: list[dict[str, Any]] = []
    for case in cases:
        raw = case["raw_data"]
        if case["filename"].endswith(".edi"):
            parsed = _parse_x12(raw)
        else:
            parsed = _parse_ncpdp(raw)

        results.append(
            {
                "filename": case["filename"],
                "description": case["description"],
                "claim_type": case["claim_type"],
                "is_pass": case["is_pass"],
                "raw_data": raw,
                "parsed_data": parsed,
            }
        )

    return results


CMS1500_CACHE = SHOLTZ_DIR / "cms1500-cache.json"


async def parse_cms1500() -> dict[str, Any]:
    """Use Gemini to extract structured fields from the CMS-1500 sample PDF.

    Results are cached to ``processing_pipeline/cms1500-cache.json`` so Gemini is
    only called once.  Subsequent requests read from the cache file.
    """
    # Check cache first
    if CMS1500_CACHE.exists():
        try:
            cached = json.loads(CMS1500_CACHE.read_text())
            return {"parsed_data": cached, "latency_ms": 0, "cached": True}
        except (json.JSONDecodeError, OSError):
            pass  # cache corrupt – fall through to Gemini

    if not CMS1500_PDF.exists():
        return {"error": "cms1500-sample.pdf not found"}

    file_bytes = CMS1500_PDF.read_bytes()
    parsed, latency = await gemini_client.generate_multimodal(
        prompt="Parse this CMS-1500 claim form and extract ALL structured fields into JSON.",
        file_bytes=file_bytes,
        mime_type="application/pdf",
        system_prompt=CMS1500_SYSTEM_PROMPT,
    )

    # Write cache
    try:
        CMS1500_CACHE.write_text(json.dumps(parsed, indent=2))
    except OSError:
        pass  # non-fatal – next call will just re-fetch

    return {"parsed_data": parsed, "latency_ms": latency, "cached": False}
