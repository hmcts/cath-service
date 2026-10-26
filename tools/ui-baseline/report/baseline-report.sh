#!/usr/bin/env bash
# Builds the report for the recorded pip baseline alone, with no CaTH running, and serves it.
#
# usage: baseline-report.sh [baseline dir] [port]
#   defaults: $PARITY_BASELINE or tools/ui-baseline/output/baseline, and 9500
set -euo pipefail

PARITY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$PARITY_DIR/../.." && pwd)"
BASELINE="$(cd "${1:-${PARITY_BASELINE:-$PARITY_DIR/output/baseline}}" && pwd)"
PORT="${2:-9500}"
OUT="$PARITY_DIR/output/baseline-report"
# The report reads list captures from <lists>/pip; it lives outside OUT because the report clears OUT
LISTS="$PARITY_DIR/output/baseline-report-lists"

if [ ! -f "$BASELINE/run.json" ]; then
  echo "No recorded baseline in $BASELINE: run yarn ui-baseline:record-pip first." >&2
  exit 1
fi

mkdir -p "$LISTS"
ln -sfn "$BASELINE/lists" "$LISTS/pip"
node "$PARITY_DIR/report/make-report.mjs" \
  --lists "$LISTS" \
  --manifest "$PARITY_DIR/fixtures/publications.json" \
  --pages "$BASELINE/pages" \
  --journeys "$BASELINE/journeys" \
  --run "$BASELINE/run.json" \
  --route-map "$PARITY_DIR/routes/route-map.json" \
  --defects "$PARITY_DIR/pip/KNOWN-DEFECTS.md" \
  --govuk "$REPO_DIR/node_modules/govuk-frontend/dist/govuk" \
  --title "pip baseline" \
  --out "$OUT"
exec node "$PARITY_DIR/report/serve.mjs" "$OUT" "$PORT"
