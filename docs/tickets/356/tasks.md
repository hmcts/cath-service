# Implementation Tasks: CaTH Cron Trigger (#356)

## Implementation Tasks

- [ ] Create `apps/crons/src/clear-audit.ts` with named export `clearAudit` and default export, reading `AUDIT_RETENTION_DAYS` env var (default 90), deleting `notificationAuditLog` records older than the cutoff
- [ ] Create `apps/crons/src/clear-audit.test.ts` with unit tests covering: correct Prisma call, env var override, logging, error propagation
- [ ] Create `apps/crons/src/inactive-verification.ts` with named export `inactiveVerification` and default export, reading `INACTIVE_USER_DAYS` env var (default 90), querying users where `lastSignedInDate` is null or past cutoff
- [ ] Create `apps/crons/src/inactive-verification.test.ts` with unit tests covering: correct Prisma query, env var override, logging, error propagation
- [ ] Create `apps/crons/src/media-reporting.ts` with named export `mediaReporting` and default export, grouping `mediaApplication` records by status and logging counts
- [ ] Create `apps/crons/src/media-reporting.test.ts` with unit tests covering: correct Prisma groupBy call, output logging, error propagation
- [ ] Create `apps/crons/src/expired-artefacts.ts` with named export `expiredArtefacts` and default export, deleting `artefact` records where `displayTo < now()`
- [ ] Create `apps/crons/src/expired-artefacts.test.ts` with unit tests covering: correct Prisma deleteMany call, deleted count logging, error propagation
- [ ] Create `apps/crons/src/no-match-artefacts.ts` with named export `noMatchArtefacts` and default export, deleting `artefact` records where `noMatch = true`
- [ ] Create `apps/crons/src/no-match-artefacts.test.ts` with unit tests covering: correct Prisma deleteMany call, deleted count logging, error propagation
- [ ] Create `apps/crons/src/subscriptions.ts` with named export `subscriptions` and default export, counting and deleting subscription records where the related user does not exist
- [ ] Create `apps/crons/src/subscriptions.test.ts` with unit tests covering: orphan count query, deleteMany call, count logging, error propagation
- [ ] Create `apps/crons/src/refresh-views.ts` with named export `refreshViews` and default export, scaffolded with empty `VIEW_NAMES` array and `prisma.$executeRawUnsafe` pattern with TODO comment
- [ ] Create `apps/crons/src/refresh-views.test.ts` with unit tests covering: skip behaviour when `VIEW_NAMES` is empty, skip message logging, error propagation
- [ ] Create `apps/crons/helm/values-clear-audit.yaml` with `SCRIPT_NAME: clear-audit` and `schedule: "0 1 * * *"`
- [ ] Create `apps/crons/helm/values-inactive-verification.yaml` with `SCRIPT_NAME: inactive-verification` and `schedule: "1 8 * * *"`
- [ ] Create `apps/crons/helm/values-media-reporting.yaml` with `SCRIPT_NAME: media-reporting` and `schedule: "0 0 * * 1"`
- [ ] Create `apps/crons/helm/values-expired-artefacts.yaml` with `SCRIPT_NAME: expired-artefacts` and `schedule: "0 1 * * *"`
- [ ] Create `apps/crons/helm/values-no-match-artefacts.yaml` with `SCRIPT_NAME: no-match-artefacts` and `schedule: "0 1 * * *"`
- [ ] Create `apps/crons/helm/values-subscriptions.yaml` with `SCRIPT_NAME: subscriptions` and `schedule: "0 1 * * *"`
- [ ] Create `apps/crons/helm/values-refresh-views.yaml` with `SCRIPT_NAME: refresh-views` and `schedule: "0 2 * * *"`
- [ ] Run `yarn test` from the repo root and confirm all new test files pass
- [ ] Run `yarn lint:fix` from the repo root and confirm no Biome errors
