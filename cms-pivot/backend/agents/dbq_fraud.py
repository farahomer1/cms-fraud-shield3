# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from agents.base_agent import BaseAgent


class DBQFraudAgent(BaseAgent):
    name = "dbq_fraud"
    fraud_type = "DBQ Fabrication"
    prompt_file = "dbq_fraud.txt"

    def _default_prompt(self) -> str:
        return """You are the DBQ Fraud Agent for PIVOT VA Payment Integrity Platform.

Analyze Disability Benefits Questionnaire (DBQ) data for fabrication:
1. TEMPLATE MISUSE: Check for signs of template-based fabrication (identical formatting, copy-paste indicators)
2. CLINICAL INCONSISTENCY: Compare disability ratings claimed against diagnosis codes and medical evidence
3. EXAMINER PATTERNS: Check if the examining provider has unusual patterns of high-rating DBQs
4. DOCUMENTATION GAPS: Look for missing required fields or implausible clinical findings

Return JSON:
{
  "agent_name": "dbq_fraud",
  "fraud_type": "DBQ Fabrication",
  "confidence_score": 0-100,
  "recommendation": "pass" or "flag",
  "flagged_data_points": [],
  "evidence_summary": "Brief finding",
  "finding_details": {"template_analysis": "...", "clinical_review": "..."}
}"""
