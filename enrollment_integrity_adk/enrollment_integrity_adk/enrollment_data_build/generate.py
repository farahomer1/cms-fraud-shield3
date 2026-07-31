"""
Serialize the canonical network (from synthetic_data.build_network — the SAME
function the agent's memory path uses) into CSVs for the three stores, plus the
source-document registry. This guarantees memory and the live stores hold
identical data.
"""
import csv, os
from synthetic_data import build_network

OUT = os.path.dirname(os.path.abspath(__file__))
for d in ("postgres", "spanner", "bigquery"):
    os.makedirs(os.path.join(OUT, d), exist_ok=True)

net = build_network()

def w(path, rows, fields):
    with open(os.path.join(OUT, path), "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=fields); wr.writeheader()
        for r in rows: wr.writerow(r)

w("postgres/addresses.csv",
  [{"address_id":a.id,"line":a.line,"city":a.city,"state":a.state,"zip":a.zip,"is_cmra":a.is_cmra} for a in net.addresses.values()],
  ["address_id","line","city","state","zip","is_cmra"])
w("postgres/registered_agents.csv",
  [{"agent_id":g.id,"name":g.name} for g in net.agents.values()],
  ["agent_id","name"])
w("postgres/entities.csv",
  [{"entity_id":e.id,"legal_name":e.legal_name,"entity_type":e.entity_type,"formed_date":e.formed_date,
    "status":e.status,"address_id":e.address_id,"agent_id":e.agent_id,
    "application_date":e.application_date or "","revoked_date":e.revoked_date or ""} for e in net.entities.values()],
  ["entity_id","legal_name","entity_type","formed_date","status","address_id","agent_id","application_date","revoked_date"])
w("postgres/ownerships.csv",
  [{"own_id":o.id,"entity_id":o.entity_id,"individual_id":o.individual_id,"pct":o.pct,"role":o.role,
    "start_date":o.start_date,"end_date":o.end_date or ""} for o in net.ownerships],
  ["own_id","entity_id","individual_id","pct","role","start_date","end_date"])
w("spanner/individuals.csv",
  [{"individual_id":i.id,"name":i.name,"ssn4":i.ssn4,"dob":i.dob,"on_leie":i.on_leie,
    "leie_reason":i.leie_reason or "","leie_date":i.leie_date or ""} for i in net.individuals.values()],
  ["individual_id","name","ssn4","dob","on_leie","leie_reason","leie_date"])

def building_key(a):
    return f"{a.line.split(' Ste ')[0].strip()}|{a.zip}"
w("bigquery/entities_denorm.csv",
  [{"entity_id":e.id,"legal_name":e.legal_name,"entity_type":e.entity_type,"status":e.status,
    "application_date":e.application_date or "","formed_date":e.formed_date,"address_id":e.address_id,
    "agent_id":e.agent_id,"building_key":building_key(net.addresses[e.address_id]),
    "is_cmra":net.addresses[e.address_id].is_cmra} for e in net.entities.values()],
  ["entity_id","legal_name","entity_type","status","application_date","formed_date","address_id","agent_id","building_key","is_cmra"])

GCS = "gs://noel-sandbox-02-enrollment-docs"
docs = [
  {"doc_id":"DOC-0001","record_id":"OWN-0030","entity_id":"ENT-COASTAL",
   "doc_type":"Ownership Disclosure Statement","title":"CMS-855S Ownership Disclosure — Coastal Medical Supply LLC",
   "gcs_uri":f"{GCS}/OWN-0030_ownership_disclosure.pdf"},
  {"doc_id":"DOC-0002","record_id":"OWN-0031","entity_id":"ENT-COASTAL",
   "doc_type":"Statement of Ownership Transfer","title":"Statement of Ownership Transfer — Coastal Medical Supply LLC",
   "gcs_uri":f"{GCS}/OWN-0031_ownership_transfer.pdf"},
  {"doc_id":"DOC-0003","record_id":"ENT-HARBOR","entity_id":"ENT-HARBOR",
   "doc_type":"Articles of Organization","title":"Articles of Organization — Harbor Health Devices LLC",
   "gcs_uri":f"{GCS}/ENT-HARBOR_articles.pdf"},
]
w("postgres/source_documents.csv", docs, ["doc_id","record_id","entity_id","doc_type","title","gcs_uri"])

print(f"entities {len(net.entities)} | individuals {len(net.individuals)} | ownerships {len(net.ownerships)} | docs {len(docs)}")
print("CSVs written.")
