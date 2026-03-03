# Implementation Tasks: Issue #429 — GRC, WPAFCC & UTIAC Non-Strategic List Types

---

## Shared / Infrastructure

- [ ] Add 5 new list types to `libs/list-types/common/src/mock-list-types.ts` (IDs 24–28: GRC_WEEKLY_HEARING_LIST, WPAFCC_WEEKLY_HEARING_LIST, UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST, UTIAC_JR_LONDON_DAILY_HEARING_LIST, UTIAC_JR_LEEDS_DAILY_HEARING_LIST)

---

## Module: grc-weekly-hearing-list (ID 24)

- [ ] Create `libs/list-types/grc-weekly-hearing-list/package.json` (name `@hmcts/grc-weekly-hearing-list`, exports `.` and `./config`, build/test scripts including `build:nunjucks` and `build:schemas`)
- [ ] Create `libs/list-types/grc-weekly-hearing-list/tsconfig.json` (extends root, outDir `./dist`, rootDir `./src`, excludes test files and `src/assets/`)
- [ ] Create `libs/list-types/grc-weekly-hearing-list/src/config.ts` (exports `moduleRoot`, `pageRoutes` with prefix `/grc-weekly-hearing-list`)
- [ ] Create `libs/list-types/grc-weekly-hearing-list/src/index.ts` (side-effect import of `conversion/grc-config.js`; re-exports from email-summary, models/types, pdf-generator, renderer)
- [ ] Create `libs/list-types/grc-weekly-hearing-list/src/models/types.ts` (`GrcWeeklyHearing` interface with all 9 fields; `GrcWeeklyHearingList` array type alias)
- [ ] Create `libs/list-types/grc-weekly-hearing-list/src/conversion/grc-config.ts` (`GRC_EXCEL_CONFIG` with date, hearingTime, caseReferenceNumber, caseName, judges, members (optional), modeOfHearing, venue, additionalInformation (optional) fields and validators; registers converter for listTypeId 24)
- [ ] Create `libs/list-types/grc-weekly-hearing-list/src/schemas/grc-weekly-hearing-list.json` (JSON Schema draft-07 array; required: date, hearingTime, caseReferenceNumber, caseName, judges, modeOfHearing, venue; optional: members, additionalInformation; DD/MM/YYYY pattern on date; no-html pattern on string fields)
- [ ] Create `libs/list-types/grc-weekly-hearing-list/src/rendering/renderer.ts` (`renderGrcData` function returning `{ header: { listTitle, weekCommencingDate, lastUpdatedDate, lastUpdatedTime }, hearings }` with formatted date per row)
- [ ] Create `libs/list-types/grc-weekly-hearing-list/src/email-summary/summary-builder.ts` (`extractCaseSummary` returning `[Date, Time, CaseReferenceNumber]` tuples)
- [ ] Create `libs/list-types/grc-weekly-hearing-list/src/pdf/pdf-generator.ts` (`generateGrcWeeklyHearingListPdf` function following the CST pattern)
- [ ] Create `libs/list-types/grc-weekly-hearing-list/src/pdf/pdf-template.njk` (standalone HTML PDF template with all 9 column headers and GRC important-information accordion text)
- [ ] Create `libs/list-types/grc-weekly-hearing-list/src/pages/grc-weekly-hearing-list.njk` (extends `layouts/base-template.njk`, `page_content` block, table with 9 columns, `case-search-input`, GRC `<details>` accordion with two paragraphs and two links)
- [ ] Create `libs/list-types/grc-weekly-hearing-list/src/pages/en.ts` (all English content: pageTitle, column headers, GRC opening-statement text and link texts/URLs, caution notes, provenanceLabels)
- [ ] Create `libs/list-types/grc-weekly-hearing-list/src/pages/cy.ts` (mirrors `en.ts` structure; use "Welsh placeholder" for untranslated strings)
- [ ] Create `libs/list-types/grc-weekly-hearing-list/src/pages/index.ts` (GET handler: validates artefactId, reads JSON, validates schema, calls `renderGrcData`, renders template)
- [ ] Write unit tests for `src/conversion/grc-config.ts` (valid row passes; missing required field throws; HTML in field throws; invalid date throws; invalid time throws)
- [ ] Write unit tests for `src/rendering/renderer.ts` (correct header fields; dates formatted; optional fields pass through as empty string)
- [ ] Write unit tests for `src/email-summary/summary-builder.ts` (correct three-field tuples extracted)
- [ ] Write unit tests for `src/pdf/pdf-generator.ts` (returns success result with buffer; handles render error gracefully)
- [ ] Write unit tests for `src/pages/index.ts` (400 on missing artefactId; 404 on missing artefact; 400 on schema failure; 200 renders template with correct data)

---

## Module: wpafcc-weekly-hearing-list (ID 25)

- [ ] Create `libs/list-types/wpafcc-weekly-hearing-list/package.json` (name `@hmcts/wpafcc-weekly-hearing-list`, same scripts as GRC module)
- [ ] Create `libs/list-types/wpafcc-weekly-hearing-list/tsconfig.json`
- [ ] Create `libs/list-types/wpafcc-weekly-hearing-list/src/config.ts` (exports `moduleRoot`, `pageRoutes` with prefix `/wpafcc-weekly-hearing-list`)
- [ ] Create `libs/list-types/wpafcc-weekly-hearing-list/src/index.ts`
- [ ] Create `libs/list-types/wpafcc-weekly-hearing-list/src/models/types.ts` (`WpafccWeeklyHearing` interface with same 9 fields as GRC; `WpafccWeeklyHearingList` array type alias)
- [ ] Create `libs/list-types/wpafcc-weekly-hearing-list/src/conversion/wpafcc-config.ts` (identical field config to GRC; registers converter for listTypeId 25)
- [ ] Create `libs/list-types/wpafcc-weekly-hearing-list/src/schemas/wpafcc-weekly-hearing-list.json` (identical structure to GRC schema)
- [ ] Create `libs/list-types/wpafcc-weekly-hearing-list/src/rendering/renderer.ts` (`renderWpafccData` function)
- [ ] Create `libs/list-types/wpafcc-weekly-hearing-list/src/email-summary/summary-builder.ts` (`extractCaseSummary` returning `[Date, Time, CaseReferenceNumber]` tuples)
- [ ] Create `libs/list-types/wpafcc-weekly-hearing-list/src/pdf/pdf-generator.ts` (`generateWpafccWeeklyHearingListPdf`)
- [ ] Create `libs/list-types/wpafcc-weekly-hearing-list/src/pdf/pdf-template.njk` (WPAFCC important-information text: observer/media email paragraph and one observe-a-hearing link)
- [ ] Create `libs/list-types/wpafcc-weekly-hearing-list/src/pages/wpafcc-weekly-hearing-list.njk` (same table columns as GRC; WPAFCC-specific accordion: one paragraph with armedforces.listing@justice.gov.uk email and one observe-a-hearing link)
- [ ] Create `libs/list-types/wpafcc-weekly-hearing-list/src/pages/en.ts` (WPAFCC English content including WPAFCC-specific opening-statement text and link)
- [ ] Create `libs/list-types/wpafcc-weekly-hearing-list/src/pages/cy.ts`
- [ ] Create `libs/list-types/wpafcc-weekly-hearing-list/src/pages/index.ts` (GET handler)
- [ ] Write unit tests for `src/conversion/wpafcc-config.ts`
- [ ] Write unit tests for `src/rendering/renderer.ts`
- [ ] Write unit tests for `src/email-summary/summary-builder.ts`
- [ ] Write unit tests for `src/pdf/pdf-generator.ts`
- [ ] Write unit tests for `src/pages/index.ts`

---

## Module: utiac-statutory-appeal-daily-hearing-list (ID 26)

- [ ] Create `libs/list-types/utiac-statutory-appeal-daily-hearing-list/package.json` (name `@hmcts/utiac-statutory-appeal-daily-hearing-list`, same scripts)
- [ ] Create `libs/list-types/utiac-statutory-appeal-daily-hearing-list/tsconfig.json`
- [ ] Create `libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/config.ts` (exports `moduleRoot`, `pageRoutes` with prefix `/utiac-statutory-appeal-daily-hearing-list`)
- [ ] Create `libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/index.ts`
- [ ] Create `libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/models/types.ts` (`UtiacStatutoryAppealHearing` interface: hearingTime, appellant, representative (optional), appealReferenceNumber, judges, hearingType, location, additionalInformation (optional); array type alias)
- [ ] Create `libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/conversion/utiac-sa-config.ts` (fields: hearingTime (required, validateTimeFormatSimple), appellant (required), representative (optional), appealReferenceNumber (required), judges (required), hearingType (required), location (required), additionalInformation (optional); registers converter for listTypeId 26)
- [ ] Create `libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/schemas/utiac-statutory-appeal-daily-hearing-list.json` (required: hearingTime, appellant, appealReferenceNumber, judges, hearingType, location; optional: representative, additionalInformation; no-html pattern on all string fields)
- [ ] Create `libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/rendering/renderer.ts` (`renderUtiacSaData` function; header uses `displayFrom` formatted as date; no per-row date formatting since date comes from artefact)
- [ ] Create `libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/email-summary/summary-builder.ts` (`extractCaseSummary` returning `[Date (artefact displayFrom), Time (hearingTime), Appeal Reference Number]` tuples; date passed in as parameter)
- [ ] Create `libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/pdf/pdf-generator.ts` (`generateUtiacSaDailyHearingListPdf`)
- [ ] Create `libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/pdf/pdf-template.njk` (UTIAC SA columns: Hearing Time, Appellant, Representative, Appeal Reference Number, Judge(s), Hearing Type, Location, Additional Information; UTIAC SA important-information text: 5pm update paragraph, email paragraph, observe-a-hearing link)
- [ ] Create `libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/pages/utiac-statutory-appeal-daily-hearing-list.njk` (table with 8 columns; UTIAC SA accordion: two paragraphs + one link)
- [ ] Create `libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/pages/en.ts` (UTIAC SA English content; daily-list header label instead of weekCommencing)
- [ ] Create `libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/pages/cy.ts`
- [ ] Create `libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/pages/index.ts` (GET handler; pass `artefact.displayFrom` to `renderUtiacSaData` as the list date)
- [ ] Write unit tests for `src/conversion/utiac-sa-config.ts`
- [ ] Write unit tests for `src/rendering/renderer.ts`
- [ ] Write unit tests for `src/email-summary/summary-builder.ts`
- [ ] Write unit tests for `src/pdf/pdf-generator.ts`
- [ ] Write unit tests for `src/pages/index.ts`

---

## Module: utiac-jr-london-daily-hearing-list (ID 27)

- [ ] Create `libs/list-types/utiac-jr-london-daily-hearing-list/package.json` (name `@hmcts/utiac-jr-london-daily-hearing-list`)
- [ ] Create `libs/list-types/utiac-jr-london-daily-hearing-list/tsconfig.json`
- [ ] Create `libs/list-types/utiac-jr-london-daily-hearing-list/src/config.ts` (prefix `/utiac-jr-london-daily-hearing-list`)
- [ ] Create `libs/list-types/utiac-jr-london-daily-hearing-list/src/index.ts`
- [ ] Create `libs/list-types/utiac-jr-london-daily-hearing-list/src/models/types.ts` (`UtiacJrLondonHearing` interface: hearingTime, caseTitle, representative (optional), caseReferenceNumber, judges, hearingType, location, additionalInformation (optional); array type alias)
- [ ] Create `libs/list-types/utiac-jr-london-daily-hearing-list/src/conversion/utiac-jr-london-config.ts` (fields in column order: hearingTime (required, validateTimeFormatSimple), caseTitle (required), representative (optional), caseReferenceNumber (required), judges (required), hearingType (required), location (required), additionalInformation (optional); registers converter for listTypeId 27)
- [ ] Create `libs/list-types/utiac-jr-london-daily-hearing-list/src/schemas/utiac-jr-london-daily-hearing-list.json` (required: hearingTime, caseTitle, caseReferenceNumber, judges, hearingType, location; optional: representative, additionalInformation; no-html pattern on all string fields)
- [ ] Create `libs/list-types/utiac-jr-london-daily-hearing-list/src/rendering/renderer.ts` (`renderUtiacJrLondonData` function)
- [ ] Create `libs/list-types/utiac-jr-london-daily-hearing-list/src/email-summary/summary-builder.ts` (`extractCaseSummary` returning `[Date (artefact displayFrom), Time, Case Reference Number]` tuples)
- [ ] Create `libs/list-types/utiac-jr-london-daily-hearing-list/src/pdf/pdf-generator.ts` (`generateUtiacJrLondonDailyHearingListPdf`)
- [ ] Create `libs/list-types/utiac-jr-london-daily-hearing-list/src/pdf/pdf-template.njk` (columns: Hearing Time, Case Title, Representative, Case Reference Number, Judge(s), Hearing Type, Location, Additional Information; UTIAC JR important-information: "subject to change until 4:30pm" paragraph + observe-a-hearing link)
- [ ] Create `libs/list-types/utiac-jr-london-daily-hearing-list/src/pages/utiac-jr-london-daily-hearing-list.njk` (table with 8 columns; UTIAC JR accordion)
- [ ] Create `libs/list-types/utiac-jr-london-daily-hearing-list/src/pages/en.ts`
- [ ] Create `libs/list-types/utiac-jr-london-daily-hearing-list/src/pages/cy.ts`
- [ ] Create `libs/list-types/utiac-jr-london-daily-hearing-list/src/pages/index.ts` (GET handler)
- [ ] Write unit tests for `src/conversion/utiac-jr-london-config.ts`
- [ ] Write unit tests for `src/rendering/renderer.ts`
- [ ] Write unit tests for `src/email-summary/summary-builder.ts`
- [ ] Write unit tests for `src/pdf/pdf-generator.ts`
- [ ] Write unit tests for `src/pages/index.ts`

---

## Module: utiac-jr-leeds-daily-hearing-list (ID 28)

- [ ] Create `libs/list-types/utiac-jr-leeds-daily-hearing-list/package.json` (name `@hmcts/utiac-jr-leeds-daily-hearing-list`)
- [ ] Create `libs/list-types/utiac-jr-leeds-daily-hearing-list/tsconfig.json`
- [ ] Create `libs/list-types/utiac-jr-leeds-daily-hearing-list/src/config.ts` (prefix `/utiac-jr-leeds-daily-hearing-list`)
- [ ] Create `libs/list-types/utiac-jr-leeds-daily-hearing-list/src/index.ts`
- [ ] Create `libs/list-types/utiac-jr-leeds-daily-hearing-list/src/models/types.ts` (`UtiacJrLeedsHearing` interface: venue, judges, hearingTime, caseReferenceNumber, caseTitle, hearingType, additionalInformation (optional); array type alias)
- [ ] Create `libs/list-types/utiac-jr-leeds-daily-hearing-list/src/conversion/utiac-jr-leeds-config.ts` (fields in column order: venue (required), judges (required), hearingTime (required, validateTimeFormatSimple), caseReferenceNumber (required), caseTitle (required), hearingType (required), additionalInformation (optional); registers converter for listTypeId 28)
- [ ] Create `libs/list-types/utiac-jr-leeds-daily-hearing-list/src/schemas/utiac-jr-leeds-daily-hearing-list.json` (required: venue, judges, hearingTime, caseReferenceNumber, caseTitle, hearingType; optional: additionalInformation; no-html pattern on all string fields)
- [ ] Create `libs/list-types/utiac-jr-leeds-daily-hearing-list/src/rendering/renderer.ts` (`renderUtiacJrLeedsData` function)
- [ ] Create `libs/list-types/utiac-jr-leeds-daily-hearing-list/src/email-summary/summary-builder.ts` (`extractCaseSummary` returning `[Date (artefact displayFrom), Time, Case Reference Number]` tuples)
- [ ] Create `libs/list-types/utiac-jr-leeds-daily-hearing-list/src/pdf/pdf-generator.ts` (`generateUtiacJrLeedsDailyHearingListPdf`)
- [ ] Create `libs/list-types/utiac-jr-leeds-daily-hearing-list/src/pdf/pdf-template.njk` (columns: Venue, Judge(s), Hearing Time, Case Reference Number, Case Title, Hearing Type, Additional Information; UTIAC JR important-information: "subject to change until 4:30pm" paragraph + observe-a-hearing link — same text as London)
- [ ] Create `libs/list-types/utiac-jr-leeds-daily-hearing-list/src/pages/utiac-jr-leeds-daily-hearing-list.njk` (table with 7 columns; UTIAC JR accordion)
- [ ] Create `libs/list-types/utiac-jr-leeds-daily-hearing-list/src/pages/en.ts`
- [ ] Create `libs/list-types/utiac-jr-leeds-daily-hearing-list/src/pages/cy.ts`
- [ ] Create `libs/list-types/utiac-jr-leeds-daily-hearing-list/src/pages/index.ts` (GET handler)
- [ ] Write unit tests for `src/conversion/utiac-jr-leeds-config.ts`
- [ ] Write unit tests for `src/rendering/renderer.ts`
- [ ] Write unit tests for `src/email-summary/summary-builder.ts`
- [ ] Write unit tests for `src/pdf/pdf-generator.ts`
- [ ] Write unit tests for `src/pages/index.ts`

---

## Registration

- [ ] Add 5 new path aliases to root `tsconfig.json` `paths` (one per module, mapping `@hmcts/<module-name>` to `libs/list-types/<module-name>/src`)
- [ ] Add 5 new import pairs to `apps/web/src/app.ts` top-of-file imports (import `moduleRoot` and `pageRoutes` from each module's `/config` path)
- [ ] Add all 5 new `moduleRoot` values to the `modulePaths` array in `apps/web/src/app.ts`
- [ ] Add 5 new `createSimpleRouter` calls to the "list type routes" block in `apps/web/src/app.ts`

---

## E2E Tests

- [ ] Add E2E test for `grc-weekly-hearing-list` in `e2e-tests/` (tagged `@nightly`): navigate to page with a valid artefactId, assert list title visible, test Welsh via `?lng=cy`, run axe accessibility scan, assert all 9 table column headers are present)
- [ ] Add E2E test for `wpafcc-weekly-hearing-list` (tagged `@nightly`): same journey pattern; assert WPAFCC-specific accordion text and armedforces.listing@justice.gov.uk email link is visible
- [ ] Add E2E test for `utiac-statutory-appeal-daily-hearing-list` (tagged `@nightly`): assert daily list title, 8 column headers, UTIAC SA accordion text, Welsh, accessibility
- [ ] Add E2E test for `utiac-jr-london-daily-hearing-list` (tagged `@nightly`): assert 8 column headers, "subject to change until 4:30pm" accordion text, Welsh, accessibility
- [ ] Add E2E test for `utiac-jr-leeds-daily-hearing-list` (tagged `@nightly`): assert 7 column headers, "subject to change until 4:30pm" accordion text (shared with London), Welsh, accessibility
