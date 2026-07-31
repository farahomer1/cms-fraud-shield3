# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel


class VeteranResponse(BaseModel):
    id: str
    name_display: str
    ssn_last4: str
    date_of_birth: date
    date_of_death: date | None
    vital_status: str
    service_branch: str | None
    disability_rating: int | None

    class Config:
        from_attributes = True


class ProviderResponse(BaseModel):
    id: str
    name: str
    npi: str
    provider_type: str
    specialty: str | None
    address: dict[str, Any]
    risk_score: int
    accreditation_status: str

    class Config:
        from_attributes = True


class AgentFindingResponse(BaseModel):
    id: str
    claim_id: str
    agent_name: str
    fraud_type: str
    confidence_score: int
    recommendation: str
    flagged_data_points: list[Any]
    evidence_summary: str
    finding_details: dict[str, Any]
    processing_time_ms: int
    created_at: datetime

    class Config:
        from_attributes = True


class DecisionResponse(BaseModel):
    id: str
    claim_id: str
    decision_type: str
    actor: str
    actor_role: str
    rationale: str | None
    savings_amount: Decimal | None
    created_at: datetime

    class Config:
        from_attributes = True


class ClaimResponse(BaseModel):
    id: str
    claim_number: str
    batch_id: str
    veteran_id: str
    provider_id: str
    claim_type: str
    normalized_data: dict[str, Any] | None
    status: str
    risk_level: str | None
    billing_amount: Decimal
    service_date: date
    diagnosis_codes: list[str]
    procedure_codes: list[str]
    created_at: datetime
    veteran: VeteranResponse | None = None
    provider: ProviderResponse | None = None
    findings: list[AgentFindingResponse] | None = None
    decision: DecisionResponse | None = None

    class Config:
        from_attributes = True


class AgentFlagItem(BaseModel):
    agentName: str
    notes: str | None = None


class DecisionRequest(BaseModel):
    decisionType: str
    actor: str
    actorRole: str
    rationale: str | None = None
    flaggedAgents: list[AgentFlagItem] | None = None


class GenerateNotesRequest(BaseModel):
    decisionType: str
