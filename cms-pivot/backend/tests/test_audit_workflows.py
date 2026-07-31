# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""Tests for the audit workflow API routes."""
import pytest
from unittest.mock import AsyncMock, patch

from httpx import ASGITransport, AsyncClient

from main import app


@pytest.fixture
def mock_gemini_text():
    with patch("routes.audit_workflows.generate_text", new_callable=AsyncMock) as mock:
        mock.return_value = ("Mock audit analysis complete. 5 issues found.", 500)
        yield mock


@pytest.fixture
def mock_gemini_json():
    with patch("routes.audit_workflows.generate_json", new_callable=AsyncMock) as mock:
        mock.return_value = (
            {
                "compliance_rate": 0.985,
                "violations": [
                    {
                        "rule": "NCCI-001",
                        "description": "Procedure code pair violation",
                        "severity": "medium",
                        "affected_claims": ["CLM-001"],
                    }
                ],
                "recommendations": ["Review flagged procedure combinations"],
            },
            600,
        )
        yield mock


@pytest.fixture
def mock_gemini_text_error():
    with patch("routes.audit_workflows.generate_text", new_callable=AsyncMock) as mock:
        mock.side_effect = Exception("Gemini API unavailable")
        yield mock


@pytest.fixture
def mock_gemini_json_error():
    with patch("routes.audit_workflows.generate_json", new_callable=AsyncMock) as mock:
        mock.side_effect = Exception("Gemini API unavailable")
        yield mock


# ─── Execute Step Tests ───


@pytest.mark.asyncio
async def test_execute_step_ai_analysis(mock_gemini_text):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/audit-workflows/execute-step",
            json={
                "step_type": "ai_analysis",
                "step_name": "Billing Pattern Analysis",
                "workflow_name": "Provider Risk Assessment",
                "context": "Provider NPI 1234567890 billed $250K over 30 days, 80% E/M codes",
                "config": {},
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "output" in data
    assert data["step_type"] == "ai_analysis"
    assert data["step_name"] == "Billing Pattern Analysis"
    assert "latency_ms" in data
    mock_gemini_text.assert_awaited_once()


@pytest.mark.asyncio
async def test_execute_step_summarization(mock_gemini_text):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/audit-workflows/execute-step",
            json={
                "step_type": "summarization",
                "step_name": "Generate Summary",
                "workflow_name": "Claims Compliance Audit",
                "context": "23 NCCI violations, 8 MUE exceedances, $47K estimated improper payments",
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["step_type"] == "summarization"


@pytest.mark.asyncio
async def test_execute_step_compliance_check(mock_gemini_text):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/audit-workflows/execute-step",
            json={
                "step_type": "compliance_check",
                "step_name": "NCCI Edit Check",
                "workflow_name": "Claims Compliance Audit",
                "context": "Claim CLM-001: CPT 99213 + 20610, billed $450",
                "config": {"ruleSet": "ncci"},
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"


@pytest.mark.asyncio
async def test_execute_step_risk_scoring(mock_gemini_text):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/audit-workflows/execute-step",
            json={
                "step_type": "risk_scoring",
                "step_name": "Calculate Risk Scores",
                "workflow_name": "Provider Risk Assessment",
                "context": "Provider A: 50 claims, $120K total. Provider B: 200 claims, $800K total",
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"


@pytest.mark.asyncio
async def test_execute_step_report_generation(mock_gemini_text):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/audit-workflows/execute-step",
            json={
                "step_type": "report_generation",
                "step_name": "Generate Final Report",
                "workflow_name": "Financial Audit",
                "context": "5 findings, $82K estimated savings, 3 providers flagged",
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["step_type"] == "report_generation"


@pytest.mark.asyncio
async def test_execute_step_non_ai_type(mock_gemini_text):
    """Non-AI step types (data_collection, notification, manual_review) should return 'skipped'."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/audit-workflows/execute-step",
            json={
                "step_type": "data_collection",
                "step_name": "Collect Data",
                "workflow_name": "Test Workflow",
                "context": "Pull from BigQuery",
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "skipped"
    mock_gemini_text.assert_not_awaited()


@pytest.mark.asyncio
async def test_execute_step_notification_skipped(mock_gemini_text):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/audit-workflows/execute-step",
            json={
                "step_type": "notification",
                "step_name": "Send Alerts",
                "workflow_name": "Test Workflow",
            },
        )
    assert resp.status_code == 200
    assert resp.json()["status"] == "skipped"


@pytest.mark.asyncio
async def test_execute_step_manual_review_skipped(mock_gemini_text):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/audit-workflows/execute-step",
            json={
                "step_type": "manual_review",
                "step_name": "Human Review",
                "workflow_name": "Test Workflow",
            },
        )
    assert resp.status_code == 200
    assert resp.json()["status"] == "skipped"


@pytest.mark.asyncio
async def test_execute_step_error(mock_gemini_text_error):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/audit-workflows/execute-step",
            json={
                "step_type": "ai_analysis",
                "step_name": "Failing Step",
                "workflow_name": "Test Workflow",
                "context": "test data",
            },
        )
    assert resp.status_code == 500
    assert "Gemini API unavailable" in resp.json()["detail"]


# ─── Summarize Tests ───


@pytest.mark.asyncio
async def test_summarize_success(mock_gemini_text):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/audit-workflows/summarize",
            json={
                "text": "23 NCCI violations found across 2,847 claims. 8 MUE exceedances.",
                "focus": "compliance",
                "max_length": 300,
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "summary" in data
    assert "latency_ms" in data
    mock_gemini_text.assert_awaited_once()


@pytest.mark.asyncio
async def test_summarize_default_focus(mock_gemini_text):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/audit-workflows/summarize",
            json={"text": "Some audit data to summarize"},
        )
    assert resp.status_code == 200
    assert "summary" in resp.json()


@pytest.mark.asyncio
async def test_summarize_error(mock_gemini_text_error):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/audit-workflows/summarize",
            json={"text": "test data"},
        )
    assert resp.status_code == 500
    assert "Summarization failed" in resp.json()["detail"]


# ─── Compliance Check Tests ───


@pytest.mark.asyncio
async def test_compliance_check_success(mock_gemini_json):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/audit-workflows/compliance-check",
            json={
                "claims_data": "CLM-001: CPT 99213 + 20610, $450; CLM-002: CPT 99215, $280",
                "rule_set": "ncci",
                "guidelines": "VA Community Care policies",
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "results" in data
    assert "latency_ms" in data
    assert data["results"]["compliance_rate"] == 0.985
    mock_gemini_json.assert_awaited_once()


@pytest.mark.asyncio
async def test_compliance_check_default_rules(mock_gemini_json):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/audit-workflows/compliance-check",
            json={"claims_data": "CLM-001: CPT 99213, $150"},
        )
    assert resp.status_code == 200
    assert "results" in resp.json()


@pytest.mark.asyncio
async def test_compliance_check_error(mock_gemini_json_error):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/audit-workflows/compliance-check",
            json={"claims_data": "test"},
        )
    assert resp.status_code == 500
    assert "Compliance check failed" in resp.json()["detail"]


# ─── Risk Score Tests ───


@pytest.mark.asyncio
async def test_risk_score_success(mock_gemini_json):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/audit-workflows/risk-score",
            json={
                "entity_data": "Provider A: 50 claims, $120K; Provider B: 200 claims, $800K",
                "scoring_criteria": "billing volume, complaint history, accreditation",
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "results" in data
    assert "latency_ms" in data
    mock_gemini_json.assert_awaited_once()


@pytest.mark.asyncio
async def test_risk_score_default_criteria(mock_gemini_json):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/audit-workflows/risk-score",
            json={"entity_data": "Provider X: 30 claims, $50K total"},
        )
    assert resp.status_code == 200
    assert "results" in resp.json()


@pytest.mark.asyncio
async def test_risk_score_error(mock_gemini_json_error):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/audit-workflows/risk-score",
            json={"entity_data": "test"},
        )
    assert resp.status_code == 500
    assert "Risk scoring failed" in resp.json()["detail"]


# ─── Request Validation Tests ───


@pytest.mark.asyncio
async def test_execute_step_missing_required_fields():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/audit-workflows/execute-step",
            json={"step_type": "ai_analysis"},
        )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_summarize_missing_text():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/audit-workflows/summarize",
            json={},
        )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_compliance_check_missing_data():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/audit-workflows/compliance-check",
            json={},
        )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_risk_score_missing_data():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/audit-workflows/risk-score",
            json={},
        )
    assert resp.status_code == 422
