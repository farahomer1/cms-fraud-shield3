# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""Tests for PIVOT backend API routes using FastAPI TestClient.

Covers all 32 API endpoints with success paths, error paths, validation,
and query parameter edge cases. Maps to acceptance criteria from all 22 user stories.
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
    """Return a lightweight MagicMock for BigQuery client."""
    return MagicMock()


def _make_batch_row(batch_id=None, status="pending"):
    """Create a mock BQ row for a batch."""
    row = MagicMock()
    row.id = batch_id or str(uuid.uuid4())
    row.name = "Batch-2025-10-21-Mixed"
    row.received_date = date(2025, 10, 21)
    row.file_count = 5
    row.status = status
    row.total_claims = 5
    row.flagged_count = 2
    row.approved_count = 3
    row.created_at = datetime(2025, 10, 21, 10, 0, 0)
    row.updated_at = datetime(2025, 10, 21, 10, 0, 0)
    return row


def _make_claim_row(claim_id=None, status="pending"):
    """Create a mock BQ row for a claim with joined veteran/provider fields."""
    row = MagicMock()
    row.id = claim_id or str(uuid.uuid4())
    row.claim_number = "CLM-0001234567"
    row.batch_id = str(uuid.uuid4())
    row.veteran_id = str(uuid.uuid4())
    row.provider_id = str(uuid.uuid4())
    row.claim_type = "medical"
    row.status = status
    row.risk_level = "high" if status == "flagged" else None
    row.billing_amount = Decimal("4250.00")
    row.service_date = date(2025, 10, 15)
    row.diagnosis_codes = '["M54.5", "G89.4"]'
    row.procedure_codes = '["99213", "20610"]'
    row.normalized_data = None
    row.raw_document_id = None
    row.created_at = datetime(2025, 10, 21, 10, 0, 0)
    row.updated_at = datetime(2025, 10, 21, 10, 0, 0)
    # Veteran joined fields
    row.v_name_display = "John Doe"
    row.v_ssn_last4 = "1234"
    row.v_dob = date(1960, 5, 15)
    row.v_dod = None
    row.v_vital_status = "alive"
    row.v_service_branch = "Army"
    row.v_disability_rating = 70
    row.v_benefits_enrolled = '[]'
    # Provider joined fields
    row.p_name = "VA Medical Center"
    row.p_npi = "1234567890"
    row.p_provider_type = "organization"
    row.p_specialty = "General Practice"
    row.p_address = '{"city": "Washington"}'
    row.p_risk_score = 25
    row.p_accreditation_status = "accredited"
    row.p_claim_history = '{}'
    return row


def _make_finding_row(claim_id=None, recommendation="flag"):
    """Create a mock BQ row for an agent finding."""
    row = MagicMock()
    row.id = str(uuid.uuid4())
    row.claim_id = claim_id or str(uuid.uuid4())
    row.agent_name = "rules_engine"
    row.fraud_type = "VA Financial Policy Violation"
    row.confidence_score = 85
    row.recommendation = recommendation
    row.flagged_data_points = '["Billing amount exceeds threshold"]'
    row.evidence_summary = "Billing amount of $4,250 exceeds expected range."
    row.finding_details = '{"rules_checked": ["billing_reasonableness"]}'
    row.processing_time_ms = 1200
    row.created_at = datetime(2025, 10, 21, 10, 5, 0)
    return row


def _make_decision_row(claim_id=None):
    """Create a mock BQ row for a decision."""
    row = MagicMock()
    row.id = str(uuid.uuid4())
    row.claim_id = claim_id or str(uuid.uuid4())
    row.decision_type = "denied"
    row.actor = "J. Rodriguez"
    row.actor_role = "GS-13"
    row.rationale = "Evidence supports denial."
    row.savings_amount = Decimal("4250.00")
    row.created_at = datetime(2025, 10, 21, 11, 0, 0)
    return row


def _make_document_row(doc_id=None):
    """Create a mock BQ row for a document."""
    row = MagicMock()
    row.id = doc_id or str(uuid.uuid4())
    row.batch_id = str(uuid.uuid4())
    row.filename = "medical-claim-001.pdf"
    row.file_type = "pdf"
    row.file_path = "data/demo-documents/medical-claim-001.pdf"
    row.file_size = 102400
    row.parse_status = "raw"
    row.created_at = datetime(2025, 10, 21, 10, 0, 0)
    return row


def _make_audit_row(entry_id=None):
    """Create a mock BQ row for an audit log entry."""
    row = MagicMock()
    row.id = entry_id or str(uuid.uuid4())
    row.timestamp = datetime(2025, 10, 21, 10, 0, 0)
    row.actor = "rules_engine"
    row.actor_type = "agent"
    row.action_type = "finding"
    row.claim_id = str(uuid.uuid4())
    row.details = '{"recommendation": "flag"}'
    row.confidence_score = 85
    return row


def _make_chat_row(claim_id=None):
    """Create a mock BQ row for a chat message."""
    row = MagicMock()
    row.id = str(uuid.uuid4())
    row.claim_id = claim_id or str(uuid.uuid4())
    row.role = "assistant"
    row.content = "This claim shows suspicious patterns."
    row.created_at = datetime(2025, 10, 21, 10, 0, 0)
    return row


async def _get_client(mock_bq_client=None):
    if mock_bq_client is None:
        mock_bq_client = _mock_bq()

    async def override_db():
        yield mock_bq_client

    app.dependency_overrides[get_db] = override_db
    client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
    return client, mock_bq_client


# ---------------------------------------------------------------------------
# Health routes (Story 1.1 AC9, Story 1.3 AC3, Story 1.8 AC8-9)
# ---------------------------------------------------------------------------

class TestHealthRoutes:

    @pytest.mark.asyncio
    async def test_health_check(self):
        """Story 1.1 AC9: /api/health returns 200 OK with version info."""
        client, _ = await _get_client()
        try:
            response = await client.get("/api/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["version"] == "0.1.0"
            assert data["service"] == "PIVOT API"
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_gemini_health(self):
        """Story 1.3 AC3: /api/gemini/health returns Gemini response with latency."""
        client, _ = await _get_client()
        try:
            with patch("services.gemini_client.health_check", new_callable=AsyncMock) as mock_hc:
                mock_hc.return_value = {"status": "connected", "model": "gemini-2.0-flash", "latency_ms": 100}
                response = await client.get("/api/gemini/health")
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "connected"
                assert data["latency_ms"] == 100
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_reset_database(self):
        """Story 1.8 AC8-9: /api/reset triggers reset seed."""
        client, _ = await _get_client()
        try:
            with patch("routes.health.reset_and_seed", new_callable=AsyncMock, create=True), \
                 patch("seed.reset_and_seed", new_callable=AsyncMock) as mock_seed2:
                mock_seed2.return_value = {"batches": 3, "veterans": 20}
                response = await client.post("/api/reset")
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "success"
                assert "reseeded" in data["message"].lower()
        finally:
            await client.aclose()
            app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Monitoring routes (Story 4.5)
# ---------------------------------------------------------------------------

class TestMonitoringRoutes:

    @pytest.mark.asyncio
    async def test_health_metrics(self):
        """Story 4.5 AC2: Health metric cards from backend."""
        client, _ = await _get_client()
        try:
            response = await client.get("/api/monitoring/health-metrics")
            assert response.status_code == 200
            data = response.json()
            assert "api_avg_response_ms" in data
            assert "gemini_avg_latency_ms" in data
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_logs_default_category(self):
        """Story 4.5 AC4: Default log category returns entries."""
        client, _ = await _get_client()
        try:
            response = await client.get("/api/monitoring/logs")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) > 0
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_logs_specific_category(self):
        """Story 4.5 AC4: Tabbed log viewer with specific category."""
        client, _ = await _get_client()
        try:
            response = await client.get("/api/monitoring/logs?category=ai_agent&limit=5")
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 5
        finally:
            await client.aclose()
            app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Analytics routes (Story 4.1, 4.2, 4.3)
# ---------------------------------------------------------------------------

class TestAnalyticsRoutes:

    @pytest.mark.asyncio
    async def test_processing_speed(self):
        """Story 4.2 AC3: Processing speed gauge data."""
        client, _ = await _get_client()
        try:
            response = await client.get("/api/analytics/processing-speed")
            assert response.status_code == 200
            data = response.json()
            assert data["unit"] == "claims/sec"
            assert data["current_throughput"] == 16.2
            assert data["surge_capacity"] == 32.4
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_fraud_trends(self):
        """Story 4.2 AC1: Fraud trends by type endpoint."""
        client, _ = await _get_client()
        try:
            with patch("services.analytics_service.get_fraud_trends", new_callable=AsyncMock) as mock_fn:
                mock_fn.return_value = [
                    {"agent": "rules_engine", "agent_name": "rules_engine", "flag_count": 5,
                     "high": 2, "medium": 2, "low": 1, "risk_breakdown": {"high": 2}}
                ]
                response = await client.get("/api/analytics/fraud-trends")
                assert response.status_code == 200
                data = response.json()
                assert isinstance(data, list)
                assert len(data) == 1
                assert data[0]["agent_name"] == "rules_engine"
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_agent_efficacy(self):
        """Story 4.2 AC2: Agent efficacy line chart data."""
        client, _ = await _get_client()
        try:
            with patch("services.analytics_service.get_agent_efficacy", new_callable=AsyncMock) as mock_fn:
                mock_fn.return_value = [{"month": "2025-10", "scores": {"rules_engine": 90.0}, "rules_engine": 90.0}]
                response = await client.get("/api/analytics/agent-efficacy")
                assert response.status_code == 200
                data = response.json()
                assert isinstance(data, list)
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_savings_endpoint(self):
        """Story 4.2 AC4: Savings realized area chart data."""
        client, _ = await _get_client()
        try:
            with patch("services.analytics_service.get_savings_data", new_callable=AsyncMock) as mock_fn:
                mock_fn.return_value = [
                    {"date": "2025-10-01", "daily_savings": 1200, "cumulative_savings": 1200},
                    {"date": "2025-10-02", "daily_savings": 1500, "cumulative_savings": 2700},
                ]
                response = await client.get("/api/analytics/savings")
                assert response.status_code == 200
                data = response.json()
                assert "data_points" in data
                assert "total" in data
                assert data["total"] == 2700
                for dp in data["data_points"]:
                    assert "cumulative" in dp
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_savings_empty(self):
        """Edge case: savings with no data points."""
        client, _ = await _get_client()
        try:
            with patch("services.analytics_service.get_savings_data", new_callable=AsyncMock) as mock_fn:
                mock_fn.return_value = []
                response = await client.get("/api/analytics/savings")
                assert response.status_code == 200
                data = response.json()
                assert data["total"] == 0
                assert data["data_points"] == []
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_insights(self):
        """Story 4.3 AC2,5: Gemini narrative insights for chart."""
        client, _ = await _get_client()
        try:
            with patch("services.analytics_service.generate_insight", new_callable=AsyncMock) as mock_fn:
                mock_fn.return_value = {"chart_type": "fraud-trends", "narrative": "Test insight.", "insight": "Test insight."}
                response = await client.get("/api/analytics/insights?chart_type=fraud-trends")
                assert response.status_code == 200
                data = response.json()
                assert "narrative" in data
                assert "insight" in data
                assert data["chart_type"] == "fraud-trends"
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_dashboard_metrics(self):
        """Story 1.6 AC2-3,6: Dashboard metrics from BigQuery."""
        client, _ = await _get_client()
        try:
            with patch("services.analytics_service.get_dashboard_metrics", new_callable=AsyncMock) as mock_fn:
                mock_fn.return_value = {
                    "total_claims": 100, "flagged_claims": 10, "approved_claims": 80,
                    "denied_claims": 5, "total_savings": 45200.0,
                    "active_claims_annual": 82000000, "avg_processing_time_hours": 3.5,
                    "realized_savings": 45200.0, "flagged_count": 10, "approved_count": 80,
                }
                response = await client.get("/api/analytics/dashboard-metrics")
                assert response.status_code == 200
                data = response.json()
                assert data["total_claims"] == 100
                assert data["flagged_claims"] == 10
                assert data["realized_savings"] == 45200.0
        finally:
            await client.aclose()
            app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Batch routes (Story 2.1, 2.7, 2.8)
# ---------------------------------------------------------------------------

class TestBatchRoutes:

    @pytest.mark.asyncio
    async def test_list_batches_empty(self):
        """Story 2.1 AC2: Batch selector returns empty list."""
        client, _ = await _get_client()
        try:
            with patch("routes.batches.run_query", new_callable=AsyncMock) as mock_rq:
                mock_rq.return_value = []
                response = await client.get("/api/batches")
                assert response.status_code == 200
                assert response.json() == []
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_list_batches_with_data(self):
        """Story 2.1 AC2: Batch selector shows batch name, date, file count, status."""
        client, _ = await _get_client()
        try:
            with patch("routes.batches.run_query", new_callable=AsyncMock) as mock_rq:
                mock_rq.return_value = [_make_batch_row()]
                response = await client.get("/api/batches")
                assert response.status_code == 200
                data = response.json()
                assert len(data) == 1
                batch = data[0]
                assert "name" in batch
                assert "file_count" in batch
                assert "status" in batch
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_batch_success(self):
        """Story 2.1: Get batch details by ID."""
        client, _ = await _get_client()
        try:
            bid = str(uuid.uuid4())
            with patch("routes.batches.run_query_single", new_callable=AsyncMock) as mock_rqs:
                mock_rqs.return_value = _make_batch_row(batch_id=bid)
                response = await client.get(f"/api/batches/{bid}")
                assert response.status_code == 200
                data = response.json()
                assert data["id"] == bid
                assert data["name"] == "Batch-2025-10-21-Mixed"
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_batch_not_found(self):
        client, _ = await _get_client()
        try:
            with patch("routes.batches.run_query_single", new_callable=AsyncMock) as mock_rqs:
                mock_rqs.return_value = None
                response = await client.get(f"/api/batches/{uuid.uuid4()}")
                assert response.status_code == 404
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_list_batch_documents(self):
        """Story 2.1 AC3: File list for selected batch."""
        client, _ = await _get_client()
        try:
            with patch("routes.batches.run_query", new_callable=AsyncMock) as mock_rq:
                mock_rq.return_value = [_make_document_row()]
                response = await client.get(f"/api/batches/{uuid.uuid4()}/documents")
                assert response.status_code == 200
                data = response.json()
                assert len(data) == 1
                assert data[0]["filename"] == "medical-claim-001.pdf"
                assert data[0]["file_type"] == "pdf"
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_list_batch_documents_empty(self):
        """Batch with no documents returns empty list."""
        client, _ = await _get_client()
        try:
            with patch("routes.batches.run_query", new_callable=AsyncMock) as mock_rq:
                mock_rq.return_value = []
                response = await client.get(f"/api/batches/{uuid.uuid4()}/documents")
                assert response.status_code == 200
                assert response.json() == []
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_process_batch_success(self):
        """Story 2.7 AC1: Process batch starts processing."""
        client, _ = await _get_client()
        try:
            bid = str(uuid.uuid4())
            with patch("routes.batches.run_query_single", new_callable=AsyncMock) as mock_rqs, \
                 patch("routes.batches.run_dml", new_callable=AsyncMock) as mock_dml:
                mock_rqs.return_value = _make_batch_row(batch_id=bid)
                mock_dml.return_value = 1
                response = await client.post(f"/api/batches/{bid}/process")
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "processing"
                assert data["batch_id"] == bid
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_process_batch_not_found(self):
        client, _ = await _get_client()
        try:
            with patch("routes.batches.run_query_single", new_callable=AsyncMock) as mock_rqs:
                mock_rqs.return_value = None
                response = await client.post(f"/api/batches/{uuid.uuid4()}/process")
                assert response.status_code == 404
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_batch_progress_sse(self):
        """Story 2.7 AC4, Story 2.8: SSE streaming endpoint."""
        client, _ = await _get_client()
        try:
            async def mock_events(batch_id, bq):
                yield {"type": "batch_start", "data": {"batchId": batch_id, "totalClaims": 1, "totalAgents": 8}}
                yield {"type": "batch_complete", "data": {"batchId": batch_id, "totalClaims": 1, "flaggedCount": 0, "approvedCount": 1}}

            with patch("routes.batches.process_batch_claims", side_effect=mock_events, create=True), \
                 patch("services.batch_service.process_batch_claims", side_effect=mock_events):
                response = await client.get(f"/api/batches/{uuid.uuid4()}/progress")
                assert response.status_code == 200
                assert "text/event-stream" in response.headers.get("content-type", "")
        finally:
            await client.aclose()
            app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Claims routes (Story 3.1, 3.2, 3.5)
# ---------------------------------------------------------------------------

class TestClaimRoutes:

    @pytest.mark.asyncio
    async def test_list_claims_empty(self):
        """Story 3.1 AC7: Claims endpoint returns list."""
        client, _ = await _get_client()
        try:
            with patch("routes.claims.run_query", new_callable=AsyncMock) as mock_rq:
                mock_rq.return_value = []
                response = await client.get("/api/claims")
                assert response.status_code == 200
                assert response.json() == []
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_list_claims_with_data(self):
        """Story 3.1 AC2: Claim list with veteran, provider, risk level."""
        client, _ = await _get_client()
        try:
            with patch("routes.claims.run_query", new_callable=AsyncMock) as mock_rq:
                mock_rq.return_value = [_make_claim_row(status="flagged")]
                response = await client.get("/api/claims")
                assert response.status_code == 200
                data = response.json()
                assert len(data) == 1
                claim = data[0]
                assert claim["claim_number"] == "CLM-0001234567"
                assert claim["status"] == "flagged"
                assert "veteran" in claim
                assert claim["veteran"]["name_display"] == "John Doe"
                assert "provider" in claim
                assert claim["provider"]["name"] == "VA Medical Center"
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_list_claims_with_status_filter(self):
        """Story 3.1 AC2: Filter by status=flagged."""
        client, _ = await _get_client()
        try:
            with patch("routes.claims.run_query", new_callable=AsyncMock) as mock_rq:
                mock_rq.return_value = [_make_claim_row(status="flagged")]
                response = await client.get("/api/claims?status=flagged")
                assert response.status_code == 200
                # Verify the query was called with status parameter
                call_args = mock_rq.call_args
                assert "status" in call_args[0][0].lower() or any("status" in str(p) for p in (call_args[0][1] or []))
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_list_claims_with_risk_filter(self):
        """Story 3.1 AC5: Filter by risk_level."""
        client, _ = await _get_client()
        try:
            with patch("routes.claims.run_query", new_callable=AsyncMock) as mock_rq:
                mock_rq.return_value = []
                response = await client.get("/api/claims?risk_level=high")
                assert response.status_code == 200
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_claim_success(self):
        """Story 3.2 AC5: Claim detail with findings and decision."""
        client, _ = await _get_client()
        try:
            cid = str(uuid.uuid4())
            claim_row = _make_claim_row(claim_id=cid, status="flagged")

            with patch("routes.claims.run_query_single", new_callable=AsyncMock) as mock_rqs, \
                 patch("routes.claims.run_query", new_callable=AsyncMock) as mock_rq:
                # First call: claim+veteran+provider, second call: no decision
                mock_rqs.side_effect = [claim_row, None]
                # Findings query
                mock_rq.return_value = [_make_finding_row(claim_id=cid)]

                response = await client.get(f"/api/claims/{cid}")
                assert response.status_code == 200
                data = response.json()
                assert data["id"] == cid
                assert data["claim_number"] == "CLM-0001234567"
                assert "veteran" in data
                assert "provider" in data
                assert "findings" in data
                assert len(data["findings"]) == 1
                assert data["findings"][0]["agent_name"] == "rules_engine"
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_claim_with_decision(self):
        """Story 3.5: Claim detail includes decision if recorded."""
        client, _ = await _get_client()
        try:
            cid = str(uuid.uuid4())
            claim_row = _make_claim_row(claim_id=cid, status="denied")
            decision_row = _make_decision_row(claim_id=cid)

            with patch("routes.claims.run_query_single", new_callable=AsyncMock) as mock_rqs, \
                 patch("routes.claims.run_query", new_callable=AsyncMock) as mock_rq:
                mock_rqs.side_effect = [claim_row, decision_row]
                mock_rq.return_value = []  # no findings

                response = await client.get(f"/api/claims/{cid}")
                assert response.status_code == 200
                data = response.json()
                assert data["decision"] is not None
                assert data["decision"]["decision_type"] == "denied"
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_claim_not_found(self):
        client, _ = await _get_client()
        try:
            with patch("routes.claims.run_query_single", new_callable=AsyncMock) as mock_rqs:
                mock_rqs.return_value = None
                response = await client.get(f"/api/claims/{uuid.uuid4()}")
                assert response.status_code == 404
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_claim_findings(self):
        """Story 3.2 AC5: Agent findings for a claim."""
        client, _ = await _get_client()
        try:
            cid = str(uuid.uuid4())
            with patch("routes.claims.run_query", new_callable=AsyncMock) as mock_rq:
                mock_rq.return_value = [_make_finding_row(claim_id=cid), _make_finding_row(claim_id=cid, recommendation="pass")]
                response = await client.get(f"/api/claims/{cid}/findings")
                assert response.status_code == 200
                data = response.json()
                assert len(data) == 2
                assert data[0]["agent_name"] == "rules_engine"
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_claim_findings_empty(self):
        """No findings for a claim returns empty list."""
        client, _ = await _get_client()
        try:
            with patch("routes.claims.run_query", new_callable=AsyncMock) as mock_rq:
                mock_rq.return_value = []
                response = await client.get(f"/api/claims/{uuid.uuid4()}/findings")
                assert response.status_code == 200
                assert response.json() == []
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_claim_summary(self):
        """Story 3.2 AC2,6: Executive summary generation."""
        client, _ = await _get_client()
        try:
            with patch("services.chat_service.generate_executive_summary", new_callable=AsyncMock) as mock_gen:
                mock_gen.return_value = "This claim was flagged due to deceased veteran billing."
                response = await client.get(f"/api/claims/{uuid.uuid4()}/summary")
                assert response.status_code == 200
                data = response.json()
                assert "summary" in data
                assert "flagged" in data["summary"].lower()
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_decide_claim_denied(self):
        """Story 3.5 AC3-5: Deny a flagged claim."""
        client, _ = await _get_client()
        try:
            cid = str(uuid.uuid4())
            claim_row = _make_claim_row(claim_id=cid, status="flagged")

            with patch("routes.claims.run_query_single", new_callable=AsyncMock) as mock_rqs, \
                 patch("routes.claims.insert_rows", new_callable=AsyncMock) as mock_insert, \
                 patch("routes.claims.run_dml", new_callable=AsyncMock) as mock_dml:
                mock_rqs.side_effect = [claim_row, None]  # claim found, no existing decision
                mock_insert.return_value = []
                mock_dml.return_value = 1

                response = await client.post(
                    f"/api/claims/{cid}/decide",
                    json={"decisionType": "denied", "actor": "J. Rodriguez", "actorRole": "GS-13"},
                )
                assert response.status_code == 200
                data = response.json()
                assert data["decisionType"] == "denied"
                assert data["savingsAmount"] == 4250.0
                assert "denied" in data["message"].lower()
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_decide_claim_approved(self):
        """Story 3.5 AC6: Approve a claim."""
        client, _ = await _get_client()
        try:
            cid = str(uuid.uuid4())
            claim_row = _make_claim_row(claim_id=cid, status="flagged")

            with patch("routes.claims.run_query_single", new_callable=AsyncMock) as mock_rqs, \
                 patch("routes.claims.insert_rows", new_callable=AsyncMock) as mock_insert, \
                 patch("routes.claims.run_dml", new_callable=AsyncMock) as mock_dml:
                mock_rqs.side_effect = [claim_row, None]
                mock_insert.return_value = []
                mock_dml.return_value = 1

                response = await client.post(
                    f"/api/claims/{cid}/decide",
                    json={"decisionType": "approved", "actor": "J. Rodriguez", "actorRole": "GS-13"},
                )
                assert response.status_code == 200
                data = response.json()
                assert data["decisionType"] == "approved"
                assert data["savingsAmount"] is None
                assert "authorized" in data["message"].lower()
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_decide_claim_false_positive(self):
        """Story 3.5 AC7: Mark as false positive."""
        client, _ = await _get_client()
        try:
            cid = str(uuid.uuid4())
            claim_row = _make_claim_row(claim_id=cid, status="flagged")

            with patch("routes.claims.run_query_single", new_callable=AsyncMock) as mock_rqs, \
                 patch("routes.claims.insert_rows", new_callable=AsyncMock) as mock_insert, \
                 patch("routes.claims.run_dml", new_callable=AsyncMock) as mock_dml:
                mock_rqs.side_effect = [claim_row, None]
                mock_insert.return_value = []
                mock_dml.return_value = 1

                response = await client.post(
                    f"/api/claims/{cid}/decide",
                    json={"decisionType": "false_positive", "actor": "J. Rodriguez", "actorRole": "GS-13",
                          "rationale": "Agent misfired on this one."},
                )
                assert response.status_code == 200
                data = response.json()
                assert data["decisionType"] == "false_positive"
                assert "false positive" in data["message"].lower()
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_decide_claim_duplicate_decision(self):
        """Story 3.5: Cannot decide on a claim with existing decision."""
        client, _ = await _get_client()
        try:
            cid = str(uuid.uuid4())
            claim_row = _make_claim_row(claim_id=cid)
            existing_decision = MagicMock()
            existing_decision.id = str(uuid.uuid4())

            with patch("routes.claims.run_query_single", new_callable=AsyncMock) as mock_rqs:
                mock_rqs.side_effect = [claim_row, existing_decision]
                response = await client.post(
                    f"/api/claims/{cid}/decide",
                    json={"decisionType": "denied", "actor": "J. Rodriguez", "actorRole": "GS-13"},
                )
                assert response.status_code == 400
                assert "already recorded" in response.json()["detail"].lower()
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_decide_claim_not_found(self):
        client, _ = await _get_client()
        try:
            with patch("routes.claims.run_query_single", new_callable=AsyncMock) as mock_rqs:
                mock_rqs.return_value = None
                response = await client.post(
                    f"/api/claims/{uuid.uuid4()}/decide",
                    json={"decisionType": "denied", "actor": "J. Rodriguez", "actorRole": "GS-13"},
                )
                assert response.status_code == 404
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_decide_claim_missing_body(self):
        """Validation: missing required fields returns 422."""
        client, _ = await _get_client()
        try:
            response = await client.post(
                f"/api/claims/{uuid.uuid4()}/decide",
                json={},
            )
            assert response.status_code == 422
        finally:
            await client.aclose()
            app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Chat routes (Story 3.3, 3.4, 3.6)
# ---------------------------------------------------------------------------

class TestChatRoutes:

    @pytest.mark.asyncio
    async def test_chat_with_claim(self):
        """Story 3.3-3.4: Chat endpoint returns AI response."""
        client, _ = await _get_client()
        try:
            claim_id = str(uuid.uuid4())
            with patch("services.chat_service.generate_chat_response", new_callable=AsyncMock) as mock_chat, \
                 patch("routes.chat.insert_rows", new_callable=AsyncMock) as mock_insert:
                mock_chat.return_value = "This claim shows suspicious patterns."
                mock_insert.return_value = []

                response = await client.post(
                    f"/api/claims/{claim_id}/chat",
                    json={"message": "What is suspicious?", "sessionUser": "test_user"},
                )
                assert response.status_code == 200
                data = response.json()
                assert data["role"] == "assistant"
                assert "suspicious" in data["content"].lower()
                assert data["claim_id"] == claim_id
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_chat_persists_messages(self):
        """Story 3.3 AC7, Story 3.4 AC7: Chat saves messages to DB."""
        client, _ = await _get_client()
        try:
            claim_id = str(uuid.uuid4())
            with patch("services.chat_service.generate_chat_response", new_callable=AsyncMock) as mock_chat, \
                 patch("routes.chat.insert_rows", new_callable=AsyncMock) as mock_insert:
                mock_chat.return_value = "Analysis complete."
                mock_insert.return_value = []

                await client.post(
                    f"/api/claims/{claim_id}/chat",
                    json={"message": "Analyze this", "sessionUser": "test_user"},
                )
                # insert_rows called 3 times: user msg, assistant msg, audit log
                assert mock_insert.call_count == 3
                # Verify user message was saved
                first_call = mock_insert.call_args_list[0]
                assert first_call[0][0] == "chat_messages"
                assert first_call[0][1][0]["role"] == "user"
                # Verify assistant message was saved
                second_call = mock_insert.call_args_list[1]
                assert second_call[0][0] == "chat_messages"
                assert second_call[0][1][0]["role"] == "assistant"
                # Verify audit log entry
                third_call = mock_insert.call_args_list[2]
                assert third_call[0][0] == "audit_log"
                assert third_call[0][1][0]["action_type"] == "chat"
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_chat_error_handling(self):
        """Story 3.4, 4.6 AC5: Graceful error when AI service fails."""
        client, _ = await _get_client()
        try:
            with patch("services.chat_service.generate_chat_response", new_callable=AsyncMock) as mock_chat, \
                 patch("routes.chat.insert_rows", new_callable=AsyncMock) as mock_insert:
                mock_chat.side_effect = Exception("Gemini timeout")
                mock_insert.return_value = []

                response = await client.post(
                    f"/api/claims/{uuid.uuid4()}/chat",
                    json={"message": "Test", "sessionUser": "test_user"},
                )
                assert response.status_code == 500
                assert "failed" in response.json()["detail"].lower()
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_chat_missing_body(self):
        """Validation: missing fields returns 422."""
        client, _ = await _get_client()
        try:
            response = await client.post(
                f"/api/claims/{uuid.uuid4()}/chat",
                json={},
            )
            assert response.status_code == 422
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_chat_history_empty(self):
        client, _ = await _get_client()
        try:
            with patch("routes.chat.run_query", new_callable=AsyncMock) as mock_rq:
                mock_rq.return_value = []
                response = await client.get(f"/api/claims/{uuid.uuid4()}/chat/history")
                assert response.status_code == 200
                assert response.json() == []
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_chat_history_with_messages(self):
        """Story 3.3 AC7: Chat history includes all messages."""
        client, _ = await _get_client()
        try:
            cid = str(uuid.uuid4())
            with patch("routes.chat.run_query", new_callable=AsyncMock) as mock_rq:
                mock_rq.return_value = [_make_chat_row(claim_id=cid)]
                response = await client.get(f"/api/claims/{cid}/chat/history")
                assert response.status_code == 200
                data = response.json()
                assert len(data) == 1
                assert data[0]["role"] == "assistant"
                assert data[0]["claim_id"] == cid
        finally:
            await client.aclose()
            app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Fraud Research routes (Story 4.4)
# ---------------------------------------------------------------------------

class TestFraudResearchRoutes:

    @pytest.mark.asyncio
    async def test_get_clusters(self):
        """Story 4.4 AC3: Cluster data from aggregated findings."""
        client, _ = await _get_client()
        try:
            with patch("services.fraud_research_service.get_anomaly_clusters", new_callable=AsyncMock) as mock_fn:
                mock_fn.return_value = [
                    {"provider_name": "Test", "provider_id": "1", "risk_score": 50, "finding_count": 3, "avg_confidence": 75.0}
                ]
                response = await client.get("/api/fraud-research/clusters")
                assert response.status_code == 200
                data = response.json()
                assert len(data) == 1
                assert data[0]["provider_name"] == "Test"
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_analyze_anomalies(self):
        """Story 4.4 AC4: Gemini analysis of anomaly landscape."""
        client, _ = await _get_client()
        try:
            with patch("services.fraud_research_service.analyze_anomaly_landscape", new_callable=AsyncMock) as mock_fn:
                mock_fn.return_value = {
                    "analysis": "Test analysis", "insights": "Test analysis",
                    "cluster_count": 1, "clusters": [],
                }
                response = await client.get("/api/fraud-research/analyze")
                assert response.status_code == 200
                data = response.json()
                assert "analysis" in data
                assert "insights" in data
                assert data["cluster_count"] == 1
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_pattern_search(self):
        """Story 4.4 AC5: Natural language pattern search."""
        client, _ = await _get_client()
        try:
            with patch("services.fraud_research_service.search_patterns", new_callable=AsyncMock) as mock_fn:
                mock_fn.return_value = {
                    "query": "pension poaching", "results": "Found 3 matching cases.",
                    "summary": "Found 3 matching cases.", "text": "Found 3 matching cases.",
                    "total_claims_searched": 50,
                }
                response = await client.post(
                    "/api/fraud-research/search",
                    json={"query": "pension poaching"},
                )
                assert response.status_code == 200
                data = response.json()
                assert data["query"] == "pension poaching"
                assert data["total_claims_searched"] == 50
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_pattern_search_missing_query(self):
        """Validation: missing query field returns 422."""
        client, _ = await _get_client()
        try:
            response = await client.post("/api/fraud-research/search", json={})
            assert response.status_code == 422
        finally:
            await client.aclose()
            app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Audit Log routes (Story 3.6)
# ---------------------------------------------------------------------------

class TestAuditLogRoutes:

    @pytest.mark.asyncio
    async def test_list_audit_logs_empty(self):
        """Story 3.6 AC4: Audit log table."""
        client, _ = await _get_client()
        try:
            with patch("routes.audit_log.run_query", new_callable=AsyncMock) as mock_rq:
                mock_rq.return_value = []
                response = await client.get("/api/audit-log")
                assert response.status_code == 200
                assert response.json() == []
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_list_audit_logs_with_data(self):
        """Story 3.6 AC4: Audit log with entries."""
        client, _ = await _get_client()
        try:
            with patch("routes.audit_log.run_query", new_callable=AsyncMock) as mock_rq:
                mock_rq.return_value = [_make_audit_row()]
                response = await client.get("/api/audit-log")
                assert response.status_code == 200
                data = response.json()
                assert len(data) == 1
                assert data[0]["actor"] == "rules_engine"
                assert data[0]["action_type"] == "finding"
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_list_audit_logs_with_filters(self):
        """Story 3.6 AC5: Filters on audit log."""
        client, _ = await _get_client()
        try:
            with patch("routes.audit_log.run_query", new_callable=AsyncMock) as mock_rq:
                mock_rq.return_value = []
                response = await client.get("/api/audit-log?actor=test&action_type=chat&offset=10&limit=20")
                assert response.status_code == 200
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_audit_entry_success(self):
        """Story 3.6 AC6: Clicking audit entry shows full details."""
        client, _ = await _get_client()
        try:
            eid = str(uuid.uuid4())
            with patch("routes.audit_log.run_query_single", new_callable=AsyncMock) as mock_rqs:
                mock_rqs.return_value = _make_audit_row(entry_id=eid)
                response = await client.get(f"/api/audit-log/{eid}")
                assert response.status_code == 200
                data = response.json()
                assert data["id"] == eid
                assert data["actor"] == "rules_engine"
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_audit_entry_not_found(self):
        client, _ = await _get_client()
        try:
            with patch("routes.audit_log.run_query_single", new_callable=AsyncMock) as mock_rqs:
                mock_rqs.return_value = None
                response = await client.get(f"/api/audit-log/{uuid.uuid4()}")
                assert response.status_code == 404
        finally:
            await client.aclose()
            app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Alerts routes (Story 1.6)
# ---------------------------------------------------------------------------

class TestAlertRoutes:

    @pytest.mark.asyncio
    async def test_get_recent_alerts_empty(self):
        """Story 1.6 AC4: Alert feed with no flagged claims."""
        client, _ = await _get_client()
        try:
            with patch("routes.alerts.run_query", new_callable=AsyncMock) as mock_rq:
                mock_rq.return_value = []
                response = await client.get("/api/alerts/recent")
                assert response.status_code == 200
                assert response.json() == []
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_recent_alerts_with_data(self):
        """Story 1.6 AC4: Alert feed shows claim ID, risk level, flagging agent, timestamp."""
        client, _ = await _get_client()
        try:
            claim_row = _make_claim_row(status="flagged")
            finding_agent_row = MagicMock()
            finding_agent_row.agent_name = "data_validation"

            with patch("routes.alerts.run_query", new_callable=AsyncMock) as mock_rq:
                # First call: flagged claims, second call: flagging agents for the claim
                mock_rq.side_effect = [[claim_row], [finding_agent_row]]
                response = await client.get("/api/alerts/recent")
                assert response.status_code == 200
                data = response.json()
                assert len(data) == 1
                alert = data[0]
                assert "claim_id" in alert
                assert "claim_number" in alert
                assert alert["risk_level"] == "high"
                assert "flagging_agents" in alert
                assert "data_validation" in alert["flagging_agents"]
                assert "veteran_name" in alert
                assert "provider_name" in alert
                assert "billing_amount" in alert
                assert "timestamp" in alert
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_recent_alerts_with_limit(self):
        client, _ = await _get_client()
        try:
            with patch("routes.alerts.run_query", new_callable=AsyncMock) as mock_rq:
                mock_rq.return_value = []
                response = await client.get("/api/alerts/recent?limit=5")
                assert response.status_code == 200
        finally:
            await client.aclose()
            app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Document routes (Story 2.2, 2.3, 2.4)
# ---------------------------------------------------------------------------

class TestDocumentRoutes:

    @pytest.mark.asyncio
    async def test_get_raw_document_not_found_in_db(self):
        """Document not in database."""
        client, _ = await _get_client()
        try:
            with patch("routes.documents.run_query_single", new_callable=AsyncMock) as mock_rqs:
                mock_rqs.return_value = None
                response = await client.get(f"/api/documents/{uuid.uuid4()}/raw")
                assert response.status_code == 404
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_parse_document(self):
        """Story 2.3 AC1: Parse document endpoint."""
        client, _ = await _get_client()
        try:
            doc_id = str(uuid.uuid4())
            with patch("services.document_service.parse_document", new_callable=AsyncMock) as mock_parse:
                mock_parse.return_value = {"document_id": doc_id, "parse_status": "parsed", "normalized_data": {"patient_name": "John Doe"}}
                response = await client.post(f"/api/documents/{doc_id}/parse")
                assert response.status_code == 200
                data = response.json()
                assert data["parse_status"] == "parsed"
                assert data["normalized_data"]["patient_name"] == "John Doe"
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_parse_document_not_found(self):
        """Story 2.3 AC7: Document not found during parse."""
        client, _ = await _get_client()
        try:
            with patch("services.document_service.parse_document", new_callable=AsyncMock) as mock_parse:
                mock_parse.return_value = {"error": "Document not found"}
                response = await client.post(f"/api/documents/{uuid.uuid4()}/parse")
                assert response.status_code == 200
                data = response.json()
                assert "error" in data
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_parsed_data_success(self):
        """Story 2.4 AC1: Parsed data for a document."""
        client, _ = await _get_client()
        try:
            doc_id = str(uuid.uuid4())
            doc_row = _make_document_row(doc_id=doc_id)
            doc_row.parse_status = "parsed"

            claim_row = _make_claim_row()
            claim_row.normalized_data = '{"patient_name": "John Doe"}'

            with patch("routes.documents.run_query_single", new_callable=AsyncMock) as mock_rqs:
                mock_rqs.side_effect = [doc_row, claim_row]
                response = await client.get(f"/api/documents/{doc_id}/parsed")
                assert response.status_code == 200
                data = response.json()
                assert data["document_id"] == doc_id
                assert data["parse_status"] == "parsed"
                assert data["normalized_data"] is not None
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_parsed_data_no_linked_claim(self):
        """Document exists but no linked claim."""
        client, _ = await _get_client()
        try:
            doc_id = str(uuid.uuid4())
            doc_row = _make_document_row(doc_id=doc_id)

            with patch("routes.documents.run_query_single", new_callable=AsyncMock) as mock_rqs:
                mock_rqs.side_effect = [doc_row, None]
                response = await client.get(f"/api/documents/{doc_id}/parsed")
                assert response.status_code == 200
                data = response.json()
                assert data["normalized_data"] is None
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_parsed_data_not_found(self):
        client, _ = await _get_client()
        try:
            with patch("routes.documents.run_query_single", new_callable=AsyncMock) as mock_rqs:
                mock_rqs.return_value = None
                response = await client.get(f"/api/documents/{uuid.uuid4()}/parsed")
                assert response.status_code == 404
        finally:
            await client.aclose()
            app.dependency_overrides.clear()
