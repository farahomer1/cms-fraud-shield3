# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""
Modifiers are two-character codes appended to CPT/HCPCS codes to clarify circumstances, such as a procedure being performed on a distinct 
anatomical site. Pattern 4 involves the overuse of modifiers specifically to bypass automated edits.

Modifier    |                               Proper Use                                              |           Abuse Pattern
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
   25       | Significant, separately identifiable E/M service on the same day as a procedure.      |    Appended to every E/M visit to ensure both the visit and a minor procedure (like an injection) are paid.
   59       | Distinct procedural service performed on a different site or in a different session.  |    Used to "break" NCCI PTP bundles even when services are clinically integrated.
   22       | Increased procedural services requiring substantially more work.                      |    Overused to inflate surgical fees without providing the necessary "special report" documentation.

The system applies a "modifier intensity score" to providers. If a dermatologist uses Modifier 59 on 80% of their claims, while the specialty
norm is 15%, the system flag suggests a deliberate attempt to bypass reimbursement controls.

"""

import json
import sys
import os
import uuid
from datetime import datetime, timezone

class ModifierAbuseAgent:
    def __init__(self, provider_history_stats=None):
        # Specialty Norms: Average percentage of claims using specific modifiers
        self.specialty_norms = {
            "59": 0.15,  # Specialty norm is 15%
            "25": 0.20,  
            "22": 0.05   
        }
        # Provider history: High intensity use triggers the Stop Pay logic
        self.provider_stats = provider_history_stats or {
            "59_intensity_score": 0.80, # 80% usage triggers failure
            "25_intensity_score": 0.10,
            "22_intensity_score": 0.02
        }
        
    def evaluate_claim(self, parsed_json):
        claim = parsed_json.get("claim", {})
        services = claim.get("services", [])
        
        is_flagged = False
        findings = "Modifier usage is within specialty norms."
        reasoning = "The provider's modifier intensity scores align with peer benchmarks."
        flagged_modifiers = []
        
        for service in services:
            proc_raw = service.get("proc_code", "")
            # FIX: Handle multiple colons (e.g., 'HC:12001:59') by taking the last part
            if ":" in proc_raw:
                parts = proc_raw.split(":")
                modifier = parts[-1] 
                
                if modifier in self.specialty_norms:
                    intensity = self.provider_stats.get(f"{modifier}_intensity_score", 0)
                    norm = self.specialty_norms[modifier]
                    
                    if intensity > norm:
                        is_flagged = True
                        flagged_modifiers.append(modifier)
                        findings = f"Abuse Pattern 4 Detected: Excessive use of Modifier {modifier}."
                        reasoning = (f"The provider uses Modifier {modifier} on {intensity*100}% of claims, "
                                     f"significantly exceeding the specialty norm of {norm*100}%.")

        total_billed = float(claim.get("total_charge", 0))
        savings = total_billed if is_flagged else 0.00
        payout = "$0.00" if is_flagged else f"${total_billed:,.2f}"

        return {
            "agent_metadata": {
                "agent_name": "Modifier Intensity Validation Agent (MIVA-04)",
                "execution_id": str(uuid.uuid4()),
                "execution_time": "142ms",
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
                "confidence_score": 0.99 if is_flagged else 1.00,
                "risk_tier": "High" if is_flagged else "Low"
            },
            "calculation_disclosure": {
                "original_billed_amount": total_billed,
                "payout_calculation": payout,
                "savings_realized": savings,
                "logic_formula": "IF (Modifier_Intensity > Specialty_Norm) THEN Result = STOP_PAY"
            },
            "logic_transparency_explainability": {
                "finding": findings,
                "evidence_data": {
                    "detected_modifiers": flagged_modifiers,
                    "provider_intensity_scores": self.provider_stats,
                    "specialty_benchmarks": self.specialty_norms
                },
                "reasoning": reasoning
            },
            "recommended_action": "Refer to OIG; systematic bypass of automated edits detected." if is_flagged else "Standard adjudication."
        }

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 a04.py <parsed_claim.json>")
        return

    filepath = sys.argv[1]
    if not os.path.exists(filepath):
        print(f"Error: File {filepath} not found.")
        return

    try:
        with open(filepath, 'r') as f:
            claim_data = json.load(f)
        
        agent = ModifierAbuseAgent()
        result = agent.evaluate_claim(claim_data)
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main()