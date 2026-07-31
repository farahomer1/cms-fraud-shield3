"""
Tier 2 - Ingestion & extraction  (thin here; real build parses messy filings)
Tier 3 - Entity-resolution graph  (THE ASSET)

This module fuses the synthetic source records into one graph and does the work
that actually matters: deciding that two owner records with different names are the
same human, so a fresh LLC still resolves to a prior excluded identity.

The join key is the strong identifier (ssn4 + dob), with name similarity carried
alongside as corroboration -- that mirrors real record-linkage, where you lead with
identifiers and use fuzzy name match to support, not to decide.

Not RAG. This is record linkage + graph construction. The precision/recall of THIS
tier is what determines whether the phoenix walks through. A missed link approves a
fraudster; a false link flags a legitimate applicant. Neither is a retrieval problem.
"""

import difflib
import networkx as nx

from .synthetic_data import Network


# ----------------------------------------------------------------------------- 
# Identity resolution (union-find over individual records)
# -----------------------------------------------------------------------------
class _UnionFind:
    def __init__(self, ids):
        self.parent = {i: i for i in ids}

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[rb] = ra


def name_similarity(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, a.lower(), b.lower()).ratio()


def resolve_identities(net: Network):
    """
    Cluster individual records into real-person identities.

    Returns:
      cluster_of: {individual_id -> cluster_id}
      clusters:   {cluster_id -> {"members":[ids], "canonical_name":str,
                                   "evidence":[(id_a, id_b, why)] }}
    """
    ids = list(net.individuals.keys())
    uf = _UnionFind(ids)
    evidence = []

    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            a, b = net.individuals[ids[i]], net.individuals[ids[j]]
            # Strong join: shared last-4 + DOB is treated as the same identity.
            if a.ssn4 == b.ssn4 and a.dob == b.dob:
                uf.union(a.id, b.id)
                sim = name_similarity(a.name, b.name)
                why = (f"shared identifier (ssn4={a.ssn4}, dob={a.dob}); "
                       f"name match {sim:.0%} ('{a.name}' vs '{b.name}')")
                evidence.append((a.id, b.id, why))

    clusters = {}
    cluster_of = {}
    for iid in ids:
        root = uf.find(iid)
        cluster_of[iid] = root
        clusters.setdefault(root, {"members": [], "canonical_name": None, "evidence": []})
        clusters[root]["members"].append(iid)

    for (a, b, why) in evidence:
        clusters[uf.find(a)]["evidence"].append((a, b, why))

    # Canonical name = longest member name (usually the fullest/legal form).
    for root, c in clusters.items():
        c["canonical_name"] = max((net.individuals[m].name for m in c["members"]), key=len)
        c["on_leie"] = any(net.individuals[m].on_leie for m in c["members"])

    return cluster_of, clusters


# ----------------------------------------------------------------------------- 
# Graph construction
# -----------------------------------------------------------------------------
def build_graph(net: Network):
    """
    Build a heterogeneous graph over entities, identities, addresses and agents.
    Returns (G, cluster_of, clusters).
    """
    cluster_of, clusters = resolve_identities(net)
    G = nx.MultiDiGraph()

    # Identity nodes (resolved people, not raw records)
    for cid, c in clusters.items():
        G.add_node(cid, kind="identity", name=c["canonical_name"],
                   on_leie=c["on_leie"], members=c["members"])

    # Address + agent nodes
    for a in net.addresses.values():
        G.add_node(a.id, kind="address", label=a.line, zip=a.zip, is_cmra=a.is_cmra)
    for ag in net.agents.values():
        G.add_node(ag.id, kind="agent", label=ag.name)

    # Entity nodes + structural edges
    for e in net.entities.values():
        G.add_node(e.id, kind="entity", label=e.legal_name, status=e.status,
                   etype=e.entity_type, formed=e.formed_date,
                   applied=e.application_date, revoked=e.revoked_date)
        G.add_edge(e.id, e.address_id, rel="located_at")
        G.add_edge(e.id, e.agent_id, rel="uses_agent")

    # Ownership edges resolve the individual to its identity cluster
    for o in net.ownerships:
        cid = cluster_of[o.individual_id]
        G.add_edge(cid, o.entity_id, rel="owns", own_id=o.id, pct=o.pct,
                   role=o.role, start=o.start_date, end=o.end_date,
                   raw_individual=o.individual_id)

    return G, cluster_of, clusters


# ----------------------------------------------------------------------------- 
# Query helpers used by the detection tier
# -----------------------------------------------------------------------------
def building_key(address) -> str:
    """Group suites within the same physical building (mail-drop cluster)."""
    base = address.line.split(" Ste ")[0].strip()
    return f"{base}|{address.zip}"


def entities_sharing_agent(net: Network, agent_id: str, exclude: str):
    return [e for e in net.entities.values() if e.agent_id == agent_id and e.id != exclude]


def entities_in_building(net: Network, address_id: str, exclude: str):
    target = building_key(net.addresses[address_id])
    out = []
    for e in net.entities.values():
        if e.id == exclude:
            continue
        if building_key(net.addresses[e.address_id]) == target:
            out.append(e)
    return out
