# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import pytest
from unittest.mock import AsyncMock, MagicMock
from services.rules_service import RulesService


@pytest.mark.anyio
async def test_r01_quantity_cap_exempt():
    # Prior authorization or KX modifier makes claim exempt from quantity checks
    claim_exempt_pa = {"mbi": "VANCE732MBI", "quantity": 150, "prior_auth": True}
    claim_exempt_mod = {"mbi": "VANCE732MBI", "quantity": 150, "modifier": "KX"}

    r01_pa = await RulesService.check_r01_quantity_cap(claim_exempt_pa)
    r01_mod = await RulesService.check_r01_quantity_cap(claim_exempt_mod)

    assert r01_pa is False
    assert r01_mod is False


@pytest.mark.anyio
async def test_r01_quantity_cap_violation():
    # Mock database query helper
    import services.rules_service as rs
    original_run_query_single = rs.run_query_single

    # Mock beneficiary fetch and aggregate claims fetch
    async def mock_run_query_single(query, params):
        if "beneficiaries" in query:
            return {"lcd_cap": 100}
        elif "claims" in query:
            return {"total_qty": 0}
        return None

    rs.run_query_single = mock_run_query_single

    try:
        # Quantity 120 vs cap of 100
        claim_violation = {
            "id": "claim_01",
            "mbi": "VANCE732MBI",
            "quantity": 120,
            "sim_service_date": "2026-07-03",
            "hcpcs_code": "A4351",
        }
        r01_hit = await RulesService.check_r01_quantity_cap(claim_violation)
        assert r01_hit is True

        # Quantity 50 vs cap of 100 (No single claim violation)
        claim_ok = {
            "id": "claim_02",
            "mbi": "VANCE732MBI",
            "quantity": 50,
            "sim_service_date": "2026-07-03",
            "hcpcs_code": "A4351",
        }
        r01_ok = await RulesService.check_r01_quantity_cap(claim_ok)
        assert r01_ok is False
    finally:
        rs.run_query_single = original_run_query_single


@pytest.mark.anyio
async def test_r02_dormant_supplier_spike():
    import services.rules_service as rs
    original_run_query_single = rs.run_query_single

    # Mock BQ queries for dormant status ($0.0) and current spike ($105,000)
    async def mock_run_query_single(query, params):
        if "id != @claim_id" in query and "sim_service_date < @end_date" in query:
            # Trailing 180-day prior billing
            return {"total_bill": 1200.0}
        elif "id != @claim_id" in query and "sim_service_date <= @end_date" in query:
            # Rolling 14-day current billing prior to current claim
            return {"total_bill_14": 5000.0}
        return None

    rs.run_query_single = mock_run_query_single

    try:
        claim_spike = {
            "id": "claim_03",
            "billing_npi": "NPI_VIK_01",
            "billing_amount": 105000.0,
            "sim_service_date": "2026-07-05",
        }
        r02_hit = await RulesService.check_r02_dormant_supplier_spike(claim_spike)
        assert r02_hit is True
    finally:
        rs.run_query_single = original_run_query_single


@pytest.mark.anyio
async def test_r03_mbi_velocity():
    import services.rules_service as rs
    original_run_query_single = rs.run_query_single

    async def mock_run_query_single(query, params):
        if "COUNT(DISTINCT billing_npi)" in query:
            # Already billed by 2 other providers
            return {"provider_count": 2}
        elif "COUNT(*)" in query:
            # Check if current provider has already billed this MBI (False)
            return {"count": 0}
        return None

    rs.run_query_single = mock_run_query_single

    try:
        claim_vel = {
            "id": "claim_04",
            "mbi": "VANCE732MBI",
            "billing_npi": "NPI_VIK_03",
            "sim_service_date": "2026-07-04",
        }
        r03_hit = await RulesService.check_r03_mbi_velocity(claim_vel)
        assert r03_hit is True
    finally:
        rs.run_query_single = original_run_query_single


@pytest.mark.anyio
async def test_discrete_scoring_holds():
    import services.rules_service as rs
    original_run_query_single = rs.run_query_single

    # Mock evaluate_claim parts to mock-evaluate all 4 rules
    async def mock_run_query_single(query, params):
        if "mbi_locks" in query:
            return {"count": 0}
        return None

    rs.run_query_single = mock_run_query_single

    # Injecting rule return overrides
    original_check_r01 = RulesService.check_r01_quantity_cap
    original_check_r02 = RulesService.check_r02_dormant_supplier_spike
    original_check_r03 = RulesService.check_r03_mbi_velocity
    original_check_r04 = RulesService.check_r04_pecos_change

    try:
        # Case A: 0 hits -> Score 0.00, disbursed
        RulesService.check_r01_quantity_cap = AsyncMock(return_value=False)
        RulesService.check_r02_dormant_supplier_spike = AsyncMock(return_value=False)
        RulesService.check_r03_mbi_velocity = AsyncMock(return_value=False)
        RulesService.check_r04_pecos_change = AsyncMock(return_value=False)

        res_low = await RulesService.evaluate_claim({"mbi": "MBI001GEN"})
        assert res_low["score"] == 0.00
        assert res_low["status"] == "disbursed"

        # Case B: Exactly 1 hit -> Score 0.70, queued
        RulesService.check_r01_quantity_cap = AsyncMock(return_value=True)
        res_med = await RulesService.evaluate_claim({"mbi": "MBI001GEN"})
        assert res_med["score"] == 0.70
        assert res_med["status"] == "queued"

        # Case C: >=2 hits -> Score 0.95, held
        RulesService.check_r02_dormant_supplier_spike = AsyncMock(return_value=True)
        res_high = await RulesService.evaluate_claim({"mbi": "MBI001GEN"})
        assert res_high["score"] == 0.95
        assert res_high["status"] == "held"
    finally:
        rs.run_query_single = original_run_query_single
        RulesService.check_r01_quantity_cap = original_check_r01
        RulesService.check_r02_dormant_supplier_spike = original_check_r02
        RulesService.check_r03_mbi_velocity = original_check_r03
        RulesService.check_r04_pecos_change = original_check_r04
