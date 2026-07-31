"""
Verify the Toolbox-fed source produces the same dispositions as the in-memory
engine. Run this AFTER redeploying the Toolbox with the updated tools.yaml and
setting ENROLLMENT_SOURCE=toolbox.

    export ENROLLMENT_SOURCE=toolbox
    python test_toolbox_source.py

It fetches each applicant's neighborhood from the three stores through the MCP
Toolbox gateway, runs the deterministic engine, and checks the risk disposition
matches what the in-memory data produced.
"""

import os

os.environ.setdefault("ENROLLMENT_SOURCE", "toolbox")

from enrollment_agent.engine.toolbox_source import build_network_from_toolbox
from enrollment_agent.engine.detection import screen

EXPECTED = [
    ("ENT-COASTAL", "HIGH RISK", "flagship phoenix (history hop)"),
    ("ENT-REDOAK", "HIGH RISK", "obvious: excluded current owner"),
    ("ENT-MARSHVIEW", "ELEVATED RISK", "stealth: cluster-only"),
    ("ENT-TIDEWATER", "HIGH RISK", "cluster-mate"),
    ("ENT-BEACON", "NO RISK SIGNALS", "near-miss: clean"),
    ("ENT-CLEARPATH", "NO RISK SIGNALS", "near-miss: shared clean agent"),
    ("ENT-NORTHSTAR", "NO RISK SIGNALS", "near-miss: same-name decoy"),
]


def main():
    print(f"Source: TOOLBOX  ->  {os.environ['ENROLLMENT_SOURCE']}\n")
    print(f"{'entity':<16}{'expected':<18}{'GOT':<18}{'ok':<5}{'what'}")
    print("-" * 90)
    all_ok = True
    for eid, expected, what in EXPECTED:
        try:
            net = build_network_from_toolbox(eid)
            b = screen(net, eid)
            got = b["risk_disposition"]
            ok = got == expected
        except Exception as e:
            got, ok = f"ERROR: {type(e).__name__}", False
        all_ok = all_ok and ok
        print(f"{eid:<16}{expected:<18}{got:<18}{'OK' if ok else 'XXX':<5}{what}")

    # Spotlight: confirm the flagship resolves the excluded operator through the hop
    print()
    net = build_network_from_toolbox("ENT-COASTAL")
    b = screen(net, "ENT-COASTAL")
    excluded = any(i["on_leie"] for i in b["resolved_identities"])
    print(f"COASTAL excluded owner resolved via Toolbox: {excluded}")
    print(f"COASTAL findings: {[f['severity'] for f in b['findings']]}")
    print(f"\n{'ALL MATCH — Toolbox source verified.' if all_ok else 'MISMATCH — see rows above.'}")


if __name__ == "__main__":
    main()
