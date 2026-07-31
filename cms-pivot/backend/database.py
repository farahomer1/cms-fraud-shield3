# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""BigQuery client setup for PIVOT backend."""

import asyncio
import re
from typing import Any

from google.cloud import bigquery

from config import settings

_client: bigquery.Client | None = None

# BigQuery project/dataset identifiers may only contain letters, digits,
# underscores, hyphens, and (for domain-scoped projects) a single ':' or '.'.
# Identifiers cannot be passed as query parameters, so they must be interpolated
# into query strings. Validating them here at the trust boundary guarantees the
# interpolated value can never carry SQL-breaking characters (backticks, quotes,
# semicolons, whitespace), keeping the string-built queries safe.
_IDENTIFIER_RE = re.compile(r"^[A-Za-z0-9_.:-]+$")


def _validate_identifier(value: str, kind: str) -> str:
    if not value or not _IDENTIFIER_RE.match(value):
        raise ValueError(f"Invalid BigQuery {kind} identifier: {value!r}")
    return value


def _get_client() -> bigquery.Client:
    """Create or return the BigQuery client singleton."""
    global _client
    if _client is None:
        kwargs: dict[str, Any] = {}
        if settings.bigquery_project:
            kwargs["project"] = settings.bigquery_project
        if settings.google_credentials_path:
            from google.oauth2 import service_account
            credentials = service_account.Credentials.from_service_account_file(
                settings.google_credentials_path
            )
            kwargs["credentials"] = credentials
        _client = bigquery.Client(**kwargs)
    return _client


def get_dataset() -> str:
    """Return the validated, fully-qualified dataset reference: `project.dataset`."""
    client = _get_client()
    project = _validate_identifier(settings.bigquery_project or client.project, "project")
    dataset = _validate_identifier(settings.bigquery_dataset, "dataset")
    return f"{project}.{dataset}"


def get_sync_client() -> bigquery.Client:
    """Return the BigQuery client (synchronous)."""
    return _get_client()


async def get_db():
    """FastAPI dependency that yields the BigQuery client.

    Maintains the same Depends(get_db) pattern used throughout routes,
    so the migration requires minimal route signature changes.
    """
    yield _get_client()


async def run_query(query: str, params: list | None = None) -> list:
    """Run a BigQuery query asynchronously via thread pool.

    Returns list of Row objects.
    """
    client = _get_client()
    job_config = bigquery.QueryJobConfig()
    if params:
        job_config.query_parameters = params
    result = await asyncio.to_thread(
        lambda: list(client.query(query, job_config=job_config).result())
    )
    return result


async def run_query_single(query: str, params: list | None = None):
    """Run a query and return the first row, or None."""
    rows = await run_query(query, params)
    return rows[0] if rows else None


async def insert_rows(table_name: str, rows: list[dict]) -> list:
    """Insert rows into a BigQuery table using streaming inserts."""
    client = _get_client()
    dataset = get_dataset()
    table_ref = f"{dataset}.{table_name}"
    errors = await asyncio.to_thread(
        client.insert_rows_json, table_ref, rows
    )
    return errors


async def run_dml(query: str, params: list | None = None) -> int:
    """Run a DML statement (INSERT/UPDATE/DELETE) and return affected row count."""
    client = _get_client()
    job_config = bigquery.QueryJobConfig()
    if params:
        job_config.query_parameters = params

    def _execute():
        job = client.query(query, job_config=job_config)
        job.result()  # wait for completion
        return job.num_dml_affected_rows or 0

    return await asyncio.to_thread(_execute)
