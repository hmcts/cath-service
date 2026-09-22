# #1026: Align POST /publication with the CaTH Inbound Publication API contract (metadata via x-* headers, not body)

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-09-10T15:06:59Z
**Updated:** 2026-09-14T08:16:12Z

## Description

## User Story

**As a** service that currently publishes to `pip-data-management` (SNL, Common Platform, PDDA, CP_CATH)
**I want** `cath-service`'s `POST /publication` endpoint to accept exactly the same request contract as the documented CaTH Inbound Publication API
**So that** when `cath-service` goes to PROD I only change the destination URL — no code change, no redeploy, no coordinated cutover.

## Background

`cath-service` exposes a publication ingestion endpoint at `apps/api/src/routes/v1/publication.ts`, but it invented its own contract: all publication metadata (`court_id`, `provenance`, `content_date`, `list_type`, `sensitivity`, `language`, `display_from`, `display_to`) is read from **snake_case fields in the JSON request body**, with the actual list payload nested under a `hearing_list` wrapper.

The incumbent service takes every one of those values as an **`x-*` HTTP header**, with the request body being the publication payload itself and nothing else. Reference spec (pinned commit):

https://github.com/hmcts/pip-data-management/blob/2bd5c3b48747e18f9d57618e2106d61baa84b7f9/infrastructure/resources/swagger/api-swagger.json

Every upstream publisher is already built against the header contract. As it stands, pointing any of them at `cath-service` returns `400` on the first request. This must be fixed before PROD, and ideally before any upstream service is asked to test against us.

Relevant existing code:

- Route + request discrimination: `apps/api/src/routes/v1/publication.ts`
- Request model: `libs/api/src/blob-ingestion/repository/model.ts` (`BlobIngestionRequest`, `FlatFileIngestionRequest`, `BlobIngestionResponse`)
- Validation: `libs/api/src/blob-ingestion/validation.ts` (`validateCommonFields`, `validateBlobRequest`, `validateFlatFileRequest`)
- Ingestion service: `libs/api/src/blob-ingestion/repository/service.ts` (`processBlobIngestion`, `processFlatFileBlobIngestion`, `buildArtefactParams`)
- S3 / LCSU upload: `libs/pdda-html-upload/` (`validatePddaHtmlUpload`, `uploadHtmlToS3`)
- Enums: `libs/publication/src/language.ts`, `libs/publication/src/sensitivity.ts`

## One endpoint, three modes — routing is defined by content type and `x-type`

This is the central structural requirement and it is not currently met.

The incumbent serves **a single path** and routes internally. From [`PublicationController.java`](https://github.com/hmcts/pip-data-management/blob/48a922c8e0996955dc2f57b0ebccf81f727cf5a9/src/main/java/uk/gov/hmcts/reform/pip/data/management/controllers/publication/PublicationController.java):

```java
@RequestMapping("/publication")                                // line 67  — one path
  @PostMapping                                                 // line 148 — application/json
  @PostMapping(consumes = MULTIPART_FORM_DATA_VALUE)           // line 211 — flat file AND LCSU/S3
  @PostMapping(value = "/non-strategic", consumes = MULTIPART) // line 288 — separate path, out of scope
```

So:

| Mode | Content-Type | `x-type` | Destination |
|---|---|---|---|
| JSON publication | `application/json` | `LIST` | Blob storage, artefact persisted |
| Flat file publication | `multipart/form-data` | `LIST` | Blob storage, artefact persisted, `isFlatFile: true` |
| **LCSU HTML** | `multipart/form-data` | **`LCSU`** | **AWS S3 bucket, artefact NOT persisted** |

**`x-type` is the discriminator between a flat-file publication and an S3 upload.** Both arrive on the same path with the same content type and the same header set — only `x-type` differs. There must be exactly one endpoint; the three modes must not be split across separate paths.

### The LCSU branch, verbatim

[`PublicationController.java:240-248`](https://github.com/hmcts/pip-data-management/blob/48a922c8e0996955dc2f57b0ebccf81f727cf5a9/src/main/java/uk/gov/hmcts/reform/pip/data/management/controllers/publication/PublicationController.java#L240-L248):

```java
if (type.equals(ArtefactType.LCSU) && !validateLcsuUploadFile(file)) {
    throw new FileFormatNotSupportedException("File format is not supported for LCSU.");
}

if (type.equals(ArtefactType.LCSU)) {
    publicationServicesService.uploadHtmlFileToAwsS3Bucket(file);
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(artefact);
}
```

Behaviour to replicate, in order:

1. **All headers are validated first**, for LCSU exactly as for a flat file — `validationService.validateBody(file)` then `validationService.validateHeaders(initialHeaders)`.
2. **The artefact metadata object is built before the branch** (`createPublicationMetadataFromHeaders(headers, file.getSize(), true)`), so an LCSU request carries and is validated against the full metadata set.
3. **File format is checked** — `validateLcsuUploadFile` (line 471) accepts only `.html` or `.htm`, case-insensitive, and a failure raises `FileFormatNotSupportedException`.
4. **The file is pushed to S3** and the method returns **`201` with the artefact body**.
5. **Nothing is persisted.** LCSU does *not* run `publicationCreationRunner.run`, does *not* set `search`, does *not* set `isFlatFile`, and does *not* call `processCreatedPublication`. This is why the spec notes `artefactId` is blank for LCSU — CaTH is a pass-through for this type.

The JSON endpoint (line 148) also takes `x-type` but does **not** branch on `LCSU`; LCSU is file-only.

### What we do today, and why it is wrong

`apps/api/src/routes/v1/publication.ts` gets the shape right — one route, three handlers — but discriminates on the wrong thing and drops the metadata:

```ts
function isPddaHtmlUpload(req: Request): boolean {
  return typeof req.body?.type === "string";   // line 57 — any multipart body with a `type` field
}
```

- The discriminator is **"a `type` form field exists"**, not **"`x-type` equals `LCSU`"**. A multipart request with `type: "JSON"` is routed to the HTML handler and then rejected with an HTML-specific message instead of falling through to flat-file ingestion.
- `handleHtmlFileUpload` (lines 90-111) reads **only** `req.body.type` and `req.file`. It never reads `court_id`, `provenance`, `content_date`, `list_type`, `sensitivity`, `language`, `display_from` or `display_to`. So our S3 path accepts a request the incumbent would reject, and validates none of the metadata the incumbent validates.
- Our S3 response is `{ success, message, s3_key, correlation_id, ... }`, not `201` with an artefact object.
- Once `type` moves to the `x-type` header, `typeof req.body?.type === "string"` is always false for spec-valid requests, so **every LCSU upload would silently route to `handleFlatFileUpload`** and be written to blob storage instead of S3.

## Gap Analysis

### 1. Metadata moves from body to headers

| Spec header | Required | Current body field | Notes |
|---|---|---|---|
| `x-provenance` | **yes** | `provenance` | |
| `x-court-id` | **yes** | `court_id` | |
| `x-content-date` | **yes** | `content_date` | spec is `date-time`; we currently validate `YYYY-MM-DD` prefix |
| `x-list-type` | **yes** | `list_type` | |
| `x-language` | **yes** | `language` | |
| `x-type` | **yes** | *missing* | `LIST` \| `LCSU` — we hardcode `type: "LIST"` in `buildArtefactParams`, and this is the flat-file/S3 discriminator |
| `x-sensitivity` | no (default `PUBLIC`) | `sensitivity` | **we require it** |
| `x-display-from` | no | `display_from` | **we require it** |
| `x-display-to` | no | `display_to` | **we require it** |
| `x-source-artefact-id` | no | `source_artefact_id` | already optional |

### 2. Request body shape

- **Spec:** for `application/json`, the body *is* the publication payload. For `multipart/form-data`, a single form field named `file`, and metadata still comes from headers.
- **Current:** JSON body is a metadata envelope with the payload nested under `hearing_list`. Multipart requests carry metadata as additional *form fields*.

The `hearing_list` wrapper must be removed, and multipart metadata must be read from headers rather than form fields — for LCSU as well as flat file.

### 3. Three optional fields are currently mandatory

`x-sensitivity`, `x-display-from` and `x-display-to` are optional in the spec. `validateCommonFields` rejects requests that omit any of them. A publisher sending a spec-valid minimal request gets a `400` today. This is the single most likely cause of a failed cutover, because it fails for *valid* input.

Required behaviour: `sensitivity` defaults to `PUBLIC`; `display_from` / `display_to` are nullable and the existing `display_to >= display_from` check only applies when both are present.

### 4. Success response shape

- **Spec 201:** the full `Artefact` object — `artefactId`, `contentDate`, `courtId`, `displayFrom`, `displayTo`, `isFlatFile`, `language`, `listType`, `payload` (blob URL), `provenance`, `search`, `sensitivity`, `sourceArtefactId`, `type`. camelCase.
- **Current 201:** `{ success, artefact_id, no_match, message }`. snake_case, and omits everything else.
- **LCSU 201:** also the artefact object, but unpersisted — blank `artefactId`, no `search`, `isFlatFile` unset.

Any publisher that reads the response (e.g. storing `artefactId`, or checking `isFlatFile`) breaks.

### 5. Error response shape and status codes

- **Spec 400/409:** `Message` — `{ message, timestamp }`.
- **Current 400:** `{ success: false, message, errors: [{ field, message }] }`.
- **Spec has 409 Conflict.** We never return it.
- **We return `200` with `no_match: true`** when the location can't be resolved from reference data. This status/shape appears nowhere in the spec; a publisher will read `200` as success.
- **LCSU wrong file type** must be an error consistent with `FileFormatNotSupportedException`, not our current ad-hoc 400 body.

Decide whether "location not found" maps to `409`, to `400`, or stays a `200` (see open questions).

### 6. Enum divergence

- `x-language` input accepts only `ENGLISH` \| `WELSH` in the spec. Our `Language` enum also has `BILINGUAL`, and the spec's *response* enum spells it **`BI_LINGUAL`** (with underscore). If we emit `BILINGUAL` in the `Artefact` response we're off-spec.
- **`x-type` must be a validated enum of `LIST` \| `LCSU`.** An unrecognised value must be rejected, not silently treated as `LIST`.
- The spec's `x-list-type` enum is a fixed list of 15 values. We validate against the `list_type` table instead. **Keep the DB-driven validation** — per `CLAUDE.md` we must not hardcode list-type identifiers — but confirm every one of the spec's 15 names exists in `list-type-data.ts`, otherwise a spec-valid request 400s on an unknown list type.

### 7. Replace the routing discriminator with `x-type`

Covered in detail above. Concretely:

- Delete `isPddaHtmlUpload`'s body-field check and route on `x-type === "LCSU"` instead.
- Keep the existing three-way structure in the single `POST` handler: content type selects JSON vs multipart, then `x-type` selects flat file vs LCSU.
- Reject an unknown `x-type` rather than defaulting.
- Reuse `libs/pdda-html-upload`'s `uploadHtmlToS3`; replace `validatePddaHtmlUpload`'s `type === "LCSU"` check with the header-derived value, and keep the `.html` / `.htm` extension check to match `validateLcsuUploadFile`.

## Acceptance Criteria

* **Scenario:** JSON publication accepted with headers only
    * **Given** a `POST` to the publication endpoint with `Content-Type: application/json`, headers `x-provenance`, `x-court-id`, `x-content-date`, `x-list-type`, `x-language`, `x-type: LIST`, and a body that is the raw list payload with no `hearing_list` wrapper
    * **When** the request is processed
    * **Then** the artefact is created and the response is `201` with the full `Artefact` object in camelCase

* **Scenario:** Optional headers may be omitted
    * **Given** a request that omits `x-sensitivity`, `x-display-from`, `x-display-to` and `x-source-artefact-id`
    * **When** the request is processed
    * **Then** it is accepted, `sensitivity` defaults to `PUBLIC`, and the artefact is created with null display dates

* **Scenario:** Missing required header is rejected
    * **Given** a request missing any of `x-provenance`, `x-court-id`, `x-content-date`, `x-list-type`, `x-language` or `x-type`
    * **When** the request is processed
    * **Then** the response is `400` with a `Message` body of `{ message, timestamp }`

* **Scenario:** One endpoint serves all three modes
    * **Given** the same path is used for a JSON publication, a flat-file publication and an LCSU HTML upload
    * **When** each is sent with its respective `Content-Type` and `x-type`
    * **Then** all three are accepted by that single endpoint, with no separate path for the S3 upload

* **Scenario:** Flat file upload uses headers plus a `file` form field
    * **Given** a `multipart/form-data` request with `x-type: LIST`, the metadata in `x-*` headers and the file in a form field named `file`
    * **When** the request is processed
    * **Then** the artefact is created in blob storage and the `201` `Artefact` response has `isFlatFile: true`

* **Scenario:** `x-type: LCSU` routes the file to the S3 bucket
    * **Given** a `multipart/form-data` request with `x-type: LCSU`, the full `x-*` metadata header set and an `.html` file in a form field named `file`
    * **When** the request is processed
    * **Then** the file is uploaded to the AWS S3 bucket, **not** to blob storage, no artefact row is persisted, and the response is `201` with the artefact object carrying a blank `artefactId`

* **Scenario:** LCSU validates its headers like any other publication
    * **Given** an `x-type: LCSU` request missing a required `x-*` header
    * **When** the request is processed
    * **Then** it is rejected with `400` before any S3 upload is attempted

* **Scenario:** LCSU rejects a non-HTML file
    * **Given** an `x-type: LCSU` request whose file is not `.html` or `.htm`
    * **When** the request is processed
    * **Then** the response is an error equivalent to the incumbent's `FileFormatNotSupportedException` and nothing is uploaded

* **Scenario:** `x-type: LIST` with a file never reaches S3
    * **Given** a `multipart/form-data` request with `x-type: LIST`
    * **When** the request is processed
    * **Then** it is handled as a flat-file publication and written to blob storage, with no S3 call

* **Scenario:** An unrecognised `x-type` is rejected
    * **Given** a request with `x-type` set to anything other than `LIST` or `LCSU`
    * **When** the request is processed
    * **Then** the response is `400` and the request is not silently treated as `LIST`

* **Scenario:** JSON payload is validated against the schema for `x-list-type`
    * **Given** a JSON body that does not satisfy the schema for the list type in `x-list-type`
    * **When** the request is processed
    * **Then** the response is `400` with a `Message` body describing the validation failure

* **Scenario:** Supersede rule matches the incumbent
    * **Given** an active publication already exists
    * **When** a new publication arrives with matching `x-court-id`, `x-content-date`, `x-language`, `x-list-type` and `x-provenance`
    * **Then** the existing publication is superseded/overwritten, as documented in the spec

* **Scenario:** Bilingual language value is spec-compliant
    * **Given** an artefact whose language is bilingual
    * **When** it is returned in an `Artefact` response
    * **Then** the value is `BI_LINGUAL`, matching the spec's response enum

* **Scenario:** A recorded incumbent request succeeds unchanged
    * **Given** a request captured from a real publisher against `pip-data-management`
    * **When** it is replayed against `cath-service` with only the base URL changed
    * **Then** it succeeds with an equivalent status code and response shape

## Out of Scope

- `POST /publication/non-strategic` (the Excel upload path, `PublicationController.java:288`) — a separate path, not part of this contract alignment.
- The `GET /` welcome endpoint in the spec (we have `healthcheck()` already — confirm separately whether any publisher probes `/`).
- APIM / `sds-api-mgmt` routing configuration.
- Changes to any upstream publisher.

## Open Questions

1. **Endpoint path.** The spec serves `POST /publication` at the server root (e.g. `https://sds-api-mgmt.staging.platform.hmcts.net/publication`). Ours is at `/api/v1/publication`. "Just change the URL" only holds if the path matches or APIM rewrites it. Do we move/alias the route to `/publication`, or is a path rewrite being configured at the gateway? This needs an answer before the story is closed, otherwise the contract is right and the URL still doesn't work.
2. **`x-court-id` vs `x-location-id`.** The spec's own description text states publications are superseded when `x-location-id, x-content-date, x-language, x-list-type, x-provenance` match, but the declared parameter is `x-court-id` and there is no `x-location-id` parameter. Confirm with the CaTH team which name is actually sent on the wire — if publishers send `x-location-id`, we must accept it.
3. **"Location not found" response.** We currently return `200 { no_match: true }`. What does the incumbent do for an unresolvable `x-court-id` + `x-provenance` pair — `409`, `400`, or accept-and-flag? We should match it rather than pick.
4. **Backwards compatibility.** No internal HTTP callers of this endpoint were found in this repo, and it is not yet in PROD, so a clean break looks safe. Confirm nothing outside the repo is already posting the snake_case body contract — if so, we need a transition period accepting both.
5. **401 vs 403.** The spec maps `401` to "authorization failed (no credential provided)" and `403` to "authentication has failed" — which is the inverse of the usual convention. Confirm whether `authenticateApi()` matches the incumbent's actual behaviour.
6. **LCSU response body.** The incumbent returns `201` with an artefact object that was never persisted, so `artefactId` is blank. Confirm publishers tolerate a blank `artefactId` and that we should mirror this rather than return a leaner body — and confirm whether they expect the S3 key anywhere in the response, since we currently return `s3_key` and the incumbent does not.
7. **LCSU metadata retention.** The incumbent validates the full `x-*` header set for LCSU but persists nothing. Confirm none of that metadata needs recording for audit — today our S3 path stores nothing at all, so if audit is expected, that is additional work.

## References

- Spec (pinned): https://github.com/hmcts/pip-data-management/blob/2bd5c3b48747e18f9d57618e2106d61baa84b7f9/infrastructure/resources/swagger/api-swagger.json
- Reference controller (pinned): https://github.com/hmcts/pip-data-management/blob/48a922c8e0996955dc2f57b0ebccf81f727cf5a9/src/main/java/uk/gov/hmcts/reform/pip/data/management/controllers/publication/PublicationController.java
  - LCSU branch: [lines 240-248](https://github.com/hmcts/pip-data-management/blob/48a922c8e0996955dc2f57b0ebccf81f727cf5a9/src/main/java/uk/gov/hmcts/reform/pip/data/management/controllers/publication/PublicationController.java#L240-L248)
  - `validateLcsuUploadFile`: [line 471](https://github.com/hmcts/pip-data-management/blob/48a922c8e0996955dc2f57b0ebccf81f727cf5a9/src/main/java/uk/gov/hmcts/reform/pip/data/management/controllers/publication/PublicationController.java#L471)
- Related: #797 (`source_artefact_id`, same endpoint)


## Comments

No comments on this issue.
