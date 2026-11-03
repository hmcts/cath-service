# #1095: PROD: create app registrations / service principals for GitHub Actions deploy and Terraform

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-09-29T11:14:15Z
**Updated:** 2026-10-20T16:00:43Z

## Description

Part of #1094.

## User Story

As a developer, I want the Azure identities GitHub Actions needs for PROD, so that the pipeline can run Terraform against the PROD subscriptions and Helm-deploy into the PROD AKS clusters.

## Background

Non-prod uses service-principal JSON secrets named `AZURE_CREDENTIALS_CFT_<ENV>` (`AZURE_CREDENTIALS_CFT_AAT`, `_DEMO`, `_PERFTEST`, `_ITHC`, `_PREVIEW`):
- `job.helm-deploy.yml` selects `secrets[format('AZURE_CREDENTIALS_CFT_{0}', inputs.environment)]` and logs into `cft-<env>-00-aks` with `admin: 'true'`
- `stage.infrastructure.yml` / `job.terraform.yml` run every non-prod Terraform leg as `AZURE_CREDENTIALS_CFT_PREVIEW`

The PROD identity should be created the same way as the existing CFT deploy app registration (client ID `eb2692c3-2f7d-408f-8e58-d83ee57c83c2`), with PROD scopes.

`AZURE_CLIENT_ID` / `AZURE_TENANT_ID` (OIDC, the `DTS Shared GitHub Actions ACR Publisher 1` entry in `hmcts/azure-github-federation-config`) already give AcrPush/AcrPull on `hmctsprod`. They need no change for PROD.

## What is needed

**1. Deploy identity → secret `AZURE_CREDENTIALS_CFT_PROD`**
- AKS cluster admin (`Azure Kubernetes Service Cluster Admin Role`) on `cft-prod-00-aks` and `cft-prod-01-aks` (`DCD-CFTAPPS-PROD`)
- `Private DNS Zone Contributor` on the PROD private zone in `core-infra-intsvc-rg` (`DTS-CFTPTL-INTSVC`), for the "Register DNS" step
- Read on the `cath-prod` key vault if `helm-deploy` reads secrets there

**2. Terraform identity**, either a separate secret (e.g. `AZURE_CREDENTIALS_CFT_PROD_TERRAFORM`) or the same principal:
- `Contributor` on the cath resource groups in `DCD-CNP-PROD`, or on the subscription if Platform Operations prefers
- Network read on the PROD vnets/subnets in `DCD-CFTAPPS-PROD`, for the Postgres/Redis private endpoints (`azurerm.postgres_network` provider in `infrastructure/main.tf`)
- Access to the PROD Terraform state store (`mgmtstatestoreprod` / `mgmt-state-store-prod`) for `state-store-init` and the backend
- Key Vault access sufficient for Terraform to manage the `cath-prod`, `cath-bootstrap-prod` and `cath-tp-prod` vaults

**Who:** Platform Operations. The request goes through their usual channel. It's out of band and can't be done from this repo.

**Alternative worth raising with Platform Operations:** OIDC federated credentials via a PR to `hmcts/azure-github-federation-config`, with the subject restricted to `repo:hmcts/cath-service:ref:refs/heads/master`. This avoids a long-lived secret for the most privileged identity in the repo. `cnp-githubactions-library` ships `helm-deploy-openid` / `terraform-deploy-openid`. If adopted, #1099 changes accordingly.

## Acceptance Criteria

- [ ] PROD deploy identity created with the scopes above, and `AZURE_CREDENTIALS_CFT_PROD` added as a repository secret
- [ ] PROD Terraform identity created (or the deploy identity granted the Terraform scopes), and its secret added
- [ ] Secret(s) added only by an admin. Values are never pasted into issues, PRs or logs
- [ ] `az login` with each credential works, and `az aks get-credentials --admin` succeeds for `cft-prod-00-aks`. Verified by a one-off `workflow_dispatch` or by Platform Operations
- [ ] Credential expiry date recorded, with an owner for rotation

## Out of Scope

- Using the identities: #1096 (Terraform), #1099 (deploy workflow)

## Comments

### Comment by junaidiqbalmoj on 2026-10-20T16:00:43Z
Ticket has been created with PlatOps: https://hmcts.atlassian.net/browse/DTSPO-35946

