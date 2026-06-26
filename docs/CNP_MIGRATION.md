# SDS → CNP Migration

cath-service is currently deployed on SDS clusters. This document covers migrating it to CNP to align with the `expressjs-monorepo-template` reference architecture.

## What's changing

| | SDS (current) | CNP (target) |
|---|---|---|
| Flux repo | `sds-flux-config` | `cnp-flux-config` |
| Environments | `dev`, `stg` | `preview`, `aat` |
| Helm OCI registry | `hmctsprod-oci` | `hmctspublic-oci` |
| Key Vault name | `cath-ss-kv-{env}` | `cath-{env}` |
| Terraform subscriptions | `DTS-SHAREDSERVICES-*` | `DCD-CNP-DEV` / `DCD-CFTAPPS-STG` |
| Terraform state store | `sdsstate{env}` / `jenkins-state-{env}` | CNP defaults (`mgmtstatestore nonprod`) |

Postgres data does not need to be migrated — the CNP Postgres is provisioned fresh and Prisma migrations run on first deploy.

WAF: cath uses the shared platform Application Gateway with no custom rules, so there is nothing to port.

## Pipeline changes

### `stage.infrastructure.yml`

Add an AAT job mirroring the template exactly — no state store overrides needed:

```yaml
terraform-aat:
  name: Terraform AAT
  needs: [terraform-fmt]
  uses: ./.github/workflows/job.terraform.yml
  with:
    environment: aat
    subscription: DCD-CNP-DEV
    aks-subscription: DCD-CFTAPPS-STG
    storage-account: nonprod
    plan-only: ${{ inputs.plan-only }}
  secrets:
    AZURE_CREDENTIALS: ${{ secrets.AZURE_CREDENTIALS_CFT_PREVIEW }}
```

### `workflow.preview.yml`

Temporarily set `plan-only: false` so the AAT Terraform apply runs on the migration PR. Revert to `plan-only: true` once the migration is merged and CNP is live.

This change has already been made on the migration branch.

### GitHub repo secret

Add `AZURE_CREDENTIALS_CFT_PREVIEW` (service principal for `DCD-CNP-DEV`) to the cath-service GitHub repo secrets. See [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md) for how secrets are managed.

## cnp-flux-config

Add `apps/cath/` mirroring the structure of `apps/dtsse/expressjs-monorepo-template/`:

```
apps/cath/
├── aat/
│   ├── base/      ← HelmReleases for api, web, crons, postgres
│   ├── 00/kustomization.yaml
│   └── 01/kustomization.yaml
└── preview/
    └── kustomization.yaml
```

Key differences from the SDS HelmReleases:

- `sourceRef.name`: `hmctsprod-oci` → `hmctspublic-oci`
- Key Vault name: `cath-ss-kv-aat` → `cath-aat`
- Ingress hostname: `cath-web.aat.platform.hmcts.net` (the existing template variable `{{ .Values.global.environment }}` resolves correctly for `aat`)

## SOPS secrets

The SDS SOPS secrets in `sds-flux-config` are encrypted with the SDS key. Rather than decrypting and re-encrypting, regenerate the secrets from scratch and encrypt them with the CNP SOPS key. Commit them under `cnp-flux-config/apps/cath/aat/`.

## DNS cutover

The AAT public hostname currently points at the SDS load balancer.

1. Drop TTL to 60 seconds at least a day before the cutover.
2. Confirm CNP pods are healthy, Key Vault secrets are resolving, and smoke tests pass on the CNP ingress URL.
3. Update the DNS record to point at the CNP load balancer.
4. With a 60s TTL, stale resolver exposure is at most 60 seconds.

## Decommissioning SDS (after CNP stable, ~1 week)

Once CNP has been running cleanly:

1. Remove `sds-flux-config/apps/cath/` — Flux will uninstall the SDS Helm releases.
2. Run `terraform destroy` against the SDS resource groups (`cath-ss-kv-{env}-rg`, `cath-{env}-rg`, `flexible-cath-{env}-rg`, `cath-cache-{env}`). Do this only after confirming all secrets have been migrated.
3. Remove the SDS jobs from `stage.infrastructure.yml`.
4. Remove SDS-specific GitHub secrets (`AZURE_CREDENTIALS_SDS_*`) from the repo.
5. Revert `workflow.preview.yml` `plan-only` back to `true`.

## Rollback

- **Before DNS cut**: SDS is still live. Revert the pipeline env target and redeploy.
- **After DNS cut**: point DNS back at the SDS load balancer (60s TTL = fast recovery). Keep SDS infra live until the decommission window.

---

## Task list

### Infrastructure (bootstrap)
- [x] Add `AZURE_CREDENTIALS_CFT_PREVIEW` secret to the cath-service GitHub repo
- [x] Add `terraform-aat` job to `stage.infrastructure.yml`
- [x] Open migration PR (#731) and run AAT Terraform via the temporary `plan-only: false`
- [x] AAT Terraform: postgres, redis, storage, KV, app insights, managed identity provisioned
- [ ] AAT Terraform: `azurerm_monitor_activity_log_alert` fails with 403 (SP `69aa7255` lacks `Microsoft.Insights/actionGroups/read` on the PTL subscription `1baf5470` for the shared action group). Needs platform ticket to grant that permission — currently the only remaining apply failure.

### Key Vault migration
- [x] Add `infrastructure/keyvault-migration.tf` — grants the CI SP read on `cath-ss-kv-aat` via access policy and copies the 20 app secrets into the new CNP `cath-aat` KV (postgres/redis/storage/app-insights are excluded — those are created by terraform itself).
- [x] Switch helm keyVault refs from `cath-ss-kv` → `cath` in `apps/{web,api,postgres}/helm/values.yaml` and `helm/cath-service/values.template.yaml` (chart resolves to `cath-aat` etc).

### Pipeline rename to CNP env labels
- [x] Rename deploy env labels: `dev` → `preview`, `stg` → `aat` in `workflow.preview.yml`, `workflow.main.yml`, `stage.deploy.yml`, `job.helm-deploy.yml`.
- [x] Repoint Preview deploy: cluster `cft-preview-01-aks` (sub `DCD-CFTAPPS-DEV`, RG `cft-preview-01-rg`), creds `AZURE_CREDENTIALS_CFT_PREVIEW`.
- [x] Repoint AAT deploy: cluster `cft-aat-00-aks`, creds `AZURE_CREDENTIALS_CFT_PREVIEW`, DNS zone `aat.platform.hmcts.net`.
- [x] Update hardcoded hostnames in helm values templates (`dev.platform.hmcts.net` → `preview.platform.hmcts.net`; `staging.platform.hmcts.net` → `aat.platform.hmcts.net`).
- [x] Drop GH Environment block from `job.helm-deploy.yml` (was producing OIDC subject `:environment:dev` that has no federated credential). The build job's `:pull_request`/`:ref:refs/heads/master` subjects are federated and work for the deploy too.
- [ ] **Follow-up (optional):** add `repo:hmcts/cath-service:environment:{preview,aat}` subjects to `platops/azure-github-federation-config/app-registrations.yaml` (under `DTS Shared GitHub Actions ACR Publisher 1`) so the GH Environment block can be reintroduced for deployment-tracking UI.

### cnp-flux-config + SOPS
- [ ] Add `apps/cath/` kustomizations to `cnp-flux-config` (aat + preview)
- [ ] Regenerate SOPS secrets, encrypt with CNP key, commit to `cnp-flux-config`

### Cutover
- [ ] Verify CNP pods healthy and smoke tests pass on CNP ingress URL
- [ ] Drop DNS TTL to 60s
- [ ] Cut DNS to CNP load balancer
- [ ] Monitor for 1 week

### Decommission SDS (~1 week after cutover)
- [ ] Remove `sds-flux-config/apps/cath/`
- [ ] `terraform destroy` SDS resource groups
- [ ] Remove SDS jobs from `stage.infrastructure.yml`
- [ ] Remove `AZURE_CREDENTIALS_SDS_*` GitHub secrets
- [ ] Revert `workflow.preview.yml` `plan-only` back to `true`
- [ ] Remove `infrastructure/keyvault-migration.tf` (one-shot)
