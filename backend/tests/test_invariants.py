# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import pytest
import uuid
import json
from unittest.mock import AsyncMock, MagicMock, patch
from services.rules_service import RulesService
from routes.claims import router
from fastapi import HTTPException
from pydantic import BaseModel

@pytest.mark.anyio
async def test_lock_as_hit_invariant():
    """FR-12: If an MBI is actively locked, any claim evaluates to score 1.00 and held status immediately."""
    import services.rules_service as rs
    original_run_query_single = rs.run_query_single

    async def mock_run_query_single(query, params):
        if "mbi_locks" in query:
            # Active lock present
            return {"count": 1}
        if "COUNT(DISTINCT billing_npi)" in query:
            return {"provider_count": 0}
        if "COUNT(*)" in query:
            return {"count": 0}
        return None

    rs.run_query_single = mock_run_query_single

    try:
        claim = {
            "id": "claim_test_lock",
            "mbi": "LOCKED123MBI",
            "quantity": 10,
            "billing_amount": 100.0,
            "sim_service_ts": "2026-07-03T10:00:00Z",
        }
        res = await RulesService.evaluate_claim(claim)
        assert res["score"] == 1.00
        assert res["status"] == "held"
        assert any("MBI Lock-as-Hit Triggered" in hit for hit in res["hits"])
    finally:
        rs.run_query_single = original_run_query_single


@pytest.mark.anyio
async def test_sla_timer_breached_no_release_invariant():
    """FR-8 & FR-9: Verify that breaching 24h SLA queue window sets sla_breached=True but performs NO silent auto-release."""
    from datetime import datetime, timezone, timedelta
    from services.scenario_driver import ScenarioDriver
    import services.scenario_driver as sd

    original_run_query = sd.run_query
    original_run_dml = sd.run_dml

    mock_claims = [{
        "id": "claim_vance_01",
        "claim_number": "CLM-VANCE-01",
        "mbi": "VANCE732MBI",
        "provider_id": "NPI_VIK_01",
        "billing_amount": 180 * 15.0,
        "status": "queued",
        "queued_at_sim": "2026-07-03T10:00:00Z"
    }]

    run_dml_calls = []

    async def mock_run_query(query, params=None):
        if "claims" in query:
            return mock_claims
        return []

    async def mock_run_dml(query, params=None):
        run_dml_calls.append((query, params))
        return 1

    sd.run_query = mock_run_query
    sd.run_dml = mock_run_dml

    try:
        # Run SLA check at 25 simulated hours past claim queue time
        clock_time = datetime(2026, 7, 4, 12, 0, 0, tzinfo=timezone.utc)
        with patch("services.scenario_driver.simulation_clock.now", return_value=clock_time):
            await ScenarioDriver._process_sla_queue_fallbacks("fake_ds", clock_time)

        # Check if DML update was called to mark SLA breached, but NOT status update to 'disbursed'
        assert len(run_dml_calls) > 0
        sla_updated = False
        disbursed_called = False
        for query, params in run_dml_calls:
            if "sla_breached = TRUE" in query:
                sla_updated = True
            if "status = 'disbursed'" in query:
                disbursed_called = True
        
        assert sla_updated is True
        assert disbursed_called is False, "SLA breach should keep the claim queued and not silently disburse/pay it!"
    finally:
        sd.run_query = original_run_query
        sd.run_dml = original_run_dml
