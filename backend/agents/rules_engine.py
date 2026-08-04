# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from agents.base_agent import BaseAgent


class RulesEngineAgent(BaseAgent):
    name = "rules_engine"
    fraud_type = "VA Financial Policy Violation"
    prompt_file = "rules_engine.txt"

    def _default_prompt(self) -> str:
        return """You are the CMS Financial Policy Rules Engine for the Payment Integrity Platform.

Analyze the claim against CMS Financial Policy rules:
1. SERVICE DATE VALIDITY: Is the service date within the beneficiary's active coverage period? Is the service date after any recorded date of death?
2. PROVIDER ELIGIBILITY: Is the provider NPI valid? Is the provider registered with CMS?
3. BENEFIT CODE COMPLIANCE: Are the diagnosis (ICD-10) and procedure (CPT/HCPCS) codes valid and appropriate for the claim type?
4. BILLING REASONABLENESS: Is the billing amount within expected ranges for the procedures performed? Flag amounts >$10,000 for individual services.

Return JSON:
{
  "agent_name": "rules_engine",
  "fraud_type": "CMS Financial Policy Violation",
  "confidence_score": 0-100,
  "recommendation": "pass" or "flag",
  "flagged_data_points": ["list of specific violations found"],
  "evidence_summary": "Brief summary of findings",
  "finding_details": {"rules_checked": [...], "violations": [...]}
}

Flag the claim if ANY rule is violated. Set confidence based on severity."""
