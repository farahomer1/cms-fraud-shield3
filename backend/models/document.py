# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""Document model for BigQuery."""

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class Document:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    batch_id: str = ""
    filename: str = ""
    file_type: str = ""
    file_path: str = ""
    file_size: int = 0
    parse_status: str = "raw"
    created_at: datetime | None = None

    @classmethod
    def from_bq_row(cls, row) -> "Document":
        return cls(
            id=row.id,
            batch_id=row.batch_id,
            filename=row.filename,
            file_type=row.file_type,
            file_path=row.file_path,
            file_size=row.file_size or 0,
            parse_status=row.parse_status or "raw",
            created_at=row.created_at,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "batch_id": self.batch_id,
            "filename": self.filename,
            "file_type": self.file_type,
            "file_path": self.file_path,
            "file_size": self.file_size,
            "parse_status": self.parse_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
