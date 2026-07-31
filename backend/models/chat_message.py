# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""ChatMessage model for BigQuery."""

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class ChatMessage:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    claim_id: str = ""
    role: str = "user"
    content: str = ""
    created_at: datetime | None = None

    @classmethod
    def from_bq_row(cls, row) -> "ChatMessage":
        return cls(
            id=row.id,
            claim_id=row.claim_id,
            role=row.role,
            content=row.content,
            created_at=row.created_at,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "claim_id": self.claim_id,
            "role": self.role,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
