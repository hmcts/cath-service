# Tasks — #918: Cron job to remove 'deleted accounts' after 3 months

## Blockers to clear first
- [ ] Confirm #894 has merged, or agree with its author who creates the `deleted_account` model and migration (see plan §5.1)
- [ ] Get a Product decision on the purge-vs-MI-report conflict (plan §5.2) — recommendation is the aggregate-count table, option (b)
- [ ] Confirm the archive timestamp column name and that `@@index([deleted_at])` exists

## Schema
- [ ] If #894 has not created it: add `DeletedAccount` to `libs/postgres-prisma/prisma/schema/deleted-account.prisma`
- [ ] If the index is missing: add migration `apps/postgres/prisma/migrations/<timestamp>_add_deleted_account_deleted_at_index/migration.sql`
- [ ] Run `yarn db:generate`, then `yarn db:migrate:dev`

## Business logic
- [ ] Create `libs/account/src/deleted-account/retention.ts` with `purgeExpiredDeletedAccounts` and the UTC month-clamping cutoff helper
- [ ] Add the `./deleted-account/retention` export to `libs/account/package.json`
- [ ] Add the `@hmcts/account/deleted-account/retention` path to root `tsconfig.json`
- [ ] Write `libs/account/src/deleted-account/retention.test.ts` — cutoff defaults, override, month-end clamp, leap February, year boundary, TZ independence, zero-count, error propagation

## Cron script
- [ ] Create `apps/crons/src/remove-expired-deleted-accounts.ts` with a `default` export and retention-config validation that fails closed
- [ ] Add `@hmcts/account` and `@hmcts/postgres-prisma` to `apps/crons/package.json` dependencies
- [ ] Add the `../../libs/account` project reference to `apps/crons/tsconfig.json`
- [ ] Confirm no static top-level import of the retention lib is added to `apps/crons/src/index.ts` — the `DATABASE_URL` load order depends on the dynamic import (plan §2.4)
- [ ] Write `apps/crons/src/remove-expired-deleted-accounts.test.ts`
- [ ] Extend `apps/crons/src/index.test.ts` to dispatch the new `SCRIPT_NAME`

## Infrastructure
- [ ] Set `SCRIPT_NAME: 'remove-expired-deleted-accounts'`, `DELETED_ACCOUNT_RETENTION_MONTHS: '3'`, and `schedule: "0 2 * * *"` in `apps/crons/helm/values.yaml`
- [ ] Update the stg schedule in `helm/cath-service/values.template.yaml`; leave preview short-interval or suspended
- [ ] Retire `example.ts` and its test if option 1 in plan §2.5 is agreed
- [ ] Raise the flux HelmRelease schedule change with the infrastructure team (outside this repo — cannot merge in this PR)

## Verification
- [ ] `yarn lint:fix`, `yarn test`, and `yarn build` from the root
- [ ] Manual boundary check against a local DB: seed rows at cutoff −1s, exactly cutoff, and cutoff +1s; confirm only the newest survives; record the result in the PR
- [ ] Verify a built `cath-crons` image contains `libs/postgres-prisma/generated` and can reach Postgres
- [ ] Verify `DATABASE_URL` is populated in the pod, not silently defaulted to localhost
- [ ] Verify the rendered `CronJob` carries the expected `schedule`, `SCRIPT_NAME`, and `concurrencyPolicy: Forbid`
- [ ] Trigger a manual run on stg and confirm exit 0 with the expected log lines
