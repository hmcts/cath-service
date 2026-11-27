# Code Review: Issue #352

## Summary

This review covers the uncommitted #352 work on `feature/352-expired-artefacts-audit-cron`. That branch sits on #1306 (`feature/1272-cron-subscription-triggers`). The work adds two cron scripts, `clear-audit` and `expired-artefacts`, as thin wrappers in `apps/crons`. The logic lives in `@hmcts/publication` (`artefact-archive/`) and `@hmcts/system-admin-pages` (`deleteExpiredAuditLogs`). It also adds an `artefact_archive` Prisma model and migration, and pulls the blob clean-up out of `deleteArtefacts` into an awaited `deleteArtefactBlobs` helper.

The implementation follows the plan closely and is correct on the points most likely to go wrong:
- Keyset pagination cannot loop or skip.
- The archived and failed counts are right.
- The month clamp is right.
- `lt` and `lte` are used where the ticket asks for each.
- The admin `deleteArtefacts` flow keeps its behaviour.
- The migration matches the schema.
- The production subpath export resolves to `dist`.

Every acceptance criterion is met. I found no CRITICAL defects. The verdict is **NEEDS CHANGES** for one mechanical reason: `@hmcts/postgres-prisma` measures below 80% statement coverage. That is caused by the generated Prisma client and the package's existing tests, not by #352, which adds only a `.prisma` file there. There is also one design-risk item worth fixing before the first stg run: a systemic blob-store failure would orphan blobs for every expired artefact.

Checks run during review:
- `yarn workspace @hmcts/crons build`: OK. `dist/clear-audit.js` and `dist/expired-artefacts.js` are present.
- `tsc --noEmit` on publication and system-admin-pages: clean.
- `biome check` on all changed paths: clean.
- All workspace test suites pass.
- `node --conditions=production` resolves `@hmcts/system-admin-pages/audit-log/repository` to `libs/system-admin-pages/dist/audit-log/repository.js`, and the built file contains `deleteExpiredAuditLogs`.
- AC7 grep for `legacy-third-party-fulfilment` in `libs/publication/src/artefact-archive` and `apps/crons/src/expired-artefacts.ts` finds nothing.

## 🚨 CRITICAL Issues

None found.

## ⚠️ HIGH PRIORITY Issues

1. **`@hmcts/postgres-prisma` statement coverage is below 80%** (`libs/postgres-prisma`)
   - **Measured:** 16.9% raw, because v8 instruments the generated client in `generated/prisma/**`. Excluding `generated/**` it is 77.8% (7/9 statements, `src/index.ts`).
   - **Impact:** The review rules require this to be flagged. #352 does not cause it: the only change in this workspace is the new `prisma/schema/artefact-archive.prisma`, which contains no executable TS. The shortfall comes from the existing `src/index.test.ts`, which re-implements the DATABASE_URL logic instead of exercising it.
   - **Recommendation:** Add `coverage.exclude: ["generated/**"]` for this package so the number reflects hand-written code. Either raise `src/index.ts` coverage in a small follow-up or record an explicit waiver. Neither needs to block the #352 logic.

2. **A systemic blob failure archives and deletes every expired artefact's DB rows and orphans all of their blobs** (`libs/publication/src/artefact-archive/service.ts:42-58`, `:18-27`)
   - **Problem:** The DB transaction commits first (as the ticket asks), and the loop never stops on blob errors. Some failures hit every artefact, not just one: storage outage, rotated or expired connection string, missing `AZURE_STORAGE_*`, RBAC change. In that case the run walks the whole backlog, deletes every artefact row, and records thousands of `stage: "blob"` failures. Those blobs are never retried, because the artefact row is gone. tasks.md §8 confirms this happens ("Force a failure (e.g. invalid storage connection string) and confirm the run continues").
   - **Impact:** On the first stg/prod run (Clarification 1, unknown backlog), a storage misconfiguration would orphan the entire backlog's blobs in one night. Only the `artefact_archive` rows (`artefact_id`) let you find them again, and those are purged after 3 months.
   - **Recommendation:** The ticket accepts orphaning for a single artefact but did not consider this mass case. Add a cheap circuit breaker. For example, abort the run if the first N (say 5) consecutive artefacts all fail at the blob stage, or do a pre-flight `deleteBlob` of a non-existent name (a 404 counts as success) before the loop. Either way, a broken storage config fails fast after a handful of artefacts instead of the whole backlog.

## 💡 SUGGESTIONS

1. **Residual risk in the local Key Vault guard** (`apps/crons/src/index.ts:10`, `:40-47`)
   - The guard is correct and safe in production. `getPropertiesVolumeSecrets` skips the Key Vault path entirely when `NODE_ENV === "production"` (`properties.js:31`). The crons image (`Dockerfile`, crons stage) and `apps/crons/helm/values.yaml` both set `NODE_ENV=production`, so on-cluster the omit list stays exactly `["DATABASE_URL"]`, which is unchanged and asserted in `index.test.ts:61-66`. Off-cluster, Key Vault config keys are the helm `alias` names (`azure-vault.js:49`), so omitting by env-var name works as intended.
   - The gap is that it only protects variables that are already set. A developer who runs `SCRIPT_NAME=expired-artefacts yarn workspace @hmcts/crons dev` without `AZURE_STORAGE_CONNECTION_STRING` in their shell gets the AAT storage connection string injected. Blob deletes then hit the shared AAT account, but only for blob names matching local artefact IDs, which are random UUIDs unless the local DB was restored from a shared dump.
   - Consider always adding the `AZURE_STORAGE_*` and `COURTEL_*` aliases to `omit` off-cluster, so local runs must opt in to real storage explicitly.

2. **Misleading log prefix in a shared helper** (`apps/crons/src/close-connections.ts:4-6`, `:12`, from #1306)
   - `closeConnections` logs with `[SubscriptionSchedule]`, and its comment talks about emails. Both new jobs now use it, so a close failure in `clear-audit` would be logged under the wrong job. Coordinate with #1306: use a neutral prefix or pass one in.

3. **Each failure is logged twice** (`libs/publication/src/artefact-archive/service.ts:62` and `apps/crons/src/expired-artefacts.ts:10-12`)
   - The service logs a structured line and the script logs a formatted line for the same failure. During a large failure this doubles the noise in App Insights. Keep one of them; the script line alone is enough.

4. **Summary is lost if a page read fails mid-run** (`service.ts:16`)
   - If `findExpiredArtefacts` throws on page 2 or later, the rejection propagates. The committed archive count and the earlier failures are never logged, so the AC4 log line is missing for work that did happen. Consider catching around the loop and returning or logging the partial summary before rethrowing.

5. **Possible PK collision on `artefact_archive`** (`artefact-archive/queries.ts:32`, `migration.sql:19`). Unverified, low probability.
   - `createArtefact` accepts a caller-supplied `artefactId` (`repository/queries.ts:72-75`). If an upstream ever reuses an ID within the 3-month archive retention, the `create` fails with P2002 every night. The job would then exit non-zero permanently for that artefact. I did not confirm that any ingestion path reuses IDs; with UUIDs generated per upload this is very unlikely. If you want to rule it out, use `upsert` or delete any existing archive row for that ID inside the same transaction.

6. **`ExpiredArtefact` duplicates the Prisma payload type** (`artefact-archive/queries.ts:61-76`)
   - Deriving it with `Prisma.ArtefactGetPayload<{ select: typeof EXPIRED_ARTEFACT_SELECT }>` keeps the interface and the `select` in step automatically. Also add an explicit return type to `toArchiveRow` (`:42`), e.g. `Prisma.ArtefactArchiveCreateInput`, so a missing column fails at compile time.

7. **`as any` in a new test** (`libs/publication/src/repository/queries.test.ts:814`)
   - Use `as never`, as the new `artefact-archive/queries.test.ts` does, to stay consistent with the no-`any` rule.

8. **Spy not restored** (`libs/publication/src/artefact-archive/service.test.ts:45`)
   - `vi.spyOn(console, "error")` is created in `beforeEach` and never restored. It is harmless today, but add `afterEach(() => vi.restoreAllMocks())`.

9. **Throughput on a large first-run backlog** (`service.ts:15-30`, `apps/crons/helm/values.yaml` `activeDeadlineSeconds: 3600`)
   - Processing is sequential, with one transaction plus 4 blob round-trips per artefact. `deleteBlob` also builds a new `BlobServiceClient` on every call (`libs/azure-blob/src/blob-client.ts:12-15`, existing behaviour). There is no index on `artefact.display_to`, so each page uses a PK-ordered scan with a filter. This is fine for steady-state volume. For the first run, take the stg count (tasks §9) before enabling the schedule, as the plan says. If it is large, trigger the job manually once rather than letting it time out over several nights.

## ✅ Positive Feedback

- **Keyset pagination is correct.**
  - The cursor is the last `artefactId` of the page (`service.ts:29`), and the query orders by `artefactId asc` (`queries.ts:9`). Rows that failed stay behind the cursor, so the loop always ends.
  - Archived rows are gone, so nothing is skipped.
  - An exactly-full last page triggers one extra empty query, which is tested at `service.test.ts:70-80`.
- **Counting is correct.** `failure?.stage !== "database"` (`service.ts:24`) counts both successes and blob-stage failures as archived, which matches the DB state. Failures go into `failed[]` whatever the stage.
- **The month clamp is right**, including year rollover (`Date.UTC(y, m - 3, 1)`) and leap years. It is tested for 15 Aug, 31 May (leap and non-leap), 31 Mar to 31 Dec, and keeping the time of day (`service.test.ts:187-203`).
- **The comparisons match the ACs:**
  - `displayTo: { lt: now }` excludes NULL in SQL (AC5).
  - Audit deletion uses `lt` on a fixed 90 × 24h window ("older than").
  - Archive purge uses `lte` ("3 months old or older").
- **Atomic DB step.** `$transaction([create, delete])` (`queries.ts:31-34`) means a concurrent admin delete (P2025) rolls back the archive row too.
- **`deleteArtefacts` behaves as before.**
  - It is still fire-and-forget and still deletes the DB rows (`repository/queries.ts:167-186`).
  - It deletes the same 4 blobs.
  - 404s stay silent inside `deleteBlob`.
  - The one change is that a non-404 failure on the legacy blob name is now logged instead of swallowed, which is an improvement.
  - `deleteDerivedFiles` is still used by `createArtefact` (`:69`).
- **`deleteArtefactBlobs` uses `Promise.allSettled`.** All four deletes are attempted and every failure is listed, which is tested at `queries.test.ts` in "should attempt all four deletes and reject listing every failed blob".
- **The list type is stored by name** (`list_type_name`). No `listTypeId` is written, and a test asserts this (`artefact-archive/queries.test.ts:129-138`).
- **The migration SQL matches the schema exactly:** UUID PK, `VARCHAR(50)` and `VARCHAR(1000)`, `DATE`, `TIMESTAMP(3)`, `DEFAULT CURRENT_TIMESTAMP`, and the `archived_date` index. It follows `20260925110634_add_user_archive`. The Prisma client is regenerated (`artefactArchive` is present in `generated/prisma/index.d.ts`).
- **Connection handling.** Both scripts call `closeConnections()` in `finally`. Errors propagate to `index.ts`, which flushes App Insights and calls `process.exit(1)`.
- **Dependency choice.** The narrow subpath export means crons loads only `repository.ts` (which imports only `@hmcts/postgres-prisma`), not the admin page graph.
- **Code standards.** No business logic in `apps/`, constants are at the top, interfaces at the bottom, and relative imports use `.js`. The comments explain *why*. `SCRIPT_NAME` in helm stays `example`, which correctly avoids archiving preview data every 5 minutes.

## Test Coverage Assessment

| Workspace | Statements | Notes |
|---|---|---|
| `@hmcts/crons` | **92.72%** | `clear-audit.ts` and `expired-artefacts.ts` are at 100%. The 4 uncovered statements are all in `index.ts` (lines 33, 50-52, the bootstrap guard; existing code). |
| `@hmcts/publication` | **97.56%** | `artefact-archive/queries.ts` and `service.ts` are at 100% (not listed by the text reporter). `repository/queries.ts` is at 98.33%; its one uncovered line (384) is existing code. |
| `@hmcts/system-admin-pages` | **93.45%** | `audit-log/repository.ts` is at 100% statements. The uncovered branches at lines 61-68 are existing code. |
| `@hmcts/postgres-prisma` | **100%** after the fix (was 16.9%) | Only a `.prisma` file changed. The shortfall is existing behaviour and an artefact of the tooling. See HIGH #1. |

- **Unit:** Good. Tests follow AAA and use injected `now` instead of fake timers. Failure paths are covered at each stage: DB, blob, non-Error rejection, read failure, purge failure, archive failure skipping the purge. Call order (transaction before blobs) and the exact `where`, `select` and `orderBy` are asserted.
- **E2E:** Not applicable. There is no UI journey, as the plan says.
- **Accessibility:** Not applicable. There is no UI.

## Acceptance Criteria Verification

- [x] **AC1:** The system deletes all audit logs older than 90 days and logs a confirmation message, including the number of rows deleted. `libs/system-admin-pages/src/audit-log/repository.ts:4,121-124` (`timestamp: { lt: now − 90d }`); log at `apps/crons/src/clear-audit.ts:7`; tests at `repository.test.ts` (`deleteExpiredAuditLogs`) and `clear-audit.test.ts:22-33`.
- [x] **AC2:** The system identifies artefacts with a `display_to` earlier than the current time and archives them. `libs/publication/src/artefact-archive/queries.ts:6` (`displayTo: { lt: now }`); `service.ts:9-33`.
- [x] **AC3:** The archiving process includes deleting the artefact's data from the blob store (the payload in the `artefact` container, and any generated `<artefactId>.pdf` / `<artefactId>.xlsx` in the `publications` container), saving the artefact's metadata in the archive table, and removing the artefact from the `artefact` table. Blobs: `libs/publication/src/repository/queries.ts:188-206` (4 targets, including the legacy name). Archive row and delete: `artefact-archive/queries.ts:30-35`. Schema: `libs/postgres-prisma/prisma/schema/artefact-archive.prisma`. Migration: `apps/postgres/prisma/migrations/20261119143551_add_artefact_archive/migration.sql`.
- [x] **AC4:** The system logs the number of artefacts archived and the date used for the search. `apps/crons/src/expired-artefacts.ts:9`; `now` is fixed once and returned as `searchDate` (`service.ts:9,32`).
- [x] **AC5:** Artefacts with a null `display_to` are never archived. `artefact-archive/queries.ts:6`: `lt` never matches NULL, and the exact `where` is asserted in `queries.test.ts:57-58`.
- [x] **AC6:** If archiving one artefact fails, the run logs the error and continues with the rest, then the job exits non-zero. Per-artefact try/catch at `service.ts:42-64`; logged at `:62` and `expired-artefacts.ts:10-12`; thrown at `expired-artefacts.ts:18-20`; `process.exit(1)` at `apps/crons/src/index.ts:49-53`.
- [x] **AC7:** Archiving expired artefacts does not send a deletion notification to legacy third parties (e.g. Courtel). The grep for `legacy-third-party-fulfilment` / `sendThirdPartyDeletion` in `libs/publication/src/artefact-archive/` and `apps/crons/src/expired-artefacts.ts` finds nothing. `service.ts:1-2` imports only `../repository/queries.js` and `./queries.js`.
- [x] **AC8:** The `expired-artefacts` run also deletes `artefact_archive` rows whose `archived_date` is 3 months old or older, and logs the number of rows deleted. `service.ts:35-39`; `artefact-archive/queries.ts:37-40` (`lte`); called and logged at `expired-artefacts.ts:15-16`.
- [x] **Decision: third-party deletion push** is not sent, and the job does not need the Courtel secrets. Same evidence as AC7. Nothing in the `expired-artefacts` path reads `COURTEL_*`.
- [x] **Decision: archive retention** is 3 months on `archived_date`, purged inside `expired-artefacts`, using UTC calendar months clamped to the last valid day, with `lte`. `service.ts:5,36,67-84`; `queries.ts:38`; tests at `service.test.ts:187-203`.
- [x] **Decision: audit logging.** The jobs write no `audit_log` rows; run history goes to stdout and the CronJob status. `clear-audit.ts` and `expired-artefacts.ts` only call `console.*`. The only audit-log write path is `deleteMany`, and there is no `auditLog.create` in the new code.

Out-of-repo deployment (tasks §9: cnp-flux-config HelmReleases, stg backlog count, manual trigger) is intentionally still open. That is expected and not a defect.

## Next Steps

- [x] Exclude `generated/**` from `@hmcts/postgres-prisma` coverage and raise `src/index.ts` coverage, or record a waiver (HIGH #1). **Resolved:** `vitest.config.ts` now excludes `**/generated/**`, and `libs/postgres-prisma/src/index.test.ts` tests the real module (8 tests). Statements 100% (9/9), branches 100%.
- [ ] Add a blob-stage circuit breaker or a pre-flight storage check before the first stg run (HIGH #2)
- [ ] Optional: always omit `AZURE_STORAGE_*` off-cluster in `localEnvOverrides` (Suggestion 1)
- [ ] Optional: neutral log prefix in `close-connections.ts`, agreed with #1306 (Suggestion 2)
- [ ] Optional: drop the duplicate failure log, and log the partial summary if a page read fails (Suggestions 3-4)
- [ ] Optional: type tidy-ups (`ExpiredArtefact` derived from Prisma, `toArchiveRow` return type, `as any` → `as never`) (Suggestions 6-7)
- [ ] Get the stg count of `artefact WHERE display_to < now()` before enabling the flux HelmReleases (tasks §9)
- [ ] Re-run `yarn test`, `yarn lint` and `yarn workspace @hmcts/crons build` after any changes

## Overall Assessment

**NEEDS CHANGES**

The #352 code is correct, well tested (92-100% on every new file) and meets all 11 criteria (8 ACs and 3 Decisions). The verdict comes from the coverage rule: `@hmcts/postgres-prisma` is below 80%. That is existing behaviour and an artefact of the tooling, not something #352 introduced. The mass-orphaning risk is the one substantive change I would make before the job runs against a real backlog.


## Follow-up (after review)

- HIGH #1 (postgres-prisma coverage): **fixed.** See Next Steps.
- HIGH #2 (mass blob orphaning on a systemic storage failure): **deliberately left as is**, by decision of the ticket owner.
