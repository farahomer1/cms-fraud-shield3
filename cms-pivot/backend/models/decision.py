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
            savings = Decimal(str(savings))
        return cls(
            id=row.id,
            claim_id=row.claim_id,
            decision_type=row.decision_type,
            actor=row.actor,
            actor_role=row.actor_role,
            rationale=row.rationale,
            savings_amount=savings,
            created_at=row.created_at,
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
