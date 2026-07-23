# #802 Commercial Court (KB) daily cause list — Tasks

## Implementation Tasks

### 1. Scaffold the library
- [ ] Create `libs/list-types/commercial-court-kb-daily-cause-list/` directory tree
- [ ] Add `package.json` (name `@hmcts/commercial-court-kb-daily-cause-list`, copy scripts/deps from admin court, keep `build:nunjucks` + `build:schemas`)
- [ ] Add `tsconfig.json` (extends root, excludes tests + assets)
- [ ] Register path in root `tsconfig.json` paths
- [ ] Add `"@hmcts/commercial-court-kb-daily-cause-list": "workspace:*"` to `apps/web/package.json`
- [ ] Add the same workspace dependency to `libs/publication/package.json`
- [ ] Run `yarn install` to link the new workspace

### 2. Library source (business logic)
- [ ] `src/config.ts` — export `moduleRoot`, `assets`, `schemaPath`
- [ ] `src/models/types.ts` — `CommercialCourtKbHearing` (judge, time, venue, type, caseNumber, caseName, additionalInformation) + list alias
- [ ] `src/schemas/commercial-court-kb-daily-cause-list.json` — root array; required judge/time/venue/type/caseNumber/caseName; additionalInformation optional; HTML-tag + time patterns
- [ ] `src/validation/json-validator.ts` — `validateCommercialCourtKbDailyCauseList`
- [ ] `src/conversion/commercial-court-kb-daily-cause-list-config.ts` — bespoke `ExcelConverterConfig` in ticket field order + `registerConverterByName("COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST", …)` (DO NOT reuse RCJ_EXCEL_CONFIG)
- [ ] `src/rendering/renderer.ts` — `renderCommercialCourtKb` using shared date/normalisation helpers
- [ ] `src/locales/en.ts` — page title, `common` block, `tableHeaders` in ticket order
- [ ] `src/locales/cy.ts` — Welsh mirror; mark unknowns `[WELSH TRANSLATION REQUIRED: "..."]`
- [ ] `src/pdf/pdf-template.njk` — table with the 7 columns in ticket order
- [ ] `src/pdf/pdf-generator.ts` — `generateCommercialCourtKbDailyCauseListPdf`, `listTypeName: string`, single-entry title map + fallback
- [ ] `src/index.ts` — side-effect import of conversion config; export locales, models, renderer, pdf generator, and the `validate*` function (required by CI guard)

### 3. Library tests
- [ ] `validation/json-validator.test.ts` — one `it` per required field + optional-field + HTML-tag + bad-time; valid fixture = ticket sample (deep-cloned per test)
- [ ] `conversion/…-config.test.ts` — field order, required/optional split, time validator accept/reject, HTML rejection, row number in message
- [ ] `rendering/renderer.test.ts` — en/cy, empty list, time normalisation, field preservation, last-updated formatting
- [ ] `pdf/pdf-generator.test.ts` — success, render options, failure, missing buffer, renderer exception, fallback title

### 4. Web page
- [ ] Create `apps/web/src/pages/(list-types)/commercial-court-kb-daily-cause-list/`
- [ ] `index.ts` — single-list handler, validate, guard on `listTypeName`, render, resolve dataSource; optional `ROUTES = ["/commercial-court-kb-daily-cause-list"]`
- [ ] `commercial-court-kb-daily-cause-list.njk` — extend base-template, FACT link, important-information details, search box, table (7 columns ticket order), data source, back-to-top
- [ ] `index.test.ts` — controller: success (en + cy), missing artefactId 400, not found 404, unsupported type 400, blob missing 404, invalid data 400, server error 500, provenance label; artefacts use `listTypeId: 999`
- [ ] `commercial-court-kb-daily-cause-list.njk.test.ts` — structure via Cheerio, COLUMN index constant, Welsh render, locale-key parity

### 5. Wire into apps
- [ ] `apps/web/src/app.ts` — import `moduleRoot as commercialCourtKbModuleRoot` from `/config`; add to `modulePaths`
- [ ] `apps/web/src/app.test.ts` — add `vi.mock("@hmcts/commercial-court-kb-daily-cause-list/config", …)`
- [ ] `apps/web/src/pages/(admin)/non-strategic-upload/index.ts` — add side-effect `import "@hmcts/commercial-court-kb-daily-cause-list";`
- [ ] `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts` — add the same side-effect import

### 6. Publication (PDF/Excel download)
- [ ] `libs/publication/src/processing/service.ts` — import type + generator; add `commercialCourtKbGenerator`; register `COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST` in `PDF_GENERATOR_REGISTRY`
- [ ] `libs/publication/src/processing/service.test.ts` — mock the new lib; assert dispatch to the new generator

### 7. Reference / seed data
- [ ] `libs/list-types/common/src/list-type-data.ts` — add entry (name, friendly names, provenance CFT_IDAM, urlPath `commercial-court-kb-daily-cause-list`, isNonStrategic true, sensitivity Public, subJurisdictionIds `[1]`)
- [ ] `libs/list-types/common/src/list-type-data.test.ts` — assert new entry + uniqueness
- [ ] `e2e-tests/utils/seed-list-types.ts` — add to `BASE_LIST_TYPES`
- [ ] Run `yarn db:generate` / reseed locally to confirm the list type appears in the upload dropdown

### 8. E2E
- [ ] `e2e-tests/tests/commercial-court-kb-daily-cause-list.spec.ts` — one `@nightly` journey: seed artefact, view page, assert table/headers, Welsh, AxeBuilder WCAG, keyboard nav

### 9. Verification
- [ ] `yarn lint:fix` and `yarn format`
- [ ] `yarn test` (all workspaces green, including CI guard `libs/list-types/common/src/validation/guard.test.ts`)
- [ ] `yarn build` (confirms schema + njk copied to `dist/`)
- [ ] Resolve all CLARIFICATIONS from plan.md before merge (Excel headers, important-information copy + Welsh, court-hierarchy scope, layout confirmation)
