#!/bin/sh
set -e

echo "Starting CaTH Postgres migration runner"
echo "Loading /mnt/secrets..."

if [ -d "/mnt/secrets" ]; then
  echo "Loading secrets from /mnt/secrets..."
  for vault_dir in /mnt/secrets/*/; do
    if [ -d "$vault_dir" ]; then
      for secret in "$vault_dir"*; do
        name=$(basename "$secret")
        # Skip CSI driver internal entries (start with ..)
        case "$name" in
          ..*) continue ;;
        esac
        # Check for regular file or symlink pointing to a file
        if [ -f "$secret" ] || [ -L "$secret" ]; then
          # Verify it's not a symlink to a directory
          if [ ! -d "$secret" ]; then
            value=$(cat "$secret")
            export "$name"="$value"
            echo "  Loaded: $name"
          fi
        fi
      done
    fi
  done
fi

# Start health server immediately so Helm marks the pod Ready and terminates
# the old pod. DDL migrations (DROP COLUMN, DROP TABLE) need ACCESS EXCLUSIVE
# locks — the old pod's Prisma Studio holds open connections that block those
# locks until the old pod is gone. Starting health first breaks the deadlock.
echo "Starting health proxy on port 5555..."
node health-server.mjs &
HEALTH_PID=$!

echo "Waiting for database to become available..."
until node_modules/.bin/prisma db execute --stdin --config=./prisma.config.ts <<'SQL' 2>/dev/null
SELECT 1;
SQL
do
  echo "  Database not ready, retrying in 10s..."
  sleep 10
done
echo "Database is available."

echo "Resolving any failed migrations..."
printf "UPDATE _prisma_migrations SET rolled_back_at = NOW() WHERE finished_at IS NULL AND rolled_back_at IS NULL AND started_at IS NOT NULL;" | \
  node_modules/.bin/prisma db execute --stdin --config=./prisma.config.ts 2>/dev/null || true

echo "Running database migrations..."
node_modules/.bin/prisma migrate deploy --config=./prisma.config.ts

echo "Migrations completed successfully"
echo "Starting Prisma Studio on port 5556..."
node_modules/.bin/prisma studio --config=./prisma.config.ts --port 5556 --browser none &
STUDIO_PID=$!

wait $HEALTH_PID $STUDIO_PID
