# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import os
import sys
from fastapi import APIRouter, HTTPException, Query

# Securely append the ADK inner root directory to sys.path so we can import Noel's agent
ADK_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "enrollment_integrity_adk", "enrollment_integrity_adk")
)
if ADK_ROOT not in sys.path:
    sys.path.insert(0, ADK_ROOT)

router = APIRouter(prefix="/api/enrollment-integrity", tags=["enrollment-integrity"])

try:
    from enrollment_agent.tools import list_applicants, screen_applicant, run_adversarial_probe
except ImportError as exc:
    raise RuntimeError(
        f"Failed to import Noel's ADK tools from {ADK_ROOT}. Ensure the path is correct and dependencies are installed."
    ) from exc


@router.get("/applicants")
async def get_applicants():
    """List all available screening applicants from the ADK engine."""
    try:
        return list_applicants()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ADK list_applicants failed: {str(e)}")


@router.get("/screen")
async def screen(applicant_id: str = Query(..., description="The ID of the applicant, e.g. ENT-COASTAL")):
    """Screen a single applicant through the ADK identity resolution and risk scoring engine."""
    try:
        return screen_applicant(applicant_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ADK screen_applicant failed: {str(e)}")


@router.post("/simulation")
async def run_simulation():
    """Run the 4-stage adversarial purple-team simulation probe to assess gateway vulnerabilities."""
    try:
        return run_adversarial_probe()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ADK run_adversarial_probe failed: {str(e)}")
