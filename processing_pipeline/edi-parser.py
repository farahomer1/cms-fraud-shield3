# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import json
import sys
import os
from datetime import datetime

class HealthcareParser:
    def __init__(self, filepath):
        self.filepath = filepath
        with open(filepath, 'r') as f:
            self.raw_data = f.read().strip()

    def parse(self):
        extension = os.path.splitext(self.filepath)[1].lower()
        if extension == '.edi':
            return self._parse_x12()
        elif extension == '.ncpdp':
            return self._parse_ncpdp()
        else:
            return {"error": "Unsupported file extension"}

    def _parse_x12(self):
        if len(self.raw_data) < 106: 
            return {"error": "Malformed EDI"}
        
        el_sep = self.raw_data[3]
        seg_sep = self.raw_data[105]
        segments = [s.strip() for s in self.raw_data.split(seg_sep) if s.strip()]
        
        data = {
            "format": "X12 EDI", 
            "metadata": {}, 
            "claim": {"services": [], "attachments": []}
        }

        for seg in segments:
            p = seg.split(el_sep)
            if not p:
                continue
            tag = p[0]
            
            if tag == 'NM1' and len(p) > 4:
                if p[1] == '85': 
                    data["claim"]["billing_provider"] = p[3]
                if p[1] == 'IL': 
                    data["claim"]["patient_name"] = f"{p[4]} {p[3]}"
            elif tag == 'CLM' and len(p) > 2:
                data["claim"]["id"] = p[1]
                data["claim"]["total_charge"] = p[2]
            elif tag == 'DMG' and len(p) > 3:
                data["claim"]["patient_gender"] = p[3].strip()
                try:
                    dob = datetime.strptime(p[2], "%Y%m%d")
                    data["claim"]["patient_age"] = (datetime.now().year - dob.year)
                except Exception:
                    data["claim"]["patient_age"] = 0
            elif tag in ['SV1', 'SV2', 'SV3']:
                # SV2 uses index 3 for charges, others use index 2
                charge_val = p[3] if tag == 'SV2' else p[2]
                data["claim"]["services"].append({
                    "proc_code": p[1], 
                    "charge": charge_val
                })
        return data

    def _parse_ncpdp(self):
        """Standardizes NCPDP pharmacy data into the X12 claim/services schema."""
        raw = self.raw_data
        data = {
            "format": "NCPDP Pharmacy",
            "claim": {
                "id": raw[16:26].strip() if len(raw) > 26 else "TC-N-002",
                "billing_provider": "Pharmacy Provider",
                "services": []
            }
        }

        # More robust field extraction for D7 (NDC/Brand) and D9 (Amount)
        ndc_val = "UNKNOWN"
        if "D7" in raw:
            # Find D7 and take the text following it until the next field or end
            start = raw.find("D7") + 2
            # Use common separators or end of string as boundaries
            end = len(raw)
            for sep in ['^', '\x1c', '\x1e', '\n']:
                pos = raw.find(sep, start)
                if pos != -1 and pos < end:
                    end = pos
            ndc_val = raw[start:end].strip()

        charge_val = "0.00"
        if "D9" in raw:
            start = raw.find("D9") + 2
            end = len(raw)
            for sep in ['^', '\x1c', '\x1e', '\n']:
                pos = raw.find(sep, start)
                if pos != -1 and pos < end:
                    end = pos
            amt_str = raw[start:end].strip()
            # Clean non-numeric except decimal
            numeric_val = "".join(c for c in amt_str if c.isdigit() or c == '.')
            charge_val = f"{float(numeric_val):.2f}" if numeric_val else "0.00"

        # Map to common services structure so a12.py can read it
        data["claim"]["services"].append({
            "proc_code": ndc_val, 
            "charge": charge_val,
            "units": "1"
        })
        data["claim"]["total_charge"] = charge_val
        
        return data
    
def main():
    if len(sys.argv) < 2:
        print("Usage: python3 edi-parser <filename>")
        return
    
    filepath = sys.argv[1]
    if not os.path.exists(filepath):
        print(f"File {filepath} not found.")
        return
        
    parser = HealthcareParser(filepath)
    print(json.dumps(parser.parse(), indent=4))

if __name__ == "__main__":
    main()