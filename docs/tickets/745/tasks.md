# Implementation Tasks: Add PNC ID to Magistrates Standard List (#745)

## Implementation Tasks

- [ ] Create `libs/list-types/magistrates-standard-list/` directory structure (package.json, tsconfig.json)
- [ ] Create `libs/list-types/magistrates-standard-list/src/config.ts` (moduleRoot, assets exports)
- [ ] Create `libs/list-types/magistrates-standard-list/src/index.ts` (business logic exports)
- [ ] Create `libs/list-types/magistrates-standard-list/src/schemas/magistrates-standard-list.json` with optional `asn` and `pncId` string fields at case/defendant level
- [ ] Create `libs/list-types/magistrates-standard-list/src/magistrates-standard-list/en.ts` with `asnHeader` and `pncIdHeader` labels
- [ ] Create `libs/list-types/magistrates-standard-list/src/magistrates-standard-list/cy.ts` with Welsh equivalents (confirm Welsh translation with team)
- [ ] Create `libs/list-types/magistrates-standard-list/src/validation/json-validator.ts`
- [ ] Write unit tests in `libs/list-types/magistrates-standard-list/src/validation/json-validator.test.ts` (valid payload with pncId, valid without pncId, invalid with HTML injection in pncId)
- [ ] Register `MAGISTRATES_STANDARD_LIST` in `libs/location/src/list-type-data.ts` (confirm id, subJurisdictionIds)
- [ ] Register `@hmcts/magistrates-standard-list` path alias in root `tsconfig.json`
- [ ] Register module in `apps/web/src/app.ts` modulePaths array
- [ ] Create `apps/web/src/pages/(list-types)/magistrates-standard-list/index.ts` controller (load JSON, validate, render with locale support)
- [ ] Create `apps/web/src/pages/(list-types)/magistrates-standard-list/magistrates-standard-list.njk` template with ASN row followed by conditional PNC ID row using govukSummaryList
- [ ] Write controller unit tests in `apps/web/src/pages/(list-types)/magistrates-standard-list/index.test.ts`
- [ ] Handle PDF: add PNC ID to PDF template if server-generated, or confirm publisher uploads pre-rendered PDF (resolve open question first)
- [ ] Handle CSV: add PNC ID column adjacent to ASN if server-generated, or confirm publisher uploads CSV (resolve open question first)
- [ ] Write E2E test in `e2e-tests/` covering: view list with PNC ID present (renders below ASN), view list with PNC ID absent (row omitted), Welsh rendering, inline accessibility check
