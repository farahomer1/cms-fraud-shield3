# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from agents.base_agent import BaseAgent
from agents.rules_engine import RulesEngineAgent
from agents.data_validation import DataValidationAgent
from agents.pension_poaching import PensionPoachingAgent
from agents.claim_sharking import ClaimSharkingAgent
from agents.dbq_fraud import DBQFraudAgent
from agents.overlapping_claims import OverlappingClaimsAgent
from agents.medical_record import MedicalRecordAgent
from agents.claim_discrepancy import ClaimDiscrepancyAgent

AGENT_REGISTRY: list[BaseAgent] = [
    RulesEngineAgent(),
    DataValidationAgent(),
    PensionPoachingAgent(),
    ClaimSharkingAgent(),
    DBQFraudAgent(),
    OverlappingClaimsAgent(),
    MedicalRecordAgent(),
    ClaimDiscrepancyAgent(),
]

AGENT_DISPLAY_NAMES: dict[str, str] = {
    "rules_engine": "Gemini AI Rules Engine",
    "data_validation": "Data Validation Agent",
    "pension_poaching": "Pension Poaching Agent",
    "claim_sharking": "Claim Sharking Agent",
    "dbq_fraud": "DBQ Fraud Agent",
    "overlapping_claims": "Overlapping Claims Agent",
    "medical_record": "Medical Record Agent",
    "claim_discrepancy": "Claim Discrepancy Agent",
}


def get_agent(name: str) -> BaseAgent | None:
    for agent in AGENT_REGISTRY:
        if agent.name == name:
            return agent
    return None
