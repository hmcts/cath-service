# #359: Create Azure API Management (APIM) Infrastructure - Technical Plan

TEMPLATE SOURCE: n/a

This is infrastructure and registration work only. No pages, templates, controllers or Prisma schema changes.

## 1. Technical Approach

### Strategy

Publish `apps/api` through the existing **CFT APIM instance** for each environment (`cft-api-mgmt-stg` for aat, `cft-api-mgmt-demo`, `cft-api-mgmt-test` for perftest). We do not create an APIM instance. We own a product, an API, an API policy, a logger and an API diagnostic inside the platform-owned instance, all declared in this repo's `infrastructure/` root module and applied by the existing GitHub Actions pipeline (`stage.infrastructure.yml` -> `job.terraform.yml` -> `cnp-githubactions-library/terraform-deploy.yaml`).

Request flow:

```
Source system (SNL / CP / CP_CATH / PDDA)
   | Authorization: Bearer <Entra ID token, aud = cath-service-api-client-id, roles ∋ api.publisher.user>
   v
https://cft-api-mgmt.<env>.platform.hmcts.net/cath/v1/publication
   | APIM inbound: validate-azure-ad-token -> rate-limit-by-key(azp/appid)
   | (401 JSON returned here on failure - never reaches backend)
   v  APIM swaps the supplier token for its own (cached client-credentials token)
https://cath-api.<env>.platform.hmcts.net/v1/publication
   | oauth-middleware.ts re-validates the same token and role (defence in depth)
   v
apps/api
```

### Architecture decisions

| Decision | Choice | Why |
|---|---|---|
| APIM instance | Platform-owned `cft-api-mgmt-<suffix>` | Ticket requirement. Confirmed as the pattern used by `hmcts/fact-data-api` and `hmcts/blob-router-service`. |
| Provider | New `azurerm.cftapps` alias on `var.aks_subscription_id` | `var.aks_subscription_id` is already DCD-CFTAPPS-STG/DEMO/TEST per `stage.infrastructure.yml`, which matches the `cft_subscription_id` values in fact-data-api's tfvars. Do not reuse `azurerm.postgres_network`; its name describes networking. |
| Module source | `git::https://github.com/hmcts/cnp-module-api-mgmt-*?ref=master` | The repo uses `git::https` (see `keyvault.tf`). Reference repos use `git@github.com:` SSH, which the GitHub runner may not be able to clone. None of the three modules publish tags, so `master` is the only ref available (see Open questions). |
| Token handling | Token exchange, as in pip-data-management (agreed in the HLD). | Suppliers only talk to APIM; the backend only sees APIM's token. |
| JWT policy | `validate-azure-ad-token` (not `validate-jwt`) | The backend accepts both v1 (`sts.windows.net`) and v2 (`login.microsoftonline.com/.../v2.0`) issuers. `validate-jwt` with only the v2 `openid-config` URL would reject v1 tokens that the backend accepts. `validate-azure-ad-token` accepts both, and fact-data-api uses it on the same CFT APIM. |
| Policy templating | `templatefile()` | Fails at plan time if a placeholder is missing. `replace()` does not. Minor deviation from the ticket's wording. |
| Spec import | Inline `openapi+json`, built at plan time from `docs/api/openapi.yaml` with paths filtered to the exposed allow-list | See the "Spec import" section below. This deviates from the ticket's `openapi+json-link`, and the AC wording needs agreeing. |
| Env gating | Add `apim_suffix` to the existing `env_config` map in `env-config.tf`. `deploy_apim = local.apim_suffix != null` | This is the documented purpose of that map ("only the settings that genuinely differ"). A null entry for ithc expresses "no APIM" in the same place as the other per-env facts. It avoids a second lookup scheme, as the ticket asks. |
| Diagnostics file | `infrastructure/apim-logger.tf` | The ticket uses both `tf-apim-logger.tf` and `apim-logger.tf`. No file in `infrastructure/` uses a `tf-` prefix (`appinsights.tf`, `keyvault.tf`, `redis.tf`), so use `apim-logger.tf`. |

### Spec import

The ticket asks for `content_format = "openapi+json-link"` against the published URL. Checking the repo and the live spec shows three problems with that:

1. **It cannot filter operations.** A link import brings in every path: `/`, `/health*`, `/locations` and the session-cookie download routes. The ticket says health must not be exposed, and the download routes use `session` (cookie) auth, so they cannot work through a JWT-gated gateway.
2. **Spec changes produce no Terraform diff.** `content_value` would be a constant URL, so APIM silently drifts from the spec until someone forces a replacement.
3. **The published spec is already out of sync with the repo.** `https://hmcts.github.io/cnp-api-docs/specs/cath-service.json` currently lists a `/publication` path and describes "`POST /publication` (also served at `POST /v1/publication`)". `docs/api/openapi.yaml` on master has only `/v1/publication`. There is also an ordering race: `publish-openapi` and `infrastructure-stage` run in parallel in `workflow.main.yml`, so a link import can read the previous spec.

**Chosen approach:** `yamldecode(file("${path.module}/../docs/api/openapi.yaml"))`, keep only the allow-listed paths, drop `servers`, `jsonencode` the result, and pass it as `content_format = "openapi+json"`. The module's `swagger_url` variable is passed straight to `import.content_value`, so it accepts inline content. fact-data-api does the same with a `data "http"` body. I tested this locally with Terraform 1.15.8: it parses the current spec and filtering to `/v1/publication` produces valid JSON.

- `docs/api/openapi.yaml` remains the single source. No copy is added under `infrastructure/`.
- When the spec changes, the plan shows an in-place update to `azurerm_api_management_api`.
- For spec-only changes to reach APIM, add `docs/api/openapi\.yaml` to the `detect-infra-changes` regex in `workflow.main.yml` and `workflow.preview.yml`. Today `^(infrastructure/|\.github/workflows/)` and `^infrastructure/` do not match it.
- Dropping `servers` stops the import from setting the backend to the first `servers` entry and fighting `service_url`.

**Fallback:** if the "imported from the published `cath-service.json`" AC must be met literally, use `data "http"` on the published URL with the same filter (fact-data-api pattern). This adds the `hashicorp/http` provider and keeps the ordering race. See Clarifications.

### Key considerations

- **RBAC.** The CI service principal behind `AZURE_CREDENTIALS_CFT_PREVIEW` needs API Management Service Contributor (or `Microsoft.ApiManagement/service/{apis,products,loggers,...}/write`) on each `cft-api-mgmt-*` instance. Without it every apply gets a 403, as happened with the App Insights action group (`appinsights.tf`).
- **Plan blast radius.** Every APIM resource has a count gate, so ithc, which is parked, and any unknown env plan zero APIM resources.
- **Personal data.** Publication payloads contain personal data. With `body_bytes = 8192`, request bodies go into `cath-appinsights-<env>`. That is accepted for non-prod only.

## 2. Implementation Details

### File structure

```
infrastructure/
├── env-config.tf                          # CHANGED: apim_suffix in env_config, apim_* locals
├── main.tf                                # unchanged
├── apim.tf                                # NEW: product, API, policy
├── apim-logger.tf                         # NEW: logger + API diagnostic
├── apim-operation.tf                      # NEW: per-operation policies from resources/operation-policies/
├── data.tf                                # NEW: APIM instance and key vault secret data sources
├── provider.tf                            # NEW: azurerm.cftapps alias
├── keyvault-access.tf                     # NEW: APIM managed identity Get on the cath key vault
└── resources/
    └── api-policy/
        └── api-policy.xml                 # NEW: inbound/outbound policy template
docs/api/openapi.yaml                      # CHANGED: APIM servers entry, APIM 401 response
.github/workflows/workflow.main.yml        # CHANGED: detect-infra-changes regex includes docs/api/openapi.yaml
.github/workflows/workflow.preview.yml     # CHANGED: same
apps/api/helm/values.yaml                  # unchanged
```

### `infrastructure/env-config.tf` (additions)

Every map entry must carry the same attributes, as the file's comment says.

```hcl
    # apim_suffix names the CFT APIM instance (cft-api-mgmt-<suffix>). CFT uses
    # platform names, not ours: aat's instance is -stg and perftest's is -test.
    # null means no APIM for that environment. ithc is parked.
    aat      = { subnet_suffix = "expanded", core_infra_subscription_id = null, environment_tag = null, apim_suffix = "stg" }
    demo     = { subnet_suffix = null, core_infra_subscription_id = null, environment_tag = null, apim_suffix = "demo" }
    ithc     = { subnet_suffix = null, core_infra_subscription_id = "7a4e3bd5-...", environment_tag = null, apim_suffix = null }
    perftest = { subnet_suffix = null, core_infra_subscription_id = "7a4e3bd5-...", environment_tag = "testing", apim_suffix = "test" }
```

```hcl
  # CFT APIM lives in the CFTAPPS subscription (var.aks_subscription_id). The
  # instance takes the platform suffix, but its resource group is named after
  # OUR env (cft-aat-network-rg, not cft-stg-network-rg), as used by
  # hmcts/fact-data-api and hmcts/blob-router-service.
  apim_suffix = try(local.env_config[var.env].apim_suffix, null)
  deploy_apim = local.apim_suffix != null
  apim_name   = "cft-api-mgmt-${coalesce(local.apim_suffix, var.env)}"
  apim_rg     = "cft-${var.env}-network-rg"

  # Exposed through APIM. Health and session-cookie routes are never listed.
  apim_exposed_paths = ["/v1/publication"]
```

### `infrastructure/apim.tf`

```hcl
provider "azurerm" {
  alias           = "cftapps"
  subscription_id = var.aks_subscription_id
  features {}
}

# Both secrets already exist in cath-<env>, created outside Terraform. They are
# the same values apps/api mounts as AZURE_TENANT_ID and
# CATH_SERVICE_API_CLIENT_ID, so APIM and the backend validate the same tenant
# and audience.
data "azurerm_key_vault_secret" "apim_tenant_id" {
  count        = local.deploy_apim ? 1 : 0
  name         = "app-tenant-id"
  key_vault_id = module.key_vault.key_vault_id
}

data "azurerm_key_vault_secret" "apim_audience" {
  count        = local.deploy_apim ? 1 : 0
  name         = "cath-service-api-client-id"
  key_vault_id = module.key_vault.key_vault_id
}

locals {
  openapi_spec = yamldecode(file("${path.module}/../docs/api/openapi.yaml"))

  # servers is dropped so the import cannot override service_url.
  apim_openapi = jsonencode(merge(local.openapi_spec, {
    servers = []
    paths   = { for path, ops in local.openapi_spec.paths : path => ops if contains(local.apim_exposed_paths, path) }
  }))
}

module "apim_product" {
  count  = local.deploy_apim ? 1 : 0
  source = "git::https://github.com/hmcts/cnp-module-api-mgmt-product?ref=master"

  api_mgmt_name         = local.apim_name
  api_mgmt_rg           = local.apim_rg
  name                  = "cath"   # module sets display_name = name; "CaTH" is not settable
  approval_required     = false
  subscription_required = false     # see Clarifications Q2

  providers = { azurerm = azurerm.cftapps }
}

module "apim_api" {
  count  = local.deploy_apim ? 1 : 0
  source = "git::https://github.com/hmcts/cnp-module-api-mgmt-api?ref=master"

  api_mgmt_name         = local.apim_name
  api_mgmt_rg           = local.apim_rg
  name                  = "cath-api"
  display_name          = "CaTH API"
  path                  = "cath"
  revision              = "1"
  protocols             = ["https"]
  service_url           = "https://cath-api.${var.env}.platform.hmcts.net"
  product_id            = module.apim_product[0].product_id
  content_format        = "openapi+json"
  swagger_url           = local.apim_openapi   # passed to import.content_value, inline content
  subscription_required = false                # module default is true; must match the product

  providers = { azurerm = azurerm.cftapps }
}

module "apim_api_policy" {
  count  = local.deploy_apim ? 1 : 0
  source = "git::https://github.com/hmcts/cnp-module-api-mgmt-api-policy?ref=master"

  api_mgmt_name = local.apim_name
  api_mgmt_rg   = local.apim_rg
  api_name      = module.apim_api[0].name
  api_policy_xml_content = templatefile("${path.module}/resources/api-policy/api-policy.xml", {
    tenant_id = data.azurerm_key_vault_secret.apim_tenant_id[0].value
    audience  = data.azurerm_key_vault_secret.apim_audience[0].value
  })

  providers = { azurerm = azurerm.cftapps }
}
```

### `infrastructure/resources/api-policy/api-policy.xml`

The policy follows `pip-data-management/infrastructure/resources/api-policy/api-policy.xml`. See the file for the XML.

- APIM gets a client-credentials token for `cath-service-api-client-id` (secret and scope read from the cath key vault with its managed identity), caches it for 45 minutes and sets it as `Authorization`.
- A backend 401/403 clears the cached token and returns 502.
- The 401 body is APIM's default `{ statusCode, message: "Access denied due to invalid OAuth information" }`, which the backend's own 401 matches.
- `templatefile` interpolates only `${...}` and `%{...}`. Policy expressions use `@(...)` / `@{...}`, so they need no escaping. Do not use C# `$"..."` interpolation in the XML.
- A missing `api.publisher.user` role fails `required-claims`, so APIM returns **401, not 403**. The AC allows this ("rejected at APIM").

### `infrastructure/apim-logger.tf`

The diagnostic copies `pip-data-management/infrastructure/tf-apim-logger.tf`: sampling 25%, `verbose`, `log_client_ip`, W3C, `body_bytes = 8192`, and PIP's per-direction header lists. The logger is our own `cath-appinsights-logger` (pointing at `cath-appinsights-<env>`), because PIP's platform logger `sds-api-mgmt-<env>-logger` does not exist for CaTH. Authorization is never logged; `body_bytes` must be 0 when prod is added.

### `docs/api/openapi.yaml`

- Add a `servers` entry **after** the existing `cath-api` entry, so the direct hostname stays first:
  ```yaml
  - url: https://cft-api-mgmt.{environment}.platform.hmcts.net/cath
    description: >-
      CFT API Management gateway. Validates the bearer token and app role, then calls
      cath-api with its own token. Preferred entry point for upstream source systems.
    variables:
      environment:
        default: aat
        enum: [aat, demo, perftest]
  ```
  The gateway hostnames are confirmed in `hmcts/azure-platform-terraform` (stg, demo, test tfvars) and in fact-data-api's smoke test (`https://cft-api-mgmt.aat.platform.hmcts.net/fact`).
- In `PublicationForbidden`, note that through APIM a missing role is a 401. The shared `PublicationUnauthorised` response already uses the APIM message.
- The `info.description` currently states the cath-api hostname is "the hostname upstream source systems should use". Update it to point at the gateway.
- `job.publish-openapi.yml` needs no change. It runs on every master build and is a no-op when the spec is unchanged.

### `.github/workflows`

- `workflow.main.yml`: `paths: "^(infrastructure/|\\.github/workflows/|docs/api/openapi\\.yaml$)"`
- `workflow.preview.yml`: `paths: "^(infrastructure/|docs/api/openapi\\.yaml$)"`

### API endpoints

No new backend endpoints. Exposed via APIM: `POST https://cft-api-mgmt.<env>.platform.hmcts.net/cath/v1/publication` -> `POST https://cath-api.<env>.platform.hmcts.net/v1/publication`.

### Schema changes

None.

## 3. Error Handling & Edge Cases

| Case | Behaviour / mitigation |
|---|---|
| CI SP lacks APIM rights | Apply fails with 403 on `cft-api-mgmt-*`. This blocks the work. Get PlatOps confirmation before merging. `fail-fast: false` keeps one env's failure from cancelling the others. |
| Wrong RG name | Plan fails with `ResourceGroupNotFound` or `ApiManagementService not found`. The PR plan for all three envs catches this before master. |
| `app-tenant-id` / `cath-service-api-client-id` missing in a vault | The data source fails the plan. Both are mounted by `apps/api/helm/values.yaml`, so they should exist. Verify in cath-aat, cath-demo and cath-perftest. |
| ithc / unknown env | `apim_suffix = null`, so `deploy_apim = false` and every module, data source and resource has `count = 0`. `coalesce` in `apim_name` keeps the local valid. |
| v1 vs v2 access tokens | `validate-azure-ad-token` accepts both issuers, the same as the backend. |
| Valid token, no role | 401 from APIM (required-claims). The backend 403 path is never reached through APIM. |
| Spec changes | The inline import gives an in-place diff on `azurerm_api_management_api`. The workflow regex change means spec-only commits trigger the plan and apply. |
| Exposed path removed from spec | The filtered map is empty, so the import yields an API with no operations. Add a `check` block or precondition that `local.apim_openapi` has at least one path. |
| Security scheme `tokenUrl` contains `{tenantId}` | APIM import generally ignores `securitySchemes`. If the import rejects it, also strip `components.securitySchemes` in the merge. |
| Large uploads (100 MB JSON/flat file) | Diagnostics buffer only 8192 bytes. Confirm the APIM `forward-request` timeout (default 300 s) is enough for the largest PDDA or flat-file upload in aat before onboarding callers. |
| Authorization header logging | Header logging is an allow-list. `Authorization` is never listed, and a code comment says not to add it. |
| Logger name collision | Use `cath-appinsights-logger`. The platform's `cft-api-mgmt-<suffix>-logger` already exists in each instance. |
| Unpinned module refs | `ref=master` on modules without tags means upstream changes can alter plans. Pin to a commit SHA (see Clarifications). |
| Rate limit too tight for bursty publishers | Start permissive (600/min per client). `429` responses are visible in App Insights. Tune once traffic is known. |

## 4. Acceptance Criteria Mapping

| Acceptance criterion | How it is verified |
|---|---|
| PlatOps confirmed instance names and CI SP can manage APIs | Written confirmation (Slack or ticket comment) covering: instance and RG per env, that `cft-api-mgmt-demo` exists, and that the SP has the role. Pre-implementation gate. |
| `terraform plan` clean for aat, demo, perftest in the PR; apply succeeds on master | The PR runs `stage.infrastructure.yml` plan-only for all three (aat plan posted to the PR). The master run applies them. |
| No APIM resources for ithc or other envs | `env_config.ithc.apim_suffix = null`, so count is 0. When ithc is re-enabled, its plan shows zero `module.apim_*` or `azurerm_api_management_*` resources. Unknown envs fall through `try()` to null. |
| `cath` product and `cath-api` API in `cft-api-mgmt-stg`, backend `https://cath-api.aat.platform.hmcts.net` | Check in the portal or with `az apim api show -g cft-aat-network-rg -n cft-api-mgmt-stg --api-id cath-api --query serviceUrl` (subscription DCD-CFTAPPS-STG). |
| API imported from the published spec, no duplicate spec under `infrastructure/` | No spec file is added. The import is built from `docs/api/openapi.yaml`, the same source the published `cath-service.json` comes from. **The AC wording needs agreement** (see Clarifications), or use the `data "http"` fallback. |
| `POST /cath/v1/publication` via APIM with a valid token returns the same as calling the backend directly | Manual curl in aat with a client-credentials token for a test app holding `api.publisher.user`. Send the same body to both URLs and compare status and body. Optionally add a `@nightly` smoke spec later. |
| No or invalid token gives 401 from APIM and never reaches the backend | Curl without a token and with a tampered token: expect 401 with the APIM JSON body. In App Insights the `requests` row has no matching `dependencies` call to `cath-api`, and there is no request in `apps/api` logs. |
| Valid token without the role is rejected | Curl with a token from an app with no role assignment: expect 401 from APIM. |
| Logs in `cath-appinsights-aat` with configured headers and no Authorization | KQL on `requests` where `cloud_RoleName` is the APIM instance: `customDimensions` contain `Request-content-type`, and no `Authorization` key. Sampling is 25%, so send several requests. Name verified: `${var.product}-appinsights-${var.env}` gives `cath-appinsights-aat`. |
| `openapi.yaml` lists the APIM gateway URL and `job.publish-openapi.yml` republishes it | Visible in the PR diff. After merge, `curl https://hmcts.github.io/cnp-api-docs/specs/cath-service.json \| jq '.servers[].url'` includes `cft-api-mgmt`. |

## CLARIFICATIONS NEEDED

### Ticket open questions

1. **Token pass-through vs exchange.** *Resolved: exchange,* as agreed in the HLD and used by pip-data-management. Suppliers must not interact with the backend directly.
2. **Subscription keys.** *Recommendation: not required for now (`subscription_required = false` on both product and API).* SNL, CP and PDDA already manage an Entra client credential, and `azp`/`appid` gives per-consumer tracking and rate limiting. Revocation is by removing the app-role assignment. Revisit if PlatOps mandate keys. Note that the product and API modules each have their own `subscription_required`, and the API module defaults to `true`, so both must be set.
3. **Scope of exposure.** *Recommendation: `POST /v1/publication` only.* Health and `/` are operational. The download routes authorise on the `connect.sid` session cookie, so they cannot work through a JWT-gated gateway. `/locations` is unauthenticated reference data, and no upstream system has asked for it. Adding it later is a one-line change to `apim_exposed_paths`. Note that the APIM policy would then require a JWT for it.
4. **Restrict direct ingress to APIM.** *Recommendation: yes, as a separate story* once all source systems have moved. Until then direct access must stay, and the backend's own JWT check protects it.

### Discrepancies between the ticket and the repo / platform

5. **APIM resource group name is likely wrong in the ticket.** The ticket derives `apim_rg = "cft-${apim_env}-network-rg"`, which gives `cft-stg-network-rg`. fact-data-api and blob-router-service both use `cft-${var.env}-network-rg` with the instance name suffixed separately (`apim_suffix = "stg"` for aat, `"test"` for perftest). So it is `cft-aat-network-rg` with `cft-api-mgmt-stg`, and `cft-perftest-network-rg` with `cft-api-mgmt-test`. The plan uses the reference-repo form. PlatOps should confirm.
6. **Spec import mode.** As written, the ticket (link import) cannot satisfy its own requirement to import only selected operations. It also does not pick up spec changes, and the published spec is currently stale (it lists `/publication`, which is not in `docs/api/openapi.yaml`). The plan uses an inline, filtered import from `docs/api/openapi.yaml`. Agree that this satisfies the "imported from the published spec" AC, or choose the `data "http"` fallback.
7. **`validate-jwt` vs `validate-azure-ad-token`.** With only the v2 openid-config URL, `validate-jwt` would reject the v1-issuer tokens that `oauth-middleware.ts` accepts. The plan uses `validate-azure-ad-token`.
8. **Logged headers.** *Resolved:* follow pip-data-management's header lists.
9. **Product display name.** `cnp-module-api-mgmt-product` hard-codes `display_name = var.name`, so the display name will be `cath`, not "CaTH". Accept this, or declare `azurerm_api_management_product` directly.
10. **"When prod is added it must be 0".** It is ambiguous whether this means `sampling_percentage` or `body_bytes`. The personal-data rationale points to `body_bytes`. The plan applies it to `body_bytes`.
11. **Tenant ID source.** The ticket mentions only `{TENANT_ID}`. The plan reads the `app-tenant-id` secret, the same one the backend uses, rather than `var.tenant_id` / `azurerm_client_config`, so the two cannot diverge.
12. **Module pinning.** None of the three `cnp-module-api-mgmt-*` repos have tags, and the reference repos use `ref=master`. Should we pin to a commit SHA for reproducible plans? Recommendation: yes.
13. **Workflow change not listed in the ticket.** For spec changes to reach APIM, `docs/api/openapi.yaml` must be added to the `detect-infra-changes` regex in `workflow.main.yml` and `workflow.preview.yml`. Confirm this is in scope.
14. **Rate limit value.** The plan uses 600 calls per 60 s per client as a permissive start. The agreed value is needed from the source-system owners.
