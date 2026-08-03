# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import pytest
from unittest.mock import MagicMock, AsyncMock
from datagen.generator import generate_all_data


@pytest.mark.anyio
async def test_generate_all_data_structure():
    # Arrange: Mock the BigQuery client and database insert methods
    mock_bq = MagicMock()
    
    # We mock insert_rows and get_dataset to avoid reaching the real BigQuery in this unit test
    import datagen.generator as gen
    original_insert_rows = gen.insert_rows
    original_clear_all_tables = gen.clear_all_tables
    
    gen.insert_rows = AsyncMock(return_value=[])
    gen.clear_all_tables = AsyncMock()

    try:
        # Act
        result = await generate_all_data(mock_bq)

        # Assert
        assert result["beneficiaries"] > 100
        assert result["pecos_records"] >= 25
        assert result["pecos_events"] >= 30
        assert result["claims"] > 150
        assert result["claim_labels"] == result["claims"]
        
        # Verify clear and inserts were triggered
        gen.clear_all_tables.assert_called_once_with(mock_bq)
        assert gen.insert_rows.call_count == 11
    finally:
        # Restore originals
        gen.insert_rows = original_insert_rows
        gen.clear_all_tables = original_clear_all_tables
