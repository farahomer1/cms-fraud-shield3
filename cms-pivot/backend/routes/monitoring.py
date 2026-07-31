# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from fastapi import APIRouter

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])


@router.get("/health-metrics")
async def get_health_metrics():
    return {
        "api_avg_response_ms": 142,
        "gemini_avg_latency_ms": 2340,
        "last_batch_duration_sec": 45.2,
        "error_rate_pct": 0.3,
        "active_sessions": 1,
    }


@router.get("/logs")
async def get_logs(category: str = "application", limit: int = 50):
    from services.monitoring_service import get_log_entries
    return get_log_entries(category, limit)
