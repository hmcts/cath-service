# Code Review: Issue #1592

## Summary

The change replaces the single (stub) "Re-submit subscription" button on the Blob Explorer JSON and flat-file pages with four link-buttons (Re-submit, Send to Courtel, Send to third party subscribers, Send subscription email). Each opens the existing confirmation page parameterised by `?action=`. On Confirm, a new orchestrator `resendPublication` in `@hmcts/publication` calls only the channel senders the action needs. The success page is also parameterised. The three channel senders now return a `"sent" | "no-recipients" | "failed"` outcome. Every confirm writes one explicit audit entry (`recordBlobExplorerResend`) and opts out of the generic middleware entry. The stub `sendPublicationNotifications` and the unused `resubmissionArtefactId` session key are deleted.

The implementation follows the plan closely and respects every decision recorded on 2026-11-24 (generic re-submit error, "sent if at least one delivery succeeded", PUT for third parties, `maxAttempts: 1` for Courtel, Welsh placeholders). The code is small, typed (no `any`) and well tested: 100% statement coverage on the changed page directories and 94–100% on the changed libs. The automatic publication path (`processPublication`) behaves as before.

Checks run in this review:
- Biome on the 42 changed files: clean.
- `tsc --noEmit` on the four changed libs: clean. apps/web was not typechecked separately. Its scoped tests pass.
- Scoped unit tests: legacy-third-party-fulfilment 67/67, third-party-subscription-fulfilment 115/115, publication 686/686, system-admin-pages 554/554, apps/web blob-explorer pages 126/126.

There are no critical issues. One acceptance criterion (Welsh) is only partly met, as the agreed placeholder approach expects. One small logic gap in the email outcome goes against Clarification 2. Overall: **NEEDS CHANGES**, and the changes are minor.

## 🚨 CRITICAL Issues

None. Every acceptance criterion is at least partly met. No security, accessibility or data-loss defect was found.

## ⚠️ HIGH PRIORITY Issues

1. **Acceptance criterion "Welsh" is only partly met**
   - **Where**: `apps/web/src/pages/(system-admin)/blob-explorer-confirm-resubmission/cy.ts:2-20`, `blob-explorer-resubmission-success/cy.ts:2-5`, `blob-explorer-json-file/cy.ts:4-7`, `blob-explorer-flat-file/cy.ts:4-7`
   - **What's missing**: the new strings are `[WELSH TRANSLATION REQUIRED: '...']` placeholders (Clarification 7, decided). The existing strings on these pages are still English in `cy.ts`: "Confirm", "Cancel", "There is a problem", every metadata label, the whole re-submit action copy, "What do you want to do next?" and "Blob explorer – Locations". The AC says "every button, heading, message and link is shown in Welsh". This is expected behaviour for now, not a code defect.
   - **Recommendation**: send the full list of strings (new and existing) to the Welsh Language Unit, and track it as a follow-up so the AC can close. Only `errorTitlePrefix: "Gwall:"` is translated today.

2. **Send subscription email reports success when no email was delivered**
   - **Where**: `libs/publication/src/resend/service.ts:118-121`
   - **Problem**: when `totalSubscriptions > 0` but `sent === 0 && failed === 0`, the result falls through to `"sent"`. This happens when every matched subscriber is `skipped`. `libs/notifications/src/notification/notification-service.ts:490-508` skips a subscriber who has no email address. The admin then sees the "Subscription email sent" panel although nobody was emailed. Clarification 2 (decided) says a channel is `sent` only if at least one delivery succeeded.
   - **Fix**: after the `no-recipients` check, return a non-sent outcome whenever `emailCounts.sent === 0`, for example:
     ```ts
     if (!result.totalSubscriptions) return { outcome: "no-recipients", emailCounts };
     if (emailCounts.sent === 0) return { outcome: emailCounts.failed > 0 ? "failed" : "no-recipients", emailCounts };
     ```
     Add a case to the `it.each` at `libs/publication/src/resend/service.test.ts:231-245` with `{ totalSubscriptions: 2, sent: 0, failed: 0, skipped: 2 }`.

## 💡 SUGGESTIONS

1. **Flat files to Courtel push an empty body but report success (open item 5, decision needed)**
   - `resendPublication` passes `jsonData: undefined` and no `flatFilePath` for flat files (`libs/publication/src/resend/service.ts:25, 76-92`). `sendThirdPartyPublications` then sends `body = null` (`libs/legacy-third-party-fulfilment/src/service.ts:80`). If Courtel returns 2xx, the admin sees "Publication sent to Courtel" for a flat file whose content was never sent. This is the known Clarification 5 and matches today's automatic behaviour, so it is not a new defect. Until it is resolved, consider returning `failed` for flat-file Courtel resends, or get an explicit decision recorded, so the success panel does not mislead.

2. **Validate `artefactId` as a UUID**
   - `parseParams` in `blob-explorer-confirm-resubmission/index.ts:63-70` accepts any non-empty string. `artefact.artefact_id` is `@db.Uuid` (`libs/postgres-prisma/prisma/schema/base.prisma:12`), so a malformed value makes Prisma throw. The page handles this safely (`sendSafely` → `failed`), but a "Failed" audit row is still written carrying the arbitrary input. A UUID check in `parseParams` that redirects to Locations would meet CLAUDE.md's "Input validation on all endpoints" and keep junk out of the audit log. The risk is low because the route is System Admin only.

3. **Courtel reports `failed` rather than `no-recipients` when the secrets are absent**
   - `libs/legacy-third-party-fulfilment/src/service.ts:69-76` checks the env secrets before the subscription lookup. Where `COURTEL_*` is not set (local and some e2e environments), a list type with no Courtel subscription shows "We could not send this publication to Courtel" instead of "Courtel is not subscribed…". Re-submit then always shows the generic error in those environments. Swapping the two checks would make the outcome accurate. The automatic path only logs, so it would not be affected.

4. **Export only what is used outside the module** (CLAUDE.md pitfall 13)
   - `buildResendConfirmUrl` is exported from `libs/system-admin-pages/src/index.ts:11`, but only `resend-urls.ts` itself and its test use it. Drop it from the barrel.

5. **E2E accessibility scans should use the WCAG tags** (`.claude/rules/e2e-testing.md`)
   - The new scans at `e2e-tests/tests/system-admin/blob-explorer.spec.ts:100` and `:134` use only `.disableRules(["region"])`. That matches the existing file, but the rule asks for `.withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa","wcag22aa"])`. Consider also scanning the Welsh confirmation page reached at `:108-110`, and checking the four buttons once on a flat-file publication. Flat files are covered only by unit and template tests today.

6. **Tighten a weakened assertion**
   - `libs/third-party-subscription-fulfilment/src/fulfilment/service.test.ts:594` changed to `.resolves.not.toBe("sent")`. For the publication delivery case the precise expectation is `"no-recipients"`. Split the `DELIVERIES` table, or assert the exact value per method.

7. **Audit detail when the orchestrator throws during re-submit**
   - `sendSafely` returns `{ status: "failed", channels: {} }` (`blob-explorer-confirm-resubmission/index.ts:103`). For `resubmit`, `buildDetails` then writes `Channels: ` with nothing after it (`libs/system-admin-pages/src/audit-log/blob-explorer-resend.ts:57-61`). Skip the `Channels:` part when it is empty, or add `Reason: Unexpected error`.

8. **Type guard instead of assertion**
   - `parseResendAction` (`libs/publication/src/resend/resend-action.ts:4`) uses `as ResendAction`. An `isResendAction(value): value is ResendAction` predicate would avoid the cast. This is cosmetic.

9. **The success page can be reached directly**
   - `/blob-explorer-resubmission-success?action=courtel` renders "Publication sent to Courtel" without any send. This already happened for re-submit before this change, and the risk is low behind `requireRole`. A one-time flash flag set by the POST would remove it, if that is wanted.

## ✅ Positive Feedback

- **The automatic path is unchanged.** `processPublication` (`libs/publication/src/processing/service.ts:885-925`) still fire-and-forgets both pushes with `.catch` and ignores the new return values. `ignoreDisplayWindow` defaults to `false`. `maxAttempts` defaults to `MAX_ATTEMPTS`. The only visible change is that `notificationsSent`/`notificationsFailed` now include list-type emails, and nothing reads those fields. The other callers (`manual-upload-summary`, `non-strategic-upload-summary`, `libs/api` blob ingestion, `ui-baseline` seed) are not affected.
- **Clean orchestration.** `resendPublication` loads the artefact once and the JSON once, never regenerates or deletes files, and uses `Promise.allSettled`, so one failing channel cannot block the others (`libs/publication/src/resend/service.ts:28`).
- **Fixes an audit bug.** `shouldLog: false` plus one explicit entry per attempt replaces the old misleading "Completed successfully" entry on failure. The normalised action name matches the middleware.
- **Security.** Every handler keeps `requireRole([SYSTEM_ADMIN])`, which a test checks (`index.test.ts:81-84`). Redirects and hrefs are built from fixed paths with `URLSearchParams`, so there is no open redirect and IDs are encoded. Nunjucks autoescapes. The logs carry only artefact IDs and error messages, never subscriber emails.
- **Accessibility and GOV.UK patterns.** `govuk-button-group` of `govukButton({ href })` links with unique, channel-specific labels. The error summary now sits above the `h1`. The title gets the `Error:`/`Gwall:` prefix. The table and Confirm stay on screen for a retry. `preventDoubleClick` is on Confirm. Cancel goes back to the right publication page. Everything works without JavaScript (GET links plus a POST form).
- **Tests.** The tests are thorough and follow AAA: per-action channel isolation, mapping of every outcome, Welsh, locale-key parity, audit on every POST outcome, template structure asserted with Cheerio, and a single extended E2E journey with inline axe.

## Test Coverage Assessment

- **Unit tests**: strong. The orchestrator covers each action, rejection isolation, not-found, all-no-recipients, the display window, the flat file, and a missing or unreadable JSON payload. Channel outcomes are covered in both fulfilment libs, including a single attempt when `maxAttempts` is 1. The confirmation controller covers every status for every action, `lng` preservation, thrown errors and the audit opt-out. One gap: the "all subscribers skipped" email case (HIGH 2).
- **E2E tests**: the existing journey is extended with button order, Welsh labels and an `lng=cy` hand-off, Courtel confirm then Cancel, and the email no-recipients path with error title and summary. The success path is deliberately not run end to end. The flat-file page is not exercised. Known undone: the no-recipients step assumes no list-type email subscriber exists for `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST` in the target environment. A lingering subscription would break the step and could send a real email.
- **Accessibility tests**: axe runs on the JSON page and on the confirmation page with the error shown. There is no `withTags` and no Welsh scan (Suggestion 5).
- **Statement coverage per changed workspace** (measured with `npx vitest run --coverage` in each workspace):
  - libs/legacy-third-party-fulfilment: 100% (131/131)
  - libs/third-party-subscription-fulfilment: 100% (188/188)
  - libs/publication: 97.16% (548/564)
  - libs/system-admin-pages: 94.06% (1364/1450)
  - apps/web: 100% (106/106). This covers only the four changed page directories (`blob-explorer-{confirm-resubmission,resubmission-success,json-file,flat-file}/*.ts`). It was run as `npx vitest run --coverage --coverage.include='**/blob-explorer-{confirm-resubmission,resubmission-success,json-file,flat-file}/*.ts' 'src/pages/(system-admin)/blob-explorer'` (12 files, 126 tests, all passing). The only uncovered branch is `index.ts:102` (the non-`Error` arm of the catch). Whole-workspace coverage was not measured because of the environmental failures in untouched files.

## Acceptance Criteria Verification

- [x] **Four actions shown on the publication page**: Given I am a System Admin viewing a publication in the Blob Explorer (JSON or flat file), When the page loads, Then I see four buttons, in this order: Re-submit subscription, Send to Courtel, Send to third party subscribers, Send subscription email. Evidence: `libs/publication/src/resend/resend-action.ts:1`, `libs/system-admin-pages/src/blob-explorer/resend-urls.ts:8-14`, `apps/web/src/pages/(system-admin)/blob-explorer-json-file/index.njk:24`, `blob-explorer-flat-file/index.njk:23`. Tests: `blob-explorer-json-file/index.njk.test.ts:130`, `blob-explorer-flat-file/index.njk.test.ts:139`, `e2e-tests/tests/system-admin/blob-explorer.spec.ts:95-97`.
- [x] **Re-submit subscription sends to every channel**: emails to every location, case and list-type subscriber, Courtel if subscribed, every third-party subscriber at a matching sensitivity, then the re-submission success page. Evidence: `libs/publication/src/resend/service.ts:13, 28`. List-type totals: `libs/publication/src/processing/service.ts:715-718`. Sensitivity matching: `libs/third-party-subscription-fulfilment/src/fulfilment/service.ts:104`. Redirect: `blob-explorer-confirm-resubmission/index.ts:51-52`. Tests: `libs/publication/src/resend/service.test.ts:122`, `blob-explorer-confirm-resubmission/index.test.ts:193`. (HIGH 2 is an edge case where the success page shows although every subscriber was skipped.)
- [x] **Send to Courtel sends only to Courtel**: no emails, nothing to third parties, Courtel success page. Evidence: `libs/publication/src/resend/service.ts:14, 76-92`. Test: `libs/publication/src/resend/service.test.ts:52-76`. (Suggestion 1: flat files send an empty body, known item 5.)
- [x] **Send to third party subscribers sends only to third-party subscribers**: matching sensitivity, no emails or Courtel, third-party success page. Evidence: `libs/publication/src/resend/service.ts:15, 94-102`. Test: `libs/publication/src/resend/service.test.ts:78-89`.
- [x] **Send subscription email sends only emails**: every email subscriber, nothing to Courtel or third parties, email success page. Evidence: `libs/publication/src/resend/service.ts:16, 104-122`. Test: `libs/publication/src/resend/service.test.ts:91-109`.
- [x] **Cancel on the confirmation page**: return to the publication page, nothing sent. Evidence: `blob-explorer-confirm-resubmission/index.ts:77`, `index.njk:113`, `libs/system-admin-pages/src/blob-explorer/resend-urls.ts:24-27`. Tests: `blob-explorer-confirm-resubmission/index.test.ts:120, 128, 169`, `e2e-tests/tests/system-admin/blob-explorer.spec.ts:113-120`.
- [x] **No recipients for the chosen action**: nothing sent, the action's error message on the confirmation page. Evidence: `blob-explorer-confirm-resubmission/index.ts:122-123`, `en.ts:25, 31, 37`, `libs/legacy-third-party-fulfilment/src/service.ts:73-76`, `libs/third-party-subscription-fulfilment/src/fulfilment/service.ts:42-44`. Tests: `blob-explorer-confirm-resubmission/index.test.ts:218-237`, `e2e-tests/tests/system-admin/blob-explorer.spec.ts:122-132`.
- [x] **Sending fails**: stay on the confirmation page with the action's error, and a failure in one channel during Re-submit does not stop the others. Evidence: `blob-explorer-confirm-resubmission/index.ts:55-56, 98-105`, `libs/publication/src/resend/service.ts:28-40`. Tests: `libs/publication/src/resend/service.test.ts:153-168`, `blob-explorer-confirm-resubmission/index.test.ts:239-252, 283`.
- [x] **Every action is audited**: which action, which artefact, by whom. Evidence: `libs/system-admin-pages/src/audit-log/blob-explorer-resend.ts:28-45`, `blob-explorer-confirm-resubmission/index.ts:46-49`, `libs/system-admin-pages/src/audit-log/logger.ts:7-10`. Tests: `blob-explorer-resend.test.ts:18`, `blob-explorer-confirm-resubmission/index.test.ts:310-325`.
- [x] **Only System Admins can use the actions**: users without the role cannot open the confirmation page. Evidence: `blob-explorer-confirm-resubmission/index.ts:128-129`, `blob-explorer-resubmission-success/index.ts:24`, `blob-explorer-json-file/index.ts:57`, `blob-explorer-flat-file/index.ts:55`. Test: `blob-explorer-confirm-resubmission/index.test.ts:81-84`.
- [~] **Welsh**: every button, heading, message and link shown in Welsh. **Done**: every string is in `cy.ts`, `lng=cy` is kept on the button hrefs, the Cancel link and the success redirect (`resend-urls.ts:29-31`), the title prefix is `Gwall:`, and Welsh rendering is tested (`blob-explorer-json-file/index.njk.test.ts:155`, `blob-explorer-confirm-resubmission/index.test.ts:254`, `e2e-tests/tests/system-admin/blob-explorer.spec.ts:104-110`). **Missing**: the new strings are `[WELSH TRANSLATION REQUIRED]` placeholders (agreed), and the existing strings on these pages are still English in `cy.ts` (HIGH 1).

## Next Steps

- [ ] Address critical issues (none)
- [ ] Fix high priority items: arrange the Welsh translations (HIGH 1); fix the all-skipped email outcome and add the test (HIGH 2)
- [ ] Consider suggestions, especially a decision on flat-file Courtel resends (Suggestion 1) and UUID validation (Suggestion 2)
- [ ] Known process items still open: rebase onto PR #1590 once it merges; post the kill-switch note on #1494; confirm there is no list-type email subscriber for the E2E list type in the test environment
- [ ] Re-run tests after fixes (scoped workspace runs plus `yarn lint:fix`), and typecheck apps/web

## Overall Assessment

**NEEDS CHANGES**

The implementation is sound, well structured and well tested, and it leaves the automatic publication path unchanged. It needs changes only because the Welsh AC is partly met (expected under the agreed placeholder approach) and because of one small outcome-mapping gap in the email channel that goes against Clarification 2. No workspace is below 80% statement coverage.

## Follow-up (2026-11-25)

- **HIGH 1 (Welsh)**: deferred. Translations will come from Ogechi later; placeholders stay until then. The Welsh AC remains partly met.
- **HIGH 2 (all-skipped email reported as sent)**: fixed. `libs/publication/src/resend/service.ts` now returns `no-recipients` when no email was sent and none failed, and `failed` when none sent and some failed. Two cases were added to the `it.each` in `service.test.ts` (all skipped; some skipped and the rest failed). The resend tests pass (36/36) and Biome is clean.
- **Suggestion 2 (UUID check)**: done. `blob-explorer-confirm-resubmission/index.ts` redirects to Locations when `artefactId` is not a UUID, using the same `UUID_REGEX` as the SJP pages. The test fixture now uses a real UUID and has a new "not a UUID" redirect case.
- **Suggestion 3 (Courtel check order)**: done. `sendThirdPartyPublications` looks up the subscription before the secrets, so an unsubscribed list type reports `no-recipients` even where `COURTEL_*` is not set. A test was added. The deletion push is unchanged.
- **Suggestion 5 (WCAG tags)**: done for the three new scans, which now use `withTags(WCAG_TAGS)`. A Welsh scan was added on the Welsh confirmation page. The two scans that were already there are unchanged. The flat-file E2E step was not added.
- **Suggestion 6 (weakened assertion)**: done. Each `DELIVERIES` row carries its exact expected outcome (`no-recipients` for the POST and PUT publication cases, `undefined` for deletion).
- **Suggestion 1 (flat-file Courtel)**: decided. No change here and no new bug, because open PR #1306 already loads Courtel files from blob storage. Once #1306 merges, #1592 must rebase and pass `loadFiles` from `resendPublication` (plan Clarification 5, tasks.md).
- Not done: Suggestions 4, 7, 8 and 9. The E2E changes are typechecked but not run.
