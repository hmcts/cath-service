# Implementation Tasks: Issue #675 — CSV Magistrates Hearing Lists (Part 2)

Tasks are ordered by dependency. Complete infrastructure changes before list-type modules, and list-type modules before registry wiring.

---

## Phase 1: Prerequisites and infrastructure

- [ ] **Confirm open questions** before writing row mappers: JSON payload shape, Part 1 seeding status, Welsh CSV headers, `subJurisdictionIds`, email CSV attachment policy, `provenance` value (see plan.md §6)

- [ ] **Register four list types in `libs/location/src/list-type-data.ts`**
  - Append IDs 28–31: `MAGISTRATES_ADULT_COURT_LIST_DAILY`, `MAGISTRATES_ADULT_COURT_LIST_FUTURE`, `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY`, `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE`
  - Each entry needs: `englishFriendlyName`, `welshFriendlyName`, `provenance`, `urlPath` (kebab-case), `isNonStrategic: false`, `defaultSensitivity: "Public"`, `subJurisdictionIds`
  - Run `yarn db:migrate:dev` to seed the new rows

- [ ] **Extend file retrieval in `libs/publication/src/file-storage/file-retrieval.ts`**
  - Add `findFileByArtefactIdAndExtension(artefactId: string, extension: string)` — exact match on `{artefactId}{extension}` with same path-traversal containment check as existing function
  - Add `saveFileToStorage(artefactId: string, buffer: Buffer, extension: string): Promise<{ filePath: string; sizeBytes: number }>` — generalisation of `savePdfToStorage`
  - Reimplemnent `savePdfToStorage` as a wrapper calling `saveFileToStorage(artefactId, buffer, ".pdf")` to keep existing API
  - Update `getFileBuffer(artefactId, extension?: string)` — when `extension` is provided delegate to `findFileByArtefactIdAndExtension`, otherwise keep existing prefix-match behaviour
  - Update `getFileExtension(artefactId, extension?: string)` — same pattern
  - Export new functions from `libs/publication/src/index.ts`
  - Update unit tests in `file-retrieval.test.ts` for the new functions and the updated signatures

- [ ] **Update download route to support `?type=` query param**
  - `libs/public-pages/src/routes/flat-file/[artefactId]/download.ts`: read `req.query.type`, map `"pdf"` → `.pdf`, `"csv"` → `.csv`, absent → undefined
  - Pass derived extension to `getFileForDownload`
  - Update `getFileForDownload` in `libs/public-pages/src/flat-file/flat-file-service.ts` to accept `extension?: string` and forward it to `getFileBuffer` and `getFileExtension`
  - Update `download.test.ts` and `flat-file-service.test.ts` for new behaviour

---

## Phase 2: Shared CSV utilities

- [ ] **Add `saveCsvToStorage` to `libs/list-types/common/src/csv/csv-utilities.ts`** (new file)
  - Import PapaParse (`import Papa from "papaparse"`)
  - `CsvGenerationResult` interface: `{ success: boolean; csvPath?: string; sizeBytes?: number; error?: string }`
  - `saveCsvToStorage(artefactId: string, rows: string[][]): Promise<CsvGenerationResult>` — serialises with `Papa.unparse(rows)`, writes to `TEMP_STORAGE_BASE/{artefactId}.csv`
  - Export from `libs/list-types/common/src/index.ts`
  - Unit tests in `csv-utilities.test.ts`

- [ ] **Add shared adult court row mapper — `libs/list-types/common/src/magistrates/adult-court-row-mapper.ts`**
  - 12-column header row: `Court House, Court Room, LJA, Session Start, Block Start, Defendant Name, Date of Birth, Address, Age, Informant, Case Number, Offence Code`
  - `mapRows(jsonData: unknown): string[][]` — returns header + data rows; all field access via optional chaining
  - Export from `libs/list-types/common/src/index.ts`
  - Unit tests in `adult-court-row-mapper.test.ts` (cover missing fields, empty payload)

- [ ] **Add shared public adult court row mapper — `libs/list-types/common/src/magistrates/public-adult-court-row-mapper.ts`**
  - 8-column header row: `Court House, Sitting at, Court Room, LJA, Session Start, Listing Time, Defendant Name, Case Number`
  - Same `mapRows(jsonData: unknown): string[][]` signature
  - Export from `libs/list-types/common/src/index.ts`
  - Unit tests in `public-adult-court-row-mapper.test.ts`

---

## Phase 3: Four list-type modules

For each module, follow the pattern from `libs/list-types/civil-and-family-daily-cause-list`. The adult-court-future and public-adult-court-future modules are thin wrappers that re-export from their daily counterparts.

### `libs/list-types/magistrates-adult-court-list-daily`

- [ ] Create `package.json` (`@hmcts/magistrates-adult-court-list-daily`, exports `.` and `./config`, `peerDependencies: { express: "^5.2.0" }`, includes `build:nunjucks` script)
- [ ] Create `tsconfig.json` extending `../../tsconfig.json`
- [ ] Create `src/config.ts` — `pageRoutes` with prefix `/magistrates-adult-court-list-daily`, `moduleRoot`, `assets`
- [ ] Create `src/models/types.ts` — TypeScript types for the adult court JSON payload
- [ ] Create `src/pages/en.ts` and `src/pages/cy.ts` — page content (title, headings, download link labels)
- [ ] Create `src/pages/index.ts` — GET controller; renders inline PDF viewer or redirects to download
- [ ] Create `src/pages/index.njk` — extends `layouts/base-template.njk`, uses `{% block page_content %}`
- [ ] Create `src/pdf/pdf-template.njk` — HTML for PDF rendering
- [ ] Create `src/pdf/pdf-generator.ts` — `generateMagistratesAdultCourtListDailyPdf(options)` using `configureNunjucks`, `savePdfToStorage`, `generatePdfFromHtml`
- [ ] Create `src/csv/csv-generator.ts` — `generateMagistratesAdultCourtListDailyCsv(options)` using `mapRows` from `adult-court-row-mapper` and `saveCsvToStorage`
- [ ] Create `src/email-summary/summary-builder.ts` — `extractCaseSummary` (extracts defendant name and case number fields for email body) and re-export `formatCaseSummaryForEmail` from `@hmcts/list-types-common`
- [ ] Create `src/index.ts` — export PDF generator, CSV generator, `extractCaseSummary`, `formatCaseSummaryForEmail`
- [ ] Register in root `tsconfig.json` paths: `"@hmcts/magistrates-adult-court-list-daily": ["libs/list-types/magistrates-adult-court-list-daily/src"]`
- [ ] Unit tests: `pdf-generator.test.ts`, `csv-generator.test.ts`, `summary-builder.test.ts`, `pages/index.test.ts`

### `libs/list-types/magistrates-adult-court-list-future`

- [ ] Create same structure as daily module
- [ ] `src/pdf/pdf-generator.ts` — `generateMagistratesAdultCourtListFuturePdf` — imports and delegates to `generateMagistratesAdultCourtListDailyPdf` (identical logic, different artefact ID)
- [ ] `src/csv/csv-generator.ts` — delegates to daily CSV generator
- [ ] `src/email-summary/summary-builder.ts` — re-exports from daily module
- [ ] Register in root `tsconfig.json` paths

### `libs/list-types/magistrates-public-adult-court-list-daily`

- [ ] Same structure; PDF generator uses different Nunjucks template (8-column layout), CSV generator uses `public-adult-court-row-mapper`
- [ ] Register in root `tsconfig.json` paths

### `libs/list-types/magistrates-public-adult-court-list-future`

- [ ] Thin wrapper delegating to public adult court daily module
- [ ] Register in root `tsconfig.json` paths

---

## Phase 4: Registry wiring

- [ ] **PDF_GENERATOR_REGISTRY — `libs/publication/src/processing/service.ts`**
  - Import all four `generate*Pdf` functions
  - Add four entries to `PDF_GENERATOR_REGISTRY` keyed by the exact list type name strings

- [ ] **CSV_GENERATOR_REGISTRY and `generatePublicationCsv` — `libs/publication/src/processing/service.ts`**
  - Define `GenerateCsvParams` interface (subset of `GeneratePdfParams`: `artefactId`, `listTypeId`, `locationId`, `jsonData`, `logPrefix?`)
  - Define `CsvGenerator` type
  - Import all four `generate*Csv` functions
  - Create `CSV_GENERATOR_REGISTRY` with four entries
  - Implement `generatePublicationCsv(params)` mirroring `generatePublicationPdf`: looks up list type name from DB, calls registered generator, returns `{ csvPath?: string }`

- [ ] **Update `processPublication` — `libs/publication/src/processing/service.ts`**
  - After `generatePublicationPdf` call, call `generatePublicationCsv` inside a try/catch that logs a warning on failure
  - Extend `ProcessPublicationResult` with `csvPath?: string`
  - Update `processing/service.test.ts` to cover CSV generation branch

- [ ] **EMAIL_BUILDER_REGISTRY — `libs/notifications/src/notification/notification-service.ts`**
  - Import `extractCaseSummary` and `formatCaseSummaryForEmail` from all four new modules
  - Add four entries to `EMAIL_BUILDER_REGISTRY`

---

## Phase 5: Frontend updates

- [ ] **Hearing list page controller — `libs/public-pages/src/pages/hearing-lists/[locationId]/[artefactId].ts`**
  - After `getFlatFileForDisplay` returns success, check for CSV file existence: call `getFileExtension(artefactId, ".csv")` (or introduce `fileExists(artefactId, ".csv")` helper)
  - Construct `csvDownloadUrl = /api/flat-file/${artefactId}/download?type=csv` when CSV exists
  - Pass `csvDownloadUrl` and new translation keys to the template

- [ ] **Add translation keys** to `libs/public-pages/src/pages/hearing-lists/en.ts` and `cy.ts`
  - `csvDownloadLinkText` (English and Welsh)

- [ ] **Update Nunjucks template** `hearing-lists/[locationId]/[artefactId].njk`
  - When `csvDownloadUrl` is set, render a secondary download link below the existing PDF download link

- [ ] Update controller unit test `[artefactId].test.ts` for the new CSV link rendering branch

---

## Phase 6: Application registration

- [ ] **`apps/web/src/app.ts`** — import `pageRoutes` and `assets` from all four new module `/config` paths; register with `createGovukFrontend` and `createSimpleRouter`
- [ ] **`apps/web/vite.config.ts`** — add `assets` from all four new modules to `createBaseViteConfig`

---

## Phase 7: E2E test

- [ ] **`e2e-tests/tests/magistrates-hearing-lists.spec.ts`** (tagged `@nightly`)
  - Single test covering the complete journey: publish a Magistrates adult court list artefact, navigate to the hearing list page, verify both PDF and CSV download links are present, verify Welsh translation, run axe accessibility check inline
  - Use `test-support` seeding helpers to create the artefact and write fixture files to `storage/temp/uploads/`
