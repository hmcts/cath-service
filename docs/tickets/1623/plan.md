# Technical Plan: #1623 – [A11y] Package 4: System and local admin journey

## 1. Technical Approach

This ticket covers 15 audit findings, all markup or behaviour fixes to pages that already exist. No new pages, no API changes, no DB/Prisma changes. It splits into two halves that can be picked up separately:

- **4a – Admin forms and uploads (4.1–4.7)**: checkbox IDs, date error-summary hrefs, heading markup, keeping uploaded files after errors, typeahead labelling, per-field errors on location metadata, page heading inside the legend.
- **4b – Admin tables and media applications (4.8–4.15)**: table reflow, sortable table, header text, captions, link text, button grouping.

Each half touches its own files. The only shared file is `apps/web/src/assets/css/admin-pages.scss`, where 4.8 adds the new scroll wrapper class.

### Shared decisions

1. **Unique checkbox IDs come from the data, not from macro defaults.** `govukCheckboxes` gives item IDs `name`, `name-2`, `name-3` and so on. When the macro is called in a loop with the same `name`, every group repeats those IDs. Fix: set an explicit `id` on each item from its stable DB key (`subJurisdiction-{subJurisdictionId}`, `region-{regionId}`), and give each group its own `idPrefix`.
2. **Date error-summary links point to `#<field>-day`.** `govukDateInput` gives the day input the ID `<id>-day`. Change the `href` once in `validateDate()` (`libs/admin-pages/src/manual-upload/validation.ts`), so manual upload and non-strategic upload are both fixed. The `getError(errors, "#x")` lookup in each template must change to match. The audit log date filter gets the same fix.
3. **Keep the uploaded file by storing it on the server.** Browsers do not let you set a file input's value, so the file cannot be put back into `<input type="file">`. When validation fails and the file itself passed its own checks, store the buffer in Redis with a short TTL. This reuses the pattern already in `libs/admin-pages/src/manual-upload/storage.ts`. Put a small reference (`{ id, fileName }`) in the session, show the file name to the user with a remove option, and use the stored file on resubmit if no new file is chosen.
4. **Typeahead: one label and one ID.** Remove the injected visually hidden "Search" label from `search-autocomplete.ts`. Also stop the hidden original `<input>` and the autocomplete `<input>` sharing the same `id`. Copy the original's `aria-describedby` (hint and error) onto the autocomplete input so the hint and error are still announced.
5. **Page heading inside the legend.** Use `fieldset.legend.isPageHeading: true` with `classes: "govuk-fieldset__legend--l"`, and remove the separate `<h1>`. This is the same fix as Package 3 items 3.4 and 3.7, so use the same approach.
6. **Tables**: add a shared `.app-table-scroll` wrapper. It is focusable, has `role="region"` and an accessible name, and only the wrapper scrolls. Add GOV.UK `caption` to every admin data table. Use visible text in header cells. For sorting, use the repo's existing MoJ-style client-side sortable table (`apps/web/src/assets/js/sortable-table.ts`, `data-module="moj-sortable-table"`). Focus stays on the sort button because the page does not reload.
7. **Escaping.** Several fixes add user data (applicant name, file name) inside `html:` strings built in Nunjucks. These strings are not auto-escaped, so every value added must use `| escape`.

### Related findings

- `apps/web/src/assets/css/list-types/et-lists.scss` sets `.govuk-table { overflow: auto hidden; }` globally, because it is `@use`d unscoped from `web.scss`. Overflow does nothing on an element with `display: table`, so this rule has no effect, and it is part of why only the page scrolls. 4.8 should not rely on it. Moving that rule out is out of scope.
- `govuk-table-container`, used on `remove-list-search-results/index.njk`, is not defined in GOV.UK Frontend 6.2.0 or in the repo CSS, so it does nothing.

## 2. Implementation Details

TEMPLATE SOURCE: n/a

No API endpoint changes. No Prisma schema or migration changes. One new Redis key prefix (4.4) with a TTL. No new packages.

---

### 4a – Admin forms and uploads

#### 4.1 – Duplicate checkbox IDs (Critical)

**Verified:** the issue is still present. The page is `/location-jurisdiction-update`. The controller uses `LOCATION_JURISDICTION_UPDATE_VARIANT = "dropdowns"`.

- `apps/web/src/pages/(system-admin)/location-jurisdiction-update/index-dropdowns.njk`: `{% for group in subJurisdictionGroups %}` calls `govukCheckboxes({ name: "subJurisdictionIds", ... })` with no `idPrefix` and no item `id`. Every jurisdiction group gives `subJurisdictionIds`, `subJurisdictionIds-2` and so on, so IDs repeat across the civil, crime, family and tribunal groups. This matches the audit snippet.
- `apps/web/src/pages/(system-admin)/location-jurisdiction-update/index.ts`: in `subJurisdictionGroups[].items`, add `id: \`subJurisdiction-${s.subJurisdictionId}\``. In `regionCheckboxes`, add `id: \`region-${r.regionId}\``.
- `index-dropdowns.njk`: add `idPrefix: "subJurisdictionIds-" + loop.index` per group and `idPrefix: "regionIds"` for regions, so any fieldset-level IDs the macro creates (hint or error) are also unique.
- `index-accordions.njk` already uses `sub-{{ item.id }}` / `region-{{ item.id }}`. However, it reads `allData` and `currentSubJurisdictionIds`, which the controller never passes. That variant is dead code. **Decision: delete `index-accordions.njk`**, remove the `LOCATION_JURISDICTION_UPDATE_VARIANT` constant from `index.ts`, and render `location-jurisdiction-update/index-dropdowns` directly.
- The POST handler does not change. Field `name`s and `value`s stay the same.

#### 4.2 – Date error-summary links do not move focus

**Verified:** the issue is still present.

- `libs/admin-pages/src/manual-upload/validation.ts`:
  - In `validateDate()`, change all three `href: \`#${fieldName}\`` to `href: \`#${fieldName}-day\``.
  - In `validateDateRange()`, change `href: "#displayTo"` to `"#displayTo-day"`.
- `apps/web/src/pages/(admin)/manual-upload/index.njk` and `apps/web/src/pages/(admin)/non-strategic-upload/index.njk`: change `getError(errors, "#hearingStartDate")`, `"#displayFrom"` and `"#displayTo"` to the `-day` versions so inline errors still render.
- `apps/web/src/pages/(system-admin)/audit-log-list/index.ts`: there are two places with `errors.date = { ..., href: "#day" }`. The date input has `id: "date"` and `namePrefix: ""`, so the day input's ID is `date-day`, not `day`. This link is broken too. Change it to `"#date-day"`.
- Also in `audit-log-list/index.njk`: add `govuk-input--error` to the date items when `errors.date` is set. This is a small consistency fix in the same block.
- Update the existing tests that assert the old hrefs: `libs/admin-pages/src/manual-upload/validation.test.ts`, the `allErrors` fixtures in `manual-upload/index.njk.test.ts` and `non-strategic-upload/index.njk.test.ts`, and `audit-log-list/index.test.ts`.

#### 4.3 – Sensitivity labels styled with `<strong>` instead of headings

**Verified:** the issue is still present. In `apps/web/src/pages/(admin)/manual-upload/index.njk`, the aside contains `<p class="govuk-body"><strong>{{ pageHelpSensitivityPublic }}</strong><br>…` and the same for Private and Classified.

- Replace each one with `<h4 class="govuk-heading-s govuk-!-margin-bottom-1">{{ … }}</h4><p class="govuk-body">{{ …Text }}</p>`.
- The heading order in the aside becomes: `h2` "Page help", `h3` "Sensitivity", `h4` Public, Private and Classified. Nothing is skipped.
- `apps/web/src/pages/(admin)/non-strategic-upload/index.njk` has the same markup at lines 247–257. Apply the same change.
- No locale changes.
- Note: on both pages the warning block puts `<h2>{{ warningTitle }}</h2>` before the page `<h1>`. That is out of order. **Decision: move the warning block below the `<h1>` on both pages** so the page heading is the first heading in `<main>`.

#### 4.4 – Uploaded file cleared when the form has errors

**Verified:** the issue is still present. `manual-upload/index.ts` `postHandler` saves `manualUploadErrors` and `manualUploadForm` to the session and redirects. `req.file` is thrown away.

- `libs/admin-pages/src/manual-upload/storage.ts`: add `storePendingFile(prefix, file)`, `getPendingFile(prefix, id)` and `deletePendingFile(prefix, id)`. These use Redis key `${prefix}-pending:${uuid}`, store the base64 buffer, file name and mime type, with the same `UPLOAD_TTL`. Export them from `libs/admin-pages/src/index.ts`.
- `libs/admin-pages/src/manual-upload/model.ts`: add `manualUploadPendingFile?: { id: string; fileName: string }` to the session typing. Add `nonStrategicUploadPendingFile` too (non-strategic upload is in scope).
- `apps/web/src/pages/(admin)/manual-upload/index.ts`:
  - **POST, file chosen:** use `req.file`. This replaces any pending file; delete the old Redis key.
  - **POST, no file chosen but `manualUploadPendingFile` set:** load it from Redis and pass it to `validateManualUploadForm` as the file. If it has expired, treat it as "no file" so the normal `fileRequired` error shows.
  - **POST with errors:** if none of the errors has `href === "#file"`, store the file as pending and save `{ id, fileName }` in the session. If the file itself failed validation (wrong type, too large, or JSON schema failure), do not keep it. **Decision (confirmed):** an invalid file is removed and the user must choose a file again.
  - **POST success:** call `storeManualUpload` with the file in use, then delete the pending key and the session reference.
  - **POST with `action=removeFile`:** delete the pending file and session reference, then redirect to `/manual-upload` with the form data kept.
  - **GET:** pass `pendingFileName` to the template. Clear the pending reference using the same refresh rule that already clears `manualUploadForm` (`!wasSubmitted` and no errors).
- `apps/web/src/pages/(admin)/manual-upload/index.njk`: when `pendingFileName` is set, show it above the file input in the inset area, for example "Uploaded file: name.pdf" (`govuk-body`, file name escaped). Add a hint linked to the input with `aria-describedby`: "Choose a new file to replace it". Add a secondary "Remove file" button.
  - The Remove button must be in a separate `<form id="remove-file-form" method="post">` outside the main form, and use the `form="remove-file-form"` attribute. If it sat inside the main form, pressing Enter in a text field would trigger it, because it would be the first submit button.
  - The remove form needs the CSRF token if the app uses one. It posts `action=removeFile`. Multer is already mounted on `/manual-upload` through `fileUploadRoutes`, so a multipart or urlencoded body is fine.
- Locale keys (`en.ts` / `cy.ts`): `uploadedFileLabel`, `replaceFileHint`, `removeFileButton`. The page is English-only (`locale = "en"`, `hideLanguageToggle: true`), but `cy.ts` must keep key parity.
- **Decision: apply the same behaviour to non-strategic upload** (`apps/web/src/pages/(admin)/non-strategic-upload/index.ts`, `index.njk`, `en.ts`, `cy.ts`) using the same storage helpers with its own Redis prefix and session key.
- **Decision: the summary page "Change" link keeps the current behaviour** — the file is not kept when going back to the form. Make sure following "Change" clears any pending-file reference so a stale file is never shown.

#### 4.5 – Typeahead has two labels

**Verified:** the issue is still present in `apps/web/src/assets/js/search-autocomplete.ts`.

- Remove the block that adds `<label class="govuk-label govuk-visually-hidden" for=inputId>Search</label>` inside the wrapper (the `if (!wrapper.querySelector("label"))` branch).
- **Duplicate ID:** the original `locationInput` keeps `id=inputId` and is only hidden with `display:none`, while `accessibleAutocomplete({ id: inputId })` creates a second element with the same ID. Fix: read `aria-describedby` and `classList` from the original, then remove the original from the DOM (`locationInput.remove()`). This is safe because its `name` has already been moved to `hiddenInput`. The visible label's `for` then matches only the autocomplete input.
- After the autocomplete is set up, add the original's `aria-describedby` IDs (for example `court-hint court-error`, `locationId-hint`) to the autocomplete input's existing `aria-describedby`.
- Keep the fallback that creates a visible label when the container has none. That is the only label in that case, so it is not a duplicate.
- Pages that use it (`data-autocomplete="true"`) and are fixed by this one change:
  - `(admin)/manual-upload`
  - `(admin)/non-strategic-upload`
  - `(admin)/remove-list-search`
  - `(system-admin)/delete-court`
  - `(system-admin)/location-metadata-search`
  - `(system-admin)/location-jurisdiction-search`
  - `(public)/search` (public "Search by court or tribunal name")
- `apps/web/src/assets/js/search-autocomplete.test.ts`: the tests at lines 84–93 and 198–215 assert the hidden "Search" label exists. Rewrite them to assert there is no label inside the wrapper, exactly one `label[for=inputId]`, exactly one element with `#inputId`, and that `aria-describedby` is copied across.

#### 4.6 – Location metadata: no per-field errors

**Verified:** the issue is still present. `apps/web/src/pages/(system-admin)/location-metadata-manage/index.ts` `renderWithError` sends a single `errors: [{ text, href }]`. The four `govukTextarea`s in `index.njk` have no `errorMessage`.

Follow the agreed mock-up, not the audit's two-step approach (see the "Before starting" note in the ticket):

- On create or update when all four fields are empty, the error summary lists five items in this order:
  1. "Enter at least one message", linking to `#cautionMessage`
  2. "Enter English caution message", linking to `#cautionMessage`
  3. "Enter Welsh caution message", linking to `#welshCautionMessage`
  4. "Enter English no list message", linking to `#noListMessage`
  5. "Enter Welsh no list message", linking to `#welshNoListMessage`
- Messages 2–5 also show inline under each textarea through `errorMessage`. The macro links them with `aria-describedby="<id>-error"`.
- The "HTML tags not allowed" error should also show inline on the field it affects, as well as in the summary.
- Controller: replace `renderWithError(text, href)` with `renderWithErrors(errors: ValidationError[])`. Build `fieldErrors` as `Record<field, { text }>` for the template. Keep the pure validation in the controller module (do not export it). Put field-specific messages in locale files.
- `index.njk`: add `errorMessage: fieldErrors.cautionMessage` (and the same for the other three) to each `govukTextarea`.
- `en.ts` / `cy.ts`: add `cautionMessageRequired`, `welshCautionMessageRequired`, `noListMessageRequired`, `welshNoListMessageRequired`. **Decision:** the agreed five-message mock-up is authoritative, and message 1 links to `#cautionMessage`. Welsh: use the English text in `cy.ts` for now (see Welsh decision below).
- The DB-error branch (`catch`) keeps one summary-only error.

#### 4.7 – Visually hidden legend repeats the h1

**Verified:** the issue is still present in `apps/web/src/pages/(system-admin)/jurisdiction-data/index.njk`. There is a separate `<h1>{{ title }}</h1>`, and the legend uses the same `title` with `classes: "govuk-visually-hidden"`.

- Remove the `<h1>`. Set `legend: { text: title, isPageHeading: true, classes: "govuk-fieldset__legend--l" }`. The error summary stays above the form.
- **Decision (confirmed):** two other pages use the identical pattern and get the same fix in the same pass, aligned with Package 3 (3.4/3.7) `isPageHeading` usage:
  - `apps/web/src/pages/(system-admin)/region-data/index.njk`
  - `apps/web/src/pages/(system-admin)/reference-data/index-radios.njk`
- No locale changes.

---

### 4b – Admin tables and media applications

#### 4.8 – Blob Explorer Publications table makes the page scroll

**Verified:** the issue is still present. `apps/web/src/pages/(system-admin)/blob-explorer-publications/index.njk` renders `govukTable` directly inside `govuk-grid-column-full`. The first column is an unbroken artefact UUID link, which forces the width.

- `apps/web/src/assets/css/admin-pages.scss`: add `.app-table-scroll`:
  - `overflow-x: auto`
  - `&:focus-visible { outline: $govuk-focus-width solid $govuk-focus-colour; outline-offset: 0; }`
  - Scrolling is always on rather than only below 510px. It does nothing when the table fits, and it covers 400% zoom on any viewport. Decision: accepted (see section 6).
- `blob-explorer-publications/index.njk`: wrap the table in `<div class="app-table-scroll" tabindex="0" role="region" aria-label="{{ publicationsTableCaption }}">`. The region needs an accessible name for axe `scrollable-region-focusable` and for the region role. Reuse the 4.13 caption text.
- The same page has a hard-coded English "No publications found for this location." This is out of scope. Note it in the PR.

#### 4.9 – "View" proof-of-ID link has aria-label "Opens in new window"

**Verified:** the issue is still present. In `apps/web/src/pages/(admin)/media-applications/[id]/index.njk`, the Proof of ID row's `html` has `<a … target="_blank" … aria-label="Opens in new window">View</a>`, and the "(opens in a new window)" text sits outside the link next to the file name.

- Remove `aria-label`. The new link text is `View<span class="govuk-visually-hidden"> proof of ID</span> (opens in new tab)`. This keeps "View" as the start of the accessible name, which is what 2.5.3 requires, and puts the new-tab warning inside the link.
- Keep the file name as plain text next to the link, escaped with `proofOfIdFilename | escape`. It is user-uploaded content inside an `html` string.
- Replace the inline `style="display:flex…"` with GOV.UK markup, or a class if the layout needs one.
- `[id]/en.ts` / `cy.ts`: add `viewProofOfIdHidden` ("proof of ID" in both files) and change `proofOfIdText` to "(opens in new tab)" in both `en.ts` and `cy.ts` (Welsh decision: English text).

#### 4.10 + 4.11 – Sortable table uses links; focus lost after sort (one change)

**Verified:** the issue is still present. `apps/web/src/pages/(admin)/remove-list-search-results/index.njk` has five `th.govuk-table__header--sortable` cells with `<a href="?sort=…&order=…">`. The page reloads, so focus goes back to the top and any checked "select" boxes are lost.

Approach: use the repo's existing MoJ sortable-table pattern (`data-module="moj-sortable-table"`, already used by 13 list-type templates and set up in `apps/web/src/assets/js/web.ts`).

- `remove-list-search-results/index.njk`:
  - Add `data-module="moj-sortable-table"` to `<table>`.
  - Keep `aria-sort` on the five sortable `th`s. Set the default sort's `th` (`contentDate`, descending) to `aria-sort="descending"` instead of `none`, so the first state is announced.
  - **No-JS fallback:** keep the existing query-string `<a>` inside each `th`. `initTable()` already replaces the header content with a `<button type="button">` using the header's text, so with JS the link becomes a button. Without JS, server-side sorting still works through the link. Decision: accepted (see section 6).
  - Add `data-sort-value="{{ row.contentDateRaw | isoDate }}"` (or an epoch value from the controller) on the content date `td`. Text sorting of "1 March 2026" against "12 January 2026" gives the wrong order.
- `apps/web/src/assets/js/sortable-table.ts`. These changes are additive, so the list-type pages are not affected:
  - `sortRows` reads `cell.dataset.sortValue ?? cell.textContent`, and compares numbers when both values are numeric.
  - The button keeps focus because it is not re-created. Only the SVG is swapped. Add an explicit `button.focus()` after sorting as a safeguard.
  - Read the initial `aria-sort` so the first click on an already-sorted column flips the direction.
- `remove-list-search-results/index.ts`:
  - Whitelist `sort` against `SortColumn` and `order` against `asc|desc`. Today `?sort=foo` makes `a[sortBy].toLowerCase()` throw and returns a 500.
  - Pass `contentDateRaw` (ISO string) to the template.
- New `apps/web/src/assets/js/sortable-table.test.ts`. There is no test for this file today. Cover: links are replaced by buttons, `aria-sort` updates, `data-sort-value` ordering, and focus stays on the clicked button.

#### 4.12 – Empty table header on Audit log viewer

**Partly fixed already.** `apps/web/src/pages/(system-admin)/audit-log-list/index.njk` line 188 has `{ html: '<span class="govuk-visually-hidden">' + viewHeader + '</span>' }`. This was added in commit 9cecc4395 in July 2026, before the audit. The header is not empty for assistive technology, but axe's `empty-table-header` rule needs visible text, which may be what the auditors saw.

- Make it visible text: `{ text: actionsHeader, classes: "audit-log-layout__view-header" }`, with a new `tableHeaders.actions` key ("Actions" in both `en.ts` and `cy.ts` — see Welsh decision). **Decision (confirmed):** use the visible header in `audit-log-list/en.ts` and `cy.ts`. Pass it from `index.ts`.
- `.audit-log-layout__view-header` in `apps/web/src/assets/css/dashboard.scss` (`white-space: nowrap; width: 1%`) still applies.
- Check the other admin tables with an action column (`find-users`, `manage-third-party-users`, `third-party-subscribers`, `view-list-types`, `manage-list-types`) for empty headers during the 4.13 sweep.

#### 4.13 – No captions on admin tables

**Verified:** only `(system-admin)/manage-list-types/index.njk` has a caption (visually hidden). Inventory of tables to fix, for the PR description:

| # | File | Markup | Caption approach |
|---|---|---|---|
| 1 | `apps/web/src/pages/(admin)/remove-list-search-results/index.njk` | raw `<table>` | Replace the `<h2 class="govuk-label govuk-label--m">{{ subHeading }}</h2>` with `<caption class="govuk-table__caption govuk-table__caption--m">` |
| 2 | `apps/web/src/pages/(admin)/remove-list-confirmation/index.njk` | raw | visually hidden |
| 3 | `apps/web/src/pages/(admin)/media-applications/index.njk` | `govukTable` | visually hidden ("Applications to assess") |
| 4 | `apps/web/src/pages/(system-admin)/audit-log-list/index.njk` | `govukTable` | visually hidden |
| 5 | `apps/web/src/pages/(system-admin)/audit-log-detail/index.njk` | `govukTable` (key/value, no header) | Caption, plus `firstCellIsHeader: true` so keys are row headers. **Decision: keep the table** with a caption and `firstCellIsHeader` |
| 6 | `apps/web/src/pages/(system-admin)/blob-explorer-locations/index.njk` | `govukTable` | visually hidden |
| 7 | `apps/web/src/pages/(system-admin)/blob-explorer-publications/index.njk` | `govukTable` | visually hidden (also the 4.8 region label) |
| 8 | `apps/web/src/pages/(system-admin)/blob-explorer-confirm-resubmission/index.njk` | `govukTable` | visually hidden |
| 9 | `apps/web/src/pages/(system-admin)/find-users/index.njk` | `govukTable` | visually hidden |
| 10 | `apps/web/src/pages/(system-admin)/region-data-list/index.njk` | raw | visually hidden |
| 11 | `apps/web/src/pages/(system-admin)/jurisdiction-data-list/index.njk` | raw | visually hidden |
| 12 | `apps/web/src/pages/(system-admin)/reference-data-upload-summary/index.njk` | raw | Use the `previewTitle` h2 text as a visible caption, and drop the h2 |
| 13 | `apps/web/src/pages/(system-admin)/manage-third-party-users/index.njk` | `govukTable` | visually hidden |
| 14 | `apps/web/src/pages/(system-admin)/view-list-types/index.njk` | raw | visually hidden |
| 15 | `apps/web/src/pages/(system-admin)/manage-list-type/index.njk` | raw | visually hidden |
| 16 | `apps/web/src/pages/(system-admin)/location-jurisdiction-manage/index.njk` | raw | visually hidden |
| 17 | `libs/system-admin-pages/src/pages/third-party-subscribers/index.njk` | `govukTable` | visually hidden |
| 18 | `libs/system-admin-pages/src/pages/third-party-subscribers/[id]/subscriptions/manage/index.njk` | 2 × raw | Each table gets its own caption from its section |
| — | `apps/web/src/pages/(system-admin)/manage-list-types/index.njk` | already captioned | no change |

- `govukTable`: `caption: t.tableCaption, captionClasses: "govuk-visually-hidden"` (or `govuk-table__caption--m` when visible).
- Raw tables: `<caption class="govuk-table__caption govuk-visually-hidden">`.
- Add a `tableCaption` key (or a more specific name where a page has two tables) to each page's `en.ts` / `cy.ts`, and pass it from the controller where the template does not spread `t`.
- Rule: if the caption would only repeat the `<h1>`, make it visually hidden. If a visible `h2` already introduces the table, turn that h2 into a visible caption instead.

#### 4.14 – Non-specific "View" links on Select application to assess

**Verified:** the issue is still present. In `apps/web/src/pages/(admin)/media-applications/index.njk`, the row `html` is `'<a href="/media-applications/' + app.id + '" class="govuk-link">' + viewLink + '</a>'`.

- New link: `viewLink + '<span class="govuk-visually-hidden"> ' + viewLinkHidden + ' ' + (app.name | escape) + '</span>'`. The `| escape` is required: `app.name` is applicant-entered, and this string goes out unescaped through `html:`.
- `media-applications/en.ts` / `cy.ts`: add `viewLinkHidden` ("application for" in both files — see Welsh decision). Pass it from `media-applications/index.ts` (line 16 area).

#### 4.15 – Approve and Reject buttons far apart

**Verified:** the issue is still present. `apps/web/src/pages/(admin)/media-applications/[id]/index.njk` uses `<div style="display:flex; justify-content:space-between">` with two separate GET forms.

- Replace this with `<div class="govuk-button-group">` holding two `govukButton({ text, href })` link-buttons: Approve (primary) to `/media-applications/{id}/approve`, then Reject (`govuk-button--warning`) to `/media-applications/{id}/reject-reasons`. The forms were only doing GET navigation, so link-buttons behave the same. The macro adds `role="button"`, so existing E2E `getByRole("button", { name: /approve application/i })` still matches.
- This removes the inline styles (CSP-friendlier).

## 3. Error Handling & Edge Cases

- **4.1:** if a jurisdiction has the same sub-jurisdiction listed twice, IDs could still repeat. `subJurisdictionId` is a PK, so this cannot happen. Region and sub-jurisdiction prefixes are different, so their numeric IDs cannot collide.
- **4.2:** the date range error ("display to before from") must also go to `#displayTo-day`. If only month or year is wrong, the link still goes to day, as the AC requires.
- **4.4:**
  - The pending file in Redis expires after `UPLOAD_TTL` (1 hour). On resubmit after expiry, show the normal "Please provide a file" error and clear the session reference.
  - A file that failed size, type or JSON-schema checks is never kept.
  - JSON-schema failure depends on the chosen list type. If the user selected the wrong list type, they must upload again. Confirmed acceptable (section 6).
  - Choosing a new file always replaces the kept one.
  - The pending key is deleted on success and on "Remove file". After success the user is redirected to the summary, so the next GET does not bring the file back.
  - Session-fixation and cross-user access: the Redis key is a random UUID referenced only from the user's own session, and is never accepted from the request body.
  - The Multer `LIMIT_FILE_SIZE` path must not store anything.
- **4.5:**
  - If `fetchLocations` returns nothing, the original input stays in place unchanged. The removal happens only after a successful setup, so the no-JS or failure path still has one input and one label.
  - Two autocompletes on one page (if any) keep distinct IDs because each uses its own `inputId`.
- **4.6:**
  - Whitespace-only input counts as empty (the existing `hasNonEmptyValue` already trims).
  - Filling only one field gives no required-field errors, because the rule is "at least one".
  - HTML-tag errors can appear on several fields. Today only the first is reported. Report all of them inline, or at least keep the first; agree which.
  - The Delete action skips validation, as it does today.
  - In Welsh (`?lng=cy`), all five messages come from `cy.ts`.
- **4.10/4.11:**
  - An invalid `sort` or `order` query falls back to the default instead of returning a 500.
  - Client-side sorting keeps checkbox state.
  - The "Select" and "Display Dates" columns stay unsortable (no `aria-sort`), so JS skips them.
- **4.14/4.9:** applicant names and file names containing `<`, `&` or quotes must render as text. Add a template test case for this.
- **4.15:** if `application` is already reviewed, the existing controller error path renders without buttons. No change.

## 4. Acceptance Criteria Mapping

| Item | AC | Verification |
|---|---|---|
| 4.1 | Unique `id` per checkbox; `label[for]` matches; no duplicate IDs; JAWS | New `location-jurisdiction-update/index-dropdowns.njk.test.ts`: collect all `input[type=checkbox]` IDs and assert the Set size equals the count. Check every `label.govuk-checkboxes__label[for]` resolves to exactly one input. Controller test asserts item `id`s. Axe in E2E. JAWS is manual. |
| 4.2 | href = day input id; focus moves; every date field on admin forms | `validation.test.ts` asserts `#hearingStartDate-day`, `#displayFrom-day`, `#displayTo-day` (including the range error). The manual-upload and non-strategic-upload njk tests assert each summary `a[href]` resolves to an existing `input` id, and that inline errors still render. `audit-log-list/index.test.ts` asserts `#date-day`. The E2E manual-upload journey clicks a date summary link and asserts the focused element is `#hearingStartDate-day`. |
| 4.3 | Proper headings; order correct; heading list | Manual-upload and non-strategic-upload njk tests: `aside h4` has length 3 with the Public, Private and Classified text; no `aside strong`. Assert the aside sequence is h2, h3, h4. Screen reader check is manual. |
| 4.4 | File kept and shown; can remove or replace; kept file used on success | Controller unit tests (Redis helpers mocked): store on non-file errors, no store on file errors, reuse on resubmit, replace on new file, delete on success and remove, expiry gives fileRequired. `storage.test.ts` for the new helpers. Njk test: the file name is shown when `pendingFileName` is set and the remove button has `form="remove-file-form"`. E2E: submit with a file and a missing field, see the file name, fix the field, continue to the summary. |
| 4.5 | One label; unique IDs; all pages; JAWS/Dragon | `search-autocomplete.test.ts`: there is no `label` in the wrapper, `document.querySelectorAll("#"+id)` has length 1, `aria-describedby` includes the hint id, and the no-label fallback still creates one visible label. E2E axe on manual upload and public search (`duplicate-id`, `label` rules). AT check is manual. |
| 4.6 | Inline errors with aria-describedby; summary links; the 5 messages; 2–5 under each field | `location-metadata-manage/index.njk.test.ts`: `assertErrorSummary($, [5 messages])`, and each textarea has a `.govuk-error-message` and `aria-describedby` containing `<id>-error`. Welsh render. Locale key parity. `index.test.ts`: an empty POST renders five errors in order, one filled field gives no errors, and an HTML-tag error is inline. E2E `location-metadata.spec.ts` journey. |
| 4.7 | Hidden legend removed; h1 in legend; announced once | New njk tests for `jurisdiction-data`, `region-data` and `reference-data/index-radios`: `legend h1.govuk-fieldset__heading` has length 1, `h1` has length 1 on the page, and there is no `legend.govuk-visually-hidden`. |
| 4.8 | Only the table scrolls; focusable with a visible focus style; 320px/400% | `blob-explorer-publications/index.njk.test.ts`: the table is inside `.app-table-scroll[tabindex=0][role=region][aria-label]`. E2E `blob-explorer.spec.ts` sets the viewport to 320px wide and asserts `document.documentElement.scrollWidth <= clientWidth`, and that the region is reachable by Tab. The focus style is checked manually, because the E2E rules say not to test styling. |
| 4.9 | No aria-label; hidden context; new-tab text in link; Dragon | `[id]/index.njk.test.ts`: proof link has no `aria-label`, its text starts with "View" and contains "proof of ID" and "(opens in new tab)", and `target=_blank` is kept. Escaping test for the filename. |
| 4.10 | `<button>` sort controls; `aria-sort` updates; announced as buttons | `sortable-table.test.ts` (jsdom). Njk test: table has `data-module="moj-sortable-table"`, five `th[aria-sort]`, and the default column is `descending`. E2E remove-publication journey: `getByRole("button", { name: "List Type" })` exists and `aria-sort` changes after a click. |
| 4.11 | Focus stays on the sort button; keyboard | `sortable-table.test.ts` asserts `document.activeElement` is the clicked button. In E2E, press Enter on the focused sort button and assert it still has focus and the URL is unchanged. |
| 4.12 | Header text present; read with cells | `audit-log-list/index.njk.test.ts`: every `th.govuk-table__header` has non-empty visible text (no `.govuk-visually-hidden`-only content). `cy` renders "Actions" (English text per section 6). Axe in the audit-log E2E. |
| 4.13 | Every admin data table has a caption; heading rule; inventory in PR | Add one assertion per table template, in each page's existing njk test or a new one: `table caption` has length 1 with the expected text. Inventory table (section 2) copied into the PR. |
| 4.14 | Hidden applicant name in each View link; links list unique | `media-applications/index.njk.test.ts`: each `td a` text is "View application for {name}", all link texts are unique, and a name with `<b>` is rendered as escaped text. |
| 4.15 | Approve and Reject together, left-aligned, logical order | `[id]/index.njk.test.ts`: `.govuk-button-group` has length 1 and contains two `.govuk-button` in the order Approve, Reject; no inline `style` attribute. Zoom check is manual. |

## 5. Test Scenarios

E2E follows CLAUDE.md: extend the existing journey tests, do not add a test per validation. Use template tests for markup fixes.

**Unit / template tests (Vitest)**

1. **Location jurisdiction update renders unique, correctly labelled checkboxes** (4.1). Several jurisdiction groups plus regions; Welsh legends; key parity. New `index-dropdowns.njk.test.ts`; extend the controller `index.test.ts` for item ids.
2. **Upload validation links date errors to day inputs** (4.2). Missing, invalid and range errors for all three dates; both manual and non-strategic upload; audit log `#date-day`.
3. **Manual upload page structure** (4.2, 4.3, 4.4): sensitivity headings and their order, error summary hrefs that resolve to real inputs, the kept-file block, and the remove form being outside the main form. Same structural checks on non-strategic upload for 4.2 and 4.3.
4. **Manual upload keeps a valid file across validation errors** (4.4): controller tests for store, reuse, replace, remove, success cleanup, expiry, invalid files not kept, and the size-limit error not stored. Redis helper tests in `storage.test.ts`.
5. **Autocomplete has one label and one id** (4.5): including the no-label fallback, the fetch-failure path leaving the original input in place, and `aria-describedby` being copied.
6. **Location metadata empty submit shows five errors** (4.6): summary order, inline errors with aria-describedby, Welsh messages, one-field-filled passes, HTML-tag inline error, DB error shows summary only.
7. **Radios pages put the h1 in the legend** (4.7): jurisdiction-data, region-data, reference-data radios, including the error state (summary still above, `errorMessage` still linked).
8. **Admin tables have captions and non-empty headers** (4.12, 4.13): one assertion per table template in the inventory; audit log Actions header in English and Welsh.
9. **Blob explorer publications table is in a focusable scroll region** (4.8).
10. **Remove list summary sortable table** (4.10, 4.11): njk markup, controller sort/order whitelist (invalid values fall back to default instead of returning 500), and `sortable-table.test.ts` behaviour (buttons, aria-sort, data-sort-value, focus kept, unsortable columns skipped).
11. **Media applications list and applicant details** (4.9, 4.14, 4.15): unique View link names, escaping of name and filename, proof link name and new-tab text, button group order.

**E2E (extend existing journeys, no new spec files)**

12. `e2e-tests/tests/admin/manual-upload.spec.ts`, "complete manual upload journey…": submit with a file and missing dates. Click the hearing start date summary link and assert focus is on `#hearingStartDate-day`. Assert the uploaded file name is shown. Fill the dates and continue to the summary without uploading again. Run axe on the error state.
13. `e2e-tests/tests/admin/remove-publication.spec.ts`, "complete remove publication journey…": on Remove List Summary, check a box, activate the "Content Date" sort button with the keyboard, and assert focus stays on that button, `aria-sort` has changed and the box is still checked. Run axe.
14. `e2e-tests/tests/admin/media-application-management.spec.ts`, approval journey: get the View link by its full accessible name (`View application for <name>`). On the details page, assert the "View proof of ID (opens in new tab)" link and that both buttons are in the same button group. Re-enable the `link-name` axe rule that is currently disabled.
15. `e2e-tests/tests/system-admin/location-metadata.spec.ts`, existing journey: submit empty, assert the five summary messages and four inline errors, then repeat with `?lng=cy` and assert the Welsh messages. Run axe.
16. `e2e-tests/tests/system-admin/blob-explorer.spec.ts` (@nightly): set a 320px viewport on publications and assert the page does not scroll horizontally and the table region can be focused.
17. `e2e-tests/tests/system-admin/reference-data-management.spec.ts`, "system admin can update location jurisdiction data" (@nightly): run axe on `/location-jurisdiction-update` with no `duplicate-id` or `label` violations, and check a checkbox using `getByLabel("High Court")`.
18. `e2e-tests/tests/search.spec.ts`, existing search journey: run axe on the public search page after the autocomplete has loaded, with no duplicate-id or multiple-label violations.

## 6. Decisions (clarifications resolved 2026-11-26)

1. **4.6 ACs**: confirmed. The five-message mock-up is authoritative; "Enter at least one message" links to `#cautionMessage` (two summary links to the same field is accepted).
2. **Welsh text**: leave as English. Every new or changed string (4.6 error messages, "proof of ID", "(opens in new tab)", "application for", "Actions", all table captions, 4.4 kept-file strings) goes into `cy.ts` with the **English** text so key parity holds. No `[WELSH TRANSLATION REQUIRED]` placeholders. Existing Welsh strings that are not changing stay as they are.
3. **4.4 scope**:
   - Non-strategic upload: in scope — same keep-file behaviour.
   - JSON schema failure: the file is not kept; the user uploads again. Accepted.
   - Summary "Change" link: the file is not kept (current behaviour, no change), but stale pending references must be cleared.
4. **4.3 heading order**: move the "Warning" block below the `<h1>` on manual upload and non-strategic upload.
5. **4.7**: also fix `region-data` and `reference-data/index-radios`, aligned with Package 3.
6. **4.10**: links remain as the no-JS fallback. Accepted.
7. **4.8**: table scroll applies at all widths. Accepted.
8. **4.12**: switch to a visible "Actions" header.
9. **4.13 audit log detail**: keep it as a table with a caption and `firstCellIsHeader: true` (no summary list).
10. **4.1**: delete `index-accordions.njk` and the variant switch in this ticket.
11. **Public duplicate-ID pages** (`courts-tribunals-list`, `location-name-search`): leave — out of scope, no change and no follow-up ticket from this work.

No open clarifications remain.

### 4.4 revision (2026-11-26, user direction)

The kept file is restored into the native `<input type="file" id="file">` itself, not shown as separate text. Removed: the "Uploaded file: …" paragraph, the replace hint, the "Remove file" button and its separate form, the `removeFile` POST action and the three locale keys.

- `apps/web/src/assets/js/restore-file-upload.ts`: for an input with `data-pending-file-url`/`data-pending-file-name`, fetches the kept file and assigns it with `DataTransfer` so the browser shows the file name natively and resubmits it as a normal upload.
- `GET /manual-upload/pending-file` and `GET /non-strategic-upload/pending-file`: serve only the file referenced by the caller's own session (`sendPendingFile` in `libs/admin-pages/src/manual-upload/pending-file-download.ts`), `Cache-Control: no-store`, 404 when absent or expired.
- The server no longer silently reuses the kept file when the input is submitted empty: what is in the input is what is submitted. Replace = choose another file; remove = clear the input.
- Without JavaScript the input comes back empty (the previous behaviour); the kept file is a progressive enhancement.
