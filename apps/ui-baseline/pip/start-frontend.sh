#!/usr/bin/env bash
# Starts a patched pip-frontend (see pip-frontend.patch) against the parity backends in
# docker-compose.yml. NODE_ENV=development is required: it serves HTTPS with pip's bundled
# localhost certificate, and pip's session cookie is secure-only. Development mode only adds
# things outside <main> (branch tag, webpack dev middleware, template watching).
set -euo pipefail

PIP_FRONTEND="${1:?usage: start-frontend.sh <path to patched pip-frontend checkout>}"
PORT="${PIP_FRONTEND_PORT:-8180}"

cd "$PIP_FRONTEND"

# pip expects developers to supply their own localhost certificate. With PARITY_CERT_DIR (see
# make-cert.sh) it is signed by a local CA the browser can trust; otherwise it is self-signed.
SSL_DIR=src/main/resources/localhost-ssl
if [ -n "${PARITY_CERT_DIR:-}" ]; then
  mkdir -p "$SSL_DIR"
  cp "$PARITY_CERT_DIR/localhost.crt" "$PARITY_CERT_DIR/localhost.key" "$SSL_DIR/"
elif [ ! -f "$SSL_DIR/localhost.crt" ]; then
  mkdir -p "$SSL_DIR"
  openssl req -x509 -newkey rsa:2048 -nodes -days 365 -subj "/CN=localhost" \
    -keyout "$SSL_DIR/localhost.key" -out "$SSL_DIR/localhost.crt" 2>/dev/null
fi

exec env \
  NODE_ENV=development \
  TZ=Europe/London \
  PORT="$PORT" \
  FRONTEND_URL="https://localhost:$PORT" \
  PARITY_AUTH=true \
  INSECURE=true \
  DATA_MANAGEMENT_URL=http://localhost:18090 \
  ACCOUNT_MANAGEMENT_URL=http://localhost:16969 \
  REDIS_LOCAL=true \
  REDIS_HOST=localhost \
  REDIS_PORT=16379 \
  SESSION_SECRET=parity-local-only \
  CLIENT_SECRET=unused \
  ./node_modules/.bin/ts-node -r tsconfig-paths/register src/main/server.ts
