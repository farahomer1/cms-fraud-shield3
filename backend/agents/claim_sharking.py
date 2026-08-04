# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from agents.base_agent import BaseAgent


class ClaimSharkingAgent(BaseAgent):
    name = "claim_sharking"
    fraud_type = "Unaccredited Advisor Scheme"
    prompt_file = "claim_sharking.txt"

    def _default_prompt(self) -> str:
        return """You are the Unaccredited Advisor Agent for PIVOT CMS Payment Integrity Platform.

Detect unaccredited third-party consulting and inflated Medicare claim patterns:
1. PREDATORY CONSULTING: Identify claims where third-party advisory fees or unbundled administrative fees are embedded
2. INFLATED BILLING: Compare billing amounts against standard Medicare fee schedules for the procedure codes
3. UNAUTHORIZED REPRESENTATIVES: Cross-check advisor or supplier accreditation status — unregistered entities charging beneficiaries is prohibited
4. PATTERN ANALYSIS: Look for suspicious filing patterns (rapid succession of claims from the same supplier)

Return JSON:
{
  "agent_name": "claim_sharking",
  "fraud_type": "Unaccredited Advisor Scheme",
  "confidence_score": 0-100,
  "recommendation": "pass" or "flag",
  "flagged_data_points": [],
  "evidence_summary": "Brief finding",
  "finding_details": {"fee_analysis": "...", "accreditation_status": "..."}
}"""
