import csv
from synthetic_data import Network, Individual, Address, RegisteredAgent, Entity, Ownership
from detection import screen

def load():
    n = Network()
    for r in csv.DictReader(open("spanner/individuals.csv")):
        n.individuals[r["individual_id"]] = Individual(
            r["individual_id"], r["name"], r["ssn4"], r["dob"],
            r["on_leie"]=="True", r["leie_reason"] or None, r["leie_date"] or None)
    for r in csv.DictReader(open("postgres/addresses.csv")):
        n.addresses[r["address_id"]] = Address(
            r["address_id"], r["line"], r["city"], r["state"], r["zip"], r["is_cmra"]=="True")
    for r in csv.DictReader(open("postgres/registered_agents.csv")):
        n.agents[r["agent_id"]] = RegisteredAgent(r["agent_id"], r["name"])
    for r in csv.DictReader(open("postgres/entities.csv")):
        n.entities[r["entity_id"]] = Entity(
            r["entity_id"], r["legal_name"], r["entity_type"], r["formed_date"],
            r["status"], r["address_id"], r["agent_id"],
            r["application_date"] or None, r["revoked_date"] or None)
    for r in csv.DictReader(open("postgres/ownerships.csv")):
        n.ownerships.append(Ownership(
            r["own_id"], r["entity_id"], r["individual_id"], float(r["pct"]),
            r["role"], r["start_date"], r["end_date"] or None))
    return n

net = load()
cases = [
  ("ENT-COASTAL","phoenix#1 flagship (history hop)","HIGH RISK"),
  ("ENT-REDOAK","phoenix#2 obvious (current excluded)","HIGH RISK"),
  ("ENT-MARSHVIEW","phoenix#3 stealth (cluster only)","flag>0"),
  ("ENT-TIDEWATER","cluster-mate","flag>0"),
  ("ENT-BEACON","near-miss: clean @ CMRA","NO RISK SIGNALS"),
  ("ENT-CLEARPATH","near-miss: shared clean agent","NO RISK SIGNALS"),
  ("ENT-NORTHSTAR","near-miss: same-name decoy","NO RISK SIGNALS"),
]
print(f"{'entity':<16}{'what':<38}{'expected':<18}{'GOT':<16}{'ok'}")
print("-"*100)
for eid, what, exp in cases:
    b = screen(net, eid)
    disp = b["risk_disposition"]; score=b["risk_score"]
    if exp=="flag>0": ok = score>0 and "excluded" not in [f["rule"] for f in b["findings"]] or score>0
    elif exp=="NO RISK SIGNALS": ok = disp=="NO RISK SIGNALS"
    else: ok = disp==exp
    print(f"{eid:<16}{what:<38}{exp:<18}{disp+' ('+str(score)+')':<16}{'OK' if ok else 'XXX'}")

# extra: confirm decoy did NOT resolve to excluded
b = screen(net,"ENT-NORTHSTAR")
print("\nNorthstar findings:", [f['rule'] for f in b['findings']] or "none (correct: same name, different id)")
b = screen(net,"ENT-COASTAL")
print("Coastal excluded resolved:", any(i['on_leie'] for i in b['resolved_identities']),
      "| findings:", [f['severity'] for f in b['findings']])
