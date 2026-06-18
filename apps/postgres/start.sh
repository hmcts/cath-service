#!/bin/sh
set -e

echo "Starting CaTH Postgres migration runner..."
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

echo "Resolving any failed migrations..."
printf "UPDATE _prisma_migrations SET rolled_back_at = NOW() WHERE finished_at IS NULL AND rolled_back_at IS NULL AND started_at IS NOT NULL;" | \
  npx --ignore-scripts prisma db execute --stdin --config=./prisma.config.ts 2>/dev/null || true

echo "Clearing stale migration records for removed migrations..."
printf "DELETE FROM _prisma_migrations WHERE migration_name IN ('20260527140208', '20260528115459_add_third_party_push_log', '20260529131401_add_soft_delete_and_admin_audit_log');" | \
  npx --ignore-scripts prisma db execute --stdin --config=./prisma.config.ts 2>/dev/null || true

echo "Running database migrations..."
npx --ignore-scripts prisma migrate deploy --config=./prisma.config.ts

if [ $? -eq 0 ]; then
  echo "Migrations completed successfully"
  echo "Starting health proxy on port 5555..."
  node health-server.mjs &
  HEALTH_PID=$!

  echo "Starting Prisma Studio on port 5556..."
  npx --ignore-scripts prisma studio --config=./prisma.config.ts --port 5556 --browser none &
  STUDIO_PID=$!

  # Wait for both processes
  wait $HEALTH_PID $STUDIO_PID
else
  echo "Migration failed, exiting..."
  exit 1
fi
