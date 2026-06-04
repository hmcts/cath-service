# Implementation Tasks: #674 CSV - Crown Hearing Lists

## Prerequisites
- [ ] Confirm Crown lists are ingested as structured JSON (not flat PDF) — blocker if not
- [ ] Obtain sample JSON payload for each Crown list type to confirm field paths
- [ ] Confirm whether Crown PDF generators exist or must be built here (uniform columns AC)
- [ ] Confirm GOV.UK Notify template IDs for Crown list notifications

## New Crown List-Type Modules

- [ ] Create `libs/list-types/crown-daily-list/` module with `package.json`, `tsconfig.json`
- [ ] Implement `crown-daily-list` CSV generator (10 columns per plan §2.2)
- [ ] Write unit tests for `crown-daily-list` CSV generator
- [ ] Create `libs/list-types/crown-firm-list/` module with `package.json`, `tsconfig.json`
- [ ] Implement `crown-firm-list` CSV generator (12 columns per plan §2.2)
- [ ] Write unit tests for `crown-firm-list` CSV generator
- [ ] Create `libs/list-types/crown-warned-list/` module with `package.json`, `tsconfig.json`
- [ ] Implement `crown-warned-list` CSV generator (7 columns per plan §2.2)
- [ ] Write unit tests for `crown-warned-list` CSV generator
- [ ] Register all three modules in root `tsconfig.json` paths

## Publication Processing

- [ ] Add `saveCsvToStorage()` function to `libs/publication/src/file-storage/file-retrieval.ts`
- [ ] Add `CSV_GENERATOR_REGISTRY` to `libs/publication/src/processing/service.ts`
- [ ] Call CSV generator in `processPublication` after PDF step; catch errors non-fatally

## File Storage — Multi-Rendition Support

- [ ] Update `findFileByArtefactId()` to accept optional `format: "pdf" | "csv"` param
- [ ] Ensure backwards compatibility (default remains `pdf`)

## Download Route

- [ ] Add `?format=pdf|csv` query param support to `libs/public-pages/src/routes/flat-file/[artefactId]/download.ts`
- [ ] Validate format param; return 400 for invalid values; default to `pdf`
- [ ] Return 404 when requested rendition does not exist in storage
- [ ] Write unit tests for download route format param handling

## Viewer Page

- [ ] Extend `libs/public-pages/src/pages/hearing-lists/[locationId]/[artefactId].ts` to check CSV availability
- [ ] Pass `hasCsvDownload` and `csvDownloadUrl` to template
- [ ] Update `[artefactId].njk` to render "Download this hearing list" block with both options
- [ ] Add English content strings to `libs/public-pages/src/pages/hearing-lists/en.ts`
- [ ] Add Welsh content strings to `libs/public-pages/src/pages/hearing-lists/cy.ts`
- [ ] Write/update unit tests for the viewer controller

## Email Notifications

- [ ] Extend `libs/notifications/src/notification/notification-service.ts` to pass `pdf_download_link` and `csv_download_link`
- [ ] Update `libs/notifications/src/govnotify/template-config.ts` with new template parameters
- [ ] Update GOV.UK Notify templates to include both link placeholders (confirm template IDs first)
- [ ] Write unit tests for updated notification service

## E2E Tests

- [ ] Write E2E test covering: Crown list viewer shows both download options, CSV download works, email links are correct `@nightly`
