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

echo "Starting health proxy on port 5555..."
node health-server.mjs &
HEALTH_PID=$!

echo "Resolving any failed migrations..."
printf "UPDATE _prisma_migrations SET rolled_back_at = NOW() WHERE finished_at IS NULL AND rolled_back_at IS NULL AND started_at IS NOT NULL;" | \
  npx --ignore-scripts prisma db execute --stdin --config=./prisma.config.ts 2>/dev/null || true

echo "Clearing stale migration records for removed migrations..."
printf "DELETE FROM _prisma_migrations WHERE migration_name IN ('20260527140208', '20260528115459_add_third_party_push_log');" | \
  npx --ignore-scripts prisma db execute --stdin --config=./prisma.config.ts 2>/dev/null || true

echo "Running database migrations..."
npx --ignore-scripts prisma migrate deploy --config=./prisma.config.ts

echo "Running reference data scripts..."
for script in prisma/scripts/001_insert_missing_list_types.sql \
              prisma/scripts/002_update_list_type_provenances.sql \
              prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql \
              prisma/scripts/004_soft_delete_crime_daily_list.sql; do
  echo "  Applying $script..."
  npx --ignore-scripts prisma db execute --file "$script" --config=./prisma.config.ts
done

echo "Migrations completed successfully"
echo "Starting Prisma Studio on port 5556..."
npx --ignore-scripts prisma studio --config=./prisma.config.ts --port 5556 --browser none &
STUDIO_PID=$!

wait $HEALTH_PID $STUDIO_PID
