# Tasks: #588 Add bespoke logic for publication subscription triggers

## Implementation Tasks

- [ ] Rebase on master once PR #1306 (now including the third-party pass, Courtel secrets and blob-storage file loading) has merged, and on #1215 if it merges first.
- [x] Clarifications Q3 (expiry semantics) decided 2026-11-11: by London date, as the ticket says (`displayTo < londonDay.start`).
- [x] Add `libs/publication/src/subscription-schedule/upload-decision.ts` with `getUploadSubscriptionDecision`, reusing `getLondonDay` and `SCHEDULED_SUBSCRIPTION_LIST_TYPE_NAMES`. Matching is by list type name only.
- [x] Add `upload-decision.test.ts` covering plan scenario 1: London midnight and BST boundaries, `displayTo` either side of `londonDay.start`, null dates, both scheduled names, the `_FUTURE` variant, and a case that is both scheduled and future.
- [x] In `processPublication` (`libs/publication/src/processing/service.ts`):
  - capture `decisionTime` first;
  - resolve `listTypeName` once, reusing the PDF or large-payload lookup, with a catch-and-log fallback;
  - gate the email block on `decision.notifyEmail` and the legacy Courtel block on `decision.pushThirdParty`; leave the #1215 OAuth push alone, it applies its own display window;
  - log the skip reason without PII.
- [x] Update `processing/service.test.ts` for plan scenarios 2 and 3: future-dated, expired, scheduled list type, flat-file name lookup, and lookup failure. Add the `listType.findUnique` mock to the existing tests where needed.
- [x] E2E fixtures:
  - Change `generatePublicationDates` in `e2e-tests/tests/api/subscription-notifications.spec.ts` so `displayFrom` is now. Keep the `contentDate` offset.
  - Replace the expired 2024 display dates in `e2e-tests/tests/api/blob-ingestion-notifications.spec.ts` with dynamic, displayable dates.
- [x] Add one `@nightly` E2E journey to `subscription-notifications.spec.ts` (plan scenario 4). Uploads that are displayable now are notified. Uploads with `displayFrom` tomorrow, and expired uploads, create no `notification_audit_log` rows once the PDF exists.
- [x] Run `yarn lint:fix`, `yarn test`, and the affected E2E specs from the repo root. (2026-11-12: lint and unit tests 16/16 tasks; `subscription-notifications.spec.ts` and `blob-ingestion-notifications.spec.ts` 9/9 passed locally, including @nightly. Run against http://localhost:8080 with `UseDevelopmentStorage=true` and Playwright's ARM64 Chromium as `PUPPETEER_EXECUTABLE_PATH` in the local .env.)
- [x] Write the release dependency into the PR description, and keep the PR in draft until hmcts/cnp-flux-config#48744 (the updated 1272 CronJobs) is deployed. Do not release #588 before then.
