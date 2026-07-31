"""
Load the structured core into Cloud SQL Postgres (enrollment-pg2 / db 'enrollment').

Uses the Cloud SQL Python Connector over your gcloud ADC login — no psql, no IP
whitelisting, no proxy. Set DB_PASSWORD first:

    export DB_PASSWORD='Passw0rd$'
    python db/load_postgres.py
"""

import csv
import os

from google.cloud.sql.connector import Connector
import pg8000  # noqa: F401  (driver used by the connector)

PROJECT = "noel-sandbox-02"
REGION = "us-central1"
INSTANCE = "enrollment-pg2"
DB = "enrollment"
CONN_NAME = f"{PROJECT}:{REGION}:{INSTANCE}"

DDL = [
    """CREATE TABLE IF NOT EXISTS addresses (
        address_id TEXT PRIMARY KEY, line TEXT, city TEXT, state TEXT,
        zip TEXT, is_cmra BOOLEAN)""",
    """CREATE TABLE IF NOT EXISTS registered_agents (
        agent_id TEXT PRIMARY KEY, name TEXT)""",
    """CREATE TABLE IF NOT EXISTS entities (
        entity_id TEXT PRIMARY KEY, legal_name TEXT, entity_type TEXT,
        formed_date TEXT, status TEXT, address_id TEXT, agent_id TEXT,
        application_date TEXT, revoked_date TEXT)""",
    """CREATE TABLE IF NOT EXISTS ownerships (
        own_id TEXT PRIMARY KEY, entity_id TEXT, individual_id TEXT,
        pct DOUBLE PRECISION, role TEXT, start_date TEXT, end_date TEXT)""",
    """CREATE TABLE IF NOT EXISTS source_documents (
        doc_id TEXT PRIMARY KEY, record_id TEXT, entity_id TEXT,
        doc_type TEXT, title TEXT, gcs_uri TEXT)""",
]

TABLES = {
    "addresses": (["address_id", "line", "city", "state", "zip", "is_cmra"],
                  "postgres/addresses.csv", {"is_cmra": lambda v: v == "True"}),
    "registered_agents": (["agent_id", "name"], "postgres/registered_agents.csv", {}),
    "entities": (["entity_id", "legal_name", "entity_type", "formed_date", "status",
                  "address_id", "agent_id", "application_date", "revoked_date"],
                 "postgres/entities.csv", {}),
    "ownerships": (["own_id", "entity_id", "individual_id", "pct", "role",
                    "start_date", "end_date"], "postgres/ownerships.csv",
                   {"pct": float}),
    "source_documents": (["doc_id", "record_id", "entity_id", "doc_type",
                          "title", "gcs_uri"], "postgres/source_documents.csv", {}),
}

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    pw = os.environ.get("DB_PASSWORD")
    if not pw:
        raise SystemExit("Set DB_PASSWORD first:  export DB_PASSWORD='Passw0rd$'")

    connector = Connector()
    conn = connector.connect(CONN_NAME, "pg8000", user="postgres",
                             password=pw, db=DB)
    cur = conn.cursor()

    for stmt in DDL:
        cur.execute(stmt)
    conn.commit()

    for table, (cols, path, casts) in TABLES.items():
        cur.execute(f"TRUNCATE {table}")
        rows = list(csv.DictReader(open(os.path.join(HERE, path))))
        placeholders = ", ".join(["%s"] * len(cols))
        sql = f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({placeholders})"
        for r in rows:
            vals = [casts.get(c, lambda v: v or None)(r[c]) for c in cols]
            cur.execute(sql, vals)
        conn.commit()
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        print(f"{table:<20} loaded {cur.fetchone()[0]} rows")

    cur.close()
    conn.close()
    connector.close()
    print("Postgres load complete.")


if __name__ == "__main__":
    main()
