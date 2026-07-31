# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""Overpayment service — query functions for the overpayment tracking module."""

import csv
import io
from datetime import timedelta
from decimal import Decimal

from google.cloud import bigquery

from database import get_dataset, run_query, run_query_single
from models.overpayment import Overpayment


async def list_overpayments(
    bq: bigquery.Client,
    status: str | None = None,
    limit: int = 100,
    offset: int = 0,
    sort_by: str = "date_identified",
    sort_order: str = "desc",
) -> list[dict]:
    """Return overpayment records with optional status filter, sorting, and pagination."""
    ds = get_dataset()

    allowed_sort_cols = {
        "date_identified", "overpayment_amount", "provider_name",
        "recoupment_status", "original_billing_amount", "assigned_analyst",
    }
    if sort_by not in allowed_sort_cols:
        sort_by = "date_identified"
    if sort_order not in ("asc", "desc"):
        sort_order = "desc"

    where_clause = ""
    params: list = []
    if status:
        where_clause = "WHERE o.recoupment_status = @status"
        params.append(bigquery.ScalarQueryParameter("status", "STRING", status))

    query = f"""
        SELECT o.*, c.claim_number
        FROM `{ds}.overpayments` o
        LEFT JOIN `{ds}.claims` c ON c.id = o.claim_id
        {where_clause}
        ORDER BY o.{sort_by} {sort_order}
        LIMIT @limit OFFSET @offset
    """  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
    params.extend([
        bigquery.ScalarQueryParameter("limit", "INT64", limit),
        bigquery.ScalarQueryParameter("offset", "INT64", offset),
    ])

    rows = await run_query(query, params)
    results = []
    for row in rows:
        op = Overpayment.from_bq_row(row)
        d = op.to_dict()
        d["claim_number"] = row.claim_number
        results.append(d)
    return results


async def get_overpayment_summary(bq: bigquery.Client) -> dict:
    """Return aggregate metrics for the summary cards."""
    ds = get_dataset()

    row = await run_query_single(f"""
        SELECT
            COUNT(*) as total_count,
            COALESCE(SUM(overpayment_amount), 0) as total_amount,
            COUNTIF(recoupment_status = 'identified') as identified_count,
            COALESCE(SUM(CASE WHEN recoupment_status = 'identified' THEN overpayment_amount ELSE 0 END), 0) as identified_amount,
            COUNTIF(recoupment_status IN ('notified', 'in_recoupment')) as in_progress_count,
            COALESCE(SUM(CASE WHEN recoupment_status IN ('notified', 'in_recoupment') THEN overpayment_amount ELSE 0 END), 0) as in_progress_amount,
            COUNTIF(recoupment_status IN ('recouped', 'reconciled')) as recouped_count,
            COALESCE(SUM(CASE WHEN recoupment_status IN ('recouped', 'reconciled') THEN overpayment_amount ELSE 0 END), 0) as recouped_amount
        FROM `{ds}.overpayments`
    """)  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized

    if not row:
        return {
            "total_identified": {"count": 0, "amount": 0},
            "in_progress": {"count": 0, "amount": 0},
            "recouped": {"count": 0, "amount": 0},
            "recovery_rate": 0,
        }

    total_amount = float(row.total_amount) if row.total_amount else 0
    recouped_amount = float(row.recouped_amount) if row.recouped_amount else 0
    recovery_rate = round((recouped_amount / total_amount * 100), 1) if total_amount > 0 else 0

    return {
        "total_identified": {"count": row.total_count, "amount": total_amount},
        "in_progress": {"count": row.in_progress_count, "amount": float(row.in_progress_amount)},
        "recouped": {"count": row.recouped_count, "amount": recouped_amount},
        "recovery_rate": recovery_rate,
    }


async def get_recoupment_trend(bq: bigquery.Client) -> list[dict]:
    """Return cumulative recoupment data points over time for the trend chart."""
    ds = get_dataset()

    rows = await run_query(f"""
        SELECT date_identified, overpayment_amount, recoupment_status
        FROM `{ds}.overpayments`
        WHERE recoupment_status IN ('recouped', 'reconciled')
        ORDER BY date_identified
    """)  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized

    cumulative = Decimal("0")
    data_points = []
    for row in rows:
        amount = Decimal(str(row.overpayment_amount)) if row.overpayment_amount else Decimal("0")
        cumulative += amount
        date_str = row.date_identified.strftime("%Y-%m-%d") if row.date_identified else ""
        data_points.append({
            "date": date_str,
            "cumulative_amount": float(cumulative),
            "amount": float(amount),
        })

    return data_points


async def get_overpayment_detail(bq: bigquery.Client, overpayment_id: str) -> dict | None:
    """Return a single overpayment with related claim, decision, and agent findings."""
    ds = get_dataset()

    row = await run_query_single(
        f"""
        SELECT o.*, c.claim_number, c.claim_type, c.billing_amount as claim_billing_amount,
               c.service_date, c.status as claim_status, c.risk_level
        FROM `{ds}.overpayments` o
        LEFT JOIN `{ds}.claims` c ON c.id = o.claim_id
        WHERE o.id = @id
        """,  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("id", "STRING", overpayment_id)],
    )

    if not row:
        return None

    op = Overpayment.from_bq_row(row)
    result = op.to_dict()
    result["claim_number"] = row.claim_number
    result["claim_type"] = row.claim_type
    result["claim_billing_amount"] = float(row.claim_billing_amount) if row.claim_billing_amount else None
    result["service_date"] = row.service_date.isoformat() if row.service_date else None
    result["claim_status"] = row.claim_status
    result["risk_level"] = row.risk_level

    # Get decision details
    decision_row = await run_query_single(
        f"""SELECT * FROM `{ds}.decisions` WHERE claim_id = @claim_id""",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("claim_id", "STRING", op.claim_id)],
    )
    if decision_row:
        result["decision"] = {
            "id": decision_row.id,
            "decision_type": decision_row.decision_type,
            "actor": decision_row.actor,
            "actor_role": decision_row.actor_role,
            "rationale": decision_row.rationale,
            "savings_amount": float(decision_row.savings_amount) if decision_row.savings_amount else None,
            "created_at": decision_row.created_at.isoformat() if decision_row.created_at else None,
        }

    # Get agent findings
    finding_rows = await run_query(
        f"""SELECT * FROM `{ds}.agent_findings` WHERE claim_id = @claim_id ORDER BY confidence_score DESC""",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("claim_id", "STRING", op.claim_id)],
    )
    result["findings"] = []
    for fr in finding_rows:
        result["findings"].append({
            "id": fr.id,
            "agent_name": fr.agent_name,
            "fraud_type": fr.fraud_type,
            "confidence_score": fr.confidence_score,
            "recommendation": fr.recommendation,
            "evidence_summary": fr.evidence_summary,
        })

    # Build status timeline from current status and dates
    status_sequence = ["identified", "notified", "in_recoupment", "recouped", "reconciled"]
    current_idx = status_sequence.index(op.recoupment_status) if op.recoupment_status in status_sequence else 0
    timeline = []
    if op.date_identified:
        base_date = op.date_identified
        for i, status in enumerate(status_sequence):
            if i > current_idx:
                break
            if i == 0:
                event_date = base_date
            else:
                event_date = base_date + timedelta(days=i * 14)
            # For final statuses with fms_paid_date, use that instead
            if status in ("recouped", "reconciled") and op.fms_paid_date:
                event_date = op.fms_paid_date if status == "recouped" else op.fms_paid_date + timedelta(days=7)
            timeline.append({
                "status": status,
                "timestamp": event_date.isoformat(),
                "completed": True,
            })
    result["timeline"] = timeline

    return result


async def get_overpayment_pivot(
    bq: bigquery.Client,
    group_by: str = "provider",
    status: str | None = None,
) -> dict:
    """Return aggregated overpayment data pivoted by the requested dimension.

    Supported group_by values:
    - provider: group by provider_name
    - provider_npi: group by provider name + NPI
    - status: group by recoupment_status
    - analyst: group by assigned_analyst
    - month: group by YYYY-MM of date_identified
    - risk_level: group by claim risk_level (from claims table)
    - claim_type: group by claim_type (from claims table)
    - fraud_type: group by detected fraud type (from agent_findings table)
    """
    ds = get_dataset()

    DIMENSION_MAP = {
        "provider": ("o.provider_name", "provider_name"),
        "provider_npi": ("CONCAT(o.provider_name, ' (', o.provider_npi, ')')", "provider_npi"),
        "status": ("o.recoupment_status", "recoupment_status"),
        "analyst": ("o.assigned_analyst", "assigned_analyst"),
        "month": ("FORMAT_DATE('%Y-%m', o.date_identified)", "month"),
        "risk_level": ("COALESCE(c.risk_level, 'Unknown')", "risk_level"),
        "claim_type": ("COALESCE(c.claim_type, 'Unknown')", "claim_type"),
        "fraud_type": ("COALESCE(af.fraud_type, 'No Finding')", "fraud_type"),
    }

    if group_by not in DIMENSION_MAP:
        group_by = "provider"

    expr, alias = DIMENSION_MAP[group_by]
    needs_claims_join = group_by in ("risk_level", "claim_type")
    needs_findings_join = group_by == "fraud_type"

    where_clause = ""
    params: list = []
    if status:
        where_clause = "WHERE o.recoupment_status = @status"
        params.append(bigquery.ScalarQueryParameter("status", "STRING", status))

    join_clause = ""
    if needs_claims_join:
        join_clause = f"LEFT JOIN `{ds}.claims` c ON c.id = o.claim_id"
    elif needs_findings_join:
        join_clause = f"LEFT JOIN `{ds}.agent_findings` af ON af.claim_id = o.claim_id"

    query = f"""
        SELECT
            {expr} AS dimension,
            COUNT(*) AS record_count,
            COALESCE(SUM(o.overpayment_amount), 0) AS total_amount,
            COALESCE(AVG(o.overpayment_amount), 0) AS avg_amount,
            COALESCE(MIN(o.overpayment_amount), 0) AS min_amount,
            COALESCE(MAX(o.overpayment_amount), 0) AS max_amount,
            COALESCE(SUM(o.original_billing_amount), 0) AS total_billed,
            COALESCE(SUM(o.allowable_amount), 0) AS total_allowable,
            COUNTIF(o.recoupment_status IN ('recouped', 'reconciled')) AS recouped_count,
            COALESCE(SUM(CASE WHEN o.recoupment_status IN ('recouped', 'reconciled') THEN o.overpayment_amount ELSE 0 END), 0) AS recouped_amount,
            MIN(o.date_identified) AS earliest_date,
            MAX(o.date_identified) AS latest_date
        FROM `{ds}.overpayments` o
        {join_clause}
        {where_clause}
        GROUP BY dimension
        ORDER BY total_amount DESC
    """  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized

    rows = await run_query(query, params if params else None)

    groups = []
    grand_total = Decimal("0")
    grand_count = 0
    grand_recouped = Decimal("0")

    for row in rows:
        total_amt = float(row.total_amount) if row.total_amount else 0
        recouped_amt = float(row.recouped_amount) if row.recouped_amount else 0
        record_count = row.record_count or 0
        recovery_rate = round((recouped_amt / total_amt * 100), 1) if total_amt > 0 else 0

        grand_total += Decimal(str(total_amt))
        grand_count += record_count
        grand_recouped += Decimal(str(recouped_amt))

        groups.append({
            "dimension": str(row.dimension) if row.dimension else "Unknown",
            "record_count": record_count,
            "total_amount": total_amt,
            "avg_amount": round(float(row.avg_amount), 2) if row.avg_amount else 0,
            "min_amount": float(row.min_amount) if row.min_amount else 0,
            "max_amount": float(row.max_amount) if row.max_amount else 0,
            "total_billed": float(row.total_billed) if row.total_billed else 0,
            "total_allowable": float(row.total_allowable) if row.total_allowable else 0,
            "recouped_count": row.recouped_count or 0,
            "recouped_amount": recouped_amt,
            "recovery_rate": recovery_rate,
            "earliest_date": row.earliest_date.isoformat() if row.earliest_date else None,
            "latest_date": row.latest_date.isoformat() if row.latest_date else None,
        })

    # Compute percentage share for each group
    for g in groups:
        g["pct_of_total"] = round((g["total_amount"] / float(grand_total) * 100), 1) if grand_total > 0 else 0

    # Generate automated insights
    insights = _generate_pivot_insights(groups, group_by, float(grand_total), grand_count, float(grand_recouped))

    return {
        "group_by": group_by,
        "groups": groups,
        "totals": {
            "record_count": grand_count,
            "total_amount": float(grand_total),
            "recouped_amount": float(grand_recouped),
            "recovery_rate": round((float(grand_recouped) / float(grand_total) * 100), 1) if grand_total > 0 else 0,
            "group_count": len(groups),
        },
        "insights": insights,
    }


def _generate_pivot_insights(
    groups: list[dict], group_by: str, grand_total: float, grand_count: int, grand_recouped: float
) -> list[dict]:
    """Auto-generate analytical insights from the pivot data."""
    insights = []
    if not groups:
        return insights

    dimension_label = {
        "provider": "Provider",
        "status": "Status",
        "analyst": "Analyst",
        "month": "Month",
        "risk_level": "Risk Level",
        "claim_type": "Claim Type",
    }.get(group_by, group_by.title())

    # Insight 1: Top contributor
    top = groups[0]
    insights.append({
        "type": "top_contributor",
        "severity": "high",
        "title": f"Highest Outstanding: {top['dimension']}",
        "description": (
            f"{top['dimension']} accounts for ${top['total_amount']:,.0f} "
            f"({top['pct_of_total']}%) across {top['record_count']} overpayments."
        ),
        "metric": top["total_amount"],
        "dimension": top["dimension"],
    })

    # Insight 2: Concentration analysis — top 3 vs rest
    if len(groups) >= 3:
        top3_amount = sum(g["total_amount"] for g in groups[:3])
        top3_pct = round(top3_amount / grand_total * 100, 1) if grand_total > 0 else 0
        insights.append({
            "type": "concentration",
            "severity": "high" if top3_pct > 70 else "medium",
            "title": f"Top 3 {dimension_label}s = {top3_pct}% of Total",
            "description": (
                f"The top 3 {dimension_label.lower()}s account for "
                f"${top3_amount:,.0f} ({top3_pct}%) of all overpayments. "
                f"Remaining {len(groups) - 3} {dimension_label.lower()}(s) account for the rest."
            ),
            "metric": top3_pct,
        })

    # Insight 3: Best recovery rate (for groups with meaningful volume)
    meaningful = [g for g in groups if g["record_count"] >= 3]
    if meaningful:
        best_recovery = max(meaningful, key=lambda g: g["recovery_rate"])
        worst_recovery = min(meaningful, key=lambda g: g["recovery_rate"])

        if best_recovery["recovery_rate"] > 0:
            insights.append({
                "type": "best_recovery",
                "severity": "info",
                "title": f"Best Recovery: {best_recovery['dimension']}",
                "description": (
                    f"{best_recovery['dimension']} has the highest recovery rate at "
                    f"{best_recovery['recovery_rate']}% with ${best_recovery['recouped_amount']:,.0f} recouped."
                ),
                "metric": best_recovery["recovery_rate"],
                "dimension": best_recovery["dimension"],
            })

        if worst_recovery["recovery_rate"] < best_recovery["recovery_rate"]:
            insights.append({
                "type": "worst_recovery",
                "severity": "warning",
                "title": f"Lowest Recovery: {worst_recovery['dimension']}",
                "description": (
                    f"{worst_recovery['dimension']} has the lowest recovery rate at "
                    f"{worst_recovery['recovery_rate']}% — "
                    f"${worst_recovery['total_amount'] - worst_recovery['recouped_amount']:,.0f} remains outstanding."
                ),
                "metric": worst_recovery["recovery_rate"],
                "dimension": worst_recovery["dimension"],
            })

    # Insight 4: Highest average overpayment
    if meaningful:
        highest_avg = max(meaningful, key=lambda g: g["avg_amount"])
        insights.append({
            "type": "highest_avg",
            "severity": "medium",
            "title": f"Highest Avg Overpayment: {highest_avg['dimension']}",
            "description": (
                f"{highest_avg['dimension']} has the highest average overpayment of "
                f"${highest_avg['avg_amount']:,.0f} per case "
                f"(range: ${highest_avg['min_amount']:,.0f} – ${highest_avg['max_amount']:,.0f})."
            ),
            "metric": highest_avg["avg_amount"],
            "dimension": highest_avg["dimension"],
        })

    # Insight 5: Overall recovery gap
    outstanding = grand_total - grand_recouped
    if outstanding > 0:
        overall_rate = round(grand_recouped / grand_total * 100, 1) if grand_total > 0 else 0
        insights.append({
            "type": "recovery_gap",
            "severity": "high" if overall_rate < 50 else "medium",
            "title": f"${outstanding:,.0f} Outstanding",
            "description": (
                f"Overall recovery rate is {overall_rate}%. "
                f"${outstanding:,.0f} of ${grand_total:,.0f} in identified overpayments remains unrecouped."
            ),
            "metric": outstanding,
        })

    # Insight 6: Billing variance (total_billed vs total_allowable)
    groups_with_billing = [g for g in groups if g.get("total_billed", 0) > 0 and g.get("total_allowable", 0) > 0]
    if groups_with_billing:
        highest_variance = max(
            groups_with_billing,
            key=lambda g: (g["total_billed"] - g["total_allowable"]) / g["total_billed"] if g["total_billed"] > 0 else 0,
        )
        billed = highest_variance["total_billed"]
        allowable = highest_variance["total_allowable"]
        if billed > 0:
            variance_pct = round((billed - allowable) / billed * 100, 1)
            if variance_pct > 15:
                insights.append({
                    "type": "billing_variance",
                    "severity": "warning",
                    "title": f"High Billing Variance: {highest_variance['dimension']}",
                    "description": (
                        f"{highest_variance['dimension']} shows a {variance_pct}% difference between "
                        f"billed (${billed:,.0f}) and allowable (${allowable:,.0f}) amounts — "
                        f"may indicate systematic overbilling patterns."
                    ),
                    "metric": variance_pct,
                    "dimension": highest_variance["dimension"],
                })

    # Insight 7: Spread/diversity of overpayments
    if len(groups) > 1:
        top_pct = groups[0]["pct_of_total"] if groups[0].get("pct_of_total") else 0
        if top_pct > 50:
            insights.append({
                "type": "dominant_source",
                "severity": "high",
                "title": "Single Source Dominance",
                "description": (
                    f"{groups[0]['dimension']} alone accounts for {top_pct}% of all overpayments. "
                    f"Targeted intervention on this {dimension_label.lower()} could significantly reduce exposure."
                ),
                "metric": top_pct,
                "dimension": groups[0]["dimension"],
            })

    return insights


async def export_overpayments_csv(bq: bigquery.Client, status: str | None = None) -> str:
    """Return CSV string of overpayment records."""
    ds = get_dataset()

    where_clause = ""
    params: list = []
    if status:
        where_clause = "WHERE o.recoupment_status = @status"
        params.append(bigquery.ScalarQueryParameter("status", "STRING", status))

    rows = await run_query(
        f"""
        SELECT o.*, c.claim_number
        FROM `{ds}.overpayments` o
        LEFT JOIN `{ds}.claims` c ON c.id = o.claim_id
        {where_clause}
        ORDER BY o.date_identified DESC
        """,  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        params if params else None,
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Claim Number", "Provider Name", "Provider NPI",
        "Original Billing Amount", "Allowable Amount", "Overpayment Amount",
        "Recoupment Status", "Date Identified", "FMS Paid Date", "Assigned Analyst",
    ])

    for row in rows:
        op = Overpayment.from_bq_row(row)
        writer.writerow([
            row.claim_number,
            op.provider_name,
            op.provider_npi,
            f"{float(op.original_billing_amount):.2f}",
            f"{float(op.allowable_amount):.2f}",
            f"{float(op.overpayment_amount):.2f}",
            op.recoupment_status,
            op.date_identified.strftime("%Y-%m-%d") if op.date_identified else "",
            op.fms_paid_date.strftime("%Y-%m-%d") if op.fms_paid_date else "",
            op.assigned_analyst,
        ])

    return output.getvalue()
