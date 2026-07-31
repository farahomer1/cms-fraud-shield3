"""
Load the denormalized population view into BigQuery
(noel-sandbox-02.enrollment.entities_denorm).

Uses the BigQuery Python client — bypasses the broken `bq` CLI (mTLS bug).

    python db/load_bigquery.py
"""

import os

from google.cloud import bigquery

PROJECT = "noel-sandbox-02"
DATASET = "enrollment"
TABLE = "entities_denorm"
TABLE_ID = f"{PROJECT}.{DATASET}.{TABLE}"

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(HERE, "bigquery/entities_denorm.csv")

SCHEMA = [
    bigquery.SchemaField("entity_id", "STRING"),
    bigquery.SchemaField("legal_name", "STRING"),
    bigquery.SchemaField("entity_type", "STRING"),
    bigquery.SchemaField("status", "STRING"),
    bigquery.SchemaField("application_date", "STRING"),
    bigquery.SchemaField("formed_date", "STRING"),
    bigquery.SchemaField("address_id", "STRING"),
    bigquery.SchemaField("agent_id", "STRING"),
    bigquery.SchemaField("building_key", "STRING"),
    bigquery.SchemaField("is_cmra", "BOOLEAN"),
]


def main():
    client = bigquery.Client(project=PROJECT)
    job_config = bigquery.LoadJobConfig(
        source_format=bigquery.SourceFormat.CSV,
        skip_leading_rows=1,
        schema=SCHEMA,
        write_disposition="WRITE_TRUNCATE",
    )
    with open(CSV_PATH, "rb") as f:
        job = client.load_table_from_file(f, TABLE_ID, job_config=job_config)
    job.result()

    table = client.get_table(TABLE_ID)
    print(f"{TABLE_ID} loaded {table.num_rows} rows")

    # Quick aggregate sanity check: the mail-drop cluster.
    q = f"""SELECT building_key, COUNT(*) AS n
            FROM `{TABLE_ID}`
            WHERE is_cmra = TRUE
            GROUP BY building_key ORDER BY n DESC LIMIT 3"""
    print("top CMRA buildings:")
    for row in client.query(q).result():
        print(f"  {row['building_key']}  ->  {row['n']} entities")
    print("BigQuery load complete.")


if __name__ == "__main__":
    main()
