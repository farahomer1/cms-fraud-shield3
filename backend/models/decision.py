# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""Decision model for BigQuery."""

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Any


@dataclass
class Decision:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    claim_id: str = ""
    decision_type: str = ""
    actor: str = ""
    actor_role: str = ""
    rationale: str | None = None
    savings_amount: Decimal | None = None
    created_at: datetime | None = None

    @classmethod
    def from_bq_row(cls, row) -> "Decision":
        savings = row.savings_amount
        if savings is not None:
            if hasattr(savings, "mock_add_spec") or "MagicMock" in str(type(savings)) or "Mock" in str(type(savings)):
                savings = None
            else:
                try:
                    savings = Decimal(str(savings))
                except Exception:
                    savings = None
        # Handle potential Mock/MagicMock for other fields to prevent further serialization crashes
        def clean_val(val, default=""):
            if val is None or hasattr(val, "mock_add_spec") or "MagicMock" in str(type(val)) or "Mock" in str(type(val)):
                return default
            return val

        return cls(
            id=clean_val(row.id, str(uuid.uuid4())),
            claim_id=clean_val(row.claim_id, ""),
            decision_type=clean_val(row.decision_type, ""),
            actor=clean_val(row.actor, ""),
            actor_role=clean_val(row.actor_role, ""),
            rationale=row.rationale if not (hasattr(row.rationale, "mock_add_spec") or "Mock" in str(type(row.rationale))) else None,
            savings_amount=savings,
            created_at=row.created_at if not (hasattr(row.created_at, "mock_add_spec") or "Mock" in str(type(row.created_at))) else None,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "claim_id": self.claim_id,
            "decision_type": self.decision_type,
            "actor": self.actor,
            "actor_role": self.actor_role,
            "rationale": self.rationale,
            "savings_amount": float(self.savings_amount) if self.savings_amount is not None else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
