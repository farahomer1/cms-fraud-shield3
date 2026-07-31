"""
Tier 1-3 over the real stores: build the scoped applicant neighborhood by
fetching from the three fragmented sources through the MCP Toolbox gateway, and
assemble the same record objects the deterministic engine already consumes.

The engine (resolution, detection, scoring) is untouched — this only replaces the
data source. Fetch is scoped to the applicant's neighborhood, which mirrors the
real production access pattern and keeps it fast:

  1. applicant + its address, agent, ownerships, and owner identities  (Postgres)
  2. resolve each owner by ssn4+dob -> all sharing identities            (Spanner)
  3. entities owned by those resolved identities  (brings in the revoked twin)
  4. entities sharing the applicant's agent  (revoked -> full; else stub)
  5. entities in the applicant's building     (mail-drop cluster)        (BigQuery)

The LLM never sees these tools. They are called here, deterministically.
"""

import json
import os
import subprocess
import time

from toolbox_core import ToolboxSyncClient

from .synthetic_data import (Network, Individual, Address, RegisteredAgent,
                             Entity, Ownership)

TOOLBOX_URL = os.environ.get(
    "TOOLBOX_URL",
    "https://mcp-toolbox-enrollment-219494121991.us-central1.run.app",
)
TOOLSET = "enrollment-integrity"

_STUB_ADDR = "ADDR-STUB"


# -----------------------------------------------------------------------------
# Auth + client
# -----------------------------------------------------------------------------
_cached_token = None
_token_ts = 0.0

# ID tokens last ~1h. Refresh before that so a long-lived Agent Engine container
# never presents an expired token (symptom: Cloud Run 401 "access token could
# not be verified" on every Toolbox call once the process outlives the token).
_TOKEN_MAX_AGE_S = 3000  # 50 minutes


def _id_token() -> str:
    """ID token for the Cloud Run audience, cached per process and refreshed
    before expiry (the gcloud shell-out is slow, so fetching per-request made
    every Toolbox call ~25s; but caching forever breaks in long-lived
    containers, so we re-mint after _TOKEN_MAX_AGE_S).
    Works via service-account when deployed (Agent Engine), falls back to gcloud
    for local runs. The Authorization header is a lambda evaluated per request,
    so refreshed tokens are picked up automatically."""
    global _cached_token, _token_ts
    if _cached_token and (time.time() - _token_ts) < _TOKEN_MAX_AGE_S:
        return _cached_token
    try:
        import google.oauth2.id_token
        import google.auth.transport.requests
        _cached_token = google.oauth2.id_token.fetch_id_token(
            google.auth.transport.requests.Request(), TOOLBOX_URL)
    except Exception:
        _cached_token = subprocess.check_output(
            ["gcloud", "auth", "print-identity-token"]).decode().strip()
    _token_ts = time.time()
    return _cached_token


_client = None
_tools = {}


def _get_tools():
    global _client, _tools
    if not _tools:
        _client = ToolboxSyncClient(
            TOOLBOX_URL,
            client_headers={"Authorization": lambda: f"Bearer {_id_token()}"},
        )
        for t in _client.load_toolset(TOOLSET):
            _tools[t.__name__] = t
    return _tools


def _call(name, **kwargs):
    tools = _get_tools()
    result = tools[name](**kwargs)
    if isinstance(result, list):
        rows = result
    elif isinstance(result, dict):
        rows = [result]
    else:
        s = (result or "").strip()
        if not s:
            return []
        try:
            parsed = json.loads(s)
            rows = parsed if isinstance(parsed, list) else [parsed]
        except (json.JSONDecodeError, ValueError):
            return []
    # Drop any null/non-dict rows the store may return (e.g. an exclusion-only
    # individual that owns no entity).
    return [r for r in rows if isinstance(r, dict)]


def _b(v):
    return v in (True, "true", "True", "t", 1, "1")


# -----------------------------------------------------------------------------
# Build the scoped network
# -----------------------------------------------------------------------------
def build_network_from_toolbox(applicant_id: str) -> Network:
    net = Network()
    net.addresses[_STUB_ADDR] = Address(_STUB_ADDR, "UNKNOWN", "", "", "00000", False)

    def add_entity(r, address_id=None):
        net.entities[r["entity_id"]] = Entity(
            r["entity_id"], r.get("legal_name", r["entity_id"]),
            r.get("entity_type", ""), r.get("formed_date", ""),
            r.get("status", ""), address_id or r.get("address_id", _STUB_ADDR),
            r.get("agent_id", _STUB_ADDR),
            r.get("application_date") or None, r.get("revoked_date") or None)

    def add_addr(r):
        net.addresses[r["address_id"]] = Address(
            r["address_id"], r["line"], r["city"], r["state"], r["zip"], _b(r["is_cmra"]))

    def add_agent(r):
        net.agents[r["agent_id"]] = RegisteredAgent(r["agent_id"], r["name"])

    def add_ind(r):
        net.individuals[r["individual_id"]] = Individual(
            r["individual_id"], r["name"], r["ssn4"], r["dob"], _b(r["on_leie"]),
            r.get("leie_reason") or None, r.get("leie_date") or None)

    def add_own(r):
        net.ownerships.append(Ownership(
            r["own_id"], r["entity_id"], r["individual_id"], float(r["pct"]),
            r["role"], r["start_date"], r.get("end_date") or None))

    def load_full(eid):
        if eid in net.entities and net.entities[eid].address_id != _STUB_ADDR:
            return
        rows = _call("get-entity", entity_id=eid)
        if not rows:
            return
        e = rows[0]
        add_entity(e)
        a = _call("get-address", address_id=e["address_id"])
        if a:
            add_addr(a[0])
        g = _call("get-agent", agent_id=e["agent_id"])
        if g:
            add_agent(g[0])
        for o in _call("get-ownership-for-entity", entity_id=eid):
            add_own(o)
            ind = _call("get-individual", individual_id=o["individual_id"])
            if ind:
                add_ind(ind[0])

    def load_stub(r):
        if r["entity_id"] not in net.entities:
            add_entity(r, address_id=_STUB_ADDR)  # counts for shared-agent rule

    # 1. applicant (full)
    load_full(applicant_id)
    if applicant_id not in net.entities:
        return net
    app = net.entities[applicant_id]

    # 2. resolve each applicant owner by identifier -> all sharing identities
    resolved = set()
    for o in [o for o in net.ownerships if o.entity_id == applicant_id]:
        ind = net.individuals.get(o.individual_id)
        if not ind:
            continue
        for r in _call("resolve-identity-by-key", ssn4=ind.ssn4, dob=ind.dob):
            add_ind(r)
            resolved.add(r["individual_id"])

    # 3. entities owned by resolved identities (brings in the revoked twin)
    for iid in list(resolved):
        for r in _call("entities-by-owner", individual_id=iid):
            if r and r.get("entity_id"):
                load_full(r["entity_id"])

    # 4. entities sharing the applicant's agent (revoked -> full; else stub)
    for r in _call("entities-by-agent", agent_id=app.agent_id):
        if r["entity_id"] == applicant_id:
            continue
        if str(r.get("status")) == "revoked":
            load_full(r["entity_id"])
        else:
            load_stub(r)

    # 5. entities in the applicant's building (mail-drop cluster)
    den = _call("get-entity-denorm", entity_id=applicant_id)
    if den and _b(den[0].get("is_cmra")):
        bkey = den[0]["building_key"]
        for r in _call("entities-in-building", building_key=bkey):
            if r["entity_id"] != applicant_id:
                load_full(r["entity_id"])

    return net


def fetch_source_documents(applicant_id: str) -> list:
    """Fetch the source filing documents on record for an applicant (title, type,
    GCS location). Grounded provenance for the brief — from the document registry,
    not invented."""
    docs = _call("get-source-document", entity_id=applicant_id)
    return [
        {"title": d.get("title"), "doc_type": d.get("doc_type"),
         "record_id": d.get("record_id"), "gcs_uri": d.get("gcs_uri")}
        for d in docs if d.get("gcs_uri")
    ]