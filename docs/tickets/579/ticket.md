# #579: Publisher-facing OpenAPI spec for the CaTH Inbound Publication API (pip-data-management style)

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-05-12T11:58:22Z
**Updated:** 2026-10-22T14:44:40Z

## Description

## User Story

As a source-system team publishing to CaTH (SNL, Common Platform, CP_CATH, PDDA), I want a publisher-facing OpenAPI document for the CaTH Inbound Publication API, in the same style as the one pip-data-management publishes, so that I can integrate with `POST /publication` through the API Management gateway without reading CaTH source code or internal-only documentation.

## Background

pip-data-management publishes a publisher-only spec at [`infrastructure/resources/swagger/api-swagger.json`](https://github.com/hmcts/pip-data-management/blob/master/infrastructure/resources/swagger/api-swagger.json). That is the document APIM imports and the one publishers integrate against. It contains only `GET /` and `POST /publication`, uses plain bearer auth, lists only APIM gateway URLs as servers, and gives `x-list-type` as a fixed list of values, each linked to its JSON schema.

cath-service has one hand-maintained spec, `docs/api/openapi.yaml` (added in #900, aligned with the inbound contract in #1026). It has three consumers:

- `infrastructure/apim.tf` imports it into APIM, filtered down to `GET /` and `POST /publication` (#359)
- `.github/workflows/job.publish-openapi.yml` publishes it, unfiltered, to cnp-api-docs
- developers read it as the full API reference

The publication contract in it is correct and more detailed than pip-data-management's. What publishers see is still not in the pip-data-management form, because the one file serves internal and publisher audiences at once:

| | pip-data-management | cath-service today |
|---|---|---|
| Scope | `/` and `/publication` only | Also `/v1/publication`, `/locations`, downloads and health |
| Title / contact | "CaTH Inbound Publication API", CaTH team contact | "CaTH API", no contact |
| Security scheme | `bearerAuth` (http bearer, JWT) | OAuth2 client-credentials with a literal `{tenantId}` in the token URL |
| Servers | APIM gateway URLs only | APIM plus internal cath-api, release, preview and localhost hosts |
| `x-list-type` | Enum, each value linked to its JSON schema | Free-form string |

> **Re-scoped 22 October 2026.** The original ticket (May 2026) asked for Swagger UI via `swagger-jsdoc` against a `BlobIngestionRequest` body. That body no longer exists: metadata moved to `x-*` headers in #1026, and the spec now exists as `docs/api/openapi.yaml`. An interactive Swagger UI is **not** part of this ticket.

## Acceptance Criteria

- [ ] A publisher-facing OpenAPI document is produced, in the style of pip-data-management's `api-swagger.json`, containing only:
  - `GET /` (welcome check)
  - `POST /publication`
- [ ] `info` is titled **CaTH Inbound Publication API**, with a description of the API and a contact (CaTH team, `publicationinformation@hmcts.net`, confirm the address)
- [ ] Security is a `bearerAuth` scheme (`type: http`, `scheme: bearer`, `bearerFormat: JWT`) applied to both operations. The description states that the `api.publisher.user` app role is required.
- [ ] `servers` lists only the CFT APIM gateway URLs (`https://cft-api-mgmt.{env}.platform.hmcts.net/cath`) for the environments where APIM is deployed (aat, demo, perftest; ITHC and PROD added under #1160 / #1161)
- [ ] `POST /publication` documents, as `docs/api/openapi.yaml` already does:
  - all `x-*` headers, with required/optional and enums: `x-provenance`, `x-court-id` (with `x-location-id` fallback), `x-content-date`, `x-list-type`, `x-language`, `x-type`, `x-sensitivity`, `x-display-from`, `x-display-to`, `x-source-artefact-id`, `x-correlation-id`
  - the request body for each mode: `application/json` (`LIST`), `multipart/form-data` with a `file` part (flat file `LIST` and `LCSU`)
  - supersede rules
  - responses `201` (`Artefact`), `400`, `401`, `403`, `409`, `500` (`Message` / auth error body)
- [ ] `x-list-type` is an enum of supported list type names, taken from `listTypeData` (`libs/list-types/common/src/list-type-data.ts`) rather than typed by hand. Each list type that accepts JSON links to its schema under `libs/list-types/<name>/src/schemas/` in the cath-service repo.
- [ ] `docs/api/openapi.yaml` stays the single hand-maintained source. The publisher document is **generated** from it (plus the list-type enum), not written as a second file by hand.
- [ ] `infrastructure/apim.tf` imports the publisher document, so what APIM serves matches what publishers are given. The APIM operation IDs used by `resources/operation-policies/*.xml` stay unchanged.
- [ ] A test fails if the generated publisher document drifts from `docs/api/openapi.yaml`, or if a list type in `listTypeData` is missing from the enum

## Technical Notes

- `apim.tf` already derives the APIM import from `docs/api/openapi.yaml` (`local.apim_openapi`: picks out `apim_operations`, empties `servers`). The publisher document should replace or extend that derivation, not sit alongside it.
- `scripts/openapi-to-json.mjs` / `yarn openapi:json` already converts the YAML to JSON for cnp-api-docs. That is the natural place to also emit the publisher document, e.g. `yarn openapi:publisher`.
- Terraform can't run Node. Either commit the generated JSON (e.g. `infrastructure/resources/swagger/api-swagger.json`, matching pip-data-management) and guard it with the drift test, or keep the derivation in HCL. Committing the file is simpler to review and mirrors the incumbent.
- `listTypeData` has 78 entries and about 40 have a JSON schema. Decide whether the enum is every list type (flat-file types included) or only those accepted through the API.
- The response `Artefact` uses `locationId`, not pip-data-management's `courtId`, and has no `search` field. That is deliberate (see `libs/api/src/blob-ingestion/artefact-response.ts`) and must not be "aligned" to the incumbent's swagger.
- Keep the internal `azureAd` scheme and other routes in `docs/api/openapi.yaml` for the full developer reference. Only the publisher document changes shape.

## Out of Scope

- Swagger UI / `/api-docs` served by the API
- Changing the `POST /publication` contract or behaviour
- Documenting `/v1/publication`, `/locations`, downloads, health or test-support routes in the publisher document
- OAuth token acquisition guidance beyond stating the bearer token and role requirement
- ITHC / PROD APIM rollout (#1160, #1161)


## Comments

### Comment by junaidiqbalmoj on 2026-10-22T14:41:36Z
@spec new-feature-simplified

### Comment by hmctsclaudecode on 2026-10-22T14:44:40Z
# Publisher-facing OpenAPI spec for the CaTH Inbound Publication API

## 2. Background

CaTH keeps one hand-maintained OpenAPI document, `docs/api/openapi.yaml`. It describes the whole API — publication, locations, flat-file downloads and health — and serves three audiences at once: Terraform imports a filtered copy of it into CFT API Management, a workflow publishes the whole thing to cnp-api-docs, and developers read it as the full API reference.

Source-system teams (SNL, Common Platform, CP_CATH, PDDA) only ever call `POST /publication` through the APIM gateway, but what they are handed today is the internal document: internal hostnames among the servers, an OAuth2 client-credentials scheme with an unresolved `{tenantId}` in the token URL, read-only routes they cannot reach, no contact details, and `x-list-type` as a free-form string.

The incumbent service, pip-data-management, publishes a separate publisher-only document (`infrastructure/resources/swagger/api-swagger.json`) containing just `GET /` and `POST /publication`. Publishers already know that shape, and that is the document its APIM instance imports.

## 3. Acceptance Criteria

* **Scenario:** Publisher document is generated from the single source
    * **Given** `docs/api/openapi.yaml` is the only hand-maintained OpenAPI document in the repo
    * **When** a developer runs `yarn openapi:publisher`
    * **Then** a publisher document is written to `infrastructure/resources/swagger/api-swagger.json`, derived entirely from `docs/api/openapi.yaml` plus `listTypeData`, with no hand-written content of its own

* **Scenario:** Publisher document contains only the two exposed operations
    * **Given** the generator has run
    * **When** the publisher document is inspected
    * **Then** it contains `GET /` and `POST /publication` and nothing else — no `/v1/publication`, `/locations`, download, health or test-support routes — and `components` carries only the schemas, parameters, request bodies, responses and headers those two operations reach

* **Scenario:** Publisher document carries publisher-facing identity
    * **Given** the generator has run
    * **When** `info` is inspected
    * **Then** the title is "CaTH Inbound Publication API", the description is the publisher-facing description below, and `contact` names the CaTH team with `publicationinformation@hmcts.net`

* **Scenario:** Bearer security replaces the internal OAuth2 scheme
    * **Given** `docs/api/openapi.yaml` declares `azureAd` (OAuth2 client credentials) and `session` (cookie)
    * **When** the publisher document is generated
    * **Then** its only security scheme is `bearerAuth` (`type: http`, `scheme: bearer`, `bearerFormat: JWT`) whose description states the `api.publisher.user` app role requirement, and it is applied to both `GET /` and `POST /publication`

* **Scenario:** `GET /` is secured in the publisher document even though it is open on the backend
    * **Given** `GET /` is declared `security: []` in `docs/api/openapi.yaml`, because the service itself does not require a token for it
    * **When** the publisher document is generated
    * **Then** `GET /` requires `bearerAuth`, because APIM rejects an untokened call at the gateway, and the drift test treats this as a declared transform rather than drift

* **Scenario:** Only APIM gateway servers are listed
    * **Given** `docs/api/openapi.yaml` lists cath-api, release-scoped, PR preview and localhost hosts alongside the gateway
    * **When** the publisher document is generated
    * **Then** `servers` contains only `https://cft-api-mgmt.{environment}.platform.hmcts.net/cath` with `environment` enumerated as `aat`, `demo`, `perftest`

* **Scenario:** `x-list-type` is an enum built from reference data
    * **Given** `listTypeData` holds 78 list types, about 40 of which have a JSON schema
    * **When** the publisher document is generated
    * **Then** `x-list-type` is a `string` with an `enum` of every list type name from `listTypeData`, sorted deterministically, and its description links each list type that has a JSON schema to that schema's path in this repo

* **Scenario:** A new list type reaches publishers without a spec edit
    * **Given** a developer adds an entry to `listTypeData`
    * **When** the generator runs
    * **Then** the new name appears in the `x-list-type` enum with no change to `docs/api/openapi.yaml`

* **Scenario:** APIM serves exactly what publishers are given
    * **Given** `infrastructure/apim.tf` today derives its import from `docs/api/openapi.yaml` in HCL
    * **When** Terraform runs after this change
    * **Then** it imports the committed publisher document instead, and the APIM operation IDs stay `healthCheck` for `GET /` and `createPublication` for `POST /publication`, so the filenames in `infrastructure/resources/operation-policies/` keep resolving

* **Scenario:** Committed document drifting from the source fails the build
    * **Given** someone edits `docs/api/openapi.yaml` without regenerating
    * **When** the test suite runs
    * **Then** a test fails, naming the command to run, and the failure message shows what differs

* **Scenario:** Committed document edited by hand fails the build
    * **Given** someone edits `infrastructure/resources/swagger/api-swagger.json` directly
    * **When** the test suite runs
    * **Then** the same drift test fails, because the committed file no longer equals the generator's output

* **Scenario:** A list type missing from the enum fails the build
    * **Given** a list type exists in `listTypeData`
    * **When** it is absent from the `x-list-type` enum in the committed publisher document
    * **Then** a test fails naming the missing list type

* **Scenario:** A source route being exposed without being documented fails the build
    * **Given** `local.apim_operations` in `infrastructure/env-config.tf` names the operations APIM exposes
    * **When** an operation is added there that the publisher document does not contain
    * **Then** a test fails, so the exposed surface and the published document cannot diverge

* **Scenario:** The internal reference document is unchanged in substance
    * **Given** developers depend on `docs/api/openapi.yaml` as the full reference
    * **When** this work lands
    * **Then** `azureAd`, `session`, `/v1/publication`, `/locations`, the download routes and the health routes all remain in it, and `yarn openapi:json` still publishes it unfiltered to cnp-api-docs

* **Scenario:** The response contract is not "aligned" to the incumbent
    * **Given** pip-data-management's swagger names the response field `courtId` and includes a `search` field
    * **When** the publisher document is generated
    * **Then** the `Artefact` response still uses `locationId` and still has no `search` field, matching what the service actually returns

## 4. User Journey Flow

A source-system team integrating with CaTH:

1. Asks the CaTH team for the Inbound Publication API spec, or finds it published for their environment.
2. Reads one document that describes two operations: a welcome check and publish a hearing list.
3. Sees a single base URL per environment — the APIM gateway — and no internal hostnames to guess between.
4. Sees that it needs a bearer token and the `api.publisher.user` app role, and who to contact to be granted it.
5. Picks its list type from the enumerated values, and follows the link to that list type's JSON schema to build a payload.
6. Builds the request: `x-*` headers for all metadata, body for the payload only.
7. Calls `GET /` with its token to confirm the token and role work before sending real data.
8. Calls `POST /publication`, and reads the documented `201`, `400`, `401`, `403`, `409` and `500` outcomes against what it gets back.

A CaTH developer changing the publication contract:

1. Edits `docs/api/openapi.yaml`, as today.
2. Runs the generator and commits the regenerated publisher document alongside the change.
3. If they forget, the drift test fails and names the command.

## 5. Page Details

There is no user interface in this ticket. The deliverable is a document and the artefacts around it, so the items below describe the document rather than a page.

* **Layout:** The publisher document, in the order a reader meets it:

```
CaTH Inbound Publication API  (openapi 3.0.3)
│
├── info
│     title       CaTH Inbound Publication API
│     version     1.0.1                (carried over from docs/api/openapi.yaml)
│     description publisher-facing text (see Content)
│     contact     Court and Tribunal Hearings team
│                 publicationinformation@hmcts.net
│     license     MIT
│
├── servers
│     https://cft-api-mgmt.{environment}.platform.hmcts.net/cath
│       environment: aat | demo | perftest        (default aat)
│
├── tags
│     Publication   Hearing list ingestion.
│     Service       Service metadata.
│
├── security
│     bearerAuth                                  (document-level, both operations)
│
├── paths
│   ├── GET  /                 operationId healthCheck
│   │        tag Service · security bearerAuth · 200 welcome body
│   │
│   └── POST /publication      operationId createPublication
│            tag Publication · security bearerAuth
│            headers   x-provenance          required  enum
│                      x-court-id            required  (x-location-id fallback)
│                      x-content-date        required
│                      x-list-type           required for LIST · enum of 78 names
│                      x-language            required  enum
│                      x-type                required  enum LIST | LCSU
│                      x-sensitivity         optional  enum, default PUBLIC
│                      x-display-from        optional
│                      x-display-to          optional
│                      x-source-artefact-id  optional
│                      x-correlation-id      optional
│            body      application/json        → LIST  (payload per list type schema)
│                      multipart/form-data     → LIST  (one part named "file")
│                                              → LCSU  (.htm / .html file)
│            responses 201 Artefact
│                      400 Message · 401 AuthErrorResponse · 403 AuthErrorResponse
│                      409 Message · 500 Message
│
└── components
      securitySchemes   bearerAuth only            (no azureAd, no session)
      parameters        the eleven x-* headers only (no artefactId)
      requestBodies     Publication
      responses         PublicationCreated, PublicationBadRequest,
                        PublicationUnauthorised, PublicationForbidden,
                        PublicationConflict, PublicationServerError
      schemas           PublicationPayload, PublicationFileUpload, Artefact,
                        Message, AuthErrorResponse
                        (no Location, HealthResponse, ErrorResponse)
      headers           —                          (NoStore is download-only)
```

* **Reference:** pip-data-management's `infrastructure/resources/swagger/api-swagger.json` on `master` — the incumbent publisher document, and the shape publishers already recognise. The content of each operation comes from `docs/api/openapi.yaml` as it stands today; only the shape of the document changes.

* **Content:**

  `info.title`

  ```
  CaTH Inbound Publication API
  ```

  `info.description`

  ```
  Publish hearing lists into the Court and Tribunal Hearings (CaTH) service.

  All publication metadata travels in `x-*` request headers; the body carries only the
  payload. One path, `POST /publication`, serves three modes, selected by `Content-Type`
  and then by `x-type`:

  | `Content-Type`        | `x-type` | Behaviour                                                          |
  |-----------------------|----------|--------------------------------------------------------------------|
  | `application/json`    | `LIST`   | The body is the publication payload, validated against the JSON schema for `x-list-type`. |
  | `multipart/form-data` | `LIST`   | A single part named `file`, stored as a flat file.                 |
  | `multipart/form-data` | `LCSU`   | An `.htm` or `.html` file. Nothing is persisted, so the `201` body carries a blank `artefactId`, and `x-list-type` is not required. |
  | `application/json`    | `LCSU`   | Rejected with `400` — LCSU is file-only.                           |
  | either                | anything else | Rejected with `400`. `x-type` is never defaulted.             |

  Call this API through the CFT API Management gateway for your environment. The gateway
  validates your bearer token and app role, then calls CaTH with its own token, so you
  never address CaTH directly.

  Maximum payload is 100 MB. LCSU uploads are capped separately at 10 MB.

  To be granted the `api.publisher.user` app role, or to report a problem with this API,
  contact the CaTH team at publicationinformation@hmcts.net.
  ```

  `info.contact`

  ```
  name:  Court and Tribunal Hearings team
  email: publicationinformation@hmcts.net
  ```

  `components.securitySchemes.bearerAuth.description`

  ```
  Microsoft Entra ID (Azure AD) bearer token. Send it as `Authorization: Bearer <token>`.

  The token must carry the `api.publisher.user` app role in its `roles` claim. That is an
  Entra ID app role, not an OAuth scope, so it is granted to your application by role
  assignment rather than requested at token time. Contact the CaTH team at
  publicationinformation@hmcts.net to be granted it.

  A missing, malformed, expired or unverifiable token is rejected with `401`. A valid token
  without the role is rejected with `401` at the gateway, and with `403` if the request
  reaches the service directly.
  ```

  `servers[0].description`

  ```
  CFT API Management gateway. Validates the bearer token and app role, then calls CaTH with
  its own token. This is the only entry point for publishing source systems.
  ```

  `x-list-type` description — the fixed preamble; the generator appends the schema list:

  ```
  List type name. Required when `x-type` is `LIST`; not required for `x-type: LCSU`, in
  which case the `201` response reports `listType: null`. An unrecognised value is rejected
  with `400`, with the permitted values in the message.

  List types that accept a JSON payload link to the JSON schema that payload is validated
  against. A list type without a link accepts flat-file publication only.
  ```

  Every other description, example and error body in the publisher document is carried over
  verbatim from `docs/api/openapi.yaml` and is not restated here.

* **URL:** No page path. The paths that matter:
  * generated document, committed: `infrastructure/resources/swagger/api-swagger.json`
  * hand-maintained source: `docs/api/openapi.yaml`
  * generator: `scripts/openapi-to-publisher.mjs`, run by `yarn openapi:publisher`
  * published base URL for publishers: `https://cft-api-mgmt.{aat|demo|perftest}.platform.hmcts.net/cath`

* **Validation:** Rules the generator and its tests enforce.
  * The operations included are exactly those in `local.apim_operations` (`infrastructure/env-config.tf`): `GET /` and `POST /publication`. The generator reads that list rather than hard-coding the two paths, so adding an operation there is a single edit.
  * Each included operation's `operationId` is replaced with the APIM operation ID from `local.apim_operations` (`healthCheck`, `createPublication`), not the internal one (`getServiceInfo`, `createPublicationAtRoot`). The policy filenames in `infrastructure/resources/operation-policies/` depend on these values, so a rename is a breaking change.
  * `security` on both operations is `bearerAuth`, overriding the source document's `security: []` on `GET /` and `azureAd` on `POST /publication`.
  * `securitySchemes` contains `bearerAuth` only; `azureAd` and `session` are dropped.
  * `servers` is replaced with the single APIM gateway entry. Environments are `aat`, `demo`, `perftest` — the environments where `apim_suffix` is non-null in `local.env_config`. ITHC and PROD are added by #1160 / #1161, not here.
  * `components` is pruned to what the two operations reach, following `$ref`s transitively. An unreferenced component left in the document is a test failure, as is a `$ref` to a component that was pruned.
  * `tags` is pruned to the tags the two operations use.
  * `x-list-type` gains `enum`, built from every `name` in `listTypeData` and sorted so the committed file is stable regardless of the order entries were added. 78 values today.
  * A list type counts as having a JSON schema when a `.json` file exists under `libs/list-types/<kebab-name>/src/schemas/`, resolving `<kebab-name>` through the same alias map `validateListTypeJson` uses (so `CROWN_DAILY_PDDA_LIST` resolves to `crown-daily-list`). Validation and documentation must agree on which list types accept JSON.
  * JSON output is `JSON.stringify(document, null, 2)` with a trailing newline, matching `scripts/openapi-to-json.mjs`, so the drift diff is readable in review.
  * Drift test: regenerate in memory and compare to the committed file. Failure names `yarn openapi:publisher`.
  * Enum completeness test: every `listTypeData` name appears in the committed enum, and every enum value exists in `listTypeData`. Covers both a new list type and a deleted one.
  * Exposure test: every path and method in `local.apim_operations` exists in the committed publisher document, and the document contains no others.

* **Navigation:** What consumes the document, and what triggers each.
  * `infrastructure/apim.tf` reads the committed `infrastructure/resources/swagger/api-swagger.json` and passes it as `swagger_url` to `module.apim_api`. The `local.apim_openapi` / `local.apim_openapi_paths` derivation in HCL is removed; `servers` no longer needs emptying there, because APIM only honours `service_url` for routing and the document now lists the gateway rather than a backend host. Triggered by the Terraform stage on deploy.
  * `.github/workflows/job.publish-openapi.yml` is unchanged: it keeps publishing the full `docs/api/openapi.yaml` to cnp-api-docs via `yarn openapi:json`.
  * The test suite runs the drift, enum-completeness and exposure tests on every PR.
  * Publishers receive the committed JSON file, or the copy APIM serves, which is now the same document.

## 6. Assumptions & Open Questions

* **`publicationinformation@hmcts.net` is unconfirmed.** The ticket asks us to confirm it. If it is wrong, the contact and two description blocks need changing. Who owns the publisher-facing inbox — the CaTH team or a service desk?
* **Should the `x-list-type` enum be all 78 list types, or only the ~40 with a JSON schema?** The spec above enumerates all 78, because the header applies to flat-file publication too and the service accepts any known name there. The cost is that a publisher reading the enum cannot tell at a glance which values accept JSON, which is why the description links schemas per list type. If refinement prefers a shorter enum, the alternative is two documented groups rather than dropping the flat-file names, since dropping them would make valid requests look invalid.
* **`GET /` is open on the service but secured in the publisher document.** This is a deliberate divergence from `docs/api/openapi.yaml`, on the grounds that publishers only ever reach it through APIM, where a token is required. Confirm that the gateway does in fact reject an untokened `GET /` — if it does not, the publisher document is telling publishers something false.
* **How do publishers actually receive this file?** The ticket makes APIM import it and commits it to the repo, but does not say whether publishers are sent the file, pointed at a repo URL, or given the APIM developer portal. Without an answer the document exists but has no distribution route, and the "without reading CaTH source code" part of the user story is only half met.
* **`version` in the publisher document.** Carrying over `1.0.1` from the source is the simplest option and is what is specified above. If publishers are expected to track a publisher-facing version separately from the internal reference, that needs its own rule.
* **Schema links point into the cath-service repo** (`libs/list-types/<name>/src/schemas/<name>.json`), as the ticket asks. For an external publisher those are links into a repo they may not be able to browse. Is cath-service public to them, or do the schemas need publishing somewhere reachable?


