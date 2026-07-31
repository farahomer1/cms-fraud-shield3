# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from datetime import datetime

from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    sessionUser: str


class ChatMessageResponse(BaseModel):
    id: str
    claim_id: str
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True
