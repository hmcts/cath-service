# Tasks: #579 Publisher-facing OpenAPI document

## Implementation Tasks

### Shared list-type resolution
- [x] Create `libs/list-types/common/src/validation/list-type-package.ts`. Move `convertListTypeNameToKebabCase` and `PACKAGE_ALIASES` into it, and add `resolveListTypePackageName(name)`.
- [x] Update `list-type-validator.ts` to use `resolveListTypePackageName`. Re-export `convertListTypeNameToKebabCase` so `index.ts` is unchanged.
- [x] Add the `"./list-type-package"` subpath export to `libs/list-types/common/package.json`.

### Source document
- [x] Add the `x-publisher` block to `docs/api/openapi.yaml`, using the spec's Content verbatim: `info` (title, description, contact), `servers` (gateway only, `aat | demo | perftest`, default `aat`), `securitySchemes.bearerAuth` (http/bearer/JWT plus description), `listTypeDescription` and `schemaBaseUrl`.
- [x] Move the full POST description (mode table, supersede rules, size limits) from `/v1/publication` to `/publication`, and shorten `/v1/publication` to "versioned alias".
- [x] Update the "maintained by hand" paragraph in `info.description` to tell developers to run `yarn openapi:publisher`.
- [x] Confirm `yarn openapi:json /tmp/openapi.json` still succeeds and still contains all routes and `azureAd`/`session`.

### APIM operations config
- [x] Create `infrastructure/resources/apim-operations.json`: `{ "/": { "get": "healthCheck" }, "/publication": { "post": "createPublication" } }`.
- [x] Remove `local.apim_operations` and its comment from `infrastructure/env-config.tf`.

### Generator (`libs/api/openapi/`, outside `src/`)
- [x] `publisher-document.ts`: `buildPublisherDocument({ source, apimOperations, listTypes })`. It selects operations, applies the APIM operationIds, sets document-level `bearerAuth` and deletes operation `security`, merges info, replaces servers and securitySchemes, sets the `ListType` enum and description, prunes components and tags transitively, drops `x-publisher`, uses a fixed key order, and throws on the error cases in plan section 3.
- [x] `publisher-inputs.ts`: `readPublisherInputs(repoRoot)` and `PUBLISHER_DOCUMENT_PATH`. It reads the yaml, `apim-operations.json`, `listTypeData` (via `@hmcts/list-types-common/list-type-data`) and the schema directories (via `@hmcts/list-types-common/list-type-package`).
- [x] `generate-publisher-document.ts`: CLI that writes `JSON.stringify(doc, null, 2) + "\n"`, logs a summary, and exits 1 on error.
- [x] Add the root script `"openapi:publisher": "tsx libs/api/openapi/generate-publisher-document.ts"`.
- [x] Add `"!infrastructure/resources/swagger"` to `biome.json` `files.includes`.
- [x] Run `yarn openapi:publisher` and add `infrastructure/resources/swagger/api-swagger.json` (generated; not committed, per instruction). Spot-check it against the layout tree in section 5 of the spec.

### Terraform
- [x] `infrastructure/apim.tf`: replace the `openapi_spec`/`apim_openapi_paths` derivation with `jsonencode(merge(jsondecode(file(".../resources/swagger/api-swagger.json")), { servers = [] }))`, and rewrite the header comment (generated file, operations JSON, no download routes, why `servers` is emptied).
- [x] Run `terraform fmt` (done: `fmt -check` and `validate` pass on 1.15.8). Still to do on the PR: check the plan: only an in-place update of `module.apim_api[0].azurerm_api_management_api.api`, and no changes to the operation policies.

### CI
- [x] `.github/workflows/stage.infrastructure.yml`: add an `openapi-publisher-check` job (checkout, corepack, node 24.17.0, `yarn install --immutable`, `yarn workspace @hmcts/blob-ingestion vitest run openapi`), and add it to `terraform.needs`.
- [x] Leave the `docs/api/openapi\.yaml$` alternative in the infra detect paths of `workflow.main.yml` and `workflow.preview.yml`. Confirm that `infrastructure/` already covers the new files.

## Testing Tasks
- [x] `publisher-document.test.ts`, scenario 1: only the APIM operations, APIM operationIds, document-level `bearerAuth`, and `GET /` `security: []` overridden.
- [x] `publisher-document.test.ts`, scenario 2: `x-publisher` overrides applied, `version`/`license` kept, `x-publisher`/`azureAd`/`session` removed.
- [x] `publisher-document.test.ts`, scenario 3: enum sorted and de-duplicated, new list type appears without a source edit, links only for list types with schemas, and multiple links for a multi-schema list type.
- [x] `publisher-document.test.ts`, scenario 4: unreferenced components and tags pruned, transitive refs kept.
- [x] `publisher-document.test.ts`, scenario 5: throws for missing `x-publisher`, unknown APIM operation, dangling `$ref`, and missing `ListType`.
- [x] `publisher-inputs.test.ts`, scenario 6: alias resolution (`CROWN_DAILY_PDDA_LIST`), `UTIAC_JR_*` gets two schemas, flat-file-only list type gets `[]`.
- [x] `committed-publisher-document.test.ts`, scenario 7: drift deep-equality, with a message naming `yarn openapi:publisher`.
- [x] `committed-publisher-document.test.ts`, scenario 8: enum ⇔ `listTypeData` in both directions, sorted.
- [x] `committed-publisher-document.test.ts`, scenario 9: exposure equals `apim-operations.json`, and policy filenames are operationIds.
- [x] `committed-publisher-document.test.ts`, scenario 10: every `$ref` resolves and no component is unreachable.
- [x] `committed-publisher-document.test.ts`, scenario 11: `Artefact` has `locationId` and no `courtId`/`search`; source keeps the internal schemes and routes.
- [x] `list-type-package.test.ts`, scenario 12: alias and pass-through. The existing `list-type-validator.test.ts` stays green.
- [x] Prove the drift test can fail: edit a description in `openapi.yaml` without regenerating and confirm it fails with the command name, then revert. Do the same for a hand edit to `api-swagger.json`, and for a temporary extra `listTypeData` entry.
- [x] Run `yarn lint:fix`, `yarn test` (including `libs/api` and `libs/list-types/common`), and `yarn openapi:json /tmp/openapi.json`.
- [ ] Manual check after deploy to aat, scenario 13 (not possible before merge/deploy): untokened `GET /cath/` → 401, tokened → 200, and the APIM definition shows the new title and enum.
