# Tasks: #1623 – [A11y] Package 4: System and local admin journey

## Implementation Tasks

### Before starting
- [x] Clarifications resolved — see `plan.md` section 6 (Decisions)
- Welsh rule for this ticket: every new or changed string goes into `cy.ts` with the English text

---

### 4a – Admin forms and uploads

#### 4.1 – Duplicate checkbox IDs
- [x] `location-jurisdiction-update/index.ts`: add `id: subJurisdiction-{subJurisdictionId}` to sub-jurisdiction items and `id: region-{regionId}` to region items
- [x] `location-jurisdiction-update/index-dropdowns.njk`: add a per-group `idPrefix` (`subJurisdictionIds-{{ loop.index }}`) and `idPrefix: "regionIds"`
- [x] Delete `location-jurisdiction-update/index-accordions.njk`; remove `LOCATION_JURISDICTION_UPDATE_VARIANT` from `index.ts` and render `index-dropdowns` directly
- [x] Extend `location-jurisdiction-update/index.test.ts` to assert the item ids and the template name
- [x] New `location-jurisdiction-update/index-dropdowns.njk.test.ts`: all checkbox ids unique, every `label[for]` resolves to exactly one input, Welsh legends (Scenario 1)

#### 4.2 – Date error-summary links target the day input
- [x] `libs/admin-pages/src/manual-upload/validation.ts`: `validateDate` hrefs become `#${fieldName}-day`; `validateDateRange` href becomes `#displayTo-day`
- [x] `manual-upload/index.njk` and `non-strategic-upload/index.njk`: update the `getError(...)` lookups to the `-day` hrefs
- [x] `audit-log-list/index.ts`: change `href: "#day"` to `"#date-day"` (both places); add the error class to the date items in `index.njk`
- [x] Update `validation.test.ts`, the manual and non-strategic upload `index.njk.test.ts` fixtures and assertions (every summary href resolves to an input), and `audit-log-list/index.test.ts` (Scenario 2)

#### 4.3 – Sensitivity headings
- [x] `manual-upload/index.njk`: replace the 3 × `<strong>` sensitivity labels with `<h4 class="govuk-heading-s">` followed by a `<p>`
- [x] `non-strategic-upload/index.njk`: same change
- [x] Both pages: move the "Warning" block below the `<h1>`
- [x] Njk tests on both pages: 3 × `aside h4`, no `aside strong`, heading order h2, h3, h4, first heading in `main` is the h1 (Scenario 3)

#### 4.4 – Keep the uploaded file on validation error
- [x] `libs/admin-pages/src/manual-upload/storage.ts`: add the `storePendingFile` / `getPendingFile` / `deletePendingFile` Redis helpers (TTL) and export them from `index.ts`
- [x] `storage.test.ts`: tests for the new helpers
- [x] `libs/admin-pages/src/manual-upload/model.ts`: add `manualUploadPendingFile` to the session typing and `nonStrategicUploadPendingFile`
- [x] `manual-upload/index.ts` POST: keep a valid file when only non-file errors occur; reuse the pending file when no new file is chosen; replace it when a new file is chosen; delete it on success; handle `action=removeFile`; never keep a file that fails size, type or schema checks
- [x] `manual-upload/index.ts` GET: pass `pendingFileName`; clear the pending reference using the same refresh rule as the form data
- [x] `manual-upload/index.njk`: kept-file text, a replace hint linked by `aria-describedby`, and a "Remove file" button in a separate form using the `form=` attribute
- [x] `manual-upload/en.ts` and `cy.ts`: add `uploadedFileLabel`, `replaceFileHint`, `removeFileButton`
- [x] Controller tests: store, reuse, replace, remove, success cleanup, expiry, invalid file not kept, size-limit error not stored (Scenario 4)
- [x] Njk test: kept-file block rendered, remove form is outside the main form (Scenario 3)
- [x] Apply the same to `non-strategic-upload/index.ts`, `index.njk`, `en.ts`, `cy.ts`, with controller and njk tests
- [x] Both pages: clear any pending-file reference when arriving from the summary "Change" link (file is not kept on Change)

#### 4.5 – Typeahead single label and unique id
- [x] `apps/web/src/assets/js/search-autocomplete.ts`: remove the visually hidden "Search" label injection
- [x] Same file: remove the original input from the DOM after successful setup (removes the duplicate id); copy its `aria-describedby` onto the autocomplete input
- [x] Rewrite `search-autocomplete.test.ts` label tests: no wrapper label, one `label[for]`, one element per id, `aria-describedby` copied, no-label fallback, fetch-failure path keeps the original input (Scenario 5)

#### 4.6 – Location metadata per-field errors
- [x] `location-metadata-manage/en.ts` and `cy.ts`: add the four field-required messages (English text in `cy.ts`)
- [x] `location-metadata-manage/index.ts`: build all five errors on an empty create or update, put HTML-tag errors inline, pass `fieldErrors`; the DB error stays summary-only
- [x] `location-metadata-manage/index.njk`: `errorMessage` on each of the four textareas
- [x] `index.test.ts`: five errors in order, one filled field passes, HTML-tag inline error, Welsh (Scenario 6)
- [x] `index.njk.test.ts`: `assertErrorSummary` with five messages, inline errors and `aria-describedby`, Welsh render, locale key parity (Scenario 6)

#### 4.7 – Page heading inside the legend
- [x] `jurisdiction-data/index.njk`: remove the `<h1>`; legend uses `isPageHeading: true` with `govuk-fieldset__legend--l`
- [x] `region-data/index.njk`: same change
- [x] `reference-data/index-radios.njk`: same change
- [x] New njk tests for all three: one `h1`, inside `legend`, no visually hidden legend, error state still correct (Scenario 7)

#### 4a – E2E
- [x] Extend `e2e-tests/tests/admin/manual-upload.spec.ts` main journey: date summary link focuses `#hearingStartDate-day`, file name kept, resubmit reaches the summary without uploading again, axe on the error state (Scenario 12) — written; not run locally (SSO redirect URI blocked)
- [x] Extend `e2e-tests/tests/system-admin/location-metadata.spec.ts` journey: five summary errors and four inline errors, Welsh, axe (Scenario 15) — written; not run locally (SSO redirect URI blocked)
- [x] Extend `e2e-tests/tests/system-admin/reference-data-management.spec.ts` "update location jurisdiction data": axe with no duplicate-id or label violations, `getByLabel` on a checkbox (Scenario 17) — written; not run locally (SSO redirect URI blocked)
- [x] Extend `e2e-tests/tests/search.spec.ts` journey: axe after the autocomplete has loaded (Scenario 18) — written; not run locally (SSO redirect URI blocked)

---

### 4b – Admin tables and media applications

#### 4.8 – Table-only horizontal scroll
- [x] `apps/web/src/assets/css/admin-pages.scss`: add `.app-table-scroll` (`overflow-x: auto`, `:focus-visible` outline)
- [x] `blob-explorer-publications/index.njk`: wrap the table in `.app-table-scroll` with `tabindex="0" role="region" aria-label=caption`
- [x] `blob-explorer-publications/index.njk.test.ts`: wrapper attributes (Scenario 9)
- [x] Extend `e2e-tests/tests/system-admin/blob-explorer.spec.ts` (@nightly): 320px viewport has no page horizontal scroll and the region can be focused (Scenario 16)

#### 4.10 + 4.11 – Sortable table buttons and focus (one change)
- [x] `remove-list-search-results/index.njk`: add `data-module="moj-sortable-table"`, set the default column's `aria-sort="descending"`, add `data-sort-value` on content date cells, keep the links as the no-JS fallback
- [x] `remove-list-search-results/index.ts`: whitelist `sort` and `order`; pass the raw ISO content date
- [x] `apps/web/src/assets/js/sortable-table.ts`: support `data-sort-value` and numeric compare; respect the initial `aria-sort`; keep or restore focus on the clicked button
- [x] New `apps/web/src/assets/js/sortable-table.test.ts`: buttons replace the header content, `aria-sort` updates, sort-value ordering, focus kept, unsortable columns skipped (Scenario 10)
- [x] Update `remove-list-search-results/index.njk.test.ts` and `index.test.ts`: data-module, default aria-sort, invalid sort falls back to the default (Scenario 10)
- [x] Extend `e2e-tests/tests/admin/remove-publication.spec.ts` journey: keyboard sort keeps focus on the button, `aria-sort` changes, checkbox stays checked, axe (Scenario 13)

#### 4.12 – Audit log empty header
- [x] `audit-log-list/en.ts` and `cy.ts`: add `tableHeaders.actions` ("Actions" in both files)
- [x] `audit-log-list/index.ts` and `index.njk`: visible Actions header replaces the visually hidden "View"
- [x] `audit-log-list/index.njk.test.ts`: every `th` has visible text, in English and Welsh (Scenario 8)

#### 4.13 – Captions on every admin table
- [x] Add `tableCaption` keys (`en.ts` / `cy.ts`) and captions for each table in the plan inventory (rows 1–18), visually hidden where they would repeat the h1
- [x] `remove-list-search-results`: turn the `subHeading` h2 into a visible caption
- [x] `reference-data-upload-summary`: turn the `previewTitle` h2 into a visible caption
- [x] `audit-log-detail`: caption plus `firstCellIsHeader: true` (stays a table)
- [x] Check each action column in the swept tables for empty headers
- [x] Add a caption assertion to each affected page's njk test, creating the test file where missing (Scenario 8)
- [ ] Copy the table inventory into the PR description

#### 4.14 – Specific "View" links on Select application to assess
- [x] `media-applications/en.ts` and `cy.ts`: add `viewLinkHidden`; pass it from `media-applications/index.ts`
- [x] `media-applications/index.njk`: link text becomes `View<span class="govuk-visually-hidden"> application for {{ app.name | escape }}</span>`
- [x] `media-applications/index.njk.test.ts`: unique link names, name escaped, table caption (Scenario 11)

#### 4.9 – Proof-of-ID link name
- [x] `media-applications/[id]/en.ts` and `cy.ts`: add `viewProofOfIdHidden`; change `proofOfIdText` to "(opens in new tab)"
- [x] `media-applications/[id]/index.njk`: remove `aria-label`; link text becomes "View" + hidden "proof of ID" + "(opens in new tab)"; escape `proofOfIdFilename`; remove the inline style
- [x] `[id]/index.njk.test.ts`: no aria-label, accessible text, target kept, filename escaped (Scenario 11)

#### 4.15 – Approve and Reject grouped
- [x] `media-applications/[id]/index.njk`: replace the flex `space-between` with a `govuk-button-group` holding the Approve and Reject `govukButton` hrefs, in that order
- [x] `[id]/index.njk.test.ts`: one button group, order Approve then Reject, no inline style (Scenario 11)
- [x] Extend `e2e-tests/tests/admin/media-application-management.spec.ts` approval journey: View link by full accessible name, proof link name, button group, re-enable the `link-name` axe rule (Scenario 14)

---

### Definition of done
- [x] `yarn test` and `yarn lint:fix` pass (only failures: ui-baseline local `.claude` dir + flaky timing test, both unrelated)
- [ ] `yarn test:e2e` passes (plus the relevant `@nightly` specs)
- [ ] Manual axe, JAWS/NVDA, Dragon and 400% zoom checks on the pages listed per item
- [ ] Every new or changed string present in `cy.ts` (English text) with key parity
