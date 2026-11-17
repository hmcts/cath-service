# @hmcts/postgres

Migration and seed runner for the CaTH database. It owns the Prisma migrations; the schema itself lives in `libs/postgres-prisma/prisma/schema/` (one `.prisma` file per domain — see the root `CLAUDE.md`).

## Layout

| Path | Purpose |
|------|---------|
| `prisma.config.ts` | Points Prisma at the shared schema directory and at `prisma/migrations`. Builds `DATABASE_URL` from `POSTGRES_*` vars when they are set (deployed environments), otherwise falls back to the local docker-compose database. |
| `prisma/migrations/` | Prisma migrations, applied to every environment. |
| `prisma/generate-seed-sql.ts` | Emits idempotent `INSERT ... ON CONFLICT` SQL for reference data (locations, list types) from `location-data.ts` and `list-type-data.ts`. Used on deploy. |
| `prisma/seed.ts` | Local seed via Prisma upserts (`yarn db:seed`). |
| `start.sh` | Container entrypoint: loads Key Vault secrets, starts the health server, applies migrations, runs the generated seed SQL, then serves Prisma Studio. |
| `health-server.mjs` | Answers `/health/liveness` and `/health/readiness` and proxies everything else to Prisma Studio. |

## Local commands

Run from the repo root:

```bash
yarn db:migrate:dev   # Apply migrations, creating a new one if the schema changed
yarn db:migrate       # Apply existing migrations only
yarn db:seed          # Seed reference data
yarn db:generate      # Regenerate the Prisma client
yarn db:studio        # Open Prisma Studio
yarn db:drop          # Drop all tables and reset the database
```

To point at a different database, export `DATABASE_URL` before running these. Prisma does not read a `.env` file when a `prisma.config.ts` is present.

## Deployment

The postgres pod runs as a single replica (`autoscaling.enabled: false` in `helm/values.yaml`) so that migrations and seeding never run concurrently. The web app does not seed.
