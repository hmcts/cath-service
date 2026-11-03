# Code Review: Issue #579

Publisher-facing OpenAPI document for the CaTH Inbound Publication API.

Reviewed on branch `feature/579-publisher-openapi-spec`. The changes are uncommitted, and the generator, its tests, `apim-operations.json`, `api-swagger.json` and `list-type-package*.ts` are all untracked. Everything below comes from reading the working tree and running commands against it.

## Summary

The work adds a pure TypeScript generator in `libs/api/openapi/`. It builds `infrastructure/resources/swagger/api-swagger.json` from three inputs: `docs/api/openapi.yaml` (including a new root `x-publisher` block), `listTypeData`, and `infrastructure/resources/apim-operations.json`. Terraform now imports the committed JSON instead of deriving its import in HCL. A new `openapi-publisher-check` CI job runs before any plan or apply. The list-type alias map moved into a module with no dependencies, so validation and documentation share it.

What I checked myself, rather than taking from the plan:

- Regenerating in memory gives output **byte-identical** to the committed `api-swagger.json`.
- The output is a valid OpenAPI 3.0.3 document (`@redocly/cli lint --extends=minimal`: valid).
- The output contains exactly `GET /` (`healthCheck`) and `POST /publication` (`createPublication`). Its components are the 11 header parameters, `requestBodies.Publication`, the six `Publication*` responses, and the five schemas listed in the spec's layout tree. The only security scheme is `bearerAuth`. The `x-list-type` enum has 77 names, and 40 of them carry schema links.
- The document has no internal hostnames: no localhost, cath-api, preview or release hosts, and no `{tenantId}`.
- Mutation checks, run in memory: editing a reachable source component is detected. Adding a list type is detected. Exposing an extra operation is detected. Editing an internal-only component (`Location`) is correctly ignored.
- Terraform: `fmt -check` passes. Evaluating the `apim_openapi` expression in a scratch module gives paths `/` and `/publication`, operationIds `healthCheck` and `createPublication`, and `servers = []`. Nothing still references the removed `apim_operations`, `openapi_spec` or `apim_openapi_paths` locals.
- Every `libs/list-types/*` package that has a `src/schemas` directory is upstream of `@hmcts/blob-ingestion` in turbo (checked with `turbo --filter=...@hmcts/<pkg> --dry=json`). So a schema or `listTypeData` change on a PR does re-run the drift test.
- `yarn openapi:json` still writes all 9 routes, with `azureAd` and `session`.
- The generator files sit outside `src/`. They type-check cleanly under the root `tsconfig.json` with a scratch config. Biome is clean on all changed files.

The implementation is solid and the departures from the spec are justified. The only acceptance criterion not fully met is the contact address, which the ticket says to confirm and nobody has.

## 🚨 CRITICAL Issues

None.

- **Security:** no secrets, and no internal hostnames in the publisher document. The new CI job has `contents: read` only and no secrets.
- **APIM routing:** unchanged. `servers` is still emptied on the imported copy (`infrastructure/apim.tf:17-19`), exactly as before, so `service_url` (`apim.tf:58`) stays the only backend source.

## ⚠️ HIGH PRIORITY Issues

1. **The contact address has not been confirmed (AC partial).** The values are at `docs/api/openapi.yaml:1039-1041` and `api-swagger.json:10-13`.
   - **Impact:** The issue AC says "contact (CaTH team, `publicationinformation@hmcts.net`, confirm the address)". The address appears in `info.contact`, `info.description` and the `bearerAuth` description. If it is wrong, external publishers are sent to the wrong inbox to request the `api.publisher.user` role. Plan section 6 Q1 is still open.
   - **Recommendation:** Get confirmation from the product owner and record it on the issue before merge. Changing it is cheap because the address only lives in `x-publisher`. Note also that the spec's contact name, "Court and Tribunal Hearings team", differs from pip-data-management's "CaTH Team". Confirm the name at the same time.

## 💡 SUGGESTIONS

1. **Nothing in CI type-checks the generator.** `libs/api/tsconfig.json` only includes `src/**/*`, and vitest does not type-check. Today the files compile cleanly; I checked with a scratch tsconfig. A type error introduced later would only show up at runtime.
   - **Approach:** add a small `libs/api/openapi/tsconfig.json` (`noEmit`, extends root), and either a `type-check` script or a `tsc -p` step in the `openapi-publisher-check` job.

2. **`yaml` is an undeclared dependency of `@hmcts/blob-ingestion`.** It is imported in `libs/api/openapi/publisher-inputs.ts:6` and `committed-publisher-document.test.ts:5`, and only resolves because the root devDependency is hoisted (`nodeLinker: node-modules`).
   - **Approach:** add `"yaml": "2.9.0"` to `libs/api/package.json` devDependencies, pinned to the root version.

3. **The publisher document carries text that is internal or misleading for external publishers.** It is carried over verbatim from the source, as the spec instructs:
   - The `POST /publication` description and the `PublicationFileUpload` schema name the env var `PDDA_HTML_MAX_FILE_SIZE` and mention "the AWS S3 bucket" (source `docs/api/openapi.yaml:213`, `:828`).
   - The `GET /` 200 example advertises `/health`, `/health/liveness` and `/health/readiness` (`api-swagger.json:76-84`), and APIM does not expose any of them. The `Service` tag description says "Service metadata and health."
   - The `x-provenance` enum offers `MANUAL_UPLOAD` (`api-swagger.json:193`).
   - The mode table appears twice: in `info.description` and in the `POST` description, with slightly different wording ("capped separately at 10 MB" versus "by `PDDA_HTML_MAX_FILE_SIZE` (default 10 MB)").
   - **Approach:** this is plan Q7. Decide with the PO. If any of it should change, extend `x-publisher` with targeted overrides, for example `operations.<id>.description` or `tags`, rather than editing the generator.

4. **`GET /` now requires `bearerAuth` but documents only a `200` response.** It is at `api-swagger.json:47-95`. The user journey has publishers call `GET /` to prove their token works, so `401` is the response they most need to recognise.
   - **Approach:** add `401: $ref: '#/components/responses/PublicationUnauthorised'` (or a neutral `Unauthorised`) to `GET /` in the source. That is harmless for the internal reference because the gateway does return it.

5. **Path-level OpenAPI fields are dropped silently.** `selectOperations` (`libs/api/openapi/publisher-document.ts:51-66`) copies only the listed methods, so a future path-level `parameters`, `summary` or `servers` would vanish without warning.
   - **Approach:** either carry over the path-level non-method keys, or throw if a selected path has any. The second option is consistent with the other fail-loud guards.

6. **Unvalidated `as` casts on parsed input.** `publisher-inputs.ts:18-19` casts the YAML and the JSON straight to `OpenApiDocument` and `ApimOperations`. `x-publisher` is checked, but `apim-operations.json` is not. A value such as `{"/": {"get": 1}}` would produce a non-string operationId.
   - **Approach:** a small type guard on `apimOperations` (every value is a `Record<string, string>`). There is also a minor non-null assertion at `publisher-document.ts:138` (`pending.pop()!`); `for (let ref; (ref = pending.pop()) !== undefined;)` avoids it.

7. **The CI job has no dependency cache.** The `openapi-publisher-check` job (`.github/workflows/stage.infrastructure.yml:30-51`) does a cold `yarn install --immutable` on every infra run, including the demo, perftest and ITHC workflows that call this stage.
   - **Approach:** copy the `actions/cache@v5` block from `job.test.yml`.

8. **The APIM `display_name` still says "CaTH API".** It is at `infrastructure/apim.tf:54`, while the imported title is now "CaTH Inbound Publication API" (plan Q8). Renaming is an in-place change. Decide one way or the other so the portal is consistent.

9. **Schema links point at `master`, not at what is deployed** (`docs/api/openapi.yaml:1077`). `hmcts/cath-service` is public (checked with `gh repo view`), so the links resolve. But a schema change merged to master shows up in the links before it is deployed. Acceptable for now; record the decision on the issue (plan Q4).

10. **`x-publisher` is now published to cnp-api-docs.** `yarn openapi:json` passes it through unchanged. That is harmless and matches the spec ("unfiltered"), but readers of the internal reference will see the block. Optionally, `scripts/openapi-to-json.mjs` could strip root `x-publisher`.

## ✅ Positive Feedback

- **Clean split between a pure builder and the I/O.** `buildPublisherDocument` takes plain inputs, which keeps the unit tests synthetic and fast. `readPublisherInputs` is the only part that touches the filesystem.
- **No prose in the generator.** All publisher text lives in `x-publisher` in the single source, which is the most honest reading of "no hand-written content of its own".
- **The guards fail loudly.** Missing `x-publisher` keys, unknown APIM operations, duplicate operationIds, a dangling `$ref`, an inline or missing `x-list-type`: each throws a message naming the cause (`publisher-document.ts:36-101, 143-145`).
- **Deterministic output.** Sorting uses code-unit order, not `localeCompare`, there is a fixed top-level key order, and the trailing newline matches `openapi-to-json.mjs`. Deep-equal drift plus the Biome exclusion is the right answer to the pre-commit reformatting problem.
- **The alias-map refactor keeps behaviour.** `validateListTypeJson` now calls `resolveListTypePackageName` (`list-type-validator.ts:39`), which is the same kebab-case-then-alias logic as before (`list-type-package.ts:35-38`). `convertListTypeNameToKebabCase` is still re-exported, so `index.ts:89` is unchanged. All 360 `list-types-common` tests pass.
- **Moving `apim_operations` to JSON is a good call.** Terraform imports the document's paths directly, so the exposed surface and the published document cannot diverge, and nothing parses HCL.
- **Keeping `servers = []` is right on merit.** It keeps APIM backend routing exactly as before, and the reasoning is documented in `apim.tf:12-15`.
- **The CI job is placed so it can block deploys.** It is a dependency of `terraform`, which closes the gap where a PR touching only `docs/api/openapi.yaml` or `infrastructure/` skips the Build stage.
- **The tests follow AAA**, are well named, and do not hard-code the 77/40 counts.

## Test Coverage Assessment

**Unit tests:** good.
- `publisher-document.test.ts` has 22 cases on a synthetic source: operations, overrides, enum and links, pruning, and all the error paths.
- `publisher-inputs.test.ts` has 6 real-filesystem cases: alias resolution, a multi-schema package, a flat-file-only list type, and that every linked file exists.
- `committed-publisher-document.test.ts` has the repo guards: drift, enum completeness in both directions plus sort order, exposure, policy filenames, `$ref` integrity and reachability, and contract invariants.
- `list-type-package.test.ts` covers the moved kebab-case tests and the alias resolution.
- The CI command `yarn workspace @hmcts/blob-ingestion vitest run openapi` picks up exactly the 3 openapi test files (41 tests, all passing). The `test` script (`vitest run`) in `libs/api` also discovers `openapi/*.test.ts`, because vitest is not restricted to `src/`, so turbo runs them too.
- Gap: the CLI wrapper `generate-publisher-document.ts` is untested. It is 17 lines and acceptable as is.

**E2E tests:** not applicable. No UI or user journey.

**Accessibility tests:** not applicable. No rendered output.

**Statement coverage per changed workspace:**

| Workspace | Command | Statements |
|---|---|---|
| `@hmcts/blob-ingestion` (libs/api) | `yarn workspace @hmcts/blob-ingestion vitest run --coverage` | **99.69%** (328/329); `openapi/publisher-document.ts` 100% |
| `@hmcts/blob-ingestion`, with `openapi/**` forced into the coverage include | `... --coverage.include='src/**' --coverage.include='openapi/**'` | 97.04% (the untested CLI wrapper is the difference) |
| `@hmcts/list-types-common` | `yarn workspace @hmcts/list-types-common vitest run --coverage` | **94.59%** (612/647) |

Both workspaces are above 80%.

## Acceptance Criteria Verification

### Issue body: Acceptance Criteria checklist

- [x] **A publisher-facing document in the pip-data-management style, containing only `GET /` and `POST /publication`.**
  - `infrastructure/resources/swagger/api-swagger.json:47-103`
  - Guarded by `libs/api/openapi/committed-publisher-document.test.ts:51-62`
- [~] **`info` titled "CaTH Inbound Publication API", with a description and a contact (CaTH team, `publicationinformation@hmcts.net`, confirm the address).**
  - Done: title, description and contact at `api-swagger.json:4-13`, from `docs/api/openapi.yaml:1014-1041`, tested at `committed-publisher-document.test.ts:121-126`.
  - Missing: no evidence the address has been confirmed (see HIGH 1).
- [x] **Security is `bearerAuth` (http, bearer, JWT) on both operations, and the description states the `api.publisher.user` role.**
  - `api-swagger.json:41-45, 167-172`
  - Operation-level security is removed at `publisher-document.ts:70-73`
  - Tested at `committed-publisher-document.test.ts:105-119`
- [x] **`servers` lists only the CFT APIM gateway URL for aat, demo and perftest.**
  - `api-swagger.json:15-28`, from `docs/api/openapi.yaml:1042-1053`
  - Tested at `committed-publisher-document.test.ts:128-136`
- [x] **`POST /publication` documents all `x-*` headers (required flags and enums, `x-location-id` fallback), the JSON and multipart bodies, the supersede rules, and the `201`, `400`, `401`, `403`, `409` and `500` responses.**
  - The full description moved onto `/publication` (`docs/api/openapi.yaml:177-214`). Supersede rules are at `:205-206`.
  - In the output: 11 header refs, requestBody content `application/json` and `multipart/form-data` (`api-swagger.json:388-410`), and responses at `:411+`.
  - I verified the header required/enum values from the generated JSON.
- [x] **`x-list-type` is an enum from `listTypeData`, and list types that accept JSON link to their schema.**
  - `api-swagger.json:222-300`: 77 names, 40 schema links
  - Built at `publisher-document.ts:96-121`; schemas found at `publisher-inputs.ts:26-40`
  - Tested at `committed-publisher-document.test.ts:24-48` and `publisher-inputs.test.ts:26-63`
- [x] **`docs/api/openapi.yaml` stays the single hand-maintained source, and the publisher document is generated.**
  - Generator: `libs/api/openapi/generate-publisher-document.ts`
  - Root script: `package.json:43`
  - Met in spirit. The publisher-only text lives in `x-publisher` inside the source (`docs/api/openapi.yaml:1013-1077`), and the exposed-operation list is a separate config file, `infrastructure/resources/apim-operations.json`.
- [x] **`apim.tf` imports the publisher document, and the operation IDs used by the policy files are unchanged.**
  - Import: `infrastructure/apim.tf:16-20, 62-63`
  - Operation IDs: `api-swagger.json:54, 103`
  - Policy filenames are tested at `committed-publisher-document.test.ts:64-76`
  - Met in spirit rather than letter: `servers` is emptied on the imported copy. That is a deliberate and justified departure (see Positive Feedback).
- [x] **A test fails on drift, or when a list type is missing from the enum.**
  - Drift: `committed-publisher-document.test.ts:16-22`
  - Missing list type: `committed-publisher-document.test.ts:28-34`
  - Confirmed effective by in-memory mutation checks.

### Spec comment (hmctsclaudecode): scenarios

- [x] **Generated from the single source by `yarn openapi:publisher`, written to `infrastructure/resources/swagger/api-swagger.json`.**
  - `package.json:43`, `generate-publisher-document.ts:6-13`, `publisher-inputs.ts:13`
  - Regenerating gives byte-identical output.
  - Departure: the generator is TS in `libs/api/openapi/`, not `scripts/openapi-to-publisher.mjs`. Justified, because it needs TS imports and has to sit in a workspace for CI.
- [x] **Contains only the two operations, with components pruned to what they reach.**
  - Pruning: `publisher-document.ts:133-163`
  - Output components match the spec's layout tree exactly. No `ArtefactId`, `NoStore`, `Location`, `HealthResponse` or `ErrorResponse`.
  - Tested at `committed-publisher-document.test.ts:79-102` and `publisher-document.test.ts:240-266`
- [x] **Publisher-facing identity: title, description and contact as specified.**
  - `api-swagger.json:3-14`; the text matches the spec verbatim.
  - Tested at `committed-publisher-document.test.ts:121-126`
- [x] **`bearerAuth` replaces the internal OAuth2 scheme, and `azureAd` and `session` are dropped.**
  - `api-swagger.json:166-173`; `securitySchemes` keys are `["bearerAuth"]`
  - Tested at `committed-publisher-document.test.ts:110`
- [x] **`GET /` is secured even though the source declares `security: []`, as a declared transform.**
  - Source: `docs/api/openapi.yaml:103`
  - Transform: `publisher-document.ts:68-73`
  - Unit test: `publisher-document.test.ts:93-104`
  - The gateway claim is supported statically: `infrastructure/resources/api-policy/api-policy.xml:5-14` applies `validate-azure-ad-token` at API scope, and `operation-policies/healthCheck.xml` only inherits `<base/>`.
  - The runtime confirmation (untokened `GET /cath/` on aat returns 401) can only happen after deploy and has not been done.
- [x] **Only the APIM gateway server is listed, with `environment` enumerated as aat, demo and perftest.**
  - `api-swagger.json:15-28`
- [x] **`x-list-type` enum: every `listTypeData` name, sorted, with schema links in the description.**
  - `publisher-document.ts:104` (sort), `:113-121` (links)
  - Tested at `committed-publisher-document.test.ts:44-47`
- [x] **A new list type reaches publishers without a spec edit.**
  - `publisher-document.test.ts:186-195`; also confirmed by in-memory mutation.
- [x] **APIM serves what publishers are given, and the operation IDs stay `healthCheck` and `createPublication`.**
  - `apim.tf:17`; the HCL evaluation confirmed the paths and operationIds.
  - Met in spirit: the spec says not to empty `servers`, and the plan keeps `servers = []` for routing safety.
- [x] **A drifted committed document fails the build, names the command, and shows the diff.**
  - `committed-publisher-document.test.ts:9, 21`: `toEqual` with the message "Run yarn openapi:publisher and commit infrastructure/resources/swagger/api-swagger.json"
  - Runs in turbo tests (blob-ingestion is downstream of every schema package and of `list-types-common`) and in `stage.infrastructure.yml:30-51`, ahead of `terraform` (`:126`).
- [x] **A hand-edited committed file fails the build.**
  - Same drift test. It compares parsed JSON, so formatting-only edits deliberately pass (plan 1.6).
- [x] **A list type missing from the enum fails, naming it.**
  - `committed-publisher-document.test.ts:28-34`: the assertion lists the missing names. Extra names are caught at `:36-42`.
- [x] **Exposing a route without documenting it fails the build.**
  - `committed-publisher-document.test.ts:51-62` compares the document to `apim-operations.json`.
  - Met in spirit: the source of truth moved from `local.apim_operations` in `env-config.tf` (removed, `env-config.tf` diff) to `infrastructure/resources/apim-operations.json`.
- [x] **The internal reference is unchanged in substance, and `yarn openapi:json` still publishes it unfiltered.**
  - `azureAd` and `session` remain at `docs/api/openapi.yaml:461, 476`, and all routes are kept.
  - Tested at `committed-publisher-document.test.ts:150-168`
  - `node scripts/openapi-to-json.mjs` wrote all 9 paths.
- [x] **The `Artefact` response is not "aligned" to the incumbent: `locationId`, no `search`.**
  - `api-swagger.json:620-678`
  - Tested at `committed-publisher-document.test.ts:138-147`

**Tally: 23 met, 1 partial, 0 unmet, of 24.**

## Next Steps

- [ ] Confirm `publicationinformation@hmcts.net` and the contact name with the PO, and record it on #579 (HIGH 1).
- [ ] `git add` all untracked files, especially `infrastructure/resources/swagger/api-swagger.json` and `infrastructure/resources/apim-operations.json`. Terraform's `file()` and the guard tests fail without them.
- [ ] On the PR, check the Terraform plan for aat, demo and perftest. Expect only an in-place update of `module.apim_api[0].azurerm_api_management_api.api`, and no destroy or create of `azurerm_api_management_api_operation_policy`.
- [ ] After deploy to aat: an untokened `GET https://cft-api-mgmt.aat.platform.hmcts.net/cath/` returns 401, a tokened call returns 200, and the APIM definition shows the new title and the enum.
- [ ] Optional: suggestions 1 (type-check in CI), 2 (declare `yaml`) and 4 (`401` on `GET /`) are cheap and worth doing in this PR. Take 3 and 8 to the PO.

## Overall Assessment — NEEDS CHANGES

The code is effectively ready to approve. The generator is correct and deterministic, the guards work, Terraform is safe, and CI does run the drift check. The NEEDS CHANGES verdict comes only from the rule that a partial acceptance criterion blocks approval: the ticket asks for the contact address to be confirmed, and there is no evidence that it has been. Once that is confirmed and recorded, and nothing else changes, this can be approved.
