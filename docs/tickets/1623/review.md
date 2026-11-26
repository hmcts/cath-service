# Code Review: Issue #1623

## Summary

This review covers the uncommitted changes on `feat/1623-a11y-package-4-admin` compared with `master`: 131 tracked files changed, 9 untracked test files added, and `location-jurisdiction-update/index-accordions.njk` deleted by decision. All 15 audit items (4.1–4.15) have been implemented, along with the out-of-plan changes listed in the brief. I read the code rather than relying on the plan. The decisions in plan section 6 are user-approved and are not reported as defects. These include English text in `cy.ts`, keep-file behaviour on non-strategic upload, the no-JS links in 4.10, the visible "Actions" header in 4.12, and audit-log-detail staying a table.

Overall the implementation is careful and well tested. The pending-file lifecycle handles store, reuse, replace, remove, expiry and success cleanup correctly. Escaping is correct wherever user data is put into `html:` strings. The sort whitelist removes a 500 error.

I found **no critical code defects**. I found **two real code defects** at high priority:
1. A non-transitive comparator in the shared `sortable-table.ts`. This can regress public list-type pages.
2. The file input error message is not programmatically linked to the input.

Every remaining open item is **verification pending**, not a code defect:
- manual assistive-technology checks have not been done
- the E2E specs are written but have not been run, because SSO is blocked by AADSTS50011
- the 4.13 PR inventory does not exist yet, because there is no PR

Labels used below:
- **(code defect)**: the source code needs to change.
- **(verification pending)**: the code is believed correct, but the AC needs a manual or E2E check, or a PR artefact.

---

## 🚨 CRITICAL Issues

No critical code defects were found. Every item below is an acceptance criterion marked `- [ ]` because there is no evidence yet. The rules require each one to be listed here. **All eight are verification-pending process items, not code defects.**

1. **4.1 – "Checked with JAWS: each checkbox announces its own label"** (verification pending)
   - **Problem**: There is no JAWS evidence. The structural proof is in place: `apps/web/src/pages/(system-admin)/location-jurisdiction-update/index-dropdowns.njk.test.ts:82` checks that every `label[for]` resolves to exactly one input.
   - **Impact**: This is the Critical-priority audit finding. Sign-off needs real AT confirmation.
   - **Solution**: Do a JAWS + Edge pass on `/location-jurisdiction-update` and record the result in the PR.

2. **4.3 – "Checked with a screen reader's heading list"** (verification pending)
   - **Problem**: There is no screen reader evidence. The proxy test is `apps/web/src/pages/(admin)/manual-upload/index.njk.test.ts:384` (no skipped heading levels).
   - **Solution**: Check the heading list on Manual upload and Non-strategic upload with NVDA or JAWS.

3. **4.5 – "Checked with JAWS (one label read out) and Dragon (field can be selected by its label)"** (verification pending)
   - **Problem**: There is no AT evidence. The proxy tests are `apps/web/src/assets/js/search-autocomplete.test.ts:84`, `:97` and `:109`.
   - **Solution**: Run JAWS and Dragon on Manual upload and on the public "Search by court or tribunal name" page.

4. **4.7 – "Checked with a screen reader: the question is announced once"** (verification pending)
   - **Problem**: There is no AT evidence. The proxy test is `apps/web/src/pages/(system-admin)/jurisdiction-data/index.njk.test.ts:38`.
   - **Solution**: Do a screen reader pass on `jurisdiction-data`, `region-data` and `reference-data`.

5. **4.9 – "Checked with Dragon: saying 'click View' activates the link"** (verification pending)
   - **Problem**: There is no Dragon evidence. The proxy test is `apps/web/src/pages/(admin)/media-applications/[id]/index.njk.test.ts:75`.
   - **Solution**: Test with Dragon on Applicant's details. This matters because the accessible name puts hidden text between the visible words (see Suggestion 8).

6. **4.12 – "Checked with a screen reader: the column header is read out with each cell"** (verification pending)
   - **Solution**: Navigate the Audit log viewer table by cell with a screen reader.

7. **4.13 – "An inventory of the tables that were fixed is listed in the PR"** (verification pending, process)
   - **Problem**: There is no PR yet. `tasks.md` leaves this unchecked.
   - **Solution**: Copy the plan section 2 inventory (rows 1–18) into the PR description when the PR is raised. I confirmed with a grep that every `<table>` / `govukTable(` in `(admin)`, `(system-admin)` and `libs/system-admin-pages` now has a caption. Note that `view-list-types` is dead code (see Suggestion 6).

8. **4.15 – "Checked with a screen magnifier or at high zoom: both buttons can be seen together"** (verification pending)
   - **Solution**: Check with ZoomText, or at 400% browser zoom, on Applicant's details.

---

## ⚠️ HIGH PRIORITY Issues

### Real code defects

1. **`compareValues` is non-transitive for columns that mix numbers and text** (code defect). File: `apps/web/src/assets/js/sortable-table.ts:83-90`
   - **Problem**:
     - The comparator compares numerically only when *both* cells are numeric. Otherwise it falls back to `localeCompare`.
     - In a mixed column (for example `"9"`, `"10"`, `"Court 3"`), the pairwise results are inconsistent. Numerically `9 < 10`. As strings, `"10" < "9"`, and `"Court 3"` sorts after both.
     - `Array.prototype.sort` with a non-transitive comparator gives an order that depends on the engine and the input.
   - **Impact**:
     - This script is shared by 12 `moj-sortable-table` templates, including public list-type pages such as court room or case number columns. It used to be purely lexical, so it was at least consistent.
     - This is a regression risk outside the ticket's admin scope.
     - The new test `sortable-table.test.ts:150` covers only purely numeric data.
   - **Recommendation**: Pick one of these:
     - (a) Use numeric comparison only when the cell has an explicit `data-sort-value`. That is the opt-in added for Remove List Summary, and the list-type pages keep their old behaviour.
     - (b) Use `localeCompare(b, undefined, { numeric: true })` for every comparison. This is transitive and orders numbers inside strings naturally.
     - Either way, add a mixed-column test.

2. **The file input error message is not linked to the input** (code defect, an existing gap on a line this ticket edits). Files: `apps/web/src/pages/(admin)/manual-upload/index.njk:58-63` and `apps/web/src/pages/(admin)/non-strategic-upload/index.njk:58-63`
   - **Problem**:
     - The error `<p class="govuk-error-message">` has no `id`.
     - The `<input type="file">` only gets `aria-describedby` when `pendingFileName` is set.
     - When the file has an error (required, type, size or schema), screen reader users who tab to the field do not hear the error. This is the same failure the ticket fixes in 4.6 (WCAG 3.3.1 / 1.3.1).
     - `govukFileUpload` is imported on line 3 of both templates but never used.
   - **Recommendation**:
     - Replace the hand-built markup with `govukFileUpload({ id: "file", name: "file", label, hint: { text: replaceFileHint, id: "file-hint" } if pendingFileName, errorMessage: ... })`. The macro builds `aria-describedby` from the hint and error.
     - Keep `file-uploaded` in the `describedBy` param.
     - Add a njk test asserting `aria-describedby` contains `file-error` in the error state.

### Partially met acceptance criteria (each `- [~]`, verification pending)

3. **4.1 – "No duplicate ids on the page (checked with axe or the HTML validator)"** (verification pending)
   - **Done**: `index-dropdowns.njk.test.ts:63` asserts there are no duplicate ids on the rendered page. The axe check is written in `e2e-tests/tests/system-admin/reference-data-management.spec.ts`.
   - **Missing**: The E2E/axe run has not been done, and no HTML validator run has been done.

4. **4.2 – "Activating the link moves focus into the day field"** (verification pending)
   - **Done**: the href matches a real input (`manual-upload/index.njk.test.ts:351`). The E2E focus assertion is in `e2e-tests/tests/admin/manual-upload.spec.ts:163`.
   - **Missing**: the E2E has not run, so focus movement is not verified in a browser.

5. **4.8 – "Checked at 320px width / 400% zoom"** (verification pending)
   - **Done**: the 320px no-page-scroll check and the Tab-to-region check are in `e2e-tests/tests/system-admin/blob-explorer.spec.ts` (@nightly).
   - **Missing**: the E2E has not run, and there is no manual 400% zoom check or focus-style check.

6. **4.10 – "Screen readers announce the controls as buttons"** (verification pending)
   - **Done**: native `<button type="button">` elements replace the links (`sortable-table.test.ts:51`). The E2E uses `getByRole("button", { name: "Content Date" })` (`e2e-tests/tests/admin/remove-publication.spec.ts`).
   - **Missing**: an actual screen reader announcement check, and an E2E run.

7. **4.11 – "Checked with a keyboard only"** (verification pending)
   - **Done**: focus is kept in jsdom (`sortable-table.test.ts:161`). The keyboard Enter plus `toBeFocused` E2E is written in `remove-publication.spec.ts` step 8.
   - **Missing**: the E2E has not run, and there has been no manual keyboard pass.

8. **4.14 – "Checked with a screen reader's links list: each link is unique and makes sense"** (verification pending)
   - **Done**: unique accessible names are asserted in `apps/web/src/pages/(admin)/media-applications/index.njk.test.ts:89`. The E2E looks the link up by its full name.
   - **Missing**: a check of the screen reader links list, and an E2E run.

---

## 💡 SUGGESTIONS

All of these are code-quality or UX improvements. None of them blocks this ticket.

1. **Kept file goes stale across tabs and refreshes.** File: `apps/web/src/pages/(admin)/manual-upload/index.ts:58-62` (same at `non-strategic-upload/index.ts:97-101`).
   - Any GET without errors throws away the pending file. If the admin opens `/manual-upload` in a second tab while the error page is showing, the first tab still says "Uploaded file: x.pdf", but submitting it gives "Please provide a file".
   - This is consistent with the refresh rule the plan agreed, but the message is misleading. Consider keeping the reference until a successful submit, "Remove file", or the TTL runs out, and clearing it only on the summary "Change" path.

2. **"Remove file" loses the earlier error context.** After `action=removeFile` (`manual-upload/index.ts:111-115`), the GET shows the form data but not the earlier field errors. A further refresh also clears the form, because `manualUploadForm` is deleted at line 66. This is acceptable, but tell users the file was removed (for example a notification banner) so the change is announced.

3. **Duplicated kept-file markup.** The `pendingFileName` block, the Remove button and `#remove-file-form` are the same in both upload templates (`index.njk:54-72` and `:247-249`). Extract them into a partial (DRY). This pairs well with the `govukFileUpload` fix in High 2.

4. **`manage-list-types` still has a visually-hidden-only action header.** File: `apps/web/src/pages/(system-admin)/manage-list-types/index.njk:23`. The AC allows a visually hidden header. However, the 4.12 decision switched the audit log to visible text because axe `empty-table-header` can flag hidden-only headers. Do the same here for consistency.

5. **"Action" and "Actions" headers sit side by side on the Audit log list.** File: `apps/web/src/pages/(system-admin)/audit-log-list/index.njk:188-190`.
   - Screen reader users will hear "Action" (the audited action) and then "Actions" (the View link column). These are easy to confuse.
   - The "View" links in that column, and the "Manage"/"Modify" links on `find-users`, `region-data-list` and `jurisdiction-data-list`, are also non-specific (the same 2.4.4 issue as 4.14).
   - Consider hidden context such as "View `<span class="govuk-visually-hidden">entry from {timestamp}</span>`" in a follow-up.

6. **Dead template captioned.** `apps/web/src/pages/(system-admin)/view-list-types/index.ts` only issues a 301 to `/manage-list-types`, so `view-list-types/index.njk` and its locale and test files are unreachable. Delete them, the same way `index-accordions.njk` was deleted, rather than maintaining captions on dead code.

7. **The scroll region name duplicates the caption.** Files: `blob-explorer-publications/index.njk:25` and `reference-data-upload-summary/index.njk:58`. `aria-label` repeats the caption text, so the two can drift apart. Give the caption an `id` and use `aria-labelledby` instead. This is easy for the raw table. For `govukTable`, keep `aria-label`, or pass the caption through a wrapper.

8. **4.9 accessible-name word order.** File: `media-applications/[id]/index.njk:40` (and `approve.njk:51`).
   - The accessible name is "View proof of ID (opens in new tab)". The visible text is "View (opens in new tab)". The visible string is not one contiguous piece of the accessible name.
   - This matches the AC and starts with "View", so Dragon should work. If the Dragon check (Critical 5) shows problems, move the hidden text to the end: "View (opens in new tab)" + hidden " proof of ID".

9. **Hard-coded focus colours.** File: `apps/web/src/assets/css/admin-pages.scss:146-150` uses `#ffdd00` and `#0b0c0c` instead of `$govuk-focus-colour` and `$govuk-focus-text-colour`. This matches the rest of the file, which does not import govuk-frontend Sass. If the module can `@use` the govuk settings, use the tokens so the focus style follows future palette changes.

10. **`type FormData` shadows the global DOM `FormData`.** File: `apps/web/src/pages/(system-admin)/location-metadata-manage/index.ts:133`. Rename it to `MessageFormData` to avoid confusion.

11. **Internal error text shown to users** (existing behaviour). Files: `location-metadata-manage/index.ts:125` and `non-strategic-upload/index.ts:179-180`. Raw `error.message` from the DB or converter is shown in the error summary. Show a fixed locale message and log the detail instead.

12. **Untyped `JSON.parse` in `getPendingFile`.** File: `libs/admin-pages/src/manual-upload/storage.ts:112`. `parsed` is `any`. Add a small type guard (`fileName`, `fileType` and `fileBase64` are strings) and return `null` on a bad shape, so a corrupted key behaves like an expired one instead of throwing.

13. **E2E sort assertion uses a single row.** `remove-publication.spec.ts` seeds one artefact, so the order change is never really exercised, and `firstCheckbox` would point at a different row if there were several. Seed two artefacts with different content dates and assert the row order flips. Locate the checked checkbox by value, not by `.first()`.

14. **Heading lost on reference-data upload summary.** Turning the `previewTitle` h2 into a visible caption (`reference-data-upload-summary/index.njk:60`) follows the plan's rule. However, the section no longer appears in a screen reader's heading list. The `role="region"` landmark partly makes up for this. Confirm it during the AT pass.

---

## ✅ Positive Feedback

- **Pending-file lifecycle is correct and well isolated.**
  - `retainPendingFile` (`libs/admin-pages/src/manual-upload/storage.ts:123-144`) covers every branch: keep, replace, discard on file error, and no store for invalid or oversized files.
  - The Redis key is a server-generated UUID that is only ever read from the user's own session, never from the request.
  - It is cleaned up on success (`manual-upload/index.ts:151`, `non-strategic-upload/index.ts:202`), on Excel-conversion failure (`non-strategic-upload/index.ts:181`) and on Remove.
  - The multer `LIMIT_FILE_SIZE` path skips loading the pending file and stores nothing (`index.ts:121`).
  - Ten controller tests per page cover the lifecycle (`manual-upload/index.test.ts:919-1126`).
- **Remove form placement.** `form="remove-file-form"` with the empty form outside the main form (`index.njk:65-72` and `:247-249`) stops an Enter key press in a text field from triggering Remove. There is no CSRF middleware in this app (the main upload form has no token either). The session cookie uses `sameSite: "lax"` (`libs/web-core/src/middleware/session-stores/redis-store.ts:21`), which blocks cross-site POSTs, so the new form is no weaker than the existing ones.
- **Escaping.**
  - `app.name | escape`, `proofOfIdFilename | escape` and `log.userEmail | escape` are all correct.
  - `reject.njk` now uses `text:` for the user-supplied filename.
  - The kept file name is auto-escaped, and `manual-upload/index.njk.test.ts:424` tests this.
  - Each has a template test that injects markup.
- **Autocomplete fix.** Removing the original input after a successful setup (`search-autocomplete.ts:124`) fixes the duplicate id and the second label in one change. The fetch-failure path leaves the original input alone. The `MutationObserver` in `keepDescribedBy` (`:169-182`) is needed, because accessible-autocomplete 3.0.2 overwrites `aria-describedby` (`node_modules/accessible-autocomplete/src/autocomplete.js:458`). It is idempotent, so it cannot loop.
- **Sort whitelist.** `parseSortQuery` (`remove-list-search-results/index.ts:26-30`) closes the `?sort=foo` 500 error, and `index.test.ts:156` tests it. `data-sort-value` with an epoch value gives correct date ordering.
- **4.6.** Building the errors is pure and kept inside the module (`validateMessages`, `toFieldErrors`). It now reports *every* HTML-tag error inline instead of only the first. The DB error stays summary-only.
- **4.1.** IDs come from stable DB keys, and the dead accordion variant was removed cleanly. No references are left: a grep for `index-accordions` / `LOCATION_JURISDICTION_UPDATE_VARIANT` returns nothing.
- **Welsh key parity.** I checked every changed `en.ts`/`cy.ts` pair (21 pairs, including `approve-en/cy`) with a script. All keys match.
- **Tests follow the rules.** Unit tests use AAA comments. Njk tests have no AAA comments, use `createTestEnvironment`, never call `nunjucks.configure`, and use Cheerio structural assertions with `toHaveLength`. There are new njk tests for seven templates that had none.
- **Out-of-plan changes are sound:**
  - approve.njk proof link matches 4.9
  - reject.njk filename escaping is a real XSS fix
  - audit-log `userEmail` escaping is a real XSS fix
  - the inline `overflow-x` style on reference-data-upload-summary was replaced by the shared focusable region
  - the empty `""` "Actions" headers on find-users, region-data-list and jurisdiction-data-list were filled in (4.12 sweep)
  - the h1 was moved above the warning on the upload pages, so the h1 is the first heading in `<main>`
- Inline `style=` attributes were removed from media applications (CSP-friendlier), and link-buttons replace GET-only forms.

---

## Test Coverage Assessment

- **Unit tests**:
  - Coverage is broad. Every AC with code behind it has at least one structural or behavioural test.
  - New suites: `sortable-table.test.ts`, seven new `*.njk.test.ts` files, and the pending-file controller and storage suites.
  - Gaps:
    - no mixed numeric/text sort test (High 1)
    - no assertion that the file input is linked to its error message (High 2)
  - On my first `apps/web` run, 1 test failed and then passed on rerun. This matches the known flaky timing test noted in `tasks.md`. All `admin-pages` (94) and `system-admin-pages` (581) tests passed. `apps/web` passed on rerun (4326 passed, 3 skipped).
- **E2E tests** (verification pending):
  - Eight specs were extended, following the one-journey-per-test rule: manual-upload, media-application-management, remove-publication, search, audit-log-viewer, blob-explorer, location-metadata, and reference-data-management.
  - None has been run successfully. SSO login fails with AADSTS50011 because the redirect URI `https://localhost:8080/sso/return` is not registered. They must be run in CI or a correctly configured environment before merge.
- **Accessibility tests** (verification pending):
  - Axe checks were added inline to the journeys.
  - The `link-name` rule was re-enabled on media applications, which is good.
  - The axe runs have not executed because E2E is blocked.
  - No manual JAWS, NVDA, Dragon, ZoomText or 400% zoom checks have been done.
- **Statement coverage per changed workspace** (re-measured per workspace on this branch):
  - @hmcts/web: 95.82%
  - @hmcts/admin-pages: 99.38%
  - @hmcts/system-admin-pages: 94.22%
  - All are above 80%.

---

## Acceptance Criteria Verification

**4.1 – Checkboxes share duplicate IDs**
- [x] Every checkbox has a unique `id`: `location-jurisdiction-update/index.ts:44,52`; `index-dropdowns.njk:23,36`; test `index-dropdowns.njk.test.ts:52`
- [x] Each `<label for>` matches its own checkbox `id`: `index-dropdowns.njk.test.ts:82`
- [~] There are no duplicate `id`s on the page (checked with axe or the HTML validator). Done: rendered-page duplicate-id test at `index-dropdowns.njk.test.ts:63`, and axe written in `e2e-tests/tests/system-admin/reference-data-management.spec.ts`. Missing: the axe/E2E run, and no HTML validator run (verification pending)
- [ ] Checked with JAWS: each checkbox announces its own label. No evidence (verification pending)

**4.2 – Error summary links for date fields do not move focus**
- [x] Each date field error summary link's `href` matches the `id` of the first input in that date (the day field): `libs/admin-pages/src/manual-upload/validation.ts` (`validateDate` / `validateDateRange` use `-day`); test `validation.test.ts:92`; `manual-upload/index.njk.test.ts:351`
- [~] Activating the link moves focus into the day field. Done: the href resolves to a real input (`manual-upload/index.njk.test.ts:359-361`), and the E2E focus assertion is at `e2e-tests/tests/admin/manual-upload.spec.ts:163`. Missing: the E2E has not run (verification pending)
- [x] Checked for every date field on Manual upload and any other admin form with date inputs. Manual upload, non-strategic upload (`non-strategic-upload/index.njk:96,170,205`) and audit log (`audit-log-list/index.ts:51,55`; test `audit-log-list/index.test.ts:221`). A grep confirms these are the only three admin `govukDateInput` pages

**4.3 – Heading-like text not marked up as such**
- [x] The bold sensitivity labels under "Sensitivity" are proper headings at the next level down: `manual-upload/index.njk:263,266,269`; `non-strategic-upload/index.njk:263,266,269`; test `manual-upload/index.njk.test.ts:373`
- [x] Heading levels on the page are in order, with no skipped levels: h1 moved up (`manual-upload/index.njk:31`); tests `manual-upload/index.njk.test.ts:384,399`
- [ ] Checked with a screen reader's heading list. No evidence (verification pending)

**4.4 – Uploaded files are cleared from the input when the form has errors**
- [x] When the form comes back with errors, the uploaded file is kept and the user can see which file is attached: `storage.ts:123-144`; `manual-upload/index.ts:131`; `index.njk:54-56`; tests `manual-upload/index.test.ts` ("should keep a valid file…", "should show the kept file name…") and `manual-upload/index.njk.test.ts:416`
- [x] Users can still remove or replace the kept file: `manual-upload/index.ts:111-115`; `index.njk:65-72,247-249`; tests "should remove the kept file…", "should replace the kept file…" and `index.njk.test.ts:431`
- [x] The kept file is used when the form is resubmitted successfully: `manual-upload/index.ts:121,138-151`; test "should reuse the kept file when no new file is chosen and clean it up on success". Non-strategic equivalent at `non-strategic-upload/index.ts:148,189-202`

**4.5 – Typeahead search component has multiple labels**
- [x] Only the visible label is linked to the autocomplete input; the hidden "Search" label is removed: `search-autocomplete.ts:121-125`; tests `search-autocomplete.test.ts:84,109`
- [x] Each `id` is used only once on the page: `search-autocomplete.ts:124`; test `search-autocomplete.test.ts:97`
- [x] Fixed on every page that uses the component, including Manual upload and "Search by court or tribunal name": a single shared script used by all 7 `data-autocomplete` pages; E2E id/label count assertions in `e2e-tests/tests/search.spec.ts:63-65`
- [ ] Checked with JAWS (one label read out) and Dragon (field can be selected by its label). No evidence (verification pending)

**4.6 – Form fields do not have individual error messages when submitted empty**
- [x] Each empty or invalid field shows its own inline error message, linked with `aria-describedby`: `location-metadata-manage/index.njk:33,44,55,66`; test `index.njk.test.ts:203`
- [x] An error summary links to each field in error: test `location-metadata-manage/index.njk.test.ts:195`
- [x] 5 error messages are displayed in the error summary under 'There is a problem' (Enter at least one message / Enter English caution message / Enter Welsh caution message / Enter English no list message / Enter Welsh no list message): `location-metadata-manage/index.ts` `validateMessages`; tests `index.test.ts:172`, `index.njk.test.ts:178`
- [x] Error messages 2–5 are displayed underneath the header of each associated text box: test `location-metadata-manage/index.njk.test.ts:203` (and `:230` shows message 1 is summary-only)

**4.7 – A visually hidden legend duplicates the main page heading**
- [x] The visually hidden legend is removed: `jurisdiction-data/index.njk:31`; test `jurisdiction-data/index.njk.test.ts:46` (same for region-data and reference-data/index-radios)
- [x] The page `<h1>` sits inside the `<legend>` (`isPageHeading: true`), and the `<fieldset>` wraps the whole radio group: `jurisdiction-data/index.njk:31`, `region-data/index.njk:31`, `reference-data/index-radios.njk:31`; tests `jurisdiction-data/index.njk.test.ts:38,53`
- [ ] Checked with a screen reader: the question is announced once. No evidence (verification pending)

**4.8 – Table causes the entire page to scroll horizontally**
- [x] At small widths and high zoom, only the table scrolls horizontally; the rest of the page doesn't: `admin-pages.scss:143-144`; `blob-explorer-publications/index.njk:25`; test `blob-explorer-publications/index.njk.test.ts:75`
- [x] The scrollable table area can be focused with a keyboard and shows a visible focus style: `blob-explorer-publications/index.njk:25` (`tabindex="0"`); `admin-pages.scss:146-150`
- [~] Checked at 320px width / 400% zoom. Done: 320px check in `e2e-tests/tests/system-admin/blob-explorer.spec.ts` (@nightly). Missing: the E2E has not run, and there is no 400% zoom check (verification pending)

**4.9 – View link has accessible name overridden to 'opens in new tab'**
- [x] The `aria-label` is removed from the "View" link: `media-applications/[id]/index.njk:40`; test `[id]/index.njk.test.ts:75`
- [x] The link has visually hidden context ("View <span class="govuk-visually-hidden">proof of ID</span>"): `media-applications/[id]/index.njk:40`; `[id]/en.ts` `viewProofOfIdHidden`; test `[id]/index.njk.test.ts:75`
- [x] If the link opens in a new tab, this is said in the link text: `[id]/en.ts` `proofOfIdText` is inside the `<a>` at `index.njk:40`; test `[id]/index.njk.test.ts:75`
- [ ] Checked with Dragon: saying "click View" activates the link. No evidence (verification pending)

**4.10 – Table sort controls are coded as links rather than buttons**
- [x] Sortable column headers use `<button>` elements, following the MoJ sortable table pattern: `remove-list-search-results/index.njk:28`; `sortable-table.ts:15-27`; tests `sortable-table.test.ts:51`, `remove-list-search-results/index.njk.test.ts:127`
- [x] `aria-sort` is updated on the sorted column: `sortable-table.ts:45-53`; tests `sortable-table.test.ts:90,115,128`; `remove-list-search-results/index.njk.test.ts:133`
- [~] Screen readers announce the controls as buttons. Done: native `<button type="button">` (`sortable-table.ts:19-20`), and the E2E `getByRole("button")` in `e2e-tests/tests/admin/remove-publication.spec.ts` step 8. Missing: a real screen reader check and an E2E run (verification pending)

**4.11 – Focus moves back to the top of the page after a table is sorted**
- [x] After sorting, focus stays on (or returns to) the sort button that was used: `sortable-table.ts:58`; test `sortable-table.test.ts:161`
- [x] Use the MoJ sortable table pattern: `remove-list-search-results/index.njk:28` (`data-module="moj-sortable-table"`)
- [~] Checked with a keyboard only. Done: the keyboard Enter plus `toBeFocused` E2E in `remove-publication.spec.ts` step 8. Missing: the E2E has not run, and there has been no manual keyboard pass (verification pending)

**4.12 – A table header cell is empty**
- [x] The empty header cell has descriptive text, for example "Actions": `audit-log-list/index.njk:190`; `audit-log-list/en.ts` `tableHeaders.actions`; tests `audit-log-list/index.njk.test.ts:120,221`
- [ ] Checked with a screen reader: the column header is read out with each cell. No evidence (verification pending)

**4.13 – Tables across the service have no captions**
- [x] Every data table in the admin service has a descriptive `<caption>`: all 18 inventory templates (for example `audit-log-list/index.njk` `caption: tableCaption`, `remove-list-confirmation/index.njk`, `third-party-subscribers/[id]/subscriptions/manage/index.njk` ×2). A grep confirms there are no uncaptioned tables in `(admin)`, `(system-admin)` or `libs/system-admin-pages`. Tests include `audit-log-detail/index.njk.test.ts:80`, `media-applications/index.njk.test.ts:73`, `blob-explorer-publications/index.njk.test.ts:64`
- [x] Where a caption would repeat a visible heading, either the heading is used as the caption or the caption is visually hidden: `remove-list-search-results/index.njk:29` (h2 becomes a visible caption); `reference-data-upload-summary/index.njk:60`; test `reference-data-upload-summary/index.njk.test.ts:57`; all other captions use `govuk-visually-hidden`
- [ ] An inventory of the tables that were fixed is listed in the PR. No evidence: no PR exists yet (verification pending, process)

**4.14 – View links on application page are non-specific**
- [x] Each "View" link has visually hidden text naming the applicant: `media-applications/index.njk:24`; tests `media-applications/index.njk.test.ts:89,105`
- [~] Checked with a screen reader's links list: each link is unique and makes sense. Done: the uniqueness assertion at `media-applications/index.njk.test.ts:89`, and the E2E lookup by full accessible name in `media-application-management.spec.ts`. Missing: a screen reader links-list check and an E2E run (verification pending)

**4.15 – Approve and reject buttons far apart**
- [x] "Approve" and "Reject" are next to each other, left-aligned, in a logical order (a GOV.UK button group): `media-applications/[id]/index.njk:47-58`; test `[id]/index.njk.test.ts:107`
- [ ] Checked with a screen magnifier or at high zoom: both buttons can be seen together. No evidence (verification pending)

**Tally: 32 met, 6 partial, 8 unmet (46 total).** All 14 partial or unmet criteria are verification or process items. Every criterion that depends only on code is met.

---

## Next Steps

- [ ] Address critical issues (all verification pending: AT checks for 4.1, 4.3, 4.5, 4.7, 4.9, 4.12 and 4.15; the 4.13 inventory in the PR)
- [ ] Fix high priority items (code: the `sortable-table.ts` comparator and the file-input error `aria-describedby`; verification: run the E2E/axe journeys in an environment with a working SSO redirect URI)
- [ ] Consider suggestions
- [ ] Re-run tests after fixes

---

## Overall Assessment

**NEEDS CHANGES** (advisory)

The code itself is close to mergeable. The two real defects are small and local: a comparator change, and switching to the `govukFileUpload` macro. The verdict is NEEDS CHANGES because 8 acceptance criteria are unmet and 6 are partially met. All 14 depend on manual assistive-technology checks, E2E/axe runs blocked by the SSO configuration, or the PR inventory. None of them points to missing code. Once the two defects are fixed, the E2E suite passes in CI, and the AT checks are recorded in the PR along with the 4.13 inventory, this should be ready to approve.

---

## Fixes applied after review (2026-11-26)

1. **Sort order with mixed columns** — `apps/web/src/assets/js/sortable-table.ts` `compareValues` now uses `localeCompare(b, undefined, { numeric: true })` for every pair, giving one consistent ordering (and natural order such as "Court 2" before "Court 10"). New test: `sortable-table.test.ts` "should order a column mixing numbers and text consistently".
2. **File error not linked to the input** — `(admin)/manual-upload/index.njk` and `(admin)/non-strategic-upload/index.njk` now use `govukFileUpload`, so the error message gets `id="file-error"` and is in the input's `aria-describedby` (`file-error`, or `file-uploaded file-hint file-error` while a file is kept). New tests in both `index.njk.test.ts` files.

Verification: `npx vitest run` over upload pages, `apps/web/src/assets/js` and `(list-types)` — 119 files, 2038 tests passed; biome clean.
