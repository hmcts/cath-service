# Plan — #1026: Align `POST /publication` with the CaTH Inbound Publication API contract

## 0. What the code actually does today (verified, and where the ticket is slightly off)

Read before planning: `apps/api/src/routes/v1/publication.ts`, `libs/api/src/blob-ingestion/{validation.ts,repository/model.ts,repository/service.ts,file-storage.ts}`, `libs/pdda-html-upload/src/**`, `libs/publication/src/{language.ts,sensitivity.ts,provenance.ts,repository/queries.ts}`, `libs/list-types/common/src/list-type-data.ts`, `libs/postgres-prisma/prisma/schema/base.prisma`, `apps/api/src/app.ts`, and the pinned swagger (fetched and read in full).

Confirmations and corrections:

1. **Route URL is `/publication`-able cheaply.** `apps/api/src/app.ts` mounts `createSimpleRouter({ path: __dirname/routes })` with **no `/api` prefix**, and `@hmcts-cft/simple-router`'s `filePathToUrlPath` maps `routes/v1/publication.ts` → `/v1/publication`. A new file `apps/api/src/routes/publication.ts` re-exporting `POST` gives `/publication` with no infrastructure change. (The ticket and `.claude/rules/backend.md` say `/api/v1/publication`; the served path is `/v1/publication`.)
2. **The "we return `200` with `no_match: true`" claim is stale.** `processBlobIngestion` / `processFlatFileBlobIngestion` return `success: true, no_match: true` on an unresolved location, so the route's `if (!result.success && result.no_match) → 200` branch is **dead code**. Today a no-match already returns `201`. Only the body shape is off-spec.
3. **`x-content-date` needs no new parsing.** `isValidISODate` in `validation.ts` tests `/^\d{4}-\d{2}-\d{2}/` plus `new Date()` validity, which accepts the spec's `date-time` example (`2025-09-29T14:00:00.001Z`). Note `Artefact.contentDate` is `@db.Date`, so the time component is truncated on persist — acceptable, and it is what the supersede key compares.
4. **`display_from` / `display_to` are `NOT NULL` in the database** (`base.prisma:19-20`). Making the headers optional *and* honouring the AC "the artefact is created with null display dates" requires a migration plus a read-path sweep. This is the single largest piece of work in the ticket and the ticket does not mention it. See §3.5.
5. **`libs/subscriptions/src/repository/queries.ts:26-27`** filters `displayFrom: { lte: now }, displayTo: { gte: now }`. Prisma excludes `NULL` from these comparisons, so once display dates can be null those publications would silently never notify. Must be widened.
6. **The supersede key does not match the spec.** `createArtefact` (`libs/publication/src/repository/queries.ts:38-46`) matches on `locationId + listTypeId + contentDate + language` — **provenance is missing**. The spec supersedes on five values including provenance.
7. **The spec's 15 `x-list-type` values do not all exist locally.** Verified against `libs/list-types/common/src/list-type-data.ts` (77 entries): 12 of 15 exist. **Missing: `CROWN_DAILY_PDDA_LIST`, `CROWN_FIRM_PDDA_LIST`, `CROWN_WARNED_PDDA_LIST`.** We have `CROWN_DAILY_LIST` / `CROWN_FIRM_LIST` / `CROWN_WARNED_LIST`, which are different list types with different schemas. `libs/list-types/crown-advanced-pdda-list/` exists but contains only stale `.turbo` logs — no source. So a PDDA publisher sending a spec-valid `x-list-type` gets a `400` even after this ticket. See CLARIFICATIONS.
8. **`multer` is currently configured with the LCSU size limit for every multipart request** (`PDDA_HTML_MAX_FILE_SIZE`, default 10 MB) — so a legitimate 20 MB flat file is rejected by multer, which `next(err)`s into the app-level handler and returns `500 { error: "Internal server error" }`. Needs fixing as part of this work.
9. **Blast radius inside the repo is small.** `processBlobIngestion` / `processFlatFileBlobIngestion` / `validateBlobRequest` / `validateFlatFileRequest` / `BlobIngestionRequest` are referenced **only** by `libs/api/**` and `apps/api/src/routes/v1/publication.{ts,test.ts}`. Admin manual upload calls `createArtefact` directly and does not go through this endpoint. External-facing callers are the Playwright specs (§6).
10. **Auth already behaves as the spec describes** (`libs/api/src/middleware/oauth-middleware.ts`): `401` when the bearer token is missing/invalid, `403` when the `api.publisher.user` role is absent. The spec declares `401`/`403` with `"content": {}` (no schema), so no body change is mandated.
11. **`uploadBlob` returns `void`** (`libs/azure-blob/src/blob-client.ts`), so nothing currently knows the blob URL needed for `Artefact.payload`.
12. **`extractAndStoreArtefactSearch` returns `void`** (`libs/publication/src/artefact-search-extractor.ts:144`) but already computes the case list needed for `Artefact.search`.

---

## 1. Technical Approach

Single endpoint, header-driven metadata, spec-shaped responses. Four moves:

1. **Introduce a header-parsing boundary.** One new module, `libs/api/src/blob-ingestion/publication-headers.ts`, converts `req.headers` into a validated `PublicationMetadata` object (defaults applied, enums checked, `x-type` resolved). It is the only place that knows about `x-*` names. Nothing downstream reads `req`.
2. **Keep the existing ingestion services, change their input type.** `processBlobIngestion` / `processFlatFileBlobIngestion` keep their responsibilities (validate → `createArtefact` → blob → search → log → fire-and-forget publish); they take `PublicationMetadata` + payload instead of a snake_case body envelope. `validateCommonFields` drops the field-presence checks that headers now guarantee and keeps the semantic checks (provenance allowlist, list type lookup against the `list_type` table, location resolution, `display_to >= display_from`).
3. **Introduce a spec response mapper.** `libs/api/src/blob-ingestion/artefact-response.ts` builds the camelCase `Artefact` body and the `Message` (`{ message, timestamp }`) error body. Every response from the endpoint goes through it — no ad-hoc `{ success, message }` objects remain.
4. **Route on `Content-Type` then `x-type`.** `isPddaHtmlUpload` (body-field sniffing) is deleted. `validatePddaHtmlUpload` loses its `artefactType` argument and becomes `validateLcsuUploadFile(file)` — the route already knows the type from the header.

Architecture decisions, with reasoning:

- **DB-driven list-type validation stays.** Per `CLAUDE.md`, no hardcoded list-type identifiers. The spec's fixed 15-value enum is treated as a subset of the `list_type` table, not as the source of truth. Consequence: item 7 above is a data gap, not a validation-code gap.
- **`x-provenance` allowlist stays** (`MANUAL_UPLOAD, SNL, COMMON_PLATFORM, CP_CATH, PDDA`). The spec types it as a free string but its own description says the value must be agreed with the CaTH team so location mapping is configured; an unrecognised provenance cannot resolve a location anyway, so failing fast with a clear `400` beats persisting an orphan artefact.
- **`Language` accepts a superset inbound, emits spec values outbound.** Inbound `ENGLISH | WELSH | BILINGUAL` (BILINGUAL is already reachable via manual upload and rejecting it buys nothing); outbound the response maps `BILINGUAL → BI_LINGUAL`. One mapping function, no enum rename, no data migration.
- **No new lib.** This is a contract change to an existing feature. New files land in `libs/api` (`@hmcts/blob-ingestion`) and `libs/publication`; `apps/api/src/routes/v1/publication.ts` stays thin composition.
- **Display dates become genuinely nullable** rather than silently defaulted, because a defaulted `displayTo` invents a visibility window the publisher never asked for and would expire (or fail to expire) publications wrongly. Cost is a migration plus a read-path sweep (§3.5).

---

## 2. Request / response contract (target state)

### Headers — all three modes

| Header | Req. | Validation | Notes |
|---|---|---|---|
| `x-provenance` | yes | non-empty; allowlist | as today |
| `x-court-id` | yes | non-empty; numeric when provenance is `MANUAL_UPLOAD` | as today |
| `x-content-date` | yes | ISO 8601 date or date-time | truncated to date on persist |
| `x-list-type` | yes | must exist in `list_type` table | required for `LCSU` too — matches incumbent `validateHeaders`; see CLARIFICATIONS Q-A |
| `x-language` | yes | `ENGLISH` \| `WELSH` \| `BILINGUAL` | |
| `x-type` | yes | `LIST` \| `LCSU` — unknown value ⇒ `400` | routing discriminator |
| `x-sensitivity` | no | `PUBLIC` \| `PRIVATE` \| `CLASSIFIED`; **default `PUBLIC`** | |
| `x-display-from` | no | ISO 8601 date-time | `null` when absent |
| `x-display-to` | no | ISO 8601 date-time; `>= x-display-from` when both present | `null` when absent |
| `x-source-artefact-id` | no | string | as today |
| `x-correlation-id` | no | string | logging only, not persisted |

### Bodies

- `application/json` — the body **is** the payload (object or array). No `hearing_list` wrapper. Validated against the schema registered for `x-list-type`.
- `multipart/form-data` — exactly one part named `file`. No metadata form fields are read.

### Mode routing

| `Content-Type` | `x-type` | Handler | Destination |
|---|---|---|---|
| `application/json` | `LIST` | JSON ingestion | Azure blob + artefact row |
| `application/json` | `LCSU` | rejected `400` | — (LCSU is file-only) |
| `multipart/form-data` | `LIST` | flat-file ingestion | Azure blob + artefact row, `isFlatFile: true` |
| `multipart/form-data` | `LCSU` | LCSU upload | AWS S3 only, **no artefact row** |
| either | anything else | rejected `400` | — |

### `201` body — `Artefact` (camelCase)

```json
{
  "artefactId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "contentDate": "2026-09-14T00:00:00.000Z",
  "courtId": "1",
  "displayFrom": null,
  "displayTo": null,
  "isFlatFile": false,
  "language": "ENGLISH",
  "listType": "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
  "payload": "https://<account>.blob.core.windows.net/artefact/3fa85f64-...",
  "provenance": "SNL",
  "search": { "cases": [{ "caseNumber": "T20250001", "caseName": "R v Smith" }] },
  "sensitivity": "PUBLIC",
  "sourceArtefactId": null,
  "type": "LIST"
}
```

- `courtId` echoes the submitted `x-court-id` (not the resolved internal location id) — that is what the publisher sent and can correlate.
- `search` omitted for flat files (nothing extracted).
- LCSU `201`: `artefactId: ""`, `type: "LCSU"`, no `payload`, no `search`, no `isFlatFile`; all echoed metadata present.

### `400` / `409` / `500` body — `Message`

```json
{ "message": "Validation failed: x-court-id is required; x-language must be one of ENGLISH, WELSH", "timestamp": "2026-09-14T09:12:33.101Z" }
```

Field-level errors are joined into the single `message` string. `{ success, errors[] }` is gone.

### Status codes

| Code | When |
|---|---|
| `201` | artefact created or superseded; also when the location could not be resolved (`noMatch`) — accept-and-flag, matching the incumbent |
| `400` | missing/invalid header, unknown `x-type`, `LCSU` over `application/json`, missing `file` part, non-`.htm(l)` LCSU file, JSON schema failure, payload over limit |
| `401` | no/invalid bearer token (unchanged) |
| `403` | missing `api.publisher.user` role (unchanged) |
| `409` | unique-constraint / concurrent-create conflict (Prisma `P2002`) |
| `500` | anything else, body is `Message` |

---

## 3. Implementation Details

**TEMPLATE SOURCE: n/a**

### 3.1 New — `libs/api/src/blob-ingestion/publication-headers.ts`

Exports `parsePublicationHeaders(headers: IncomingHttpHeaders): { metadata?: PublicationMetadata; errors: ValidationError[] }`.

- Reads the eleven `x-*` headers; trims; treats `""` as absent.
- Applies `sensitivity ?? Sensitivity.PUBLIC`.
- Resolves `x-type` against `ArtefactType`; unknown ⇒ error `x-type must be one of LIST, LCSU`.
- Enum/format checks for `x-language`, `x-sensitivity`, `x-content-date`, `x-display-from`, `x-display-to`.
- Does **no** database work (no list-type or location lookup) — that stays in `validation.ts` so the LCSU path can reuse it without duplicating queries.
- `PublicationMetadata` interface declared at the bottom of the file (types colocated, per `CLAUDE.md`).

```ts
export interface PublicationMetadata {
  provenance: string;
  courtId: string;
  contentDate: string;
  listType: string;
  language: string;
  type: ArtefactType;
  sensitivity: string;
  displayFrom: string | null;
  displayTo: string | null;
  sourceArtefactId: string | null;
}
```

### 3.2 New — `libs/publication/src/artefact-type.ts`

```ts
export enum ArtefactType { LIST = "LIST", LCSU = "LCSU" }
```

Exported from `libs/publication/src/index.ts` alongside `Language` / `Sensitivity`. Replaces the hardcoded `type: "LIST"` in `buildArtefactParams`.

### 3.3 New — `libs/api/src/blob-ingestion/artefact-response.ts`

- `buildArtefactResponse(...)` → the `Artefact` body for persisted artefacts.
- `buildLcsuArtefactResponse(metadata)` → `Artefact` with `artefactId: ""`, no `payload` / `search` / `isFlatFile`.
- `buildMessage(message: string)` → `{ message, timestamp: new Date().toISOString() }`.
- `toSpecLanguage(language)` → `BILINGUAL → "BI_LINGUAL"`, otherwise pass-through. (Placed here, not in `language.ts`, because it is a wire-format concern of this API.)

### 3.4 Changed — existing modules

| File | Change |
|---|---|
| `libs/api/src/blob-ingestion/repository/model.ts` | Delete `BlobIngestionRequest`, `FlatFileIngestionRequest`. Add `PublicationIngestionResult` = `{ outcome: "CREATED" \| "VALIDATION_ERROR" \| "CONFLICT" \| "ERROR"; artefact?: ArtefactResponse; message?: string; errors?: ValidationError[] }`. `BlobValidationResult` unchanged. |
| `libs/api/src/blob-ingestion/validation.ts` | `validateCommonFields(metadata, payloadSize)` takes `PublicationMetadata`. Remove required-checks for `sensitivity`, `display_from`, `display_to` (headers module + default cover them); keep format checks *when present*; keep the `display_to >= display_from` check gated on both being present. `validateBlobRequest(metadata, payload, rawBodySize)` validates the **whole body** (no `hearing_list`), reporting failures under field `body`. Error `field` values become header names (`x-court-id`, …) so the joined `message` is meaningful to a publisher. |
| `libs/api/src/blob-ingestion/repository/service.ts` | Signatures become `processBlobIngestion(metadata, payload, rawBodySize)` and `processFlatFileBlobIngestion(metadata, file, fileSize)`. `buildArtefactParams` takes `type` from `metadata.type` instead of the literal `"LIST"`, and passes `displayFrom`/`displayTo` as `Date \| null`. Returns `PublicationIngestionResult` with the built `Artefact`. Catch Prisma `P2002` → `outcome: "CONFLICT"`. `IngestionLog` writes unchanged. |
| `libs/api/src/blob-ingestion/file-storage.ts` | `saveUploadedFile` returns the blob URL (from a new `getBlobUrl` — see below) so the response can carry `payload`. |
| `libs/azure-blob/src/blob-client.ts` + `index.ts` | Add `getBlobUrl(blobName, containerName?)` returning `containerClient.getBlockBlobClient(blobName).url`. No behaviour change to `uploadBlob`. |
| `libs/publication/src/artefact-search-extractor.ts` | `extractAndStoreArtefactSearch` returns the extracted `{ caseNumber, caseName }[]` (currently `void`) so the response `search` needs no extra query. Existing callers ignoring the return value are unaffected. |
| `libs/publication/src/repository/queries.ts` | `createArtefact`'s supersede `findFirst` gains `provenance: data.provenance` (spec's five-value key). `Artefact.displayFrom/displayTo` become `Date \| null`; `getArtefactSummariesByLocation` / `getArtefactMetadata` return `string \| null`. |
| `libs/pdda-html-upload/src/validation/file-validation.ts` | Rename `validatePddaHtmlUpload(artefactType, file)` → `validateLcsuUploadFile(file)`; drop the `artefactType !== "LCSU"` branch (the route decides from `x-type`); keep `.htm`/`.html`, empty-file, size and path-traversal checks. Update `src/index.ts`, delete the now-unused `PddaHtmlUploadResponse` type. |
| `apps/api/src/routes/v1/publication.ts` | Rewritten per §3.6. |
| **New** `apps/api/src/routes/publication.ts` | `export { POST } from "./v1/publication.js";` — serves `/publication` so the cutover is a base-URL change only. Both paths live until the gateway question (Q1) is settled. |
| `docs/api/openapi.yaml` | Rewrite the `/v1/publication` operation (and add `/publication`) to the header contract, `Artefact` and `Message` schemas; delete `BlobIngestionRequest`, `FlatFileUpload`, `PddaHtmlUpload`, `BlobIngestionResponse`, `PddaHtmlUploadResponse`. The file's own header says it must be updated in the same change. |

### 3.5 Database change — nullable display dates

- `libs/postgres-prisma/prisma/schema/base.prisma`: `displayFrom DateTime? @map("display_from")`, `displayTo DateTime? @map("display_to")`.
- New migration `apps/postgres/prisma/migrations/<timestamp>_artefact_display_dates_nullable/migration.sql`:
  ```sql
  ALTER TABLE "artefact" ALTER COLUMN "display_from" DROP NOT NULL;
  ALTER TABLE "artefact" ALTER COLUMN "display_to" DROP NOT NULL;
  ```
  Backwards compatible — no existing row changes.
- New `libs/publication/src/display-window.ts`: `isWithinDisplayWindow(displayFrom: Date | null, displayTo: Date | null, now = new Date()): boolean` — `null` means unbounded at that end. Single place encoding the rule.
- Read-path sweep (each currently assumes non-null):
  - `libs/public-pages/src/flat-file/flat-file-service.ts` (two `now < displayFrom || now > displayTo` checks) → `isWithinDisplayWindow`.
  - `libs/public-pages/src/routes/pdf/[artefactId]/download.ts` (same check) → `isWithinDisplayWindow`.
  - `libs/subscriptions/src/repository/queries.ts:26-27` → `AND: [{ OR: [{ displayFrom: null }, { displayFrom: { lte: now } }] }, { OR: [{ displayTo: null }, { displayTo: { gte: now } }] }]`.
  - `libs/publication/src/repository/queries.ts` — `.toISOString()` calls become `?? null`; `orderBy: { displayFrom: "desc" }` is safe with nulls.
  - `libs/legacy-third-party-fulfilment/src/{service.ts,push/headers.ts}` — `displayFrom`/`displayTo` become optional; omit `x-display-from` / `x-display-to` from the outbound push headers when null (mirrors what we accept inbound).
  - Display-only surfaces (`apps/web/src/pages/(public)/summary-of-publications`, `(system-admin)/blob-explorer-publications`, `(admin)/remove-list-confirmation`, manual-upload summaries) — render an em dash / blank when null. Admin manual upload keeps supplying both dates, so these are defensive only.

### 3.6 Route handler shape — `apps/api/src/routes/v1/publication.ts`

```
POST = [
  authenticateApi(),
  conditionalMulter,          // multipart only; limit = MAX_BLOB_SIZE (100MB), MulterError -> 400 Message
  handler
]
```

`handler`:
1. `parsePublicationHeaders(req.headers)` → on errors, `400 buildMessage(join(errors))`. Runs **before** any branch, so LCSU is header-validated exactly like a flat file.
2. `if (multipart && type === LCSU)` → `validateLcsuUploadFile(req.file)`; on failure `400`; then a DB-backed metadata check (list type + location resolution via the shared validator) so LCSU is validated against the same metadata rules; then `uploadHtmlToS3(...)`; then `201 buildLcsuArtefactResponse(metadata)`. **No `createArtefact`, no `saveUploadedFile`, no `extractAndStoreArtefactSearch`, no `processPublication`.**
3. `if (multipart && type === LIST)` → require `req.file`; `processFlatFileBlobIngestion(metadata, req.file.buffer, req.file.size)`.
4. `if (!multipart && type === LCSU)` → `400` "LCSU publications must be sent as multipart/form-data".
5. `else` → `processBlobIngestion(metadata, req.body, rawBodySize)` (`rawBodySize` from `content-length` as today).
6. Map `outcome` → status per §2; catch-all `500 buildMessage("Internal server error")`, keeping the existing structured `console.error` with `correlationId`.

No business logic in the route; it parses, branches, and maps outcomes to status codes.

---

## 4. Error Handling & Edge Cases

| Case | Behaviour |
|---|---|
| Missing any required header | `400 Message`, before file/DB work |
| `x-type` unknown (`"list"`, `"JSON"`, empty) | `400`; never defaults to `LIST`. Note: header matching is **case-sensitive** on the value, matching the Java enum |
| `x-type: LCSU` + `application/json` | `400` — LCSU is file-only |
| `x-type: LCSU` + `.pdf` file | `400` "File format is not supported for LCSU."; **no S3 call** |
| `x-type: LCSU` + missing required header | `400` before the extension check and before S3 |
| `x-type: LIST` + multipart, no `file` part | `400` |
| `x-type: LIST` + multipart with a `type` form field | Ignored — form fields are never read for metadata now |
| JSON body fails the `x-list-type` schema | `400` with the schema messages joined into `message` |
| JSON body is an array | Accepted (`express.json` parses arrays; several list types are arrays) |
| JSON body empty / not JSON | `400` — `express.json` leaves `{}`; validator reports an empty payload |
| Payload > 100 MB (JSON) | `400` (existing `MAX_BLOB_SIZE` check). Spec defines no `413` |
| Multipart file > multer limit | `MulterError` caught in the middleware → `400 Message`, not `500` (fixes today's behaviour) |
| Unresolvable `x-court-id` + `x-provenance` | `201`, artefact persisted with `noMatch: true`, PDF/notifications skipped (unchanged) — see Q3 |
| `display_to < display_from` | `400` |
| Only one of `display_from` / `display_to` supplied | Accepted; the other stays `null`; the ordering check is skipped |
| Concurrent identical publications | Prisma `P2002` → `409 Message`. Not otherwise synthesised |
| S3/blob/DB failure | `500 Message`; existing `IngestionLog` `SYSTEM_ERROR` record still written |
| `x-list-type` valid per spec but absent from `list_type` (the 3 PDDA names) | `400` listing valid values — a data gap, see CLARIFICATIONS |

---

## 5. Acceptance Criteria Mapping

| AC | How it is satisfied | Verified by |
|---|---|---|
| JSON publication accepted with headers only | §3.1 header parsing + §3.4 `validateBlobRequest` on the raw body; response via `buildArtefactResponse` | Unit: route + validation. E2E: `blob-ingestion.spec.ts` rewritten to headers |
| Optional headers may be omitted | `sensitivity` defaults to `PUBLIC` in `parsePublicationHeaders`; display dates persist as `NULL` after §3.5 | Unit: headers module (default) + service (nulls persisted); E2E asserts `sensitivity: "PUBLIC"`, `displayFrom: null` |
| Missing required header rejected with `Message` | `parsePublicationHeaders` errors → `400 buildMessage` | Unit: one case per required header, asserting `{ message, timestamp }` |
| One endpoint serves all three modes | Single `POST` in `apps/api/src/routes/v1/publication.ts` (+ `/publication` alias re-export); no new path | Unit: three requests to the same exported handler; E2E covers all three against one URL |
| Flat file uses headers + `file` part | Branch 3 in §3.6; `buildArtefactParams(..., isFlatFile: true)` | Unit + E2E `flat-file-ingestion.spec.ts` asserting `isFlatFile: true` |
| `x-type: LCSU` routes to S3 | Branch 2; `uploadHtmlToS3` only, `artefactId: ""` | Unit: asserts `uploadHtmlToS3` called and `createArtefact` **not** called. E2E `pdda-html-s3-upload.spec.ts` HEADs the S3 object and asserts no artefact row via test-support |
| LCSU validates headers like any other publication | Step 1 runs before the branch | Unit: LCSU request missing `x-court-id` ⇒ `400`, `uploadHtmlToS3` not called |
| LCSU rejects non-HTML | `validateLcsuUploadFile` (`.htm`/`.html` only) | Unit on `libs/pdda-html-upload` + route test asserting no S3 call |
| `x-type: LIST` with a file never reaches S3 | Branch 3 | Unit: asserts `processFlatFileBlobIngestion` called, `uploadHtmlToS3` not |
| Unrecognised `x-type` rejected | `ArtefactType` resolution in §3.1 | Unit: `x-type: "FOO"` ⇒ `400`, no ingestion call |
| JSON payload validated against `x-list-type` schema | `validateBlobRequest` → `validateListTypeJson(listTypeId, body, listTypesInfo)` | Unit: malformed payload ⇒ `400` with schema message in `message` |
| Supersede rule matches the incumbent | `createArtefact` `findFirst` key extended with `provenance` (§3.4) | Unit on `libs/publication/src/repository/queries.test.ts`: same 5 values ⇒ update + `supersededCount` increment; differing provenance ⇒ new row |
| Bilingual is `BI_LINGUAL` in responses | `toSpecLanguage` in `artefact-response.ts` | Unit on the mapper + a response assertion |
| Recorded incumbent request replays unchanged | Contract as specified in §2, plus the `/publication` alias | Manual replay against a preview env, recorded in the PR; blocked on Q1/Q2 for the URL and header name |

---

## 6. Test & consumer updates required

Repo-internal consumers that break and must move to the header contract in the same PR:

- `apps/api/src/routes/v1/publication.test.ts` (490 lines) — rewritten around headers, three modes, `Message`/`Artefact` shapes.
- `libs/api/src/blob-ingestion/validation.test.ts` (534) and `repository/service.test.ts` (737) — updated signatures; add cases for omitted optional headers.
- `libs/pdda-html-upload/src/validation/file-validation.test.ts` (164) — drop the `artefactType` cases.
- New: `libs/api/src/blob-ingestion/publication-headers.test.ts`, `artefact-response.test.ts`, `libs/publication/src/display-window.test.ts`.
- E2E (`x-*` headers instead of bodies/form fields, and new response assertions): `e2e-tests/tests/api/blob-ingestion.spec.ts`, `flat-file-ingestion.spec.ts`, `pdda-html-s3-upload.spec.ts`, `blob-ingestion-notifications.spec.ts`, `subscription-notifications.spec.ts`, plus `tests/sjp-press-list.spec.ts`, `tests/summary-of-publications.spec.ts`, `tests/verified-user/sjp-public-list.spec.ts` which seed data through this endpoint.

Per `.claude/rules/e2e-testing.md`, no new E2E specs — extend the existing journeys.

---

## 7. Out of scope (restating, with the reason)

- `POST /publication/non-strategic` — separate path.
- Adding the three `CROWN_*_PDDA_LIST` list types (schemas, validators, PDF generators, `list-type-data.ts` entries) — a list-type implementation per `CLAUDE.md` §"Implementing a new list type", not a contract change. Needs its own issue.
- APIM / `sds-api-mgmt` routing.
- Upstream publisher changes.

---

## CLARIFICATIONS NEEDED

The ticket's seven questions, each answered from the code where the code answers it.

1. **Endpoint path.** *Code answers it partially.* `apps/api/src/app.ts` mounts the routes directory at root and simple-router derives `/v1/publication` from the file path; there is no gateway rewrite anywhere in this repo (`apps/api/helm/values.yaml` sets only `ingressHost`). **Recommended default (unblocks implementation): add `apps/api/src/routes/publication.ts` re-exporting `POST`, serving both `/publication` and `/v1/publication`.** Cost is one line; it removes the URL as a cutover risk regardless of what APIM ends up doing. Still needs a decision on whether `/v1/publication` is later retired.
2. **`x-court-id` vs `x-location-id`.** *Code cannot answer — it is an upstream wire question.* The pinned swagger declares only `x-court-id` as a parameter; `x-location-id` appears solely in the prose supersede sentence, which reads like a stale rename in the spec. **Recommended default: accept `x-court-id`, and fall back to `x-location-id` when `x-court-id` is absent.** Two lines in `parsePublicationHeaders`, no ambiguity if both are sent (`x-court-id` wins), and no dependency on the CaTH team replying.
3. **"Location not found" response.** *Code answers what we do; not what the incumbent does.* We already return `201` with `no_match: true` (the `200` branch is dead — §0.2), which matches the incumbent's accept-and-flag behaviour (it persists an unmatched artefact rather than erroring). **Recommended default: keep accept-and-flag, return `201` with the `Artefact` body, delete the dead `200` branch, keep `noMatch` internal (it is not a spec field).** Confirm with the CaTH team that no publisher relies on a distinguishable no-match signal — if one does, we need a spec-compatible way to surface it, because `Artefact` has no such field.
4. **Backwards compatibility.** *Code answers it.* Verified by grep: `processBlobIngestion`, `processFlatFileBlobIngestion`, `BlobIngestionRequest` and friends are referenced only inside `libs/api` and `apps/api/src/routes/v1/publication.*`. The only body-contract callers are Playwright specs (§6). Admin manual upload bypasses the endpoint entirely (`createArtefact` direct). **Recommended default: clean break, no dual-contract period.** Still needs external confirmation that no non-repo client (performance harness, a partner's test rig) posts the snake_case body.
5. **401 vs 403.** *Code answers it.* `libs/api/src/middleware/oauth-middleware.ts` returns `401` for a missing/invalid bearer token and `403` when the `api.publisher.user` role is absent — the conventional mapping, and consistent with the spec's `401` "no access credential provided". The spec's `403` wording ("authentication has failed") is just loose. Both spec responses declare `"content": {}`, so no body is mandated. **Recommended default: no change.** Optionally align the bodies to `Message` for consistency — low cost, include it.
6. **LCSU response body.** *Code cannot answer — publisher expectation.* We currently return `{ success, message, s3_key, correlation_id }`; the spec returns `Artefact` with a blank `artefactId` and no S3 key. **Recommended default: mirror the spec exactly (`artefactId: ""`, no `s3_key`).** Deviating is what breaks the "change only the URL" promise. If the S3 key turns out to be needed, a non-spec `x-s3-key` **response header** is the additive way to provide it without polluting the body — do not add it speculatively.
7. **LCSU metadata retention.** *Code answers the current state: nothing is recorded* — `handleHtmlFileUpload` writes no `IngestionLog` and no artefact. The incumbent also persists nothing. **Recommended default: match the incumbent (persist nothing) but write an `IngestionLog` row** (`sourceSystem`, `courtId`, `status`, no `artefactId`) so an LCSU upload is traceable. That is a two-line reuse of `logIngestionResult`, invisible to the publisher, and answers "did it arrive?" without inventing storage. If audit needs the full metadata set, that is a separate schema change.

Additional questions raised by reading the code — these are not in the ticket:

- **Q-A. Is `x-list-type` required for `x-type: LCSU`?** The spec marks it `required: true` globally but says "Only set when x-type is set to 'LIST'". The incumbent runs the same `validateHeaders` for both. **Default: require it for both** (satisfies the "LCSU validates its headers like any other publication" AC). Confirm PDDA actually sends a list type on LCSU uploads, or this rejects every real LCSU request.
- **Q-B. The three missing PDDA list types.** `CROWN_DAILY_PDDA_LIST`, `CROWN_FIRM_PDDA_LIST`, `CROWN_WARNED_PDDA_LIST` are in the spec's enum but absent from `list-type-data.ts`, and `libs/list-types/crown-advanced-pdda-list/` has no source. A spec-valid PDDA request therefore `400`s after this ticket. **Needs a follow-up issue before PDDA can test against us**; do not alias them to the existing `CROWN_*_LIST` types, whose schemas differ.
- **Q-C. Adding `provenance` to the supersede key.** Required by the spec's five-value rule, but it changes existing behaviour: a manual upload and a `PDDA` upload for the same court/date/list type/language would stop superseding one another and coexist as two artefacts. **Default: match the spec.** Confirm the admin team accepts that.
- **Q-D. Nullable display dates.** The AC demands null display dates, which means the migration and read-path sweep in §3.5 — the largest chunk of this ticket, and it touches subscriptions, third-party push and public visibility. Confirm this scope is accepted, or that the alternative (persist `displayFrom = now`, `displayTo = now + configurable window` and echo the derived values) is preferred. The alternative is smaller but invents a visibility window the publisher never asked for, so it is not recommended.
