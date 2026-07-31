"""
ADK tools. Plain Python functions with typed signatures and docstrings; ADK
auto-wraps each into a FunctionTool and builds the schema from the annotations.

Resolution/detection/scoring run deterministically in the engine over data from
the configured source: 'memory' (self-contained fallback) or 'toolbox' (the three
real stores via the MCP Toolbox gateway). The LLM only narrates the result.
"""

import os

from .engine.synthetic_data import build_network
from .engine.detection import screen
from .engine.adversarial import run_probe

# 'memory' (demo-day fallback) or 'toolbox' (live three-store path).
_SOURCE = os.environ.get("ENROLLMENT_SOURCE", "memory").lower()

# In-memory network, built once. Used for list_applicants, and for screening when
# the source is 'memory'.
_NET = build_network()

# Probe fixtures are test records for the adversarial probe, not part of the
# screenable population — hidden from list_applicants.
_PROBE_PREFIX = "ENT-PROBE-"


def _network_for(applicant_id: str):
    if _SOURCE == "toolbox":
        from .engine.toolbox_source import build_network_from_toolbox
        return build_network_from_toolbox(applicant_id)
    return _NET


def _attach_source_documents(bundle: dict, applicant_id: str):
    """In toolbox mode, surface the source filing documents on record for the
    applicant, so the brief can cite provenance (grounded — from the registry)."""
    if _SOURCE != "toolbox":
        return bundle
    try:
        from .engine.toolbox_source import fetch_source_documents
        docs = fetch_source_documents(applicant_id)
        if docs:
            bundle["source_documents"] = docs
    except Exception:
        pass  # never let document lookup break a screen
    return bundle


def list_applicants() -> dict:
    """List the enrollment applicants and entities available to screen.

    Returns a mapping of entity id -> {legal_name, type, status} so the caller
    can pick an applicant id (for example 'ENT-COASTAL') to screen.
    """
    return {
        "source": _SOURCE,
        "entities": [
            {"id": e.id, "legal_name": e.legal_name, "type": e.entity_type,
             "status": e.status}
            for e in _NET.entities.values()
            if not e.id.startswith(_PROBE_PREFIX)
        ],
    }


def screen_applicant(applicant_id: str) -> dict:
    """Screen a single enrollment applicant for pre-fraud signatures BEFORE approval.

    Runs deterministic entity resolution over the certification network (fusing
    enrollment, exclusion-list, corporate and registered-agent records), then runs
    pre-fraud motif detection, then scores risk. Every finding cites the specific
    source records it rests on. In live mode, also surfaces the source filing
    documents on record for the applicant.

    Args:
        applicant_id: The entity id of the applicant to screen, e.g. 'ENT-COASTAL'.
            Use list_applicants to discover valid ids.

    Returns:
        A structured bundle with: the applicant summary, risk_score, risk_disposition
        (HIGH RISK / ELEVATED RISK / LOW RISK / NO RISK SIGNALS), resolved_identities,
        ranked findings (each with a severity and source-record citations),
        recommended_actions mapped to existing CMS levers, an optional
        source_documents list (title + GCS location of the filings behind the
        records), and a governance note. This is a triage recommendation for a
        credentialed reviewer, not a decision or denial.
    """
    bundle = screen(_network_for(applicant_id), applicant_id)
    return _attach_source_documents(bundle, applicant_id)


def run_adversarial_probe() -> dict:
    """Run the adversarial purple-team probe against the enrollment front door.

    Screens four pre-loaded evasion-variant records (the same excluded operator,
    re-tooled one notch further each) through the same data source as live
    screening, to find where the screening logic would let a plausible bad actor
    through.

    Returns:
        A hardening report: per-scenario results (which evasion tactics are still
        caught and which would pass), and a ranked hardening_finding describing the
        seam and how to close it. The deliverable is a hardening report on the
        enrollment process, not an exploit.
    """
    return run_probe(lambda eid: screen(_network_for(eid), eid))
