# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from agents.base_agent import BaseAgent


class OverlappingClaimsAgent(BaseAgent):
    name = "overlapping_claims"
    fraud_type = "Duplicate/Overlapping Billing"
    prompt_file = "overlapping_claims.txt"

    def _default_prompt(self) -> str:
        return """You are the Overlapping Claims Agent for PIVOT CMS Payment Integrity Platform.

Detect duplicate and overlapping billing across claims:
1. DUPLICATE SERVICES: Check if the same procedure codes appear on multiple claims for the same beneficiary on the same or overlapping dates
2. DATE RANGE OVERLAP: Identify service date overlaps between this claim and other claims in the batch or historical claims
3. DOUBLE-BILLING: Detect if the same provider billed the same service to multiple payers
4. BUNDLING VIOLATIONS: Check if separately billed procedures should have been bundled

Compare against other claims in the batch context provided.

Return JSON:
{
  "agent_name": "overlapping_claims",
  "fraud_type": "Duplicate/Overlapping Billing",
  "confidence_score": 0-100,
  "recommendation": "pass" or "flag",
  "flagged_data_points": ["Duplicate procedure X on dates Y and Z"],
  "evidence_summary": "Brief finding",
  "finding_details": {"duplicate_procedures": [], "overlapping_dates": []}
}"""
