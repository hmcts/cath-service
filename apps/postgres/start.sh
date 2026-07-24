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
        case "$name" in
          ..*) continue ;;
        esac
        if [ -f "$secret" ] || [ -L "$secret" ]; then
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
until ../../node_modules/.bin/prisma db execute --stdin --config=./prisma.config.ts <<'SQL' 2>/dev/null
SELECT 1;
SQL
do
  echo "  Database not ready, retrying in 10s..."
  sleep 10
done
echo "Database is available."

echo "Applying migrations directly to avoid DDL lock contention..."
../../node_modules/.bin/prisma db execute --stdin --config=./prisma.config.ts 2>/dev/null <<'SQL' || true
-- Apply the file_extension migration idempotently
ALTER TABLE "artefact" ADD COLUMN IF NOT EXISTS "file_extension" VARCHAR(10);

-- Apply the remove-soft-delete migration idempotently
ALTER TABLE "jurisdiction" DROP COLUMN IF EXISTS "deleted_at";
ALTER TABLE "region" DROP COLUMN IF EXISTS "deleted_at";
ALTER TABLE "sub_jurisdiction" DROP COLUMN IF EXISTS "deleted_at";
DROP INDEX IF EXISTS "admin_audit_log_performed_at_idx";
DROP INDEX IF EXISTS "admin_audit_log_entity_type_idx";
DROP TABLE IF EXISTS "admin_audit_log";

-- Mark migrations as applied so prisma migrate deploy skips them.
-- Delete any existing record (whatever state) then re-insert as complete.
DELETE FROM _prisma_migrations
WHERE migration_name IN (
  '20260527140208',
  '20260528115459_add_third_party_push_log',
  '20260623000000_add_file_extension_to_artefact',
  '20260702000000_remove_soft_delete_and_admin_audit_log'
);
INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES
  (gen_random_uuid()::text, 'c91eb02ac37e3f570592c4cef2911420c0504f2eeaa9f15e1684405c742d58b0', NOW(), '20260623000000_add_file_extension_to_artefact', NULL, NULL, NOW(), 1),
  (gen_random_uuid()::text, '5624e9b7d7f75e5aecfdbd59b7e2d0323df5c67ab925ccbbf2f3a1fa374352b9', NOW(), '20260702000000_remove_soft_delete_and_admin_audit_log', NULL, NULL, NOW(), 1);

-- Mark any other stuck migrations as rolled back so they get retried
UPDATE _prisma_migrations
SET rolled_back_at = NOW()
WHERE finished_at IS NULL AND rolled_back_at IS NULL AND started_at IS NOT NULL;
SQL

echo "Running database migrations..."
../../node_modules/.bin/prisma migrate deploy --config=./prisma.config.ts

echo "Generating Prisma client for seed..."
../../node_modules/.bin/prisma generate --config=./prisma.config.ts

echo "Seeding reference data from list-type-data.ts..."
../../node_modules/.bin/tsx prisma/seed-deploy.ts

echo "Migrations completed successfully"
echo "Starting Prisma Studio on port 5556..."
../../node_modules/.bin/prisma studio --config=./prisma.config.ts --port 5556 --browser none &
STUDIO_PID=$!

wait $HEALTH_PID $STUDIO_PID
