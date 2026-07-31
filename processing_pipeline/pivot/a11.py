# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""
Pattern 11 utilizes the demographic data in Loop 2010CA (segment DMG) to flag biological and developmental inconsistencies.
Category       |                              Improper Example                  |                   Technical Rule
Gender         | Prostatic biopsy billed for a female patient.                  | Procedure is "male-specific" in the CPT/HCPCS manual; lacks Modifier KX override.
Age            | Pediatric well-visit (99381) billed for a 70-year-old Veteran. | CPT 99381 is restricted to infants under 1 year of age.
Age            | Colorectal cancer screening billed for a 12-year-old.          | CPT Screening benchmarks for G0120 typically begin at age 45-50 unless high-risk is documented.

For transgender Veterans, the system provides a "bypass mechanism" using Modifier KX or Condition Code 45, 
which alerts the system that the gender-procedure conflict is intentional and medically supported.

"""
import json
import sys
import uuid
from datetime import datetime, timezone

class DemographicValidationAgent:
    def __init__(self):
        # Technical Rules for Gender and Age Inconsistencies
        self.gender_rules = {
            "55700": "M",  # Prostatic biopsy (Male)
            "58150": "F",  # Total hysterectomy (Female)
        }
        self.age_rules = {
            "99381": {"max_age": 1},   # Pediatric well-visit (< 1 yr)
            "D0145": {"max_age": 3},   # Oral eval (Pediatric < 3 yrs)
            "G0120": {"min_age": 45},  # Colorectal screening benchmarks
        }

    def evaluate_claim(self, parsed_json):
        claim = parsed_json.get("claim", {})
        services = claim.get("services", [])
        
        gender = claim.get("patient_gender", "U")
        age = int(claim.get("patient_age", 0))
        
        print("\n--- [DIAGNOSTIC TRACE: PATTERN 11] ---")
        print(f"PATIENT PROFILE: Gender='{gender}', Age={age}")
        
        is_flagged = False
        findings = "Demographic data aligns with clinical procedure guidelines."
        reasoning = "The billed services are developmentally and biologically consistent."
        flagged_codes = []
        
        for i, service in enumerate(services):
            raw_code = service.get("proc_code", "")
            
            # Clean prefixes (HC:, AD:) and split modifiers
            clean_code = raw_code.replace("HC:", "").replace("AD:", "")
            parts = clean_code.split(":")
            base_code = parts[0]
            modifiers = parts[1:] if len(parts) > 1 else []
            
            print(f"SERVICE[{i}]: Raw='{raw_code}' -> Base Code extracted: '{base_code}'")

            # 1. Gender Inconsistency Check
            if base_code in self.gender_rules:
                required_gender = self.gender_rules[base_code]
                print(f"   GENDER CHECK: Base '{base_code}' requires '{required_gender}'.")
                
                if gender != required_gender:
                    # Transgender Bypass Mechanism
                    if "KX" in modifiers or claim.get("condition_code") == "45":
                        print("      BYPASS: Modifier KX or Code 45 detected.")
                        continue
                        
                    is_flagged = True
                    flagged_codes.append(base_code)
                    findings = f"Violation: Gender mismatch for {base_code}."
                    print("      !!! GENDER VIOLATION !!!")

            # 2. Age Inconsistency Check (Added missing logic)
            if base_code in self.age_rules:
                rule = self.age_rules[base_code]
                print(f"   AGE CHECK: Base '{base_code}' has rules: {rule}")
                
                if "max_age" in rule and age > rule["max_age"]:
                    is_flagged = True
                    flagged_codes.append(base_code)
                    findings = f"Violation: Age exceeds limit for {base_code}."
                    reasoning = f"Pediatric code {base_code} billed for a {age}-year-old patient."
                    print(f"      !!! AGE VIOLATION: Patient too old ({age} > {rule['max_age']}) !!!")
                elif "min_age" in rule and age < rule["min_age"]:
                    is_flagged = True
                    flagged_codes.append(base_code)
                    findings = f"Violation: Age below minimum for {base_code}."
                    print("      !!! AGE VIOLATION: Patient too young !!!")

        print("--- [DIAGNOSTIC END] ---\n")

        return {
            "agent_metadata": {
                "agent_name": "Demographic Validation Agent (DVA-11)",
                "execution_id": str(uuid.uuid4()),
                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            "claim_context": {
                "claim_id": claim.get("id", "Unknown"),
                "patient_gender": gender,
                "patient_age": age
            },
            "determination": {
                "flag": "STOP_PAY" if is_flagged else "APPROVE",
                "confidence_score": 1.00 if is_flagged else 1.00,
                "risk_tier": "High" if is_flagged else "Low"
            },
            "logic_transparency_explainability": {
                "finding": findings,
                "evidence_data": {
                    "gender": gender,
                    "age": age,
                    "flagged_codes": flagged_codes
                },
                "reasoning": reasoning if is_flagged else "Services billed are distinct and not bundled."
            }
        }

def main():
    if len(sys.argv) < 2:
        return
    with open(sys.argv[1], 'r') as f:
        claim_data = json.load(f)
    agent = DemographicValidationAgent()
    print(json.dumps(agent.evaluate_claim(claim_data), indent=2))

if __name__ == "__main__":
    main()