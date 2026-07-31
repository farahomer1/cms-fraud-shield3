# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""AgentFinding model for BigQuery."""

import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class AgentFinding:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    claim_id: str = ""
    agent_name: str = ""
    fraud_type: str = ""
    confidence_score: int = 0
    recommendation: str = "pass"
    flagged_data_points: list | None = None
    evidence_summary: str = ""
    finding_details: dict | None = None
    processing_time_ms: int = 0
    created_at: datetime | None = None

    @classmethod
    def from_bq_row(cls, row) -> "AgentFinding":
        flagged = row.flagged_data_points
        if isinstance(flagged, str):
            flagged = json.loads(flagged)
        details = row.finding_details
        if isinstance(details, str):
            details = json.loads(details)
        return cls(
            id=row.id,
            claim_id=row.claim_id,
            agent_name=row.agent_name,
            fraud_type=row.fraud_type,
            confidence_score=row.confidence_score or 0,
            recommendation=row.recommendation or "pass",
            flagged_data_points=flagged or [],
            evidence_summary=row.evidence_summary,
            finding_details=details or {},
            processing_time_ms=row.processing_time_ms or 0,
            created_at=row.created_at,
        )

    def to_dict(self) -> dict[str, Any]:
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

        def translate_nested(obj: Any) -> Any:
            if isinstance(obj, dict):
                return {translate_cms_terms(k): translate_nested(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [translate_nested(i) for i in obj]
            elif isinstance(obj, str):
                return translate_cms_terms(obj)
            return obj

        return {
            "id": self.id,
            "claim_id": self.claim_id,
            "agent_name": translate_cms_terms(self.agent_name),
            "fraud_type": translate_cms_terms(self.fraud_type),
            "confidence_score": self.confidence_score,
            "recommendation": self.recommendation,
            "flagged_data_points": [translate_cms_terms(p) for p in (self.flagged_data_points or [])],
            "evidence_summary": translate_cms_terms(self.evidence_summary),
            "finding_details": translate_nested(self.finding_details or {}),
            "processing_time_ms": self.processing_time_ms,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

