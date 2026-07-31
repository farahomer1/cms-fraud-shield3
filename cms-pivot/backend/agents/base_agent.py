# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import json
import time
from pathlib import Path
from typing import Any

from services import gemini_client


class BaseAgent:
    """Base class for all PIVOT fraud detection agents."""

    name: str = ""
    fraud_type: str = ""
    prompt_file: str = ""

    def __init__(self):
        self._system_prompt: str | None = None

    @property
    def system_prompt(self) -> str:
        if self._system_prompt is None:
            prompt_path = Path(__file__).parent.parent.parent / "data" / "agent-prompts" / self.prompt_file
            if prompt_path.exists():
                self._system_prompt = prompt_path.read_text()
            else:
                self._system_prompt = self._default_prompt()
        return self._system_prompt

    def _default_prompt(self) -> str:
        return f"""You are the {self.name} for the VA PIVOT Payment Integrity Platform.
Your role is to analyze VA claims for {self.fraud_type}.
Return your analysis as JSON with these fields:
- agent_name: "{self.name}"
- fraud_type: "{self.fraud_type}"
- confidence_score: 0-100
- recommendation: "pass" or "flag"
- flagged_data_points: list of specific data points that triggered the flag
- evidence_summary: 1-2 sentence summary of findings
- finding_details: object with additional analysis details"""

    def build_context(self, claim_data: dict, veteran_data: dict | None = None,
                      provider_data: dict | None = None, batch_claims: list[dict] | None = None) -> str:
        parts = [f"=== CLAIM DATA ===\n{json.dumps(claim_data, indent=2, default=str)}"]
        if veteran_data:
            parts.append(f"\n=== VETERAN RECORD ===\n{json.dumps(veteran_data, indent=2, default=str)}")
        if provider_data:
            parts.append(f"\n=== PROVIDER PROFILE ===\n{json.dumps(provider_data, indent=2, default=str)}")
        if batch_claims:
            parts.append(f"\n=== OTHER CLAIMS IN BATCH ===\n{json.dumps(batch_claims[:10], indent=2, default=str)}")
        return "\n".join(parts)

    async def analyze(self, claim_data: dict, veteran_data: dict | None = None,
                      provider_data: dict | None = None, batch_claims: list[dict] | None = None) -> dict[str, Any]:
        context = self.build_context(claim_data, veteran_data, provider_data, batch_claims)
        prompt = f"Analyze this VA claim for {self.fraud_type}:\n\n{context}"

        start = time.time()
        try:
            result, latency = await gemini_client.generate_json(
                prompt=prompt,
                system_prompt=self.system_prompt,
                temperature=0.3,
            )
            processing_time = int((time.time() - start) * 1000)

            # Ensure required fields
            return {
                "agent_name": result.get("agent_name", self.name),
                "fraud_type": result.get("fraud_type", self.fraud_type),
                "confidence_score": max(0, min(100, int(result.get("confidence_score", 50)))),
                "recommendation": result.get("recommendation", "pass"),
                "flagged_data_points": result.get("flagged_data_points", []),
                "evidence_summary": result.get("evidence_summary", "Analysis complete."),
                "finding_details": result.get("finding_details", {}),
                "processing_time_ms": processing_time,
            }
        except Exception as e:
            return {
                "agent_name": self.name,
                "fraud_type": self.fraud_type,
                "confidence_score": 0,
                "recommendation": "pass",
                "flagged_data_points": [],
                "evidence_summary": f"Agent error: {str(e)}",
                "finding_details": {"error": str(e)},
                "processing_time_ms": int((time.time() - start) * 1000),
            }
