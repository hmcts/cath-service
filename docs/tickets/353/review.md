# Code Review: Issue #353

## Summary

This is a re-review after the CSV formula-injection fix. The rest of the implementation has not changed since the previous review. It adds a weekly `media-reporting` cron that works like this:
- It reads every `media_application` row, including PENDING (agreed parity with legacy PIP `findAll`).
- It builds a CSV with papaparse.
- It emails the CSV to the PI team through GOV.UK Notify `prepareUpload`, using template `c59c90a3-…`.
- Only after the email succeeds does it delete the reported APPROVED/REJECTED rows, by ID.

Business logic is in `libs/media-reporting` plus a new function in `@hmcts/notification`. `apps/crons/src/media-reporting.ts` is a thin default-export wrapper. Failures propagate to `apps/crons/src/index.ts`, which exits 1.

**The previous CRITICAL is fixed and verified.** `libs/media-reporting/src/media-application-report/report-csv.ts:8` defines `FORMULA_PREFIX = /^[=+\-@\t\r]/`, and `:30` passes it to `escapeFormulae`. I checked it against the installed papaparse 5.5.4 (`node_modules/papaparse/papaparse.js:379-382,460`):

| Input | `escapeFormulae: true` (old) | `FORMULA_PREFIX` (new) |
|---|---|---|
| `=HYPERLINK("http://example.com")\nfoo` | `"=HYPERLINK(""http://example.com"")\nfoo"` (not escaped) | `"'=HYPERLINK(""http://example.com"")\nfoo"` (escaped) |
| `=SUM(A1)`, `+1`, `-1`, `@cmd`, `\t=1`, `\r=1` | escaped | escaped |
| `safe`, `a=b`, `x\n=1` | unchanged | unchanged (no false positives) |

The regex has no `g` flag, so `RegExp.test` does not carry `lastIndex` state across cells.

**The new test is a real regression guard.** I copied `report-csv.ts`, `report-csv.test.ts` and `queries.ts` to a scratch directory, reverted the copy to `escapeFormulae: true`, and ran vitest. The multi-line case `report-csv.test.ts:70` failed (1 failed / 10 passed). With the fix, all 11 pass. The repo was not modified, and the scratch copy has been deleted.

Checks run:
- `npx biome check libs/media-reporting libs/notification/src apps/crons/src`: 21 files, no issues.
- `tsc --noEmit -p .` in `libs/media-reporting`, `libs/notification` and `apps/crons`: no errors.
- `yarn test:coverage` (repo root): 69 of 70 tasks passed. The only failure is `@hmcts/web#test` (unrelated; see Test Coverage Assessment).
- Per-workspace `--coverage` runs for the three changed workspaces.

No critical or high-priority issues remain. The suggestions below are carried over from the previous review, which is still valid because the code has not changed. One new doc-drift item was introduced by the fix.

## 🚨 CRITICAL Issues

None.

Previous CRITICAL #1 (CSV formula-injection bypass through multi-line values) is **resolved**. See the Summary for the evidence.

## ⚠️ HIGH PRIORITY Issues

None found.

## 💡 SUGGESTIONS

1. **Doc drift in plan.md / tasks.md** (now wider because of the fix)
   - **Formula escaping:** the docs still say `escapeFormulae: true`, which is the vulnerable setting the fix replaced.
     - `plan.md:57`
     - `plan.md:158`
     - `plan.md:244`
     - `tasks.md:16`
   - **Filtered query (stale since the agreed include-PENDING change):** the docs still describe `getProcessedApplications` with a status `where`, and the `ProcessedApplication` type.
     - `plan.md:106`
     - `plan.md:137-147`
     - `plan.md:154`
     - `plan.md:252`
     - `tasks.md:12`
   - **Log and error text:** the docs say "No processed applications found" and "Failed to retrieve processed applications".
     - `plan.md:164-165`
     - `plan.md:233`
     - `plan.md:236`
     - The code actually logs `No media applications found. Skipping report.` (`report-service.ts:14`) and throws `Failed to retrieve media applications` (`report-service.ts:10`).
   - **Benefit:** Ops searching logs for the documented messages won't find them. A future reader could also "restore" `escapeFormulae: true` from the plan.

2. **Duplicate success log, and the shared lib hard-codes the caller's prefix**
   - `libs/notification/src/media-application-report-email.ts:45` and `libs/media-reporting/src/media-application-report/report-service.ts:27` both log "report email sent". `@hmcts/notification` also embeds `[media-reporting]`.
   - **Approach:** Drop the log in the notification function. `applicationCount` is only used for that line, so it can then be removed from `MediaApplicationReportEmailData` (`media-application-report-email.ts:72-76`) (YAGNI).

3. **The test does not match how the real client fails in `prepareUpload`**
   - `notifications-node-client` 8.4.0 throws a plain string: `throw "File is larger than " + String(size_limit) + "MB."` (`node_modules/notifications-node-client/client/notification.js:184`).
   - `extractNotifyError` (`libs/notification/src/govuk-notify-service.ts:8-13`) reads `.message`, so for a string it would produce `GOV.UK Notify error: Unknown error`.
   - The 2MB guard at `media-application-report-email.ts:19` makes this path unreachable today. But `media-application-report-email.test.ts:155-164` mocks an `Error`, which implies a message that would never appear in practice.
   - **Approach:** Either mock a string throw and assert the real outcome, or handle `typeof error === "string"` in `extractNotifyError`.

4. **The 2MB ceiling can wedge the job permanently**
   - `media-application-report-email.ts:19-21` throws before deletion. If the CSV ever goes over 2MB, every later run fails the same way and nothing is ever deleted.
   - PENDING rows are re-reported every week, which adds to the size. This is unlikely at current volumes.
   - **Approach:** Note it in the runbook or plan as an alerting case (the job exits 1). No code change is needed now.

5. **`ithc` display name / vault (future note)**
   - `media-application-report-email.ts:7-12` has no `ithc` entry, so emails from that environment would say "ithc". The test at `media-application-report-email.test.ts:91` codifies this.
   - When `cath-ithc` is provisioned:
     - Add `ithc: "ITHC"` to the map.
     - Make sure the vault holds `govuk-notify-api-key` and `pip-team-email`.
   - The vault matters because `apps/crons/helm/values.yaml:23-26` mounts these secrets for every release of the shared crons chart.

6. **Outstanding manual verification**
   - These items are still open:
     - `tasks.md:47`: local smoke test.
     - `tasks.md:55-58`: Notify template check, recipient and key confirmation.
     - `tasks.md:65`: AAT manual trigger.
   - Nothing automated exercises the real Notify call, so these runs are the only end-to-end proof.

7. **Minor test hygiene**
   - `queries.test.ts:40` uses `as never` to bypass the Prisma return type. A typed fixture would catch drift if the `select` changes.
   - The new `it.each` case at `report-csv.test.ts:70` puts a raw `\n` in the test title. The reporter then shows it as `should escape formula value =HYPERLINK("http://example.com")` with `foo` on the next line. Giving each case a label (for example `[label, value]` tuples) would keep reporter output on one line.

## ✅ Positive Feedback

- **The security fix is precise.** The anchored regex is the minimal correct change, and the comment at `report-csv.ts:6-7` explains why the built-in `true` is not used. That is the kind of comment CLAUDE.md asks for.
- **The test is regression-proof.** The multi-line case was shown to fail without the fix. The `\t=1` case pins the tab/CR prefix behaviour.
- **Deletion is safe.** Rows are deleted only after a successful email (`report-service.ts:20-25`). They are deleted by reported ID (`report-service.ts:30,37`), which avoids deleting rows that changed status after the read. A count-mismatch warning covers concurrent removals (`:41-43`).
- **No PII in logs.** Only counts and error messages are logged. Row data never is.
- **Fail-fast configuration.** Env vars are read when the function is called and validated, and the recipient email format is checked (`media-application-report-email.ts:48-62`).
- **Conventions are followed.**
  - `.js` relative imports.
  - Module ordering: consts, then exports, then helpers in order of use, then interfaces.
  - Pinned new dependencies (`papaparse 5.5.4`, `@types/papaparse 5.5.2`).
  - Nothing is exported only for tests.
  - The `global.d.ts` typing for `prepareUpload` matches the real 8.4.0 client.
- **Tests are well structured.** They use AAA throughout, round-trip the CSV through real papaparse, and restore env vars after each test.

## Test Coverage Assessment

- **Unit tests:** Good. All passing:
  - `@hmcts/media-reporting`: 25 tests (2 new formula cases since the last review).
  - `@hmcts/notification`: 29 tests.
  - `@hmcts/crons`: 17 tests.

  The orchestration paths are all covered: empty list, happy path, pending-only, mixed, email failure, read failure, delete failure, count mismatch and default date.
- **E2E tests:** Not applicable. This is a backend cron with no UI, and `apps/crons` is not in the Playwright harness. End-to-end proof is the outstanding manual AAT run (`tasks.md:65`).
- **Accessibility tests:** Not applicable (no UI). GOV.UK Design System and WCAG 2.2 criteria do not apply.
- **Full `yarn test:coverage` run:** 69/70 tasks passed. `@hmcts/web#test` failed with 4 timeouts in 2 files:
  - `src/app.test.ts`: "should create an Express application", "should configure properties volume" and "should configure middleware in correct order" (hook timeout 10000ms).
  - `src/pages/(admin)/remove-list-search-results/index.test.ts`: "should redirect to search page if no session data" (test timeout 5000ms).

  These are unrelated: this branch does not touch `apps/web`, and the same tests timed out in the previous review. They were not fixed.

| Workspace | Statements | Status |
|---|---|---|
| `@hmcts/media-reporting` | 100% (37/37) | OK |
| `@hmcts/notification` | 96.72% (59/61) | OK. The 2 uncovered statements are in the pre-existing `govuk-notify-service.ts`. |
| `@hmcts/crons` | 83.33% (20/24) | OK. The uncovered lines are in the pre-existing `index.ts:33,41-43`. |

## Acceptance Criteria Verification

Criteria are quoted verbatim from the Description's "Acceptance Criteria" section.

- [x] 1. The system retrieves a list of media applications and checks if the list is not empty.
  - Code: `libs/media-reporting/src/media-application-report/report-service.ts:9-16` (retrieve, then return early if the list is empty) and `queries.ts:3-15`.
  - Tests: `report-service.test.ts:44-55` and `queries.test.ts:19-63`.
- [x] 2. If applications exist: A CSV report is generated with the application data. The report is sent via email to the specified team using the appropriate email template.
  - CSV: `report-service.ts:18` and `report-csv.ts:21-31`, with the formula-safe escaping at `report-csv.ts:8,30`.
  - Email: `report-service.ts:21` and `libs/notification/src/media-application-report-email.ts:25-39` (`prepareUpload` plus `sendEmail` with the template ID).
  - Config: template ID at `apps/crons/helm/values.yaml:15`; the recipient comes from `pip-team-email` at `values.yaml:25-26`.
  - Tests: `report-csv.test.ts` and `media-application-report-email.test.ts:57-84`.
- [x] 3. The system deletes all media applications with a status of APPROVED or REJECTED.
  - Code: `report-service.ts:30` filters APPROVED/REJECTED from the report. `report-service.ts:37-39` with `queries.ts:17-22` deletes them with `deleteMany` by ID.
  - Tests: `report-service.test.ts:57-108` and `queries.test.ts:65-88`.
  - Rows that become APPROVED/REJECTED between the read and the delete are removed on the next run, by design.
- [x] 4. A log entry is created confirming the deletion of approved and rejected applications.
  - Code: `report-service.ts:45` logs `Deleted N processed media applications.`, and `:41-43` warns on a count mismatch.
  - Tests: `report-service.test.ts:75` and `:166-167`.

Supplementary scenario from the spec comment: if the email fails, nothing is deleted and the job exits non-zero.
- Code: `report-service.ts:22-25` and `apps/crons/src/index.ts:41-43`.
- Test: `report-service.test.ts:125-135`.

Tally: 4 met / 0 partial / 0 unmet of 4.

## Next Steps

- [ ] Address critical issues (none; the previous CSV injection critical is confirmed fixed)
- [ ] Fix high priority items (none)
- [ ] Consider suggestions:
  - update the `escapeFormulae` and query/log references in plan.md and tasks.md
  - remove the duplicate log
  - make the string-throw test realistic
  - add a 2MB runbook note
  - add the ithc display name when the environment is provisioned
- [ ] Complete the manual prerequisites in `tasks.md:47`, `:55-58` and `:65`
- [ ] Re-run tests after fixes

## Overall Assessment

**APPROVED**

The one blocker from the previous review, the CSV formula-injection bypass, is fixed correctly. The fix is backed by a test that fails without it. All four acceptance criteria are met, and every changed workspace is above 80% statement coverage. Lint and typecheck are clean. The remaining items are suggestions (mainly doc drift that now includes the old `escapeFormulae: true` advice) and the manual deployment checks already tracked in tasks.md.
