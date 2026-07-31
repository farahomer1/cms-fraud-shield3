"""
Tier 1 - Source systems (synthetic).

A small, fully synthetic enrollment network standing in for the real fragmented
sources a production build would fuse: PECOS enrollment records, the NPI registry,
the LEIE exclusion list, SAM, and state corporate / registered-agent filings.

Nothing here is real. Every SSN fragment, DOB, and address is invented. The network
is deliberately seeded with:
  - clean, legitimate providers (so the agent does NOT flag everything -> no
    false-positive theater), and
  - one planted "phoenix" applicant that resolves back to a previously excluded
    individual through an ownership-history hop the current paperwork hides.

Record IDs are stable and human-readable (LEIE-*, ENT-*, OWN-*, ADDR-*, AGT-*, IND-*)
so the narrative layer can cite specific source records, the way a reviewer-facing
brief must.
"""

from dataclasses import dataclass, field
from datetime import date
from typing import Optional


# ----------------------------------------------------------------------------- 
# Record types
# -----------------------------------------------------------------------------
@dataclass
class Individual:
    id: str
    name: str
    ssn4: str            # last-4 stand-in identifier
    dob: str             # YYYY-MM-DD
    on_leie: bool = False
    leie_reason: Optional[str] = None
    leie_date: Optional[str] = None


@dataclass
class Address:
    id: str
    line: str
    city: str
    state: str
    zip: str
    is_cmra: bool = False   # commercial mail-receiving agency / mail drop


@dataclass
class RegisteredAgent:
    id: str
    name: str


@dataclass
class Entity:
    id: str
    legal_name: str
    entity_type: str            # e.g. "DME supplier", "Family practice"
    formed_date: str
    status: str                 # "enrolled" | "revoked" | "applying"
    address_id: str
    agent_id: str
    application_date: Optional[str] = None
    revoked_date: Optional[str] = None


@dataclass
class Ownership:
    id: str
    entity_id: str
    individual_id: str
    pct: float
    role: str                   # "beneficial owner", "managing owner"
    start_date: str
    end_date: Optional[str] = None   # None -> current; set -> historical


@dataclass
class Network:
    individuals: dict = field(default_factory=dict)
    addresses: dict = field(default_factory=dict)
    agents: dict = field(default_factory=dict)
    entities: dict = field(default_factory=dict)
    ownerships: list = field(default_factory=list)

    def leie(self):
        return [i for i in self.individuals.values() if i.on_leie]

    def owners_of(self, entity_id, include_historical=True):
        out = []
        for o in self.ownerships:
            if o.entity_id != entity_id:
                continue
            if o.end_date is not None and not include_historical:
                continue
            out.append(o)
        return out

    def entities_owned_by(self, individual_id):
        return [o.entity_id for o in self.ownerships if o.individual_id == individual_id]


# ----------------------------------------------------------------------------- 
# The synthetic world
# -----------------------------------------------------------------------------

def build_network() -> Network:
    """Deterministic rich population (~293 entities) matching what is loaded into
    the three stores, including the four probe fixtures. Memory and Toolbox sources
    therefore screen identical data."""
    import random
    random.seed(4471)
    n = Network()
    _ssn_seen = set()

    FIRST = ["Alan","Maria","Grace","Leon","Nadia","Omar","Priya","Sean","Tara","Wes",
             "Ivy","Carl","Dana","Ruth","Neil","Gina","Paul","Lena","Hugo","Mira","Dean",
             "Rosa","Kurt","Faye","Jon","Amal","Nora","Beau","Cleo","Rex","Lila","Sam",
             "Vera","Otis","Della"]
    LAST = ["Reyes","Osei","Hart","Drake","Voss","Nolan","Pike","Ames","Boyd","Cross",
            "Frost","Gale","Hune","Kerr","Lund","Marsh","Ordway","Pratt","Quill","Roth",
            "Sable","Thorpe","Udall","Vance","Ward","York","Zane","Ablett","Benoit",
            "Calder","Dunmore"]
    CITY_ST = [("Atlanta","GA","30309"),("Savannah","GA","31401"),("Macon","GA","31201"),
               ("Athens","GA","30601"),("Augusta","GA","30901"),("Columbus","GA","31901"),
               ("Marietta","GA","30060"),("Decatur","GA","30030"),("Duluth","GA","30096"),
               ("Roswell","GA","30075")]
    STREETS = ["Peachtree St","Main St","Oak Ave","Lakeview Dr","Elm St","Riverside Dr",
               "Highland Ave","Sycamore Ln","Baxter St","Whitlock Ave","Ponce De Leon Ave",
               "Clairmont Rd"]
    ETYPES = ["Family practice","Home health","Radiology","DME supplier",
              "Physical therapy","Cardiology","Behavioral health","Lab services"]
    AGENT_NAMES = ["Reyes & Associates PC","Coastal Georgia Legal LLC",
                   "Mountain Compliance Group","Peach State Filings LLC",
                   "Savannah Corporate Services","Metro Registered Agents Inc",
                   "Piedmont Legal Partners","Southern Filings Group"]

    from datetime import date as _date, timedelta as _td
    def rand_date(sy, ey):
        s = _date(sy,1,1); e = _date(ey,12,28)
        return s + _td(days=random.randint(0,(e-s).days))
    def uniq_ssn4():
        while True:
            v = f"{random.randint(0,9999):04d}"
            if v not in _ssn_seen:
                _ssn_seen.add(v); return v
    def ind(iid, name=None, ssn4=None, dob=None, leie=False, reason=None, ldate=None):
        o = Individual(iid, name or f"{random.choice(FIRST)} {random.choice(LAST)}",
                       ssn4 or uniq_ssn4(), dob or rand_date(1955,1995).isoformat(),
                       leie, reason, ldate)
        n.individuals[iid]=o; return o
    def addr(aid, cs=None, cmra=False, line=None):
        c = cs or random.choice(CITY_ST)
        n.addresses[aid]=Address(aid, line or f"{random.randint(10,9990)} {random.choice(STREETS)}",
                                 c[0],c[1],c[2],cmra); return aid
    def agent(gid,name): n.agents[gid]=RegisteredAgent(gid,name); return gid
    def ent(eid,name,et,formed,status,a,g,applied=None,revoked=None):
        n.entities[eid]=Entity(eid,name,et,formed,status,a,g,applied,revoked)
    _oid=[1000]
    def own(eid,iid,pct,role,start,end=None):
        _oid[0]+=1
        n.ownerships.append(Ownership(f"OWN-{_oid[0]}",eid,iid,pct,role,start,end))
    def own_id(oid,eid,iid,pct,role,start,end=None):
        n.ownerships.append(Ownership(oid,eid,iid,pct,role,start,end))

    for i,nm in enumerate(AGENT_NAMES): agent(f"AGT-{i:03d}",nm)
    agent("AGT-SENTINEL","Sentinel Agents LLC")

    cmra_suites={}
    for suite in (200,214,231,245,260):
        aid=f"ADDR-4471-{suite}"
        addr(aid,("Duluth","GA","30096"),True,f"4471 Peachtree Industrial Blvd Ste {suite}")
        cmra_suites[suite]=aid

    clean_agents=[a for a in n.agents if a!="AGT-SENTINEL"]
    for i in range(280):
        eid=f"ENT-{i:04d}"; aid=f"ADDR-C{i:04d}"; addr(aid)
        et=random.choice(ETYPES); formed=rand_date(2008,2023).isoformat()
        r=random.random(); status="enrolled" if r<0.88 else "applying"
        applied=rand_date(2024,2026).isoformat() if status=="applying" else None
        ent(eid,f"{random.choice(LAST)} {et.split()[0]} {random.choice(['LLC','Inc','PC','Group'])}",
            et,formed,status,aid,random.choice(clean_agents),applied,None)
        o=ind(f"IND-C{i:04d}"); own(eid,o.id,100.0,"managing owner",formed)

    malen_ssn=uniq_ssn4(); malen_dob="1971-03-02"
    ind("IND-MALEN-LEIE","Victor A. Malen",malen_ssn,malen_dob,True,
        "Conviction - health care fraud (DME)","2023-09-14")
    ind("IND-MALEN-HARBOR","Victor A. Malen",malen_ssn,malen_dob)
    ind("IND-MALEN-COASTAL","Vic Malen",malen_ssn,malen_dob)
    ind("IND-KLINE","Deborah Kline")
    ent("ENT-HARBOR","Harbor Health Devices LLC","DME supplier","2021-02-11","revoked",
        cmra_suites[200],"AGT-SENTINEL",None,"2024-01-30")
    own_id("OWN-0010","ENT-HARBOR","IND-MALEN-HARBOR",100.0,"managing owner","2021-02-11","2024-01-30")
    ent("ENT-COASTAL","Coastal Medical Supply LLC","DME supplier","2026-05-28","applying",
        cmra_suites[214],"AGT-SENTINEL","2026-07-08",None)
    own_id("OWN-0030","ENT-COASTAL","IND-MALEN-COASTAL",75.0,"managing owner","2026-05-28","2026-05-28")
    own_id("OWN-0031","ENT-COASTAL","IND-KLINE",75.0,"managing owner","2026-05-28")
    ent("ENT-TIDEWATER","Tidewater DME LLC","DME supplier","2025-11-05","enrolled",
        cmra_suites[231],"AGT-SENTINEL","2025-11-20",None)
    own("ENT-TIDEWATER",ind("IND-DRAKE","Leon Drake").id,100.0,"beneficial owner","2025-11-05")
    ent("ENT-GULFSTREAM","Gulfstream Medical LLC","DME supplier","2026-01-08","applying",
        cmra_suites[200],"AGT-SENTINEL","2026-05-30",None)
    own("ENT-GULFSTREAM",ind("IND-VOSS","Nadia Voss").id,100.0,"beneficial owner","2026-01-08")

    pyne=uniq_ssn4()
    ind("IND-PYNE-LEIE","Gregory Pyne",pyne,"1966-08-19",True,"Exclusion - false claims","2022-06-01")
    ind("IND-PYNE-CUR","Gregory Pyne",pyne,"1966-08-19")
    ent("ENT-REDOAK","Red Oak Home Health LLC","Home health","2026-03-01","applying",
        addr("ADDR-REDOAK"),random.choice(clean_agents),"2026-06-20",None)
    own("ENT-REDOAK","IND-PYNE-CUR",100.0,"managing owner","2026-03-01")

    ent("ENT-MARSHVIEW","Marshview Supply Co","DME supplier","2026-04-15","applying",
        cmra_suites[245],random.choice(clean_agents),"2026-06-10",None)
    own("ENT-MARSHVIEW",ind("IND-MARSH","Della Marsh").id,100.0,"managing owner","2026-04-15")

    ent("ENT-BEACON","Beacon Family Clinic","Family practice","2011-05-02","enrolled",
        addr("ADDR-BEACON"),random.choice(clean_agents))
    own("ENT-BEACON",ind("IND-BEACON","Ruth Ames").id,100.0,"managing owner","2011-05-02")
    ent("ENT-CLEARPATH","Clearpath Radiology","Radiology","2014-09-14","enrolled",
        addr("ADDR-CLEARPATH"),"AGT-000")
    own("ENT-CLEARPATH",ind("IND-CLEAR","Paul York").id,100.0,"managing owner","2014-09-14")
    ind("IND-MALEN-DECOY","Victor Malen",uniq_ssn4(),"1988-12-30")
    ent("ENT-NORTHSTAR","Northstar Physical Therapy","Physical therapy","2019-02-01","enrolled",
        addr("ADDR-NORTHSTAR"),random.choice(clean_agents))
    own("ENT-NORTHSTAR","IND-MALEN-DECOY",100.0,"managing owner","2019-02-01")

    # PROBE FIXTURES (same 4471 ring)
    for suite in (270,280,290):
        aid=f"ADDR-4471-{suite}"
        addr(aid,("Duluth","GA","30096"),True,f"4471 Peachtree Industrial Blvd Ste {suite}")
        cmra_suites[suite]=aid
    agent("AGT-PROBECLEAN","Fresh Start Agents LLC")
    ind("IND-MALEN-P1","V. Malen",malen_ssn,malen_dob)
    ent("ENT-PROBE-V1","Probe Alpha Medical LLC","DME supplier","2026-05-01","applying",
        cmra_suites[270],"AGT-SENTINEL","2026-06-25",None)
    own("ENT-PROBE-V1","IND-MALEN-P1",80.0,"managing owner","2026-05-01","2026-05-01")
    own("ENT-PROBE-V1",ind("IND-PSTRAW-1","Ada Bell").id,80.0,"managing owner","2026-05-01")
    ent("ENT-PROBE-V2","Probe Beta Medical LLC","DME supplier","2026-05-02","applying",
        cmra_suites[280],"AGT-SENTINEL","2026-06-26",None)
    own("ENT-PROBE-V2",ind("IND-PSTRAW-2","Cole Dane").id,100.0,"managing owner","2026-05-02")
    ent("ENT-PROBE-V3","Probe Gamma Medical LLC","DME supplier","2026-05-03","applying",
        cmra_suites[290],"AGT-PROBECLEAN","2026-06-27",None)
    own("ENT-PROBE-V3",ind("IND-PSTRAW-3","Erin Fox").id,100.0,"managing owner","2026-05-03")
    ent("ENT-PROBE-V4","Probe Delta Medical LLC","DME supplier","2026-05-04","applying",
        addr("ADDR-PROBE-V4"),"AGT-PROBECLEAN","2026-06-28",None)
    own("ENT-PROBE-V4",ind("IND-PSTRAW-4","Gwen Hale").id,100.0,"managing owner","2026-05-04")

    return n


TODAY = date(2026, 7, 13)
