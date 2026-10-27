# Technical Plan: #579 Publisher-facing OpenAPI document for the CaTH Inbound Publication API

## 0. Specification

TEMPLATE SOURCE: n/a (no rendered page — the deliverable is a generated OpenAPI document, a generator script, Terraform wiring and tests)

- **Layout ("wireframe"):** the document layout tree in section 5 of the refined spec (comment by hmctsclaudecode, 2026-10-22) is the target shape. It is not repeated here. Checked against the source: following `$ref`s from `GET /` and `POST /publication` in `docs/api/openapi.yaml` reaches exactly the 11 header parameters, `requestBodies/Publication`, the six `Publication*` responses and the five schemas that tree lists. `ArtefactId`, `NoStore`, `Location`, `HealthResponse` and `ErrorResponse` drop out.
- **Reference:** pip-data-management `infrastructure/resources/swagger/api-swagger.json` (copy at `/tmp/pipdm/api-swagger.json`). We copy its shape: document-level `security: [{bearerAuth: []}]`, `info.contact`, gateway-only `servers`, and an `x-list-type` enum. We do **not** copy its `openapi: 3.1.1` (the source is 3.0.3 and stays 3.0.3), its `courtId`/`search` response fields, or its operationIds (`welcome`, `uploadPublication`).
- **Content, Validation, Navigation:** taken from the refined spec as written, apart from the deviations listed in section 1.6. Those deviations have reasons, and each one is also raised in section 6.
- **Accessibility:** there is no UI in this ticket, so WCAG does not apply.

## 1. Technical Approach

### 1.1 Where the publisher-only content lives

The AC says the generated document has "no hand-written content of its own". The spec, though, supplies new text: the title, description, contact, `bearerAuth` description, server description and the `x-list-type` preamble. That text has to live somewhere. If it lives in the generator, the generator becomes a second hand-maintained spec.

**Decision:** add a root vendor extension, `x-publisher`, to `docs/api/openapi.yaml`. It holds exactly the publisher overrides:

```yaml
x-publisher:
  info:            # title, description, contact (version and license come from source info)
  servers:         # the single APIM gateway entry, environment enum aat | demo | perftest
  securitySchemes: # bearerAuth only
  listTypeDescription: |   # the fixed x-list-type preamble
  schemaBaseUrl: https://github.com/hmcts/cath-service/blob/master/
```

OpenAPI 3.0.3 allows `x-*` keys at the root. So `yarn openapi:json` and cnp-api-docs still accept the file, and the internal reference is otherwise unchanged. The generator strips `x-publisher` from its output. `docs/api/openapi.yaml` stays the one hand-maintained file.

### 1.2 Supersede rules need to move in the source

At the moment the full `POST` description lives on `/v1/publication`. That includes the mode table, supersede rules, the size limits and the unresolved-court behaviour. `/publication` only says "see `POST /v1/publication`". The publisher document drops `/v1/publication`, so that link would point nowhere and the supersede rules would be lost.

**Decision:** in `docs/api/openapi.yaml`, move the full description onto `/publication`, which is the incumbent-compatible primary. Change `/v1/publication` to say "Versioned alias of `POST /publication`; identical behaviour." The developer reference keeps the same content. It just sits on the other operation.

### 1.3 Generator: TypeScript in the `libs/api` workspace, run by tsx

`listTypeData` is TypeScript, so a plain `.mjs` script cannot import it without a loader. Also, `scripts/` is not a yarn workspace, so a test placed there would never run under `turbo test`.

**Decision:** put the generator in `libs/api/openapi/`, in the `@hmcts/blob-ingestion` workspace, which owns the inbound publication contract. It sits **outside** `src/`, so `tsc` does not build it and it does not ship in `dist`. `vitest run` in `libs/api` still picks up its tests. The precedent is `apps/postgres/prisma/generate-seed-sql.ts`: a tsx-run generator that reads `listTypeData` from `@hmcts/list-types-common/list-type-data`, with a co-located test.

- `libs/api` already depends on `@hmcts/list-types-common`. On PRs, `turbo test --filter="...[origin/master]"` runs dependents, so a change to `listTypeData` or to the alias map re-runs the guard tests.
- Root script: `"openapi:publisher": "tsx libs/api/openapi/generate-publisher-document.ts"`. The command name is the one in the spec. The `scripts/openapi-to-publisher.mjs` path is replaced, for the reasons above.
- `yaml@2.9.0` and `tsx@4.22.4` are already root devDependencies. Do not re-declare them.

### 1.4 Reading `apim_operations`: move it to JSON

Parsing `env-config.tf` with a regex is brittle: comments, reformatting and nested maps all break it. Once APIM imports the committed document, Terraform no longer needs the operation list at all, because the imported document *is* the exposed surface.

**Decision:** move the list to `infrastructure/resources/apim-operations.json`:

```json
{ "/": { "get": "healthCheck" }, "/publication": { "post": "createPublication" } }
```

Remove `local.apim_operations` from `env-config.tf`, and move its comment ("never expose the session-cookie download routes") into `apim.tf`. Only the generator and the exposure test read the JSON. This is simpler and safer than keeping it in HCL and `jsondecode`-ing it into a local that nothing uses.

### 1.5 Schema links resolve the same way validation does

`validateListTypeJson` resolves `<kebab-name>` through the private `PACKAGE_ALIASES` map, then dynamically imports `@hmcts/<resolved>`. Copying that map would let validation and documentation drift apart.

**Decision:**
- Move the map and `convertListTypeNameToKebabCase` into a new dependency-free module, `libs/list-types/common/src/validation/list-type-package.ts`. It exports `resolveListTypePackageName(name)`.
- `list-type-validator.ts` uses it.
- Add a `./list-type-package` subpath export, mirroring `./list-type-data`.
- The generator imports that subpath, not the package index. The index pulls in `sjp-service` → `@hmcts/postgres-prisma`.

A list type has JSON schemas when `libs/list-types/<resolved>/src/schemas/*.json` exists. Link **every** `.json` file in that directory, sorted. All five `UTIAC_JR_*` list types resolve to `utiac-jr-daily-hearing-list`, which has two schemas, and its `validateUtiacJrAnyDailyHearingList` accepts either one. The CI guard in `libs/list-types/common/src/validation/guard.test.ts` already enforces "schema ⇒ `validate*` export", so finding a schema in the directory matches what `validateListTypeJson` will find.

Verified against the repo today:
- `listTypeData` has **77** entries, not 78. The ticket miscounted, because grep also counts `name:` in the interface. **40** of them resolve to a schema directory.
- Some schema packages are never reached by any `listTypeData` name: `sscs-daily-hearing-list`, the `upper-tribunal-*` packages, `rcj-standard-daily-cause-list`, `administrative-court-daily-cause-list`, `siac-poac-paac-weekly-hearing-list` and `ftt-rpt-weekly-hearing-list`. The list types those packages serve (`SSCS_*`, `UT_*`, the RCJ and admin court lists, and others) go through Excel conversion, so the API rejects them as JSON today. The document will show them without a schema link, which is accurate (see section 6).
- No test may hard-code 77 or 40.

### 1.6 Deviations from the refined spec

| Spec says | Plan does | Why |
|---|---|---|
| `scripts/openapi-to-publisher.mjs` | `libs/api/openapi/generate-publisher-document.ts` via `yarn openapi:publisher` | Needs TS imports. Tests must sit in a workspace to run in CI (1.3). |
| Read `local.apim_operations` from `env-config.tf` | `infrastructure/resources/apim-operations.json` | Safer than parsing HCL, and Terraform no longer needs the list (1.4). |
| APIM import keeps the gateway `servers`; "APIM only honours `service_url`" | Terraform still sets `servers = []` on the imported copy | `apim.tf` currently says servers are emptied "so it cannot override service_url". APIM's OpenAPI import can take the backend URL from `servers[0]`. With no `set-backend-service` in `api-policy.xml`, a gateway URL becoming the backend would loop APIM onto itself. Emptying `servers` is the one declared difference between the file and APIM's copy (see section 6). |
| Byte-equality drift test | Deep-equality on parsed JSON, plus a Biome exclusion for the file | Probed: `biome format` collapses `JSON.stringify(…, null, 2)` arrays (184 diff lines on the current spec), and the lefthook pre-commit runs `biome check --write` on staged files. So a byte compare would fail on every commit. |

### 1.7 CI: make sure the guard tests actually run

- Preview `detect-code-changes` covers `apps/|libs/|helm/|e2e-tests/|yarn.lock|Dockerfile` only. A PR that touches only `docs/api/openapi.yaml` or `infrastructure/resources/swagger/api-swagger.json` skips the Build stage and therefore `job.test.yml`.
- The infra detectors (`^(infrastructure/|docs/api/openapi\.yaml$)` in both `workflow.preview.yml` and `workflow.main.yml`) already match the new `infrastructure/resources/swagger/api-swagger.json` and `infrastructure/resources/apim-operations.json`. They also match yaml-only edits, so **keep** the `docs/api/openapi\.yaml$` alternative.
- **Decision:** add an `openapi-publisher-check` job to `.github/workflows/stage.infrastructure.yml`. It runs checkout → corepack → setup-node 24.17.0 → `yarn install --immutable` → `yarn workspace @hmcts/blob-ingestion vitest run openapi`. Make `terraform` `needs` it, so a drifted document is never planned or applied.
- `listTypeData` and alias changes are covered by the turbo `...[ref]` dependents run, because they live under `libs/`. Master pushes run the full suite.

## 2. Implementation Details

No API endpoints. No database or Prisma changes. No pages, templates or locale files.

### Files to create

| File | Purpose |
|---|---|
| `libs/api/openapi/publisher-document.ts` | Pure `buildPublisherDocument({ source, apimOperations, listTypes })`, where `listTypes: { name: string; schemaPaths: string[] }[]`. Selects the operations; sets the APIM `operationId`; deletes operation-level `security`; sets document-level `security: [{ bearerAuth: [] }]`; merges `x-publisher.info` over `source.info` (keeps `version` 1.0.1 and `license`); replaces `servers` and `securitySchemes`; sets the `ListType` component's `schema.enum` (names sorted with `localeCompare`) and `description` (preamble + a markdown list of `` `NAME`: [file.json](schemaBaseUrl + path) ``); prunes `components` by a transitive `$ref` walk; prunes `tags` to those used; drops `x-publisher`. Emits keys in a fixed order: `openapi, info, servers, tags, security, paths, components`. |
| `libs/api/openapi/publisher-inputs.ts` | `readPublisherInputs(repoRoot)`: parses `docs/api/openapi.yaml` (`yaml`), reads `infrastructure/resources/apim-operations.json`, maps `listTypeData` through `resolveListTypePackageName` and a `readdirSync` of `libs/list-types/<resolved>/src/schemas` to build `schemaPaths`. Also exports the constant `PUBLISHER_DOCUMENT_PATH = "infrastructure/resources/swagger/api-swagger.json"`. |
| `libs/api/openapi/generate-publisher-document.ts` | CLI: `readPublisherInputs` → `buildPublisherDocument` → `writeFileSync(path, JSON.stringify(doc, null, 2) + "\n")`, then logs the path, the path count and the enum size (style of `scripts/openapi-to-json.mjs`). On error it exits 1 with the message. |
| `libs/api/openapi/publisher-document.test.ts` | Unit tests on a small synthetic source (section 5). |
| `libs/api/openapi/publisher-inputs.test.ts` | Real-filesystem resolution tests. |
| `libs/api/openapi/committed-publisher-document.test.ts` | Repo guards: drift, enum completeness, exposure, `$ref` integrity, contract invariants. |
| `infrastructure/resources/apim-operations.json` | Exposed operations (1.4). |
| `infrastructure/resources/swagger/api-swagger.json` | Generated and committed. |
| `libs/list-types/common/src/validation/list-type-package.ts` | `convertListTypeNameToKebabCase`, `PACKAGE_ALIASES` (moved), `resolveListTypePackageName`. |
| `libs/list-types/common/src/validation/list-type-package.test.ts` | Alias and pass-through tests. Move the existing `convertListTypeNameToKebabCase` tests here. |

### Files to modify

| File | Change |
|---|---|
| `docs/api/openapi.yaml` | Add the `x-publisher` block, using the spec's Content verbatim (title, description, contact `Court and Tribunal Hearings team` / `publicationinformation@hmcts.net`, `bearerAuth` http/bearer/JWT plus description, gateway server plus description, `x-list-type` preamble, `schemaBaseUrl`). Move the full POST description onto `/publication` and shorten `/v1/publication` (1.2). Update the "maintained by hand" paragraph in `info.description`: after a contract change, run `yarn openapi:publisher` and commit the JSON. Leave `azureAd`, `session`, all routes and the existing `ListType.description` untouched. |
| `libs/list-types/common/src/validation/list-type-validator.ts` | Import `convertListTypeNameToKebabCase` / `resolveListTypePackageName` from `./list-type-package.js`. Re-export `convertListTypeNameToKebabCase` so `index.ts` keeps working. |
| `libs/list-types/common/package.json` | Add the `"./list-type-package"` export (`production: ./dist/validation/list-type-package.js`, `default: ./src/validation/list-type-package.ts`). |
| `package.json` (root) | Add `"openapi:publisher": "tsx libs/api/openapi/generate-publisher-document.ts"`. |
| `biome.json` | Add `"!infrastructure/resources/swagger"` to `files.includes` so the generator's output is committed exactly as written. |
| `infrastructure/apim.tf` | Replace `openapi_spec` / `apim_openapi_paths` / `apim_openapi` with `apim_openapi = jsonencode(merge(jsondecode(file("${path.module}/resources/swagger/api-swagger.json")), { servers = [] }))`. Rewrite the header comment: generated by `yarn openapi:publisher`, operations from `resources/apim-operations.json`, never expose the session-cookie download routes, and why `servers` is emptied. `content_format = "openapi+json"` and `swagger_url = local.apim_openapi` stay. |
| `infrastructure/env-config.tf` | Remove the `apim_operations` local and its comment. |
| `.github/workflows/stage.infrastructure.yml` | Add the `openapi-publisher-check` job; add it to `terraform.needs` (1.7). |

Unchanged:
- `scripts/openapi-to-json.mjs`
- `.github/workflows/job.publish-openapi.yml`
- `infrastructure/apim-operation.tf`
- `infrastructure/resources/operation-policies/{healthCheck,createPublication}.xml`
- the `Artefact` schema (`locationId`, no `search`)

## 3. Error Handling & Edge Cases

- **`x-publisher` missing or incomplete:** the generator throws `docs/api/openapi.yaml has no x-publisher.<key>` and the CLI exits 1. It must never fall back to the internal `info`, `servers` or `azureAd`.
- **APIM operation not in the source** (e.g. a typo in `apim-operations.json`): throws `apim-operations.json exposes POST /foo but docs/api/openapi.yaml has no such operation`.
- **Dangling `$ref` while pruning:** throws, naming the ref. It must not silently emit a document that APIM import would reject.
- **`ListType` component missing,** or `x-list-type` defined inline instead of through `$ref`: throws. The enum must land on the parameter that `POST /publication` actually uses.
- **Duplicate `listTypeData` names:** the generator removes duplicates before sorting. The enum-completeness test still compares as sets.
- **List type removed from `listTypeData`:** it disappears from the enum on regeneration. The completeness test catches a stale enum value.
- **Untracked local directories under `libs/list-types/`:** several exist on this machine with only `node_modules`. They have no `src/schemas`, so they are ignored. A local-only directory *with* schemas would produce local drift. CI uses a clean checkout, so it gives the correct answer.
- **Operation-ID collision:** the source uses `createPublication` for `/v1/publication`. It does not appear in the publisher document, but the builder asserts that operationIds in the output are unique.
- **First Terraform apply after merge:** the import content changes (title, enum, pruned components), so APIM re-imports `cath-api` in place. Operation IDs are unchanged, so `azurerm_api_management_api_operation_policy` keys still resolve. Check the plan on the PR: only `module.apim_api[0].azurerm_api_management_api.api` should be modified in place, with no destroy/create of policies. If APIM resets the operation policies on re-import, a second apply restores them; they are `<base/>` today.
- **`GET /` secured only at the gateway:** confirmed in code. `resources/api-policy/api-policy.xml` applies `validate-azure-ad-token` (role `api.publisher.user`, 401 on failure) at API scope, and `healthCheck.xml` only inherits `<base/>`. The document's claim is therefore true. Verify it with one call after deploy.

## 4. Acceptance Criteria Mapping

| AC scenario | How satisfied | How verified |
|---|---|---|
| Generated from the single source | `yarn openapi:publisher` writes the file from `openapi.yaml` (including `x-publisher`) + `listTypeData` + `apim-operations.json`. The generator has no content strings of its own. | Drift test; review: the generator has no prose literals. |
| Only the two exposed operations; pruned components | Selected from `apim-operations.json`; transitive `$ref` prune | Committed-doc test: paths/methods equal the JSON; every component is reachable; every `$ref` resolves. Unit test on a synthetic source with an unused component. |
| Publisher-facing identity | `x-publisher.info` merged over `source.info` | Committed-doc test: `info.title`, `contact.email`, `version` equal source `info.version`. |
| Bearer replaces OAuth2 | Document-level `bearerAuth`; operation `security` deleted; `securitySchemes` replaced | Committed-doc test: `securitySchemes` keys are `["bearerAuth"]`, type/scheme/bearerFormat match, the description contains `api.publisher.user`, and no operation has its own `security`. |
| `GET /` secured despite `security: []` in source | Operation-level `security` is always deleted (a declared transform) | Unit test: a source with `security: []` produces a document where `GET /` inherits `bearerAuth`. Post-deploy untokened call → 401. |
| Only APIM gateway servers | `x-publisher.servers` | Committed-doc test: a single server, URL template and enum `aat, demo, perftest`. |
| `x-list-type` enum from reference data, schema links | `listTypes` → sorted enum; links for resolved schema directories | Committed-doc test (completeness, sorted). Inputs test (`CROWN_DAILY_PDDA_LIST` → `crown-daily-list.json`; `UTIAC_JR_LEEDS_*` → two links; `PCOL_DAILY_CAUSE_LIST` → none). |
| New list type reaches publishers without a spec edit | The enum comes only from `listTypes` | Unit test: an extra name in `listTypes` appears in the enum with an unchanged source. |
| APIM serves what publishers are given; IDs unchanged | `apim.tf` imports the committed file (`servers` emptied); IDs come from the JSON | Exposure test: operationIds `healthCheck` / `createPublication`; every `operation-policies/*.xml` basename is a document operationId. `terraform plan` on the PR. |
| Drift from source fails | Deep-equal regenerate-vs-committed | Drift test. The message names `yarn openapi:publisher`, and `toEqual` shows the diff. Runs in the turbo tests and in the infra-stage check job. |
| Hand-edited committed file fails | Same drift test | Same. |
| Missing list type fails | Enum-completeness test, both directions | The message lists the missing or extra names. |
| Exposed-but-undocumented operation fails | Exposure test against `apim-operations.json` | Same test. |
| Internal reference unchanged in substance | Source edits limited to `x-publisher` + the description move | Committed-doc test asserts the source still has `azureAd`, `session`, `/v1/publication`, `/locations`, both download routes and the three health routes. `yarn openapi:json /tmp/x.json` still runs. |
| Response not "aligned" to the incumbent | `Artefact` carried verbatim | Committed-doc test: `Artefact.properties` has `locationId`, and has neither `courtId` nor `search`. |

## 5. Test Scenarios

Unit tests use AAA. Each scenario maps to a task in `tasks.md`. There are no E2E tests because nothing is rendered.

**`publisher-document.test.ts`** (synthetic source, no filesystem):
1. Builds only the operations named in `apimOperations`, with APIM operationIds and document-level `bearerAuth`. A source `GET /` with `security: []` ends up with no operation-level security.
2. Applies `x-publisher` info/servers/securitySchemes, keeps source `version`/`license`, and removes `x-publisher` and `azureAd`/`session`.
3. The `x-list-type` enum is sorted and de-duplicated. An extra list type appears without a source change. The description is the preamble followed by links only for list types with `schemaPaths`, and a list type with two schemas gets both.
4. Prunes unreferenced parameters, schemas, responses and headers, and unused tags, keeping transitive refs (response → schema).
5. Error paths: missing `x-publisher`; an APIM operation absent from the source; a dangling `$ref`; `ListType` component absent. Each throws a message naming the cause.

**`publisher-inputs.test.ts`** (real repo files):
6. `CROWN_DAILY_PDDA_LIST` resolves to `libs/list-types/crown-daily-list/src/schemas/crown-daily-list.json`. A `UTIAC_JR_*` list type gets both UTIAC JR schemas. A flat-file-only list type (e.g. `PCOL_DAILY_CAUSE_LIST`) gets `[]`.

**`committed-publisher-document.test.ts`** (repo guard):
7. Drift: `buildPublisherDocument(readPublisherInputs(root))` deep-equals the parsed committed file. The failure message is `Run yarn openapi:publisher and commit infrastructure/resources/swagger/api-swagger.json`.
8. Enum completeness: committed enum vs `listTypeData` names, both directions, plus sorted order. The failure lists the names.
9. Exposure: committed paths/methods/operationIds equal `apim-operations.json` exactly, and every `resources/operation-policies/*.xml` basename is a committed operationId.
10. Integrity: every `$ref` resolves, and every component is reachable from `paths` (`securitySchemes` checked against `security`).
11. Contract invariants: `Artefact` has `locationId` and neither `courtId` nor `search`. Source `docs/api/openapi.yaml` still contains `azureAd`, `session`, `/v1/publication`, `/locations`, the download routes and the health routes.

**`list-type-package.test.ts`:**
12. `resolveListTypePackageName("CROWN_DAILY_PDDA_LIST") === "crown-daily-list"`; non-aliased names pass through as kebab-case. The existing `list-type-validator.test.ts` still passes, which proves the refactor kept behaviour.

**Manual (post-deploy, aat):**
13. `GET https://cft-api-mgmt.aat.platform.hmcts.net/cath/` without a token → 401; with a publisher token → 200. The APIM portal's API definition shows the new title and enum.

## 6. CLARIFICATIONS NEEDED

1. **Contact address.** Is `publicationinformation@hmcts.net` the right inbox for external publishers asking for the `api.publisher.user` role? pip-data-management uses it with the name "CaTH Team". The spec says "Court and Tribunal Hearings team". It appears in `info.contact`, `info.description` and the `bearerAuth` description, but only once in source (`x-publisher`), so changing it is cheap.
2. **`servers` in the APIM import.** The spec says to stop emptying `servers`. This plan keeps `servers = []` in Terraform because the current `apim.tf` comment and APIM's import behaviour mean the gateway URL could become the backend. Is that one declared difference between the committed file and APIM's copy acceptable? Or should someone run a throwaway import in aat with `servers` intact to prove `service_url` wins?
3. **Enum scope.** The plan enumerates all 77 `listTypeData` names (the ticket's "78" is a miscount), with schema links for the 40 that resolve. Confirm. Also: `SSCS_*`, `UT_*`, the RCJ/administrative-court lists and others have schema packages, but no name resolves to them, so JSON for those list types is rejected by `POST /publication` today and they will be documented as flat-file only. Is that the intended API behaviour, or a validator gap to raise separately?
4. **Schema link target.** Links use `https://github.com/hmcts/cath-service/blob/master/libs/list-types/...`. Can external publishers browse that repo, or do the schemas need publishing somewhere they can reach (for example alongside the cnp-api-docs entry)? Is `master` acceptable, given that links can change ahead of a deploy?
5. **ITHC/PROD rollout (#1160, #1161).** The server `environment` enum is hand-maintained in `x-publisher.servers`, so those tickets must add `ithc`/`prod` there. Do we want a guard now? That would require parsing `apim_suffix` out of HCL, which this plan avoids. Or should we just add a note to those issues?
6. **Distribution.** How do publishers receive the document: sent the file, pointed at the repo path, or via the APIM developer portal? This plan only makes the committed file and APIM's copy agree. It does not publish anything new.
7. **Carried-over text that reads oddly to publishers.** The `x-provenance` enum includes `MANUAL_UPLOAD`. The `GET /` response documents `/health` endpoints that APIM does not expose. The `Service` tag says "Service metadata and health." The plan carries all three over verbatim, as the spec says. Should `x-publisher` override any of them?
8. **APIM `display_name`.** `module.apim_api` stays `"CaTH API"` while the imported title becomes "CaTH Inbound Publication API". Rename it (an in-place change) or leave it alone?
