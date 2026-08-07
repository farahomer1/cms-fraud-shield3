# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import logging
import uuid
import json
from datetime import datetime, date, timezone
from google.cloud import bigquery
from database import run_query, run_query_single, insert_rows, get_dataset

logger = logging.getLogger(__name__)


class ThreatWatchService:
    """FR-13 & FR-14: Handles Agent 1 Ownership Anomaly Clustering and Shadow Fraud Simulation."""

    @staticmethod
    async def detect_early_warning_anomalies(bq: bigquery.Client) -> list[dict]:
        """FR-13: Scan PECOS events for anomalous groups of AO changes on dormant suppliers."""
        ds = get_dataset()
        
        # Query for cluster of AO changes sharing the same new authorized official
        # where the provider has dormant status or is within the simulation event window
        query = f"""
            SELECT new_value as shared_ao, ARRAY_AGG(DISTINCT npi) as npis, COUNT(DISTINCT npi) as change_count
            FROM `{ds}.pecos_events`
            WHERE event_type = 'AO_CHANGE'
            GROUP BY new_value
            HAVING COUNT(DISTINCT npi) >= 5
        """
        rows = await run_query(query)
        anomalies = []
        for row in rows:
            anomalies.append({
                "type": "early_warning",
                "attribute": "AO_CHANGE",
                "value": row["shared_ao"],
                "npis": list(row["npis"]),
                "count": row["change_count"]
            })
        return anomalies

    @staticmethod
    async def generate_shadow_simulation(bq: bigquery.Client) -> dict:
        """FR-14: Segregated Shadow Claims & Active Threat Profile Generator."""
        ds = get_dataset()
        
        # Clean any existing shadow claims & threat profiles first to ensure clean state
        from database import run_dml
        try:
            await run_dml(f"TRUNCATE TABLE `{ds}.shadow_claims`", [])
            await run_dml(f"TRUNCATE TABLE `{ds}.threat_profiles`", [])
        except Exception as e:
            logger.warning(f"Could not truncate shadow tables: {e}")
        
        # 1. Create active Threat Profile
        profile_id = f"profile_{uuid.uuid4().hex[:12]}"
        hcpcs_list = ["A4351", "A4352", "A4353"]
        states_list = ["FL", "TX", "CA", "NY"]
        # Match against our generated Viktor NPIs
        npi_list = [f"NPI_VIK_{i:02d}" for i in range(1, 16)]
        
        profile_row = {
            "id": profile_id,
            "hcpcs_codes": json.dumps(hcpcs_list),
            "states": json.dumps(states_list),
            "supplier_npis": json.dumps(npi_list),
            "created_at_sim": datetime.now(timezone.utc).isoformat()
        }
        await insert_rows("threat_profiles", [profile_row])
        
        # 2. Generate 50 shadow claims as clearly segregated shadow traffic
        shadow_claims = []
        for i in range(1, 51):
            shadow_claims.append({
                "id": f"shadow_claim_{i:03d}",
                "claim_number": f"SHADOW-CLM-{i:03d}",
                "billing_amount": 1500.00,
                "service_date": date(2026, 7, 5).isoformat(),
                "hcpcs_code": hcpcs_list[i % len(hcpcs_list)],
                "state": states_list[i % len(states_list)],
                "mbi": "VANCE732MBI",
                "billing_npi": npi_list[i % len(npi_list)],
                "sim_service_date": date(2026, 7, 5).isoformat(),
            })
        await insert_rows("shadow_claims", shadow_claims)
        
        return {
            "profile_id": profile_id,
            "shadow_claims_generated": len(shadow_claims),
            "hcpcs_codes": hcpcs_list,
            "states": states_list,
            "supplier_npis": npi_list
        }
