# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import pytest
from unittest.mock import AsyncMock, MagicMock
from services.appeals_service import AppealsService


@pytest.mark.anyio
async def test_appeals_level1_approved():
    # Arrange: Mock the DB queries to simulate finding a valid clinical consult
    import services.appeals_service as as_service
    original_run_query_single = as_service.run_query_single
    original_run_dml = as_service.run_dml
    original_insert_rows = as_service.insert_rows

    async def mock_run_query_single(query, params):
        if "claims" in query:
            return {
                "id": "claim_vance_01",
                "mbi": "VANCE732MBI",
                "sim_service_date": "2026-07-03",
                "billing_amount": 1800.0,
                "modifier": None,
                "prior_auth": False,
                "status": "held",
            }
        elif "appeals" in query:
            return {"count": 0}
        elif "consult_registry" in query:
            return {
                "consult_id": "consult_vance_01",
                "cpt_code": "99214",
                "sim_consult_date": "2026-07-01",
            }
        return None

    as_service.run_query_single = mock_run_query_single
    as_service.run_dml = AsyncMock(return_value=1)
    as_service.insert_rows = AsyncMock(return_value=[])

    try:
        # Act: Run appeal processing
        result = await AppealsService.process_appeal("claim_vance_01")

        # Assert: Level 1 should be approved, hold released
        assert result["success"] is True
        assert result["released"] is True
        assert result["level"] == 1
        assert result["admin_cost"] == 0.00
        assert "Automated Level 1 appeal approved" in result["msg"]

        # Ensure updates and ledger writes were made
        as_service.run_dml.assert_called_once()
        assert as_service.insert_rows.call_count == 2  # disbursement + appeal records
    finally:
        as_service.run_query_single = original_run_query_single
        as_service.run_dml = original_run_dml
        as_service.insert_rows = original_insert_rows


@pytest.mark.anyio
async def test_appeals_level2_escalated():
    # Arrange: Mock the DB queries to simulate NO consult evidence (William Jackson)
    import services.appeals_service as as_service
    original_run_query_single = as_service.run_query_single
    original_run_dml = as_service.run_dml
    original_insert_rows = as_service.insert_rows

    async def mock_run_query_single(query, params):
        if "claims" in query:
            return {
                "id": "claim_jackson_01",
                "mbi": "JACKSON999MBI",
                "sim_service_date": "2026-07-05",
                "billing_amount": 1200.0,
                "modifier": None,
                "prior_auth": False,
                "status": "held",
            }
        elif "appeals" in query:
            return {"count": 0}
        elif "consult_registry" in query:
            return None  # No matching consult!
        elif "mbi_locks" in query:
            return {"count": 0}  # Not locked yet
        return None

    as_service.run_query_single = mock_run_query_single
    as_service.run_dml = AsyncMock()
    as_service.insert_rows = AsyncMock(return_value=[])

    try:
        # Act
        result = await AppealsService.process_appeal("claim_jackson_01")

        # Assert: Level 1 should fail, escalated to Level 2 ALJ manual queue, MBI locked
        assert result["success"] is True
        assert result["released"] is False
        assert result["level"] == 2
        assert "Level 1 appeal rejected" in result["msg"]

        # Ensure appeal record, mbi lock, and alj queue rows were inserted
        assert as_service.insert_rows.call_count == 3  # appeal + mbi_lock + alj_queue
    finally:
        as_service.run_query_single = original_run_query_single
        as_service.run_dml = original_run_dml
        as_service.insert_rows = original_insert_rows
