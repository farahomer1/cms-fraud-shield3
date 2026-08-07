# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""BigQuery client setup for PIVOT backend."""

import asyncio
import re
from typing import Any

from google.cloud import bigquery

from config import settings

_client: bigquery.Client | None = None

# BigQuery project/dataset identifiers may only contain letters, digits,
# underscores, hyphens, and (for domain-scoped projects) a single ':' or '.'.
# Identifiers cannot be passed as query parameters, so they must be interpolated
# into query strings. Validating them here at the trust boundary guarantees the
# interpolated value can never carry SQL-breaking characters (backticks, quotes,
# semicolons, whitespace), keeping the string-built queries safe.
_IDENTIFIER_RE = re.compile(r"^[A-Za-z0-9_.:-]+$")


def _validate_identifier(value: str, kind: str) -> str:
    if not value or not _IDENTIFIER_RE.match(value):
        raise ValueError(f"Invalid BigQuery {kind} identifier: {value!r}")
    return value


def _get_client() -> bigquery.Client:
    """Create or return the BigQuery client singleton."""
    global _client
    if _client is None:
        kwargs: dict[str, Any] = {}
        if settings.bigquery_project:
            kwargs["project"] = settings.bigquery_project
        if settings.google_credentials_path:
            import json
            with open(settings.google_credentials_path, "r") as f:
                cred_data = json.load(f)
            
            if cred_data.get("type") == "authorized_user":
                from google.oauth2.credentials import Credentials
                credentials = Credentials.from_authorized_user_file(settings.google_credentials_path)
            else:
                from google.oauth2 import service_account
                credentials = service_account.Credentials.from_service_account_file(
                    settings.google_credentials_path
                )
            kwargs["credentials"] = credentials
        _client = bigquery.Client(**kwargs)
    return _client


def get_dataset() -> str:
    """Return the validated, fully-qualified dataset reference: `project.dataset`."""
    client = _get_client()
    project = _validate_identifier(settings.bigquery_project or client.project, "project")
    dataset = _validate_identifier(settings.bigquery_dataset, "dataset")
    return f"{project}.{dataset}"


def get_sync_client() -> bigquery.Client:
    """Return the BigQuery client (synchronous)."""
    return _get_client()


async def get_db():
    """FastAPI dependency that yields the BigQuery client.

    Maintains the same Depends(get_db) pattern used throughout routes,
    so the migration requires minimal route signature changes.
    """
    yield _get_client()


import contextvars
from datetime import datetime, date, timezone, timedelta

_in_memory_db = contextvars.ContextVar("_in_memory_db", default=None)

class MockRow:
    """Mock BigQuery Row with dictionary, key-indexed, and attribute-based access."""
    def __init__(self, data: dict):
        self._data = data

    def __getitem__(self, key):
        return self._data[key]

    def get(self, key, default=None):
        return self._data.get(key, default)

    def keys(self):
        return self._data.keys()

    def __getattr__(self, name):
        if name in self._data:
            return self._data[name]
        raise AttributeError(f"MockRow has no attribute {name}")


def enable_in_memory_db(data: dict) -> None:
    """Activate the fast in-memory query routing layer with the provided datasets."""
    _in_memory_db.set(data)


def disable_in_memory_db() -> None:
    """Deactivate the in-memory query routing layer and clear references."""
    _in_memory_db.set(None)


def _run_query_in_memory(query: str, params: list | None, mem_db: dict) -> list:
    """Evaluate common CMS Fraud Shield read-only SQL queries completely in-memory."""
    param_dict = {}
    if params:
        for p in params:
            param_dict[p.name] = p.value

    q = " ".join(query.lower().split())

    # 0. FR-17 network correlation check (shared_count)
    if "shared_count" in q:
        npi = param_dict.get("npi")
        ao = None
        addr = None
        for row in mem_db.get("pecos_records", []):
            if str(row.get("npi")) == str(npi):
                ao = row.get("authorized_official")
                addr = row.get("practice_address")
                break
                
        if not ao or not addr:
            return [MockRow({"shared_count": 0})]
            
        shared_npis = set()
        for row in mem_db.get("pecos_records", []):
            if row.get("authorized_official") == ao and row.get("practice_address") == addr and str(row.get("npi")) != str(npi):
                shared_npis.add(str(row.get("npi")))
                
        held_npis = set()
        for row in mem_db.get("claims", []):
            prov_id = row.get("provider_id") or row.get("billing_npi")
            if str(prov_id) in shared_npis and row.get("status") in ('flagged', 'held'):
                held_npis.add(str(prov_id))
                
        event_npis = set()
        for row in mem_db.get("pecos_events", []):
            ev_npi = row.get("npi")
            if str(ev_npi) in held_npis:
                event_npis.add(str(ev_npi))
                
        return [MockRow({"shared_count": len(event_npis)})]

    # 1. PECOS_RECORDS simple check
    if "pecos_records" in q and "join" not in q:
        npi_val = param_dict.get("npi")
        results = []
        for row in mem_db.get("pecos_records", []):
            if str(row.get("npi")) == str(npi_val):
                results.append(MockRow(row))
        return results

    # 2. MBI_LOCKS count check
    if "mbi_locks" in q:
        mbi_val = param_dict.get("mbi")
        count = 0
        for row in mem_db.get("mbi_locks", []):
            if str(row.get("mbi")) == str(mbi_val):
                count += 1
        return [MockRow({"count": count})]

    # 3. BENEFICIARIES LCD cap fetch
    if "beneficiaries" in q:
        mbi_val = param_dict.get("mbi")
        results = []
        for row in mem_db.get("beneficiaries", []):
            if str(row.get("mbi")) == str(mbi_val):
                results.append(MockRow(row))
        return results

    # 3.5. PECOS_EVENTS early warning check
    if "pecos_events" in q and "event_type = 'ao_change'" in q:
        groups = {}
        for row in mem_db.get("pecos_events", []):
            if row.get("event_type") == "AO_CHANGE":
                nv = row.get("new_value")
                npi = row.get("npi")
                if nv and npi:
                    if nv not in groups:
                        groups[nv] = set()
                    groups[nv].add(npi)
                    
        results = []
        for nv, npis_set in groups.items():
            if len(npis_set) >= 5:
                results.append(MockRow({
                    "shared_ao": nv,
                    "npis": list(npis_set),
                    "change_count": len(npis_set)
                }))
        return results

    # 4. PECOS_EVENTS count check (trust_defender) - only loop queries specify 'npi' filter
    if "pecos_events" in q and "npi" in q:
        npi_val = param_dict.get("npi")
        start_date_str = param_dict.get("start_date")
        end_date_str = param_dict.get("end_date")
        
        start_date = date.fromisoformat(start_date_str) if isinstance(start_date_str, str) else start_date_str
        end_date = date.fromisoformat(end_date_str) if isinstance(end_date_str, str) else end_date_str
        
        count = 0
        for row in mem_db.get("pecos_events", []):
            if str(row.get("npi")) != str(npi_val):
                continue
            if row.get("event_type") != "AO_CHANGE":
                continue
            ev_date = row.get("sim_event_date")
            if isinstance(ev_date, str):
                ev_date = date.fromisoformat(ev_date)
            if start_date <= ev_date <= end_date:
                count += 1
        return [MockRow({"match_count": count})]

    # 5. THREAT_PROFILES active profile count check (crush_fraud)
    if "threat_profiles" in q:
        hcpcs = param_dict.get("hcpcs")
        state = param_dict.get("state")
        npi = param_dict.get("npi")
        count = 0
        for row in mem_db.get("threat_profiles", []):
            hcpcs_list = row.get("hcpcs_codes", [])
            if isinstance(hcpcs_list, str):
                import json
                try: hcpcs_list = json.loads(hcpcs_list)
                except: hcpcs_list = []
            
            states_list = row.get("states", [])
            if isinstance(states_list, str):
                import json
                try: states_list = json.loads(states_list)
                except: states_list = []
                
            npi_list = row.get("supplier_npis", [])
            if isinstance(npi_list, str):
                import json
                try: npi_list = json.loads(npi_list)
                except: npi_list = []
                
            if hcpcs in hcpcs_list and state in states_list and npi in npi_list:
                count += 1
        return [MockRow({"match_count": count})]

    # 6. CLAIMS rolling quantity sum (R-01)
    if "sum(quantity)" in q:
        mbi = param_dict.get("mbi")
        start_date_str = param_dict.get("start_date")
        end_date_str = param_dict.get("end_date")
        claim_id = param_dict.get("claim_id")
        
        start_date = date.fromisoformat(start_date_str) if isinstance(start_date_str, str) else start_date_str
        end_date = date.fromisoformat(end_date_str) if isinstance(end_date_str, str) else end_date_str
        
        total_qty = 0
        for row in mem_db.get("claims", []):
            if str(row.get("mbi")) != str(mbi):
                continue
            if str(row.get("id")) == str(claim_id):
                continue
                
            svc_d = row.get("sim_service_date") or row.get("service_date")
            if isinstance(svc_d, str):
                svc_d = date.fromisoformat(svc_d)
            elif isinstance(svc_d, datetime):
                svc_d = svc_d.date()
                
            if not (start_date <= svc_d <= end_date):
                continue
                
            hcpcs = row.get("hcpcs_code")
            proc_codes = row.get("procedure_codes", [])
            if isinstance(proc_codes, str):
                import json
                try: proc_codes = json.loads(proc_codes)
                except: proc_codes = []
            catheters = {'a4351', 'a4352', 'a4353'}
            is_catheter = (str(hcpcs).lower() in catheters) or any(str(c).lower() in catheters for c in proc_codes)
            if is_catheter:
                total_qty += int(row.get("quantity") or 0)
                
        return [MockRow({"total_qty": total_qty})]

    # 7. CLAIMS prior 180d billing sum (R-02 prior)
    if "sum(billing_amount) as total_bill" in q and "total_bill_14" not in q:
        npi = param_dict.get("npi")
        start_date_str = param_dict.get("start_date")
        end_date_str = param_dict.get("end_date")
        claim_id = param_dict.get("claim_id")
        
        start_date = date.fromisoformat(start_date_str) if isinstance(start_date_str, str) else start_date_str
        end_date = date.fromisoformat(end_date_str) if isinstance(end_date_str, str) else end_date_str
        
        total_bill = 0.0
        for row in mem_db.get("claims", []):
            if str(row.get("billing_npi")) != str(npi):
                continue
            if str(row.get("id")) == str(claim_id):
                continue
                
            svc_d = row.get("sim_service_date") or row.get("service_date")
            if isinstance(svc_d, str):
                svc_d = date.fromisoformat(svc_d)
            elif isinstance(svc_d, datetime):
                svc_d = svc_d.date()
                
            if start_date <= svc_d < end_date:
                total_bill += float(row.get("billing_amount") or 0.0)
                
        return [MockRow({"total_bill": total_bill})]

    # 8. CLAIMS rolling 14d billing sum (R-02 current)
    if "total_bill_14" in q:
        npi = param_dict.get("npi")
        start_date_str = param_dict.get("start_date")
        end_date_str = param_dict.get("end_date")
        claim_id = param_dict.get("claim_id")
        
        start_date = date.fromisoformat(start_date_str) if isinstance(start_date_str, str) else start_date_str
        end_date = date.fromisoformat(end_date_str) if isinstance(end_date_str, str) else end_date_str
        
        total_bill_14 = 0.0
        for row in mem_db.get("claims", []):
            if str(row.get("billing_npi")) != str(npi):
                continue
            if str(row.get("id")) == str(claim_id):
                continue
                
            svc_d = row.get("sim_service_date") or row.get("service_date")
            if isinstance(svc_d, str):
                svc_d = date.fromisoformat(svc_d)
            elif isinstance(svc_d, datetime):
                svc_d = svc_d.date()
                
            if start_date <= svc_d <= end_date:
                total_bill_14 += float(row.get("billing_amount") or 0.0)
                
        return [MockRow({"total_bill_14": total_bill_14})]

    # 9. CLAIMS distinct provider count check (R-03)
    if "provider_count" in q:
        mbi = param_dict.get("mbi")
        curr_ts_str = param_dict.get("curr_ts")
        claim_id = param_dict.get("claim_id")
        
        curr_ts = datetime.fromisoformat(curr_ts_str.replace("Z", "+00:00")) if isinstance(curr_ts_str, str) else curr_ts_str
        forty_eight_hours_ago = curr_ts - timedelta(hours=48)
        
        npis = set()
        for row in mem_db.get("claims", []):
            if str(row.get("mbi")) != str(mbi):
                continue
            if str(row.get("id")) == str(claim_id):
                continue
                
            ts_val = row.get("sim_service_ts")
            if not ts_val:
                sd = row.get("sim_service_date") or row.get("service_date")
                if isinstance(sd, str):
                    sd = date.fromisoformat(sd)
                elif isinstance(sd, datetime):
                    sd = sd.date()
                ts = datetime.combine(sd, datetime.min.time()).replace(tzinfo=timezone.utc)
            else:
                if isinstance(ts_val, str):
                    ts = datetime.fromisoformat(ts_val.replace("Z", "+00:00"))
                else:
                    ts = ts_val
                    
            if forty_eight_hours_ago <= ts <= curr_ts:
                npis.add(row.get("billing_npi"))
                
        return [MockRow({"provider_count": len(npis)})]

    # 10. CLAIMS simple count check (R-04)
    if "claims" in q and "match_count" in q:
        npi = param_dict.get("npi")
        start_date_str = param_dict.get("start_date")
        end_date_str = param_dict.get("end_date")
        
        start_date = date.fromisoformat(start_date_str) if isinstance(start_date_str, str) else start_date_str
        end_date = date.fromisoformat(end_date_str) if isinstance(end_date_str, str) else end_date_str
        
        count = 0
        for row in mem_db.get("claims", []):
            if str(row.get("billing_npi")) != str(npi):
                continue
                
            svc_d = row.get("sim_service_date") or row.get("service_date")
            if isinstance(svc_d, str):
                svc_d = date.fromisoformat(svc_d)
            elif isinstance(svc_d, datetime):
                svc_d = svc_d.date()
                
            if start_date <= svc_d <= end_date:
                count += 1
        return [MockRow({"match_count": count})]

    # Unsupported query: Return empty list to avoid raising, or let caller handle
    return []


async def run_query(query: str, params: list | None = None) -> list:
    """Run a BigQuery query asynchronously via thread pool or local in-memory DB."""
    mem_db = _in_memory_db.get()
    if mem_db is not None:
        # Route query through high-speed in-memory database simulation
        return _run_query_in_memory(query, params, mem_db)

    client = _get_client()
    job_config = bigquery.QueryJobConfig()
    if params:
        job_config.query_parameters = params
    result = await asyncio.to_thread(
        lambda: list(client.query(query, job_config=job_config).result())
    )
    return result


async def run_query_single(query: str, params: list | None = None):
    """Run a query and return the first row, or None."""
    rows = await run_query(query, params)
    return rows[0] if rows else None


async def insert_rows(table_name: str, rows: list[dict], use_load: bool = False) -> list:
    """Insert rows into a BigQuery table using streaming or load jobs."""
    client = _get_client()
    dataset = get_dataset()
    table_ref = f"{dataset}.{table_name}"
    if use_load:
        def _load():
            job = client.load_table_from_json(rows, table_ref)
            job.result()
            return []
        return await asyncio.to_thread(_load)
    else:
        errors = await asyncio.to_thread(
            client.insert_rows_json, table_ref, rows
        )
        return errors


async def run_dml(query: str, params: list | None = None) -> int:
    """Run a DML statement (INSERT/UPDATE/DELETE) and return affected row count."""
    client = _get_client()
    job_config = bigquery.QueryJobConfig()
    if params:
        job_config.query_parameters = params

    def _execute():
        job = client.query(query, job_config=job_config)
        job.result()  # wait for completion
        return job.num_dml_affected_rows or 0

    return await asyncio.to_thread(_execute)
