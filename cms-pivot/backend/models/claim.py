# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""Claim model for BigQuery."""

import json
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import Any


@dataclass
class Claim:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    claim_number: str = ""
    batch_id: str = ""
    veteran_id: str = ""
    provider_id: str = ""
    claim_type: str = "medical"
    raw_document_id: str | None = None
    normalized_data: dict | None = None
    status: str = "pending"
    risk_level: str | None = None
    billing_amount: Decimal = Decimal("0")
    service_date: date | None = None
    diagnosis_codes: list | None = None
    procedure_codes: list | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    # Joined relations (populated by routes when needed)
    veteran: Any = field(default=None, repr=False)
    provider: Any = field(default=None, repr=False)
    findings: list = field(default_factory=list, repr=False)
    decision: Any = field(default=None, repr=False)
    chat_messages: list = field(default_factory=list, repr=False)

    @classmethod
    def from_bq_row(cls, row) -> "Claim":
        normalized = row.normalized_data if hasattr(row, 'normalized_data') else None
        if isinstance(normalized, str):
            normalized = json.loads(normalized)
        diag = row.diagnosis_codes if hasattr(row, 'diagnosis_codes') else None
        if isinstance(diag, str):
            diag = json.loads(diag)
        proc = row.procedure_codes if hasattr(row, 'procedure_codes') else None
        if isinstance(proc, str):
            proc = json.loads(proc)
        return cls(
            id=row.id,
            claim_number=row.claim_number,
            batch_id=row.batch_id,
            veteran_id=row.veteran_id,
            provider_id=row.provider_id,
            claim_type=row.claim_type,
            raw_document_id=getattr(row, 'raw_document_id', None),
            normalized_data=normalized,
            status=row.status or "pending",
            risk_level=getattr(row, 'risk_level', None),
            billing_amount=Decimal(str(row.billing_amount)) if row.billing_amount else Decimal("0"),
            service_date=row.service_date,
            diagnosis_codes=diag or [],
            procedure_codes=proc or [],
            created_at=row.created_at,
            updated_at=getattr(row, 'updated_at', None),
        )

    def to_dict(self) -> dict[str, Any]:
        result = {
            "id": self.id,
            "claim_number": self.claim_number,
            "batch_id": self.batch_id,
            "veteran_id": self.veteran_id,
            "provider_id": self.provider_id,
            "claim_type": self.claim_type,
            "raw_document_id": self.raw_document_id,
            "normalized_data": self.normalized_data,
            "status": self.status,
            "risk_level": self.risk_level,
            "billing_amount": float(self.billing_amount),
            "service_date": self.service_date.isoformat() if self.service_date else None,
            "diagnosis_codes": self.diagnosis_codes or [],
            "procedure_codes": self.procedure_codes or [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if self.veteran:
            result["veteran"] = self.veteran.to_dict() if hasattr(self.veteran, 'to_dict') else self.veteran
        if self.provider:
            result["provider"] = self.provider.to_dict() if hasattr(self.provider, 'to_dict') else self.provider
        if self.findings:
            result["findings"] = [f.to_dict() if hasattr(f, 'to_dict') else f for f in self.findings]
        if self.decision:
            result["decision"] = self.decision.to_dict() if hasattr(self.decision, 'to_dict') else self.decision
        return result
