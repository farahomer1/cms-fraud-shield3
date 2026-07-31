# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""Batch model for BigQuery."""

import uuid
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any


@dataclass
class Batch:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    received_date: date | None = None
    file_count: int = 0
    status: str = "pending"
    total_claims: int = 0
    flagged_count: int = 0
    approved_count: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @classmethod
    def from_bq_row(cls, row) -> "Batch":
        return cls(
            id=row.id,
            name=row.name,
            received_date=row.received_date,
            file_count=row.file_count or 0,
            status=row.status or "pending",
            total_claims=row.total_claims or 0,
            flagged_count=row.flagged_count or 0,
            approved_count=row.approved_count or 0,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "received_date": self.received_date.isoformat() if self.received_date else None,
            "file_count": self.file_count,
            "status": self.status,
            "total_claims": self.total_claims,
            "flagged_count": self.flagged_count,
            "approved_count": self.approved_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
