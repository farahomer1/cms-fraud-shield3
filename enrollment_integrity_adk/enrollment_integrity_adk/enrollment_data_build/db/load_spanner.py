"""
Load identity + exclusion data into Spanner (enrollment-identity / db 'identity').

Uses the Spanner client over your gcloud ADC login.

    python db/load_spanner.py
"""

import csv
import os

from google.cloud import spanner

PROJECT = "noel-sandbox-02"
INSTANCE = "enrollment-identity"
DB = "identity"

DDL = [
    """CREATE TABLE individuals (
        individual_id STRING(64) NOT NULL,
        name STRING(256),
        ssn4 STRING(8),
        dob STRING(16),
        on_leie BOOL,
        leie_reason STRING(256),
        leie_date STRING(16),
    ) PRIMARY KEY (individual_id)""",
    """CREATE INDEX individuals_by_key ON individuals (ssn4, dob)""",
]

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COLS = ["individual_id", "name", "ssn4", "dob", "on_leie", "leie_reason", "leie_date"]


def main():
    client = spanner.Client(project=PROJECT)
    instance = client.instance(INSTANCE)
    database = instance.database(DB)

    # Create table + index (idempotent: ignore "already exists").
    try:
        op = database.update_ddl(DDL)
        op.result(120)
        print("DDL applied (individuals + index).")
    except Exception as e:
        if "Duplicate name" in str(e) or "already exists" in str(e):
            print("DDL already present, skipping.")
        else:
            raise

    rows = list(csv.DictReader(open(os.path.join(HERE, "spanner/individuals.csv"))))
    values = []
    for r in rows:
        values.append((
            r["individual_id"], r["name"] or None, r["ssn4"] or None,
            r["dob"] or None, r["on_leie"] == "True",
            r["leie_reason"] or None, r["leie_date"] or None,
        ))

    # Clear then insert (batches of 500 to stay well under mutation limits).
    def _delete(txn):
        txn.execute_update("DELETE FROM individuals WHERE TRUE")
    database.run_in_transaction(_delete)

    for i in range(0, len(values), 500):
        chunk = values[i:i + 500]
        with database.batch() as batch:
            batch.insert(table="individuals", columns=COLS, values=chunk)

    with database.snapshot() as snap:
        n = list(snap.execute_sql("SELECT COUNT(*) FROM individuals"))[0][0]
        leie = list(snap.execute_sql(
            "SELECT COUNT(*) FROM individuals WHERE on_leie = TRUE"))[0][0]
    print(f"individuals loaded {n} rows ({leie} on LEIE)")
    print("Spanner load complete.")


if __name__ == "__main__":
    main()
