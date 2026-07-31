# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""Tests for PIVOT overpayment tracking API endpoints (Story 5.1).

Covers all overpayment endpoints: list, summary, trend, detail, export.
"""
import uuid
from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from main import app
from database import get_db


# ---------------------------------------------------------------------------
# Helper to create a test client with mocked DB
# ---------------------------------------------------------------------------

def _mock_bq():
    return MagicMock()


async def _get_client(mock_bq_client=None):
    if mock_bq_client is None:
        mock_bq_client = _mock_bq()

    async def override_db():
        yield mock_bq_client

    app.dependency_overrides[get_db] = override_db
    client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
    return client, mock_bq_client


# ---------------------------------------------------------------------------
# Mock row builders
# ---------------------------------------------------------------------------

def _make_overpayment_row(overpayment_id=None, status="identified"):
    """Create a mock BQ row for an overpayment with joined claim fields."""
    row = MagicMock()
    row.id = overpayment_id or str(uuid.uuid4())
    row.claim_id = str(uuid.uuid4())
    row.provider_name = "Test Provider LLC"
    row.provider_npi = "1234567890"
    row.original_billing_amount = Decimal("15000.00")
    row.allowable_amount = Decimal("2000.00")
    row.overpayment_amount = Decimal("13000.00")
    row.recoupment_status = status
    row.date_identified = date(2025, 10, 15)
    row.fms_paid_date = None if status in ("identified", "notified", "in_recoupment") else date(2025, 12, 1)
    row.assigned_analyst = "Test.Analyst@va.gov"
    row.created_at = datetime(2025, 10, 15, 10, 0, 0)
    row.updated_at = datetime(2025, 10, 15, 10, 0, 0)
    row.claim_number = "CLM-0001234567"
    return row


def _make_summary_row():
    """Create a mock BQ row for the summary aggregation."""
    row = MagicMock()
    row.total_count = 15
    row.total_amount = Decimal("280000.00")
    row.identified_count = 2
    row.identified_amount = Decimal("17000.00")
    row.in_progress_count = 7
    row.in_progress_amount = Decimal("150000.00")
    row.recouped_count = 6
    row.recouped_amount = Decimal("113000.00")
    return row


def _make_trend_row(overpayment_id=None, days_offset=0):
    """Create a mock BQ row for trend data."""
    row = MagicMock()
    row.date_identified = date(2025, 9, 15 + days_offset)
    row.overpayment_amount = Decimal("12000.00")
    row.recoupment_status = "recouped"
    return row


def _make_detail_overpayment_row(overpayment_id=None):
    """Create a mock BQ row for overpayment detail with claim fields."""
    row = _make_overpayment_row(overpayment_id, status="in_recoupment")
    row.claim_type = "medical"
    row.claim_billing_amount = Decimal("15000.00")
    row.service_date = date(2025, 10, 1)
    row.claim_status = "denied"
    row.risk_level = "high"
    return row


def _make_detail_decision_row(claim_id=None):
    """Create a mock BQ row for a decision in detail view."""
    row = MagicMock()
    row.id = str(uuid.uuid4())
    row.decision_type = "denied"
    row.actor = "Test.Analyst@va.gov"
    row.actor_role = "payment_integrity_analyst"
    row.rationale = "Agent findings confirmed."
    row.savings_amount = Decimal("13000.00")
    row.created_at = datetime(2025, 10, 16, 10, 0, 0)
    return row


def _make_detail_finding_row(claim_id=None):
    """Create a mock BQ row for an agent finding in detail view."""
    row = MagicMock()
    row.id = str(uuid.uuid4())
    row.agent_name = "rules_engine"
    row.fraud_type = "billing_anomaly"
    row.confidence_score = 92
    row.recommendation = "flag"
    row.evidence_summary = "Billing amount exceeds fee schedule."
    return row


# ---------------------------------------------------------------------------
# Overpayment route tests
# ---------------------------------------------------------------------------

class TestOverpaymentRoutes:

    @pytest.mark.asyncio
    async def test_list_overpayments(self):
        """Story 5.1 AC3: List all overpayment records."""
        client, _ = await _get_client()
        try:
            with patch("services.overpayment_service.list_overpayments", new_callable=AsyncMock) as mock_fn:
                mock_fn.return_value = [
                    {
                        "id": "test-id-1",
                        "claim_id": "claim-1",
                        "claim_number": "CLM-001",
                        "provider_name": "Test Provider",
                        "provider_npi": "1234567890",
                        "original_billing_amount": 15000.0,
                        "allowable_amount": 2000.0,
                        "overpayment_amount": 13000.0,
                        "recoupment_status": "identified",
                        "date_identified": "2025-10-15",
                        "fms_paid_date": None,
                        "assigned_analyst": "Test.Analyst@va.gov",
                        "created_at": "2025-10-15T10:00:00",
                        "updated_at": "2025-10-15T10:00:00",
                    }
                ]
                response = await client.get("/api/overpayments")
                assert response.status_code == 200
                data = response.json()
                assert isinstance(data, list)
                assert len(data) == 1
                assert data[0]["claim_number"] == "CLM-001"
                assert data[0]["overpayment_amount"] == 13000.0
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_list_overpayments_with_status_filter(self):
        """Story 5.1 AC5: Filter by recoupment status."""
        client, _ = await _get_client()
        try:
            with patch("services.overpayment_service.list_overpayments", new_callable=AsyncMock) as mock_fn:
                mock_fn.return_value = [
                    {
                        "id": "test-id-2",
                        "claim_id": "claim-2",
                        "claim_number": "CLM-002",
                        "provider_name": "Recouped Provider",
                        "provider_npi": "9876543210",
                        "original_billing_amount": 20000.0,
                        "allowable_amount": 3000.0,
                        "overpayment_amount": 17000.0,
                        "recoupment_status": "recouped",
                        "date_identified": "2025-09-01",
                        "fms_paid_date": "2025-12-01",
                        "assigned_analyst": "Test.Analyst@va.gov",
                        "created_at": "2025-09-01T10:00:00",
                        "updated_at": "2025-12-01T10:00:00",
                    }
                ]
                response = await client.get("/api/overpayments?status=recouped")
                assert response.status_code == 200
                data = response.json()
                assert len(data) == 1
                assert data[0]["recoupment_status"] == "recouped"
                # Verify the filter was passed to the service
                mock_fn.assert_called_once()
                call_kwargs = mock_fn.call_args
                assert call_kwargs[1]["status"] == "recouped"
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_list_overpayments_empty(self):
        """Story 5.1 AC15: Empty state when no overpayments exist."""
        client, _ = await _get_client()
        try:
            with patch("services.overpayment_service.list_overpayments", new_callable=AsyncMock) as mock_fn:
                mock_fn.return_value = []
                response = await client.get("/api/overpayments")
                assert response.status_code == 200
                data = response.json()
                assert data == []
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_summary_metrics(self):
        """Story 5.1 AC2: Summary metric cards data."""
        client, _ = await _get_client()
        try:
            with patch("services.overpayment_service.get_overpayment_summary", new_callable=AsyncMock) as mock_fn:
                mock_fn.return_value = {
                    "total_identified": {"count": 15, "amount": 280000.0},
                    "in_progress": {"count": 7, "amount": 150000.0},
                    "recouped": {"count": 6, "amount": 113000.0},
                    "recovery_rate": 40.4,
                }
                response = await client.get("/api/overpayments/summary")
                assert response.status_code == 200
                data = response.json()
                assert data["total_identified"]["count"] == 15
                assert data["total_identified"]["amount"] == 280000.0
                assert data["in_progress"]["count"] == 7
                assert data["recouped"]["count"] == 6
                assert data["recovery_rate"] == 40.4
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_recoupment_trend(self):
        """Story 5.1 AC6: Recoupment trend chart data."""
        client, _ = await _get_client()
        try:
            with patch("services.overpayment_service.get_recoupment_trend", new_callable=AsyncMock) as mock_fn:
                mock_fn.return_value = [
                    {"date": "2025-09-15", "cumulative_amount": 12000.0, "amount": 12000.0},
                    {"date": "2025-09-22", "cumulative_amount": 46700.0, "amount": 34700.0},
                ]
                response = await client.get("/api/overpayments/trend")
                assert response.status_code == 200
                data = response.json()
                assert isinstance(data, list)
                assert len(data) == 2
                assert data[0]["date"] == "2025-09-15"
                assert data[1]["cumulative_amount"] == 46700.0
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_overpayment_detail(self):
        """Story 5.1 AC4: Expanded row detail with agent source, decision, timeline."""
        client, _ = await _get_client()
        op_id = str(uuid.uuid4())
        try:
            with patch("services.overpayment_service.get_overpayment_detail", new_callable=AsyncMock) as mock_fn:
                mock_fn.return_value = {
                    "id": op_id,
                    "claim_id": "claim-1",
                    "claim_number": "CLM-001",
                    "provider_name": "Test Provider",
                    "provider_npi": "1234567890",
                    "original_billing_amount": 15000.0,
                    "allowable_amount": 2000.0,
                    "overpayment_amount": 13000.0,
                    "recoupment_status": "in_recoupment",
                    "date_identified": "2025-10-15",
                    "fms_paid_date": None,
                    "assigned_analyst": "Test.Analyst@va.gov",
                    "claim_type": "medical",
                    "claim_billing_amount": 15000.0,
                    "service_date": "2025-10-01",
                    "claim_status": "denied",
                    "risk_level": "high",
                    "decision": {
                        "id": "dec-1",
                        "decision_type": "denied",
                        "actor": "Test.Analyst@va.gov",
                        "actor_role": "payment_integrity_analyst",
                        "rationale": "Confirmed by findings.",
                        "savings_amount": 13000.0,
                        "created_at": "2025-10-16T10:00:00",
                    },
                    "findings": [
                        {
                            "id": "find-1",
                            "agent_name": "rules_engine",
                            "fraud_type": "billing_anomaly",
                            "confidence_score": 92,
                            "recommendation": "flag",
                            "evidence_summary": "Billing exceeds fee schedule.",
                        }
                    ],
                }
                response = await client.get(f"/api/overpayments/{op_id}")
                assert response.status_code == 200
                data = response.json()
                assert data["id"] == op_id
                assert data["claim_number"] == "CLM-001"
                assert data["decision"]["decision_type"] == "denied"
                assert len(data["findings"]) == 1
                assert data["findings"][0]["agent_name"] == "rules_engine"
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_overpayment_detail_not_found(self):
        """Story 5.1 AC4: 404 when overpayment ID doesn't exist."""
        client, _ = await _get_client()
        try:
            with patch("services.overpayment_service.get_overpayment_detail", new_callable=AsyncMock) as mock_fn:
                mock_fn.return_value = None
                response = await client.get("/api/overpayments/nonexistent-id")
                assert response.status_code == 404
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_export_csv(self):
        """Story 5.1 AC7: Export CSV endpoint returns text/csv content."""
        client, _ = await _get_client()
        try:
            with patch("services.overpayment_service.export_overpayments_csv", new_callable=AsyncMock) as mock_fn:
                csv_content = "Claim Number,Provider Name,Provider NPI\nCLM-001,Test Provider,1234567890\n"
                mock_fn.return_value = csv_content
                response = await client.get("/api/overpayments/export")
                assert response.status_code == 200
                assert "text/csv" in response.headers["content-type"]
                assert "Content-Disposition" in response.headers
                assert "CLM-001" in response.text
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_export_csv_with_status_filter(self):
        """Story 5.1 AC7: Export CSV with status filter."""
        client, _ = await _get_client()
        try:
            with patch("services.overpayment_service.export_overpayments_csv", new_callable=AsyncMock) as mock_fn:
                mock_fn.return_value = "Claim Number\nCLM-002\n"
                response = await client.get("/api/overpayments/export?status=recouped")
                assert response.status_code == 200
                mock_fn.assert_called_once()
                call_kwargs = mock_fn.call_args
                assert call_kwargs[1]["status"] == "recouped"
        finally:
            await client.aclose()
            app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Overpayment model tests
# ---------------------------------------------------------------------------

class TestOverpaymentModel:

    def test_from_bq_row(self):
        """Story 5.1 AC14: Model correctly parses BigQuery row data."""
        from models.overpayment import Overpayment
        row = _make_overpayment_row(status="recouped")
        op = Overpayment.from_bq_row(row)
        assert op.provider_name == "Test Provider LLC"
        assert op.provider_npi == "1234567890"
        assert op.original_billing_amount == Decimal("15000.00")
        assert op.overpayment_amount == Decimal("13000.00")
        assert op.recoupment_status == "recouped"

    def test_to_dict(self):
        """Story 5.1 AC14: Model serializes to JSON-compatible dict."""
        from models.overpayment import Overpayment
        row = _make_overpayment_row(status="identified")
        op = Overpayment.from_bq_row(row)
        d = op.to_dict()
        assert isinstance(d["original_billing_amount"], float)
        assert isinstance(d["overpayment_amount"], float)
        assert d["overpayment_amount"] == 13000.0
        assert d["recoupment_status"] == "identified"
        assert d["fms_paid_date"] is None

    def test_to_dict_with_dates(self):
        """Story 5.1 AC14: Model serializes dates correctly."""
        from models.overpayment import Overpayment
        row = _make_overpayment_row(status="recouped")
        op = Overpayment.from_bq_row(row)
        d = op.to_dict()
        assert d["date_identified"] == "2025-10-15"
        assert d["fms_paid_date"] == "2025-12-01"


# ---------------------------------------------------------------------------
# Overpayment service tests
# ---------------------------------------------------------------------------

class TestOverpaymentService:

    @pytest.mark.asyncio
    async def test_summary_calculation(self):
        """Story 5.1 AC2: Summary correctly calculates recovery rate."""
        with patch("services.overpayment_service.run_query_single", new_callable=AsyncMock) as mock_query:
            mock_query.return_value = _make_summary_row()
            from services.overpayment_service import get_overpayment_summary
            result = await get_overpayment_summary(MagicMock())
            assert result["total_identified"]["count"] == 15
            assert result["total_identified"]["amount"] == 280000.0
            assert result["in_progress"]["count"] == 7
            assert result["recouped"]["count"] == 6
            # Recovery rate: 113000 / 280000 * 100 = 40.4%
            assert result["recovery_rate"] == 40.4

    @pytest.mark.asyncio
    async def test_summary_empty_data(self):
        """Story 5.1 AC15: Summary handles no overpayments."""
        with patch("services.overpayment_service.run_query_single", new_callable=AsyncMock) as mock_query:
            mock_query.return_value = None
            from services.overpayment_service import get_overpayment_summary
            result = await get_overpayment_summary(MagicMock())
            assert result["total_identified"]["count"] == 0
            assert result["recovery_rate"] == 0

    @pytest.mark.asyncio
    async def test_trend_cumulative(self):
        """Story 5.1 AC6: Trend data accumulates correctly."""
        with patch("services.overpayment_service.run_query", new_callable=AsyncMock) as mock_query:
            mock_query.return_value = [
                _make_trend_row(days_offset=0),
                _make_trend_row(days_offset=7),
            ]
            from services.overpayment_service import get_recoupment_trend
            result = await get_recoupment_trend(MagicMock())
            assert len(result) == 2
            assert result[0]["cumulative_amount"] == 12000.0
            assert result[1]["cumulative_amount"] == 24000.0

    @pytest.mark.asyncio
    async def test_export_csv_format(self):
        """Story 5.1 AC7: Export CSV has correct headers and data format."""
        with patch("services.overpayment_service.run_query", new_callable=AsyncMock) as mock_query:
            mock_query.return_value = [_make_overpayment_row(status="identified")]
            from services.overpayment_service import export_overpayments_csv
            csv_content = await export_overpayments_csv(MagicMock())
            lines = csv_content.strip().split("\n")
            assert len(lines) == 2  # header + 1 data row
            header = lines[0]
            assert "Claim Number" in header
            assert "Provider Name" in header
            assert "Overpayment Amount" in header
            assert "Recoupment Status" in header
            # Data row
            data_line = lines[1]
            assert "CLM-0001234567" in data_line
            assert "Test Provider LLC" in data_line
            assert "13000.00" in data_line

    @pytest.mark.asyncio
    async def test_list_with_sorting(self):
        """Story 5.1 AC3: List respects sort parameters."""
        with patch("services.overpayment_service.run_query", new_callable=AsyncMock) as mock_query:
            mock_query.return_value = [_make_overpayment_row()]
            from services.overpayment_service import list_overpayments
            result = await list_overpayments(
                MagicMock(),
                sort_by="overpayment_amount",
                sort_order="desc",
            )
            assert len(result) == 1
            # Verify query was called with the sort params
            call_args = mock_query.call_args
            assert "overpayment_amount" in call_args[0][0]
            assert "desc" in call_args[0][0].lower()

    @pytest.mark.asyncio
    async def test_list_rejects_invalid_sort(self):
        """Story 5.1 AC3: Invalid sort column falls back to default."""
        with patch("services.overpayment_service.run_query", new_callable=AsyncMock) as mock_query:
            mock_query.return_value = []
            from services.overpayment_service import list_overpayments
            await list_overpayments(MagicMock(), sort_by="DROP TABLE")
            # Should fall back to date_identified
            call_args = mock_query.call_args
            assert "date_identified" in call_args[0][0]
