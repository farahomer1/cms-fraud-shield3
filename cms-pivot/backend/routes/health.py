# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from fastapi import APIRouter, Depends
from google.cloud import bigquery

from database import get_db
from services import gemini_client

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "0.1.0",
        "service": "PIVOT API",
    }


@router.get("/gemini/health")
async def gemini_health():
    result = await gemini_client.health_check()
    return result


@router.post("/reset")
async def reset_database(bq: bigquery.Client = Depends(get_db)):
    from seed import reset_and_seed
    await reset_and_seed(bq)
    return {"status": "success", "message": "Database reset and reseeded."}
