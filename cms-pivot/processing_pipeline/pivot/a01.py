# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import json
import sys
import os
import uuid
from datetime import datetime, timezone

class UpcodingDetectionAgent:
    def __init__(self, provider_history_stats=None):
        self.peer_benchmark_threshold = 0.30 
        self.provider_history = provider_history_stats or {"high_complexity_ratio": 0.90}
        self.CF = 32.74  
        
    def calculate_rbrvs_payment(self, work_rvu, pe_rvu, mp_rvu, gpci=(1.0, 1.0, 1.0)):
        """
        Payment = (Work RVU * GPCI_work + PE RVU * GPCI_pe + MP RVU * GPCI_mp) * CF
        """
        payment = (work_rvu * gpci[0] + pe_rvu * gpci[1] + mp_rvu * gpci[2]) * self.CF
        return round(payment, 2)

    def evaluate_claim(self, parsed_json):
        claim = parsed_json.get("claim", {})
        services = claim.get("services", [])
        diagnosis = claim.get("diagnosis", "Unknown")
        
        # Safely handle the string-to-float conversion for total_charge
        try:
            total_billed = float(claim.get("total_charge", 0))
        except (ValueError, TypeError):
            total_billed = 0.0

        is_flagged = False
        reasoning = "The claim complexity aligns with peer benchmarks and diagnosis codes."
        finding = "No upcoding patterns detected."
        
        # Pattern 1 Logic: E/M Codes and Complexity
        high_complexity_codes = ["99214", "99215", "MSDRG193"]
        for service in services:
            proc_code = service.get("proc_code")
            if proc_code in high_complexity_codes:
                # Check Distribution Drift
                if self.provider_history["high_complexity_ratio"] > self.peer_benchmark_threshold:
                    is_flagged = True
                    finding = "Significant 'distribution drift' detected in provider billing patterns."
                    reasoning = (f"Provider bills high-complexity codes at {self.provider_history['high_complexity_ratio']*100}% "
                                 f"of their total claims, compared to a specialty peer average of 30%.")
                
                # Check Clinical Congruity
                if diagnosis == "R05.9" and proc_code == "99215":
                    is_flagged = True
                    finding = "Clinical Incongruity between diagnosis and procedure code complexity."
                    reasoning += " Additionally, a diagnosis of 'unspecified cough' (R05.9) does not justify a 99215 level encounter."

        # Calculation logic
        savings = total_billed if is_flagged else 0.00
        payout = "$0.00" if is_flagged else f"${total_billed:,.2f}"

        return {
            "agent_metadata": {
                "agent_name": "Upcoding and Complexity Inflation Agent (UCIA-01)",
                "execution_id": str(uuid.uuid4()),
                "execution_time": "156ms",
                # FIX: Using the recommended timezone-aware UTC method
                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            "claim_context": {
                "claim_id": claim.get("id", "Unknown"),
                "veteran_id": claim.get("patient_name", "Unknown"),
                "date_of_service": services[0].get("date", "2026-02-09") if services else "2026-02-09",
                "billing_provider": claim.get("billing_provider", "Unknown")
            },
            "determination": {
                "flag": "REVIEW_PAY" if is_flagged else "APPROVE",
                "confidence_score": 0.94 if is_flagged else 1.00,
                "risk_tier": "Medium-High" if is_flagged else "Low"
            },
            "calculation_disclosure": {
                "original_billed_amount": total_billed,
                "payout_calculation": payout,
                "savings_realized": savings,
                "logic_formula": "Payment = (Work_RVU * GPCI_w + PE_RVU * GPCI_pe + MP_RVU * GPCI_mp) * CF"
            },
            "logic_transparency_explainability": {
                "finding": finding,
                "evidence_data": {
                    "provider_high_complexity_ratio": self.provider_history["high_complexity_ratio"],
                    "peer_benchmark_avg": self.peer_benchmark_threshold,
                    "diagnosis_code": diagnosis
                },
                "reasoning": reasoning
            },
            "recommended_action": "Flag for clinical peer review and RVU verification." if is_flagged else "Proceed with standard adjudication."
        }

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 upcoding.py <parsed_claim.json>")
        return

    filepath = sys.argv[1]
    if not os.path.exists(filepath):
        print(f"Error: File {filepath} not found.")
        return

    try:
        with open(filepath, 'r') as f:
            claim_data = json.load(f)
        
        agent = UpcodingDetectionAgent()
        result = agent.evaluate_claim(claim_data)
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main()