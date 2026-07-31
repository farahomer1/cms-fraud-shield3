import csv, os, sys, pg8000
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from load_postgres import DDL, TABLES, HERE
conn = pg8000.connect(host="127.0.0.1", port=5432, user="postgres",
                      password=os.environ["DB_PASSWORD"], database="enrollment")
cur = conn.cursor()
for stmt in DDL: cur.execute(stmt)
conn.commit()
for table, (cols, path, casts) in TABLES.items():
    cur.execute(f"TRUNCATE {table}")
    for r in csv.DictReader(open(os.path.join(HERE, path))):
        ph = ", ".join(["%s"]*len(cols))
        vals = [casts.get(c, lambda v: v or None)(r[c]) for c in cols]
        cur.execute(f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({ph})", vals)
    conn.commit()
    cur.execute(f"SELECT COUNT(*) FROM {table}")
    print(f"{table:<20} loaded {cur.fetchone()[0]} rows")
conn.close()
print("Postgres load complete (via proxy).")
