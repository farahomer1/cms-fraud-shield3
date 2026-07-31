# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from fastapi import APIRouter, Depends
from google.cloud import bigquery
from pydantic import BaseModel

from database import get_db

router = APIRouter(prefix="/api/fraud-research", tags=["fraud-research"])


class PatternSearchRequest(BaseModel):
    query: str


@router.get("/clusters")
async def get_clusters(bq: bigquery.Client = Depends(get_db)):
    from services.fraud_research_service import get_anomaly_clusters
    return await get_anomaly_clusters(bq)


@router.get("/analyze")
async def analyze_anomalies(bq: bigquery.Client = Depends(get_db)):
    from services.fraud_research_service import analyze_anomaly_landscape
    return await analyze_anomaly_landscape(bq)


@router.post("/search")
async def pattern_search(body: PatternSearchRequest, bq: bigquery.Client = Depends(get_db)):
    from services.fraud_research_service import search_patterns
    return await search_patterns(body.query, bq)
