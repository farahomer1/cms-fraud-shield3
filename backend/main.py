# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from routes.health import router as health_router
from routes.batches import router as batches_router
from routes.documents import router as documents_router
from routes.claims import router as claims_router
from routes.chat import router as chat_router
from routes.analytics import router as analytics_router
from routes.fraud_research import router as fraud_research_router
from routes.audit_log import router as audit_log_router
from routes.alerts import router as alerts_router
from routes.monitoring import router as monitoring_router
from routes.overpayments import router as overpayments_router
from routes.normalization import router as normalization_router
from routes.audit_workflows import router as audit_workflows_router
from routes.enrollment_integrity import router as enrollment_integrity_router
from routes.appeals import router as appeals_router

# Load environment variables from .env before any os.environ reads below.
load_dotenv()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-seed database on startup so demo data is always fresh
    try:
        from database import get_sync_client
        from datagen.generator import generate_all_data
        bq = get_sync_client()
        logger.info("Auto-seeding database on startup...")
        await generate_all_data(bq)
        logger.info("Database seeded successfully.")
    except Exception as e:
        logger.warning(f"Auto-seed skipped or failed: {e}")
    yield


app = FastAPI(title="PIVOT API", version="0.1.0", lifespan=lifespan)

_default_origins = ["http://localhost:5173", "http://localhost:3000"]
_extra = os.getenv("ALLOWED_ORIGINS", "")
_origins = _default_origins + [o.strip() for o in _extra.split(",") if o.strip()]

app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(batches_router)
app.include_router(documents_router)
app.include_router(claims_router)
app.include_router(chat_router)
app.include_router(analytics_router)
app.include_router(fraud_research_router)
app.include_router(audit_log_router)
app.include_router(alerts_router)
app.include_router(monitoring_router)
app.include_router(overpayments_router)
app.include_router(normalization_router)
app.include_router(audit_workflows_router)
app.include_router(enrollment_integrity_router)
app.include_router(appeals_router)

