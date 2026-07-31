# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from pydantic import BaseModel


class FraudTrendItem(BaseModel):
    agent_name: str
    flag_count: int
    risk_breakdown: dict[str, int]


class AgentEfficacyItem(BaseModel):
    month: str
    scores: dict[str, float]


class ProcessingSpeed(BaseModel):
    current_throughput: float
    surge_capacity: float
    unit: str


class SavingsDataPoint(BaseModel):
    date: str
    cumulative_savings: float
    daily_savings: float


class InsightResponse(BaseModel):
    chart_type: str
    narrative: str


class DashboardMetrics(BaseModel):
    active_claims_annual: int
    avg_processing_time_hours: float
    realized_savings: float
    flagged_count: int
    approved_count: int
