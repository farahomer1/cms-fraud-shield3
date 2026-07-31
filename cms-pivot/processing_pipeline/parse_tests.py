# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import re
import os

def parse_and_create_files(input_path):
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    with open(input_path, 'r') as f:
        content = f.read()

    # Pattern captures filename and stops before the next filename
    pattern = r'(TC-[A-Z]-\d{3}\.(?:edi|ncpdp))[^\n]*\n(.*?)(?=\nTC-[A-Z]-\d{3}\.|$)'
    matches = re.finditer(pattern, content, re.DOTALL)

    files_created = 0

    for match in matches:
        filename = match.group(1).strip()
        raw_lines = match.group(2).strip().split('\n')

        if filename.endswith('.edi'):
            processed_lines = []
            for line in raw_lines:
                clean_line = line.strip()
                if not clean_line:
                    continue
                
                # FIX: If this is an ISA segment, pad it to 106 chars
                if clean_line.startswith('ISA'):
                    # The terminator (~) must be at index 105
                    # We take the content, remove the existing terminator, 
                    # pad with spaces to 105, then add the terminator back.
                    base_isa = clean_line.replace('~', '')
                    clean_line = base_isa.ljust(105) + '~'
                
                processed_lines.append(clean_line)
            
            final_data = "".join(processed_lines)
        else:
            final_data = "\n".join([line.strip() for line in raw_lines if line.strip()])

        with open(filename, 'w', encoding='utf-8') as f:
            f.write(final_data)
        
        print(f"Created {filename} - Length: {len(final_data)}")
        files_created += 1

if __name__ == "__main__":
    parse_and_create_files('tests.txt')