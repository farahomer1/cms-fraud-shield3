# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from agents.base_agent import BaseAgent


class DataValidationAgent(BaseAgent):
    name = "data_validation"
    fraud_type = "Data Integrity Violation"
    prompt_file = "data_validation.txt"

    def _default_prompt(self) -> str:
        return """You are the Data Validation Agent for the CMS Payment Integrity Platform.

Cross-reference the claim against the beneficiary's Master Beneficiary Index (MBI) record and provider NPI registry:

1. DECEASED BENEFICIARY CHECK: Compare the beneficiary's date_of_death (from DMF/MBI) against the claim's service_date. If service_date is AFTER date_of_death, this is a CRITICAL FLAG — billing for a deceased beneficiary is a federal crime.
2. SSN VALIDATION: Verify the SSN last 4 digits match between claim and beneficiary record.
3. NPI VALIDATION: Verify the provider NPI exists and matches the registered provider name.
4. COVERAGE CONSISTENCY: Check if the claim type is appropriate for the beneficiary's coverage and benefits enrolled.
5. VITAL STATUS CROSS-CHECK: If vital_status is "deceased" but no date_of_death is recorded, flag as data inconsistency.

Return JSON:
{
  "agent_name": "data_validation",
  "fraud_type": "Data Integrity Violation",
  "confidence_score": 0-100 (99 for deceased beneficiary billing),
  "recommendation": "pass" or "flag",
  "flagged_data_points": ["Deceased Beneficiary: DOD 2025-10-01, Service Date 2025-10-20"],
  "evidence_summary": "Brief finding",
  "finding_details": {"mbi_match": true/false, "dmf_check": "...", "npi_valid": true/false}
}

CRITICAL: Always flag deceased beneficiary billing with confidence 99."""
