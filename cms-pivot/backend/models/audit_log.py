# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""AuditLog model for BigQuery."""

import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class AuditLog:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime | None = None
    actor: str = ""
    actor_type: str = "human"
    action_type: str = ""
    claim_id: str | None = None
    details: dict | None = None
    confidence_score: int | None = None

    @classmethod
    def from_bq_row(cls, row) -> "AuditLog":
        details = row.details
        if isinstance(details, str):
            details = json.loads(details)
        return cls(
            id=row.id,
            timestamp=row.timestamp,
            actor=row.actor,
            actor_type=row.actor_type,
            action_type=row.action_type,
            claim_id=row.claim_id,
            details=details or {},
            confidence_score=row.confidence_score,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "actor": self.actor,
            "actor_type": self.actor_type,
            "action_type": self.action_type,
            "claim_id": self.claim_id,
            "details": self.details or {},
            "confidence_score": self.confidence_score,
        }
