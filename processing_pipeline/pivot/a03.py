# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""
Pattern 3 focuses on statistical outliers in claim submission. This involves providers whose billing volume exceeds what is 
physically possible for a human practitioner in a 24-hour period (e.g., billing for 40 hours of face-to-face time in one day). 
In VA Community Care, this may also manifest as an unusual surge in claims for high-cost durable medical equipment (DME) or 
specialized infusions shortly after a provider joins the network.

The system utilizes longitudinal behavior tracking to establish a baseline for each provider. A "robotic upload activity" or 
"claim storm," where thousands of claims are submitted within a single minute, triggers an immediate "unusual volume" alert. 
This behavior often suggests the use of automated billing software programmed to submit fictitious encounters or cloned records.

"""
import json
import sys
import uuid
from datetime import datetime, timezone

class VolumeOutlierAgent:
    def __init__(self, provider_history_stats=None):
        # Humanly possible threshold: Max hours of face-to-face time in 24h
        self.MAX_DAILY_HOURS = 24.0 
        
        # Longitudinal Baseline: Mocked history for the provider 
        # In a real system, this would be queried from a database
        self.provider_history = provider_history_stats or {
            "avg_daily_claims": 15,
            "is_new_provider": True,  # Surge check for new network members 
            "current_24h_billable_hours": 32.5, # Impossible 32.5 hours 
            "submission_velocity_per_min": 1200 # "Claim Storm" indicator 
        }

    def evaluate_claim(self, parsed_json):
        claim = parsed_json.get("claim", {})
        
        is_flagged = False
        findings = "Billing volume aligns with human practitioner baselines."
        reasoning = "Provider activity falls within expected statistical norms."
        risk_tier = "Low"
        
        # 1. Human Capacity Check (Physically Impossible Billing) 
        if self.provider_history["current_24h_billable_hours"] > self.MAX_DAILY_HOURS:
            is_flagged = True
            findings = "Pattern 3 Violation: Impossible Billing Volume."
            reasoning = (f"Provider billed {self.provider_history['current_24h_billable_hours']} hours "
                         f"of service in a 24-hour window, exceeding physical capacity.")
            risk_tier = "High"

        # 2. Robotic Upload / Claim Storm Detection 
        if self.provider_history["submission_velocity_per_min"] > 500:
            is_flagged = True
            findings = "Pattern 3 Violation: Robotic Upload Activity Detected."
            reasoning += (f" Unusual submission velocity detected: "
                          f"{self.provider_history['submission_velocity_per_min']} claims/min.")
            risk_tier = "High"

        total_billed = float(claim.get("total_charge", 0))
        savings = total_billed if is_flagged else 0.00
        payout = "$0.00" if is_flagged else f"${total_billed:,.2f}"

        return {
            "agent_metadata": {
                "agent_name": "Longitudinal Volume Validation Agent (LVVA-03)",
                "execution_id": str(uuid.uuid4()),
                "execution_time": "165ms",
                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            "claim_context": {
                "claim_id": claim.get("id", "Unknown"),
                "veteran_id": claim.get("patient_name", "Unknown"),
                "date_of_service": "2026-02-09",
                "billing_provider": claim.get("billing_provider", "Unknown")
            },
            "determination": {
                "flag": "STOP_PAY" if is_flagged else "APPROVE",
                "confidence_score": 0.98 if is_flagged else 1.00,
                "risk_tier": risk_tier
            },
            "calculation_disclosure": {
                "original_billed_amount": total_billed,
                "payout_calculation": payout,
                "savings_realized": savings,
                "logic_formula": "IF (Daily_Hours > 24 OR Velocity > Threshold) THEN Result = STOP_PAY"
            },
            "logic_transparency_explainability": {
                "finding": findings,
                "evidence_data": {
                    "billable_hours_24h": self.provider_history["current_24h_billable_hours"],
                    "claims_per_minute": self.provider_history["submission_velocity_per_min"],
                    "is_new_network_member": self.provider_history["is_new_provider"]
                },
                "reasoning": reasoning
            },
            "recommended_action": "Refer to VA OIG; immediate suspension of payments pending longitudinal audit." if is_flagged else "Standard adjudication."
        }

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 a03.py <parsed_claim.json>")
        return
    filepath = sys.argv[1]
    try:
        with open(filepath, 'r') as f:
            claim_data = json.load(f)
        agent = VolumeOutlierAgent()
        print(json.dumps(agent.evaluate_claim(claim_data), indent=2))
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main()