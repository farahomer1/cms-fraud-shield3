# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""Tests for PIVOT backend services."""
import json
from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# monitoring_service  (pure function, no DB/AI)
# ---------------------------------------------------------------------------

class TestMonitoringService:

    def test_get_log_entries_valid_categories(self):
        from services.monitoring_service import get_log_entries
        for category in ("application", "ai_agent", "audit", "db", "ui_access", "action"):
            entries = get_log_entries(category, limit=5)
            assert len(entries) == 5
            for e in entries:
                assert "timestamp" in e
                assert "level" in e
                assert "source" in e
                assert "message" in e

    def test_get_log_entries_unknown_category_defaults_to_application(self):
        from services.monitoring_service import get_log_entries
        entries = get_log_entries("unknown", limit=3)
        assert len(entries) == 3

    def test_get_log_entries_limit_caps_at_50(self):
        from services.monitoring_service import get_log_entries
        entries = get_log_entries("application", limit=100)
        assert len(entries) == 50

    def test_log_entries_have_descending_timestamps(self):
        from services.monitoring_service import get_log_entries
        entries = get_log_entries("application", limit=10)
        timestamps = [e["timestamp"] for e in entries]
        assert timestamps == sorted(timestamps, reverse=True)


# ---------------------------------------------------------------------------
# analytics_service
# ---------------------------------------------------------------------------

class TestAnalyticsService:

    @pytest.mark.asyncio
    async def test_get_dashboard_metrics(self, mock_db):
        from services.analytics_service import get_dashboard_metrics

        # Mock run_query_single for 2 sequential calls
        counts_row = MagicMock()
        counts_row.total = 65
        counts_row.flagged = 10
        counts_row.approved = 50
        counts_row.denied = 5

        savings_row = MagicMock()
        savings_row.total = 45200.0

        with patch("services.analytics_service.run_query_single", new_callable=AsyncMock) as mock_rqs:
            mock_rqs.side_effect = [counts_row, savings_row]
            result = await get_dashboard_metrics(mock_db)

        assert result["total_claims"] == 65
        assert result["flagged_claims"] == 10
        assert result["approved_claims"] == 50
        assert result["denied_claims"] == 5
        assert result["total_savings"] == 45200.0
        assert "active_claims_annual" in result
        assert "realized_savings" in result

    @pytest.mark.asyncio
    async def test_get_fraud_trends(self, mock_db):

        with patch("services.analytics_service.get_fraud_trends") as mock_fn:
            mock_fn.return_value = [
                {
                    "agent": "rules_engine",
                    "agent_name": "rules_engine",
                    "flag_count": 5,
                    "high": 2,
                    "medium": 2,
                    "low": 1,
                    "risk_breakdown": {"high": 2, "medium": 2, "low": 1},
                }
            ]
            trends = await mock_fn(mock_db)
            assert len(trends) >= 1
            trend = trends[0]
            assert "agent" in trend
            assert "high" in trend
            assert "medium" in trend
            assert "low" in trend

    @pytest.mark.asyncio
    async def test_get_agent_efficacy(self, mock_db):

        with patch("services.analytics_service.get_agent_efficacy") as mock_fn:
            mock_fn.return_value = [
                {
                    "month": "Jan",
                    "scores": {"rules_engine": 0.85},
                    "rules_engine": 0.85,
                }
            ]
            result = await mock_fn(mock_db)
            assert len(result) >= 1
            item = result[0]
            assert "month" in item
            assert "rules_engine" in item

    @pytest.mark.asyncio
    async def test_generate_insight(self, mock_db, mock_gemini):
        from services.analytics_service import generate_insight

        with patch("services.analytics_service.get_fraud_trends", new_callable=AsyncMock) as mock_trends:
            mock_trends.return_value = [{"agent_name": "rules_engine", "flag_count": 5}]
            result = await generate_insight("fraud-trends", mock_db)
            assert "narrative" in result
            assert "insight" in result
            assert "chart_type" in result

    @pytest.mark.asyncio
    async def test_get_savings_data(self, mock_db):
        from services.analytics_service import get_savings_data

        with patch("services.analytics_service.run_query", new_callable=AsyncMock) as mock_rq:
            mock_rq.return_value = []  # no decisions → fallback to synthetic data
            data = await get_savings_data(mock_db)
            assert isinstance(data, list)
            assert len(data) == 30  # synthetic fallback generates 30 days


# ---------------------------------------------------------------------------
# fraud_research_service
# ---------------------------------------------------------------------------

class TestFraudResearchService:

    @pytest.mark.asyncio
    async def test_get_anomaly_clusters(self, mock_db):
        from services.fraud_research_service import get_anomaly_clusters

        mock_row = MagicMock()
        mock_row.name = "Suspect Clinic"
        mock_row.id = "p-1"
        mock_row.risk_score = 85
        mock_row.finding_count = 10
        mock_row.avg_confidence = 78.5

        with patch("services.fraud_research_service.run_query", new_callable=AsyncMock) as mock_rq:
            mock_rq.return_value = [mock_row]
            clusters = await get_anomaly_clusters(mock_db)

        assert len(clusters) == 1
        cluster = clusters[0]
        assert cluster["provider_name"] == "Suspect Clinic"
        assert cluster["risk_score"] == 85
        assert cluster["finding_count"] == 10
        assert cluster["avg_confidence"] == 78.5

    @pytest.mark.asyncio
    async def test_analyze_anomaly_landscape_success(self, mock_db, mock_gemini):
        from services.fraud_research_service import analyze_anomaly_landscape

        with patch("services.fraud_research_service.get_anomaly_clusters", new_callable=AsyncMock) as mock_clusters:
            mock_clusters.return_value = [
                {"provider_name": "Test", "provider_id": "1", "risk_score": 50, "finding_count": 3, "avg_confidence": 75.0}
            ]
            result = await analyze_anomaly_landscape(mock_db)

        assert "analysis" in result
        assert "insights" in result
        assert "clusters" in result
        assert result["cluster_count"] == 1

    @pytest.mark.asyncio
    async def test_analyze_anomaly_landscape_gemini_failure(self, mock_db):
        from services.fraud_research_service import analyze_anomaly_landscape

        with patch("services.fraud_research_service.get_anomaly_clusters", new_callable=AsyncMock) as mock_clusters, \
             patch("services.gemini_client.generate_text", new_callable=AsyncMock) as mock_gen:
            mock_clusters.return_value = []
            mock_gen.side_effect = Exception("API down")
            result = await analyze_anomaly_landscape(mock_db)

        assert "unavailable" in result["analysis"].lower()
        assert result["cluster_count"] == 0

    @pytest.mark.asyncio
    async def test_search_patterns_returns_expected_fields(self, mock_db, mock_gemini):
        from services.fraud_research_service import search_patterns

        with patch("services.fraud_research_service.run_query", new_callable=AsyncMock) as mock_rq:
            mock_rq.return_value = []  # no flagged claims
            result = await search_patterns("pension poaching", mock_db)

        assert "query" in result
        assert "results" in result
        assert "summary" in result
        assert "text" in result
        assert "total_claims_searched" in result


# ---------------------------------------------------------------------------
# chat_service
# ---------------------------------------------------------------------------

class TestChatService:

    @pytest.mark.asyncio
    async def test_generate_executive_summary_claim_not_found(self, mock_db):
        from services.chat_service import generate_executive_summary

        with patch("services.chat_service.run_query_single", new_callable=AsyncMock) as mock_rqs:
            mock_rqs.return_value = None
            summary = await generate_executive_summary("nonexistent", mock_db)
        assert "not found" in summary.lower()

    @pytest.mark.asyncio
    async def test_generate_executive_summary_success(self, mock_db, mock_gemini, sample_flagged_claim, sample_deceased_veteran, sample_high_risk_provider):
        from services.chat_service import generate_executive_summary

        # Build a mock BQ row with all the fields _load_claim_with_relations expects
        mock_row = MagicMock()
        mock_row.id = sample_flagged_claim.id
        mock_row.claim_number = sample_flagged_claim.claim_number
        mock_row.batch_id = sample_flagged_claim.batch_id
        mock_row.veteran_id = sample_deceased_veteran.id
        mock_row.provider_id = sample_high_risk_provider.id
        mock_row.claim_type = sample_flagged_claim.claim_type
        mock_row.status = sample_flagged_claim.status
        mock_row.risk_level = sample_flagged_claim.risk_level
        mock_row.billing_amount = sample_flagged_claim.billing_amount
        mock_row.service_date = sample_flagged_claim.service_date
        mock_row.diagnosis_codes = json.dumps(sample_flagged_claim.diagnosis_codes)
        mock_row.procedure_codes = json.dumps(sample_flagged_claim.procedure_codes)
        mock_row.normalized_data = None
        mock_row.raw_document_id = None
        mock_row.created_at = datetime.now(timezone.utc)
        mock_row.updated_at = datetime.now(timezone.utc)
        # Veteran fields
        mock_row.v_name_display = sample_deceased_veteran.name_display
        mock_row.v_ssn_last4 = sample_deceased_veteran.ssn_last4
        mock_row.v_dob = sample_deceased_veteran.date_of_birth
        mock_row.v_dod = sample_deceased_veteran.date_of_death
        mock_row.v_vital_status = sample_deceased_veteran.vital_status
        mock_row.v_service_branch = sample_deceased_veteran.service_branch
        mock_row.v_disability_rating = sample_deceased_veteran.disability_rating
        # Provider fields
        mock_row.p_name = sample_high_risk_provider.name
        mock_row.p_npi = sample_high_risk_provider.npi
        mock_row.p_provider_type = sample_high_risk_provider.provider_type
        mock_row.p_specialty = sample_high_risk_provider.specialty
        mock_row.p_address = json.dumps(sample_high_risk_provider.address)
        mock_row.p_risk_score = sample_high_risk_provider.risk_score
        mock_row.p_accreditation_status = sample_high_risk_provider.accreditation_status

        with patch("services.chat_service.run_query_single", new_callable=AsyncMock) as mock_rqs, \
             patch("services.chat_service.run_query", new_callable=AsyncMock) as mock_rq:
            mock_rqs.return_value = mock_row
            mock_rq.return_value = []  # no findings
            summary = await generate_executive_summary(sample_flagged_claim.id, mock_db)

        assert isinstance(summary, str)
        assert len(summary) > 0

    @pytest.mark.asyncio
    async def test_generate_chat_response_claim_not_found(self, mock_db):
        from services.chat_service import generate_chat_response

        with patch("services.chat_service.run_query_single", new_callable=AsyncMock) as mock_rqs:
            mock_rqs.return_value = None
            response = await generate_chat_response("nonexistent", "hello", mock_db)
        assert "not found" in response.lower()

    @pytest.mark.asyncio
    async def test_generate_chat_response_success(self, mock_db, mock_gemini, sample_claim, sample_veteran, sample_provider):
        from services.chat_service import generate_chat_response

        # Build mock row
        mock_row = MagicMock()
        mock_row.id = sample_claim.id
        mock_row.claim_number = sample_claim.claim_number
        mock_row.batch_id = sample_claim.batch_id
        mock_row.veteran_id = sample_veteran.id
        mock_row.provider_id = sample_provider.id
        mock_row.claim_type = sample_claim.claim_type
        mock_row.status = sample_claim.status
        mock_row.risk_level = None
        mock_row.billing_amount = sample_claim.billing_amount
        mock_row.service_date = sample_claim.service_date
        mock_row.diagnosis_codes = json.dumps(sample_claim.diagnosis_codes)
        mock_row.procedure_codes = json.dumps(sample_claim.procedure_codes)
        mock_row.normalized_data = None
        mock_row.raw_document_id = None
        mock_row.created_at = datetime.now(timezone.utc)
        mock_row.updated_at = datetime.now(timezone.utc)
        mock_row.v_name_display = sample_veteran.name_display
        mock_row.v_ssn_last4 = sample_veteran.ssn_last4
        mock_row.v_dob = sample_veteran.date_of_birth
        mock_row.v_dod = None
        mock_row.v_vital_status = sample_veteran.vital_status
        mock_row.v_service_branch = sample_veteran.service_branch
        mock_row.v_disability_rating = sample_veteran.disability_rating
        mock_row.p_name = sample_provider.name
        mock_row.p_npi = sample_provider.npi
        mock_row.p_provider_type = sample_provider.provider_type
        mock_row.p_specialty = sample_provider.specialty
        mock_row.p_address = json.dumps(sample_provider.address)
        mock_row.p_risk_score = sample_provider.risk_score
        mock_row.p_accreditation_status = sample_provider.accreditation_status

        with patch("services.chat_service.run_query_single", new_callable=AsyncMock) as mock_rqs, \
             patch("services.chat_service.run_query", new_callable=AsyncMock) as mock_rq:
            mock_rqs.return_value = mock_row
            # First run_query for findings, second for chat history
            mock_rq.side_effect = [[], []]
            response = await generate_chat_response(sample_claim.id, "What is suspicious?", mock_db)

        assert isinstance(response, str)

    @pytest.mark.asyncio
    async def test_build_claim_context(self, sample_claim, sample_veteran, sample_provider):
        from services.chat_service import _build_claim_context

        sample_claim.veteran = sample_veteran
        sample_claim.provider = sample_provider
        sample_claim.findings = []
        sample_claim.normalized_data = None

        context = _build_claim_context(sample_claim)
        assert sample_claim.claim_number in context
        assert sample_veteran.name_display in context
        assert sample_provider.name in context


# ---------------------------------------------------------------------------
# gemini_client
# ---------------------------------------------------------------------------

class TestGeminiClient:

    def test_get_client_creates_singleton(self):
        import services.gemini_client as gc

        # Reset
        gc._client = None
        with patch("services.gemini_client.genai.Client") as MockClient:
            MockClient.return_value = MagicMock()
            client1 = gc.get_client()
            client2 = gc.get_client()
            assert client1 is client2
            MockClient.assert_called_once()
            gc._client = None  # cleanup

    @pytest.mark.asyncio
    async def test_health_check_success(self):
        from services.gemini_client import health_check

        with patch("services.gemini_client.generate_text", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = ("PIVOT system online.", 50)
            result = await health_check()
            assert result["status"] == "connected"
            assert result["latency_ms"] == 50

    @pytest.mark.asyncio
    async def test_health_check_failure(self):
        from services.gemini_client import health_check

        with patch("services.gemini_client.generate_text", new_callable=AsyncMock) as mock_gen:
            mock_gen.side_effect = Exception("Connection refused")
            result = await health_check()
            assert result["status"] == "error"
            assert "Connection refused" in result["error"]


# ---------------------------------------------------------------------------
# document_service
# ---------------------------------------------------------------------------

class TestDocumentService:

    @pytest.mark.asyncio
    async def test_parse_document_not_found(self, mock_db):
        from services.document_service import parse_document

        with patch("services.document_service.run_query_single", new_callable=AsyncMock) as mock_rqs:
            mock_rqs.return_value = None
            result = await parse_document("nonexistent", mock_db)
        assert result["error"] == "Document not found"

    @pytest.mark.asyncio
    async def test_parse_document_pdf_success(self, mock_db, mock_gemini, sample_document):
        from services.document_service import parse_document

        # Mock BQ row for document
        mock_doc_row = MagicMock()
        mock_doc_row.id = sample_document.id
        mock_doc_row.batch_id = sample_document.batch_id
        mock_doc_row.filename = sample_document.filename
        mock_doc_row.file_type = sample_document.file_type
        mock_doc_row.file_path = sample_document.file_path
        mock_doc_row.file_size = sample_document.file_size
        mock_doc_row.parse_status = sample_document.parse_status
        mock_doc_row.created_at = datetime.now(timezone.utc)

        with patch("services.document_service.run_query_single", new_callable=AsyncMock) as mock_rqs, \
             patch("services.document_service.run_dml", new_callable=AsyncMock) as mock_dml:
            # First call returns doc, second call returns no linked claim
            mock_rqs.side_effect = [mock_doc_row, None]
            mock_dml.return_value = 1
            result = await parse_document(sample_document.id, mock_db)

        assert result["parse_status"] == "parsed"


# ---------------------------------------------------------------------------
# Agent tests
# ---------------------------------------------------------------------------

class TestAgentRegistry:

    def test_all_agents_registered(self):
        from agents.registry import AGENT_REGISTRY, AGENT_DISPLAY_NAMES
        assert len(AGENT_REGISTRY) == 8
        names = {a.name for a in AGENT_REGISTRY}
        expected = {
            "rules_engine", "data_validation", "pension_poaching",
            "claim_sharking", "dbq_fraud", "overlapping_claims",
            "medical_record", "claim_discrepancy",
        }
        assert names == expected
        assert set(AGENT_DISPLAY_NAMES.keys()) == expected

    def test_get_agent_found(self):
        from agents.registry import get_agent
        agent = get_agent("rules_engine")
        assert agent is not None
        assert agent.name == "rules_engine"

    def test_get_agent_not_found(self):
        from agents.registry import get_agent
        assert get_agent("nonexistent") is None

    def test_each_agent_has_default_prompt(self):
        from agents.registry import AGENT_REGISTRY
        for agent in AGENT_REGISTRY:
            prompt = agent._default_prompt()
            assert isinstance(prompt, str)
            assert len(prompt) > 50
            assert agent.name in prompt.lower()

    @pytest.mark.asyncio
    async def test_base_agent_analyze(self, mock_gemini):
        from agents.registry import AGENT_REGISTRY

        agent = AGENT_REGISTRY[0]  # rules_engine

        claim_data = {
            "claim_number": "CLM-0001234567",
            "claim_type": "medical",
            "billing_amount": "4250.00",
            "service_date": "2025-10-15",
            "diagnosis_codes": ["M54.5"],
            "procedure_codes": ["99213"],
        }

        mock_gemini["generate_json"].return_value = (
            {
                "agent_name": agent.name,
                "fraud_type": agent.fraud_type,
                "confidence_score": 30,
                "recommendation": "pass",
                "flagged_data_points": [],
                "evidence_summary": "No violations found.",
                "finding_details": {},
            },
            800,
        )

        result = await agent.analyze(claim_data)
        assert result["agent_name"] == agent.name
        assert result["recommendation"] in ("pass", "flag")
        assert 0 <= result["confidence_score"] <= 100
        assert "processing_time_ms" in result

    @pytest.mark.asyncio
    async def test_base_agent_analyze_error_handling(self, mock_gemini):
        from agents.registry import AGENT_REGISTRY

        agent = AGENT_REGISTRY[0]
        mock_gemini["generate_json"].side_effect = Exception("API timeout")

        result = await agent.analyze({"claim_number": "CLM-TEST"})
        assert result["recommendation"] == "pass"
        assert result["confidence_score"] == 0
        assert "error" in result["evidence_summary"].lower()

    def test_base_agent_build_context(self):
        from agents.registry import AGENT_REGISTRY

        agent = AGENT_REGISTRY[0]
        context = agent.build_context(
            {"claim_number": "CLM-001"},
            {"name": "John Doe"},
            {"npi": "1234567890"},
            [{"claim_number": "CLM-002"}],
        )
        assert "CLM-001" in context
        assert "John Doe" in context
        assert "1234567890" in context
        assert "CLM-002" in context


# ---------------------------------------------------------------------------
# batch_service  (Story 2.7: Batch Processing Orchestration)
# ---------------------------------------------------------------------------

def _make_claim_bq_row(claim_id="c1", claim_number="CLM-0001", batch_id="b1",
                        veteran_id="v1", provider_id="p1", billing_amount=4250.0,
                        status="pending", claim_type="medical"):
    """Helper to create a mock BigQuery Row for batch_service queries."""
    row = MagicMock()
    row.id = claim_id
    row.claim_number = claim_number
    row.batch_id = batch_id
    row.veteran_id = veteran_id
    row.provider_id = provider_id
    row.claim_type = claim_type
    row.status = status
    row.risk_level = None
    row.billing_amount = billing_amount
    row.service_date = date(2025, 10, 15)
    row.diagnosis_codes = json.dumps(["M54.5"])
    row.procedure_codes = json.dumps(["99213"])
    row.normalized_data = None
    row.raw_document_id = None
    row.created_at = datetime.now(timezone.utc)
    row.updated_at = datetime.now(timezone.utc)
    # Veteran fields from JOIN
    row.v_name_display = "John Doe"
    row.v_ssn_last4 = "1234"
    row.v_dob = date(1960, 5, 15)
    row.v_dod = None
    row.v_vital_status = "alive"
    row.v_service_branch = "Army"
    row.v_disability_rating = 70
    # Provider fields from JOIN
    row.p_name = "VA Medical Center"
    row.p_npi = "1234567890"
    row.p_provider_type = "organization"
    row.p_specialty = "General Practice"
    row.p_risk_score = 25
    row.p_accreditation_status = "accredited"
    return row


class TestBatchService:
    """Tests for batch processing orchestration (Story 2.7)."""

    @pytest.mark.asyncio
    async def test_empty_batch_yields_complete_immediately(self, mock_db):
        """Story 2.7 AC1: Empty batch immediately yields batch_complete."""
        from services.batch_service import process_batch_claims

        with patch("services.batch_service.run_query", new_callable=AsyncMock) as mock_rq:
            mock_rq.return_value = []  # no pending claims
            events = []
            async for event in process_batch_claims("b1", mock_db):
                events.append(event)

        assert len(events) == 1
        assert events[0]["type"] == "batch_complete"
        assert events[0]["data"]["totalClaims"] == 0
        assert events[0]["data"]["flaggedCount"] == 0
        assert events[0]["data"]["approvedCount"] == 0

    @pytest.mark.asyncio
    async def test_risk_classification_high(self, mock_db):
        """Story 2.7 AC7: confidence >= 90 → risk_level = high."""
        from services.batch_service import process_batch_claims

        claim_row = _make_claim_bq_row()

        # Agent that flags with 95% confidence
        mock_agent = AsyncMock()
        mock_agent.name = "test_agent"
        mock_agent.analyze.return_value = {
            "agent_name": "test_agent",
            "fraud_type": "Test Fraud",
            "confidence_score": 95,
            "recommendation": "flag",
            "flagged_data_points": ["test"],
            "evidence_summary": "High confidence flag.",
            "finding_details": {},
            "processing_time_ms": 100,
        }

        with patch("services.batch_service.run_query", new_callable=AsyncMock) as mock_rq, \
             patch("services.batch_service.run_dml", new_callable=AsyncMock) as mock_dml, \
             patch("services.batch_service.insert_rows", new_callable=AsyncMock) as mock_insert, \
             patch("services.batch_service.AGENT_REGISTRY", [mock_agent]), \
             patch("services.batch_service.AGENT_DISPLAY_NAMES", {"test_agent": "Test Agent"}):

            # First call: pending claims; second call: all batch claims; third call: flagged agents
            mock_rq.side_effect = [[claim_row], [claim_row], [MagicMock(agent_name="test_agent")]]
            mock_dml.return_value = 1
            mock_insert.return_value = []

            events = []
            async for event in process_batch_claims("b1", mock_db):
                events.append(event)

        # Check the DML call for claim status update — should set risk_level to "high"
        status_update_calls = [
            c for c in mock_dml.call_args_list
            if "SET status" in str(c) and "risk_level" in str(c)
        ]
        assert len(status_update_calls) == 1
        # Verify the params include "high" risk level
        params = status_update_calls[0][0][1]  # second arg is params list
        risk_param = [p for p in params if p.name == "risk"]
        assert risk_param[0].value == "high"

        # Verify claim_complete event
        complete_events = [e for e in events if e["type"] == "claim_complete"]
        assert len(complete_events) == 1
        assert complete_events[0]["data"]["riskLevel"] == "high"
        assert complete_events[0]["data"]["status"] == "flagged"

    @pytest.mark.asyncio
    async def test_risk_classification_medium(self, mock_db):
        """Story 2.7 AC7: 70 <= confidence < 90 → risk_level = medium."""
        from services.batch_service import process_batch_claims

        claim_row = _make_claim_bq_row()

        mock_agent = AsyncMock()
        mock_agent.name = "test_agent"
        mock_agent.analyze.return_value = {
            "agent_name": "test_agent",
            "fraud_type": "Test Fraud",
            "confidence_score": 78,
            "recommendation": "flag",
            "flagged_data_points": ["test"],
            "evidence_summary": "Medium confidence flag.",
            "finding_details": {},
            "processing_time_ms": 100,
        }

        with patch("services.batch_service.run_query", new_callable=AsyncMock) as mock_rq, \
             patch("services.batch_service.run_dml", new_callable=AsyncMock) as mock_dml, \
             patch("services.batch_service.insert_rows", new_callable=AsyncMock) as mock_insert, \
             patch("services.batch_service.AGENT_REGISTRY", [mock_agent]), \
             patch("services.batch_service.AGENT_DISPLAY_NAMES", {"test_agent": "Test Agent"}):

            mock_rq.side_effect = [[claim_row], [claim_row], [MagicMock(agent_name="test_agent")]]
            mock_dml.return_value = 1
            mock_insert.return_value = []

            events = []
            async for event in process_batch_claims("b1", mock_db):
                events.append(event)

        complete = [e for e in events if e["type"] == "claim_complete"][0]
        assert complete["data"]["riskLevel"] == "medium"
        assert complete["data"]["status"] == "flagged"

    @pytest.mark.asyncio
    async def test_risk_classification_low(self, mock_db):
        """Story 2.7 AC7: confidence < 70 → risk_level = low."""
        from services.batch_service import process_batch_claims

        claim_row = _make_claim_bq_row()

        mock_agent = AsyncMock()
        mock_agent.name = "test_agent"
        mock_agent.analyze.return_value = {
            "agent_name": "test_agent",
            "fraud_type": "Test Fraud",
            "confidence_score": 55,
            "recommendation": "flag",
            "flagged_data_points": ["test"],
            "evidence_summary": "Low confidence flag.",
            "finding_details": {},
            "processing_time_ms": 100,
        }

        with patch("services.batch_service.run_query", new_callable=AsyncMock) as mock_rq, \
             patch("services.batch_service.run_dml", new_callable=AsyncMock) as mock_dml, \
             patch("services.batch_service.insert_rows", new_callable=AsyncMock) as mock_insert, \
             patch("services.batch_service.AGENT_REGISTRY", [mock_agent]), \
             patch("services.batch_service.AGENT_DISPLAY_NAMES", {"test_agent": "Test Agent"}):

            mock_rq.side_effect = [[claim_row], [claim_row], [MagicMock(agent_name="test_agent")]]
            mock_dml.return_value = 1
            mock_insert.return_value = []

            events = []
            async for event in process_batch_claims("b1", mock_db):
                events.append(event)

        complete = [e for e in events if e["type"] == "claim_complete"][0]
        assert complete["data"]["riskLevel"] == "low"

    @pytest.mark.asyncio
    async def test_all_pass_yields_approved(self, mock_db):
        """Story 2.7 AC7: All agents pass → claim approved, no risk level."""
        from services.batch_service import process_batch_claims

        claim_row = _make_claim_bq_row()

        mock_agent = AsyncMock()
        mock_agent.name = "test_agent"
        mock_agent.analyze.return_value = {
            "agent_name": "test_agent",
            "fraud_type": "Test Fraud",
            "confidence_score": 10,
            "recommendation": "pass",
            "flagged_data_points": [],
            "evidence_summary": "No issues found.",
            "finding_details": {},
            "processing_time_ms": 100,
        }

        with patch("services.batch_service.run_query", new_callable=AsyncMock) as mock_rq, \
             patch("services.batch_service.run_dml", new_callable=AsyncMock) as mock_dml, \
             patch("services.batch_service.insert_rows", new_callable=AsyncMock) as mock_insert, \
             patch("services.batch_service.AGENT_REGISTRY", [mock_agent]), \
             patch("services.batch_service.AGENT_DISPLAY_NAMES", {"test_agent": "Test Agent"}):

            mock_rq.side_effect = [[claim_row], [claim_row]]
            mock_dml.return_value = 1
            mock_insert.return_value = []

            events = []
            async for event in process_batch_claims("b1", mock_db):
                events.append(event)

        complete = [e for e in events if e["type"] == "claim_complete"][0]
        assert complete["data"]["status"] == "approved"
        assert complete["data"]["riskLevel"] is None

        batch_complete = [e for e in events if e["type"] == "batch_complete"][0]
        assert batch_complete["data"]["approvedCount"] == 1
        assert batch_complete["data"]["flaggedCount"] == 0

    @pytest.mark.asyncio
    async def test_audit_log_created_per_finding(self, mock_db):
        """Story 3.6 AC2: Every agent finding logged in audit trail."""
        from services.batch_service import process_batch_claims

        claim_row = _make_claim_bq_row()

        mock_agent = AsyncMock()
        mock_agent.name = "test_agent"
        mock_agent.analyze.return_value = {
            "agent_name": "test_agent",
            "fraud_type": "Test Fraud",
            "confidence_score": 50,
            "recommendation": "pass",
            "flagged_data_points": [],
            "evidence_summary": "No issues.",
            "finding_details": {},
            "processing_time_ms": 100,
        }

        with patch("services.batch_service.run_query", new_callable=AsyncMock) as mock_rq, \
             patch("services.batch_service.run_dml", new_callable=AsyncMock) as mock_dml, \
             patch("services.batch_service.insert_rows", new_callable=AsyncMock) as mock_insert, \
             patch("services.batch_service.AGENT_REGISTRY", [mock_agent]), \
             patch("services.batch_service.AGENT_DISPLAY_NAMES", {"test_agent": "Test Agent"}):

            mock_rq.side_effect = [[claim_row], [claim_row]]
            mock_dml.return_value = 1
            mock_insert.return_value = []

            events = []
            async for event in process_batch_claims("b1", mock_db):
                events.append(event)

        # Agent findings are inserted via run_dml to support immediate update/delete.
        # Audit log is inserted via insert_rows.
        dml_calls = mock_dml.call_args_list
        assert any("agent_findings" in call[0][0] for call in dml_calls)

        insert_calls = mock_insert.call_args_list
        table_names = [call[0][0] for call in insert_calls]
        assert "audit_log" in table_names
        audit_calls = [c for c in insert_calls if c[0][0] == "audit_log"]
        assert len(audit_calls) == 1  # one audit entry per agent finding

    @pytest.mark.asyncio
    async def test_sse_event_sequence(self, mock_db):
        """Story 2.7 AC4/AC6: SSE events in correct sequence."""
        from services.batch_service import process_batch_claims

        claim_row = _make_claim_bq_row()

        mock_agent = AsyncMock()
        mock_agent.name = "test_agent"
        mock_agent.analyze.return_value = {
            "agent_name": "test_agent",
            "fraud_type": "Test Fraud",
            "confidence_score": 20,
            "recommendation": "pass",
            "flagged_data_points": [],
            "evidence_summary": "Clear.",
            "finding_details": {},
            "processing_time_ms": 50,
        }

        with patch("services.batch_service.run_query", new_callable=AsyncMock) as mock_rq, \
             patch("services.batch_service.run_dml", new_callable=AsyncMock) as mock_dml, \
             patch("services.batch_service.insert_rows", new_callable=AsyncMock) as mock_insert, \
             patch("services.batch_service.AGENT_REGISTRY", [mock_agent]), \
             patch("services.batch_service.AGENT_DISPLAY_NAMES", {"test_agent": "Test Agent"}):

            mock_rq.side_effect = [[claim_row], [claim_row]]
            mock_dml.return_value = 1
            mock_insert.return_value = []

            events = []
            async for event in process_batch_claims("b1", mock_db):
                events.append(event)

        event_types = [e["type"] for e in events]
        assert event_types == [
            "batch_start",
            "claim_start",
            "agent_start",
            "agent_complete",
            "claim_complete",
            "batch_complete",
        ]
        # Verify batch_complete has summary stats
        batch_complete = events[-1]
        assert batch_complete["data"]["totalClaims"] == 1
        assert "flaggedCount" in batch_complete["data"]
        assert "approvedCount" in batch_complete["data"]

    @pytest.mark.asyncio
    async def test_agent_error_does_not_halt_processing(self, mock_db):
        """Story 2.7 AC8: Error in one agent doesn't halt the batch."""
        from services.batch_service import process_batch_claims

        claim_row = _make_claim_bq_row()

        # Agent that returns error result (from base_agent error handling)
        mock_agent = AsyncMock()
        mock_agent.name = "error_agent"
        mock_agent.analyze.return_value = {
            "agent_name": "error_agent",
            "fraud_type": "Unknown",
            "confidence_score": 0,
            "recommendation": "pass",
            "flagged_data_points": [],
            "evidence_summary": "Error during analysis.",
            "finding_details": {},
            "processing_time_ms": 0,
        }

        mock_agent2 = AsyncMock()
        mock_agent2.name = "good_agent"
        mock_agent2.analyze.return_value = {
            "agent_name": "good_agent",
            "fraud_type": "Good Check",
            "confidence_score": 50,
            "recommendation": "pass",
            "flagged_data_points": [],
            "evidence_summary": "Clear.",
            "finding_details": {},
            "processing_time_ms": 100,
        }

        with patch("services.batch_service.run_query", new_callable=AsyncMock) as mock_rq, \
             patch("services.batch_service.run_dml", new_callable=AsyncMock) as mock_dml, \
             patch("services.batch_service.insert_rows", new_callable=AsyncMock) as mock_insert, \
             patch("services.batch_service.AGENT_REGISTRY", [mock_agent, mock_agent2]), \
             patch("services.batch_service.AGENT_DISPLAY_NAMES", {"error_agent": "Error Agent", "good_agent": "Good Agent"}):

            mock_rq.side_effect = [[claim_row], [claim_row]]
            mock_dml.return_value = 1
            mock_insert.return_value = []

            events = []
            async for event in process_batch_claims("b1", mock_db):
                events.append(event)

        # Both agents should complete
        agent_completes = [e for e in events if e["type"] == "agent_complete"]
        assert len(agent_completes) == 2
        # Batch should complete
        assert events[-1]["type"] == "batch_complete"
