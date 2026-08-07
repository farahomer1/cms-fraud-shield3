# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""
BigQuery Schema Management for PIVOT.

Creates all required tables in the configured BigQuery dataset.

Usage:
    python schema.py [--drop]
"""

import sys

from google.cloud import bigquery
from google.api_core.exceptions import Conflict

from config import settings
from database import get_sync_client, get_dataset


TABLES = {
    "batches": [
        bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("name", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("received_date", "DATE", mode="REQUIRED"),
        bigquery.SchemaField("file_count", "INTEGER", mode="NULLABLE"),
        bigquery.SchemaField("status", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("total_claims", "INTEGER", mode="NULLABLE"),
        bigquery.SchemaField("flagged_count", "INTEGER", mode="NULLABLE"),
        bigquery.SchemaField("approved_count", "INTEGER", mode="NULLABLE"),
        bigquery.SchemaField("created_at", "TIMESTAMP", mode="NULLABLE"),
        bigquery.SchemaField("updated_at", "TIMESTAMP", mode="NULLABLE"),
    ],
    "members": [
        bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("name_display", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("ssn_last4", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("date_of_birth", "DATE", mode="REQUIRED"),
        bigquery.SchemaField("date_of_death", "DATE", mode="NULLABLE"),
        bigquery.SchemaField("vital_status", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("service_branch", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("disability_rating", "INTEGER", mode="NULLABLE"),
        bigquery.SchemaField("benefits_enrolled", "JSON", mode="NULLABLE"),
        bigquery.SchemaField("created_at", "TIMESTAMP", mode="NULLABLE"),
    ],
    "providers": [
        bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("name", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("npi", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("provider_type", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("specialty", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("address", "JSON", mode="NULLABLE"),
        bigquery.SchemaField("risk_score", "INTEGER", mode="NULLABLE"),
        bigquery.SchemaField("accreditation_status", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("claim_history", "JSON", mode="NULLABLE"),
        bigquery.SchemaField("created_at", "TIMESTAMP", mode="NULLABLE"),
    ],
    "documents": [
        bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("batch_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("filename", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("file_type", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("file_path", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("file_size", "INTEGER", mode="NULLABLE"),
        bigquery.SchemaField("parse_status", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("created_at", "TIMESTAMP", mode="NULLABLE"),
    ],
    "claims": [
        bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("claim_number", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("batch_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("beneficiary_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("provider_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("claim_type", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("raw_document_id", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("normalized_data", "JSON", mode="NULLABLE"),
        bigquery.SchemaField("status", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("risk_level", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("billing_amount", "NUMERIC", mode="NULLABLE"),
        bigquery.SchemaField("service_date", "DATE", mode="REQUIRED"),
        bigquery.SchemaField("diagnosis_codes", "JSON", mode="NULLABLE"),
        bigquery.SchemaField("procedure_codes", "JSON", mode="NULLABLE"),
        bigquery.SchemaField("mbi", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("billing_npi", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("hcpcs_code", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("quantity", "INTEGER", mode="NULLABLE"),
        bigquery.SchemaField("state", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("prior_auth", "BOOLEAN", mode="NULLABLE"),
        bigquery.SchemaField("modifier", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("sim_service_date", "DATE", mode="NULLABLE"),
        bigquery.SchemaField("risk_score", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("sim_service_ts", "TIMESTAMP", mode="NULLABLE"),
        bigquery.SchemaField("queued_at_sim", "TIMESTAMP", mode="NULLABLE"),
        bigquery.SchemaField("sla_breached", "BOOLEAN", mode="NULLABLE"),
        bigquery.SchemaField("created_at", "TIMESTAMP", mode="NULLABLE"),
        bigquery.SchemaField("updated_at", "TIMESTAMP", mode="NULLABLE"),
    ],
    "agent_findings": [
        bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("claim_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("agent_name", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("fraud_type", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("confidence_score", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("recommendation", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("flagged_data_points", "JSON", mode="NULLABLE"),
        bigquery.SchemaField("evidence_summary", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("finding_details", "JSON", mode="NULLABLE"),
        bigquery.SchemaField("processing_time_ms", "INTEGER", mode="NULLABLE"),
        bigquery.SchemaField("created_at", "TIMESTAMP", mode="NULLABLE"),
    ],
    "decisions": [
        bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("claim_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("decision_type", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("actor", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("actor_role", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("rationale", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("savings_amount", "NUMERIC", mode="NULLABLE"),
        bigquery.SchemaField("created_at", "TIMESTAMP", mode="NULLABLE"),
    ],
    "chat_messages": [
        bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("claim_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("role", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("content", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("created_at", "TIMESTAMP", mode="NULLABLE"),
    ],
    "overpayments": [
        bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("claim_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("provider_name", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("provider_npi", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("original_billing_amount", "NUMERIC", mode="REQUIRED"),
        bigquery.SchemaField("allowable_amount", "NUMERIC", mode="REQUIRED"),
        bigquery.SchemaField("overpayment_amount", "NUMERIC", mode="REQUIRED"),
        bigquery.SchemaField("recoupment_status", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("date_identified", "DATE", mode="REQUIRED"),
        bigquery.SchemaField("fms_paid_date", "DATE", mode="NULLABLE"),
        bigquery.SchemaField("assigned_analyst", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("created_at", "TIMESTAMP", mode="NULLABLE"),
        bigquery.SchemaField("updated_at", "TIMESTAMP", mode="NULLABLE"),
    ],
    "audit_log": [
        bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("timestamp", "TIMESTAMP", mode="NULLABLE"),
        bigquery.SchemaField("actor", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("actor_type", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("action_type", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("claim_id", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("details", "JSON", mode="NULLABLE"),
        bigquery.SchemaField("confidence_score", "INTEGER", mode="NULLABLE"),
    ],
    "agent_flags": [
        bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("agent_name", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("claim_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("claim_number", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("flagged_by", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("notes", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("created_at", "TIMESTAMP", mode="NULLABLE"),
    ],
    "beneficiaries": [
        bigquery.SchemaField("mbi", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("name", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("condition", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("lcd_cap", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("is_compromised", "BOOLEAN", mode="REQUIRED"),
        bigquery.SchemaField("is_fabricated", "BOOLEAN", mode="REQUIRED"),
        bigquery.SchemaField("created_at", "TIMESTAMP", mode="NULLABLE"),
    ],
    "pecos_records": [
        bigquery.SchemaField("npi", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("name", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("authorized_official", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("practice_address", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("status", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("enrollment_status", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("created_at", "TIMESTAMP", mode="NULLABLE"),
    ],
    "pecos_events": [
        bigquery.SchemaField("event_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("npi", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("event_type", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("old_value", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("new_value", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("sim_event_date", "DATE", mode="REQUIRED"),
        bigquery.SchemaField("created_at", "TIMESTAMP", mode="NULLABLE"),
    ],
    "cmra_addresses": [
        bigquery.SchemaField("address", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("city", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("state", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("source", "STRING", mode="NULLABLE"),
    ],
    "consult_registry": [
        bigquery.SchemaField("consult_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("mbi", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("cpt_code", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("icd10_code", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("sim_consult_date", "DATE", mode="REQUIRED"),
        bigquery.SchemaField("created_at", "TIMESTAMP", mode="NULLABLE"),
    ],
    "disbursements": [
        bigquery.SchemaField("claim_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("amount", "NUMERIC", mode="REQUIRED"),
        bigquery.SchemaField("sim_disbursed_at", "TIMESTAMP", mode="REQUIRED"),
    ],
    "mbi_locks": [
        bigquery.SchemaField("mbi", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("locked_at_sim", "TIMESTAMP", mode="REQUIRED"),
        bigquery.SchemaField("reason", "STRING", mode="REQUIRED"),
    ],
    "appeals": [
        bigquery.SchemaField("appeal_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("claim_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("filed_at_sim", "TIMESTAMP", mode="REQUIRED"),
        bigquery.SchemaField("level", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("status", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("latency_ms", "INTEGER", mode="NULLABLE"),
        bigquery.SchemaField("decided_at_sim", "TIMESTAMP", mode="NULLABLE"),
    ],
    "alj_queue": [
        bigquery.SchemaField("claim_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("appeal_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("entered_at_sim", "TIMESTAMP", mode="REQUIRED"),
    ],
    "claim_labels": [
        bigquery.SchemaField("claim_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("is_fraud", "BOOLEAN", mode="REQUIRED"),
    ],
    "shadow_claims": [
        bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("claim_number", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("billing_amount", "NUMERIC", mode="NULLABLE"),
        bigquery.SchemaField("service_date", "DATE", mode="REQUIRED"),
        bigquery.SchemaField("hcpcs_code", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("state", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("mbi", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("billing_npi", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("sim_service_date", "DATE", mode="NULLABLE"),
    ],
    "threat_profiles": [
        bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("hcpcs_codes", "JSON", mode="REQUIRED"),
        bigquery.SchemaField("states", "JSON", mode="REQUIRED"),
        bigquery.SchemaField("supplier_npis", "JSON", mode="REQUIRED"),
        bigquery.SchemaField("created_at_sim", "TIMESTAMP", mode="REQUIRED"),
    ],
}


def create_dataset(client: bigquery.Client) -> None:
    """Create the dataset if it doesn't exist."""
    dataset_ref = bigquery.DatasetReference(
        client.project, settings.bigquery_dataset
    )
    dataset = bigquery.Dataset(dataset_ref)
    dataset.location = "US"
    try:
        client.create_dataset(dataset)
        print(f"Created dataset: {dataset_ref}")
    except Conflict:
        print(f"Dataset already exists: {dataset_ref}")


def create_tables(client: bigquery.Client) -> None:
    """Create all tables in the dataset. Migrates existing tables by adding any missing fields."""
    dataset = get_dataset()
    for table_name, schema in TABLES.items():
        table_ref = f"{dataset}.{table_name}"
        table = bigquery.Table(table_ref, schema=schema)
        try:
            client.create_table(table)
            print(f"  Created table: {table_name}")
        except Conflict:
            print(f"  Table already exists: {table_name}")
            try:
                existing_table = client.get_table(table_ref)
                existing_fields = {f.name for f in existing_table.schema}
                new_fields = []
                for field in schema:
                    if field.name not in existing_fields:
                        new_fields.append(field)
                if new_fields:
                    print(f"  Migrating {table_name}: adding columns {[f.name for f in new_fields]}")
                    existing_table.schema = list(existing_table.schema) + new_fields
                    client.update_table(existing_table, ["schema"])
            except Exception as e:
                print(f"  Failed to migrate schema for {table_name}: {e}")


def drop_tables(client: bigquery.Client) -> None:
    """Drop all tables in the dataset."""
    dataset = get_dataset()
    for table_name in TABLES:
        table_ref = f"{dataset}.{table_name}"
        client.delete_table(table_ref, not_found_ok=True)
        print(f"  Dropped table: {table_name}")


if __name__ == "__main__":
    client = get_sync_client()
    if "--drop" in sys.argv:
        print("Dropping all tables...")
        drop_tables(client)
    print("Creating dataset and tables...")
    create_dataset(client)
    create_tables(client)
    print("Done.")
