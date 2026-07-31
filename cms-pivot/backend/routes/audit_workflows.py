# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""
Auditor Workflow routes — provides AI-powered audit analysis endpoints.
These endpoints leverage Gemini to support audit workflow step execution:
summarization, compliance checking, risk scoring, and report generation.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.gemini_client import generate_text, generate_json

router = APIRouter(prefix="/api/audit-workflows", tags=["audit-workflows"])


class WorkflowStepRequest(BaseModel):
    step_type: str
    step_name: str
    workflow_name: str
    context: str = ""
    config: dict = {}


class SummarizationRequest(BaseModel):
    text: str
    focus: str = "general"
    max_length: int = 500


class ComplianceCheckRequest(BaseModel):
    claims_data: str
    rule_set: str = "general"
    guidelines: str = ""


class RiskScoringRequest(BaseModel):
    entity_data: str
    scoring_criteria: str = ""


# ─── Execute a single workflow step ───

@router.post("/execute-step")
async def execute_workflow_step(req: WorkflowStepRequest):
    """Execute a single audit workflow step using Gemini for AI-powered steps."""

    system_prompt = (
        "You are a VA Payment Integrity audit assistant. You help auditors by analyzing "
        "claims data, checking compliance, scoring risk, and generating reports. "
        "Be precise, cite specific data points, and follow GAGAS/Yellow Book standards. "
        f"Current workflow: {req.workflow_name}. Current step: {req.step_name}."
    )

    step_prompts = {
        "ai_analysis": (
            f"Analyze the following audit data and identify anomalies, patterns, or issues:\n\n"
            f"{req.context}\n\n"
            f"Provide a structured analysis with: key findings, confidence levels, and recommended actions."
        ),
        "summarization": (
            f"Summarize the following audit findings into a concise executive summary:\n\n"
            f"{req.context}\n\n"
            f"Include: total items reviewed, key issues found, estimated financial impact, and priority recommendations."
        ),
        "compliance_check": (
            f"Check the following data against applicable VA and CMS compliance rules:\n\n"
            f"{req.context}\n\n"
            f"Rule set: {req.config.get('ruleSet', 'general')}\n"
            f"Report: violations found, compliance rate, and specific rule citations."
        ),
        "risk_scoring": (
            f"Score the following entities for risk based on the provided data:\n\n"
            f"{req.context}\n\n"
            f"Provide risk scores (1-10) with justification for each score."
        ),
        "report_generation": (
            f"Generate a formal audit report section based on the following findings:\n\n"
            f"{req.context}\n\n"
            f"Format: Executive Summary, Findings, Recommendations, Appendix references."
        ),
    }

    prompt = step_prompts.get(req.step_type)
    if not prompt:
        return {
            "status": "skipped",
            "message": f"Step type '{req.step_type}' does not require AI processing",
            "output": f"Step '{req.step_name}' completed (non-AI step)",
        }

    try:
        result, latency_ms = await generate_text(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.3,
        )
        return {
            "status": "success",
            "output": result,
            "latency_ms": latency_ms,
            "step_type": req.step_type,
            "step_name": req.step_name,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Step execution failed: {str(e)}")


# ─── Summarization endpoint ───

@router.post("/summarize")
async def summarize_audit_data(req: SummarizationRequest):
    """Generate an AI summary of audit data/findings."""
    system_prompt = (
        "You are a VA Payment Integrity audit summarizer. Produce concise, "
        "actionable executive summaries suitable for VA leadership review. "
        "Include key metrics, findings, and recommended next steps."
    )

    prompt = (
        f"Summarize the following audit information (focus: {req.focus}):\n\n"
        f"{req.text}\n\n"
        f"Keep the summary under {req.max_length} words. Be specific with numbers and findings."
    )

    try:
        result, latency_ms = await generate_text(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.2,
        )
        return {
            "summary": result,
            "latency_ms": latency_ms,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")


# ─── Compliance check endpoint ───

@router.post("/compliance-check")
async def check_compliance(req: ComplianceCheckRequest):
    """Run AI-assisted compliance checks against claims data."""
    system_prompt = (
        "You are a VA compliance auditor. Evaluate claims data against CMS and VA "
        "reimbursement policies. Identify violations of NCCI edits, MUE limits, "
        "fee schedule rules, and VA-specific policies. Cite specific rule references."
    )

    prompt = (
        f"Perform a compliance check on the following claims data:\n\n"
        f"{req.claims_data}\n\n"
        f"Rule set: {req.rule_set}\n"
        f"Additional guidelines: {req.guidelines or 'Standard VA/CMS rules'}\n\n"
        f"Return a JSON object with: compliance_rate, violations (array of "
        f"{{rule, description, severity, affected_claims}}), and recommendations."
    )

    try:
        result, latency_ms = await generate_json(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.2,
        )
        return {
            "results": result,
            "latency_ms": latency_ms,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compliance check failed: {str(e)}")


# ─── Risk scoring endpoint ───

@router.post("/risk-score")
async def calculate_risk_scores(req: RiskScoringRequest):
    """Calculate AI-assisted risk scores for entities (providers, claims, etc.)."""
    system_prompt = (
        "You are a VA risk assessment specialist. Score entities based on billing "
        "patterns, complaint history, compliance record, and anomaly indicators. "
        "Use a 1-10 scale where 10 is highest risk."
    )

    prompt = (
        f"Score the following entities for risk:\n\n"
        f"{req.entity_data}\n\n"
        f"Scoring criteria: {req.scoring_criteria or 'Standard VA risk factors'}\n\n"
        f"Return a JSON object with: entities (array of "
        f"{{id, name, risk_score, risk_level, factors}}), and overall_assessment."
    )

    try:
        result, latency_ms = await generate_json(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.2,
        )
        return {
            "results": result,
            "latency_ms": latency_ms,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk scoring failed: {str(e)}")
