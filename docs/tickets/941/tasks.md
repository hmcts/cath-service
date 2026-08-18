# Tasks — #941 Excel download for Rolls Building hearing lists

> **Blocked:** #659 is still open. Nothing from it is on `master` —
> `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` is still a flat-file `CFT_IDAM` list type and
> `INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST` does not exist. Phase 1 and 2 can be built now
> (inert until the list types exist). Phase 3 onwards needs #659 merged.
> Also resolve clarification Q4 (web journey vs email-only) before starting Phase 2 —
> if the answer is email-only, Phases 2–4 drop out entirely.

## Phase 0 — Confirm scope

- [ ] Get an answer on Q4: web download journey required, or email links only?
- [ ] Get the exact `listTypeName` #659 will use for the Interim Applications (ChD) list (Q2)
- [ ] Confirm #659 makes `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` non-strategic Excel-upload (Q3)
- [ ] Confirm sequencing: land Phase 1+2 now vs wait for #659 (Q1)

## Phase 1 — Retain the uploaded workbook (buildable now)

- [ ] Create `libs/list-types/common/src/excel/excel-download-list-types.ts` with `EXCEL_DOWNLOAD_LIST_TYPE_NAMES` and `keepsUploadedExcel()`
- [ ] Export `keepsUploadedExcel` from `libs/list-types/common/src/index.ts`
- [ ] Write `libs/list-types/common/src/excel/excel-download-list-types.test.ts`, including the test that every allow-listed name resolves to an active `listTypeData` entry
- [ ] In `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts`, add `keepsUploadedExcel` + `saveExcelToStorage` to the existing dynamic `@hmcts/list-types-common` import
- [ ] Add the awaited `saveExcelToStorage(artefactId, uploadData.file)` call inside the non-strategic Excel branch, before `processPublication()`
- [ ] Replace the now-false comment `// Store converted JSON in blob — original Excel is not stored (no value after conversion)`
- [ ] Extend `non-strategic-upload-summary/index.test.ts`: buffer identity, allow-list gating, JSON-upload path, call ordering vs `processPublication`, additive behaviour, storage-failure re-render, `listTypeId: 999` fixture
- [ ] Add non-SJP PDF+Excel template-selection cases to `libs/notifications/src/notification/notification-service.test.ts`

## Phase 2 — Promote the SJP download helpers to shared (buildable now)

- [ ] Rename `apps/web/src/pages/(list-types)/sjp-download-shared.ts` → `list-download-shared.ts`
- [ ] Update the four importers: `sjp-press-list/{list-download-files,download}.ts`, `sjp-public-list/{list-download-files,download}.ts`
- [ ] Add the defaulted `template = "list-download-files"` parameter to `createListDownloadFilesHandler`
- [ ] Move `createRequireVerifiedWithProvenance` from `sjp-press-list/require-verified-with-provenance.ts` to `apps/web/src/pages/(list-types)/require-verified-with-provenance.ts` and update `sjp-press-list` imports
- [ ] Create `apps/web/src/pages/(list-types)/list-download/files.njk` (copy of `sjp-press-list/list-download-files.njk`)
- [ ] Create `apps/web/src/pages/(list-types)/list-download/disclaimer.njk` (copy of `sjp-press-list/list-download-disclaimer.njk`)
- [ ] Confirm no `index.ts` in `list-download/` so no route is created, and that `collectViewPaths` picks it up
- [ ] Run the existing SJP download tests unchanged — the rename must be behaviour-neutral

## Phase 3 — Rolls Building download journey (needs #659)

- [ ] Confirm the real `listTypeName` values and page directory names from merged #659; correct the allow-list if they differ
- [ ] Extend `RenderCallback` in `apps/web/src/pages/(list-types)/list-type-handler.ts` to pass `req`
- [ ] For each of the two page directories, add `require-verified.ts`, `list-download-disclaimer.ts`, `list-download-files.ts`, `download.ts`
- [ ] Add `downloadDisclaimerUrl` to each list's `index.ts` render (verified users only; skip blob probes otherwise)
- [ ] Add the "Download a copy" button block to each list's `.njk`
- [ ] Add `downloadCopy`, `disclaimer.*` and `downloadFiles.*` keys to both list-type libs' `en.ts`, copying the SJP wording verbatim
- [ ] Add the same keys to both `cy.ts`, reusing SJP Welsh where it exists and `[WELSH TRANSLATION REQUIRED: '...']` otherwise

## Phase 4 — Tests

- [ ] Unit tests for `list-download-disclaimer.ts`, `list-download-files.ts`, `download.ts` and the auth middleware on all three routes
- [ ] Template tests for the list page button (present **and** absent), `list-download/files.njk`, `list-download/disclaimer.njk`, Welsh renders, and locale key parity
- [ ] Parity test asserting the Excel converter config and PDF column set cover the same seven ChD/KB fields
- [ ] `e2e-tests/tests/rolls-building-list-download.spec.ts` (`@nightly`) — one journey with validation, Welsh, Axe and unverified-access checks inline
- [ ] Extend the existing non-strategic upload E2E with the Rolls Building publish → both formats offered leg

## Phase 5 — Verify

- [ ] `yarn lint:fix` and `yarn format` clean
- [ ] `yarn test` passing from the repo root
- [ ] `yarn test:e2e` passing
- [ ] Manually confirm on a local publish that `<artefactId>.xlsx` lands in the `PUBLICATIONS` container and the PDF+Excel Notify template is selected
- [ ] Raise the follow-up ticket for the non-SJP Excel-without-PDF email template (Q8)
