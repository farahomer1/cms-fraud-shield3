# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: str
    timestamp: datetime
    actor: str
    actor_type: str
    action_type: str
    claim_id: str | None
    details: dict[str, Any]
    confidence_score: int | None

    class Config:
        from_attributes = True
