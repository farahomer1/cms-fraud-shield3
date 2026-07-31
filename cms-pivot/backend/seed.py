# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""
PIVOT Seed Data Loader

Loads synthetic seed data from JSON files in /data/seed/ into BigQuery.
Supports full reset (delete + re-insert) for demo environments.

Usage:
    # As an imported module (from FastAPI endpoint):
    from seed import reset_and_seed
    await reset_and_seed(bq_client)

    # As a standalone script:
    python seed.py [--reset]
"""

import asyncio
import json
import logging
import sys
from datetime import date, datetime, timezone
from pathlib import Path

from google.cloud import bigquery

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / "data" / "seed"

# Tables in reverse foreign-key order for safe deletion
TABLES_DELETE_ORDER = [
    "agent_flags",
    "audit_log",
    "chat_messages",
    "overpayments",
    "decisions",
    "agent_findings",
    "claims",
    "documents",
    "providers",
    "veterans",
    "batches",
]


def _load_json(filename: str) -> list[dict]:
    """Load a JSON seed file from the data/seed directory."""
    filepath = DATA_DIR / filename
    if not filepath.exists():
        logger.warning(f"Seed file not found: {filepath}")
        return []
    with open(filepath, "r") as f:
        return json.load(f)


def _format_date(value: str | None) -> str | None:
    """Validate and return an ISO date string for BigQuery."""
    if value is None:
        return None
    # Validate it parses
    date.fromisoformat(value)
    return value


def _format_datetime(value: str | None) -> str | None:
    """Validate and return an ISO datetime string for BigQuery."""
    if value is None:
        return None
    datetime.fromisoformat(value)
    return value


def _now_iso() -> str:
    """Return current UTC time as ISO string."""
    return datetime.now(timezone.utc).isoformat()


async def _clear_all_tables(bq: bigquery.Client) -> None:
    """Delete all data from tables in reverse FK order.

    Uses TRUNCATE TABLE which works even when the streaming buffer has
    recent inserts (unlike DELETE which BigQuery rejects in that case).
    """
    import asyncio as _aio
    from database import get_dataset
    ds = get_dataset()
    logger.info("Clearing all tables...")
    for table in TABLES_DELETE_ORDER:
        try:
            # TRUNCATE works on streaming-buffer rows; DELETE does not.
            job = bq.query(f"TRUNCATE TABLE `{ds}.{table}`")
            await _aio.to_thread(job.result)
        except Exception as exc:
            logger.warning(f"  Could not truncate {table}: {exc}")
        logger.info(f"  Cleared table: {table}")
    logger.info("All tables cleared.")


async def _seed_batches(bq: bigquery.Client) -> int:
    """Insert batch records."""
    from database import insert_rows
    rows = _load_json("batches.json")
    now = _now_iso()
    bq_rows = []
    for r in rows:
        bq_rows.append({
            "id": r["id"],
            "name": r["name"],
            "received_date": _format_date(r["received_date"]),
            "file_count": r["file_count"],
            "status": r["status"],
            "total_claims": r["total_claims"],
            "flagged_count": r["flagged_count"],
            "approved_count": r["approved_count"],
            "created_at": now,
            "updated_at": now,
        })
    if bq_rows:
        errors = await insert_rows("batches", bq_rows)
        if errors:
            logger.error(f"Batch insert errors: {errors}")
    logger.info(f"Seeded {len(bq_rows)} batches.")
    return len(bq_rows)


async def _seed_veterans(bq: bigquery.Client) -> int:
    """Insert veteran records."""
    from database import insert_rows
    rows = _load_json("veterans.json")
    now = _now_iso()
    bq_rows = []
    for r in rows:
        bq_rows.append({
            "id": r["id"],
            "name_display": r["name_display"],
            "ssn_last4": r["ssn_last4"],
            "date_of_birth": _format_date(r["date_of_birth"]),
            "date_of_death": _format_date(r.get("date_of_death")),
            "vital_status": r["vital_status"],
            "service_branch": r.get("service_branch"),
            "disability_rating": r.get("disability_rating"),
            "benefits_enrolled": json.dumps(r.get("benefits_enrolled", [])),
            "created_at": now,
        })
    if bq_rows:
        errors = await insert_rows("veterans", bq_rows)
        if errors:
            logger.error(f"Veteran insert errors: {errors}")
    logger.info(f"Seeded {len(bq_rows)} veterans.")
    return len(bq_rows)


async def _seed_providers(bq: bigquery.Client) -> int:
    """Insert provider records."""
    from database import insert_rows
    rows = _load_json("providers.json")
    now = _now_iso()
    bq_rows = []
    for r in rows:
        bq_rows.append({
            "id": r["id"],
            "name": r["name"],
            "npi": r["npi"],
            "provider_type": r["provider_type"],
            "specialty": r.get("specialty"),
            "address": json.dumps(r.get("address", {})),
            "risk_score": r.get("risk_score", 0),
            "accreditation_status": r.get("accreditation_status", "accredited"),
            "claim_history": json.dumps(r.get("claim_history", {})),
            "created_at": now,
        })
    if bq_rows:
        errors = await insert_rows("providers", bq_rows)
        if errors:
            logger.error(f"Provider insert errors: {errors}")
    logger.info(f"Seeded {len(bq_rows)} providers.")
    return len(bq_rows)


async def _seed_claims(bq: bigquery.Client) -> int:
    """Insert claim records."""
    from database import insert_rows
    rows = _load_json("claims.json")
    now = _now_iso()
    bq_rows = []
    for r in rows:
        bq_rows.append({
            "id": r["id"],
            "claim_number": r["claim_number"],
            "batch_id": r["batch_id"],
            "veteran_id": r["veteran_id"],
            "provider_id": r["provider_id"],
            "claim_type": r["claim_type"],
            "status": r["status"],
            "risk_level": r.get("risk_level"),
            "billing_amount": float(r["billing_amount"]),
            "service_date": _format_date(r["service_date"]),
            "diagnosis_codes": json.dumps(r.get("diagnosis_codes", [])),
            "procedure_codes": json.dumps(r.get("procedure_codes", [])),
            "created_at": now,
            "updated_at": now,
        })
    if bq_rows:
        errors = await insert_rows("claims", bq_rows)
        if errors:
            logger.error(f"Claim insert errors: {errors}")
    logger.info(f"Seeded {len(bq_rows)} claims.")
    return len(bq_rows)


async def _seed_agent_findings(bq: bigquery.Client) -> int:
    """Insert agent finding records."""
    from database import insert_rows
    rows = _load_json("agent_findings.json")
    now = _now_iso()
    bq_rows = []
    for r in rows:
        bq_rows.append({
            "id": r["id"],
            "claim_id": r["claim_id"],
            "agent_name": r["agent_name"],
            "fraud_type": r["fraud_type"],
            "confidence_score": r["confidence_score"],
            "recommendation": r["recommendation"],
            "flagged_data_points": json.dumps(r.get("flagged_data_points", [])),
            "evidence_summary": r["evidence_summary"],
            "finding_details": json.dumps(r.get("finding_details", {})),
            "processing_time_ms": r.get("processing_time_ms", 0),
            "created_at": now,
        })
    if bq_rows:
        errors = await insert_rows("agent_findings", bq_rows)
        if errors:
            logger.error(f"Agent finding insert errors: {errors}")
    logger.info(f"Seeded {len(bq_rows)} agent findings.")
    return len(bq_rows)


async def _seed_decisions(bq: bigquery.Client) -> int:
    """Insert decision records."""
    from database import insert_rows
    rows = _load_json("decisions.json")
    now = _now_iso()
    bq_rows = []
    for r in rows:
        bq_rows.append({
            "id": r["id"],
            "claim_id": r["claim_id"],
            "decision_type": r["decision_type"],
            "actor": r["actor"],
            "actor_role": r["actor_role"],
            "rationale": r.get("rationale"),
            "savings_amount": float(r["savings_amount"]) if r.get("savings_amount") is not None else None,
            "created_at": now,
        })
    if bq_rows:
        errors = await insert_rows("decisions", bq_rows)
        if errors:
            logger.error(f"Decision insert errors: {errors}")
    logger.info(f"Seeded {len(bq_rows)} decisions.")
    return len(bq_rows)


async def _seed_overpayments(bq: bigquery.Client) -> int:
    """Insert overpayment records."""
    from database import insert_rows
    rows = _load_json("overpayments.json")
    now = _now_iso()
    bq_rows = []
    for r in rows:
        bq_rows.append({
            "id": r["id"],
            "claim_id": r["claim_id"],
            "provider_name": r["provider_name"],
            "provider_npi": r["provider_npi"],
            "original_billing_amount": float(r["original_billing_amount"]),
            "allowable_amount": float(r["allowable_amount"]),
            "overpayment_amount": float(r["overpayment_amount"]),
            "recoupment_status": r["recoupment_status"],
            "date_identified": _format_date(r["date_identified"]),
            "fms_paid_date": _format_date(r.get("fms_paid_date")),
            "assigned_analyst": r["assigned_analyst"],
            "created_at": now,
            "updated_at": now,
        })
    if bq_rows:
        errors = await insert_rows("overpayments", bq_rows)
        if errors:
            logger.error(f"Overpayment insert errors: {errors}")
    logger.info(f"Seeded {len(bq_rows)} overpayments.")
    return len(bq_rows)


async def _seed_audit_log(bq: bigquery.Client) -> int:
    """Insert audit log records."""
    from database import insert_rows
    rows = _load_json("audit_log.json")
    bq_rows = []
    for r in rows:
        bq_rows.append({
            "id": r["id"],
            "timestamp": _format_datetime(r["timestamp"]),
            "actor": r["actor"],
            "actor_type": r["actor_type"],
            "action_type": r["action_type"],
            "claim_id": r.get("claim_id"),
            "details": json.dumps(r.get("details", {})),
            "confidence_score": r.get("confidence_score"),
        })
    if bq_rows:
        errors = await insert_rows("audit_log", bq_rows)
        if errors:
            logger.error(f"Audit log insert errors: {errors}")
    logger.info(f"Seeded {len(bq_rows)} audit log entries.")
    return len(bq_rows)


async def reset_and_seed(bq: bigquery.Client) -> dict:
    """
    Drop all data then re-seed from JSON files.

    Returns a summary dict with counts of seeded records per table.
    """
    logger.info("=== PIVOT Seed: Starting reset and seed ===")

    # Step 1: Clear all tables
    await _clear_all_tables(bq)

    # Step 2: Seed in FK-safe order (parents first)
    summary = {}
    summary["batches"] = await _seed_batches(bq)
    summary["veterans"] = await _seed_veterans(bq)
    summary["providers"] = await _seed_providers(bq)
    summary["claims"] = await _seed_claims(bq)
    summary["agent_findings"] = await _seed_agent_findings(bq)
    summary["decisions"] = await _seed_decisions(bq)
    summary["overpayments"] = await _seed_overpayments(bq)
    summary["audit_log"] = await _seed_audit_log(bq)

    total = sum(summary.values())
    logger.info(f"=== PIVOT Seed: Complete. {total} total records seeded. ===")
    logger.info(f"  Summary: {summary}")

    return summary


async def _main():
    """Standalone entry point for running seed from the command line."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    # Import here to avoid circular imports when used as a module
    sys.path.insert(0, str(Path(__file__).parent))
    from database import get_sync_client

    bq = get_sync_client()
    summary = await reset_and_seed(bq)

    print("\nSeed complete!")
    print(f"  Batches:        {summary.get('batches', 0)}")
    print(f"  Veterans:       {summary.get('veterans', 0)}")
    print(f"  Providers:      {summary.get('providers', 0)}")
    print(f"  Claims:         {summary.get('claims', 0)}")
    print(f"  Agent Findings: {summary.get('agent_findings', 0)}")
    print(f"  Decisions:      {summary.get('decisions', 0)}")
    print(f"  Overpayments:   {summary.get('overpayments', 0)}")
    print(f"  Audit Log:      {summary.get('audit_log', 0)}")
    print(f"  Total:          {sum(summary.values())}")


if __name__ == "__main__":
    if "--reset" in sys.argv:
        print("Running with --reset flag: all data will be dropped and re-seeded.")
    else:
        print("Running seed (use --reset flag to explicitly confirm reset).")

    asyncio.run(_main())
