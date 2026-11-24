# Code Review: Issue #1620

## Summary

This review covers the uncommitted work on `fix/1620-a11y-shared-components`: 180 entries in `git status --porcelain`, 17 of them untracked. The work covers all six audit items:

- **1.1 Session timeout.** A native `<dialog>` timeout warning, `POST /session-keep-alive`, and 15 min session timings. `/session-expiring` and `continue-path.ts` are deleted.
- **1.2 and 1.4 Phase banner.** Both `aria-label`s are removed and "(opens in a new tab)" now sits inside the link text.
- **1.3 Back to top.** A shared `appBackToTop` macro is used in 55 templates and points at `#main-content`. The JS moves focus there.
- **1.5 Filter panel.** A fork of the MoJ filter, `appFilter`, puts the hint first and Apply last. All 7 consumers are swapped.
- **1.6 Dashboard tiles.** Only the heading is a link, with a `::after` overlay, on 4 dashboards.

The engineering quality is high:

- The code is small, typed, and has no `any`.
- Leftover-reference gates pass. There are no `session-expiring`, `resolveContinuePath`, `isSessionExpiringPage`, `mojFilter`, `href="#top"` or `back-to-top-link` references left in `src`. The only remaining hits are stale build output in `libs/list-types/*/dist/`.
- The en/cy locale keys match exactly. I checked this with a deep key diff.
- Every changed workspace is above 80% statement coverage.

Three things stop this being ready to merge:

1. Behaviour changes that the plan itself marked as blocking were shipped without product or security sign-off (C1 and C2).
2. User-facing Welsh placeholder strings.
3. One gap in the "signed out, due to inactivity" message on the server-detected expiry path. It occurs in common real-world conditions.

Automated checks: `yarn test:coverage` passed for all 72 turbo tasks (exit 0, 3m31s). I did not run lint or the E2E suite as part of this review.

## 🚨 CRITICAL Issues

1. **Admin session lifetime cut from 4 h to 15 min, and typing no longer counts as activity, without sign-off.** `libs/auth/src/session/timeout-tracker.ts:7-8` and `apps/web/src/assets/js/session-timeout.ts:50-58`
   - **Problem:**
     - `ADMIN_SESSION_TIMEOUT_MS = SESSION_TIMEOUT_MS` (15 min). Until now admins (`SYSTEM_ADMIN`, `INTERNAL_ADMIN_CTSC`, `INTERNAL_ADMIN_LOCAL`) had 240 min and verified users had 60 min.
     - The client clock now restarts only when the page makes contact with the server. The `RESET_EVENTS` listeners are gone, which is clarification C2.
     - So an admin who spends more than 10 minutes filling in Manual upload or Non-strategic upload without a page load gets interrupted. If they do not see the dialog within 5 min, for example because they are in another tab copying data, they are signed out and lose their input.
     - The plan marked C1 as **blocking**, and tasks.md:6 records it as "NOT ANSWERED".
   - **Impact:** This is a breaking change to authentication behaviour for every user, made without the agreement of the PO and security. It affects admin productivity and can cause data loss. The literal AC wording may itself be wrong for admin journeys.
   - **Solution:** Get a written decision on C1 and C2 before merging. If the decision differs, change the two constants. The code already supports that in one line.

2. **AC 1.2 "Checked with Voice Control or Dragon" has no evidence.**
   - **Problem:** No manual voice-control check is recorded in tasks.md, the plan or the tests. Automated tests prove the accessible name is "Cymraeg" (`libs/web-core/src/views/components/phase-banner-content.njk.test.ts:31`, `e2e-tests/tests/page-structure.spec.ts`), but the AC explicitly asks for a check with assistive technology.
   - **Solution:** Run the check with Voice Control on Safari and Dragon on Edge on one English page and one Welsh page, then record the result in the PR.

## ⚠️ HIGH PRIORITY Issues

1. **AC 1.1 "You have been signed out, due to inactivity." is not shown when the server detects the expiry first (partial).** `libs/auth/src/middleware/session-timeout.ts:20-36`
   - **Impact:** The client signs out only 10 s before the server does (`CLIENT_CLOCK_MARGIN_MS`, `timeout-tracker.ts:12`). `/session-expired-logout` is itself routed through the global `sessionTimeoutMiddleware` (`apps/web/src/app.ts:193`). If the client is more than 10 s late, the middleware sends the user to `/session-logged-out` instead, which only says "You have been signed out". The client can be late in these cases:
     - **Background tab.** During the countdown, `check()` reschedules itself every second (`session-timeout.ts:77`). Chromium's intensive throttling aligns these chained timers to 1 minute once a tab has been hidden for more than 5 min. That is exactly the "switching between tasks" scenario in the audit.
     - **A sleeping laptop.**
     - **JavaScript turned off.**
     - **Continue pressed after the server session has ended.**
   - **Recommendation:**
     - Settle C3 and use `buildSessionExpiredRedirectUrl` on the server-expiry branch, so every inactivity sign-out shows the AC message.
     - Separately, schedule the final sign-out as a single, non-chained `setTimeout` to the deadline, not as part of the 1 s tick chain.

2. **User-facing Welsh placeholders.** `libs/web-core/src/locales/cy.ts:53,56-61,63`
   - **Impact:** 8 strings are still `[WELSH TRANSLATION REQUIRED: …]`: the filter hint and 7 of the 8 dialog strings, including the heading and countdown. Welsh users of the public "Find a court or tribunal", location search and SJP list pages would see bracketed English, and so would anyone who gets the timeout dialog in Welsh. This fails the Definition of Done item "Welsh content is updated". The E2E Welsh checks are also weaker because of it: `session-timeout.spec.ts:54` only asserts "Parhau", and `courts-tribunals-list.spec.ts` only asserts that the hint is visible.
   - **Recommendation:** Get approved translations (C5) before merging. Then assert the Welsh heading, countdown and hint text in the existing journeys.

3. **Definition of Done screen reader and axe checks not done.** tasks.md "Finish" and 1.1 manual items
   - **Impact:** These are not checked anywhere:
     - Whether NVDA, JAWS or VoiceOver announce the dialog and its countdown at the intended intervals.
     - Whether the tile focus ring is clearly visible.
     - Axe on a list-type page.

     Unit tests cover the announcement schedule, but not what assistive technology actually announces.
   - **Recommendation:** Complete the manual checks on the pages listed in the DoD before merging.

## 💡 SUGGESTIONS

1. **The dialog description is empty when focus moves into the dialog, and the countdown is read twice.** `session-timeout.ts:75-76`, `session-timeout-dialog.njk:11,21,23`
   - `openDialog()` (which calls `showModal()` and focuses the heading) runs before `updateCountdown()`. The `aria-describedby` target can therefore be empty when the screen reader picks up the focus.
   - The plan said the visible countdown would be `aria-hidden="true"`. In the implementation it is not hidden, and it is also the dialog's description. The visually hidden live region holds the same sentence, so browse mode reads it twice.
   - Also, text inserted into a live region the moment the region is revealed is often not announced.
   - **Approach:** Fill in the countdown text before calling `showModal()`. Use the static sentence as the description, and mark the ticking copy `aria-hidden`.

2. **Handle the dialog's `close` event.** `session-timeout.ts:91-100,164-168`
   - If the browser closes the dialog itself, for example when Chromium's close-watcher ignores `preventDefault` on a repeated Esc, `closeDialog()` returns early (`!dialog.open`) and focus is never restored.
   - **Approach:** Listen for `close` and restore focus from there.

3. **Translate the filter's "Remove this filter" text.** `libs/web-core/src/views/components/filter-panel.njk:45`
   - The visually hidden text is still hard-coded English. The plan's optional `removeFilterText` parameter was not implemented. Now that the template is forked, translating it costs very little.

4. **Add an integration test for keep-alive.**
   - `session-keep-alive/index.test.ts` mocks `res` only. Add a supertest-level test through `sessionTimeoutMiddleware` proving that `lastActivity` is renewed, because the route depends on the order middleware is mounted in.

5. **Add E2E coverage for CFT IDAM and B2C.**
   - The timeout journeys cover CRIME_IDAM and SSO only. Consider one CFT_IDAM or PI_AAD (B2C) run in the nightly suite, so the provider-logout `redirectType` paths are exercised.

6. **Comments.**
   - `timeout-tracker.ts:5-6` cites "#1620 AC", which will go out of date.
   - `ADMIN_SESSION_TIMEOUT_MS` is now just an alias. Either remove it or keep it deliberately, depending on the C1 decision.

7. **Use design tokens in `session-timeout.scss`.**
   - It hard-codes hex colours and pixel sizes. Prefer GOV.UK tokens and `govuk-media-query`, or match whatever convention the other app SCSS files use.

8. **Tile overlay trade-off.**
   - The `::after` overlay (`admin-pages.scss:30-37`, `verified-pages.scss:31-38`) stops users selecting the description text, and the description can never hold a link. This is accepted by MoJ, but record it in the PR.

9. **Split out the unrelated change.**
   - The `apps/web/src/app.test.ts` hook timeout bump to 30 s is harmless but unrelated to this ticket. Put it in its own commit.

10. **Rebuild or clean stale build output.**
    - `libs/list-types/{siac-poac-paac,ftt-rpt}-weekly-hearing-list/dist/views/*.njk` still contain `href="#top"`. They are build artefacts, not source, so a rebuild or clean will stop them confusing grep gates.

## ✅ Positive Feedback

- The server stays authoritative. Timings come from `res.locals` (`session-timeout.ts` middleware lines 39-42) and the client never decides on its own.
- The countdown is calculated from the deadline, so it does not drift. The keep-alive guard against double-clicks, the `storage` and `visibilitychange` sync, and the `showModal` fallback are all thought through and tested (`session-timeout.test.ts`, 20+ cases).
- The keep-alive route has the right security posture:
  - POST only.
  - `Cache-Control: no-store`.
  - It uses `res.end()`, so no audit row is written on every Continue press.
  - CSRF exposure is acceptable. There is no CSRF middleware anywhere in the app, but the session cookie is `sameSite: "lax"` (`redis-store.ts:21`), so cross-site POSTs carry no session, and the endpoint only extends a session.
- Esc means Continue. Focus is restored to the element the user was on, with `#main-content` as the fallback.
- The `focusTemporarily` helper copies the GOV.UK skip-link approach correctly, so there is no permanent `tabindex` on `<main>`.
- Consolidating back to top went well beyond the ticket's estimate of 10 pages: all 55 templates in 3 variants now use one macro, and the mismatched `aria-label` on the cookie-policy link was removed.
- The MoJ filter fork keeps every MoJ class. The `filter-toggle.ts` selector was tightened to `:scope > .govuk-button`, so buttons inside the options are never matched.
- The E2E changes follow CLAUDE.md: changes go into existing journeys, with keyboard checks, axe and Welsh inline, and `getByRole` selectors.

## Test Coverage Assessment

**Statement coverage** (from the `All files` row of each workspace's text table; this repo's output has no `Statements :` line):

| Workspace | % Stmts | Notes |
|---|---|---|
| `@hmcts/web` (apps/web) | 95.65 | `session-timeout.ts` 98.43, `back-to-top.ts` 100, `filter-toggle.ts` 97.61, `session-keep-alive` 100. Branch coverage is 81.82 |
| `@hmcts/auth` | 96.55 | |
| `@hmcts/web-core` | 93.03 | |
| `@hmcts/siac-poac-paac-weekly-hearing-list` | 100 | |
| `@hmcts/utiac-jr-daily-hearing-list` | 92.59 | |
| `e2e-tests` | n/a | Playwright only, no unit coverage |

No changed workspace is below 80%.

- **Unit and template tests:**
  - New `.njk.test.ts` files for the dialog, back to top, filter panel, phase banner and reference-data tiles.
  - 54 page template tests updated.
  - en/cy key parity is asserted for `filterPanel` and `sessionTimeout`.
- **E2E:**
  - New `session-timeout.spec.ts`, covering the citizen and system admin journeys with `page.clock`.
  - Back to top keyboard checks in courts-tribunals-list and manual-upload.
  - Forward-tab to Apply in courts-tribunals-list and audit-log-viewer.
  - Card "click description" checks.
  - Gaps: the E2E Welsh checks are weak because of the placeholders, and CFT IDAM and B2C have no timeout journey.
- **Accessibility:** axe runs inline in the changed journeys. The `region` rule is disabled for the dialog, which is reasonable for top-layer content. No manual screen reader or voice-control evidence exists.

## Acceptance Criteria Verification

### 1.1 Timeout warning
- [x] Dialog after 10 min of inactivity with a 5 min countdown. `timeout-tracker.ts:7,9,19-21` (idle = 15 − 5 min − 10 s); `session-timeout.ts:60-78`; E2E `session-timeout.spec.ts:30-38`. "Inactivity" here means no contact with the server (C2, see Critical 1).
- [x] Header and timer sentence wording. `libs/web-core/src/locales/en.ts:55-63`; `session-timeout-dialog.njk:20-21`; `session-timeout.ts:103,204-212`; E2E `session-timeout.spec.ts:10,38`.
- [x] Continue extends the session. `session-timeout.ts:115-136,160-162`; `session-keep-alive/index.ts:5-8`; middleware renewal at `session-timeout.ts` (middleware) line 39; E2E `session-timeout.spec.ts:53-56`.
- [~] "You have been signed out, due to inactivity." shown when the session ends. `session-expired/en.ts` header; E2E `session-timeout.spec.ts:64-65`. **Missing:** the server-detected expiry path still lands on `/session-logged-out` ("You have been signed out"). See High 1.
- [x] Accessible: focus moves in, announcements at intervals, closes with the keyboard. `session-timeout.ts:84-88` (showModal + heading focus), `214-221` (minute and 15 s buckets), `164-168` (Esc); unit tests `session-timeout.test.ts:211,274,354`; E2E `:37,44,93-97`. Screen reader check still outstanding (High 3).
- [x] Works for verified users and system admins. Role-agnostic dialog `base-template.njk` bodyEnd include; E2E `session-timeout.spec.ts:24` (CRIME_IDAM) and `:73` (SSO system admin).
- [x] Follows the MoJ timeout warning. Modal, heading, countdown, Continue, Esc (`session-timeout-dialog.njk:7-29`). The MoJ package ships no component (plan §0.1). Design sign-off and C7 (Sign out link) are still open.

### 1.2 Language toggle
- [x] `aria-label` removed, so the name is "Cymraeg". `phase-banner-content.njk:6`; `en.ts` `language`; `phase-banner-content.njk.test.ts:31`; `page-structure.spec.ts` (`name: "Cymraeg", exact: true`).
- [x] `lang="cy"` kept. `phase-banner-content.njk:6`; `page-structure.spec.ts` `toHaveAttribute("lang", "cy")`.
- [x] English toggle on Welsh pages fixed. The same element; `phase-banner-content.njk.test.ts:42`; `page-structure.spec.ts` (`name: "English"`, `lang="en"`).
- [ ] Checked with Voice Control or Dragon. **No evidence.** See Critical 2.

### 1.3 Back to top
- [x] Links point at `#main-content`. `libs/web-core/src/views/components/back-to-top.njk:3`; gate grep is clean in `src`.
- [x] Keyboard activation moves focus to main, and the next Tab reaches the first focusable element. `apps/web/src/assets/js/back-to-top.ts:4-35`; `back-to-top.test.ts:30-48`; `e2e-tests/utils/back-to-top-helpers.ts:5-23`, used in `courts-tribunals-list.spec.ts` (en and cy) and `admin/manual-upload.spec.ts`.
- [x] Fixed on every page, citizen and admin. 55 templates import `appBackToTop`; no `href="#top"`, `href="#"` or `back-to-top-link` left in `apps/web/src` or `libs/*/src`.

### 1.4 Feedback link
- [x] The link text says it opens in a new tab. `phase-banner-content.njk:4`; `en.ts:49`, `cy.ts` `newTab`; `phase-banner-content.njk.test.ts:59,77`.
- [x] The accessible name contains the visible text. `aria-label` removed (`phase-banner-content.njk:4`); E2E `page-structure.spec.ts` `name: "feedback (opens in a new tab)", exact: true`.
- [x] Fixed for both citizen and admin. One shared component; `phase-banner-content.njk.test.ts:85` (no toggle, as for admins).

### 1.5 Filter panel
- [x] "Apply filters" comes after the last option. `filter-panel.njk:59-65`; E2E `courts-tribunals-list.spec.ts` and `audit-log-viewer.spec.ts` (`:scope > button.govuk-button` is last).
- [x] The message is shown at the top of the filters. `filter-panel.njk:55-57`; `en.ts:52-54`; E2E `#filter-hint` text and accessible description. This follows the mock-up rather than the literal "on the top filter button" wording (C4 is unanswered).
- [x] Keyboard users apply filters without tabbing backwards. Forward-only Tab loops in `courts-tribunals-list.spec.ts` and `audit-log-viewer.spec.ts`.
- [x] Applied to every filter panel. All 7 consumers use `appFilter` (courts-tribunals-list, location-name-search, sjp-public-list, sjp-press-list, audit-log-list, find-users, jurisdiction-data-list); no `mojFilter` imports left.

### 1.6 Tiles
- [x] Only the card heading is a link. `account-home/index.njk`, `admin-dashboard/index.njk`, `system-admin-dashboard/index.njk`, `reference-data/index-tiles.njk` (`h2 > a`, description in `<p>`); the matching `.njk.test.ts` files.
- [x] The whole card is still clickable, with one focusable link per card. `admin-pages.scss:30-37`, `verified-pages.scss:31-38` (`::after` overlay); `e2e-tests/utils/card-helpers.ts` click on the description.
- [x] The focus style is still clearly visible. `admin-pages.scss:19-23`, `verified-pages.scss:25-29` (`:focus-within` 3px yellow outline) plus the `govuk-link` focus style. A manual check across browsers is still outstanding (High 3).
- [x] Fixed on both the verified and admin dashboards. 4 templates; E2E in `verified-user/account-home.spec.ts`, `admin/admin-dashboard.spec.ts` and `system-admin/system-admin-dashboard.spec.ts`.

**Tally:** 21 met, 1 partial, 1 unmet out of 23.

## Next Steps

- [ ] Get a PO and security decision on C1 (timeouts) and C2 (what counts as activity). Change the constants if the decision differs.
- [ ] Decide C3, and route server-detected inactivity expiry to `/session-expired`. Do not chain the final client sign-out timer.
- [ ] Replace all 8 `[WELSH TRANSLATION REQUIRED]` strings, then strengthen the Welsh E2E assertions.
- [ ] Do the Voice Control and Dragon check on the language toggle.
- [ ] Do the screen reader checks (dialog announcements, tile focus) and run axe on a list-type page.
- [ ] Optional: fill in the countdown before `showModal`, handle `close`, add a Welsh "Remove this filter", and add a keep-alive integration test.
- [ ] Run `yarn lint:fix` and the full `yarn test:e2e`, then request re-review.

## Overall Assessment

**NEEDS CHANGES.** The implementation is well built and well tested. The two critical issues are a missing sign-off and missing verification, not code defects. The high-priority Welsh and inactivity-message gaps are small fixes, but they need to be done before merging.
