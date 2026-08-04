# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from agents.base_agent import BaseAgent


class DBQFraudAgent(BaseAgent):
    name = "dbq_fraud"
    fraud_type = "CMN Fabrication"
    prompt_file = "dbq_fraud.txt"

    def _default_prompt(self) -> str:
        return """You are the CMN Fabrication Agent for PIVOT CMS Payment Integrity Platform.

Analyze Certificate of Medical Necessity (CMN) and clinical documentation for fabrication:
1. TEMPLATE MISUSE: Check for signs of template-based fabrication (identical formatting, generic copy-paste text)
2. CLINICAL INCONSISTENCY: Compare clinical diagnosis/HCPCS codes against patient condition and medical necessity guidelines
3. EXAMINER PATTERNS: Check if the ordering provider has unusual patterns of high-frequency or high-volume CMNs
4. DOCUMENTATION GAPS: Look for missing signatures, incomplete fields, or implausible clinical findings

Return JSON:
{
  "agent_name": "dbq_fraud",
  "fraud_type": "CMN Fabrication",
  "confidence_score": 0-100,
  "recommendation": "pass" or "flag",
  "flagged_data_points": [],
  "evidence_summary": "Brief finding",
  "finding_details": {"template_analysis": "...", "clinical_review": "..."}
}"""
