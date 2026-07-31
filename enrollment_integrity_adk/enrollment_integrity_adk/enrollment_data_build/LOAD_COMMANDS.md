# Loading the three stores

Run from the `enrollment_data_build/` directory, in your activated venv.

## 0. Install loader deps
```bash
uv pip install -r db/requirements-load.txt
```

## 1. (Re)generate the data  — optional; CSVs are already included
```bash
python generate.py
```

## 2. Load Postgres (structured core)
```bash
export DB_PASSWORD='Passw0rd$'
python db/load_postgres.py
```
Expect: addresses / registered_agents / entities / ownerships row counts.

## 3. Load Spanner (identity + LEIE)
```bash
python db/load_spanner.py
```
Expect: `individuals loaded 292 rows (2 on LEIE)`.

## 4. Load BigQuery (population view)  — bypasses the broken bq CLI
```bash
python db/load_bigquery.py
```
Expect: row count + top CMRA building (4471 Peachtree Industrial Blvd -> 5 entities).

## Verify (optional)
```bash
# Postgres
python -c "import os;from google.cloud.sql.connector import Connector;c=Connector();cn=c.connect('noel-sandbox-02:us-central1:enrollment-pg2','pg8000',user='postgres',password=os.environ['DB_PASSWORD'],db='enrollment');cur=cn.cursor();cur.execute('SELECT status,count(*) FROM entities GROUP BY status');print(cur.fetchall())"
```

## Planted cases to remember
- ENT-COASTAL   HIGH RISK (260) — flagship phoenix, excluded owner via history hop
- ENT-REDOAK    HIGH RISK (100) — obvious: excluded owner listed currently
- ENT-MARSHVIEW ELEVATED (40)   — stealth: only the mail-drop cluster signal
- ENT-TIDEWATER HIGH RISK (120) — cluster-mate at the mail drop
- ENT-BEACON / ENT-CLEARPATH / ENT-NORTHSTAR — near-misses, must stay clean (0)
  (NORTHSTAR owner shares the excluded operator's NAME but a different identifier,
   and correctly does NOT resolve — the false-link guard.)
