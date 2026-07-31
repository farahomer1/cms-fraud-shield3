"""
Deterministic engine: entity resolution (tier 3) + motif detection (tier 4) +
scoring. This is the same verified logic as the standalone demo, refactored to
return JSON-serializable bundles so it can back ADK FunctionTools.

Keeping resolution/detection/scoring deterministic and OUTSIDE the LLM is the whole
point: the risk disposition and the findings are reproducible and citeable every
run. The LlmAgent only narrates over what this returns (tier 5).
"""

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import List

from .synthetic_data import Network
from .graph import (build_graph, building_key, entities_sharing_agent,
                    entities_in_building)


def _d(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()


SEVERITY_WEIGHT = {"CRITICAL": 100, "HIGH": 40, "MEDIUM": 15, "LOW": 5}
SEVERITY_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}


@dataclass
class Finding:
    rule: str
    severity: str
    statement: str
    citations: List[str] = field(default_factory=list)

    def to_dict(self):
        return {"rule": self.rule, "severity": self.severity,
                "statement": self.statement, "citations": self.citations}


# ----------------------------------------------------------------------------- 
class Resolver:
    """Tier 3. Resolve an applicant's owners (current + historical) to real
    identities and surface what else each identity touches."""

    def __init__(self, net: Network):
        self.net = net
        self.G, self.cluster_of, self.clusters = build_graph(net)

    def resolve(self, applicant_id: str):
        detail = {}
        current, historical = [], []
        for o in self.net.owners_of(applicant_id, include_historical=True):
            cid = self.cluster_of[o.individual_id]
            c = self.clusters[cid]
            info = detail.setdefault(cid, {
                "cluster_id": cid,
                "name": c["canonical_name"],
                "on_leie": c["on_leie"],
                "identity_evidence": [(a, b, why) for (a, b, why) in c["evidence"]],
                "leie_records": [m for m in c["members"] if self.net.individuals[m].on_leie],
                "owns_entities": [],
                "ownership_records": [],
            })
            info["ownership_records"].append(o)
            (current if o.end_date is None else historical).append(cid)

        for cid, info in detail.items():
            for member in self.clusters[cid]["members"]:
                for eid in self.net.entities_owned_by(member):
                    if eid != applicant_id and eid not in info["owns_entities"]:
                        info["owns_entities"].append(eid)
        return detail, current, historical


# ----------------------------------------------------------------------------- 
class Detector:
    """Tier 4. Pre-fraud motif checks over the resolved graph."""

    def __init__(self, net: Network, resolver: Resolver):
        self.net = net
        self.r = resolver

    def detect(self, applicant_id: str, detail: dict) -> List[Finding]:
        net = self.net
        app = net.entities[applicant_id]
        findings: List[Finding] = []

        # Rule 1 - resolves to an excluded (LEIE) individual through ownership.
        for cid, info in detail.items():
            if not info["on_leie"]:
                continue
            own_cites = [o.id for o in info["ownership_records"]]
            id_ev = [f"{a}+{b}" for (a, b, _w) in info["identity_evidence"]]
            findings.append(Finding(
                "resolves_to_excluded_individual", "CRITICAL",
                (f"A beneficial owner of record resolves to '{info['name']}', an "
                 f"individual on the LEIE exclusion list. The applicant's paperwork "
                 f"lists this person only in ownership history, but identifier-based "
                 f"resolution links the records to the same person."),
                info["leie_records"] + own_cites + id_ev,
            ))

        # Rule 2 - controlling ownership transferred to a new owner just before applying.
        applied = _d(app.application_date) if app.application_date else date(2026, 7, 13)
        current_ctrl = [o for o in net.owners_of(applicant_id, include_historical=False) if o.pct >= 50]
        prior_ctrl = [o for o in net.owners_of(applicant_id) if o.end_date is not None and o.pct >= 50]
        for o in current_ctrl:
            days = (applied - _d(o.start_date)).days
            if days <= 60 and prior_ctrl:
                findings.append(Finding(
                    "recent_ownership_transfer_to_new_owner", "HIGH",
                    (f"Controlling ownership ({o.pct:.0f}%) was transferred to the "
                     f"current owner {days} days before the enrollment application — a "
                     f"straw-owner pattern placing a clean name on top of a prior controller."),
                    [o.id] + [p.id for p in prior_ctrl],
                ))

        # Rule 3 - shares a registered agent with a revoked entity.
        agent_id = app.agent_id
        shared = entities_sharing_agent(net, agent_id, exclude=applicant_id)
        revoked_shared = [e for e in shared if e.status == "revoked"]
        if revoked_shared:
            findings.append(Finding(
                "shared_registered_agent_with_revoked_entity", "HIGH",
                (f"The applicant's registered agent ('{net.agents[agent_id].name}') is "
                 f"also the agent of record for {len(revoked_shared)} revoked entity(ies), "
                 f"and {len(shared)} enrolled/applying entities overall."),
                [agent_id] + [e.id for e in revoked_shared],
            ))

        # Rule 4 - clustered at a shared mail-drop (CMRA).
        addr = net.addresses[app.address_id]
        if addr.is_cmra:
            others = entities_in_building(net, app.address_id, exclude=applicant_id)
            recent = [e for e in others if (e.application_date or e.formed_date) >= "2025-01-01"]
            if others:
                findings.append(Finding(
                    "shared_mail_drop_cluster", "MEDIUM" if len(recent) < 2 else "HIGH",
                    (f"The business address is a commercial mail-receiving agency (suite "
                     f"in {building_key(addr).split('|')[0]}) shared by {len(others)} other "
                     f"supplier(s), {len(recent)} enrolled or applying since 2025."),
                    [addr.id] + [e.id for e in others],
                ))

        # Rule 5 - phoenix similarity to a specific revoked entity.
        for e in net.entities.values():
            if e.status != "revoked":
                continue
            shared_attrs = []
            if building_key(net.addresses[e.address_id]) == building_key(addr):
                shared_attrs.append(("address_building", e.address_id))
            if e.agent_id == agent_id:
                shared_attrs.append(("registered_agent", e.agent_id))
            e_owner_clusters = {self.r.cluster_of[o.individual_id] for o in net.owners_of(e.id)}
            if e_owner_clusters & set(detail.keys()):
                shared_attrs.append(("resolved_owner", e.id))
            if len(shared_attrs) >= 2:
                findings.append(Finding(
                    "phoenix_similarity_to_revoked_entity", "HIGH",
                    (f"The applicant matches revoked entity '{e.legal_name}' on "
                     f"{len(shared_attrs)} independent attributes "
                     f"({', '.join(a for a, _ in shared_attrs)}) — consistent with "
                     f"re-incorporation of a revoked operation under a new name."),
                    [e.id] + [c for _, c in shared_attrs],
                ))
        return findings


# ----------------------------------------------------------------------------- 
def score(findings: List[Finding]):
    total = sum(SEVERITY_WEIGHT[f.severity] for f in findings)
    if any(f.severity == "CRITICAL" for f in findings) or total >= 100:
        tier = "HIGH RISK"
    elif total >= 40:
        tier = "ELEVATED RISK"
    elif total > 0:
        tier = "LOW RISK"
    else:
        tier = "NO RISK SIGNALS"
    return min(total, 100), tier


def recommended_actions(tier: str):
    if tier == "HIGH RISK":
        return ["Elevate applicant from limited to HIGH screening tier",
                "Trigger fingerprint-based background check on all beneficial owners",
                "Conduct pre-enrollment site visit",
                "HOLD approval pending documentation and beneficial-ownership verification"]
    if tier == "ELEVATED RISK":
        return ["Elevate to MODERATE/HIGH screening tier",
                "Conduct pre-enrollment site visit",
                "Manual review of beneficial-ownership disclosures before approval"]
    if tier == "LOW RISK":
        return ["Proceed with standard screening; log signals for periodic revalidation"]
    return ["Proceed with standard screening"]


def screen(net: Network, applicant_id: str) -> dict:
    """Run the full deterministic pipeline and return a JSON-serializable bundle."""
    if applicant_id not in net.entities:
        return {"error": f"Unknown applicant '{applicant_id}'.",
                "known_applicants": list(net.entities.keys())}
    resolver = Resolver(net)
    detail, current, historical = resolver.resolve(applicant_id)
    detector = Detector(net, resolver)
    findings = sorted(detector.detect(applicant_id, detail),
                      key=lambda f: SEVERITY_ORDER[f.severity])
    total, tier = score(findings)
    app = net.entities[applicant_id]

    identities = []
    for cid, info in detail.items():
        identities.append({
            "name": info["name"],
            "on_leie": info["on_leie"],
            "identity_links": [{"records": [a, b], "basis": why}
                               for (a, b, why) in info["identity_evidence"]],
            "also_tied_to": [{"entity_id": eid, "status": net.entities[eid].status}
                             for eid in info["owns_entities"]],
        })

    return {
        "applicant": {
            "id": applicant_id, "legal_name": app.legal_name,
            "type": app.entity_type, "formed": app.formed_date,
            "application_date": app.application_date,
            "address": net.addresses[app.address_id].line,
            "registered_agent": net.agents[app.agent_id].name,
        },
        "risk_score": total,
        "risk_disposition": tier,
        "resolved_identities": identities,
        "findings": [f.to_dict() for f in findings],
        "recommended_actions": recommended_actions(tier),
        "governance": ("Recommendation only. A credentialed reviewer decides. No claim "
                       "paid; applicant is pre-approval. Not a denial."),
    }
