#!/usr/bin/env bash
# Records the pip baseline: gets pip ready (setup.sh), starts a fresh pip stack seeded from
# apps/ui-baseline/fixtures, then captures every list page, every other page and every journey
# into <out>. Journeys change data, so the stack is always recreated empty first; that is what
# makes two runs, on any machine, comparable.
#
# usage: baseline.sh [--ticket N] [--list-type NAME]... [--route /path]... [--journey ID]... [pip checkouts dir] [output dir]
#   defaults: $UI_BASELINE_PIP_DIR or ~/.cache/ui-baseline/pip, and apps/ui-baseline/output/baseline
# Needs Docker, Node and corepack. The first run clones and builds pip (about 10 minutes); a
# baseline run then takes about 25 minutes.
# A ticket recording (--ticket, --list-type, --route or --journey) records only what the ticket
# names, picked as the check picks what to compare (pip/scope.ts), into output/baselines/<name>.
# It is a baseline of its own, with its own seed.json: pip gives its data new ids on every fresh
# stack, so its captures cannot be merged into another recording. `check --ticket N` uses it.
# pip-frontend is (re)started here, after the stack, because it does not survive its Redis being
# recreated. Set PARITY_CERT_DIR to serve it with the local CA's certificate (make-cert.sh).
set -euo pipefail

PARITY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$PARITY_DIR/../.." && pwd)"
# A field of a JSON file (a mktemp file has no .json extension, so it is read rather than required)
json_field() { node -e 'console.log(JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf-8"))[process.argv[2]])' "$1" "$2"; }
SCOPE_ARGS=()
POSITIONAL=()
while [ $# -gt 0 ]; do
  case "$1" in
    --ticket | --list-type | --route | --journey)
      SCOPE_ARGS+=("$1" "$2")
      shift 2
      ;;
    *)
      POSITIONAL+=("$1")
      shift
      ;;
  esac
done
set -- "${POSITIONAL[@]+"${POSITIONAL[@]}"}"
PIP_SRC="${1:-${UI_BASELINE_PIP_DIR:-$HOME/.cache/ui-baseline/pip}}"
DEFAULT_OUT="$PARITY_DIR/output/baseline"
SCOPE_FILE=""
if [ ${#SCOPE_ARGS[@]} -gt 0 ]; then
  SCOPE_FILE="$(mktemp)"
  (cd "$REPO_DIR" && npx tsx apps/ui-baseline/pip/scope.ts --out "$SCOPE_FILE" "${SCOPE_ARGS[@]}")
  DEFAULT_OUT="$PARITY_DIR/output/baselines/$(json_field "$SCOPE_FILE" name)"
fi
OUT="$(mkdir -p "${2:-$DEFAULT_OUT}" && cd "${2:-$DEFAULT_OUT}" && pwd)"
if [ -n "$SCOPE_FILE" ]; then
  # Nothing from an earlier recording into this folder may survive into this one
  rm -rf "$OUT/lists" "$OUT/pages" "$OUT/journeys" "$OUT/files" "$OUT/flat-files" "$OUT/downloads"
  mv "$SCOPE_FILE" "$OUT/scope.json"
  export UI_BASELINE_SCOPE="$OUT/scope.json"
fi
# How many targets a targets file has, so a step with nothing in scope is skipped
count_targets() { json_field "$1" length; }
# A step skipped in a ticket recording still leaves an empty index, which a check reads
empty_index() { mkdir -p "$1" && : > "$1/index.jsonl"; }
TOOL="$PARITY_DIR/core/cli.ts"
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
npx tsx apps/ui-baseline/pip/seed.ts
# The ids pip gave each publication, record and user; a check maps those in page URLs to CaTH's
cp apps/ui-baseline/output/seed/pip.json "$OUT/seed.json"

commit() { git -C "$PIP_SRC/$1" rev-parse --short=8 HEAD; }
PIP_COMMITS="pip-frontend@$(commit pip-frontend)+pip-data-management@$(commit pip-data-management)+pip-account-management@$(commit pip-account-management)"

step "Capturing list pages"
npx tsx apps/ui-baseline/build-targets.ts pip "$PIP_COMMITS"
npx tsx apps/ui-baseline/pip/scope-targets.ts lists apps/ui-baseline/output/targets/pip.json
if [ "$(count_targets apps/ui-baseline/output/targets/pip.json)" -gt 0 ]; then
  npx tsx "$TOOL" capture --targets apps/ui-baseline/output/targets/pip.json --out "$OUT/lists" --concurrency 4 > "$OUT/lists.log" 2>&1 || true
  tail -1 "$OUT/lists.log"
else
  empty_index "$OUT/lists"
fi

step "Recording generated PDF and Excel files"
npx tsx apps/ui-baseline/pip/record-files.ts "$OUT/files" | command grep -v "npm warn" || true

step "Recording flat files"
npx tsx apps/ui-baseline/pip/record-flat-files.ts "$OUT/flat-files" | command grep -v "npm warn" || true

step "Capturing other pages"
npx tsx apps/ui-baseline/routes/build-page-targets.ts
npx tsx apps/ui-baseline/pip/scope-targets.ts pages apps/ui-baseline/output/targets/pip-pages.json
if [ "$(count_targets apps/ui-baseline/output/targets/pip-pages.json)" -gt 0 ]; then
  npx tsx "$TOOL" capture --targets apps/ui-baseline/output/targets/pip-pages.json --out "$OUT/pages" --concurrency 4 > "$OUT/pages.log" 2>&1 || true
  tail -1 "$OUT/pages.log"
else
  empty_index "$OUT/pages"
fi

step "Recording downloads"
npx tsx apps/ui-baseline/pip/record-downloads.ts "$OUT/downloads" | command grep -v "npm warn" || true

step "Running journeys"
JOURNEYS=""
[ -n "${UI_BASELINE_SCOPE:-}" ] && JOURNEYS="$(node -e 'console.log(JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf-8")).journeys.join(","))' "$UI_BASELINE_SCOPE")"
if [ -z "${UI_BASELINE_SCOPE:-}" ]; then
  npx tsx "$TOOL" journeys --module apps/ui-baseline/pip/journeys/index.ts --out "$OUT/journeys" > "$OUT/journeys.log" 2>&1 || true
  tail -1 "$OUT/journeys.log"
elif [ -n "$JOURNEYS" ]; then
  npx tsx "$TOOL" journeys --module apps/ui-baseline/pip/journeys/index.ts --out "$OUT/journeys" --only "$JOURNEYS" > "$OUT/journeys.log" 2>&1 || true
  tail -1 "$OUT/journeys.log"
else
  echo "none in scope"
fi

step "Writing run summary"
node -e '
const fs = require("node:fs"), path = require("node:path");
const out = process.argv[1];
const lines = (file) => fs.existsSync(file) ? fs.readFileSync(file, "utf-8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line)) : [];
const lists = lines(path.join(out, "lists/index.jsonl")), pages = lines(path.join(out, "pages/index.jsonl")), journeys = lines(path.join(out, "journeys/index.jsonl")), files = lines(path.join(out, "files/index.jsonl")), downloads = lines(path.join(out, "downloads/index.jsonl"));
const summary = {
  finishedAt: new Date().toISOString(),
  pip: process.argv[2],
  // A ticket recording: what it was limited to (pip/scope.ts); absent for a full recording
  scope: fs.existsSync(path.join(out, "scope.json")) ? JSON.parse(fs.readFileSync(path.join(out, "scope.json"), "utf-8")) : undefined,
  // Captures that failed outright (e.g. pip down) never reach the index; the capture logs count them
  failedCaptures: [...lists, ...pages].filter((c) => c.status !== 200).length + ["lists.log", "pages.log"].reduce((sum, log) => {
    const match = fs.existsSync(path.join(out, log)) && fs.readFileSync(path.join(out, log), "utf-8").match(/(\d+) failed/g);
    return sum + (match ? Number(match.at(-1).split(" ")[0]) : 0);
  }, 0),
  captures: { listPages: lists.length, otherPages: pages.length, journeyRuns: journeys.length, journeyCheckpoints: journeys.reduce((sum, j) => sum + j.steps, 0), generatedFiles: files.length, downloads: downloads.length },
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
