"""
The adversarial purple-team probe.

Rather than mutating data at runtime, the four evasion tactics are pre-loaded as
live records in the stores (ENT-PROBE-V1..V4) — the same excluded operator,
re-tooled one notch further each time. The probe screens them through whatever
source is configured (memory or the live Toolbox/three-store path), so the
hardening report is produced from real reads, not an in-memory sandbox.

  V1  new LLC + straw owner, history intact        -> HIGH RISK (excluded resolves)
  V2  + scrub ownership history                    -> HIGH RISK (shared agent + phoenix)
  V3  + new registered agent                       -> ELEVATED (mail-drop cluster)
  V4  + new address (leave the mail drop)          -> NO RISK SIGNALS (the seam)
"""

SCENARIOS = [
    ("ENT-PROBE-V1", "V1  new LLC + straw owner, history intact"),
    ("ENT-PROBE-V2", "V2  + scrub ownership history"),
    ("ENT-PROBE-V3", "V3  + new registered agent"),
    ("ENT-PROBE-V4", "V4  + new address (leave the mail drop)"),
]


def run_probe(screen_fn) -> dict:
    """Screen the four pre-loaded probe fixtures and assemble the hardening report.

    screen_fn(entity_id) -> bundle dict. Injected so the probe uses the same data
    source (memory or Toolbox) as everything else.
    """
    rows, first_gap = [], None
    for eid, label in SCENARIOS:
        b = screen_fn(eid)
        findings = b.get("findings", [])
        caught = b.get("risk_disposition") in ("HIGH RISK", "ELEVATED RISK")
        top = findings[0]["rule"] if findings else "no signals remain"
        rows.append({"tactic": label, "entity_id": eid,
                     "disposition": b.get("risk_disposition"), "caught": caught,
                     "top_signal": top, "signal_count": len(findings)})
        if not caught and first_gap is None:
            first_gap = label

    if first_gap:
        hardening = (
            f"The front door holds through partial re-tooling but the seam opens at "
            f"'{first_gap.strip()}': once the operator scrubs ownership history AND "
            f"changes registered agent AND address, no structural signal ties the new "
            f"LLC to the revoked operation. Close it with (1) mandatory beneficial-"
            f"ownership identifier verification (fingerprint / SSN cross-check) for "
            f"high-risk categories, and (2) address-history cross-referencing against "
            f"revoked-entity addresses even when the current agent and owner differ.")
    else:
        hardening = "All modeled evasion paths were caught by existing signals."

    return {"scenarios": rows, "hardening_finding": hardening,
            "note": "Probe fixtures screened live from the configured source. "
                    "Deliverable is a hardening report, not an exploit."}
