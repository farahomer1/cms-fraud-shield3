# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import json
import logging
from datetime import datetime
from google.cloud import bigquery
from database import run_query, get_dataset

logger = logging.getLogger(__name__)


class DossierService:
    """FR-19 & FR-20: Gathers live run-time statistics to assemble a highly rigorous DOJ referral dossier."""

    @staticmethod
    async def compile_referral_dossier() -> dict:
        """Compiles real-time held claims, unmasked networks, and failed appeals into a structured investigative brief."""
        ds = get_dataset()

        # 1. Financial Trail: Held claims aggregated by supplier
        query_financial = f"""
            SELECT provider_id, COUNT(*) as claim_count, SUM(billing_amount) as total_exposure
            FROM `{ds}.claims`
            WHERE status = 'held'
            GROUP BY provider_id
            ORDER BY total_exposure DESC
        """
        financial_rows = await run_query(query_financial)
        financial_trail = []
        grand_total_exposure = 0.0
        for r in financial_rows:
            exp = float(r["total_exposure"] or 0.0)
            grand_total_exposure += exp
            financial_trail.append({
                "npi": r["provider_id"],
                "claim_count": int(r["claim_count"]),
                "exposure": exp
            })

        # 2. Beneficiary Impact: Compromised MBIs targeted under active holds
        query_mbi = f"""
            SELECT DISTINCT mbi 
            FROM `{ds}.claims` 
            WHERE status = 'held' AND mbi IS NOT NULL
        """
        mbi_rows = await run_query(query_mbi)
        affected_mbis = [r["mbi"] for r in mbi_rows]

        # 3. Billing Logs: Detailed ledger of held claims
        query_logs = f"""
            SELECT id, claim_number, provider_id, billing_amount, sim_service_date, hcpcs_code, quantity, state
            FROM `{ds}.claims`
            WHERE status = 'held'
            ORDER BY billing_amount DESC
            LIMIT 100
        """
        log_rows = await run_query(query_logs)
        billing_logs = []
        for r in log_rows:
            billing_logs.append({
                "claim_id": r["id"],
                "claim_number": r["claim_number"],
                "npi": r["provider_id"],
                "amount": float(r["billing_amount"] or 0.0),
                "service_date": str(r["sim_service_date"]),
                "hcpcs": r["hcpcs_code"],
                "quantity": int(r["quantity"] or 0),
                "state": r["state"]
            })

        # 4. Agent 3 Network: Connected component unmasked providers
        query_network = f"""
            SELECT npi, name, practice_address, enrollment_status 
            FROM `{ds}.pecos_records` 
            WHERE enrollment_status = 'revocation_flagged'
        """
        network_rows = await run_query(query_network)
        network_unmasked = []
        for r in network_rows:
            network_unmasked.append({
                "npi": r["npi"],
                "name": r["name"],
                "address": r["practice_address"],
                "status": r["enrollment_status"]
            })

        # 5. Failed Appeals / Level 2 ALJ manual review queue
        query_alj = f"""
            SELECT c.id, c.claim_number, c.billing_amount, a.entered_at_sim 
            FROM `{ds}.claims` c
            JOIN `{ds}.alj_queue` a ON c.id = a.claim_id
            ORDER BY c.billing_amount DESC
        """
        alj_rows = await run_query(query_alj)
        alj_queue_cases = []
        for r in alj_rows:
            alj_queue_cases.append({
                "claim_id": r["id"],
                "claim_number": r["claim_number"],
                "amount": float(r["billing_amount"] or 0.0),
                "entered_at_sim": str(r["entered_at_sim"])
            })

        # FR-20: Policy Edit Recommendation
        policy_recommendation = {
            "hcpcs_targeted": "A4351, A4352, A4353 (Intermittent Urinary Catheters)",
            "observation": f"Unmasked coordinated ring exploiting the lack of National prior-authorization gates on newly enrolled/reactive suppliers at CMRA mail drops, targeting compromised beneficiary MBIs. Total intercepted exposure is ${grand_total_exposure:,.2f}.",
            "proposed_claim_edit": "Implement a nationwide prepayment quantity limit edit on HCPCS A4351-3, capping billing at 30 units per month for non-neurogenic conditions and requiring CPT-99214 qualifying clinical consult verification matching within 14 days preceding any higher-quantity claim.",
            "enforcement_jurisdiction": "National MAC Prepayment Coordination",
            "regulatory_rationale": "Prevent phantom billing from shell corporations registered at commercial mail receiving agency addresses using newly authorized official transfers."
        }

        return {
            "dossier_id": "NFED-2026-LIVE",
            "date_compiled": datetime.now().strftime("%Y-%m-%d"),
            "grand_total_exposure": grand_total_exposure,
            "financial_trail": financial_trail,
            "affected_mbis": affected_mbis,
            "billing_logs": billing_logs,
            "network_unmasked": network_unmasked,
            "alj_queue_cases": alj_queue_cases,
            "policy_recommendation": policy_recommendation
        }
