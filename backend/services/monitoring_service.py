# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from datetime import datetime, timedelta, timezone
import random


def get_log_entries(category: str, limit: int = 50) -> list[dict]:
    """Generate realistic-looking log entries for the monitoring panel."""
    now = datetime.now(timezone.utc)
    entries = []

    templates = {
        "application": [
            ("INFO", "FastAPI", "Request processed: GET /api/claims 200 OK (142ms)"),
            ("INFO", "FastAPI", "Request processed: POST /api/claims/{id}/chat 200 OK (2340ms)"),
            ("INFO", "FastAPI", "Request processed: GET /api/analytics/dashboard-metrics 200 OK (89ms)"),
            ("WARN", "FastAPI", "Slow response detected: GET /api/claims/{id}/summary (4200ms)"),
            ("INFO", "Uvicorn", "Application startup complete on port 8000"),
            ("INFO", "BigQuery", "Client connection pool: 5/10 active threads"),
        ],
        "ai_agent": [
            ("INFO", "RulesEngine", "Claim CLM-9988776655: VA Financial Policy check completed (1.2s)"),
            ("INFO", "DataValidation", "Claim CLM-9988776655: MVI cross-reference — DECEASED VETERAN DETECTED"),
            ("INFO", "PensionPoaching", "Claim CLM-4455667788: Asset manipulation patterns — CLEAR"),
            ("INFO", "ClaimSharking", "Claim CLM-3344556677: Unaccredited consulting fee detected (confidence: 87%)"),
            ("INFO", "DBQFraud", "Claim CLM-2233445566: DBQ template analysis — template misuse indicators found"),
            ("INFO", "OverlappingClaims", "Claim CLM-1122334455: Duplicate service date detected with CLM-9988776655"),
            ("WARN", "MedicalRecord", "Multimodal analysis timeout — retrying with reduced resolution"),
            ("INFO", "ClaimDiscrepancy", "Claim CLM-5566778899: ICD-10/CPT code compatibility verified"),
        ],
        "audit": [
            ("INFO", "AuditLog", "Decision recorded: DENIED CLM-9988776655 by J. Rodriguez, GS-13"),
            ("INFO", "AuditLog", "Chat session started: CLM-9988776655 by J. Rodriguez, GS-13"),
            ("INFO", "AuditLog", "Batch processing initiated: Batch-2025-10-21-Mixed"),
            ("INFO", "AuditLog", "False positive reported: CLM-4455667788 — Pension Poaching Agent"),
        ],
        "db": [
            ("INFO", "BigQuery", "Query executed: SELECT claims WHERE status='flagged' (320ms, 4 rows)"),
            ("INFO", "BigQuery", "Streaming insert: agent_findings — data_validation for CLM-9988776655"),
            ("INFO", "BigQuery", "Schema validation: all 9 tables match expected definitions"),
            ("INFO", "BigQuery", "Query slot utilization: 12/100 (12%)"),
        ],
        "ui_access": [
            ("INFO", "UIAccess", "J. Rodriguez, GS-13 logged in as Case Officer"),
            ("INFO", "UIAccess", "Navigation: Mission Control → Data Ingestion"),
            ("INFO", "UIAccess", "Deep Dive modal opened for CLM-9988776655"),
            ("INFO", "UIAccess", "Navigation: Validation Queue → Analytics"),
        ],
        "action": [
            ("INFO", "Action", "PROCESS BATCH triggered for Batch-2025-10-21-Mixed"),
            ("INFO", "Action", "Document parsed: medical-claim-001.pdf (Gemini multimodal, 8.3s)"),
            ("INFO", "Action", "Decision: DENIED CLM-9988776655 ($4,250.00 saved)"),
            ("INFO", "Action", "Demo reset executed — database reseeded"),
        ],
    }

    template_list = templates.get(category, templates["application"])
    for i in range(min(limit, 50)):
        t = template_list[i % len(template_list)]
        entries.append({
            "timestamp": (now - timedelta(seconds=i * 15 + random.randint(0, 10))).isoformat(),
            "level": t[0],
            "source": t[1],
            "message": t[2],
        })

    return entries
