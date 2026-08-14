# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import logging
from datetime import datetime, date, timedelta, timezone
from google.cloud import bigquery
from database import run_query, get_dataset, run_query_single

logger = logging.getLogger(__name__)


class RulesService:
    """Deterministic, compliance-aligned Rules Engine for CMS Fraud Shield."""

    @staticmethod
    async def check_r01_quantity_cap(claim: dict) -> bool:
        """R-01: Billed quantity exceeds the condition-assigned LCD cap (30-150 units/month).

        Excludes claims with valid clinical prior authorization or specific modifiers.
        Tracks rolling 30-day aggregate quantity billed for the beneficiary across ALL NPIs.
        """
        # Check HCPCS code: if the claim HCPCS code is not a catheter code, return False
        hcpcs = claim.get("hcpcs_code") or ""
        procedure_codes = claim.get("procedure_codes") or []
        catheter_codes = {"A4351", "A4352", "A4353"}
        
        has_catheter = False
        if hcpcs in catheter_codes:
            has_catheter = True
        elif procedure_codes:
            if any(code in catheter_codes for code in procedure_codes):
                has_catheter = True
                
        if not has_catheter:
            return False

        # If the claim has clinical prior-auth or KX modifier, they are exempt
        if claim.get("prior_auth") is True or claim.get("modifier") == "KX":
            return False

        mbi = claim.get("mbi")
        if not mbi:
            return False

        # Get service date of current claim
        svc_date_val = claim.get("sim_service_date") or claim.get("service_date")
        if isinstance(svc_date_val, str):
            svc_date = date.fromisoformat(svc_date_val)
        elif isinstance(svc_date_val, datetime):
            svc_date = svc_date_val.date()
        else:
            svc_date = svc_date_val

        # 1. Fetch beneficiary's individual LCD cap
        ds = get_dataset()
        query_ben = f"SELECT lcd_cap FROM `{ds}.beneficiaries` WHERE mbi = @mbi"
        params_ben = [bigquery.ScalarQueryParameter("mbi", "STRING", mbi)]
        ben_row = await run_query_single(query_ben, params_ben)
        lcd_cap = ben_row["lcd_cap"] if ben_row else 30  # Default cap to 30 units/month if not found

        # 2. Check current claim quantity alone
        claim_qty = int(claim.get("quantity") or 0)
        if claim_qty > lcd_cap:
            return True

        # 3. Check rolling 30-day aggregate quantity billed across all NPIs for catheter codes
        start_date = svc_date - timedelta(days=30)
        query_agg = f"""
            SELECT SUM(quantity) as total_qty 
            FROM `{ds}.claims` 
            WHERE mbi = @mbi 
              AND sim_service_date >= @start_date 
              AND sim_service_date <= @end_date
              AND id != @claim_id
              AND (hcpcs_code IN ('A4351', 'A4352', 'A4353') OR EXISTS (
                  SELECT 1 FROM UNNEST(JSON_EXTRACT_STRING_ARRAY(procedure_codes)) code 
                  WHERE code IN ('A4351', 'A4352', 'A4353')
              ))
        """
        params_agg = [
            bigquery.ScalarQueryParameter("mbi", "STRING", mbi),
            bigquery.ScalarQueryParameter("start_date", "DATE", start_date.isoformat()),
            bigquery.ScalarQueryParameter("end_date", "DATE", svc_date.isoformat()),
            bigquery.ScalarQueryParameter("claim_id", "STRING", claim.get("id") or ""),
        ]
        agg_row = await run_query_single(query_agg, params_agg)
        prior_qty = int(agg_row["total_qty"] or 0) if agg_row else 0

        if (prior_qty + claim_qty) > lcd_cap:
            return True

        return False

    @staticmethod
    async def check_r02_dormant_supplier_spike(claim: dict) -> bool:
        """R-02: Dormant Supplier Spike.

        Supplier has <$5,000 billing history in trailing 180 days, and exceeds $100,000 in rolling 14 days.
        """
        npi = claim.get("billing_npi") or claim.get("provider_id")
        if not npi:
            return False

        svc_date_val = claim.get("sim_service_date") or claim.get("service_date")
        if isinstance(svc_date_val, str):
            svc_date = date.fromisoformat(svc_date_val)
        elif isinstance(svc_date_val, datetime):
            svc_date = svc_date_val.date()
        else:
            svc_date = svc_date_val

        ds = get_dataset()

        # 1. Trailing 180 days prior billing (excluding the 14-day window of the spike)
        one_eighty_days_ago = svc_date - timedelta(days=180)
        fourteen_days_ago = svc_date - timedelta(days=14)

        query_prior = f"""
            SELECT SUM(billing_amount) as total_bill 
            FROM `{ds}.claims` 
            WHERE billing_npi = @npi 
              AND sim_service_date >= @start_date 
              AND sim_service_date < @end_date
              AND id != @claim_id
        """
        params_prior = [
            bigquery.ScalarQueryParameter("npi", "STRING", npi),
            bigquery.ScalarQueryParameter("start_date", "DATE", one_eighty_days_ago.isoformat()),
            bigquery.ScalarQueryParameter("end_date", "DATE", fourteen_days_ago.isoformat()),
            bigquery.ScalarQueryParameter("claim_id", "STRING", claim.get("id") or ""),
        ]
        prior_row = await run_query_single(query_prior, params_prior)
        prior_billing = float(prior_row["total_bill"] or 0.0) if prior_row else 0.0

        if prior_billing >= 5000.0:
            return False  # Not a dormant supplier

        # 2. Rolling 14-day billing (including current claim)
        query_current = f"""
            SELECT SUM(billing_amount) as total_bill_14 
            FROM `{ds}.claims` 
            WHERE billing_npi = @npi 
              AND sim_service_date >= @start_date 
              AND sim_service_date <= @end_date
              AND id != @claim_id
        """
        params_current = [
            bigquery.ScalarQueryParameter("npi", "STRING", npi),
            bigquery.ScalarQueryParameter("start_date", "DATE", fourteen_days_ago.isoformat()),
            bigquery.ScalarQueryParameter("end_date", "DATE", svc_date.isoformat()),
            bigquery.ScalarQueryParameter("claim_id", "STRING", claim.get("id") or ""),
        ]
        current_row = await run_query_single(query_current, params_current)
        current_14d_billing = float(current_row["total_bill_14"] or 0.0) if current_row else 0.0
        current_claim_amount = float(claim.get("billing_amount") or 0.0)

        if (current_14d_billing + current_claim_amount) > 100000.0:
            return True

        return False

    @staticmethod
    async def check_r03_mbi_velocity(claim: dict) -> bool:
        """R-03: MBI Multi-provider Velocity.

        MBI billed by 3 or more distinct NPIs within rolling 48 hours.
        """
        mbi = claim.get("mbi")
        if not mbi:
            return False

        # Get simulated timestamp of current claim
        claim_ts_val = claim.get("sim_service_ts")
        if not claim_ts_val:
            svc_date_val = claim.get("sim_service_date") or claim.get("service_date")
            if isinstance(svc_date_val, str):
                svc_date = date.fromisoformat(svc_date_val)
            elif isinstance(svc_date_val, datetime):
                svc_date = svc_date_val.date()
            else:
                svc_date = svc_date_val
            # Convert date to 00:00:00 UTC string
            claim_ts_val = datetime.combine(svc_date, datetime.min.time()).replace(tzinfo=timezone.utc).isoformat()
        elif isinstance(claim_ts_val, datetime):
            claim_ts_val = claim_ts_val.isoformat()

        ds = get_dataset()

        query = f"""
            SELECT COUNT(DISTINCT billing_npi) as provider_count 
            FROM `{ds}.claims` 
            WHERE mbi = @mbi 
              AND sim_service_ts >= TIMESTAMP_SUB(TIMESTAMP(@curr_ts), INTERVAL 48 HOUR)
              AND sim_service_ts <= TIMESTAMP(@curr_ts)
              AND id != @claim_id
        """
        params = [
            bigquery.ScalarQueryParameter("mbi", "STRING", mbi),
            bigquery.ScalarQueryParameter("curr_ts", "STRING", claim_ts_val),
            bigquery.ScalarQueryParameter("claim_id", "STRING", claim.get("id") or ""),
        ]
        row = await run_query_single(query, params)
        prior_providers = int(row["provider_count"] or 0) if row else 0

        # If we include the current claim's provider (which is distinct)
        # Check if the set size reaches >= 3
        current_provider = claim.get("billing_npi") or claim.get("provider_id")
        
        # Verify if current provider is already in the count
        query_check_curr = f"""
            SELECT COUNT(*) as count 
            FROM `{ds}.claims` 
            WHERE mbi = @mbi 
              AND billing_npi = @curr_npi
              AND sim_service_ts >= TIMESTAMP_SUB(TIMESTAMP(@curr_ts), INTERVAL 48 HOUR)
              AND sim_service_ts <= TIMESTAMP(@curr_ts)
              AND id != @claim_id
        """
        params_curr = [
            bigquery.ScalarQueryParameter("mbi", "STRING", mbi),
            bigquery.ScalarQueryParameter("curr_npi", "STRING", current_provider or ""),
            bigquery.ScalarQueryParameter("curr_ts", "STRING", claim_ts_val),
            bigquery.ScalarQueryParameter("claim_id", "STRING", claim.get("id") or ""),
        ]
        row_curr = await run_query_single(query_check_curr, params_curr)
        is_curr_already_billed = (int(row_curr["count"] or 0) > 0) if row_curr else False

        total_distinct_providers = prior_providers
        if not is_curr_already_billed and current_provider:
            total_distinct_providers += 1

        return total_distinct_providers >= 3

    @staticmethod
    async def check_r04_pecos_change(claim: dict) -> bool:
        """R-04: PECOS Ownership or Address change within 90 days.

        Checks if the supplier had an Authorized Official change, or address change to a CMRA address,
        within 90 days of the current service date, AND has an active billing spike (> $100,000 in 14 days).
        """
        npi = claim.get("billing_npi") or claim.get("provider_id")
        if not npi:
            return False

        svc_date_val = claim.get("sim_service_date") or claim.get("service_date")
        if isinstance(svc_date_val, str):
            svc_date = date.fromisoformat(svc_date_val)
        elif isinstance(svc_date_val, datetime):
            svc_date = svc_date_val.date()
        else:
            svc_date = svc_date_val

        ds = get_dataset()

        # R-04 requires a billing spike (R-02 criteria: exceeding $100,000 in rolling 14 days)
        fourteen_days_ago = svc_date - timedelta(days=14)
        query_current = f"""
            SELECT SUM(billing_amount) as total_bill_14 
            FROM `{ds}.claims` 
            WHERE billing_npi = @npi 
              AND sim_service_date >= @start_date 
              AND sim_service_date <= @end_date
              AND id != @claim_id
        """
        params_current = [
            bigquery.ScalarQueryParameter("npi", "STRING", npi),
            bigquery.ScalarQueryParameter("start_date", "DATE", fourteen_days_ago.isoformat()),
            bigquery.ScalarQueryParameter("end_date", "DATE", svc_date.isoformat()),
            bigquery.ScalarQueryParameter("claim_id", "STRING", claim.get("id") or ""),
        ]
        current_row = await run_query_single(query_current, params_current)
        current_14d_billing = float(current_row["total_bill_14"] or 0.0) if current_row else 0.0
        current_claim_amount = float(claim.get("billing_amount") or 0.0)

        if (current_14d_billing + current_claim_amount) <= 100000.0:
            return False  # Stable billing never triggers R-04

        ninety_days_ago = svc_date - timedelta(days=90)

        # Query PECOS address changes matching CMRA list, or Authorized Official changes
        query = f"""
            SELECT COUNT(*) as match_count 
            FROM `{ds}.pecos_events` pe
            LEFT JOIN `{ds}.cmra_addresses` cm ON pe.new_value = cm.address
            WHERE pe.npi = @npi 
              AND pe.sim_event_date >= @start_date 
              AND pe.sim_event_date <= @end_date
              AND (pe.event_type = 'AO_CHANGE' OR cm.address IS NOT NULL)
        """
        params = [
            bigquery.ScalarQueryParameter("npi", "STRING", npi),
            bigquery.ScalarQueryParameter("start_date", "DATE", ninety_days_ago.isoformat()),
            bigquery.ScalarQueryParameter("end_date", "DATE", svc_date.isoformat()),
        ]
        row = await run_query_single(query, params)
        return (int(row["match_count"] or 0) > 0) if row else False

    @classmethod
    async def evaluate_claim(cls, claim: dict) -> dict:
        """Evaluates a claim against rules, computes risk scores and prepay status.

        Discrete Scoring model:
          - 0 hits -> 0.00 score, status 'disbursed'
          - 1 hit -> 0.70 score, status 'queued' (Auditor Review Queue)
          - >=2 hits -> 0.95 score, status 'held' (Prepayment Hold)
          - Locked MBIs count as 1 corroborating hit.
        """
        # 1. Check if provider is revoked or flagged for revocation (FR-18)
        npi = claim.get("billing_npi") or claim.get("provider_id")
        is_provider_revoked = False
        if npi:
            ds = get_dataset()
            query_prov = f"""
                SELECT * 
                FROM `{ds}.pecos_records` 
                WHERE npi = @npi
            """
            params_prov = [bigquery.ScalarQueryParameter("npi", "STRING", npi)]
            prov_row = await run_query_single(query_prov, params_prov)
            if prov_row:
                status_val = ""
                row_keys = prov_row.keys() if hasattr(prov_row, "keys") else []
                if "enrollment_status" in row_keys:
                    status_val = str(prov_row.get("enrollment_status") or "").lower()
                elif "status" in row_keys:
                    status_val = str(prov_row.get("status") or "").lower()
                else:
                    try:
                        status_val = str(prov_row.get("enrollment_status") or prov_row.get("status") or "").lower()
                    except Exception:
                        pass
                
                if "revok" in status_val or "flagged" in status_val:
                    is_provider_revoked = True

        # 2. Check if MBI is locked (active compromise lockdown)
        mbi = claim.get("mbi")
        is_mbi_locked = False
        if mbi:
            ds = get_dataset()
            query_lock = f"SELECT COUNT(*) as count FROM `{ds}.mbi_locks` WHERE mbi = @mbi"
            params_lock = [bigquery.ScalarQueryParameter("mbi", "STRING", mbi)]
            lock_row = await run_query_single(query_lock, params_lock)
            is_mbi_locked = (int(lock_row["count"] or 0) > 0) if lock_row else False

        # 3. Evaluate all deterministic rules
        r01 = await cls.check_r01_quantity_cap(claim)
        r02 = await cls.check_r02_dormant_supplier_spike(claim)
        r03 = await cls.check_r03_mbi_velocity(claim)
        r04 = await cls.check_r04_pecos_change(claim)

        hit_count = 0
        hits = []
        if is_provider_revoked:
            # Revoked provider adds 2 hits immediately to hold the claim
            hit_count += 2
            hits.append("FR-18: PECOS Provider Enrollment Revoked or Flagged")
        if r01:
            hit_count += 1
            hits.append("R-01: LCD Quantity Cap Exceeded")
        if r02:
            hit_count += 1
            hits.append("R-02: Dormant Supplier Spike")
        if r03:
            hit_count += 1
            hits.append("R-03: MBI Multi-provider Velocity Alert")
        if r04:
            hit_count += 1
            hits.append("R-04: PECOS CMRA AO/Address Change Flag")

        # Locked MBI adds a corroborating hit to expedite hold
        if is_mbi_locked:
            hit_count += 1
            hits.append("MBI_LOCK: Compromised Beneficiary Lockdown")

        # 4. Discrete scoring & prepay lifecycle
        if is_mbi_locked:
            score = 1.00
            status = "held"
            risk_level = "CRITICAL"
            if "MBI Lock-as-Hit Triggered" not in "".join(hits):
                hits.append("MBI Lock-as-Hit Triggered: Beneficiary MBI under active compromise lock")
        elif hit_count >= 2:
            score = 0.95
            status = "held"
            risk_level = "CRITICAL"
        elif hit_count == 1:
            score = 0.70
            status = "queued"
            risk_level = "HIGH"
        else:
            score = 0.00
            status = "disbursed"
            risk_level = "LOW"

        return {
            "score": score,
            "status": status,
            "risk_level": risk_level,
            "hits": hits,
            "hit_count": hit_count,
            "is_mbi_locked": is_mbi_locked,
        }
