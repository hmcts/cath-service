#!/usr/bin/env bash
# Records the pip baseline: gets pip ready (setup.sh), starts a fresh pip stack seeded from
# tools/ui-baseline/fixtures, then captures every list page, every other page and every journey
# into <out>. Journeys change data, so the stack is always recreated empty first; that is what
# makes two runs, on any machine, comparable.
#
# usage: baseline.sh [pip checkouts dir] [output dir]
#   defaults: $UI_BASELINE_PIP_DIR or ~/.cache/ui-baseline/pip, and tools/ui-baseline/output/baseline
# Needs Docker, Node and corepack. The first run clones and builds pip (about 10 minutes); a
# baseline run then takes about 25 minutes.
# pip-frontend is (re)started here, after the stack, because it does not survive its Redis being
# recreated. Set PARITY_CERT_DIR to serve it with the local CA's certificate (make-cert.sh).
set -euo pipefail

PARITY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$PARITY_DIR/../.." && pwd)"
PIP_SRC="${1:-${UI_BASELINE_PIP_DIR:-$HOME/.cache/ui-baseline/pip}}"
OUT="$(mkdir -p "${2:-$PARITY_DIR/output/baseline}" && cd "${2:-$PARITY_DIR/output/baseline}" && pwd)"
TOOL="$PARITY_DIR/src/cli.ts"
PIP_FRONTEND_URL="${PIP_FRONTEND_URL:-https://localhost:8180}"
FRONTEND_PID_FILE="${FRONTEND_PID_FILE:-/tmp/parity-pip-frontend.pid}"
FRONTEND_LOG="${FRONTEND_LOG:-$OUT/pip-frontend.log}"

step() { printf '\n== %s\n' "$*"; }
wait_for() {
  for _ in $(seq 1 100); do curl -sfk -o /dev/null "$1" && return 0; sleep 3; done
  echo "timed out waiting for $1" >&2
  exit 1
}

"$PARITY_DIR/pip/setup.sh" "$PIP_SRC"
PIP_SRC="$(cd "$PIP_SRC" && pwd)"

step "Recreating the pip stack empty"
cd "$PARITY_DIR/pip"
PIP_SRC="$PIP_SRC" docker compose down -v --remove-orphans
PIP_SRC="$PIP_SRC" docker compose up -d
wait_for http://localhost:18090/health
wait_for http://localhost:16969/health
node "$PARITY_DIR/pip/create-containers.mjs"

step "Restarting pip-frontend"
if [ -f "$FRONTEND_PID_FILE" ]; then kill "$(cat "$FRONTEND_PID_FILE")" 2>/dev/null || true; fi
# Stop any pip-frontend started outside this script on the same port (lsof on macOS, ss on Linux)
PORT="${PIP_FRONTEND_URL##*:}"
if command -v lsof >/dev/null; then
  PIDS="$(lsof -ti "tcp:$PORT" -sTCP:LISTEN 2>/dev/null || true)"
else
  PIDS="$(ss -ltnp 2>/dev/null | sed -n "s/.*:$PORT .*pid=\([0-9]*\).*/\1/p")"
fi
for pid in $PIDS; do kill "$pid" 2>/dev/null || true; done
sleep 2
nohup "$PARITY_DIR/pip/start-frontend.sh" "$PIP_SRC/pip-frontend" > "$FRONTEND_LOG" 2>&1 &
echo $! > "$FRONTEND_PID_FILE"
wait_for "$PIP_FRONTEND_URL/"

cd "$REPO_DIR"
step "Seeding pip"
npx tsx tools/ui-baseline/pip/seed.ts
# The ids pip gave each publication, record and user; a check maps those in page URLs to CaTH's
cp tools/ui-baseline/output/seed/pip.json "$OUT/seed.json"

commit() { git -C "$PIP_SRC/$1" rev-parse --short=8 HEAD; }
PIP_COMMITS="pip-frontend@$(commit pip-frontend)+pip-data-management@$(commit pip-data-management)+pip-account-management@$(commit pip-account-management)"

step "Capturing list pages"
npx tsx tools/ui-baseline/build-targets.ts pip "$PIP_COMMITS"
npx tsx "$TOOL" capture --targets tools/ui-baseline/output/targets/pip.json --out "$OUT/lists" --concurrency 4 > "$OUT/lists.log" 2>&1 || true
tail -1 "$OUT/lists.log"

step "Recording flat files"
npx tsx tools/ui-baseline/pip/record-flat-files.ts "$OUT/flat-files" | command grep -v "npm warn" || true

step "Capturing other pages"
npx tsx tools/ui-baseline/routes/build-page-targets.ts
npx tsx "$TOOL" capture --targets tools/ui-baseline/output/targets/pip-pages.json --out "$OUT/pages" --concurrency 4 > "$OUT/pages.log" 2>&1 || true
tail -1 "$OUT/pages.log"

step "Running journeys"
npx tsx "$TOOL" journeys --module tools/ui-baseline/pip/journeys/index.ts --out "$OUT/journeys" > "$OUT/journeys.log" 2>&1 || true
tail -1 "$OUT/journeys.log"

step "Writing run summary"
node -e '
const fs = require("node:fs"), path = require("node:path");
const out = process.argv[1];
const lines = (file) => fs.existsSync(file) ? fs.readFileSync(file, "utf-8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line)) : [];
const lists = lines(path.join(out, "lists/index.jsonl")), pages = lines(path.join(out, "pages/index.jsonl")), journeys = lines(path.join(out, "journeys/index.jsonl"));
const summary = {
  finishedAt: new Date().toISOString(),
  pip: process.argv[2],
  // Captures that failed outright (e.g. pip down) never reach the index; the capture logs count them
  failedCaptures: [...lists, ...pages].filter((c) => c.status !== 200).length + ["lists.log", "pages.log"].reduce((sum, log) => {
    const match = fs.existsSync(path.join(out, log)) && fs.readFileSync(path.join(out, log), "utf-8").match(/(\d+) failed/g);
    return sum + (match ? Number(match.at(-1).split(" ")[0]) : 0);
  }, 0),
  captures: { listPages: lists.length, otherPages: pages.length, journeyRuns: journeys.length, journeyCheckpoints: journeys.reduce((sum, j) => sum + j.steps, 0) },
  failedJourneys: journeys.filter((j) => !j.ok).map((j) => `${j.journey} ${j.locale}: ${j.error?.split("\n")[0]}`)
};
fs.writeFileSync(path.join(out, "run.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
if (summary.failedCaptures || summary.failedJourneys.length) process.exit(1);
' "$OUT" "$PIP_COMMITS" || {
  echo >&2
  echo "The baseline is incomplete: some captures or journeys failed (see above and the *.log files in $OUT)." >&2
  if ! curl -sfk -o /dev/null "$PIP_FRONTEND_URL/"; then
    echo "pip-frontend is no longer running. It is usually killed for lack of memory: stop other things (e.g. CaTH) and re-run." >&2
  fi
  exit 1
}
