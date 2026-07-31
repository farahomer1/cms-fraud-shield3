# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""Overpayment model for BigQuery."""

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Any


@dataclass
class Overpayment:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    claim_id: str = ""
    provider_name: str = ""
    provider_npi: str = ""
    original_billing_amount: Decimal = Decimal("0")
    allowable_amount: Decimal = Decimal("0")
    overpayment_amount: Decimal = Decimal("0")
    recoupment_status: str = "identified"  # identified|notified|in_recoupment|recouped|reconciled
    date_identified: datetime | None = None
    fms_paid_date: datetime | None = None
    assigned_analyst: str = ""
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @classmethod
    def from_bq_row(cls, row) -> "Overpayment":
        def _to_decimal(val) -> Decimal:
            if val is None:
                return Decimal("0")
            return Decimal(str(val))

        return cls(
            id=row.id,
            claim_id=row.claim_id,
            provider_name=row.provider_name,
            provider_npi=row.provider_npi,
            original_billing_amount=_to_decimal(row.original_billing_amount),
            allowable_amount=_to_decimal(row.allowable_amount),
            overpayment_amount=_to_decimal(row.overpayment_amount),
            recoupment_status=row.recoupment_status,
            date_identified=row.date_identified,
            fms_paid_date=row.fms_paid_date,
            assigned_analyst=row.assigned_analyst,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "claim_id": self.claim_id,
            "provider_name": self.provider_name,
            "provider_npi": self.provider_npi,
            "original_billing_amount": float(self.original_billing_amount),
            "allowable_amount": float(self.allowable_amount),
            "overpayment_amount": float(self.overpayment_amount),
            "recoupment_status": self.recoupment_status,
            "date_identified": self.date_identified.isoformat() if self.date_identified else None,
            "fms_paid_date": self.fms_paid_date.isoformat() if self.fms_paid_date else None,
            "assigned_analyst": self.assigned_analyst,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
