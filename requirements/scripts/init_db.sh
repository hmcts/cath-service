#!/usr/bin/env bash
# Build the requirements SQLite database from scratch.
#
# Applies, in order: schema.sql, seed.sql, then every migrations/*.sql.
# The resulting .db is a disposable build artefact (gitignored) — the SQL
# files are the source of truth. Re-runnable: rebuilds cleanly every time.
#
# Usage: requirements/scripts/init_db.sh [path/to/output.db]

set -euo pipefail

REQ_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_PATH="${1:-$REQ_DIR/requirements.db}"

rm -f "$DB_PATH"

sqlite3 "$DB_PATH" < "$REQ_DIR/schema.sql"
sqlite3 "$DB_PATH" < "$REQ_DIR/seed.sql"

shopt -s nullglob
for migration in "$REQ_DIR"/migrations/*.sql; do
  echo "Applying $(basename "$migration")"
  sqlite3 "$DB_PATH" < "$migration"
done

count="$(sqlite3 "$DB_PATH" "SELECT count(*) FROM requirement;")"
echo "Built $DB_PATH ($count requirements)"
