# #624: Configure Crime Portal OIDC Federated Identity for cath-service

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-05-14T13:15:39Z
**Updated:** 2026-10-15T14:46:02Z

## Description

## Overview

cath-service needs to authenticate with the Crime Portal (CP) using OIDC Workload Identity Federation rather than storing static credentials. This story creates the federated identity credentials on the Crime Portal managed identity, following the pattern from [pip-shared-infrastructures](https://github.com/hmcts/pip-shared-infrastructures/blob/master/tf-crime-connection-mi.tf).

Federated identity federation means no client secrets need to be stored or rotated — workloads authenticate using short-lived OIDC tokens exchanged at runtime.

---

## Background

pip-shared-infrastructures creates `azurerm_federated_identity_credential` resources on the Crime Portal user-assigned managed identity (`${product}-cp-${env}-mi`). The OIDC configuration (issuer URLs, subjects, connection names) is stored as a JSON secret in a Crime Portal Key Vault (`module.kv_cp`) and decoded at Terraform plan time. Multiple federated credentials can be created from the JSON config using `count` iteration.

cath-service needs an equivalent setup using:
- The cath Crime Portal managed identity: `cath-cp-${env}-mi` (in `managed-identities-${env}-rg`)
- An OIDC JSON config secret stored in the cath Crime Portal Key Vault
- Federated credentials named `cath-${env}-crime-federated-credential-${name}`

---

## Prerequisites

- The Crime Portal Key Vault (`module.kv_cp`) must exist — this is covered by the third-party KV story
- The `cath-cp-${env}-mi` managed identity must be provisioned in `managed-identities-${env}-rg` (coordinated with Crime Portal team)
- The `crime-oidc-config` JSON secret must be added to the Crime Portal KV with connection details provided by the Crime Portal team. Format:
```json
{
  "connections": [
    {
      "name": "connection-1",
      "issuer": "https://...",
      "subject": "system:serviceaccount:..."
    }
  ]
}
```

---

## New Terraform File: `infrastructure/tf-crime-connection-mi.tf`

```hcl
locals {
  mi_resource_group_name = "managed-identities-${var.env}-rg"
  crime_oidc_json_config = jsondecode(data.azurerm_key_vault_secret.crime_oidc_config.value)
}

data "azurerm_key_vault_secret" "crime_oidc_config" {
  name         = "crime-oidc-config"
  key_vault_id = module.kv_cp.key_vault_id
}

data "azurerm_user_assigned_identity" "app_cp_mi" {
  name                = "cath-cp-${var.env}-mi"
  resource_group_name = local.mi_resource_group_name

  depends_on = [module.kv_cp]
}

resource "azurerm_federated_identity_credential" "cath_crime_federated_connection" {
  count = length(local.crime_oidc_json_config.connections)

  name                = sensitive("cath-${var.env}-crime-federated-credential-${local.crime_oidc_json_config.connections[count.index].name}")
  resource_group_name = local.mi_resource_group_name
  audience            = ["api://AzureADTokenExchange"]
  issuer              = sensitive(local.crime_oidc_json_config.connections[count.index].issuer)
  parent_id           = data.azurerm_user_assigned_identity.app_cp_mi.id
  subject             = sensitive(local.crime_oidc_json_config.connections[count.index].subject)
}
```

---

## Coordination Required

- Crime Portal team must provision the `cath-cp-${env}-mi` managed identity in `managed-identities-${env}-rg` for each environment
- Crime Portal team must provide OIDC connection details (issuer URL, subject claim) to populate the `crime-oidc-config` KV secret
- All credential names, issuer URLs and subject claims are marked `sensitive()` to prevent exposure in Terraform output/logs

---

## Acceptance Criteria

- [ ] `infrastructure/tf-crime-connection-mi.tf` exists with federated identity credential resources
- [ ] OIDC config is read from `crime-oidc-config` secret in the Crime Portal KV — not hardcoded
- [ ] Federated credentials are named `cath-${env}-crime-federated-credential-${name}`
- [ ] All sensitive values (name, issuer, subject) use `sensitive()` wrapper
- [ ] Multiple connections supported via `count` iteration over the JSON config
- [ ] `cath-cp-${env}-mi` managed identity exists in `managed-identities-${env}-rg` before `terraform apply`
- [ ] `crime-oidc-config` secret is populated in the Crime Portal KV before `terraform apply`
- [ ] `terraform plan` runs cleanly after prerequisites are met
- [ ] cath-service can authenticate with Crime Portal using workload identity federation (no static credentials)

## References

- [pip-shared-infrastructures tf-crime-connection-mi.tf](https://github.com/hmcts/pip-shared-infrastructures/blob/master/tf-crime-connection-mi.tf)
- [Azure Workload Identity Federation docs](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation)

## Comments

No comments on this issue.
