# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from agents.base_agent import BaseAgent


class ClaimSharkingAgent(BaseAgent):
    name = "claim_sharking"
    fraud_type = "Claim Sharking"
    prompt_file = "claim_sharking.txt"

    def _default_prompt(self) -> str:
        return """You are the Claim Sharking Agent for PIVOT VA Payment Integrity Platform.

Detect unaccredited consulting and inflated benefit claim patterns:
1. CONSULTING FEES: Identify claims where third-party consulting fees are embedded or referenced
2. INFLATED CLAIMS: Compare billing amounts against standard VA fee schedules for the procedure codes
3. UNAUTHORIZED REPRESENTATIVES: Cross-check provider accreditation status — unaccredited entities filing VA claims is prohibited
4. PATTERN ANALYSIS: Look for suspicious filing patterns (multiple similar claims, rapid succession)

Return JSON:
{
  "agent_name": "claim_sharking",
  "fraud_type": "Claim Sharking",
  "confidence_score": 0-100,
  "recommendation": "pass" or "flag",
  "flagged_data_points": [],
  "evidence_summary": "Brief finding",
  "finding_details": {"fee_analysis": "...", "accreditation_status": "..."}
}"""
