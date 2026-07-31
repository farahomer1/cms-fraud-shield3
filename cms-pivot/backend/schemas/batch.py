# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from datetime import date, datetime
from pydantic import BaseModel


class BatchResponse(BaseModel):
    id: str
    name: str
    received_date: date
    file_count: int
    status: str
    total_claims: int
    flagged_count: int
    approved_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    id: str
    batch_id: str
    filename: str
    file_type: str
    file_path: str
    file_size: int
    parse_status: str
    created_at: datetime

    class Config:
        from_attributes = True
