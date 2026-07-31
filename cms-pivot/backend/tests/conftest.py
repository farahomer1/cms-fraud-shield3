# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""Shared test fixtures for PIVOT backend tests."""
import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Mock BigQuery client
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_db():
    """Return a lightweight MagicMock that quacks like a bigquery.Client."""
    return MagicMock()


# ---------------------------------------------------------------------------
# Sample domain objects used across tests
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_veteran():
    from models.veteran import Veteran
    return Veteran(
        id=str(uuid.uuid4()),
        name_display="John Doe",
        ssn_last4="1234",
        date_of_birth=date(1960, 5, 15),
        date_of_death=None,
        vital_status="alive",
        service_branch="Army",
        disability_rating=70,
    )


@pytest.fixture
def sample_deceased_veteran():
    from models.veteran import Veteran
    return Veteran(
        id=str(uuid.uuid4()),
        name_display="James Smith",
        ssn_last4="5678",
        date_of_birth=date(1945, 3, 10),
        date_of_death=date(2024, 6, 1),
        vital_status="deceased",
        service_branch="Navy",
        disability_rating=100,
    )


@pytest.fixture
def sample_provider():
    from models.provider import Provider
    return Provider(
        id=str(uuid.uuid4()),
        name="VA Medical Center",
        npi="1234567890",
        provider_type="organization",
        specialty="General Practice",
        address={"street": "123 VA Blvd", "city": "Washington", "state": "DC"},
        risk_score=25,
        accreditation_status="accredited",
    )


@pytest.fixture
def sample_high_risk_provider():
    from models.provider import Provider
    return Provider(
        id=str(uuid.uuid4()),
        name="Suspect Clinic LLC",
        npi="9876543210",
        provider_type="individual",
        specialty="Pain Management",
        address={"street": "456 Shady Ln", "city": "Miami", "state": "FL"},
        risk_score=85,
        accreditation_status="unaccredited",
    )


@pytest.fixture
def sample_batch():
    from models.batch import Batch
    return Batch(
        id=str(uuid.uuid4()),
        name="Batch-2025-10-21-Mixed",
        received_date=date(2025, 10, 21),
        file_count=5,
        status="pending",
        total_claims=5,
    )


@pytest.fixture
def sample_claim(sample_batch, sample_veteran, sample_provider):
    from models.claim import Claim
    return Claim(
        id=str(uuid.uuid4()),
        claim_number="CLM-0001234567",
        batch_id=sample_batch.id,
        veteran_id=sample_veteran.id,
        provider_id=sample_provider.id,
        claim_type="medical",
        status="pending",
        billing_amount=Decimal("4250.00"),
        service_date=date(2025, 10, 15),
        diagnosis_codes=["M54.5", "G89.4"],
        procedure_codes=["99213", "20610"],
    )


@pytest.fixture
def sample_flagged_claim(sample_batch, sample_deceased_veteran, sample_high_risk_provider):
    from models.claim import Claim
    return Claim(
        id=str(uuid.uuid4()),
        claim_number="CLM-9988776655",
        batch_id=sample_batch.id,
        veteran_id=sample_deceased_veteran.id,
        provider_id=sample_high_risk_provider.id,
        claim_type="disability",
        status="flagged",
        risk_level="high",
        billing_amount=Decimal("12500.00"),
        service_date=date(2025, 10, 20),
        diagnosis_codes=["F41.1"],
        procedure_codes=["99215"],
    )


@pytest.fixture
def sample_finding(sample_claim):
    from models.agent_finding import AgentFinding
    return AgentFinding(
        id=str(uuid.uuid4()),
        claim_id=sample_claim.id,
        agent_name="rules_engine",
        fraud_type="VA Financial Policy Violation",
        confidence_score=85,
        recommendation="flag",
        flagged_data_points=["Billing amount exceeds threshold"],
        evidence_summary="Billing amount of $4,250 exceeds expected range.",
        finding_details={"rules_checked": ["billing_reasonableness"], "violations": ["amount_threshold"]},
        processing_time_ms=1200,
    )


@pytest.fixture
def sample_document(sample_batch):
    from models.document import Document
    return Document(
        id=str(uuid.uuid4()),
        batch_id=sample_batch.id,
        filename="medical-claim-001.pdf",
        file_type="pdf",
        file_path="data/demo-documents/medical-claim-001.pdf",
        file_size=102400,
        parse_status="raw",
    )


# ---------------------------------------------------------------------------
# Gemini client mock
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_gemini():
    """Patch gemini_client functions with sensible defaults."""
    with patch("services.gemini_client.generate_text", new_callable=AsyncMock) as gen_text, \
         patch("services.gemini_client.generate_json", new_callable=AsyncMock) as gen_json, \
         patch("services.gemini_client.generate_multimodal", new_callable=AsyncMock) as gen_multi:
        gen_text.return_value = ("Mock AI response.", 500)
        gen_json.return_value = ({"parsed": True}, 600)
        gen_multi.return_value = ({"parsed": True}, 700)
        yield {
            "generate_text": gen_text,
            "generate_json": gen_json,
            "generate_multimodal": gen_multi,
        }
