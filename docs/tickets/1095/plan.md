# Technical Plan: #1095 PROD identities for GitHub Actions deploy and Terraform

## 1. Technical Approach

Most of this ticket happens outside the repo. Platform Operations grant the Azure roles under DTSPO-35946, and a repo admin adds the secret. The repo only gets two small things:

1. A one-off `workflow_dispatch` verification workflow (`one-shot.verify-prod-credentials.yml`). It proves each PROD credential can log in and can reach what #1096 and #1099 will need. It makes no changes. Delete it once it has passed.
2. A short credential register in `docs/GITHUB_SECRETS_SETUP.md`. It lists the secret name, the principal, the scopes, the expiry date and the rotation owner. No secret values go in it.

### Current state (2026-10-21)

- The `cath-service-prod` app registration exists. It was created by hmcts/central-app-registration#262 and is a member of `DTS Operations (env:prod)`.
- The PROD role assignments are requested under DTSPO-35946 and still pending.
- `AZURE_CREDENTIALS_CFT_PROD` is not set yet.

### What the repo actually needs from the identities

I checked these against the workflows, the `cnp-githubactions-library` actions and `infrastructure/`. Some of them differ from the ticket's list.

**Deploy (`job.helm-deploy.yml`, then `cnp-githubactions-library/helm-deploy`)**
- `azure/login@v3` with `creds`, then `azure/aks-set-context@v5` with `resource-group: cft-prod-<nn>-rg`, `cluster-name: cft-prod-<nn>-aks` and `admin: 'true'`. This calls `listClusterAdminCredential`, which needs **Azure Kubernetes Service Cluster Admin Role** on `cft-prod-00-aks` and `cft-prod-01-aks` in `DCD-CFTAPPS-PROD`.
- `aks-set-context` is not passed a subscription, so it uses the one `azure/login` leaves active. That is the `subscriptionId` inside the credential JSON. **For deploy to work, the JSON's `subscriptionId` must be `DCD-CFTAPPS-PROD`.** (Terraform and `state-store-init` both run `az account set`, so they don't depend on it.)
- **Key Vault read on `cath-prod` is not needed for deploy.** The action only passes `--set global.enableKeyVaults=true`. Secrets are mounted inside the cluster by the CSI driver using the `cath` workload identity (`aadIdentityName: cath` in `apps/*/helm/values.yaml`). The deploy principal never reads the vault. Recommendation: drop this scope from the request.
- "Register DNS" uses `kubectl` in the `admin` namespace (covered by cluster admin) and writes A records to zone `${ENVIRONMENT}.platform.hmcts.net` in `core-infra-intsvc-rg` / `DTS-CFTPTL-INTSVC`. For PROD that zone is `prod.platform.hmcts.net`. The comment in the workflow says that RG holds the **non-prod** private zones, so the PROD zone's location must be confirmed (see Clarifications). The role needed is **Private DNS Zone Contributor** on that zone.
- `job.helm-deploy.yml` rejects `prod` in its `case`. Adding it is #1099's job, not this ticket's. So the verification workflow must not call `job.helm-deploy.yml`.

**Terraform (`job.terraform.yml`, then `terraform-deploy.yaml@endakelly-patch-1`, then the `terraform-deploy` action)**
- It runs `az ad sp show --id <clientId>` to get `ci_service_principal_object_id`. That needs Graph read on its own service principal. Check this rather than assume it.
- That object ID becomes the **Postgres Entra admin** (`postgres.tf`) and gets **Key Vault access policies** on `cath-prod`, `cath-tp-prod` and `cath-bootstrap-prod` (`keyvault*.tf`). Whichever principal runs Terraform is therefore the data-plane admin of PROD. This matters when choosing one principal or two.
- The state store is read with `az account set --subscription DCD-CNP-PROD` and then `az storage account keys list` on `mgmtstatestoreprod` / `mgmt-state-store-prod`. It needs `listKeys` there, not Storage Blob Data roles. `state-store-init` in `stage.infrastructure.yml` uses the same key to create container `mgmtstatestorecontainerprod`.
- Contributor on the `cath-prod` resource group(s) in `DCD-CNP-PROD`, plus permission to create those groups. `azurerm_resource_group.shared` is created by Terraform, so an RG-scoped role alone cannot create the group on the first apply.
- Provider `postgres_network` and `cftapps` both use `aks_subscription_id`, which is `DCD-CFTAPPS-PROD`. Postgres private endpoints need network read and `subnets/join` on the PROD vnets. **Extra scope not in the ticket:** `cftapps` also manages APIM (`apim*.tf`), but only if `prod` is given an `apim_suffix` in `env-config.tf`. APIM PROD is tracked in #1161. When it lands, the identity needs API Management Service Contributor on `cft-api-mgmt-prod` in `cft-prod-network-rg`.
- **Extra scope not in the ticket:** `log_analytics_subscription_id` is hardcoded to the nonprod workspace `hmcts-nonprod`. PROD should use `hmcts-prod`. That change belongs to #1096, but the identity will need read on that workspace's subscription.
- The `core_infra` alias is only used where the core-infra vnet is outside `var.subscription`. Confirm where PROD's Redis subnet is.

### Decision 1: one principal or two

**Recommendation: one principal (`cath-service-prod`) and one secret, `AZURE_CREDENTIALS_CFT_PROD`, used for both deploy and Terraform.** Use a single JSON whose `subscriptionId` is `DCD-CFTAPPS-PROD`.

- It matches what already exists: one app registration, raised under one PlatOps ticket.
- Non-prod already shares a single SP across all Terraform legs, and the wrappers take one `AZURE_CREDENTIALS` secret.
- AC2 explicitly allows "or the deploy identity granted the Terraform scopes".
- Splitting would limit damage if a secret leaked, but only slightly. Cluster admin on PROD AKS is already enough to read every mounted secret. Splitting also needs a second app registration and a second PlatOps cycle.
- If PlatOps insist on splitting, name the second secret `AZURE_CREDENTIALS_CFT_PROD_TERRAFORM`. The verification workflow matrix (below) takes a list of secret names, so it works either way.

### Decision 2: OIDC federated credentials instead of a long-lived secret

The option: a PR to `hmcts/azure-github-federation-config` adding a federated credential to `cath-service-prod`, with the repo calling `helm-deploy-openid` / `terraform-deploy-openId.yaml` from `cnp-githubactions-library`.

**Recommendation: go ahead with the SP secret now. Raise OIDC with PlatOps as a follow-up story to do after #1096 and #1099 are working. If it is adopted, use an environment-based subject, not a ref-based one.**

Reasons:
- DTSPO-35946 is already in progress on the secret model. Switching now restarts the PlatOps request, and #1094 is waiting on it.
- Every current wrapper (`job.helm-deploy.yml`, `job.terraform.yml`, `state-store-init`, and the "Register DNS" login) uses `creds`. Moving PROD to OIDC means a second code path in each of them. The Terraform wrapper is also pinned to a library branch (`endakelly-patch-1`), and the `-openId` variant has not been tested against that fork.
- **The ref-restricted subject in the ticket, `repo:hmcts/cath-service:ref:refs/heads/master`, would break two things:**
  - **The verification workflow could not be run from a feature branch.** A `workflow_dispatch` on any other ref presents subject `...:ref:refs/heads/<branch>`, so the token exchange fails with `AADSTS70021`. It would have to be merged to master and run from master. That is acceptable for a one-shot, but it means nothing can be tested before merge.
  - **PR plans for PROD would fail.** `stage.infrastructure.yml` plans every environment on pull requests "so every environment master will apply has been reviewed first". Those runs present `repo:hmcts/cath-service:pull_request`, so a PROD plan leg on a PR could not authenticate. #1096 would have to choose between dropping the PROD PR plan (master applies an unreviewed plan) and adding a second, read-only federated credential for `pull_request`.
- An environment subject, `repo:hmcts/cath-service:environment:prod`, avoids both problems if a GitHub `prod` environment is created with required reviewers and a branch policy. It also adds a manual approval gate, which PROD should have anyway.

Effect if OIDC is adopted later:
- **#1099 (deploy):** `job.helm-deploy.yml` uses `helm-deploy-openid` with `azure-client-id` for PROD. The "Register DNS" step needs an OIDC `azure/login`. The job already has `id-token: write`.
- **#1096 (Terraform):** `job.terraform.yml` calls `terraform-deploy-openId.yaml` (`azure-client-id`). The `state-store-init` login switches to `client-id`/`tenant-id`. The PR-plan subject issue above needs a decision.
- **This ticket:** the AC1/AC2 secret becomes a client ID plus a federated credential. AC5 (expiry) mostly goes away, because federated credentials do not expire.

## 2. Implementation Details

TEMPLATE SOURCE: n/a

No UI, API, database, Prisma or Helm changes. No changes to existing workflows or Terraform.

### File structure

```
.github/workflows/
└── one-shot.verify-prod-credentials.yml   # NEW, temporary; delete after a green run
docs/
└── GITHUB_SECRETS_SETUP.md                # EDIT: add "Azure deploy and Terraform credentials" section
```

### `one-shot.verify-prod-credentials.yml` (outline)

Follows the existing one-shot style: a header comment explaining why it exists, "run once from master, then delete this file", `on: workflow_dispatch` only, and least-privilege `permissions`.

- `permissions: contents: read`. No `id-token` while on the SP model.
- `strategy.matrix.secret-name`: `["AZURE_CREDENTIALS_CFT_PROD"]`. Add `AZURE_CREDENTIALS_CFT_PROD_TERRAFORM` only if Decision 1 is overturned. `fail-fast: false`.
- `env: AZURE_CREDENTIALS: ${{ secrets[matrix.secret-name] }}`.
- Steps:
  1. **Secret present.** `[ -n "$AZURE_CREDENTIALS" ]`, otherwise fail with `::error::<name> is not set`. Same guard as `job.helm-deploy.yml`.
  2. **Login.** `azure/login@v3` with `creds`. Then `az account show --query "{subscription:name, tenant:tenantId}" -o table`. This prints the active subscription so the `subscriptionId`-must-be-CFTAPPS-PROD requirement is visible. It does not print the client secret, and `azure/login` masks it anyway.
  3. **Deploy checks (AC4).** For `nn` in `00` and `01`, run `az aks get-credentials --admin -g cft-prod-<nn>-rg -n cft-prod-<nn>-aks --subscription DCD-CFTAPPS-PROD --file "$RUNNER_TEMP/kube-<nn>"`. Then run a read-only `kubectl --kubeconfig ... get svc traefik -n admin`. This proves the API server is reachable from a GitHub-hosted runner, not just that the credential can be listed. Delete the kubeconfig files at the end.
  4. **DNS check.** `az network private-dns zone show -g <rg> -n prod.platform.hmcts.net --subscription <sub>`. This is a read only. Contributor rights are proven by #1099's first deploy, not here, so no records are written.
  5. **Terraform checks.**
     - `az ad sp show --id <clientId from az account show>` (Graph read).
     - `az account set --subscription DCD-CNP-PROD`, then `az storage account keys list --account-name mgmtstatestoreprod -g mgmt-state-store-prod --query "length(@)" -o tsv`. This checks only that the call succeeds and never echoes a key.
     - `az role assignment list --assignee <clientId> --all --query "[].{role:roleDefinitionName, scope:scope}" -o table`. This shows the granted scopes so they can be checked against Section 1 and copied into the register. Role names and scopes are not secret.
     - `az network vnet list --subscription DCD-CFTAPPS-PROD --query "length(@)"` (network read).
- Every `run` block uses `set -euo pipefail` and ends with a one-line `PASS`/`FAIL` summary per check.

### `docs/GITHUB_SECRETS_SETUP.md` addition

A table with these columns: Secret name | Principal (app registration display name) | Used by | Scopes | Credential expiry | Rotation owner | Rotation procedure (link to the PlatOps request route).

Never record the client secret. Recording the app registration name is enough; a client ID is not a secret, but leave it out to keep the doc simple.

## 3. Error Handling & Edge Cases

| Case | Symptom | Handling |
|------|---------|----------|
| Secret not set | `azure/login` fails with a JSON parse error | Step 1 guard names the missing secret |
| JSON `subscriptionId` is not CFTAPPS-PROD | Verification passes (it passes `--subscription`), but #1099 deploy fails in `aks-set-context` with ResourceNotFound | Step 2 prints the active subscription. Check it against `DCD-CFTAPPS-PROD` explicitly and fail if it differs |
| Cluster admin missing on one cluster | `AuthorizationFailed` on `listClusterAdminCredential` for 00 or 01 | Each cluster is a separate check, so the summary shows which one |
| PROD AKS API restricted by authorized IP ranges / private cluster | `get-credentials` succeeds, `kubectl` times out | The `kubectl` probe in step 3 catches it. This would block #1099 on GitHub-hosted runners (Clarification 3) |
| State store listKeys denied | `AuthorizationFailed` (ARM checks access before existence, so this is not a NotFound) | `az account set` first, same as `state-store-init` |
| Graph read denied | `az ad sp show` fails, and Terraform fails before plan | Step 5 surfaces it before #1096 runs |
| Secret leaked into logs | Exposure | Use `--query` to emit counts only, never `-o json` on credentials or keys. `azure/login` masks `clientSecret`. Do not `cat` the kubeconfig. Delete kubeconfig files |
| Run from a non-master branch | Works on the SP model (repo secrets are not ref-scoped). Fails under a ref-restricted OIDC subject | The workflow must be on master before it appears for dispatch anyway. Run it from master |
| Credential expires | All PROD deploys and applies fail at login | The register records the expiry and owner. Set a calendar reminder about 30 days before expiry (Clarification 5) |
| Workflow left in the repo | A dormant job holding PROD admin access | Delete it in a follow-up PR straight after a green run, as with the other one-shots |

## 4. Acceptance Criteria Mapping

| AC | How satisfied | Who | Verification |
|----|---------------|-----|--------------|
| 1. PROD deploy identity created with scopes, and `AZURE_CREDENTIALS_CFT_PROD` added | `cath-service-prod` (already created) gets AKS Cluster Admin on `cft-prod-00/01-aks` and Private DNS Zone Contributor on the PROD zone under DTSPO-35946. KV read is dropped as unnecessary. A repo admin adds the secret with `subscriptionId` = DCD-CFTAPPS-PROD | PlatOps (roles, secret material), repo admin (secret) | Verification workflow steps 1–4, plus `az role assignment list` output |
| 2. Terraform identity created or deploy identity granted Terraform scopes, secret added | Recommended: same principal granted Contributor in DCD-CNP-PROD (RG create rights), network read/join in DCD-CFTAPPS-PROD, listKeys on `mgmtstatestoreprod`, Graph self-read, KV management rights. Request APIM and Log Analytics reads now so #1096 / #1161 do not need another round | PlatOps | Verification step 5. The full proof is #1096's first PROD plan |
| 3. Secrets added only by an admin, values never pasted | A repo admin enters the secret through the GitHub UI or `gh secret set` with stdin. PlatOps hand it over through their secure channel, never Slack, Jira, an issue or a PR. The workflow avoids printing anything sensitive | Repo admin | Review the workflow logs after the run. Grep the issue and PR for credential-shaped strings |
| 4. `az login` works and `az aks get-credentials --admin` succeeds for `cft-prod-00-aks` | `one-shot.verify-prod-credentials.yml` dispatched from master. It also checks `01` and reachability of the API server | Dev (author/run), repo admin (merge) | Green run. Link the run URL in #1095 |
| 5. Expiry recorded, rotation owner named | Register section in `docs/GITHUB_SECRETS_SETUP.md` with expiry date and owner, also recorded as a comment on #1095 | Dev, with the expiry date from PlatOps | Doc PR merged. Reminder created |

## 5. Test Scenarios

There is no application code, so no unit or E2E tests. The scenarios are operational checks, each one carried out by a task in `tasks.md`.

1. **Deploy credential journey.** Dispatch the verification workflow on master with `AZURE_CREDENTIALS_CFT_PROD`. Login succeeds, the active subscription is DCD-CFTAPPS-PROD, admin kubeconfig is obtained for 00 and 01, `kubectl get svc traefik -n admin` succeeds on both, and the PROD DNS zone is readable. (Task 9)
2. **Terraform credential journey.** In the same run, `az ad sp show` succeeds, `mgmtstatestoreprod` listKeys succeeds in DCD-CNP-PROD, the role assignment list shows the Section 1 scopes, and the CFTAPPS-PROD vnets are listable. (Task 9, Task 10)
3. **Missing-secret negative check.** Before the secret is added, dispatch once and check that it fails at step 1 with the named-secret error, not a JSON parse error. This proves the guard works and the run is harmless. (Task 8)
4. **Log hygiene check.** Review the logs of the green run for any client secret, storage key or kubeconfig content. (Task 11)

## CLARIFICATIONS NEEDED

1. **One principal or two?** The recommendation is a single `cath-service-prod` principal and one secret. Confirm with PlatOps that they agree, or whether they require a separate Terraform identity.
2. **OIDC decision.** Should OIDC be raised now, or as a follow-up after #1096/#1099? If adopted, will PlatOps accept an `environment:prod` subject instead of `ref:refs/heads/master`? The ref subject blocks PR plans for PROD and any non-master verification run.
3. **PROD AKS API reachability.** Do `cft-prod-00/01-aks` restrict the API server to authorized IP ranges or private endpoints? If so, GitHub-hosted runners cannot run `helm`/`kubectl`, and #1099 needs a self-hosted runner or an allowlist. The verification `kubectl` probe will show this, but it is better to know before the PlatOps grant.
4. **PROD private DNS zone location.** Is `prod.platform.hmcts.net` in `core-infra-intsvc-rg` / `DTS-CFTPTL-INTSVC` like the non-prod zones, or somewhere else? Is "Register DNS" even the right pattern for PROD, or does PROD use Front Door / public DNS only?
5. **Credential lifetime and rotation owner.** What expiry will PlatOps set on the `cath-service-prod` client secret? Who owns rotation: the CaTH dev team (named person or role) or PlatOps? What is the rotation route (a central-app-registration PR or a DTSPO ticket)?
6. **Key Vault scope.** Confirm the deploy-side `cath-prod` read can be dropped (secrets are mounted in-cluster through the `cath` workload identity). Should Terraform KV rights be RBAC or access policies? The code uses access policies via `ci_service_principal_object_id`.
7. **Extra Terraform scopes.** Request these now or under #1096/#1161: read on the `hmcts-prod` Log Analytics workspace subscription, and API Management Service Contributor on `cft-api-mgmt-prod`?
8. **Resource group creation.** Will PlatOps grant subscription-level Contributor in DCD-CNP-PROD, or pre-create `cath-prod` (and any other cath RGs) so an RG-scoped role is enough?
9. **What the `DTS Operations (env:prod)` membership grants.** Does that group membership already give any of the above? If so, the request may be smaller than listed.
