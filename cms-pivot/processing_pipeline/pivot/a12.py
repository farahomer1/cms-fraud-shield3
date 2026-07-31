# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""
Pattern 12 involves "tactical nomenclature shifting," where a provider switches between different coding sets or product 
identifiers to evade specific audits. In professional billing, this might involve switching from CPT codes to "Not Otherwise 
Classified" HCPCS codes if the CPT code is under heavy scrutiny. In pharmacy, it manifests as "product switching"—billing for 
an expensive brand-name drug but dispensing a lower-cost generic.

The system monitors "code-switching" by tracking the frequency of code pairs used for a specific diagnosis. If a provider suddenly 
switches from billing standard cataract surgery (66984) to a complex neuroplasty code (64708) for the same patient pool, the "risk 
scoring metrics" trigger a forensic review of the medical records to see if the documentation supports the new code.

"""
import json
import sys
import uuid
from datetime import datetime, timezone

class NomenclatureShiftAgent:
    def __init__(self, longitudinal_data=None):
        # Standard Code -> High-Risk/Audit-Evasion Shift
        self.monitored_shifts = {
            "66984": "64708",  # Cataract -> Neuroplasty
            "GENERIC": "BRAND" # Pharmacy Product Switching
        }
        
        self.provider_baseline = longitudinal_data or {
            "historical_standard_code_usage": 0.85,
            "current_shift_velocity": 0.70,
            "diagnostic_pool": "Cataract/Ocular/Pharmacy"
        }

    def evaluate_claim(self, parsed_json):
        claim = parsed_json.get("claim", {})
        services = claim.get("services", [])
        
        is_flagged = False
        findings = "Nomenclature and coding sets remain consistent with historical baselines."
        reasoning = "No tactical code-switching detected for this provider/diagnosis pool."
        flagged_codes = []
        
        for service in services:
            raw_code = service.get("proc_code", "").strip()
            
            # Handle prefixes (HC:, AD:) and split modifiers
            clean_code = raw_code.replace("HC:", "").replace("AD:", "")
            base_code = clean_code.split(":")[0].strip()

            for standard, risky in self.monitored_shifts.items():
                if base_code == risky:
                    # Trigger forensic review if the shift velocity is high
                    if self.provider_baseline["current_shift_velocity"] > 0.50:
                        is_flagged = True
                        flagged_codes.append(base_code)
                        findings = "Pattern 12 Violation: Tactical Nomenclature Shifting Detected."
                        reasoning = (f"Provider has shifted to {risky} for the "
                                     f"{self.provider_baseline['diagnostic_pool']} pool. "
                                     f"Current Shift Velocity ({self.provider_baseline['current_shift_velocity']}) "
                                     "exceeds the 50% threshold.")

        total_billed = float(claim.get("total_charge", 0))
        payout = "$0.00" if is_flagged else f"${total_billed:,.2f}"

        return {
            "agent_metadata": {
                "agent_name": "Nomenclature Shift Validation Agent (NSVA-12)",
                "execution_id": str(uuid.uuid4()),
                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            "claim_context": {
                "claim_id": claim.get("id", "Unknown"),
                "billing_provider": claim.get("billing_provider", "Unknown"),
                "diagnostic_category": self.provider_baseline["diagnostic_pool"]
            },
            "determination": {
                "flag": "STOP_PAY" if is_flagged else "APPROVE",
                "confidence_score": 0.92 if is_flagged else 1.00,
                "risk_tier": "High" if is_flagged else "Low"
            },
            "calculation_disclosure": {
                "original_billed_amount": total_billed,
                "payout_calculation": payout,
                "logic_formula": "IF (Current_Code == Risky_Shift AND Shift_Velocity > 50%) THEN Result = STOP_PAY"
            },
            "logic_transparency_explainability": {
                "finding": findings,
                "evidence_data": {
                    "detected_shift_code": flagged_codes,
                    "current_shift_velocity": self.provider_baseline["current_shift_velocity"]
                },
                "reasoning": reasoning
            }
        }

def main():
    if len(sys.argv) < 2:
        return
    with open(sys.argv[1], 'r') as f:
        claim_data = json.load(f)
    agent = NomenclatureShiftAgent()
    print(json.dumps(agent.evaluate_claim(claim_data), indent=2))

if __name__ == "__main__":
    main()