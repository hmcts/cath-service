# #1096: PROD: provision cath-service infrastructure with Terraform (CNP)

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-09-29T11:14:35Z
**Updated:** 2026-10-26T16:14:42Z

## Description

Part of #1094. Depends on #1095.

## User Story

As a developer, I want the PROD infrastructure for cath-service provisioned by the same Terraform as the other environments, so that PROD has its own database, cache, storage, key vaults and managed identity.

## Background

`infrastructure/` is a pure function of `var.env`, and `stage.infrastructure.yml` applies it per environment from master using inline `fromJson` lookups. PROD differs from non-prod in several places that are currently hardcoded for non-prod.

## Scope

**Pipeline (`stage.infrastructure.yml`, `workflow.main.yml`, `workflow.preview.yml`)**
- Add `prod` to each lookup: `subscription: DCD-CNP-PROD`, `aks-subscription: DCD-CFTAPPS-PROD`, `storage-account: prod`
- The PROD legs (`state-store-init` and `terraform`) use the PROD Terraform credential from #1095, not `AZURE_CREDENTIALS_CFT_PREVIEW`
- Add `prod` to `environments` in `workflow.main.yml` (apply from master)
- Decide whether PR runs (`workflow.preview.yml`) plan PROD, so that PROD changes are reviewed before they're applied

**Terraform (`infrastructure/`)**
- `env-config.tf`: add a `prod` entry (`subnet_suffix`, `core_infra_subscription_id`, `environment_tag = "production"` if required by the tagging policy)
- `appinsights.tf` / `env-config.tf`: the Log Analytics workspace is hardcoded to `hmcts-nonprod` in subscription `1c4f0704-…`. PROD must use the PROD workspace (`hmcts-prod`, per `terraform-module-log-analytics-workspace-id`)
- `keyvault-bootstrap.tf`: `pip_nonprod_group_object_id` grants the non-prod product group access. PROD needs the PROD group, or no human access, as agreed with Platform Operations
- **Sizing:** `redis.tf` is `sku_name = "Basic"` (no SLA, no replication) and `postgres.tf` has `GP_Standard_D2ds_v4` without HA. Agree PROD sizing (e.g. Redis Standard/Premium, Postgres zone-redundant HA, backup retention, geo-redundant backup), then add it to `env-config.tf`. That's allowed here because PROD genuinely differs
- **Pre-flight:** check the names `cathsaprod`, `cath-prod`, `cath-bootstrap-prod` and `cath-tp-prod` are available, and that there are no soft-deleted, purge-protected vaults holding them. See #1067 for what happens otherwise

## Acceptance Criteria

- [ ] PROD Terraform credential from #1095 available as a repo secret
- [ ] `stage.infrastructure.yml` supports `prod` with PROD subscription, AKS subscription, state store and credential
- [ ] PROD Log Analytics workspace and PROD access group used. Nothing PROD points at a non-prod resource
- [ ] PROD sizing agreed and applied (Redis, Postgres HA/backups)
- [ ] `terraform plan` for prod reviewed, and `apply` succeeds from master
- [ ] `az resource list -g cath-prod -o table` shows the Postgres flexible server, Redis, `cathsaprod`, App Insights, the `cath-prod`, `cath-bootstrap-prod` and `cath-tp-prod` key vaults, and the `cath` managed identity
- [ ] A second master run plans no changes for prod

## Dependencies

- #1095: PROD Terraform identity

## Out of Scope

- Secret values and SSO registrations: #1097
- Deployment: #1099


## Comments

No comments on this issue.
