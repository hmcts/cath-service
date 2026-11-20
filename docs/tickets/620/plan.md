# Technical Plan: #620 Create APIM Testing-Support API for cath-service

TEMPLATE SOURCE: n/a

Infrastructure only. Terraform and APIM policy XML under `infrastructure/`. No app code, pages, API routes in `apps/`, database changes or E2E tests. Nothing under `apps/` or `libs/` changes.

## 1. Technical Approach

### What this does

Registers a second API, `cath-testing-support-api`, on the CFT APIM instance cath already uses, under the existing `cath` product. Each of its four operations validates the caller's Entra ID token (inline `validate-azure-ad-token`, the same policy `cath-api` uses, minus its role check) and returns a fixed `200` from APIM. No backend is called. It exists so non-production environments have a mock third-party destination (for #829 "Test connection" and for publication pushes).

Everything is additive and gated to aat, demo and perftest. ithc and any future prod environment get nothing.

Decision recorded: a shared `cath-jwt-validation` policy fragment (originally planned in #619) was considered and dropped on user instruction. Token validation is inline in each operation policy, with no shared fragment. This ticket therefore has no dependency on #619.

Decision recorded: the operation policies use `validate-azure-ad-token` with the same attributes as `cath-api`'s `resources/api-policy/api-policy.xml`, without the `required-claims` block (user decision, final). pip's `validate-jwt` (openid-config plus a v2.0-only issuer list) was not used. Reasons: (1) it is the policy cath already runs, and the maintainer's own token (v2.0, audience the `cath-service-api-client-id` GUID) is already accepted by it on `cath-api`, so the same token should be accepted here minus the role; (2) it does not list a single hard-coded issuer, so it is not tied to v2.0 tokens like pip's `validate-jwt` was. A real token against the deployed aat policies is still the proof.

### Repo verification (ticket vs repo)

| Ticket reliance | Repo state | Result |
|---|---|---|
| `infrastructure/` with `apim.tf`, `apim-operation.tf`, `apim-logger.tf`, `data.tf`, `env-config.tf` | All exist | OK |
| `local.apim_name`, `local.apim_rg`, `local.deploy_apim` | `env-config.tf` lines 58-61: `apim_suffix = try(local.env_config[var.env].apim_suffix, null)`, `deploy_apim = local.apim_suffix != null`, `apim_name = "cft-api-mgmt-${coalesce(...)}"`, `apim_rg = "cft-${var.env}-network-rg"` | OK |
| `data.azurerm_api_management.cft` | `data.tf`, `count = local.deploy_apim ? 1 : 0` | OK (not needed directly by this story) |
| `module.apim_product` | `apim.tf`, `count = local.deploy_apim ? 1 : 0`, product name `cath`, `subscription_required = false` | OK, index `[0]` is valid whenever the new gate is true |
| `azurerm_api_management_logger.apim` | `apim-logger.tf`, `count = local.deploy_apim ? 1 : 0` | OK |
| Provider alias `azurerm.cftapps` | `provider.tf` | OK |
| `var.env` / `env_config` | `variables.tf`; `env_config` has keys `aat`, `demo`, `ithc`, `perftest` only | OK |
| `data.azurerm_key_vault_secret.apim_tenant_id` / `apim_client_id` | `data.tf`, `count = local.deploy_apim ? 1 : 0`, secrets `app-tenant-id` and `cath-service-api-client-id` | OK, the four operation policies read these two via `templatefile()` |

### Token validation is inline (same policy as cath-api, no role check)

Each operation policy carries its own `validate-azure-ad-token` on the `Authorization` header. No shared fragment, no #619 dependency.
- The element is the same as `cath-api`'s, with identical attributes (`tenant-id="${tenant_id}"`, `header-name="Authorization"`, `failed-validation-httpcode="401"`, `failed-validation-error-message="Access denied due to invalid OAuth information"`, audience `${client_id}`), minus the `<required-claims>` block.
- The placeholders are `templatefile()` variables, `tenant_id` from `app-tenant-id` and `client_id` from `cath-service-api-client-id`, read through the existing `data.azurerm_key_vault_secret.apim_tenant_id[0]` / `apim_client_id[0]`. The `[0]` index is only evaluated when the gate is on. No Key Vault access-policy `depends_on` is needed: the values are read at plan time, not by APIM at runtime.
- No role check (confirmed by the ticket owner). Any valid token for the `cath-service-api-client-id` audience from the cath tenant is accepted. `resources/api-policy/api-policy.xml` (`cath-api`) is untouched and keeps its `api.publisher.user` check.
- No coupling to #619. #619's OTP API does its own validation and must not expect a shared fragment from this ticket.

Note: unlike pip's `validate-jwt`, this policy is not pinned to a v2.0 issuer. The aat check with a real token is still the proof that it is accepted.

### Key findings that shape the implementation

1. **Operation-policy directory (ticket claim confirmed).** `apim-operation.tf` builds `fileset(path.module, "resources/operation-policies/*.xml")` and applies every file to `module.apim_api[0].name` (`cath-api`), keyed by filename. Its own comment says a name that is not an imported operationId fails the apply. Today that directory holds only `createPublication.xml` and `healthCheck.xml`, matching `resources/apim-operations.json`. The new policies therefore need their own directory, `resources/testing-support/operation-policies/`.
   - No glob overlap: `fileset` `*` does not cross `/`, so `resources/operation-policies/*.xml` cannot match anything under `resources/testing-support/`, and the new glob `resources/testing-support/operation-policies/*.xml` cannot match the existing files. Keep the new directory a sibling of `resources/operation-policies/`, not a child.

2. **`swagger_url = file(...)` is valid, with one cath-specific caveat.** The `cnp-module-api-mgmt-api` input is named `swagger_url` but accepts inline content. `apim.tf` already passes inline JSON (`swagger_url = local.apim_openapi`, comment "swagger_url accepts inline content as well as a URL"), and pip passes `file("./resources/testing-support/swagger/api-swagger.json")` the same way. So `file()` is consistent with both repos. I could not read the module source locally (no `.terraform` cache, no checkout), so this rests on the existing working use in `apim.tf`, not on the module code. Confirmed by the first `terraform plan`/apply.
   - Caveat: `apim.tf` sets `servers = []` on the imported copy because APIM can take the backend URL from `servers[0]` on import and point the gateway at itself. The testing-support swagger must therefore have **no `servers` block** (pip's copy has one pointing at `pip-publication-services.staging.platform.hmcts.net`; do not carry it over). With none, `file()` can be passed directly and no `jsondecode/merge/jsonencode` wrapper is needed. The backend URL comes from `service_url`.
   - pip's swagger is `openapi: 3.1.0`; cath's imported document is `3.0.3`. Use `3.0.3` for the new file to match what is known to import into this APIM instance.

3. **House style for modules.** `apim.tf` pins `source = "git::https://github.com/hmcts/cnp-module-api-mgmt-api?ref=master"` and `...-policy?ref=master` (no tags), with `providers = { azurerm = azurerm.cftapps }`, `count = local.deploy_apim ? 1 : 0`, `api_mgmt_name/api_mgmt_rg`, `protocols = ["https"]`, `service_url = "https://cath-api.${var.env}.platform.hmcts.net"`, `product_id = module.apim_product[0].product_id`. The ticket's draft matches this exactly (`ref=master`, not pip's `git@github.com:` SSH form). Follow the ticket.

4. **No clash on name or path.** Existing: `name = "cath-api"`, `path = "cath"`. New: `cath-testing-support-api`, `cath/testing-support`. #619 plans `cath-otp-api` at `cath/otp`. All three names and paths are distinct, and no operation URL overlaps (`cath-api` serves only `/` and `/publication`). All three sit under the `cath` prefix, so a first request in stg should confirm APIM routes `/cath/testing-support/third-party` to the new API and not to `cath-api`. pip uses a sibling path (`pip/publication-services-testing-support`); cath's nested path is a ticket decision.

5. **Env gating is valid.** `var.env` values in play are `aat`, `demo`, `perftest` (plus `ithc`, parked). Evidence: `env_config` keys; `stage.infrastructure.yml` matrices; `workflow.main.yml` and `workflow.preview.yml` `environments: '["aat","demo","perftest"]'`. `deploy_apim` is true only where `apim_suffix` is non-null: aat (`stg`), demo (`demo`), perftest (`test`). ithc has `apim_suffix = null`, so false. There is no `prod` key, so `try(..., null)` gives false for prod and any unknown env. `local.deploy_apim && contains(["aat","demo","perftest"], var.env)` is valid HCL and yields true for exactly those three. Today the allowlist is redundant with `deploy_apim`; it is a deliberate guard so a future `prod` entry in `env_config` (which would turn `deploy_apim` on) does not deploy the mock. Keep it.

6. **CI/tooling.** CI is GitHub Actions, not Jenkins. `job.terraform-fmt.yml` runs `hmcts/cnp-githubactions-library/terraform-fmt` on `infrastructure/`. `stage.infrastructure.yml` then plans (PR, `workflow.preview.yml`) or applies (master, `workflow.main.yml`) for aat, demo, perftest via `terraform-deploy.yaml`. The aat plan is posted as a PR comment; demo and perftest plans are in the Actions logs. No tflint or checkov is configured. `state.tf` requires `>= 1.14.0` and `.terraform-version` is `1.15.8`; the local `terraform` is 1.13.3, so local `validate` needs a newer binary (e.g. tfenv).

7. **Product policy is not applied to these operations.** `resources/product-policy/product-policy.xml` applies `rate-limit-by-key` (600/min per `azp`/`appid`, `anonymous` when no token) to every API in the `cath` product. It would reach the new API only through `<base />`, but in the operation policies (copied from pip) `<base />` comes after `<return-response>`, so it is unreachable: the response is returned first and the rate limit does not run for these operations. The existing `resources/api-policy/api-policy.xml` (role `api.publisher.user` check plus token swap) is attached to `cath-api` only and is NOT inherited.

8. **Diagnostics.** The new `azurerm_api_management_api_diagnostic` only sets sampling, errors, IP, verbosity and correlation, so no request or response bodies or headers are logged. This is correct for a mock and avoids the personal-data concern noted in `apim-logger.tf`. Do not copy the `frontend_request`/`backend_*` blocks from `azurerm_api_management_api_diagnostic.cath`.

### Differences from pip-publication-services (reference read locally)

The reference copy exists at `/Users/kian.kwa/IdeaProjects/pip-publication-services/infrastructure/resources/testing-support/` (api-policy, four operation XMLs, swagger) and `tf-apim-api.tf`, `tf-apim-operations.tf`. Read in full.

| Item in pip | Action for cath |
|---|---|
| `api-policy.xml`: passthrough, `<base />` in four sections | Copy unchanged. Identical to cath's existing passthrough `healthCheck.xml`. |
| Operation XMLs: inline `validate-jwt` (openid-config + v2.0 issuer) with `{TENANT_ID}`/`{CLIENT_ID}`, rendered by terraform `replace()` | Replaced by `cath-api`'s `validate-azure-ad-token` without the role claim. Placeholder syntax changes to `${tenant_id}`/`${client_id}` rendered by `templatefile()`, the cath convention (same as `resources/api-policy/api-policy.xml`). The rest of the operation XML is copied from pip. |
| Operation XMLs: `<cors>` with `allowed-origins *` | Kept, copied from pip. `allowed-methods` is the single method of that operation. |
| Operation XMLs: `<base />` placed **after** `<return-response>` | Kept as in pip. This is dead code: the response is returned first, so the product-scope rate limit never runs for these operations. |
| `return-response` blocks: `JObject` with `"response code": 200` and `"description": "..."` | Keep verbatim, including the four description strings. |
| Swagger: `3.1.0`, title "CaTH Publication Services Testing Support", `servers` pointing at pip's staging host, `externalDocs` to pip repo, tag "Publication Services Testing Support API", 90-entry `listType` enum | Adapt: `3.0.3`, title "CaTH Testing Support API", no `servers`, no pip `externalDocs`, new tag name, and `listType` as a plain `string` (the enum is pip's list-type set; copying it creates a stale duplicate of `libs/list-types/common/src/list-type-data.ts`, and the mock never validates the body). |
| Module wiring: `local.env`, `data.azurerm_api_management_product`, SSH git source, `depends_on = [module...]` | Replace with the cath CFT equivalents above. |

For context, cath's current outbound push (`libs/legacy-third-party-fulfilment/src/push/http-client.ts`) is a POST with multipart parts `json`/`pdf`/`file`, which is not the `metadata`/`payload`/`file` contract in pip's swagger, and it never issues PUT or DELETE. The mock returns 200 without reading the body, so this does not break anything, but the swagger documents pip's contract, not cath's current one (Clarification 1).

Naming note: `libs/test-support` and `/test-support/...` routes in the app are unrelated to this APIM API. Keep the `testing-support` APIM naming as the ticket specifies.

## 2. Implementation Details

### Files to modify

| File | Change |
|---|---|
| `/Users/kian.kwa/IdeaProjects/cath-service/infrastructure/env-config.tf` | Add `deploy_apim_testing_support = local.deploy_apim && contains(["aat", "demo", "perftest"], var.env)` inside the existing `locals` block, directly after `apim_rg`. The file uses a single `locals` block, so do not add a second one as the ticket's draft does. Keep one short "why" comment (explicit allowlist so a future `prod` entry cannot deploy the mock). |

### Files to create

| File | Purpose |
|---|---|
| `/Users/kian.kwa/IdeaProjects/cath-service/infrastructure/apim-testing-support.tf` | `module.apim_api_testing_support`, `module.apim_api_testing_support_policy`, the operation-policy local plus `azurerm_api_management_api_operation_policy.apim_testing_support_operation_policy`, and `azurerm_api_management_api_diagnostic.testing_support`. Follows the ticket's HCL with the adjustments below. |
| `/Users/kian.kwa/IdeaProjects/cath-service/infrastructure/resources/testing-support/api-policy/api-policy.xml` | Passthrough API policy. |
| `/Users/kian.kwa/IdeaProjects/cath-service/infrastructure/resources/testing-support/swagger/api-swagger.json` | OpenAPI 3.0.3 document for the four operations. No `servers`. |
| `/Users/kian.kwa/IdeaProjects/cath-service/infrastructure/resources/testing-support/operation-policies/thirdPartyHealthCheck.xml` | GET `/third-party`. Inline `validate-azure-ad-token`, rendered with `templatefile()`. |
| `/Users/kian.kwa/IdeaProjects/cath-service/infrastructure/resources/testing-support/operation-policies/thirdPartyNewPublication.xml` | POST `/third-party`. |
| `/Users/kian.kwa/IdeaProjects/cath-service/infrastructure/resources/testing-support/operation-policies/thirdPartyUpdatePublication.xml` | PUT `/third-party/{publicationId}`. |
| `/Users/kian.kwa/IdeaProjects/cath-service/infrastructure/resources/testing-support/operation-policies/thirdPartyDeletePublication.xml` | DELETE `/third-party/{publicationId}`. |

The XML and swagger file names are camelCase because they must equal the operationIds (the `for_each` key becomes `operation_id`). That is a constraint, not a deviation from the kebab-case rule. The `.tf` file is kebab-case, as in `apim-logger.tf`.

No changes to `apim.tf`, `apim-operation.tf`, `apim-logger.tf`, `data.tf`, `provider.tf`, `keyvault-access.tf`, or the existing `resources/` files. No README or infra doc lists APIM resources (only `docs/GITHUB_SECRETS_SETUP.md` mentions the APIM RBAC role, which is unchanged), so no doc updates are needed.

### Components / modules

Both module blocks match `apim.tf`'s style (`ref=master`, `providers = { azurerm = azurerm.cftapps }`, `count` on the gate).

```hcl
module "apim_api_testing_support" {
  count  = local.deploy_apim_testing_support ? 1 : 0
  source = "git::https://github.com/hmcts/cnp-module-api-mgmt-api?ref=master"

  providers = { azurerm = azurerm.cftapps }   # written multi-line, as in apim.tf

  api_mgmt_name = local.apim_name
  api_mgmt_rg   = local.apim_rg
  name          = "cath-testing-support-api"
  display_name  = "CaTH Testing Support API"
  path          = "cath/testing-support"
  revision      = "1"
  protocols     = ["https"]
  service_url   = "https://cath-api.${var.env}.platform.hmcts.net"
  product_id    = module.apim_product[0].product_id

  content_format = "openapi+json"
  swagger_url    = file("${path.module}/resources/testing-support/swagger/api-swagger.json")

  subscription_required = false
}
```

- `module.apim_api_testing_support_policy`: `api_name = module.apim_api_testing_support[0].name`, `api_policy_xml_content = file(".../api-policy/api-policy.xml")`. No `depends_on` needed (`api_name` is a module output reference). No Key Vault access policy dependency, because this policy reads no secrets.
- `local.apim_testing_support_operation_policies`: `local.deploy_apim_testing_support ? { for file in fileset(path.module, "resources/testing-support/operation-policies/*.xml") : trimsuffix(basename(file), ".xml") => templatefile("${path.module}/${file}", { tenant_id = data.azurerm_key_vault_secret.apim_tenant_id[0].value, client_id = data.azurerm_key_vault_secret.apim_client_id[0].value }) } : {}` (written multi-line). Same shape as `apim-operation.tf`, but `templatefile()` instead of `file()`. The `[0]` indexes are only evaluated when the gate is on. Put the comment explaining the separate directory next to the local, as the ticket does, plus a note never to use C# `$"..."` interpolation in these files.
- `azurerm_api_management_api_operation_policy.apim_testing_support_operation_policy`: `for_each` over the local, `provider = azurerm.cftapps`, `api_name = module.apim_api_testing_support[0].name`, `operation_id = each.key`. No `depends_on`.
- `azurerm_api_management_api_diagnostic.testing_support`: `count` on the gate, `api_management_logger_id = azurerm_api_management_logger.apim[0].id`, `sampling_percentage = 100.0` (as cath-api), `always_log_errors = true`, `log_client_ip = true`, `verbosity = "verbose"`, `http_correlation_protocol = "W3C"`.

### Operation policy template (four files, only the `cors` method and the description differ)

```xml
<policies>
  <inbound>
    <validate-azure-ad-token tenant-id="${tenant_id}" header-name="Authorization" failed-validation-httpcode="401" failed-validation-error-message="Access denied due to invalid OAuth information">
      <audiences>
        <audience>${client_id}</audience>
      </audiences>
    </validate-azure-ad-token>
    <cors>
      <allowed-origins>
        <origin>*</origin>
      </allowed-origins>
      <allowed-methods>
        <method>GET</method>
      </allowed-methods>
    </cors>
    <return-response>
      <set-status code="200" />
      <set-header name="Content-Type">
        <value>application/json</value>
      </set-header>
      <set-body>@{
        return new JObject(
        new JProperty("response code", 200),
        new JProperty("description", "Successful health check.")
        ).ToString();
        }
      </set-body>
    </return-response>
    <base />
  </inbound>
  <backend>
    <base />
  </backend>
  <outbound>
    <base />
  </outbound>
  <on-error>
    <base />
  </on-error>
</policies>
```

The `validate-azure-ad-token` element is `cath-api`'s, without `<required-claims>`. The `cors` method is the operation's own method (GET, POST, PUT, DELETE). `<base />` after `<return-response>` is intentional, as in pip (unreachable, see finding 7). These files go through `templatefile()`: C# `@{ }` blocks are fine, only `${` and `%{` are special, so never use C# `$"..."` interpolation.

### API endpoints (mock operations)

Public URL = `https://<cft-apim>/cath/testing-support` + path. All return `200`, `Content-Type: application/json`, and a body of the form `{"response code": 200, "description": "..."}`. A missing or invalid token returns `401` from `validate-azure-ad-token`.

| operationId | Method | Path | Description in response body |
|---|---|---|---|
| `thirdPartyHealthCheck` | GET | `/third-party` | `Successful health check.` |
| `thirdPartyNewPublication` | POST | `/third-party` | `New publication request was received successfully.` |
| `thirdPartyUpdatePublication` | PUT | `/third-party/{publicationId}` | `Updated publication request was received successfully.` |
| `thirdPartyDeletePublication` | DELETE | `/third-party/{publicationId}` | `Deleted publication request was received successfully.` |

Swagger: `publicationId` is a required `uuid` path parameter on PUT and DELETE. POST and PUT carry an optional `multipart/form-data` body (`metadata`, `payload`, `file`). Responses declared: 200, 401. Security scheme `bearerAuth` (http bearer, JWT). The 403 response in pip's file is dropped, because nothing here returns 403: the `validate-azure-ad-token` policy (no `required-claims`) returns 401 only and does not check roles.

### Database schema changes

None.

## 3. Error Handling & Edge Cases

| Scenario | Handling |
|---|---|
| `${` or C# `$"..."` interpolation in an operation XML | Breaks `templatefile()` (unknown variable or parse error). Use `${...}` only for `tenant_id` and `client_id`. Keep the warning comment next to the local. |
| Caller token valid but issued for a different audience | 401 from `validate-azure-ad-token`. A third-party OAuth config calling this mock must request `api://<cath-service-api-client-id>/.default` from the cath tenant. |
| Caller token valid and correct audience but without the `api.publisher.user` role | Accepted (`validate-azure-ad-token` without `required-claims`). Intended for a mock third party. `cath-api` keeps its own role check and is not touched. |
| Wildcard CORS (`allowed-origins *`) | Kept from pip. The callers are server-to-server and a token is still required, so the exposure is limited. |
| `<base />` after `<return-response>` | Unreachable, as in pip. The product-level rate limit (600/min) therefore does not apply to these operations. Fine for a mock, but there is no throttling if a test hammers the endpoint. |
| operationId in swagger does not match a policy filename | `azurerm_api_management_api_operation_policy` apply fails with operation not found. Keep the four swagger `operationId`s byte-identical to the XML filenames (case-sensitive). |
| An unrelated XML dropped into `resources/testing-support/operation-policies/` | Same failure. Mirror the warning comment from `apim-operation.tf`. |
| Glob overlap between the two `fileset`s | Not possible, per finding 1. Do not nest the new directory under `resources/operation-policies/`. |
| Gate false (ithc, prod, unknown env) | All `count = 0` and `fileset` result gated to `{}`, so no `[0]` is evaluated. `module.apim_product[0]` and `azurerm_api_management_logger.apim[0]` are only referenced inside blocks that do not evaluate when `count = 0`. |
| Gate true but `deploy_apim` false | Impossible: the gate is `deploy_apim && ...`. This is why `[0]` on `module.apim_product` and `azurerm_api_management_logger.apim` is safe. |
| Swagger carries a `servers` entry | APIM may take the backend URL from it and point the gateway at the wrong host (the reason `apim.tf` empties `servers`). Leave `servers` out of the file. |
| Swagger 3.1 features rejected by APIM import | Use 3.0.3 and no 3.1-only keywords. |
| APIM path routing between `cath` and `cath/testing-support` | Distinct operations and prefixes, but verify in stg that the new path does not fall through to `cath-api`. |
| Destroying later | Operation policies and diagnostic depend on the API through module output references, so ordering is correct. The shared logger and product are not touched. |

### Validation requirements

- `terraform fmt -check -recursive` in `infrastructure/` (CI: `job.terraform-fmt.yml`).
- `terraform init -backend=false && terraform validate` with Terraform >= 1.14 (use 1.15.8 per `.terraform-version`). Needs network access to fetch the git modules.
- Validate all new XML is well formed and the swagger is valid JSON (e.g. `python3 -m json.tool`, `xmllint --noout`). Terraform does not check either. The operation XMLs must also render cleanly through `templatefile()` (`terraform console` or `terraform plan` catches an unescaped `${`).
- Plan expectations (PR plan, `workflow.preview.yml`):
  - aat, demo, perftest: only additions. Per env: 1 API (plus the module's internal resources), 1 API policy, 4 operation policies, 1 diagnostic. No changes or replacements to `cath-api`, its API policy, the `cath` product, the logger, or `azurerm_api_management_api_diagnostic.cath`.
  - ithc: not planned by CI (parked), but a manual plan with `var.env=ithc` must show zero testing-support resources.

### Edge cases to handle

- Keep XML `return-response` bodies exactly as the ticket states, including the space in `"response code"`.
- The operation XMLs use `templatefile()`. C# `@{ }` blocks are safe; a stray `${` or `%{` is not. The passthrough `api-policy.xml` and the swagger are read with `file()`.
- The `.terraform` cache and module checkouts are not in the repo, so no lockfile or generated files are expected in the diff.

## 4. Acceptance Criteria Mapping

| Acceptance criterion | How it is met | Verification |
|---|---|---|
| All resources use `local.apim_name`, `local.apim_rg`, `provider = azurerm.cftapps`; nothing references `sds-api-mgmt`, `ss-<env>-network-rg`, `data_client_id`, `local.env` | Every block uses the cath locals and the alias | Local: `grep -nE "sds-api-mgmt|ss-.*network-rg|data_client_id|local\.env\b" infrastructure/apim-testing-support.tf` returns nothing. |
| Existing product, logger and Key Vault data sources reused | `module.apim_product[0]`, `azurerm_api_management_logger.apim[0]`; no new data sources or access policies | Local: review diff; `terraform plan` shows no new `data`/logger/product. |
| `deploy_apim_testing_support` true only for aat, demo, perftest, explicit allowlist | `env-config.tf` local | Local: `terraform console` with `-var env=aat/demo/perftest/ithc/prod` (needs init). CI plan shows resources in the three envs. |
| `cnp-module-api-mgmt-api` registers `cath-testing-support-api` at `cath/testing-support` under `cath` product | Module block | Plan output (CI). Deployed: `az apim api show` in stg shows name/path, product membership. |
| Passthrough API-level policy applied | `module.apim_api_testing_support_policy` with the passthrough XML | Plan (CI); deployed: view API policy in APIM. |
| Four operation policies from `resources/testing-support/operation-policies/` with inline `validate-azure-ad-token` (same as `cath-api`, no role claim) | `for_each` resource over the `templatefile()`-rendered local; each XML has `validate-azure-ad-token`, `cors`, `return-response`. No `depends_on` | Local: `validate` and `fmt`. Plan: 4 instances keyed by the four operationIds. Apply proves operationId matching and that APIM accepts the policy XML, so only verifiable on a real apply. |
| Existing `cath-api` unchanged; aat plan shows only new resources | Purely additive, no edits to existing files except one local | CI aat plan comment on the PR. The only new resources are the testing-support set. Cannot be confirmed locally (plan needs Azure credentials and state). |
| Diagnostics use `azurerm_api_management_logger.apim` | `api_management_logger_id` reference | Local review, CI plan. |
| stg: `GET /cath/testing-support/third-party` with a valid token returns 200 "Successful health check." | Operation policy | **Deployed aat/stg only.** `curl -H "Authorization: Bearer <token>" https://<cft-apim-stg host>/cath/testing-support/third-party`. Needs a real token for audience `cath-service-api-client-id` (scope `api://<client-id>/.default`) from the cath tenant. Cannot be tested locally. |
| Each operation returns 401 with no token or an invalid one | `validate-azure-ad-token` (`failed-validation-httpcode="401"`) | **Deployed only.** curl all four methods/paths with no header and with a garbage bearer token. Also try a validly signed token for a different audience (expect 401). |
| `terraform plan` for ithc shows no testing-support resources | Gate false (`apim_suffix = null`) | Local `terraform console` for the gate; manual plan with `env=ithc` if state access allows. CI does not plan ithc. |

Honest limits: nothing about APIM runtime behaviour (200/401, routing between `cath` and `cath/testing-support`, swagger import, whether APIM accepts the policy XML) can be verified locally. `fmt`, `validate`, and gate evaluation are the only local checks. The aat PR plan and the post-merge apply, followed by curl in stg, are the real verification. Whether a real token for `cath-service-api-client-id` is accepted can only be shown against the deployed policies in aat, with a token obtained from the cath tenant.

## 5. Open Questions

### CLARIFICATIONS NEEDED

Closed, no action needed: the #619 hand-off and the fragment name (the fragment was dropped), the token-validation approach and the role check (closed: inline `validate-azure-ad-token` without the role claim, accepting any valid token for the `cath-service-api-client-id` audience), `<base />` placement (pip's order, after `return-response`, so the product rate limit is not applied) and CORS (kept from pip).

1. **Swagger scope.** Plan uses a trimmed swagger (3.0.3, no `servers`, `listType` as a plain string, no 403) instead of copying pip's file. pip's file documents a pip contract (`metadata`/`payload`/`file`, PUT/DELETE) that does not match cath's current push (`json`/`pdf`/`file`, POST only, in `libs/legacy-third-party-fulfilment/src/push/http-client.ts`). Should the swagger describe pip's contract (as the ticket's operation list implies) or cath's current push? The mock returns 200 regardless, so either works at runtime.

2. **Ticket-vs-repo mismatches to correct in the ticket or PR description:**
   - The ticket's `locals { ... }` snippet for `env-config.tf` should go inside the existing single `locals` block.
   - ithc is parked in CI (`workflow.main.yml` and `workflow.preview.yml` plan only aat, demo, perftest), so the "terraform plan for ithc" criterion can only be checked manually.
   - `servers` must be omitted from the swagger (not mentioned in the ticket; see finding 2).
   - The ticket's mapping table does not note that the `cath` product policy (rate limit) is not applied to these operations, because `<base />` follows `<return-response>` as in pip.
   - The ticket says the operation policies "use the `cath-jwt-validation` fragment from #619", lists "Dependencies: #619", says each policy "starts with `<include-fragment>`", and says there are "no placeholders so `file()`". None of this matches the implementation: each policy validates inline with `validate-azure-ad-token` (same as `cath-api` minus the role claim) and is rendered with `templatefile()` (`${tenant_id}`, `${client_id}`). The ticket text should be corrected.

3. **`swagger_url = file(...)`.** Not wrong: `apim.tf` already passes inline content to `swagger_url` and says it is accepted. The module source could not be read locally, so confirm on the first PR plan/apply. No other doubt.
