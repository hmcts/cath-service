# #1380: Courtel push: match the legacy request format and headers. Technical plan

## Decision record

- **Expected format (scope item 1): decided 2026-11-16 by the assignee.** Courtel expects exactly what legacy PIP sends, so legacy `pip-publication-services` is the specification. No captured legacy request is available. The "Legacy" column below comes from reading the legacy code. The end-to-end check uses the updated CaTH Courtel mock, not the real Courtel test endpoint (decision 6).
- **Clarifications 1-6: decided 2026-11-16 with the assignee.** See CLARIFICATIONS NEEDED for each decision.
- Legacy sources read for this plan (hmcts GitHub, default branch, 2026-11-16):
  - `pip-publication-services`: `service/LegacyThirdPartyManagementService.java` (LTPMS), `service/LegacyThirdPartyService.java` (LTPS), `helpers/MultiPartHelper.java`, `service/DataManagementService.java` (DMS), `src/main/resources/application.yaml`
  - `pip-data-management`: `service/publication/PublicationFileManagementService.java` (PFMS), `service/publication/PublicationFileGenerationService.java` (PFGS), `service/helpers/LanguageResourceHelper.java` (LRH), `service/ValidationService.java`, `controllers/publication/PublicationController.java`
  - `pip-data-models`: `model/publication/Artefact.java`, `model/publication/ListType.java`, `model/location/Location.java`
- The #323 QA comment (issuecomment-4380504249) recorded these header defects: empty `x-sensitivity`/`x-language` on new publications, `x-source-artefact-id`/`x-type` not taken from the artefact, and display dates one day early in BST. The first is already fixed on this branch, because all three upload callers now pass `sensitivity` and `language`. This plan fixes the other two. The QA retry-count finding is not in this ticket's scope and will be dealt with separately (decision 5).

## 1. Technical Approach

### Strategy

Change `libs/legacy-third-party-fulfilment` so that each publication shape produces the same HTTP requests legacy produces:

| Shape | Legacy requests (in order) | Planned CaTH requests |
|---|---|---|
| JSON publication | 1. JSON body, `application/json`. 2. If a non-empty PDF exists: multipart with one `file` part, `x-provenance: CATH` | The same |
| Flat file | 1. Multipart with one `file` part | The same |
| Deletion | 1. POST, headers only, no body | The same (headers fixed) |

The HTTP layer becomes a plain transport that sends one prepared body. The service decides which requests to send, sends them one after another, and records each one in `thirdPartyPushLog`.

### Architecture decisions

1. **The lib boundary stays.** `@hmcts/legacy-third-party-fulfilment` still does not depend on `@hmcts/publication`. Blob reads stay behind the `loadFiles` callback that `pushPublicationToThirdParties` supplies.
2. **`type` and `sourceArtefactId` come in as push parameters.** They are new required fields on `ThirdPartyPushParams` and `ThirdPartyDeletionParams`. The lib does not read the artefact row itself, for two reasons:
   - Deletion runs after `deleteArtefacts`, so the row is already gone. The remove-list handler has to pass the values from the rows it fetched beforehand.
   - For publications, `pushPublicationToThirdParties` (libs/publication, which owns artefact queries) passes a `loadArtefactFields` loader that reads the two fields by `artefactId`. The push calls it only after the secrets and subscriber checks, so a skipped push reads nothing (changed 2026-11-17 after code review). This covers all three upload paths and the 1272 cron without changing `processPublication`'s callers in `apps/`.
3. **One `thirdPartyPushLog` row per HTTP request**, with no migration. JSON, flat-file and deletion requests keep the types `CREATE`, `UPDATE` and `DELETION`. The PDF request is logged as `CREATE_PDF` or `UPDATE_PDF` (both fit `VARCHAR(20)`). See Error Handling for the partial-failure rules.
4. **Legacy ordering and short-circuiting.** In legacy, a failed JSON call throws before the PDF is fetched (LTPMS:69-87), so the PDF is never sent. CaTH does the same.
5. **The return value keeps its shape.** `sendThirdPartyPublications` still returns `"sent" | "failed" | "skipped"`. `"sent"` means every request that was attempted succeeded. The 1272 cron's summary counting is therefore unchanged.

### Request comparison

Line references: CaTH paths are under `libs/legacy-third-party-fulfilment/src/` unless they are qualified. Legacy references use the abbreviations above.

| Field / part / header | Legacy | CaTH today | Planned |
|---|---|---|---|
| **JSON publication: number of requests** | 2: JSON, then PDF (LTPMS:69-87) | 1 combined multipart (`push/http-client.ts:66-69`, `service.ts:87`) | 2: JSON, then PDF |
| JSON request `Content-Type` | `application/json` (LTPS:85) | `multipart/form-data` when a PDF exists, otherwise `application/json` (`push/http-client.ts:62-75`) | Always `application/json` |
| JSON request body | Stored payload string from `GET /publication/{id}/payload`, sent raw (LTPMS:70, LTPS:86; DMS:74-83) | `JSON.stringify(jsonData)` (`service.ts:79`), as a `json` part when a PDF exists (`push/http-client.ts:24`) | `JSON.stringify(jsonData)` as the whole body. It is semantically identical, but whitespace may differ from the stored bytes. No byte-level change is planned |
| PDF request: part name | `file` (LTPS:120-122) | `pdf` (`push/http-client.ts:27`) | `file` |
| PDF request: part filename | `<artefactId>.pdf` (LTPS:121-122) | `publication.pdf` (`push/http-client.ts:27`) | `<artefactId>.pdf` |
| PDF request: part `Content-Type` | `application/octet-stream`. The part is a `ByteArrayResource` with no filename of its own, so Spring's resource writer falls back to octet-stream (MultiPartHelper:31-38). This is inferred from Spring and is not in HMCTS code | `application/pdf` (`push/http-client.ts:27`) | `application/octet-stream`. Not confirmed against real Courtel (decision 6); see Risks |
| PDF request: part `Content-Length` | Written by Spring's resource writer (inferred) | Not sent | Sent |
| PDF request `x-provenance` | `CATH` (LTPS:126, 143; constant LTPS:41) | The artefact's provenance (`push/headers.ts:30`) | `CATH`. All other headers match the JSON request |
| PDF selection | Welsh `<id>_cy.pdf` when `listType.hasAdditionalPdf()` and the language is not ENGLISH, otherwise `<id>.pdf` (LTPMS:74-77, PFMS:89-91). See "Welsh PDF" below | `<id>.pdf` from the publications container (`libs/publication/src/processing/service.ts:948`) | `<id>.pdf`. CaTH has no `_cy` blob. See "Welsh PDF" |
| PDF skipped when empty | Yes: `pdf.length == 0` gives a warning and no request (LTPMS:79-80). A 404 or 413 from data-management also returns `""` (DMS:109-112) | Missing blob means no PDF, so JSON goes alone (`processing/service.ts:948-949`). A zero-length buffer is still sent | Skipped when the blob is absent, has zero length, or is over the size cap |
| PDF size cap | `maxFileSize=2_000_000` on retrieval. Anything larger returns 413, which becomes `""` and the PDF is skipped (DMS:29, 101, 109-112) | None | Skip a PDF larger than 2,000,000 bytes, with a warning |
| PDF sent after a failed JSON request | No. The exception propagates first (LTPMS:71) | n/a | No |
| **Flat file: requests** | 1 multipart (LTPMS:42-45, LTPS:58-72) | 1 multipart (`push/http-client.ts:62-65`) | 1 multipart |
| Flat file part name | `file` (LTPS:60) | `file` (`push/http-client.ts:39`) | `file` |
| Flat file part filename | `sourceArtefactId` verbatim. The attribute is omitted when it is null or empty (LTPS:60, MultiPartHelper:35-37) | `sourceArtefactId` if it has an extension, otherwise `artefactId` (`processing/service.ts:761-763, 944`) | `sourceArtefactId` verbatim, falling back to `artefactId` when it is null or empty (decision 2) |
| Flat file part `Content-Type` | `application/octet-stream` (inferred, as for the PDF) | Taken from the extension: xlsx, xls, csv, pdf, else octet-stream (`push/http-client.ts:8-18, 35`) | `application/octet-stream` |
| **Deletion request** | POST, no body, no `Content-Type` (LTPS:101-109) | POST, empty body, no `Content-Type`, `Content-Length: 0` (`push/http-client.ts:71-77`, `service.ts:111`) | No change apart from the headers below |
| `x-provenance` (JSON, flat file, deletion) | `artefact.getProvenance()` (LTPS:143) | `provenance` (`push/headers.ts:30`) | No change |
| `x-source-artefact-id` | `artefact.getSourceArtefactId()` (LTPS:144). This is optional at legacy ingestion (PublicationController:152) | `artefactId` (`push/headers.ts:31`) | `sourceArtefactId`, falling back to `artefactId` when it is null or empty (decision 2) |
| `x-type` | `artefact.getType().toString()` (LTPS:145) | Hardcoded `"LIST"` (`push/headers.ts:32`) | `artefact.type` |
| `x-list-type` | `artefact.getListType().toString()`, the enum name (LTPS:146) | `listType.name`, which is the same enum-style name, with a fallback to the id (`push/headers.ts:26-27, 33`) | No change |
| `x-content-date` | `LocalDateTime.toString()`, for example `2026-11-16T00:00` or `2026-11-16T09:30:15` (LTPS:147) | `YYYY-MM-DD` from local-time getters (`push/headers.ts:16-21, 34`) | `LocalDateTime.toString()` format, formatted in UTC |
| `x-sensitivity` | Enum name. Ingestion defaults it to `PUBLIC`, and the header falls back to `PUBLIC` if it is null (LTPS:149-151) | `sensitivity` as given, which can be `""` because of the `processPublication` default (`push/headers.ts:35`, `processing/service.ts:815`) | `sensitivity`, or `PUBLIC` when it is empty |
| `x-language` | Enum name: `ENGLISH`, `WELSH` or `BI_LINGUAL` (LTPS:153) | Stored value. CaTH stores `BILINGUAL` (`push/headers.ts:36`, `libs/publication/src/language.ts:4`) | Map `BILINGUAL` to `BI_LINGUAL`. Other values pass through unchanged |
| `x-display-from` | `LocalDateTime.toString()`, always present because LIST requires it at ingestion (LTPS:154, ValidationService:130-138) | `YYYY-MM-DD` from local getters, omitted when null (`push/headers.ts:38`) | `LocalDateTime.toString()` format in UTC. Omitted when null (decision 3) |
| `x-display-to` | As `x-display-from` (LTPS:155) | As `x-display-from` (`push/headers.ts:39`) | As `x-display-from` |
| `x-location-name` | `location.getName()`, the English name (LTPS:156) | `location.name` (`push/headers.ts:40`) | No change |
| `x-location-jurisdiction` | `String.join(",", location.getJurisdiction())`: every top-level jurisdiction, comma-joined with no space (LTPS:157, Location.jurisdiction) | First sub-jurisdiction's `jurisdictionName` only (`push/headers.ts:41`) | Distinct `subJurisdictions[].jurisdictionName` in order, joined with `","` |
| `x-location-region` | `String.join(",", location.getRegion())` (LTPS:158) | First region only (`push/headers.ts:42`) | Every `regions[].name`, joined with `","` |
| Multipart request `Content-Type` | `multipart/form-data;boundary=…`, set by Spring | `multipart/form-data; boundary=----FormBoundary…` (`push/http-client.ts:65, 69`) | No change. The difference is only formatting |
| Retry policy (for reference, not changed here) | `Retry.backoff(3, 2s)`: 4 attempts in all, retrying every error including 4xx (LTPS:162-170, application.yaml:70-72) | 3 attempts with 1s and 2s backoff. Retries only 0, 429 and 5xx (`push/retry.ts:3-13`) | No change: out of scope, dealt with separately (decision 5) |

#### Date format

Java `LocalDateTime.toString()` prints `uuuu-MM-dd'T'HH:mm`. It appends `:ss` only when the seconds or the fraction are non-zero, and a fraction only when it is non-zero. A JS `Date` has millisecond resolution, so the fraction is always three digits (`.120`). CaTH formats the stored instant in **UTC**, not Europe/London, for these reasons:
- Manual and non-strategic uploads store UTC midnight (`parseDate` uses `Date.UTC`). Formatting in UTC gives `…T00:00`, which is what legacy holds for a date-only upload. Formatting in Europe/London would give `…T01:00` during BST.
- Legacy parses an ISO header into a `LocalDateTime` and keeps the wall-clock digits. For a header sent with `Z` or with no offset (pods run in UTC), the UTC components of CaTH's stored `Date` are those same digits.
- Using UTC getters makes the output independent of the server's `TZ`. This removes the "one day early in BST" defect.

### Welsh PDF

**Legacy.** `hasAdditionalPdf` defaults to `true` (ListType:344). The newer list types switch it off with the seventh constructor argument. It stays on for SJP_PRESS_REGISTER, COP_DAILY_CAUSE_LIST, ET_DAILY_LIST, ET_FORTNIGHTLY_PRESS_LIST, SSCS_DAILY_LIST(+_ADDITIONAL_HEARINGS), IAC_DAILY_LIST(+_ADDITIONAL_CASES), PCOL_DAILY_CAUSE_LIST, HIGH_COURT_CIVIL/HIGH_COURT_FAMILY/BUSINESS_AND_PROPERTY/CIRCUIT_COMMERCIAL_COURT/TECHNOLOGY_AND_CONSTRUCTION_COURT_DAILY_CAUSE_LIST, and the deprecated CROWN_*/CARE_STANDARDS/PRIMARY_HEALTH/CIC_DAILY_HEARING lists.
- For a non-ENGLISH publication of one of those types, data-management generates two PDFs (PFGS:133-150): an English `<id>.pdf` and a Welsh `<id>_cy.pdf`. Third-party push asks for the additional one (LTPMS:74-77, PFMS:89-90), so Courtel gets the **Welsh** PDF.
- For every other list type, legacy renders a single `<id>.pdf` in the publication's language (PFGS:152). LRH:51-53 maps every non-ENGLISH language, `BI_LINGUAL` included, to the `cy/` resources.
- Either way, the multipart filename is `<artefactId>.pdf` (LTPS:121-122). **Net legacy rule: Courtel gets a Welsh PDF whenever the language is not ENGLISH, and one PDF at most.** The "additional PDF" replaces the English one. It is not sent as an extra request.

**CaTH.** `generatePublicationPdf` writes one blob, `<artefactId>.pdf` (`libs/list-types/common/src/pdf/pdf-utilities.ts:29-38`). It is rendered in `locale`, which every upload caller sets as `language === "WELSH" ? "cy" : "en"`. No `_cy` blob or second PDF exists anywhere in CaTH.
- **WELSH**: CaTH's `<id>.pdf` is already the Welsh rendering, which is what legacy sends. Sending `<id>.pdf` matches legacy, and no new work is needed.
- **ENGLISH**: matches legacy.
- **BILINGUAL**: legacy sends a Welsh PDF. **CaTH has no Welsh PDF to send**, because the only PDF is the English rendering. This plan sends the English `<id>.pdf`, because that is what exists. Producing a Welsh PDF for bilingual publications would change PDF generation, downloads and emails, so a follow-up ticket covers it (decision 1).

So the ticket's "send the Welsh PDF where legacy does" reduces to two things: send `<id>.pdf` with the legacy filename and provenance, and record the bilingual gap. No extra request is added.

## 2. Implementation Details

TEMPLATE SOURCE: n/a

No pages, templates, translations, API endpoints or Prisma schema changes are needed.

### `libs/legacy-third-party-fulfilment/src/`

| File | Change |
|---|---|
| `push/headers.ts` | `PushHeaderParams` gains `type` and `sourceArtefactId`, and keeps `artefactId` for the fallback. Add the UTC `LocalDateTime.toString()` formatter. Map `BILINGUAL` to `BI_LINGUAL`. Default an empty sensitivity to `PUBLIC`. Comma-join the distinct jurisdictions and all regions. `x-source-artefact-id` is `sourceArtefactId`, or `artefactId` when that is null or empty. Add `buildPdfPushHeaders(headers)`, which overrides `x-provenance` to `CATH` |
| `push/multipart.ts` (new) | `buildFileMultipart(buffer, fileName)` returns a `PushBody`. It writes one `file` part, `Content-Type: application/octet-stream`, a part `Content-Length`, and a `filename` attribute. The caller passes `sourceArtefactId`, or `artefactId` when that is null or empty, so the filename is always present. The boundary uses `crypto.randomBytes`, as it does today |
| `push/http-client.ts` | `executePush(url, certPem, headers, body: PushBody \| null)` sends `body.buffer` with `Content-Type: body.contentType`. A null body sends no body and no `Content-Type`. Remove `buildMultipartBody`, `buildFlatFileMultipartBody` and `CONTENT_TYPE_MAP`. Add the `jsonBody(json)` helper, which returns a `PushBody` with `application/json`. Types: `PushBody`, `PushFiles` (now `pdf?: Buffer`, `flatFile?: Buffer`). `PushFlatFile` is removed because the filename now comes from `sourceArtefactId` (or `artefactId`) |
| `push/retry.ts` | `pushWithRetry(url, certPem, headers, body: PushBody \| null, logPrefix)`. The policy is unchanged |
| `service.ts` | `ThirdPartyPushParams` and `ThirdPartyDeletionParams` gain `type: string` and `sourceArtefactId: string \| null`. `sendThirdPartyPublications` keeps the existing secrets, subscriber and `loadFiles` checks, then chooses a path. **Flat file**: one request, logged `CREATE`/`UPDATE`. **JSON**: send the JSON request and log it. If it failed, return `"failed"`. If not, and a sendable PDF exists, send the PDF request with the PDF headers and log it `CREATE_PDF`/`UPDATE_PDF`. Return `"sent"` only if every attempted request succeeded. `sendThirdPartyDeletion` passes the new fields to `buildPushHeaders`. `writePushLog` takes the log type as given |
| `index.ts` | Export `PushFiles` and the param, outcome and deletion types. Drop the `PushFlatFile` export |

PDF eligibility lives in `service.ts` as a named constant and a small predicate: the buffer is present, its length is above 0, and it is at most 2,000,000 bytes (`COURTEL_MAX_PDF_BYTES`, mirroring legacy `MAX_FILE_SIZE`). Each skip logs the reason, as legacy's "Empty PDF not sent to third party" does.

### `libs/publication/src/`

| File | Change |
|---|---|
| `repository/queries.ts` | New `findArtefactPushFields(artefactId)`, which returns `{ type, sourceArtefactId }` or null. Add `sourceArtefactId` to the `getArtefactsByIds` select |
| `repository/model.ts` | `Artefact` gains an optional `sourceArtefactId` |
| `processing/service.ts` | `ThirdPartyPublicationParams` also omits `type` and `sourceArtefactId`. `pushPublicationToThirdParties` passes `loadArtefactFields: () => findArtefactPushFields(artefactId)`, which `sendThirdPartyPublications` calls after the secrets and subscriber checks. When the row is missing the push logs an error and returns `"failed"`. Otherwise it passes the fields through. `loadThirdPartyFiles` returns `{ flatFile: buffer }` and drops the `fileName ?? artefactId` fallback. `getNotifyFileName` stays because email still uses it |

The 1272 cron (`subscription-schedule/service.ts`) needs no code change, because it calls `pushPublicationToThirdParties`, which now does the lookup.

### `apps/web/src/pages/(admin)/remove-list-confirmation/index.ts`

Pass `type` and `sourceArtefactId` from `artefactsToDelete` to `sendThirdPartyDeletion`. This is the only change in `apps/`, and it is needed because the row no longer exists when the push runs.

### `libs/test-support/src/routes/test-support/mock-courtel.ts` (Courtel mock from `cf6021e3`, since renamed)

- Accept the three legacy shapes:
  - `application/json` with a non-empty body
  - `multipart/form-data` with exactly one part named `file`
  - an empty-body POST (deletion)
- Reject the old combined multipart (`json` or `pdf` parts, or more than one part) with 400 and a reason, so a regression shows up when testing against the mock.
- When `x-provenance` is `CATH`, require the part filename to end in `.pdf`.
- Decide between 201 and 200 on `x-source-artefact-id` plus the request kind (json, pdf, file, delete). Today the PDF that follows a JSON request would be reported as an update.
- Require the headers CaTH always sends, but treat `x-display-from` and `x-display-to` as optional, because CaTH omits them when a list has none (decision 3). The log output shows the parts' names, filenames and content types.
- The mock is the end-to-end check for this ticket (decision 6), so it must accept every request shape CaTH now sends and reject the old ones.
- Add a co-located `mock-courtel.test.ts`, because the mock has no tests today.

## 3. Error Handling & Edge Cases

| Scenario | Behaviour |
|---|---|
| JSON request fails (non-retryable 4xx, or retries exhausted) | One `FAILED` row (`CREATE`/`UPDATE`). The PDF is **not** sent, as in legacy. Outcome `"failed"` |
| JSON succeeds, PDF fails | `SUCCESS` row (`CREATE`/`UPDATE`) plus `FAILED` row (`CREATE_PDF`/`UPDATE_PDF`), each with its own status code. Outcome `"failed"`. The error log names the PDF request. JSON is not resent: legacy has no compensation, and nothing re-pushes automatically |
| PDF absent (no generator, generation failed, payload over the PDF limit, blob missing) | JSON only. One row. Outcome `"sent"`. Info log that no PDF was sent |
| PDF is zero bytes or over 2,000,000 bytes | Same as absent, with a warning that gives the size |
| PDF blob download throws a non-404 error | `loadFiles` rejects before anything is sent, which is the current behaviour. The caller logs it and the outcome is `"failed"`. This is an accepted divergence: legacy would have sent the JSON first |
| Non-flat publication with no `jsonData` and no flat file | Error log and `"failed"`, with no request. Today an empty POST goes out, which Courtel would read as a deletion |
| Flat file blob missing | Unchanged: `loadFiles` resolves null, giving `"failed"` and no request |
| Artefact row missing in `pushPublicationToThirdParties` | Error log and `"failed"`, with no request |
| `sourceArtefactId` null or empty (API uploads only; manual uploads always set it) | `x-source-artefact-id` and the flat-file `filename` fall back to `artefactId` (decision 2) |
| `displayFrom`/`displayTo` null | Header omitted (decision 3). CaTH accepts LIST without them, and legacy does not |
| Empty `sensitivity` | `PUBLIC`, as in legacy |
| Location with several sub-jurisdictions under one jurisdiction | That jurisdiction appears once in the header |
| Location with no regions or jurisdictions | Empty string, as today. The location query has no `orderBy`, so the order of joined values follows the database and may differ from the legacy CSV order |
| Content date | The upload path passes the parsed header `Date`, which can include a time, and sends it as legacy did. The cron and deletion read the `@db.Date` column, so they always format as `T00:00` (decision 4) |
| Push log write fails | Unchanged: fire-and-forget with a warning, and it never changes the outcome |
| Two requests doubles the timeout exposure | Worst case per request is about 93s (3 × 30s plus 3s backoff), so about 186s for JSON plus PDF. The upload paths are fire-and-forget. The 1272 cron is sequential, so a Courtel outage lengthens the run. This is noted, and no change is planned |

Validation: header values come from stored artefact and location data, not user input. The multipart `filename` is `sourceArtefactId`, which a publisher controls, so `buildFileMultipart` strips `"`, `\r` and `\n` from it to stop the part headers being broken.

## 4. Acceptance Criteria Mapping

| Ticket item | How it is met | Verified by |
|---|---|---|
| Confirm the expected format | Decided 2026-11-16 by the assignee: legacy is the spec (Decision record) | This plan |
| JSON publication as two requests, legacy part, filename and `x-provenance: CATH`, empty PDF skipped | `service.ts` JSON path plus `push/multipart.ts` | TS1, TS4, TS5, TS6 |
| Welsh PDF where legacy sends it | `<id>.pdf` is the Welsh rendering for WELSH publications. The bilingual gap is recorded | TS2, TS3 |
| `x-source-artefact-id` from `sourceArtefactId`, `x-type` from `artefact.type` | New params, plus the lookup and the deletion caller | TS1, TS7, TS8, TS10 |
| Every jurisdiction and region, comma-joined | `push/headers.ts` | TS9 |
| Legacy date format in UTC | `push/headers.ts` formatter | TS9 |
| Partial-failure logging in `thirdPartyPushLog` | One row per request, `*_PDF` types | TS5, TS6 |
| Mock updated | `mock-courtel.ts` and its test | TS11 |
| DoD: unit tests per shape (JSON+PDF, JSON+Welsh PDF, JSON no PDF, flat file, deletion) | TS1, TS2, TS4, TS7, TS8 | `yarn test` in both libs |
| DoD: coverage >80% | Co-located tests for every changed file | `yarn test --coverage` in `libs/legacy-third-party-fulfilment` and `libs/test-support` |
| DoD: format decisions in `plan.md` | This file | Review |
| DoD: verified end to end | Against the updated CaTH Courtel mock, not the real Courtel test endpoint (decision 6) | TS11, TS12 |

## 5. Test Scenarios

There is one scenario per publication shape (the "journey" here is a push), plus the error paths the ticket does not name. All of them are Vitest unit tests co-located with the code, except TS12. No Playwright test is added: nothing user-facing changes, and the e2e suite has no Courtel wiring.

- **TS1: JSON publication with an English PDF.** Two requests go out in order. The first is `application/json` with the JSON body. The second is a multipart with one `file` part named `<artefactId>.pdf`, part `Content-Type: application/octet-stream`, and the PDF bytes. Both requests carry identical headers except `x-provenance` (the artefact's on the first, `CATH` on the second). `x-source-artefact-id` and `x-type` come from the params. Two `SUCCESS` rows (`CREATE`, `CREATE_PDF`; `UPDATE`/`UPDATE_PDF` when `isUpdate`). Outcome `"sent"`.
- **TS2: WELSH JSON publication with a PDF.** As TS1, with `x-language: WELSH`. The PDF request carries the `<id>.pdf` buffer from `loadFiles` under the filename `<artefactId>.pdf`.
- **TS3: BILINGUAL JSON publication.** `x-language: BI_LINGUAL`. The PDF sent is the single `<id>.pdf`. The test name records that this is CaTH's English PDF (the known gap).
- **TS4: JSON publication without a sendable PDF.** For no PDF, a zero-length PDF, and a PDF of 2,000,001 bytes, only the JSON request goes out and there is one row. Outcome `"sent"`. A PDF of exactly 2,000,000 bytes is sent.
- **TS5: JSON request fails.** For a 400 (no retry) and a 503 that exhausts retries, no PDF request goes out and there is one `FAILED` row with the status code. Outcome `"failed"`.
- **TS6: JSON succeeds, PDF fails.** `SUCCESS` `CREATE` row and `FAILED` `CREATE_PDF` row. Outcome `"failed"`. The error log names the PDF request.
- **TS7: Flat-file publication.** One multipart with a `file` part:
  - `filename` equals `sourceArtefactId` verbatim (`hearing-list.xlsx`, and also `ABC123` with no extension)
  - `filename` is the `artefactId` when `sourceArtefactId` is null or empty
  - part `Content-Type: application/octet-stream`
  - `x-provenance` is the artefact's
  - one row, outcome `"sent"`
  - `loadThirdPartyFiles` returns `{ flatFile: buffer }`
- **TS8: Deletion.** A POST with no body and no `Content-Type`, carrying the full fixed header set (`x-source-artefact-id` from `sourceArtefactId`, `x-type` from `type`), and a `DELETION` row. The remove-list handler passes `type` and `sourceArtefactId` from the fetched artefacts.
- **TS9: Header formatting** (table-driven `it.each` in `push/headers.test.ts`):
  - dates: UTC midnight gives `…T00:00`; `09:30:15` gives `…T09:30:15`; `09:30:00.120` gives `…T09:30:00.120`; a BST date stored as UTC midnight keeps its calendar day. The tests run with `process.env.TZ` set to a non-UTC zone to prove the output does not depend on the server's time zone
  - jurisdictions are distinct and comma-joined, and regions are all comma-joined
  - null display dates are omitted, and a null or empty `sourceArtefactId` falls back to `artefactId`
  - an empty sensitivity becomes `PUBLIC`
  - `BILINGUAL` becomes `BI_LINGUAL`, and ENGLISH and WELSH are unchanged
  - `buildPdfPushHeaders` overrides only `x-provenance`
- **TS10: No push, or a bad input.**
  - Secrets missing, or no subscribers: `"skipped"`, and `loadFiles` is not called (existing tests, updated)
  - A non-flat publication with no `jsonData`: `"failed"` with no request
  - `pushPublicationToThirdParties` with a missing artefact row: `"failed"`, and `sendThirdPartyPublications` is not called
  - Otherwise `type` and `sourceArtefactId` are passed through from the row. The 1272 cron's existing outcome tests still pass
- **TS11: Courtel mock.**
  - Accepts the JSON, single-`file` multipart and empty-body deletion requests
  - Rejects a `json`/`pdf` combined multipart, and a multipart with more than one part, with 400
  - Rejects a `CATH` request whose filename does not end in `.pdf`
  - Accepts a request with no `x-display-from`/`x-display-to`
  - A JSON request followed by a PDF for the same artefact both return 201, and a repeat JSON request returns 200
- **TS12: Local end to end against the CaTH mock** (manual, DoD, decision 6). Run CaTH locally with `COURTEL_API_URL` pointing at the CaTH Courtel mock, then upload:
  - an English JSON list with a PDF generator
  - a Welsh JSON list
  - a flat file
  - a removal of the flat file

  Check what the mock received (request count, part name, filename, part content type, every `x-*` header) against the table above, and check the `legacy_third_party_push_log` rows. Record the results in the PR description.

## 6. Risks

- Courtel may have adapted to the combined format while #323 was tested. The ticket notes that no deployed environment could have sent a combined body with a real PDF, and the assignee has confirmed legacy is the target.
- The part `Content-Type` (`application/octet-stream`) comes from Spring internals, not HMCTS code. Because the end-to-end check uses the CaTH mock (decision 6), nothing confirms it against real Courtel before release.
- This is separate from #1380 and not changed here: the Courtel URL secret is `auto-pip-stg-courtel-api` in all three charts, and prod is expected to be `auto-pip-prod-courtel-api` (#1097).

## CLARIFICATIONS NEEDED

None outstanding. All six were decided with the assignee on 2026-11-16.

1. **Bilingual publications. Decided: send the English PDF, and raise a follow-up ticket.** For any non-ENGLISH publication, legacy sends Courtel a single Welsh PDF. For `hasAdditionalPdf` list types it generates English and Welsh together (PFGS:138-149) and pushes the `_cy` one. For every other type, its single PDF uses the `cy/` resources for any non-ENGLISH language, `BI_LINGUAL` included (LRH:52). CaTH renders `BILINGUAL` publications in English only, so they send the English `<id>.pdf` until the follow-up ticket makes CaTH produce Welsh PDFs for bilingual lists. That ticket would also change the site, downloads and emails.
2. **Null `sourceArtefactId`. Decided: fall back to `artefactId`.** Only API uploads can lack one, because manual uploads always store the file name (`manual-upload-summary/index.ts:114`, as pip-frontend `ManualUploadService.ts:252`). Legacy passed a null value to the header, with an unclear outcome. CaTH sends `artefactId` in `x-source-artefact-id` and as the flat-file `filename` whenever `sourceArtefactId` is null or empty.
   - **Added 2026-11-17 (from code review):** the same fallback applies when `sourceArtefactId` holds characters Node refuses in a header (for example `ŵ`, `’`, CR or LF). CaTH's manual upload stores the file name as given, so such names can exist. Sending one would throw and fail the whole push. Legacy never hit this, because its upload sent the name as a header and failed at upload. Only the header falls back. The flat-file part `filename` is in the request body, so it keeps the real name.
3. **Null display dates. Decided: omit the headers.** #1026 (merged via #1059) made display dates optional on CaTH's API, following legacy's published API definition. Legacy's `ValidationService.handleDateValidation` still required both for LIST, so Courtel never received a LIST without them. CaTH omits the missing headers, and the mock accepts that. No ticket is raised about #1026.
4. **Content date time. Decided: keep the upload's time.** Legacy stores `contentDate` as a `LocalDateTime` and sends that same value on every push. CaTH stores it as `@db.Date`, so the upload path sends the time from the request, as legacy did, and the cron and deletion pushes send `…T00:00`.
5. **Retry policy. Decided: out of scope, dealt with separately.** #323 QA (KianKwa, 2026-05-05) failed the retry count: CaTH makes 3 requests, and legacy makes 4. That is still outstanding. Retries are unchanged in this ticket.
6. **End-to-end check. Decided: use the CaTH Courtel mock.** The updated mock (TS11) and a local run against it (TS12) are the end-to-end check. No real Courtel test endpoint is used, so the inferred part `Content-Type` is unconfirmed (see Risks).
