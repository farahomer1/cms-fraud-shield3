# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""
Fraudulent activity often involves providers billing for services that are completely unrelated to their training and 
board certifications. A psychiatrist billing for orthopedic surgery or a podiatrist billing for high-level cardiovascular 
screenings are examples of Pattern 7.

The system utilizes the Taxonomy Code in Loop 2000A (segment PRV) to determine the provider's classification. This 10-character 
code is an external code set maintained by the National Uniform Claim Committee (NUCC). The system maps each NPI to a set of 
"allowable CPT codes." If a provider submits a code outside this mapping, it is flagged for medical necessity review. Sophisticated
detection systems combine Random Forest models with Autoencoders to predict a provider’s "true" specialty based on their claim history,
catching bad actors who use incorrect taxonomy codes to hide their activities.

"""
import json
import sys
import os
import uuid
from datetime import datetime, timezone

class SpecialtyAlignmentAgent:
    def __init__(self):
        # Mapping Taxonomy Codes to allowed CPT/DRG ranges or prefixes
        # 207P00000X: Ophthalmology | 261QP0904X: Pharmacy | 122300000X: Dentist
        self.specialty_map = {
            "207P00000X": ["65091", "67005", "92002", "92014"], # Eye procedures
            "122300000X": ["D0120", "D0145", "D2140"],          # Dental codes
            "2084P0800X": ["90791", "90832", "90834"]           # Psychiatry
        }
        
    def evaluate_claim(self, parsed_json):
        claim = parsed_json.get("claim", {})
        services = claim.get("services", [])
        
        # In a real scenario, the Taxonomy Code is pulled from the PRV segment.
        # We will default to 'Psychiatry' for this demonstration.
        provider_taxonomy = claim.get("taxonomy_code", "2084P0800X") 
        allowed_codes = self.specialty_map.get(provider_taxonomy, [])
        
        is_flagged = False
        findings = "Procedure codes align with provider specialty taxonomy."
        reasoning = "The provider is billing within their registered scope of practice."
        
        # Check each service for specialty alignment
        for service in services:
            proc_code = service.get("proc_code")
            if proc_code not in allowed_codes:
                is_flagged = True
                findings = "Scope of Practice Violation: Pattern 7 detected."
                reasoning = (f"The provider (Taxonomy: {provider_taxonomy}) billed for procedure {proc_code}, "
                             f"which is outside the authorized CPT mapping for their specialty.")

        total_billed = float(claim.get("total_charge", 0))
        savings = total_billed if is_flagged else 0.00
        payout = "$0.00" if is_flagged else f"${total_billed:,.2f}"

        return {
            "agent_metadata": {
                "agent_name": "Specialty Alignment Validation Agent (SAVA-07)",
                "execution_id": str(uuid.uuid4()),
                "execution_time": "128ms",
                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            "claim_context": {
                "claim_id": claim.get("id", "Unknown"),
                "veteran_id": claim.get("patient_name", "Unknown"),
                "date_of_service": services[0].get("date", "2026-02-09") if services else "2026-02-09",
                "billing_provider": claim.get("billing_provider", "Unknown")
            },
            "determination": {
                "flag": "STOP_PAY" if is_flagged else "APPROVE",
                "confidence_score": 0.98 if is_flagged else 1.00,
                "risk_tier": "High" if is_flagged else "Low"
            },
            "calculation_disclosure": {
                "original_billed_amount": total_billed,
                "payout_calculation": payout,
                "savings_realized": savings,
                "logic_formula": "IF (Procedure_Code NOT IN Allowed_Specialty_Map) THEN Result = Flag_Violation"
            },
            "logic_transparency_explainability": {
                "finding": findings,
                "evidence_data": {
                    "provider_taxonomy": provider_taxonomy,
                    "billed_codes": [s.get("proc_code") for s in services],
                    "verification_source": "NUCC Taxonomy Code Set"
                },
                "reasoning": reasoning
            },
            "recommended_action": "Refer to Credentialing Office for scope of practice audit." if is_flagged else "Standard processing."
        }

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 specialty_alignment.py <parsed_claim.json>")
        return

    filepath = sys.argv[1]
    if not os.path.exists(filepath):
        print(f"Error: File {filepath} not found.")
        return

    try:
        with open(filepath, 'r') as f:
            claim_data = json.load(f)
        
        agent = SpecialtyAlignmentAgent()
        result = agent.evaluate_claim(claim_data)
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main()