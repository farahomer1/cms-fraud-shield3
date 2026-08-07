# Copyright 2026 Google. Google provides these Materials as "Free Evaluation Services" subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from google.cloud import bigquery
from database import get_dataset, run_query, run_query_single, run_dml, insert_rows
from services.simulation_clock import simulation_clock
from services.appeals_service import AppealsService

logger = logging.getLogger(__name__)


class ScenarioDriver:
    """Automates timeline-based simulation scenario actions in a non-blocking background loop.

    Coordinates deterministic simulation milestones:
      - Day 2 Milestone: File automated Level 1 appeal for Eleanor Vance (approved via telehealth check).
      - Day 5 Milestone: File automated Level 1 appeal for William Jackson (escalates to Level 2 ALJ manual review).
      - SLA Queue Fallback: Automatically releases review-queue claims exceeding 3 simulation days to 'disbursed'.
    """

    _running = False
    _task = None
    _vance_processed = False
    _jackson_processed = False

    @classmethod
    def start(cls):
        """Starts the scenario driver background daemon."""
        if cls._running:
            logger.info("Scenario Driver is already running.")
            return
        cls._running = True
        cls._task = asyncio.create_task(cls._run_loop())
        logger.info("Scenario Driver background daemon started successfully.")

    @classmethod
    def stop(cls):
        """Stops the scenario driver background daemon."""
        cls._running = False
        if cls._task:
            cls._task.cancel()
            cls._task = None
        logger.info("Scenario Driver background daemon stopped.")

    @classmethod
    async def _run_loop(cls):
        """Idempotent background simulation clock monitoring loop."""
        ds = get_dataset()
        while cls._running:
            try:
                sim_now = simulation_clock.now()
                sim_start = simulation_clock.sim_start
                sim_days_elapsed = (sim_now - sim_start).total_seconds() / (24 * 3600)

                logger.debug(
                    f"Scenario Driver: Sim clock is at {sim_now.isoformat()} "
                    f"({sim_days_elapsed:.2f} sim days elapsed since simulation start)"
                )

                # ─────────────────────────────────────────────────────────────
                # 1. Day 2 Milestone: Eleanor Vance Appeal Filing
                # ─────────────────────────────────────────────────────────────
                if sim_days_elapsed >= 2.0 and not cls._vance_processed:
                    # Query for held claims matching Vance
                    query_vance = f"""
                        SELECT id FROM `{ds}.claims` 
                        WHERE mbi = 'MC_VANCE_01' AND status = 'held'
                        LIMIT 1
                    """
                    vance_claim = await run_query_single(query_vance)
                    if vance_claim:
                        claim_id = vance_claim["id"]
                        # Check if an appeal is already registered in the appeals table
                        query_app = f"SELECT count(*) as count FROM `{ds}.appeals` WHERE claim_id = @claim_id"
                        app_count = await run_query_single(
                            query_app, [bigquery.ScalarQueryParameter("claim_id", "STRING", claim_id)]
                        )
                        if not app_count or int(app_count["count"]) == 0:
                            logger.info(f"Scenario Driver: Milestone Day 2 reached. Filing appeal for Eleanor Vance (Claim ID: {claim_id})")
                            res = await AppealsService.process_appeal(claim_id)
                            logger.info(f"Scenario Driver Vance appeal result: {res.get('msg')}")
                        cls._vance_processed = True
                    else:
                        # If no held claim found, maybe the batch hasn't run or she was already processed
                        logger.debug("Scenario Driver: Day 2 Vance held claim not found. Skipping or waiting.")

                # ─────────────────────────────────────────────────────────────
                # 2. Day 5 Milestone: William Jackson Appeal Filing
                # ─────────────────────────────────────────────────────────────
                if sim_days_elapsed >= 5.0 and not cls._jackson_processed:
                    # Query for held claims matching Jackson
                    query_jackson = f"""
                        SELECT id FROM `{ds}.claims` 
                        WHERE mbi = 'JACKSON999MBI' AND status = 'held'
                        LIMIT 1
                    """
                    jackson_claim = await run_query_single(query_jackson)
                    if jackson_claim:
                        claim_id = jackson_claim["id"]
                        # Check if appeal already registered
                        query_app = f"SELECT count(*) as count FROM `{ds}.appeals` WHERE claim_id = @claim_id"
                        app_count = await run_query_single(
                            query_app, [bigquery.ScalarQueryParameter("claim_id", "STRING", claim_id)]
                        )
                        if not app_count or int(app_count["count"]) == 0:
                            logger.info(f"Scenario Driver: Milestone Day 5 reached. Filing appeal for William Jackson (Claim ID: {claim_id})")
                            res = await AppealsService.process_appeal(claim_id)
                            logger.info(f"Scenario Driver Jackson appeal result (escalation expected): {res.get('msg')}")
                        cls._jackson_processed = True
                    else:
                        logger.debug("Scenario Driver: Day 5 Jackson held claim not found. Skipping or waiting.")

                # ─────────────────────────────────────────────────────────────
                # 3. SLA Queue Fallback: Release claims queued for > 3 simulation days
                # ─────────────────────────────────────────────────────────────
                await cls._process_sla_queue_fallbacks(ds, sim_now)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in Scenario Driver background iteration: {e}", exc_info=True)

            # Sleep for 5 real wall-clock seconds before checking the virtual clock again
            await asyncio.sleep(5)

    @classmethod
    async def _process_sla_queue_fallbacks(cls, ds: str, sim_now: datetime):
        """Finds any claims in the review queue that have exceeded the 3 simulation days SLA,

        automatically releasing them to 'disbursed' to enforce clinical/administrative limits.
        """
        # 3 simulated days = 72 hours
        sla_threshold_time = sim_now - timedelta(days=3)
        query_sla = f"""
            SELECT id, billing_amount FROM `{ds}.claims`
            WHERE status = 'queued'
              AND queued_at_sim IS NOT NULL
              AND queued_at_sim <= @threshold
        """
        params_sla = [bigquery.ScalarQueryParameter("threshold", "TIMESTAMP", sla_threshold_time.isoformat())]
        overdue_claims = await run_query(query_sla, params_sla)

        if overdue_claims:
            logger.info(f"Scenario Driver: Identified {len(overdue_claims)} claims breaching the 3-day review SLA. Executing auto-release.")
            for claim in overdue_claims:
                claim_id = claim["id"]
                billing_amount = float(claim["billing_amount"] or 0.0)

                # 1. Update claim status
                await run_dml(
                    f"""
                    UPDATE `{ds}.claims` 
                    SET status = 'disbursed', risk_level = 'LOW', sla_breached = TRUE 
                    WHERE id = @claim_id
                    """,
                    [bigquery.ScalarQueryParameter("claim_id", "STRING", claim_id)]
                )

                # 2. Record disbursement row
                await insert_rows("disbursements", [{
                    "claim_id": claim_id,
                    "amount": billing_amount,
                    "sim_disbursed_at": sim_now.isoformat(),
                }])

                logger.info(f"Scenario Driver SLA Fallback: Claim ID {claim_id} automatically disbursed due to SLA breach.")
