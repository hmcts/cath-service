#!/usr/bin/env bash
# Docker-free equivalent of `docker compose up` for local dev and virtual agents.
# Runs the same three dependencies as host processes on the same ports:
#   Postgres 18 (embedded-postgres binaries)  localhost:5433  user hmcts, trust auth
#   Redis 8 (built from source, needs gcc+make) localhost:6380
#   Azurite blob emulator (npm)                localhost:10000
# Everything lives under .nodocker/ (gitignored). Usage: dev-nodocker.sh up|down|status
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ND="$ROOT/.nodocker"
REDIS_VERSION=8.0.2
PG_VERSION=18.6.0-beta.19
mkdir -p "$ND/run"

PG_BIN() { echo "$ND"/tools/node_modules/@embedded-postgres/*/native/bin; }

install_tools() {
  if [ ! -d "$ND/tools/node_modules/azurite" ]; then
    echo "Installing embedded-postgres and azurite..."
    mkdir -p "$ND/tools"
    (cd "$ND/tools" && { [ -f package.json ] || echo '{"private":true}' > package.json; } \
      && npm install --no-audit --no-fund "embedded-postgres@$PG_VERSION" azurite >/dev/null)
  fi
  if [ ! -x "$ND/redis-$REDIS_VERSION/src/redis-server" ]; then
    echo "Building Redis $REDIS_VERSION (one-off, ~1 min)..."
    command -v make >/dev/null && command -v gcc >/dev/null || { echo "gcc and make are required to build Redis" >&2; exit 1; }
    curl -fsSL "https://download.redis.io/releases/redis-$REDIS_VERSION.tar.gz" | tar xz -C "$ND"
    make -C "$ND/redis-$REDIS_VERSION" -j"$(nproc)" BUILD_TLS=no >"$ND/redis-build.log" 2>&1
  fi
}

running() { [ -f "$ND/run/$1.pid" ] && kill -0 "$(cat "$ND/run/$1.pid")" 2>/dev/null; }

up() {
  install_tools
  local bin; bin="$(PG_BIN)"

  if ! running postgres; then
    [ -f "$ND/pgdata/PG_VERSION" ] || "$bin/initdb" -D "$ND/pgdata" -U hmcts --auth=trust -E UTF8 >/dev/null
    "$bin/pg_ctl" -D "$ND/pgdata" -l "$ND/postgres.log" -w \
      -o "-p 5433 -k $ND/run -c listen_addresses=127.0.0.1" start >/dev/null
    head -1 "$ND/pgdata/postmaster.pid" > "$ND/run/postgres.pid"
  fi

  if ! running redis; then
    "$ND/redis-$REDIS_VERSION/src/redis-server" --port 6380 --bind 127.0.0.1 --dir "$ND" \
      --appendonly yes --daemonize yes --pidfile "$ND/run/redis.pid" --logfile "$ND/redis.log"
  fi

  if ! running azurite; then
    nohup "$ND/tools/node_modules/.bin/azurite-blob" --blobHost 127.0.0.1 --blobPort 10000 \
      --location "$ND/azurite" --silent >"$ND/azurite.log" 2>&1 &
    echo $! > "$ND/run/azurite.pid"
  fi

  status
}

down() {
  local bin; bin="$(PG_BIN 2>/dev/null || true)"
  running postgres && "$bin/pg_ctl" -D "$ND/pgdata" -m fast stop >/dev/null && rm -f "$ND/run/postgres.pid"
  for p in redis azurite; do
    running "$p" && kill "$(cat "$ND/run/$p.pid")" && rm -f "$ND/run/$p.pid"
  done
  echo "stopped"
}

status() {
  for p in postgres:5433 redis:6380 azurite:10000; do
    running "${p%%:*}" && echo "${p%%:*}: running on :${p##*:}" || echo "${p%%:*}: stopped"
  done
}

case "${1:-}" in
  up) up ;;
  down) down ;;
  status) status ;;
  *) echo "usage: $0 up|down|status" >&2; exit 2 ;;
esac
