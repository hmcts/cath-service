# #1019: Provision and deploy to Demo, ITHC and Perftest environments (CNP)

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-09-09T10:08:21Z
**Updated:** 2026-09-09T11:27:23Z

## Description

## User Story

As a developer, I want the Demo, ITHC and Perftest environments provisioned and wired to their own deploy workflows, so that pushing to those branches deploys the already-promoted images to the correct CNP environment.

## Background

This is the CNP (CFT) replacement for #583, #584 and the multi-environment half of #581, all written against SDS (`test` environment, `AZURE_CREDENTIALS_SDS_*`). Raised as a new ticket so the SDS estimates on those remain intact.

Infrastructure and workflow are combined here deliberately: the Azure resources and credentials exist only to let the deploy workflows run, and a workflow ticket cannot be completed or demonstrated without them. They are split into two phases below so partial progress is still visible.

Today only two deploy paths exist:

- `workflow.main.yml` — `master` → aat
- `workflow.preview.yml` — pull requests → per-PR preview

Note the SDS `test` environment has no CNP equivalent — `perftest` replaces it.

---

## Phase 1 — Infrastructure

Terraform under `infrastructure/` provisions the `cath-{env}` application Key Vault, PostgreSQL, Redis, storage account and Application Insights, plus `cath-bootstrap-{env}` (added in #998).

Several acceptance criteria carried by #583/#581 are **already delivered** and are deliberately not repeated:

- `infrastructure/state.tf` is already fully parameterised — `backend "azurerm" {}`, nothing hardcoded
- `infrastructure/keyvault-bootstrap.tf` exists and `cath-bootstrap-aat` is live
- `job.terraform.yml` already accepts `environment`, `storage-account` and state-container inputs

The real gap is that Terraform only ever runs for one environment: `stage.infrastructure.yml` hardcodes `environment: aat`.

- [ ] Terraform runs for `demo`, `ithc` and `perftest` as well as `aat` — `stage.infrastructure.yml` no longer hardcodes a single environment
- [ ] Terraform state separated per environment (`job.terraform.yml` already supports a state-container override)
- [ ] Per-environment Azure resources provisioned for demo, ithc and perftest:
  - application Key Vault `cath-{env}`
  - bootstrap Key Vault `cath-bootstrap-{env}`
  - PostgreSQL flexible server, Redis, storage account `cathsa{env}`, Application Insights
  - `cath` managed identity, matching `aadIdentityName: cath` in the Helm values
- [ ] GitHub repository secrets added, following the existing CNP naming (`AZURE_CREDENTIALS_CFT_AAT`, `AZURE_CREDENTIALS_CFT_PREVIEW` in `job.helm-deploy.yml`):
  - `AZURE_CREDENTIALS_CFT_DEMO`
  - `AZURE_CREDENTIALS_CFT_ITHC`
  - `AZURE_CREDENTIALS_CFT_PERFTEST`
- [ ] Each new `cath-bootstrap-{env}` seeded with the secrets the apps mount — every `name:` under `keyVaults.cath.secrets` in `apps/web/helm/values.yaml` and `apps/api/helm/values.yaml`, including `session-secret`, the `sso-*` set, `cft-idam-client-secret`, `cath-service-api-client-{id,secret,scope}`, the `b2c-*` set, `govuk-notify-api-key`, `xhibit-s3-*` and `courtel-*`
- [ ] Key Vault access policies grant the `cath` workload identity read access in each environment, matching the vault-wide pattern in `infrastructure/keyvault.tf`
- [ ] `terraform plan` clean and `apply` succeeds for each new environment

---

## Phase 2 — Deploy workflows

`job.helm-deploy.yml` is written for exactly two environments. It has `if: inputs.environment == 'preview'` / `== 'aat'` guarded steps and derives cluster and resource group as `cft-aat-00` / `cft-preview-00`. CNP provides `00` and `01` clusters for demo, ithc and perftest (`cnp-flux-config/clusters/{demo,ithc,perftest}`), so this needs generalising rather than copying.

- [ ] `workflow.demo.yml`, `workflow.ithc.yml` and `workflow.perftest.yml` created, each triggering on push to its matching branch
- [ ] Each workflow skips the build stage entirely and deploys the image tag promoted by the master build — no rebuild
- [ ] Each calls `stage.deploy.yml` then `stage.smoke-test.yml`, as `workflow.main.yml` does
- [ ] `job.helm-deploy.yml` generalised to support demo, ithc and perftest:
  - cluster and resource group derived from the environment rather than the current two-way `aat`/`preview` conditional
  - correct `AZURE_CREDENTIALS_CFT_{DEMO,ITHC,PERFTEST}` secret selected per environment
  - `global-environment` set to the target environment, so the `cath-{env}` Key Vault is mounted
- [ ] A values template exists per environment, or `values.template.yaml` is generalised — it currently hardcodes `.aat.platform.hmcts.net` in `ingressHost` and `BASE_URL` for the release-scoped hosts
- [ ] `ENABLE_TEST_SUPPORT` is `false` for demo (production-like) and `true` for ithc and perftest
- [ ] Ingress hosts resolve per environment:
  - demo: `cath-web.demo.platform.hmcts.net`, `cath-api.demo.platform.hmcts.net`
  - ithc: `cath-web.ithc.platform.hmcts.net`, `cath-api.ithc.platform.hmcts.net`
  - perftest: `cath-web.perftest.platform.hmcts.net`, `cath-api.perftest.platform.hmcts.net`
- [ ] A deploy to each new environment completes and smoke tests pass

## Dependencies

- Flux overlays (#566) must be in place so Flux can receive the deployment

## Out of Scope

- Creating the branches and syncing them from master — #1020
- DNS — #1021
- E2E on the new environments
- `prod` infrastructure and deployment
- APIM (#359, #619, #620, #622)

## Supersedes

Replaces #583, #584 and the multi-environment portion of #581 for CNP. Those remain open for their SDS story points. #1018 was merged into this ticket.

## Comments

No comments on this issue.
