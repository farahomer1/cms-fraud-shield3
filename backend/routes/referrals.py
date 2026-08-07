# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from fastapi import APIRouter, HTTPException
from services.dossier_service import DossierService

router = APIRouter(prefix="/api/referrals", tags=["Referrals"])


@router.get("/dossier")
async def get_live_dossier():
    """GET endpoint to fetch the dynamically compiled DOJ investigative referral dossier."""
    try:
        dossier = await DossierService.compile_referral_dossier()
        return dossier
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error compiling live dossier: {str(e)}")
