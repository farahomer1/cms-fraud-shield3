# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import asyncio
import json
import uuid
import logging
from datetime import date, datetime, timezone, timedelta
from google.cloud import bigquery
from database import insert_rows, get_dataset

logger = logging.getLogger(__name__)

# Full delete order including CMS specific tables
TABLES_DELETE_ORDER = [
    "agent_flags",
    "audit_log",
    "chat_messages",
    "overpayments",
    "decisions",
    "agent_findings",
    "claims",
    "documents",
    "providers",
    "members",
    "batches",
    "appeals",
    "alj_queue",
    "disbursements",
    "mbi_locks",
    "consult_registry",
    "cmra_addresses",
    "pecos_events",
    "pecos_records",
    "beneficiaries",
    "claim_labels",
]


async def clear_all_tables(bq: bigquery.Client) -> None:
    """Truncate all tables in parallel to allow clean seeding."""
    ds = get_dataset()
    logger.info("Clearing all tables in parallel...")

    async def truncate_one(table):
        try:
            job = bq.query(f"TRUNCATE TABLE `{ds}.{table}`")
            await asyncio.to_thread(job.result)
            logger.info(f"  Cleared table: {table}")
        except Exception as exc:
            logger.warning(f"  Could not truncate {table}: {exc}")

    await asyncio.gather(*(truncate_one(table) for table in TABLES_DELETE_ORDER))


async def generate_all_data(bq: bigquery.Client) -> dict:
    """Generates CMS Fraud Shield synthetic data (including the Viktor Scenario)."""
    # 1. Clear database
    await clear_all_tables(bq)

    now_ts = datetime.now(timezone.utc).isoformat()
    sim_start = datetime(2026, 7, 1, 0, 0, 0, tzinfo=timezone.utc)

    # Generate 150 unique-ish deterministic fictitious names for members
    first_names = [
        "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth",
        "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen",
        "Christopher", "Nancy", "Daniel", "Lisa", "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra",
        "Donald", "Ashley", "Steven", "Dorothy", "Paul", "Kimberly", "Andrew", "Emily", "Joshua", "Donna",
        "Kenneth", "Michelle", "Kevin", "Carol", "Brian", "Amanda", "George", "Timothy", "Melissa",
        "Ronald", "Deborah", "Edward", "Stephanie", "Jason", "Rebecca", "Jeffrey", "Sharon", "Gregory", "Laura",
        "Ryan", "Cynthia", "Jacob", "Kathleen", "Gary", "Amy", "Nicholas", "Shirley", "Eric", "Angela",
        "Jonathan", "Helen", "Stephen", "Anna", "Larry", "Brenda", "Justin", "Pamela", "Scott", "Nicole"
    ]
    last_names = [
        "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
        "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
        "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
        "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
        "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
        "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker", "Cruz", "Edwards", "Collins", "Reyes",
        "Stewart", "Morris", "Morales", "Murphy", "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper"
    ]
    import random
    rng = random.Random(12345)
    legit_names = []
    while len(legit_names) < 150:
        first = rng.choice(first_names)
        last = rng.choice(last_names)
        name = f"{first} {last}"
        if name not in legit_names:
            legit_names.append(name)

    # Explicitly seed demo-compliant names
    legit_names[9] = "Eric Evans"
    legit_names[119] = "Stephanie Ortiz"

    # Pre-seed tables
    beneficiaries = []
    pecos_records = []
    pecos_events = []
    cmra_addresses = []
    consult_registry = []
    claims = []
    claim_labels = []
    batches = []
    providers = []  # mapped to providers table

    # 2. CMRA Addresses
    cmra_list = [
        "1209 North Orange St, Wilmington, DE",
        "322 West Broadway, New York, NY",
        "101 Convention Center Dr, Las Vegas, NV",
    ]
    for addr in cmra_list:
        cmra_addresses.append({
            "address": addr,
            "city": addr.split(", ")[1],
            "state": addr.split(", ")[2].split(" ")[0],
            "source": "USPS CMRA Registry",
        })

    # 3. Beneficiaries
    CONDITION_TO_CAP = {
        "Neurogenic Bladder": 150,
        "Urinary Retention": 30,
        "Spinal Cord Injury": 200,
        "Obstructive Uropathy": 100,
        "Urological Stricture": 30
    }

    # Eleanor Vance (Neurogenic Bladder, LCD cap 150, compromised, genuine)
    vance_mbi = "VANCE732MBI"
    vance_cond = "Neurogenic Bladder"
    beneficiaries.append({
        "mbi": vance_mbi,
        "name": "Eleanor Vance",
        "condition": vance_cond,
        "lcd_cap": CONDITION_TO_CAP[vance_cond],
        "is_compromised": True,
        "is_fabricated": False,
        "created_at": now_ts,
    })

    # William Jackson (Urinary Retention, LCD cap 30, not compromised, fabricated entity)
    jackson_mbi = "JACKSON999MBI"
    jackson_cond = "Urinary Retention"
    beneficiaries.append({
        "mbi": jackson_mbi,
        "name": "William Jackson",
        "condition": jackson_cond,
        "lcd_cap": CONDITION_TO_CAP[jackson_cond],
        "is_compromised": False,
        "is_fabricated": True,
        "created_at": now_ts,
    })

    # 100 normal/legitimate beneficiaries
    conditions_pool = list(CONDITION_TO_CAP.keys())
    for i in range(1, 101):
        mbi = f"MBI{i:03d}GEN"
        cond = conditions_pool[i % len(conditions_pool)]
        beneficiaries.append({
            "mbi": mbi,
            "name": legit_names[i-1],
            "condition": cond,
            "lcd_cap": CONDITION_TO_CAP[cond],
            "is_compromised": False,
            "is_fabricated": False,
            "created_at": now_ts,
        })

    # 4. PECOS Records & Events (Viktor's 15 dormant suppliers + Legitimate)
    # 15 Dormant suppliers (shell companies taken over by Viktor)
    shell_names = [
        "Keystone Medical Equipment",
        "Liberty Durable Supplies",
        "Independence Medical Mobility",
        "Delaware Valley Healthcare",
        "Penn Durable Medical",
        "Quaker City Medical Supply",
        "Franklin Mobility Solutions",
        "Broad Street Medical Equip",
        "Rittenhouse DME Supply",
        "Schuylkill Medical Supply",
        "Center City Durable Care",
        "Delaware Bay Medical Supply",
        "Valley Forge Healthcare",
        "Fairmount Mobility Equip",
        "Tri-State Medical Durable"
    ]
    for i in range(1, 16):
        npi = f"NPI_VIK_{i:02d}"
        name = shell_names[i-1]
        ao = "Yury Viktor" if i <= 10 else "Unknown AO"
        addr = f"{100 + i} Maryland Ave, Wilmington, DE"
        
        pecos_records.append({
            "npi": npi,
            "name": name,
            "authorized_official": ao,
            "practice_address": addr,
            "status": "APPROVED",
            "created_at": now_ts,
        })

        # Pre-simulation PECOS Change (90 days prior: e.g. May 15, 2026)
        # Move practice address to a CMRA address
        pecos_events.append({
            "event_id": str(uuid.uuid4()),
            "npi": npi,
            "event_type": "ADDRESS_CHANGE",
            "old_value": addr,
            "new_value": "1209 North Orange St, Wilmington, DE",
            "sim_event_date": "2026-05-15",
            "created_at": now_ts,
        })
        # Authorized Official change to Viktor
        pecos_events.append({
            "event_id": str(uuid.uuid4()),
            "npi": npi,
            "event_type": "AO_CHANGE",
            "old_value": "Original Owner LLC",
            "new_value": "Yury Viktor",
            "sim_event_date": "2026-05-15",
            "created_at": now_ts,
        })

    # Legitimate providers
    legit_provider_names = [
        "Apex Medical Supplies",
        "Beacon Medical Mobility",
        "CareFirst DME Solutions",
        "Delaware Medical Supply Co",
        "Evergreen Health Equipment",
        "First Choice Medical Care",
        "Golden Gate Medical Supply",
        "Horizon Medical Supplies",
        "Integrity Durable Medical",
        "Jubilee Health Equipment",
        "Keystone Health & Mobility"
    ]
    legit_provider_addresses = [
        "1528 Walnut St, Philadelphia, PA 19102",
        "1800 John F Kennedy Blvd, Philadelphia, PA 19103",
        "100 Penn Square East, Philadelphia, PA 19107",
        "1601 Market St, Philadelphia, PA 19103",
        "230 South Broad St, Philadelphia, PA 19102",
        "1735 Market St, Philadelphia, PA 19103",
        "1900 Market St, Philadelphia, PA 19103",
        "2001 Market St, Philadelphia, PA 19103",
        "1500 Market St, Philadelphia, PA 19102",
        "1600 Market St, Philadelphia, PA 19103",
        "1209 North Orange St, Wilmington, DE"
    ]
    for i in range(1, 12):
        npi = f"NPI_LEG_{i:02d}"
        name = legit_provider_names[i-1]
        pecos_records.append({
            "npi": npi,
            "name": name,
            "authorized_official": f"Doctor Legitimate {i}",
            "practice_address": legit_provider_addresses[i-1],
            "status": "APPROVED",
            "created_at": now_ts,
        })

    # Sync PECOS records to the legacy 'providers' table as well to avoid breaking existing queries
    for pr in pecos_records:
        providers.append({
            "id": pr["npi"],
            "name": pr["name"],
            "npi": pr["npi"],
            "provider_type": "DME",
            "specialty": "Urology / Catheters",
            "address": json.dumps({"street": pr["practice_address"]}),
            "risk_score": 0,
            "accreditation_status": "Active",
            "claim_history": json.dumps([]),
            "created_at": now_ts,
        })

    # 5. Consult Registry (Qualifying clinical evidence for Eleanor Vance)
    consult_registry.append({
        "consult_id": str(uuid.uuid4()),
        "mbi": vance_mbi,
        "cpt_code": "99214",  # Telehealth E&M consult
        "icd10_code": "N31.9", # Neurogenic bladder
        "sim_consult_date": "2026-07-01",  # 2 days before her claim on July 3
        "created_at": now_ts,
    })

    # Generate some normal consults for other beneficiaries
    for i in range(1, 101):
        mbi = f"MBI{i:03d}GEN"
        consult_registry.append({
            "consult_id": str(uuid.uuid4()),
            "mbi": mbi,
            "cpt_code": "99214",
            "icd10_code": "N31.9",
            "sim_consult_date": "2026-07-01",
            "created_at": now_ts,
        })

    # 6. Seed Batches (representing Ingestion Batches)
    batch_id = "batch_cms_01"
    batches.append({
        "id": batch_id,
        "name": "DME Catheter Batch CMS-01",
        "received_date": "2026-07-05",
        "file_count": 1,
        "status": "COMPLETED",
        "total_claims": 200,
        "flagged_count": 17, # Vance + Jackson + 15 Shell spikes
        "approved_count": 183,
        "created_at": now_ts,
        "updated_at": now_ts,
    })

    # 7. Generate Claims
    # A. Eleanor Vance Claims (hits R-01 (over-cap), R-03 (velocity with NPIs 1, 2, 3), R-04 (PECOS change CMRA))
    vance_claim_id_1 = f"claim_vance_01"
    claims.append({
        "id": vance_claim_id_1,
        "claim_number": "CLM-VANCE-01",
        "batch_id": batch_id,
        "beneficiary_id": "BEN-VANCE-MOCK", # dummy linkage
        "provider_id": "NPI_VIK_01",
        "claim_type": "DME",
        "status": "held", # Initially held due to scoring >= 0.95
        "risk_level": "CRITICAL",
        "billing_amount": 1800.00,
        "service_date": "2026-07-03",
        "mbi": vance_mbi,
        "billing_npi": "NPI_VIK_01",
        "hcpcs_code": "A4351",
        "quantity": 120,  # exceeds LCD cap of 100 -> R-01 hit
        "state": "DE",
        "prior_auth": False,
        "modifier": None,
        "sim_service_date": "2026-07-03",
        "created_at": now_ts,
        "updated_at": now_ts,
    })
    claim_labels.append({
        "claim_id": vance_claim_id_1,
        "is_fraud": True, # Stolen identity
    })

    # Velocity triggers (NPI 2 and NPI 3 bill Vance within 48h)
    vance_claim_id_2 = f"claim_vance_02"
    claims.append({
        "id": vance_claim_id_2,
        "claim_number": "CLM-VANCE-02",
        "batch_id": batch_id,
        "beneficiary_id": "BEN-VANCE-MOCK",
        "provider_id": "NPI_VIK_02",
        "claim_type": "DME",
        "status": "held",
        "risk_level": "CRITICAL",
        "billing_amount": 100.00,
        "service_date": "2026-07-03",
        "mbi": vance_mbi,
        "billing_npi": "NPI_VIK_02",
        "hcpcs_code": "A4351",
        "quantity": 5,
        "state": "DE",
        "prior_auth": False,
        "modifier": None,
        "sim_service_date": "2026-07-03",
        "created_at": now_ts,
        "updated_at": now_ts,
    })
    claim_labels.append({
        "claim_id": vance_claim_id_2,
        "is_fraud": True,
    })

    vance_claim_id_3 = f"claim_vance_03"
    claims.append({
        "id": vance_claim_id_3,
        "claim_number": "CLM-VANCE-03",
        "batch_id": batch_id,
        "beneficiary_id": "BEN-VANCE-MOCK",
        "provider_id": "NPI_VIK_03",
        "claim_type": "DME",
        "status": "held",
        "risk_level": "CRITICAL",
        "billing_amount": 100.00,
        "service_date": "2026-07-04",
        "mbi": vance_mbi,
        "billing_npi": "NPI_VIK_03",
        "hcpcs_code": "A4351",
        "quantity": 5,
        "state": "DE",
        "prior_auth": False,
        "modifier": None,
        "sim_service_date": "2026-07-04",
        "created_at": now_ts,
        "updated_at": now_ts,
    })
    claim_labels.append({
        "claim_id": vance_claim_id_3,
        "is_fraud": True,
    })

    # B. William Jackson Claim (hits R-01 (80 vs cap of 30), R-04 (CMRA change))
    jackson_claim_id = f"claim_jackson_01"
    claims.append({
        "id": jackson_claim_id,
        "claim_number": "CLM-JACKSON-01",
        "batch_id": batch_id,
        "beneficiary_id": "BEN-JACKSON-MOCK",
        "provider_id": "NPI_VIK_04",
        "claim_type": "DME",
        "status": "held",
        "risk_level": "CRITICAL",
        "billing_amount": 1200.00,
        "service_date": "2026-07-05",
        "mbi": jackson_mbi,
        "billing_npi": "NPI_VIK_04",
        "hcpcs_code": "A4351",
        "quantity": 80,  # exceeds LCD cap of 30 -> R-01 hit
        "state": "DE",
        "prior_auth": False,
        "modifier": None,
        "sim_service_date": "2026-07-05",
        "created_at": now_ts,
        "updated_at": now_ts,
    })
    claim_labels.append({
        "claim_id": jackson_claim_id,
        "is_fraud": True, # Fabricated beneficiary
    })

    # C. Other Viktor Spiking Claims (to hit R-02 (dormant supplier spike: billing > $100k in 14 days, previous history < $5k))
    # We generate a spike claim for each of Viktor's NPIs to aggregate > $100k
    for i in range(1, 16):
        vik_npi = f"NPI_VIK_{i:02d}"
        claim_id = f"claim_vik_spike_{i:02d}"
        claims.append({
            "id": claim_id,
            "claim_number": f"CLM-VIK-SPIKE-{i:02d}",
            "batch_id": batch_id,
            "beneficiary_id": f"BEN-VIK-{i:02d}",
            "provider_id": vik_npi,
            "claim_type": "DME",
            "status": "held",
            "risk_level": "CRITICAL",
            "billing_amount": 105000.00,  # massive billing spike per NPI
            "service_date": "2026-07-05",
            "mbi": f"MBI_DUMMY_{i:02d}",
            "billing_npi": vik_npi,
            "hcpcs_code": "A4351",
            "quantity": 50,
            "state": "DE",
            "prior_auth": False,
            "modifier": None,
            "sim_service_date": "2026-07-05",
            "created_at": now_ts,
            "updated_at": now_ts,
        })
        claim_labels.append({
            "claim_id": claim_id,
            "is_fraud": True,
        })

    # D. 150 Normal/Legitimate billing claims (some with over LCD cap but having modifier/prior-auth to test negative control)
    for i in range(1, 151):
        leg_npi = f"NPI_LEG_{(i % 10) + 1:02d}"
        leg_mbi = f"MBI{(i % 100) + 1:03d}GEN"
        claim_id = f"claim_leg_{i:03d}"
        
        # Give some claims quantities over LCD cap, but with prior_auth=True or modifier="KX" (qualifies for exemption)
        exceeds_cap_exempt = (i % 5 == 0)
        quantity = 150 if exceeds_cap_exempt else 15
        prior_auth = exceeds_cap_exempt and (i % 10 == 0)
        modifier = "KX" if (exceeds_cap_exempt and not prior_auth) else None

        # Override for demo alignment
        status = "disbursed"
        risk_level = "LOW"
        if i == 10:
            status = "held"
            risk_level = "CRITICAL"
        elif i == 120:
            status = "held"
            risk_level = "HIGH"

        claims.append({
            "id": claim_id,
            "claim_number": f"CLM-LEG-{i:03d}",
            "batch_id": batch_id,
            "beneficiary_id": f"BEN-LEG-{i:03d}",
            "provider_id": leg_npi,
            "claim_type": "DME",
            "status": status,
            "risk_level": risk_level,
            "billing_amount": 250.00,
            "service_date": "2026-07-05",
            "mbi": leg_mbi,
            "billing_npi": leg_npi,
            "hcpcs_code": "A4351",
            "quantity": quantity,
            "state": "PA",
            "prior_auth": prior_auth,
            "modifier": modifier,
            "sim_service_date": "2026-07-05",
            "created_at": now_ts,
            "updated_at": now_ts,
        })
        claim_labels.append({
            "claim_id": claim_id,
            "is_fraud": (i == 10 or i == 120),
        })

    # E. Let's pre-load legacy/prior claim histories into 'claims' table (dated e.g. March 2026, so Viktor NPIs have history < $5000)
    for i in range(1, 16):
        vik_npi = f"NPI_VIK_{i:02d}"
        claims.append({
            "id": f"claim_vik_prior_{i:02d}",
            "claim_number": f"CLM-VIK-PRIOR-{i:02d}",
            "batch_id": "batch_prior",
            "beneficiary_id": f"BEN-VIK-{i:02d}",
            "provider_id": vik_npi,
            "claim_type": "DME",
            "status": "disbursed",
            "risk_level": "LOW",
            "billing_amount": 1200.00,  # under $5k limit!
            "service_date": "2026-03-10",
            "mbi": f"MBI_DUMMY_PRIOR_{i:02d}",
            "billing_npi": vik_npi,
            "hcpcs_code": "A4351",
            "quantity": 10,
            "state": "DE",
            "prior_auth": False,
            "modifier": None,
            "sim_service_date": "2026-03-10",
            "created_at": now_ts,
            "updated_at": now_ts,
        })
        claim_labels.append({
            "claim_id": f"claim_vik_prior_{i:02d}",
            "is_fraud": False,
        })

    # Seed stable prior billing history for NPI_LEG_11 (Keystone Health & Mobility) to show stable billing doesn't trigger CMRA
    for j in range(1, 4):
        claims.append({
            "id": f"claim_leg11_prior_{j}",
            "claim_number": f"CLM-LEG11-PRIOR-{j}",
            "batch_id": "batch_prior",
            "beneficiary_id": f"BEN-LEG-00{j}",
            "provider_id": "NPI_LEG_11",
            "claim_type": "DME",
            "status": "disbursed",
            "risk_level": "LOW",
            "billing_amount": 2500.00,  # $2.5k * 3 = $7.5k stable history
            "service_date": "2026-03-10",
            "mbi": f"MBI00{j}GEN",
            "billing_npi": "NPI_LEG_11",
            "hcpcs_code": "A4351",
            "quantity": 10,
            "state": "DE",
            "prior_auth": False,
            "modifier": None,
            "sim_service_date": "2026-03-10",
            "created_at": now_ts,
            "updated_at": now_ts,
        })
        claim_labels.append({
            "claim_id": f"claim_leg11_prior_{j}",
            "is_fraud": False,
        })

    # G. Construct agent_findings list
    agent_findings = []

    # 1. Eleanor Vance Findings
    agent_findings.append({
        "id": str(uuid.uuid4()),
        "claim_id": "claim_vance_01",
        "agent_name": "rules_engine",
        "fraud_type": "policy_violation",
        "confidence_score": 97,
        "recommendation": "flag",
        "flagged_data_points": json.dumps(["quantity", "billing_npi", "mbi"]),
        "evidence_summary": "Rule R-01 (LCD Quantity Cap Exceeded) and Rule R-03 (MBI Velocity Alert) triggered. Billed quantity of 120 catheters exceeds the Local Coverage Determination (LCD) cap of 100 units/month, and the beneficiary's MBI has high billing velocity across multiple suppliers.",
        "finding_details": json.dumps({
            "rules_triggered": ["R-01: LCD Quantity Cap Exceeded", "R-03: MBI Multi-provider Velocity Alert"],
            "lcd_cap": 100,
            "billed_quantity": 120,
            "velocity_providers_48h": 3
        }),
        "processing_time_ms": 1150,
        "created_at": now_ts,
    })
    agent_findings.append({
        "id": str(uuid.uuid4()),
        "claim_id": "claim_vance_01",
        "agent_name": "data_validation",
        "fraud_type": "identity_evasion",
        "confidence_score": 96,
        "recommendation": "flag",
        "flagged_data_points": json.dumps(["provider_address"]),
        "evidence_summary": "Rule R-04 (PECOS CMRA Flag) triggered. The supplier's physical address was recently changed in PECOS to 1209 North Orange St, Wilmington, DE, which is a high-risk Commercial Mail Receiving Agency (CMRA) / mail-drop location.",
        "finding_details": json.dumps({
            "pecos_event": "ADDRESS_CHANGE",
            "new_address": "1209 North Orange St, Wilmington, DE",
            "is_cmra": True
        }),
        "processing_time_ms": 980,
        "created_at": now_ts,
    })
    agent_findings.append({
        "id": str(uuid.uuid4()),
        "claim_id": "claim_vance_01",
        "agent_name": "overlapping_claims",
        "fraud_type": "overlapping_claims",
        "confidence_score": 94,
        "recommendation": "flag",
        "flagged_data_points": json.dumps(["mbi", "service_date"]),
        "evidence_summary": "Multi-provider velocity detected. This beneficiary was billed for overlapping catheters within a 48-hour window by three separate DME suppliers (NPI_VIK_01, NPI_VIK_02, and NPI_VIK_03).",
        "finding_details": json.dumps({
            "overlapping_providers": ["NPI_VIK_01", "NPI_VIK_02", "NPI_VIK_03"],
            "timeframe_hours": 48
        }),
        "processing_time_ms": 820,
        "created_at": now_ts,
    })

    agent_findings.append({
        "id": str(uuid.uuid4()),
        "claim_id": "claim_vance_02",
        "agent_name": "rules_engine",
        "fraud_type": "policy_violation",
        "confidence_score": 92,
        "recommendation": "flag",
        "flagged_data_points": json.dumps(["mbi", "billing_npi"]),
        "evidence_summary": "Rule R-03 (MBI Velocity Alert) triggered. Beneficiary was billed by three separate suppliers (NPI_VIK_01, NPI_VIK_02, and NPI_VIK_03) within rolling 48 hours.",
        "finding_details": json.dumps({
            "rules_triggered": ["R-03: MBI Multi-provider Velocity Alert"]
        }),
        "processing_time_ms": 1020,
        "created_at": now_ts,
    })

    agent_findings.append({
        "id": str(uuid.uuid4()),
        "claim_id": "claim_vance_03",
        "agent_name": "rules_engine",
        "fraud_type": "policy_violation",
        "confidence_score": 92,
        "recommendation": "flag",
        "flagged_data_points": json.dumps(["mbi", "billing_npi"]),
        "evidence_summary": "Rule R-03 (MBI Velocity Alert) triggered. Beneficiary was billed by three separate suppliers (NPI_VIK_01, NPI_VIK_02, and NPI_VIK_03) within rolling 48 hours.",
        "finding_details": json.dumps({
            "rules_triggered": ["R-03: MBI Multi-provider Velocity Alert"]
        }),
        "processing_time_ms": 950,
        "created_at": now_ts,
    })

    # 2. William Jackson Findings
    agent_findings.append({
        "id": str(uuid.uuid4()),
        "claim_id": "claim_jackson_01",
        "agent_name": "rules_engine",
        "fraud_type": "policy_violation",
        "confidence_score": 95,
        "recommendation": "flag",
        "flagged_data_points": json.dumps(["quantity"]),
        "evidence_summary": "Rule R-01 (LCD Quantity Cap Exceeded) triggered. Billed quantity of 80 catheters exceeds the beneficiary's assigned LCD cap of 30 units/month without prior authorization or KX modifier.",
        "finding_details": json.dumps({
            "rules_triggered": ["R-01: LCD Quantity Cap Exceeded"],
            "lcd_cap": 30,
            "billed_quantity": 80
        }),
        "processing_time_ms": 1050,
        "created_at": now_ts,
    })
    agent_findings.append({
        "id": str(uuid.uuid4()),
        "claim_id": "claim_jackson_01",
        "agent_name": "data_validation",
        "fraud_type": "identity_evasion",
        "confidence_score": 94,
        "recommendation": "flag",
        "flagged_data_points": json.dumps(["provider_address"]),
        "evidence_summary": "Rule R-04 (PECOS CMRA Flag) triggered. The supplier (NPI_VIK_04) changed their physical address in PECOS to the high-risk CMRA mail drop at 1209 North Orange St, Wilmington, DE.",
        "finding_details": json.dumps({
            "pecos_event": "ADDRESS_CHANGE",
            "new_address": "1209 North Orange St, Wilmington, DE",
            "is_cmra": True
        }),
        "processing_time_ms": 870,
        "created_at": now_ts,
    })

    # 3. 15 Spiking Claims Findings
    for i in range(1, 16):
        claim_id = f"claim_vik_spike_{i:02d}"
        agent_findings.append({
            "id": str(uuid.uuid4()),
            "claim_id": claim_id,
            "agent_name": "rules_engine",
            "fraud_type": "policy_violation",
            "confidence_score": 96,
            "recommendation": "flag",
            "flagged_data_points": json.dumps(["billing_amount", "billing_npi"]),
            "evidence_summary": "Rule R-02 (Dormant Supplier Spike) and Rule R-04 (PECOS AO Change Flag) triggered. This supplier had less than $5,000 in billing over the trailing 180 days, but suddenly spiked to $105,000 in billing. PECOS records show a recent change in the Authorized Official within 90 days to Yury Viktor.",
            "finding_details": json.dumps({
                "rules_triggered": ["R-02: Dormant Supplier Spike", "R-04: PECOS CMRA AO/Address Change Flag"],
                "trailing_180d_billing": 1200.0,
                "current_14d_billing": 105000.0,
                "pecos_authorized_official_change": "Yury Viktor"
            }),
            "processing_time_ms": 1100,
            "created_at": now_ts,
        })
        agent_findings.append({
            "id": str(uuid.uuid4()),
            "claim_id": claim_id,
            "agent_name": "data_validation",
            "fraud_type": "identity_evasion",
            "confidence_score": 98,
            "recommendation": "flag",
            "flagged_data_points": json.dumps(["provider_address"]),
            "evidence_summary": "PECOS physical address was updated within 90 days of the service date to 1209 North Orange St, Wilmington, DE. This address is a high-risk Commercial Mail Receiving Agency (CMRA) / mail-drop, and is shared by 15 distinct providers in this spike.",
            "finding_details": json.dumps({
                "new_address": "1209 North Orange St, Wilmington, DE",
                "is_cmra": True,
                "cluster_size": 15
            }),
            "processing_time_ms": 920,
            "created_at": now_ts,
        })

    # 4. Legitimate Claims Findings
    for i in range(1, 151):
        if i == 10 or i == 120:
            continue
        claim_id = f"claim_leg_{i:03d}"
        agent_findings.append({
            "id": str(uuid.uuid4()),
            "claim_id": claim_id,
            "agent_name": "rules_engine",
            "fraud_type": "policy_violation",
            "confidence_score": 99,
            "recommendation": "pass",
            "flagged_data_points": json.dumps([]),
            "evidence_summary": "No policy violations detected. Quantity and billing amounts are well within Local Coverage Determination (LCD) guidelines.",
            "finding_details": json.dumps({}),
            "processing_time_ms": 600,
            "created_at": now_ts,
        })

    # Explicit agent findings for claim_leg_010 (Eric Evans - Deceased Beneficiary)
    agent_findings.append({
        "id": str(uuid.uuid4()),
        "claim_id": "claim_leg_010",
        "agent_name": "rules_engine",
        "fraud_type": "policy_violation",
        "confidence_score": 98,
        "recommendation": "flag",
        "flagged_data_points": json.dumps(["service_date"]),
        "evidence_summary": "Rule R-01 (Deceased Beneficiary Post-Mortem Billing) triggered. Beneficiary Eric Evans has a recorded date of death of 2025-06-15 in the Social Security Death Master File, but the claim service date is 2026-07-05 (over a year after death).",
        "finding_details": json.dumps({
            "death_date": "2025-06-15",
            "service_date": "2026-07-05",
            "rule_violated": "R-01: Post-Mortem Billing"
        }),
        "processing_time_ms": 1100,
        "created_at": now_ts,
    })
    agent_findings.append({
        "id": str(uuid.uuid4()),
        "claim_id": "claim_leg_010",
        "agent_name": "trust_defender",
        "fraud_type": "identity_evasion",
        "confidence_score": 99,
        "recommendation": "flag",
        "flagged_data_points": json.dumps(["mbi", "service_date"]),
        "evidence_summary": "Deceased Beneficiary Flag: Identity verification failed. MBI cross-reference with the Social Security Death Master File confirms Eric Evans is deceased. All billing for this identity is suspended under Pre-Payment Claims Hold.",
        "finding_details": json.dumps({
            "death_master_file_match": True,
            "suspended_status": "Pre-Payment Hold"
        }),
        "processing_time_ms": 950,
        "created_at": now_ts,
    })
    agent_findings.append({
        "id": str(uuid.uuid4()),
        "claim_id": "claim_leg_010",
        "agent_name": "crush_fraud",
        "fraud_type": "prepay_hold",
        "confidence_score": 97,
        "recommendation": "flag",
        "flagged_data_points": json.dumps(["billing_amount"]),
        "evidence_summary": "Pre-Payment Claims Hold: Automated holding rule triggered for post-mortem billing. Billed amount of $250.00 is placed on permanent administrative hold pending referral.",
        "finding_details": json.dumps({
            "hold_reason": "Post-Mortem Billing Rule",
            "amount_held": 250.00
        }),
        "processing_time_ms": 850,
        "created_at": now_ts,
    })

    # Explicit agent findings for claim_leg_120 (Stephanie Ortiz - Beneficial Ownership)
    agent_findings.append({
        "id": str(uuid.uuid4()),
        "claim_id": "claim_leg_120",
        "agent_name": "system_resilience",
        "fraud_type": "beneficial_ownership",
        "confidence_score": 96,
        "recommendation": "flag",
        "flagged_data_points": json.dumps(["provider_id"]),
        "evidence_summary": "Beneficial Ownership Unmasked: System Resilience audit unmasked the underlying owner of Apex Medical Supplies as Yury Viktor (alias Yury Victor / Victor Malen), a high-risk barred operator who was previously excluded from Medicare/Medicaid participation.",
        "finding_details": json.dumps({
            "unmasked_owner": "Yury Viktor (Victor Malen)",
            "exclusion_status": "EXCLUDED",
            "entity_shell_match": True
        }),
        "processing_time_ms": 1250,
        "created_at": now_ts,
    })
    agent_findings.append({
        "id": str(uuid.uuid4()),
        "claim_id": "claim_leg_120",
        "agent_name": "program_integrity_ops",
        "fraud_type": "policy_referral",
        "confidence_score": 95,
        "recommendation": "flag",
        "flagged_data_points": json.dumps(["provider_id"]),
        "evidence_summary": "System exclusion policy referral. Highly recommended for immediate administrative sanction and referral to OIG for criminal investigation due to illegal beneficial ownership bypass.",
        "finding_details": json.dumps({
            "referral_target": "OIG Criminal Division",
            "sanction_basis": "Excluded Owner Evasion"
        }),
        "processing_time_ms": 910,
        "created_at": now_ts,
    })

    # 5. Prior Claims Findings (Legacy)
    for i in range(1, 16):
        claim_id = f"claim_vik_prior_{i:02d}"
        agent_findings.append({
            "id": str(uuid.uuid4()),
            "claim_id": claim_id,
            "agent_name": "rules_engine",
            "fraud_type": "policy_violation",
            "confidence_score": 99,
            "recommendation": "pass",
            "flagged_data_points": json.dumps([]),
            "evidence_summary": "Legacy claim processed and approved successfully.",
            "finding_details": json.dumps({}),
            "processing_time_ms": 400,
            "created_at": now_ts,
        })

    # F. Construct members list to map all beneficiary_id values referenced in claims
    members = []
    
    # 1. Eleanor Vance
    members.append({
        "id": "BEN-VANCE-MOCK",
        "name_display": "Eleanor Vance",
        "ssn_last4": "7732",
        "date_of_birth": "1948-04-12",
        "date_of_death": None,
        "vital_status": "alive",
        "service_branch": "Medicare Part B",
        "disability_rating": 0,
        "benefits_enrolled": "{}",
        "created_at": now_ts,
    })

    # 2. William Jackson
    members.append({
        "id": "BEN-JACKSON-MOCK",
        "name_display": "William Jackson",
        "ssn_last4": "9999",
        "date_of_birth": "1952-09-24",
        "date_of_death": None,
        "vital_status": "alive",
        "service_branch": "Medicare Part B",
        "disability_rating": 0,
        "benefits_enrolled": "{}",
        "created_at": now_ts,
    })

    # 3. Viktor Spiking Members with rich variety (Arthur Pendelton, Elena Rostova, Marcus Vance, Siddharth Patel, etc.)
    vik_names = [
        "Arthur Pendelton", "Elena Rostova", "Marcus Vance", "Siddharth Patel",
        "Mei-Ling Zhou", "Gabriela Gomez", "Aisha Diop", "Dmitri Volkov",
        "Sarah Jenkins", "Chloe Laurent", "Oliver Hansen", "Kenji Tanaka",
        "Amira Haddad", "Carlos Santana", "Zoe Rosenberg"
    ]
    for idx, name in enumerate(vik_names):
        members.append({
            "id": f"BEN-VIK-{idx+1:02d}",
            "name_display": name,
            "ssn_last4": f"55{idx+1:02d}"[-4:],
            "date_of_birth": f"19{40 + (idx % 15)}-05-15",
            "date_of_death": None,
            "vital_status": "alive",
            "service_branch": "Medicare Part B",
            "disability_rating": 0,
            "benefits_enrolled": "{}",
            "created_at": now_ts,
        })

    # 4. Legitimate members (1 to 150)
    for i in range(1, 151):
        death_date = None
        vital_status = "alive"
        if i == 10:
            death_date = "2025-06-15"
            vital_status = "deceased"
        members.append({
            "id": f"BEN-LEG-{i:03d}",
            "name_display": legit_names[i-1],
            "ssn_last4": f"{1000 + i}"[-4:],
            "date_of_birth": "1960-01-01",
            "date_of_death": death_date,
            "vital_status": vital_status,
            "service_branch": "Medicare Part B",
            "disability_rating": 0,
            "benefits_enrolled": "{}",
            "created_at": now_ts,
        })

    # 8. Inserting into BigQuery using our insert_rows helper
    logger.info("Inserting generated datasets into BigQuery...")
    await insert_rows("cmra_addresses", cmra_addresses, use_load=True)
    await insert_rows("beneficiaries", beneficiaries, use_load=True)
    await insert_rows("members", members, use_load=True)
    await insert_rows("pecos_records", pecos_records, use_load=True)
    await insert_rows("pecos_events", pecos_events, use_load=True)
    await insert_rows("providers", providers, use_load=True)
    await insert_rows("consult_registry", consult_registry, use_load=True)
    await insert_rows("batches", batches, use_load=True)
    await insert_rows("claims", claims, use_load=True)
    await insert_rows("claim_labels", claim_labels, use_load=True)
    await insert_rows("agent_findings", agent_findings, use_load=True)


    logger.info("Dynamic CMS Fraud Shield data generation completed successfully!")
    return {
        "beneficiaries": len(beneficiaries),
        "pecos_records": len(pecos_records),
        "pecos_events": len(pecos_events),
        "cmra_addresses": len(cmra_addresses),
        "consult_registry": len(consult_registry),
        "batches": len(batches),
        "claims": len(claims),
        "claim_labels": len(claim_labels),
        "agent_findings": len(agent_findings),
    }


if __name__ == "__main__":
    from database import get_sync_client
    bq_client = get_sync_client()
    logging.basicConfig(level=logging.INFO)
    asyncio.run(generate_all_data(bq_client))
