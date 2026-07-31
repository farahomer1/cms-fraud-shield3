# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from fastapi import APIRouter, Depends, Query
from google.cloud import bigquery

from database import get_db

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/fraud-trends")
async def get_fraud_trends(bq: bigquery.Client = Depends(get_db)):
    from services.analytics_service import get_fraud_trends
    return await get_fraud_trends(bq)


@router.get("/agent-efficacy")
async def get_agent_efficacy(bq: bigquery.Client = Depends(get_db)):
    from services.analytics_service import get_agent_efficacy
    return await get_agent_efficacy(bq)


@router.get("/processing-speed")
async def get_processing_speed():
    return {
        "current_throughput": 16.2,
        "surge_capacity": 32.4,
        "unit": "claims/sec",
    }


@router.get("/savings")
async def get_savings(bq: bigquery.Client = Depends(get_db)):
    from services.analytics_service import get_savings_data
    data_points = await get_savings_data(bq)
    total = data_points[-1]["cumulative_savings"] if data_points else 0
    return {
        "data_points": [
            {"date": d["date"], "cumulative": d["cumulative_savings"], **d}
            for d in data_points
        ],
        "total": total,
    }


@router.get("/insights")
async def get_insights(chart_type: str = Query("fraud-trends"), bq: bigquery.Client = Depends(get_db)):
    from services.analytics_service import generate_insight
    return await generate_insight(chart_type, bq)


@router.get("/dashboard-metrics")
async def get_dashboard_metrics(bq: bigquery.Client = Depends(get_db)):
    from services.analytics_service import get_dashboard_metrics
    return await get_dashboard_metrics(bq)
