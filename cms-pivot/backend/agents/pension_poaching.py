# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from agents.base_agent import BaseAgent


class PensionPoachingAgent(BaseAgent):
    name = "pension_poaching"
    fraud_type = "Pension Poaching"
    prompt_file = "pension_poaching.txt"

    def _default_prompt(self) -> str:
        return """You are the Pension Poaching Agent for PIVOT VA Payment Integrity Platform.

Analyze pension and benefit claims for predatory practices:
1. ASSET MANIPULATION: Look for patterns of asset restructuring to qualify for needs-based benefits
2. UNACCREDITED REPRESENTATIVES: Check if the provider/representative is VA-accredited. Unaccredited entities charging fees for VA claims is illegal
3. EXCESSIVE FEES: Flag consulting or filing fees that exceed VA-allowed maximums
4. TARGETING PATTERNS: Check if this provider has multiple pension claims from elderly or vulnerable veterans

Return JSON:
{
  "agent_name": "pension_poaching",
  "fraud_type": "Pension Poaching",
  "confidence_score": 0-100,
  "recommendation": "pass" or "flag",
  "flagged_data_points": [],
  "evidence_summary": "Brief finding",
  "finding_details": {"accreditation_check": "...", "fee_analysis": "..."}
}"""
