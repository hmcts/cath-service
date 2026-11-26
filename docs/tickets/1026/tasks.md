# Tasks — #1026: Align `POST /publication` with the CaTH Inbound Publication API contract

## Implementation Tasks

### Foundations (enums, helpers)
- [x] Add `libs/publication/src/artefact-type.ts` with `enum ArtefactType { LIST, LCSU }` and export it from `libs/publication/src/index.ts`
- [x] Add `getBlobUrl(blobName, containerName?)` to `libs/azure-blob/src/blob-client.ts` and export from `libs/azure-blob/src/index.ts` (+ unit test)
- [x] Change `extractAndStoreArtefactSearch` in `libs/publication/src/artefact-search-extractor.ts` to return the extracted `{ caseNumber, caseName }[]` instead of `void` (+ update its test)

### Database — nullable display dates
- [x] Make `displayFrom` / `displayTo` nullable in `libs/postgres-prisma/prisma/schema/base.prisma`
- [x] Add migration `apps/postgres/prisma/migrations/<timestamp>_artefact_display_dates_nullable/migration.sql` (`ALTER COLUMN ... DROP NOT NULL` for both columns) and run `yarn db:generate`
- [x] Add `libs/publication/src/display-window.ts` with `isWithinDisplayWindow(displayFrom, displayTo, now?)` treating `null` as unbounded (+ unit test)
- [x] Update `libs/publication/src/repository/{model.ts,queries.ts}` for `Date | null` display dates (`ArtefactSummary` / `ArtefactMetadata` become `string | null`)
- [x] Widen the visibility filter in `libs/subscriptions/src/repository/queries.ts` to include null display dates (`OR: [{ displayFrom: null }, { displayFrom: { lte: now } }]`, same for `displayTo`)
- [x] Switch `libs/public-pages/src/flat-file/flat-file-service.ts` and `libs/public-pages/src/routes/pdf/[artefactId]/download.ts` to `isWithinDisplayWindow`
- [x] Make display dates optional in `libs/legacy-third-party-fulfilment/src/service.ts` and omit `x-display-from` / `x-display-to` from outbound push headers when null (`push/headers.ts`)
- [x] Handle null display dates in the web display surfaces: `apps/web/src/pages/(public)/summary-of-publications`, `(system-admin)/blob-explorer-publications`, `(admin)/remove-list-confirmation`, `(admin)/manual-upload-summary`, `(admin)/non-strategic-upload-summary`

### Header parsing and response mapping
- [x] Add `libs/api/src/blob-ingestion/publication-headers.ts` — `parsePublicationHeaders(headers)` → `{ metadata?, errors }`, applying the `PUBLIC` sensitivity default, `ArtefactType` resolution, enum/date-format checks, `x-court-id` with `x-location-id` fallback; declare `PublicationMetadata` at the bottom of the file
- [x] Add `libs/api/src/blob-ingestion/publication-headers.test.ts` — one case per required header, unknown `x-type`, default sensitivity, null display dates, `x-location-id` fallback
- [x] Add `libs/api/src/blob-ingestion/artefact-response.ts` — `buildArtefactResponse`, `buildLcsuArtefactResponse`, `buildMessage`, `toSpecLanguage` (`BILINGUAL → BI_LINGUAL`)
- [x] Add `libs/api/src/blob-ingestion/artefact-response.test.ts`

### Validation and ingestion services
- [x] Replace `BlobIngestionRequest` / `FlatFileIngestionRequest` in `libs/api/src/blob-ingestion/repository/model.ts` with `PublicationIngestionResult` (`outcome`, `artefact?`, `message?`, `errors?`)
- [x] Rework `libs/api/src/blob-ingestion/validation.ts` to take `PublicationMetadata`: drop required-checks for sensitivity/display dates, keep format checks when present, gate the `display_to >= display_from` check on both being present, validate the raw JSON body (no `hearing_list`), report errors using header names
- [x] Update `libs/api/src/blob-ingestion/repository/service.ts`: new signatures (`metadata` + payload), `type` from `metadata.type`, nullable display dates, return `PublicationIngestionResult` with the built `Artefact`, map Prisma `P2002` to `outcome: "CONFLICT"`
- [x] Make `saveUploadedFile` in `libs/api/src/blob-ingestion/file-storage.ts` return the blob URL for `Artefact.payload`
- [x] Add `provenance` to the supersede `findFirst` key in `createArtefact` (`libs/publication/src/repository/queries.ts`) and update `queries.test.ts` (same 5 values ⇒ update; differing provenance ⇒ new row)
- [x] Update `libs/api/src/blob-ingestion/validation.test.ts` and `repository/service.test.ts` for the new signatures and optional headers

### LCSU / S3 path
- [x] Rename `validatePddaHtmlUpload(artefactType, file)` → `validateLcsuUploadFile(file)` in `libs/pdda-html-upload/src/validation/file-validation.ts`, dropping the type check and keeping `.htm`/`.html`, empty-file, size and path-traversal checks
- [x] Update `libs/pdda-html-upload/src/index.ts` exports, delete the unused `PddaHtmlUploadResponse` type, update `file-validation.test.ts`

### Route
- [x] Rewrite `apps/api/src/routes/v1/publication.ts`: delete `isPddaHtmlUpload` / `isBlobIngestionRequest` / `isFlatFileIngestionRequest`; parse headers first; branch on `Content-Type` then `x-type`; reject `LCSU` over `application/json`; reject unknown `x-type`; map `outcome` → `201/400/409/500` with `Artefact` / `Message` bodies; delete the dead `200 no_match` branch
- [x] Raise the conditional multer limit to `MAX_BLOB_SIZE` (100 MB) and translate `MulterError` into `400 Message` instead of letting it reach the app-level `500`
- [x] Log an `IngestionLog` row for LCSU uploads (no artefact, no blob, no `processPublication`)
- [x] Add `apps/api/src/routes/publication.ts` re-exporting `POST` from `./v1/publication.js` so `/publication` and `/v1/publication` both work
- [x] Rewrite `apps/api/src/routes/v1/publication.test.ts` around the three modes, header validation, and the `Artefact` / `Message` shapes (including: LCSU missing header ⇒ no S3 call; `x-type: LIST` multipart ⇒ no S3 call; LCSU ⇒ `createArtefact` not called)

### Docs and E2E
- [x] Rewrite the `/v1/publication` operation in `docs/api/openapi.yaml` (add `/publication`, `Artefact` + `Message` schemas, delete `BlobIngestionRequest` / `FlatFileUpload` / `PddaHtmlUpload` / `BlobIngestionResponse` / `PddaHtmlUploadResponse`)
- [x] Update `e2e-tests/tests/api/blob-ingestion.spec.ts`, `flat-file-ingestion.spec.ts`, `pdda-html-s3-upload.spec.ts`, `blob-ingestion-notifications.spec.ts`, `subscription-notifications.spec.ts` to the header contract and the new response shapes
- [x] Update the specs that seed via this endpoint: `e2e-tests/tests/sjp-press-list.spec.ts`, `tests/summary-of-publications.spec.ts`, `tests/verified-user/sjp-public-list.spec.ts`
- [x] Run `yarn lint:fix`, `yarn test`, `yarn test:e2e` and confirm green (`yarn lint` and `yarn test` green; `yarn test:e2e` not run locally — needs a full running stack, specs typecheck)

### Follow-ups to raise, not implement here
- [ ] Raise an issue for the three missing spec list types (`CROWN_DAILY_PDDA_LIST`, `CROWN_FIRM_PDDA_LIST`, `CROWN_WARNED_PDDA_LIST`) — schemas, validators, PDF generators, `list-type-data.ts` entries
- [ ] Get answers to CLARIFICATIONS Q1 (gateway path), Q2 (`x-court-id` vs `x-location-id`), Q-A (`x-list-type` on LCSU), Q-C (provenance in the supersede key), Q-D (nullable display dates scope) before closing the story
- [ ] Replay a captured `pip-data-management` publisher request against a preview environment with only the base URL changed, and record the result in the PR
