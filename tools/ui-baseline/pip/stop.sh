#!/usr/bin/env bash
# Stops the local pip started by baseline.sh: pip-frontend, then the backend stack (data kept
# until the next baseline run recreates it).
set -euo pipefail

PIP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_PID_FILE="${FRONTEND_PID_FILE:-/tmp/parity-pip-frontend.pid}"

if [ -f "$FRONTEND_PID_FILE" ]; then
  kill "$(cat "$FRONTEND_PID_FILE")" 2>/dev/null || true
  rm -f "$FRONTEND_PID_FILE"
fi
# The compose file needs PIP_SRC to resolve its jar mounts, even though stopping does not use them
(cd "$PIP_DIR" && PIP_SRC=unused docker compose stop)
