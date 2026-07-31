# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""Provider model for BigQuery."""

import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class Provider:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    npi: str = ""
    provider_type: str = "individual"
    specialty: str | None = None
    address: dict | None = None
    risk_score: int = 0
    accreditation_status: str = "accredited"
    claim_history: dict | None = None
    created_at: datetime | None = None

    @classmethod
    def from_bq_row(cls, row) -> "Provider":
        address = row.address
        if isinstance(address, str):
            address = json.loads(address)
        claim_history = row.claim_history
        if isinstance(claim_history, str):
            claim_history = json.loads(claim_history)
        return cls(
            id=row.id,
            name=row.name,
            npi=row.npi,
            provider_type=row.provider_type or "individual",
            specialty=row.specialty,
            address=address or {},
            risk_score=row.risk_score or 0,
            accreditation_status=row.accreditation_status or "accredited",
            claim_history=claim_history or {},
            created_at=row.created_at,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "npi": self.npi,
            "provider_type": self.provider_type,
            "specialty": self.specialty,
            "address": self.address or {},
            "risk_score": self.risk_score,
            "accreditation_status": self.accreditation_status,
            "claim_history": self.claim_history or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
