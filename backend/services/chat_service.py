# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import json

from google.cloud import bigquery

from database import get_dataset, run_query, run_query_single
from models.claim import Claim
from models.beneficiary import Beneficiary
from models.provider import Provider
from models.agent_finding import AgentFinding
from services import gemini_client

def translate_cms_terms(text: str) -> str:
    if not isinstance(text, str):
        return text
    # Terminology translations for CMS alignment
    text = text.replace("Pension Poaching Agent", "Beneficiary Exploitation Agent")
    text = text.replace("pension poaching agent", "beneficiary exploitation agent")
    text = text.replace("Pension Poaching", "Beneficiary Exploitation")
    text = text.replace("pension poaching", "beneficiary exploitation")
    text = text.replace("Pension claims", "Medicare claims")
    text = text.replace("pension claims", "Medicare claims")
    text = text.replace("pension claim", "Medicare claim")
    text = text.replace("Pension claim", "Medicare claim")
    text = text.replace("VA OGC", "CMS Policy")
    text = text.replace("VA-accredited", "CMS-accredited")
    text = text.replace("VA accreditation", "CMS credentialing")
    text = text.replace("VA-accreditation", "CMS credentialing")
    text = text.replace("Master Veteran Index", "Master Beneficiary Index")
    text = text.replace("Master Veteran record", "Master Beneficiary record")
    text = text.replace("Master veteran record", "Master Beneficiary record")
    text = text.replace("veteran's", "beneficiary's")
    text = text.replace("Veteran's", "Beneficiary's")
    text = text.replace("veterans", "beneficiaries")
    text = text.replace("Veterans", "Beneficiaries")
    text = text.replace("veteran", "beneficiary")
    text = text.replace("Veteran", "Beneficiary")
    text = text.replace("Disability Rating", "HCC Risk Score / Chronic Conditions")
    text = text.replace("disability rating", "HCC Risk Score / chronic conditions")
    text = text.replace("Service Branch", "Coverage Group")
    text = text.replace("service branch", "coverage group")
    text = text.replace("benefits enrolled", "benefits covered")
    text = text.replace("Benefits Enrolled", "Benefits Covered")
    text = text.replace("DBQ Fraud Agent", "Clinical Assessment Integrity Agent")
    text = text.replace("DBQ Fraud", "Clinical Assessment Integrity Check")
    text = text.replace("DBQ", "Clinical Assessment / CMN")
    text = text.replace("PIVOT VA Payment Integrity Platform", "CMS Payment Integrity Platform")
    text = text.replace("PIVOT", "CMS Fraud Shield")
    return text

SUMMARY_SYSTEM_PROMPT = """You are CMS Fraud Shield's Executive Summary AI for the CMS Payment Integrity Platform.
Generate a 2-3 sentence executive summary of why this claim was flagged.
Include: key evidence, confidence assessment, and applicable CMS policy.
Use professional CMS terminology. Reference specific data points from the findings.
Do NOT hallucinate data — only reference what is provided in the context.

CRITICAL RULES:
- This is a CMS system, NOT a VA (Veterans Affairs) system.
- NEVER use VA-specific terms like "veteran", "veterans", "pension", "pension poaching", "DBQ", or "VA".
- You must always translate these to CMS equivalents: E.g., use "Beneficiary" or "Member" instead of "Veteran", "Beneficiary Exploitation" instead of "Pension Poaching", "Medicare Plan/Coverage" instead of "Service Branch", "Clinical Assessment / CMN" instead of "DBQ"."""

CHAT_SYSTEM_PROMPT = """You are CMS Fraud Shield AI, an expert CMS Payment Integrity analyst assistant.
You help CMS case officers investigate flagged claims by providing evidence-based analysis.

RULES:
1. Only reference data present in the claim context provided
2. Cite specific claim fields and agent findings
3. Use CMS terminology (NPI, TIN, HCPCS, CMN, MACs, OIG, etc.)
4. Format responses with markdown (tables, bold, bullet lists)
5. Never hallucinate claim IDs, dollar amounts, or dates not in context
6. When asked to draft a rejection note, use formal CMS correspondence style
7. This is a CMS system, NOT a VA (Veterans Affairs) system. NEVER use terms like "veteran", "veterans", "pension", "pension poaching", "DBQ", or "VA". Always translate any such terms found in context data to CMS equivalents: E.g., use "Beneficiary" or "Member" instead of "Veteran", "Beneficiary Exploitation" instead of "Pension Poaching", "Medicare Plan/Coverage" instead of "Service Branch", "Clinical Assessment / CMN" instead of "DBQ".

You can:
- Summarize evidence from agent findings
- Analyze provider history and patterns
- Draft rejection/approval letters
- Cite CMS Financial Policy
- Compare against similar claims
- Explain agent confidence scores"""


async def _load_claim_with_relations(claim_id: str, bq: bigquery.Client) -> Claim | None:
    """Load a claim with its beneficiary, provider, and findings from BigQuery."""
    ds = get_dataset()
    row = await run_query_single(
        f"""SELECT c.*, v.name_display as v_name_display, v.ssn_last4 as v_ssn_last4,
               v.date_of_birth as v_dob, v.date_of_death as v_dod, v.vital_status as v_vital_status,
               v.service_branch as v_service_branch, v.disability_rating as v_disability_rating,
               p.name as p_name, p.npi as p_npi, p.provider_type as p_provider_type,
               p.specialty as p_specialty, p.address as p_address, p.risk_score as p_risk_score,
               p.accreditation_status as p_accreditation_status
         FROM `{ds}.claims` c
         LEFT JOIN `{ds}.members` v ON c.beneficiary_id = v.id
         LEFT JOIN `{ds}.providers` p ON c.provider_id = p.id
         WHERE c.id = @claim_id""",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("claim_id", "STRING", claim_id)],
    )
    if not row:
        return None

    claim = Claim.from_bq_row(row)
    claim.beneficiary = Beneficiary(
        id=row.beneficiary_id, name_display=row.v_name_display or "", ssn_last4=row.v_ssn_last4 or "",
        date_of_birth=row.v_dob, date_of_death=row.v_dod, vital_status=row.v_vital_status or "alive",
        service_branch=row.v_service_branch, disability_rating=row.v_disability_rating,
    )
    claim.veteran = claim.beneficiary
    claim.provider = Provider(
        id=row.provider_id, name=row.p_name or "", npi=row.p_npi or "",
        provider_type=row.p_provider_type or "individual", specialty=row.p_specialty,
        address=json.loads(row.p_address) if isinstance(row.p_address, str) else (row.p_address or {}),
        risk_score=row.p_risk_score or 0, accreditation_status=row.p_accreditation_status or "accredited",
    )

    findings_rows = await run_query(
        f"SELECT * FROM `{ds}.agent_findings` WHERE claim_id = @claim_id",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("claim_id", "STRING", claim_id)],
    )
    claim.findings = [AgentFinding.from_bq_row(f) for f in findings_rows]
    return claim


DECISION_NOTES_SYSTEM_PROMPT = """You are CMS Fraud Shield's Decision Notes AI for the CMS Payment Integrity Platform.
Generate professional case notes for a CMS claim decision.

For APPROVED decisions: Write 2-3 sentences explaining why the claim passes integrity checks.
Mention that agent findings were reviewed and any mitigating factors. Use formal CMS language.

For DENIED decisions: Write 2-3 sentences explaining the basis for denial.
Reference specific agent findings, evidence of fraud indicators, and applicable CMS policy.
Use formal CMS correspondence style suitable for official records.

RULES:
- Only reference data present in the claim context provided
- Use CMS terminology (NPI, TIN, HCPCS, CMN, MACs, OIG, etc.)
- Be concise but thorough
- Do NOT hallucinate data — only reference what is provided
- This is a CMS system, NOT a VA (Veterans Affairs) system. NEVER use terms like "veteran", "veterans", "pension", "pension poaching", "DBQ", or "VA". Always translate any such terms to CMS equivalents: E.g., use "Beneficiary" instead of "Veteran", "Beneficiary Exploitation" instead of "Pension Poaching", "Medicare Plan/Coverage" instead of "Service Branch", "Clinical Assessment / CMN" instead of "DBQ"."""


async def generate_decision_notes(claim_id: str, decision_type: str, bq: bigquery.Client) -> str:
    claim = await _load_claim_with_relations(claim_id, bq)
    if not claim:
        return "Claim not found."

    context = _build_claim_context(claim)
    action = "approval" if decision_type == "approved" else "denial"
    prompt = f"Generate case notes for the {action} of this claim:\n\n{context}"

    try:
        text, _ = await gemini_client.generate_text(
            prompt=prompt,
            system_prompt=DECISION_NOTES_SYSTEM_PROMPT,
            temperature=0.4,
        )
        return translate_cms_terms(text)
    except Exception:
        if decision_type == "approved":
            return "Claim reviewed. Agent findings assessed and claim approved for payment processing."
        return "Claim reviewed. Fraud indicators confirmed. Claim denied per CMS payment integrity policy."


async def generate_executive_summary(claim_id: str, bq: bigquery.Client) -> str:
    claim = await _load_claim_with_relations(claim_id, bq)
    if not claim:
        return "Claim not found."

    context = _build_claim_context(claim)
    prompt = f"Generate an executive summary for this flagged claim:\n\n{context}"

    try:
        text, _ = await gemini_client.generate_text(
            prompt=prompt,
            system_prompt=SUMMARY_SYSTEM_PROMPT,
            temperature=0.4,
        )
        return translate_cms_terms(text)
    except Exception as e:
        return f"Unable to generate summary: {str(e)}"


async def generate_chat_response(claim_id: str, message: str, bq: bigquery.Client) -> str:
    claim = await _load_claim_with_relations(claim_id, bq)
    if not claim:
        return "Claim not found."

    ds = get_dataset()
    history_rows = await run_query(
        f"SELECT * FROM `{ds}.chat_messages` WHERE claim_id = @claim_id ORDER BY created_at",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("claim_id", "STRING", claim_id)],
    )
    history = [{"role": r.role, "content": translate_cms_terms(r.content)} for r in history_rows]

    context = _build_claim_context(claim)
    system = f"{CHAT_SYSTEM_PROMPT}\n\n--- CLAIM CONTEXT ---\n{context}"

    try:
        text, _ = await gemini_client.generate_text(
            prompt=message,
            system_prompt=system,
            history=history,
            temperature=0.5,
        )
        return translate_cms_terms(text)
    except Exception as e:
        return f"I apologize, but I encountered an error processing your request: {str(e)}"


def _build_claim_context(claim: Claim) -> str:
    parts = []
    parts.append(f"**Claim Number:** {claim.claim_number}")
    parts.append(f"**Type:** {claim.claim_type}")
    parts.append(f"**Status:** {claim.status}")
    parts.append(f"**Risk Level:** {claim.risk_level or 'N/A'}")
    parts.append(f"**Billing Amount:** ${float(claim.billing_amount):,.2f}")
    parts.append(f"**Service Date:** {claim.service_date}")
    parts.append(f"**Diagnosis Codes:** {json.dumps(claim.diagnosis_codes)}")
    parts.append(f"**Procedure Codes:** {json.dumps(claim.procedure_codes)}")

    if claim.beneficiary:
        v = claim.beneficiary
        parts.append(f"\n**Beneficiary:** {v.name_display}")
        parts.append(f"**SSN (last 4):** {v.ssn_last4}")
        parts.append(f"**DOB:** {v.date_of_birth}")
        parts.append(f"**Vital Status:** {v.vital_status}")
        if v.date_of_death:
            parts.append(f"**Date of Death:** {v.date_of_death}")
        parts.append(f"**Medicare Plan:** {v.service_branch or 'N/A'}")
        parts.append(f"**HCC Risk / Chronic Conditions Rating:** {v.disability_rating or 'N/A'}%")

    if claim.provider:
        p = claim.provider
        parts.append(f"\n**Provider:** {p.name}")
        parts.append(f"**NPI:** {p.npi}")
        parts.append(f"**Specialty:** {p.specialty or 'N/A'}")
        parts.append(f"**Risk Score:** {p.risk_score}/100")
        parts.append(f"**Accreditation:** {p.accreditation_status}")
        if p.address:
            if isinstance(p.address, dict):
                addr_str = f"{p.address.get('street', '')}, {p.address.get('city', '')}, {p.address.get('state', '')} {p.address.get('zip', '')}"
            else:
                addr_str = str(p.address)
            parts.append(f"**Address:** {addr_str}")

    if claim.findings:
        parts.append("\n--- AGENT FINDINGS ---")
        for f in claim.findings:
            parts.append(f"\n**{f.agent_name}** ({f.fraud_type})")
            parts.append(f"  Confidence: {f.confidence_score}%")
            parts.append(f"  Recommendation: {f.recommendation}")
            parts.append(f"  Evidence: {f.evidence_summary}")
            if f.flagged_data_points:
                parts.append(f"  Flagged Points: {json.dumps(f.flagged_data_points)}")

    if claim.normalized_data:
        parts.append(f"\n--- PARSED CLAIM DATA ---\n{json.dumps(claim.normalized_data, indent=2)[:2000]}")

    return translate_cms_terms("\n".join(parts))
