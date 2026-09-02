#!/usr/bin/env bash
# Scaffold the next numbered migration file.
#
# Usage: requirements/scripts/new_migration.sh "short description"
# e.g.   requirements/scripts/new_migration.sh "split REQ-0042 into two"
#        -> migrations/002_split_req_0042.sql

set -euo pipefail

REQ_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIG_DIR="$REQ_DIR/migrations"
mkdir -p "$MIG_DIR"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 \"short description\"" >&2
  exit 1
fi

desc="$1"
slug="$(echo "$desc" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '_' | sed 's/^_//;s/_$//')"

last="$(ls "$MIG_DIR"/[0-9]*.sql 2>/dev/null | sed -E 's#.*/([0-9]+)_.*#\1#' | sort -n | tail -1 || true)"
next="$(printf '%03d' "$(( 10#${last:-0} + 1 ))")"

file="$MIG_DIR/${next}_${slug}.sql"
cat > "$file" <<EOF
-- ${next}: ${desc}
--
-- Append-only change to requirements. Record edits in requirement_change
-- (incrementing the affected requirement's version) so the audit trail stays
-- complete, then make the corresponding change to the requirement row(s).

BEGIN TRANSACTION;

-- TODO: write the change

COMMIT;
EOF

echo "Created $file"
