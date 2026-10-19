# Technical Plan: #624 Configure Crime Portal OIDC Federated Identity for cath-service

TEMPLATE SOURCE: n/a

Infrastructure only. Terraform in `infrastructure/`. No app code, pages, API endpoints, database changes or E2E tests.

## 1. Technical Approach

### What this actually does

The ticket describes the direction the wrong way round. This is **inbound** auth: Crime Portal's `cp-court-list-publishing-service` calls CaTH (through CFT APIM, `/cath/publication`). CaTH does not call Crime Portal. We create a managed identity that Crime Portal's AKS workloads can impersonate through workload identity federation, and give that identity the role our APIM policy needs.

### End-to-end flow

```
CP pod (CP tenant, AKS)                 HMCTS Entra ID tenant                     CFT APIM / cath-api
-----------------------                 ---------------------                     -------------------
1. Projected service account token
   (iss = CP AKS OIDC issuer,
    sub = system:serviceaccount:<ns>:<sa>,
    aud = api://AzureADTokenExchange)
            |
            | 2. Token exchange, ManagedIdentityCredential with
            |    client_id = cath-cp-<env>-mi client ID,
            |    tenant    = HMCTS tenant,
            |    scope     = api://<CaTH API app id>/.default
            v
                                       3. Entra matches iss + sub + aud against a
                                          federated credential on cath-cp-<env>-mi
                                       4. Issues an access token for the MI:
                                          aud = CaTH API app, roles = [api.publisher.user]
                                          (needs the app role assignment)
            |
            | 5. POST https://<cft-apim>/cath/publication, Bearer <token>
            v
                                                                                 6. validate-azure-ad-token: tenant,
                                                                                    audience = ${client_id}, roles claim
                                                                                    api.publisher.user (api-policy.xml)
                                                                                 7. APIM swaps for its own token and
                                                                                    calls cath-api
```

Step 3 needs the federated credentials. Step 4 needs the app role assignment. Without the role assignment the exchange still works, but APIM rejects the token with 401 because `roles` is missing.

### What Crime Portal changes on their side

`AzureIdentityService.java` in `cp-court-list-publishing-service` gets the token with `ManagedIdentityCredential` and these settings:

| Setting | Today (PIP) | After cut-over (CaTH) |
|---|---|---|
| `AZURE_REMOTE_DTS_CLIENTID` | `pip-cp-<env>-mi` client ID | `cath-cp-<env>-mi` client ID (module output `managed_identity_clientid[0]`) |
| `AZURE_REMOTE_DTS_TENANTID` | HMCTS tenant | HMCTS tenant (unchanged) |
| `AZURE_REMOTE_DTS_APPREGISTRATION_ID` | PIP data-management app | CaTH API app ID (`cath-service-api-client-id`) |
| APIM URL | PIP APIM | CFT APIM `.../cath/publication` |

If they stop sending to PIP, this is config only. If they have to send to both PIP and CaTH during a transition, they need a code change.

### Architecture decisions

1. **One PR. Secret read from the bootstrap vault (decided).** `crime-oidc-config` lives in the existing `cath-bootstrap-<env>` vault (read via `module.bootstrap_key_vault.key_vault_id`, not the `depends_on` data source, so the read is never deferred and `count` stays known at plan), like PIP reads `crime-oidc-issuer-config` from its bootstrap vault. That vault already exists, so the plan-time read works. The secret must be populated by hand in **every** environment that plans in CI (aat, demo, perftest) **before merge**, otherwise the PR plan fails.

2. **We create the MI directly. Crime Portal does not, and there is no Crime Portal vault (revised).** The ticket's "Coordination Required" section is wrong: the MI is ours. PIP gets its MI from its `kv_cp` key vault module (`create_managed_identity = true`), but that vault holds secrets shared with CP, and the module gives the MI Get/List on it. CaTH shares no secrets with CP: the OIDC config is in the bootstrap vault and CP only needs non-secret IDs. So `azurerm_user_assigned_identity.app_cp_mi` creates **`cath-cp-<env>-mi` in `managed-identities-<env>-rg`** with the default `azurerm` provider (`var.subscription`, the CNP subscription, the same as the existing `cath-<env>-mi`). This avoids an empty vault, five access policies, and a vault CP could read.

3. **`count` over the connections (decided)**, as the ticket's AC says. `connections` must be treated as append-only (see section 3).

4. **App role assignment done by hand, not in Terraform (revised).** APIM requires the `api.publisher.user` role, so `cath-cp-<env>-mi` must hold it on the CaTH API app. `azuread_app_role_assignment` needs Graph `AppRoleAssignment.ReadWrite.All`, which the CI principal is not expected to hold, and PIP does not do it in Terraform either. A managed identity has no "API permissions" blade, so an Entra admin assigns it through Graph once per environment after the identity exists:

   ```bash
   az rest --method POST \
     --uri "https://graph.microsoft.com/v1.0/servicePrincipals/<cath-cp-<env>-mi principalId>/appRoleAssignments" \
     --body '{"principalId":"<cath-cp-<env>-mi principalId>","resourceId":"<CaTH API service principal objectId>","appRoleId":"<api.publisher.user role id>"}'
   ```

5. **`trimspace()` on issuer and subject (decided).** The real SIT issuer has a trailing space.

### Key considerations

- Environments applied from master: `aat`, `demo`, `perftest` (`workflow.main.yml`). `ithc` is parked until 2026-12-21 (soft-deleted `cath-ithc` vault) and has `apim_suffix = null`. There is no prod deployment in this root module.
- PR plans run for all three environments (`workflow.preview.yml`), so the PR's plan fails until the secret exists in all three bootstrap vaults.
- CP's OIDC config is per CP environment. Today CP has STE, SIT and PRP and they all map to our `aat`. demo and perftest probably have no CP counterpart. Those get `{"connections": []}`.

## 2. Implementation Details

### Manual step (before merge)

For each of aat, demo and perftest, a member of DTS PIP Non-Prod sets `crime-oidc-config` in `cath-bootstrap-<env>`:

```json
{
  "connections": [
    { "name": "1",   "issuer": "https://uksouth.oic.prod-aks.azure.com/e2995d11-.../<id>/", "subject": "system:serviceaccount:<ns>:<sa>" },
    { "name": "SIT", "issuer": "...", "subject": "..." },
    { "name": "PRP", "issuer": "...", "subject": "..." }
  ]
}
```

aat gets CP's values (after the clarifications below). demo and perftest get `{"connections": []}` unless CP supplies values for them. Connection names must be unique and match `^[A-Za-z0-9][A-Za-z0-9_-]*$` so the credential name is valid. Federated credential names are 3-120 characters: alphanumerics, `-` and `_`, starting with an alphanumeric.

### Federated credentials

**Create `infrastructure/tf-crime-connection-mi.tf`** (as the ticket, plus `trimspace()` and the bootstrap vault):

```hcl
locals {
  mi_resource_group_name = "managed-identities-${var.env}-rg"
  crime_oidc_json_config = jsondecode(data.azurerm_key_vault_secret.crime_oidc_config.value)
}

data "azurerm_key_vault_secret" "crime_oidc_config" {
  name         = "crime-oidc-config"
  key_vault_id = module.bootstrap_key_vault.key_vault_id
}

resource "azurerm_user_assigned_identity" "app_cp_mi" {
  name                = "${var.product}-cp-${var.env}-mi"
  resource_group_name = local.mi_resource_group_name
  location            = var.location
  tags                = local.common_tags
}

resource "azurerm_federated_identity_credential" "cath_crime_federated_connection" {
  count = length(local.crime_oidc_json_config.connections)

  name                = sensitive("cath-${var.env}-crime-federated-credential-${local.crime_oidc_json_config.connections[count.index].name}")
  resource_group_name = local.mi_resource_group_name
  audience            = ["api://AzureADTokenExchange"]
  issuer              = sensitive(trimspace(local.crime_oidc_json_config.connections[count.index].issuer))
  parent_id           = azurerm_user_assigned_identity.app_cp_mi.id
  subject             = sensitive(trimspace(local.crime_oidc_json_config.connections[count.index].subject))
}
```

`count` vs `for_each` trade-offs (kept for the record; `count` chosen):

| | `count` | `for_each` on name |
|---|---|---|
| Removing a middle entry | Every later index changes `name`, `issuer` and `subject`. `name` is ForceNew, so those credentials are destroyed and recreated. CP auth for those connections fails briefly, and the plan hides which ones (all sensitive). | Only the removed credential is destroyed. |
| Sensitive values | `count` accepts sensitive-derived values. The name stays fully hidden. | Keys cannot be sensitive. Connection names (`1`, `SIT`, `PRP`) appear in resource addresses in plan output. The `name` argument is still wrapped. Issuer and subject stay hidden. |
| Matches PIP / AC | Yes | No (AC wording needs updating) |

Decision: `count`, with `connections` append-only.

### Not changed

`api-policy.xml`, APIM product/API/operations, app code, Helm charts, `output.tf`. CP needs the MI client ID, but that is not secret and can be read from the portal or `az identity show`. No output is added (YAGNI).

## 3. Error Handling & Edge Cases

| Case | Behaviour | Handling |
|---|---|---|
| `crime-oidc-config` missing in any applied env | Plan fails for that env (`SecretNotFound`) on the PR and on master | Populate all of aat, demo and perftest bootstrap vaults before merge. Use `{"connections": []}` where CP has no environment. |
| Malformed JSON, or `connections` key missing | `jsondecode` / attribute error, plan fails | Deliberately no `try(..., [])`. A silent fallback to empty would destroy every existing credential. Failing the plan is the safe outcome. |
| Trailing or leading whitespace in issuer/subject | Azure stores the value as given, so the exchange fails with AADSTS70021 (no matching federated identity record) | `trimspace()` on issuer and subject. The SIT issuer currently has a trailing space. |
| Issuer trailing slash | `.../<id>/` vs `.../<id>` are different strings to Entra | Do not strip it. Copy it exactly as CP's `iss` claim emits it (AKS issuers end in `/`). |
| Removing or reordering a connection | `count`: shifted credentials are recreated. `for_each`: only the removed one is destroyed. | Keep the list append-only (`count` chosen). |
| Duplicate connection names | `for_each`: plan error (duplicate key). `count`: Azure conflict on create. | Names must be unique. Both fail before anything breaks. |
| Too many connections | Azure limit is 20 federated credentials per managed identity | 3 today. Not enforced in code. |
| Concurrent writes on one MI | Azure rejects parallel federated credential writes on the same identity | azurerm serialises writes per parent identity. If `ConcurrentFederatedIdentityCredentialsWritesForSingleManagedIdentity` appears, re-run the apply. |
| KV name length / uniqueness | Max 24 characters, global | Longest is `cath-cp-perftest` (16). Check that no live or soft-deleted `cath-cp-*` vault exists: `az keyvault list-deleted --query "[?name.starts_with(@,'cath-cp')]"`. |
| App role not assigned after apply | Token exchange works but APIM returns 401 (no `roles` claim) | An Entra admin assigns `api.publisher.user` by hand (decision 4). |
| New MI not yet replicated in Entra | The role assignment can fail with "principal not found" on the first apply | Re-run the apply. |
| `api.publisher.user` missing from the app, or not allowed for applications | `app_role_ids["api.publisher.user"]` errors at plan, or Graph rejects the assignment | Confirm the role exists with `allowedMemberTypes` including `Application`. |
| `deploy_apim = false` (ithc) | Role assignment and SP lookup are skipped (`count = 0`). The vault and MI are still created. | Consistent with APIM. The ithc rollout (#1160) picks it up automatically. |
| Token audience format | APIM checks `${client_id}`. CP requests `api://<app id>/.default`. v1 tokens carry `aud = api://<app id>`. | Same path existing suppliers use, but verify in aat with a real CP token (Testing). |

## 4. Acceptance Criteria Mapping

| AC | How satisfied | Verified by | Manual / out of code |
|---|---|---|---|
| `infrastructure/tf-crime-connection-mi.tf` exists with federated identity credential resources | Created in this PR | PR review, CI plan | |
| OIDC config read from `crime-oidc-config` in the Crime Portal KV, not hardcoded | `data.azurerm_key_vault_secret.crime_oidc_config` on the bootstrap vault (`cath-bootstrap-<env>`) | PR review, plan shows the data read | AC says "Crime Portal KV"; bootstrap vault chosen |
| Credentials named `cath-${env}-crime-federated-credential-${name}` | `name` argument | `az identity federated-credential list --identity-name cath-cp-aat-mi -g managed-identities-aat-rg` after apply | |
| Sensitive values (name, issuer, subject) use `sensitive()` | Wrapped on all three | PR review, plan shows `(sensitive value)` | |
| Multiple connections via `count` iteration | `count = length(...connections)` | Plan shows 3 credentials for aat | |
| `cath-cp-${env}-mi` exists in `managed-identities-${env}-rg` before apply | Created by `azurerm_user_assigned_identity.app_cp_mi` in this PR, not by the CP team | `az identity show -n cath-cp-aat-mi -g managed-identities-aat-rg` after the master apply | |
| `crime-oidc-config` populated before apply | Manual step before merge | `az keyvault secret show --vault-name cath-bootstrap-<env> -n crime-oidc-config --query id` per env | **Manual** |
| `terraform plan` runs cleanly after prerequisites | Secret populated before merge; trimmed input | Green `Terraform aat/demo/perftest` plan jobs on the PR; aat plan comment | |
| "cath-service can authenticate with Crime Portal" | Reworded: **Crime Portal can authenticate to CaTH** (through APIM) with workload identity federation, no static credentials | CP-side test in their STE/SIT: token exchange succeeds, and `POST /cath/publication` through aat APIM returns non-401 | **Manual, needs CP**. Also depends on CP config changes (section 1). |
| (Added) MI has the `api.publisher.user` role | Manual Graph assignment by an Entra admin (decision 4) | Enterprise app > Users and groups shows `cath-cp-aat-mi`, or decoded token `roles` | |

## 5. CLARIFICATIONS NEEDED

1. ~~**`count` vs `for_each`**~~ **Resolved:** `count`, append-only.
2. **Service account subject**: The current subjects are `system:serviceaccount:<ns>:stagingpubhub-service-wildfly-app`, which is the legacy `cpp-context-staging-pubhub`. Which service account does `cp-court-list-publishing-service` run as? A wrong subject means the exchange fails.
3. **Entra permission for the CI principal**: Resolved. The role assignment was removed from Terraform and is assigned by hand (decision 4). Still to confirm: who in Entra makes the assignment for each environment.
4. **PRP issuer in a different tenant** (`77f54315...` vs `e2995d11...` for STE/SIT): Is it right to trust PRP (pre-prod) on our aat (staging) identity, or should PRP federate to a different CaTH environment?
5. **CP environment mapping**: Do demo and perftest have CP counterparts? If not, confirm `{"connections": []}` for those vaults. Which CaTH environment will CP prod target (no prod root here yet)?
6. ~~**Secret location**~~ **Resolved:** bootstrap vault `cath-bootstrap-<env>`, one PR.
7. **`api.publisher.user` on the CaTH API app**: Confirm the role exists with `allowedMemberTypes` including `Application` in each environment's app registration.
8. **Dual sending**: Will CP stop sending to PIP when they point at CaTH (config-only change), or send to both for a period (code change on their side)? This affects their timeline, not this Terraform.
9. **Ticket text**: OK to correct the ticket? The MI is created by our Terraform, not provisioned by CP, and the last AC is inbound (CP to CaTH), not outbound.
