# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import time
import uuid
import logging
from datetime import datetime, date, timedelta, timezone
from google.cloud import bigquery
from database import run_query, run_query_single, insert_rows, run_dml, get_dataset
from services.simulation_clock import simulation_clock

logger = logging.getLogger(__name__)


class AppealsService:
    """Implements the Two-Tier Appeals Adjudication workflow for CMS Fraud Shield."""

    @staticmethod
    async def process_appeal(claim_id: str) -> dict:
        """Processes an electronic appeal filed against a prepayment hold.

        Level 1: Automated consult-registry matching (SLA: completed under 3s, $0 administrative cost).
        Level 2: Escalation to Administrative Law Judge (ALJ) manual review queue and MBI lockdown.
        """
        start_wall_time = time.perf_counter()
        ds = get_dataset()
        now_sim = simulation_clock.now()

        # 1. Fetch claim details
        query_claim = f"""
            SELECT id, mbi, sim_service_date, billing_amount, modifier, prior_auth, status 
            FROM `{ds}.claims` 
            WHERE id = @claim_id
        """
        params_claim = [bigquery.ScalarQueryParameter("claim_id", "STRING", claim_id)]
        claim = await run_query_single(query_claim, params_claim)

        if not claim:
            return {
                "success": False,
                "msg": f"Claim ID {claim_id} not found in database."
            }

        # Validate that the claim is currently held to be eligible for appeal
        status = claim.get("status")
        if status != "held":
            return {
                "success": False,
                "msg": f"Appeal rejected: Claim {claim_id} is currently '{status}', not 'held'. Appeals are strictly constrained to claims under an active prepayment hold."
            }

        # Check for existing approved appeal to prevent duplicate disbursement
        query_exist = f"""
            SELECT count(*) as count 
            FROM `{ds}.appeals` 
            WHERE claim_id = @claim_id AND status = 'approved'
        """
        exist_chk = await run_query_single(query_exist, [bigquery.ScalarQueryParameter("claim_id", "STRING", claim_id)])
        if exist_chk and int(exist_chk["count"]) > 0:
            return {
                "success": False,
                "msg": f"Appeal rejected: Claim {claim_id} has already had an approved appeal and disbursement."
            }

        mbi = claim.get("mbi")
        billing_amount = float(claim.get("billing_amount") or 0.0)
        svc_date_val = claim.get("sim_service_date")
        if isinstance(svc_date_val, str):
            svc_date = date.fromisoformat(svc_date_val)
        elif isinstance(svc_date_val, datetime):
            svc_date = svc_date_val.date()
        else:
            svc_date = svc_date_val

        # 2. Check if a qualifying clinical consult exists in consult_registry (10-day window on either side of the claim service date, inclusive)
        start_window = svc_date - timedelta(days=10)
        end_window = svc_date + timedelta(days=10)

        query_consult = f"""
            SELECT consult_id, cpt_code, sim_consult_date 
            FROM `{ds}.consult_registry` 
            WHERE mbi = @mbi 
              AND cpt_code = '99214'
              AND sim_consult_date >= @start_window 
              AND sim_consult_date <= @end_window
        """
        params_consult = [
            bigquery.ScalarQueryParameter("mbi", "STRING", mbi or ""),
            bigquery.ScalarQueryParameter("start_window", "DATE", start_window.isoformat()),
            bigquery.ScalarQueryParameter("end_window", "DATE", end_window.isoformat()),
        ]
        consult = await run_query_single(query_consult, params_consult)

        # Level 1 Match condition: strictly requires corresponding telehealth consult CPT-99214 regardless of prior-auth presence
        level1_approved = (consult is not None)

        # Measure wall clock latency in milliseconds
        latency_ms = int((time.perf_counter() - start_wall_time) * 1000)
        appeal_id = f"appeal_{uuid.uuid4().hex[:12]}"

        if level1_approved:
            # LEVEL 1 APPROVED: Auto-release hold and disburse
            # Update claim status
            await run_dml(
                f"UPDATE `{ds}.claims` SET status = 'disbursed', risk_level = 'LOW' WHERE id = @claim_id",
                [bigquery.ScalarQueryParameter("claim_id", "STRING", claim_id)]
            )

            # Record disbursement entry
            await insert_rows("disbursements", [{
                "claim_id": claim_id,
                "amount": billing_amount,
                "sim_disbursed_at": now_sim.isoformat(),
            }])

            # Record approved appeal
            await insert_rows("appeals", [{
                "appeal_id": appeal_id,
                "claim_id": claim_id,
                "filed_at_sim": now_sim.isoformat(),
                "level": 1,
                "status": "approved",
                "latency_ms": latency_ms,
                "decided_at_sim": now_sim.isoformat(),
            }])

            return {
                "success": True,
                "appeal_id": appeal_id,
                "released": True,
                "level": 1,
                "latency_ms": latency_ms,
                "admin_cost": 0.00,
                "msg": "Automated Level 1 appeal approved. Clinical consult evidence matching telehealth CPT-99214 found. Prepayment hold released, and disbursement executed.",
            }
        else:
            # LEVEL 1 REJECTED: Lockdown MBI & escalate to Level 2 ALJ Manual Queue
            # Record failed appeal
            await insert_rows("appeals", [{
                "appeal_id": appeal_id,
                "claim_id": claim_id,
                "filed_at_sim": now_sim.isoformat(),
                "level": 1,
                "status": "rejected",
                "latency_ms": latency_ms,
                "decided_at_sim": now_sim.isoformat(),
            }])

            # Compromise lockdown on MBI (MBI lock)
            if mbi:
                # Add lockdown row if not already present
                query_chk_lock = f"SELECT count(*) as count FROM `{ds}.mbi_locks` WHERE mbi = @mbi"
                lock_chk = await run_query_single(query_chk_lock, [bigquery.ScalarQueryParameter("mbi", "STRING", mbi)])
                if not lock_chk or int(lock_chk["count"]) == 0:
                    await insert_rows("mbi_locks", [{
                        "mbi": mbi,
                        "locked_at_sim": now_sim.isoformat(),
                        "reason": "Prepayment appeal rejection: Suspicious urological catheter billing with identity fabrication/theft risk.",
                    }])

            # Place on Level 2 ALJ manual review queue
            await insert_rows("alj_queue", [{
                "claim_id": claim_id,
                "appeal_id": appeal_id,
                "entered_at_sim": now_sim.isoformat(),
            }])

            return {
                "success": True,
                "appeal_id": appeal_id,
                "released": False,
                "level": 2,
                "latency_ms": latency_ms,
                "msg": "Automated Level 1 appeal rejected. No qualifying medical consult found in clinical registry. MBI has been placed under protective lockdown, and claim escalated to Level 2 ALJ manual review queue.",
            }
