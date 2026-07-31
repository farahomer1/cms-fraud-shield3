# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from google.cloud import bigquery

from database import get_db

router = APIRouter(prefix="/api/overpayments", tags=["overpayments"])


@router.get("")
async def list_overpayments(
    status: str | None = Query(None),
    limit: int = Query(200, le=500),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("date_identified"),
    sort_order: str = Query("desc"),
    bq: bigquery.Client = Depends(get_db),
):
    from services.overpayment_service import list_overpayments
    return await list_overpayments(bq, status=status, limit=limit, offset=offset, sort_by=sort_by, sort_order=sort_order)


@router.get("/summary")
async def get_summary(bq: bigquery.Client = Depends(get_db)):
    from services.overpayment_service import get_overpayment_summary
    return await get_overpayment_summary(bq)


@router.get("/trend")
async def get_trend(bq: bigquery.Client = Depends(get_db)):
    from services.overpayment_service import get_recoupment_trend
    return await get_recoupment_trend(bq)


@router.get("/pivot")
async def get_pivot(
    group_by: str = Query("provider"),
    status: str | None = Query(None),
    bq: bigquery.Client = Depends(get_db),
):
    from services.overpayment_service import get_overpayment_pivot
    return await get_overpayment_pivot(bq, group_by=group_by, status=status)


@router.get("/export")
async def export_csv(
    status: str | None = Query(None),
    bq: bigquery.Client = Depends(get_db),
):
    from services.overpayment_service import export_overpayments_csv
    csv_content = await export_overpayments_csv(bq, status=status)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=overpayments.csv"},
    )


@router.get("/{overpayment_id}")
async def get_overpayment_detail(
    overpayment_id: str,
    bq: bigquery.Client = Depends(get_db),
):
    from services.overpayment_service import get_overpayment_detail
    result = await get_overpayment_detail(bq, overpayment_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Overpayment not found")
    return result
