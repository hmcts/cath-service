# #359: Create Azure API Management (APIM) Infrastructure

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-02-12T15:59:45Z
**Updated:** 2026-10-09T15:30:21Z

## Description

## Overview

Publish the CaTH API (`apps/api`, `cath-api.<env>.platform.hmcts.net`) through the **CFT API Management (APIM)** instance, so upstream source systems (SNL, Common Platform, CP_CATH, PDDA) call a single managed gateway rather than the AKS ingress directly.

This replaces the earlier version of this story, which was written for the SDS platform (`sds-api-mgmt-*`, `ss-*-network-rg`, a centrally managed `cath-product-*`, stg/sbox/prod envs). cath-service now runs on **CNP/CFT**, so the APIM instance, subscriptions, environments and product ownership are all different.

---

## Current state (what this story builds on)

| Concern | Today |
|---|---|
| Environments | `aat`, `demo`, `perftest` (`ithc` is provisioned but parked). **No prod.** |
| App resources subscription | `DCD-CNP-DEV` (aat, demo), `DCD-CNP-QA` (ithc, perftest) |
| AKS / CFTAPPS subscription | `DCD-CFTAPPS-STG` (aat), `-DEMO`, `-ITHC`, `-TEST` (perftest) — passed as `var.aks_subscription_id` |
| Terraform | `infrastructure/`, run by GitHub Actions (`stage.infrastructure.yml` → `job.terraform.yml`), not Jenkins |
| Backend | `cath-api.<env>.platform.hmcts.net` (Helm `apps/api`, port 3001) |
| Auth on the backend | `libs/api/src/middleware/oauth-middleware.ts` already validates Azure AD bearer tokens (`AZURE_TENANT_ID`, `CATH_SERVICE_API_CLIENT_ID` from the `cath-<env>` vault) and requires the `api.publisher.user` app role |
| OpenAPI spec | `docs/api/openapi.yaml` (hand-maintained). `yarn openapi:json` converts it; `job.publish-openapi.yml` publishes it to `https://hmcts.github.io/cnp-api-docs/specs/cath-service.json` |
| App Insights | `azurerm_application_insights.shared` in `infrastructure/appinsights.tf` (declared directly, not via the module) |

Nothing in the repo references APIM today.

---

## Target design

### APIM instance

Use the CFT APIM instance for each environment, which lives in the CFTAPPS subscription:

```hcl
locals {
  # CFT APIM uses the platform env names, not ours
  apim_env    = lookup({ aat = "stg", perftest = "test" }, var.env, var.env)
  apim_name   = "cft-api-mgmt-${local.apim_env}"
  apim_rg     = "cft-${local.apim_env}-network-rg"
  deploy_apim = contains(["aat", "demo", "perftest"], var.env)
}
```

APIM resources must use a provider aliased to `var.aks_subscription_id` (the existing `azurerm.postgres_network` alias already points there; add a clearly named `azurerm.cftapps` alias rather than reusing the postgres one).

> **To confirm with PlatOps before implementation:** the instance/RG names above, that `demo` and `perftest` have a CFT APIM instance, and that our CI service principal has **API Management Service Contributor** (or equivalent) on them. Without that role every apply will fail with 403, as happened with the App Insights action group.

### Product

Unlike SDS, CFT has no pre-created CaTH product. We own it:

- `cnp-module-api-mgmt-product` → product `cath` (display name "CaTH"), `approval_required = false`, `subscription_required` — **see open question 2**.

### API

- `cnp-module-api-mgmt-api`
  - `name` = `cath-api`, `display_name` = `CaTH API`, `path` = `cath`
  - `service_url` = `https://cath-api.${var.env}.platform.hmcts.net`
  - `protocols` = `["https"]` only
  - `product_id` = the product above
  - Spec: import from the published spec (`content_format = "openapi+json-link"`, `swagger_url = "https://hmcts.github.io/cnp-api-docs/specs/cath-service.json"`). Do **not** copy the spec into `infrastructure/resources/swagger/` — `docs/api/openapi.yaml` stays the single source.
  - Only operations we mean to expose publicly should be imported — **see open question 3**.

### API policy

`cnp-module-api-mgmt-api-policy` with `infrastructure/resources/api-policy/api-policy.xml`:

- **Inbound:** `validate-jwt` against `https://login.microsoftonline.com/{TENANT_ID}/v2.0/.well-known/openid-configuration`, audience `{CLIENT_ID}` (the `cath-service-api-client-id` secret already in `cath-<env>`), required claim `roles` containing `api.publisher.user`. Return `401` with a JSON body on failure.
- **Forward the caller's token unchanged.** The backend already validates the same token and role, so the pip-data-management client-credentials token exchange is not needed and should not be copied. See open question 1.
- `rate-limit-by-key` on the caller's `appid` claim (value to be agreed; start permissive).
- **Outbound:** pass backend status codes through. No `401/403 → 502` rewrite; masking the backend's auth errors makes caller onboarding harder.
- `{TENANT_ID}` and `{CLIENT_ID}` substituted with `replace()` at plan time. Read the client ID via a `data "azurerm_key_vault_secret"` against `module.key_vault.key_vault_id`, not a new secret.

### Diagnostics

`infrastructure/tf-apim-logger.tf`:

- `azurerm_api_management_logger` using `azurerm_application_insights.shared.connection_string`. No new App Insights instance.
- `azurerm_api_management_api_diagnostic`: sampling `100`, log `x-request-id` and `content-type` headers, body bytes `8192`. All current envs are non-prod. When prod is added it must be `0`, because publication payloads contain personal data.
- Never log the `Authorization` header.

### Operation policies

Add these only if needed. Once `path = "cath"` is stripped, APIM paths map 1:1 to backend paths, so no URI rewrites are expected. Leave out the `tf-apim-operations.tf` fileset loop unless a real per-operation policy turns up.

---

## Files

New:
- `infrastructure/apim.tf` — provider alias, product, API, policy, key-vault data source
- `infrastructure/apim-logger.tf` — logger + diagnostic
- `infrastructure/resources/api-policy/api-policy.xml`

Changed:
- `infrastructure/env-config.tf` — add `apim_env`, `apim_name`, `apim_rg` and `deploy_apim` to the existing locals (don't add a second `main.tf` locals block or a second env-normalisation scheme)
- `docs/api/openapi.yaml` — add an APIM `servers` entry (`https://cft-api-mgmt.<env>.platform.hmcts.net/cath` or the agreed gateway hostname), and document the `401` response shape from APIM
- `apps/api/helm/values.yaml` — no change expected. Only needed if we later restrict ingress to APIM.

All APIM resources gated with `count = local.deploy_apim ? 1 : 0`.

---

## Acceptance criteria

- [ ] PlatOps has confirmed the CFT APIM instance names per environment, and the CI service principal can manage APIs on them
- [ ] `terraform plan` is clean for `aat`, `demo` and `perftest` in the PR, and apply succeeds on master
- [ ] No APIM resources are created for `ithc` or for any environment not in `deploy_apim`
- [ ] A `cath` product and `cath-api` API exist in `cft-api-mgmt-stg`, pointing at `https://cath-api.aat.platform.hmcts.net`
- [ ] The API definition is imported from the published `cath-service.json` spec. No duplicate spec file is added under `infrastructure/`
- [ ] `POST /cath/v1/publication` via APIM in aat with a valid token holding `api.publisher.user` returns the same response as calling the backend directly
- [ ] Calling through APIM without a token, or with an invalid one, returns `401` from APIM and never reaches the backend (confirmed in App Insights)
- [ ] Calling with a valid token that lacks `api.publisher.user` is rejected (at APIM, or `403` from the backend)
- [ ] APIM request logs for the CaTH API appear in `cath-appinsights-aat` with headers per the diagnostic config, and no `Authorization` header is logged
- [ ] `docs/api/openapi.yaml` lists the APIM gateway URL, and `job.publish-openapi.yml` republishes it

---

## Open questions

1. **Token pass-through vs exchange.** The recommendation is pass-through, since the backend already validates the token. Choose exchange only if source systems must hold a token for an *APIM* app registration that is separate from the CaTH API registration. That is extra moving parts and a second client secret to rotate.
2. **Subscription keys.** Should callers also need an APIM subscription key (`Ocp-Apim-Subscription-Key`) on top of the JWT? This helps per-consumer tracking and revocation, but is one more credential for SNL/CP/PDDA to manage.
3. **Scope of exposure.** Publish only `POST /v1/publication`, or also `/locations` and the download endpoints? Health endpoints should not be exposed.
4. **Direct ingress.** Once APIM is live, should `cath-api` ingress be restricted to APIM only? That would be a separate story.

---

## Out of scope

- Prod. There's no prod deployment yet, and the prod APIM wiring will be added with the prod pipeline.
- Restricting direct access to `cath-api` ingress
- Onboarding individual source systems to APIM

## References

- [cnp-module-api-mgmt-product](https://github.com/hmcts/cnp-module-api-mgmt-product)
- [cnp-module-api-mgmt-api](https://github.com/hmcts/cnp-module-api-mgmt-api)
- [cnp-module-api-mgmt-api-policy](https://github.com/hmcts/cnp-module-api-mgmt-api-policy)
- Existing backend auth: `libs/api/src/middleware/oauth-middleware.ts`
- Published spec: https://hmcts.github.io/cnp-api-docs/specs/cath-service.json


## Comments

No comments on this issue.
