# Plan: #1019 — Provision and deploy to Demo, ITHC and Perftest (CNP)

## 1. Technical Approach

### 1.1 Strategy overview

Phase 1 (infrastructure) and Phase 2 (workflows) are sequential but not tightly coupled in the
code: Phase 1 is entirely `infrastructure/*.tf` plus `.github/workflows/stage.infrastructure.yml`;
Phase 2 is entirely `.github/workflows/*` plus `helm/cath-service/values.template.yaml`. The only
ordering constraint is that a Phase 2 deploy will fail at Key Vault mount time if Phase 1 has not
been applied for that environment (see §3.6).

Phase 1 — the root module at `infrastructure/` is already fully environment-agnostic. Everything is
keyed on `var.env`:

- `infrastructure/main.tf:15` `cath-${var.env}` resource group
- `infrastructure/keyvault.tf:1-18` application vault via `product` + `env`
- `infrastructure/keyvault-bootstrap.tf:29` `cath-bootstrap-${var.env}`
- `infrastructure/keyvault-third-party.tf:4` `cath-tp-${var.env}`
- `infrastructure/postgres.tf:9-10`, `infrastructure/redis.tf:5-7`
- `infrastructure/storage.tf:5` `cathsa${var.env}`
- `infrastructure/appinsights.tf:32,73`
- `infrastructure/state.tf:2` `backend "azurerm" {}` — nothing hardcoded

So Phase 1 needs **no new resources**. What it needs is (a) the caller to run the module more than
once, and (b) a small amount of per-environment variance (AKS subscription, Postgres subnet suffix,
sizing) that is currently implicit in the single aat invocation.

Phase 2 — `job.helm-deploy.yml` needs its two-way conditional replaced, and
`helm/cath-service/values.template.yaml` needs its two hardcoded `.aat.platform.hmcts.net` suffixes
and its two hardcoded `ENABLE_TEST_SUPPORT: "true"` values parameterised. The three new workflows
are thin — they must not call `stage.build.yml`.

### 1.2 Generalising the environment mapping in `job.helm-deploy.yml` — recommendation

Today the file carries five two-way conditionals:

- `job.helm-deploy.yml:111` credentials ternary
- `job.helm-deploy.yml:116-117` resource group / cluster ternary (`cft-aat-00` / `cft-preview-00`)
- `job.helm-deploy.yml:147-163` "Deploy to PREVIEW" step, `if: inputs.environment == 'preview'`
- `job.helm-deploy.yml:165-181` "Deploy to AAT" step, `if: inputs.environment == 'aat'`
- `job.helm-deploy.yml:183-184` DNS step, `if: inputs.environment == 'aat'`

**Recommended approach: single derivation + one deploy step. Not per-env conditionals, not a
matrix.**

Rationale:

- **Per-env conditionals** would mean five `if:`-guarded deploy steps that are byte-identical apart
  from three values. That is the pattern the ticket explicitly says to avoid, and it is the pattern
  that already caused `global-environment: aat` to be wrong for preview
  (`job.helm-deploy.yml:161` — preview mounts the *aat* vault). Duplicated steps drift.
- **A matrix** is wrong here: this job deploys one release to one environment. A matrix would add a
  dimension of size 1 and break the job-level `outputs` (`urls`, `release-name`, `namespace` at
  `job.helm-deploy.yml:31-40`), which matrixed jobs cannot express deterministically.
- **Single derivation** is possible because every CNP name is already a pure function of the
  environment:
  - cluster / RG: `cft-{environment}-{suffix}` — uniform across `preview`, `aat`, `demo`, `ithc`,
    `perftest`. No lookup table needed, just string interpolation, with a new
    `cluster-suffix` input defaulting to `00` (see CLARIFICATIONS).
  - credentials: `AZURE_CREDENTIALS_CFT_{ENVIRONMENT}` — already uniform for the two existing
    values, so `secrets[format('AZURE_CREDENTIALS_CFT_{0}', inputs.environment)]` resolves all five.
    GitHub secret names are case-insensitive in the `secrets` context, and every caller uses
    `secrets: inherit`, so this works without declaring per-env `secrets:` inputs.
  - values template: `preview` is the only environment with its own file
    (`helm/cath-service/values.preview.template.yaml`, needed for the `-dev` SSO app registration
    and the ASO blob storage). Everything else uses `values.template.yaml`. That stays a single
    binary condition, not a five-way one.
  - `global-environment`: `${{ inputs.environment }}`, except `preview` which must stay `aat`
    (it has no `cath-preview` vault).
  - `ENABLE_TEST_SUPPORT`: `false` for `demo`, `true` otherwise.
  - ingress host suffix: derived inside the Helm values via `{{ .Values.global.environment }}` — see
    §2.4. It does not need to be a workflow-level variable at all.

Concretely: one new `Resolve environment configuration` step near the top writes
`CLUSTER`, `GLOBAL_ENVIRONMENT`, `VALUES_TEMPLATE`, `ENABLE_TEST_SUPPORT` and `DNS_ZONE` to
`$GITHUB_ENV` from a single `case "$ENVIRONMENT" in` block; the AKS-context steps and one
`hmcts/cnp-githubactions-library/helm-deploy@main` step consume them. The credentials expression
stays inline because `secrets` cannot be read from a shell step.

Risk to note: if dynamic `secrets[...]` indexing turns out not to resolve in this reusable-workflow
context, the fallback is to declare five named `secrets:` inputs on `job.helm-deploy.yml` and have
`stage.deploy.yml` pass all five (it currently uses `secrets: inherit` at `stage.deploy.yml:53`).
That is uglier but deterministic. Verify the dynamic form on a throwaway branch first.

### 1.3 Stopping `stage.infrastructure.yml` hardcoding `environment: aat` — recommendation

`stage.infrastructure.yml:26` hardcodes `environment: aat`, and it has exactly two callers:

- `workflow.main.yml:44` (`plan-only: false`)
- `workflow.preview.yml:44` (`plan-only: true`)

**Recommended approach: a matrix over a JSON `environments` input supplied by the caller.**

```yaml
on:
  workflow_call:
    inputs:
      environments:
        required: false
        type: string
        default: '["aat"]'
```

```yaml
  terraform:
    needs: [terraform-fmt]
    strategy:
      fail-fast: false
      matrix:
        environment: ${{ fromJson(inputs.environments) }}
        include:
          - environment: aat
            aks-subscription: DCD-CFTAPPS-STG
          - environment: demo
            aks-subscription: DCD-CFTAPPS-DEMO
          - environment: ithc
            aks-subscription: DCD-CFTAPPS-ITHC
          - environment: perftest
            aks-subscription: DCD-CFTAPPS-PERFTEST
    uses: ./.github/workflows/job.terraform.yml
    with:
      environment: ${{ matrix.environment }}
      aks-subscription: ${{ matrix.aks-subscription }}
      ...
```

Why matrix rather than a plain parameterised input:

- A single `environment` input would force the *caller* to fan out, duplicating the job block four
  times in `workflow.main.yml`. The matrix keeps the fan-out in one place.
- `strategy.matrix` with `uses:` is supported for reusable workflows, and `include` is the
  documented way to attach the per-environment `aks-subscription` without a second lookup.
- `fail-fast: false` matters: a broken `perftest` plan must not cancel the `aat` apply.

Callers that need to change:

- `workflow.main.yml:40-47` — pass `environments: '["aat","demo","ithc","perftest"]'`.
- `workflow.preview.yml:40-47` — **leave on the default `["aat"]`**. Planning four environments on
  every PR quadruples runtime and posts four plan comments per PR
  (`job.terraform.yml:55-58` `post-plan-to-pr` defaults to `true`). The AC only requires that
  Terraform *runs* for the new environments, and it does — on master. If a four-way PR plan is
  wanted later, pass the full list with `post-plan-to-pr: false` for the non-aat entries.

Side effect to accept: `stage.infrastructure.yml:11-14` exposes `plan-exitcode` from
`jobs.terraform.outputs.plan-exitcode`. Under a matrix that output becomes whichever matrix leg
wrote last, i.e. meaningless. Nothing consumes it today (grep confirms only
`job.terraform.yml:65-67` and `stage.infrastructure.yml:11-14` mention it), so **delete the output**
rather than leave a lying contract.

### 1.4 Terraform state separation

No change required in this repo. `infrastructure/state.tf:2` is an empty `backend "azurerm" {}`, and
`job.terraform.yml:50-54` exposes `state-store-container-name` defaulting to `""`, documented as
"default: `tfstate-{environment}`". Because the matrix passes `environment: demo|ithc|perftest`, the
upstream `hmcts/cnp-githubactions-library/.github/workflows/terraform-deploy.yaml` derives
`tfstate-demo`, `tfstate-ithc`, `tfstate-perftest` in `mgmtstatestorenonprod`
(`storage-account: nonprod`, `stage.infrastructure.yml:29`). Do not pass an override — the
convention already gives the separation the AC asks for.

The one out-of-band check: confirm the library *creates* the container if absent. If it does not, the
three containers must be created manually before the first apply (§3.7).

### 1.5 Does the module layout need env-specific tfvars?

There are **no `.tfvars` files anywhere in the repo** (verified). Every variable in
`infrastructure/variables.tf` is either required-and-supplied-by-the-library (`env`, `product`,
`subscription`, `aks_subscription_id`) or has a default. The library passes them as `-var` flags and
derives `product`/team from `helm-chart-path: helm/cath-service/Chart.yaml`
(`job.terraform.yml:82-83`).

Implication: introducing `demo.tfvars` etc. would mean relying on the library's auto-loading
behaviour, which is unverified from this repo and would be a new coupling. **Recommendation: express
per-environment variance as a `locals` map keyed on `var.env`, in a new `infrastructure/env-config.tf`.**
This is deterministic, `terraform fmt`-checkable (`job.terraform-fmt.yml` runs before the plan), and
reviewable in one file. Only three settings genuinely vary:

| Setting | Current (aat) | Why it may vary |
| --- | --- | --- |
| `subnet_suffix` | `"expanded"` (`postgres.tf:17`) | the expanded postgres subnet exists in the *stg* vnet; demo/ithc/perftest vnets are separate and may only have the default subnet |
| `pgsql_sku` / `pgsql_storage_mb` | `GP_Standard_D2ds_v4` / 65536 (`postgres.tf:25,27`) | perftest may need more; demo/ithc likely less |
| redis `sku_name` / `capacity` | `Basic` / `C0` (`redis.tf:15-17`) | perftest load |

Everything else is safe to share, including the `hmcts-nonprod` Log Analytics workspace
(`appinsights.tf:18-21`) — all four are non-prod — and `pip_nonprod_group_object_id`
(`variables.tf:90-94`).

---

## 2. Implementation Details

**TEMPLATE SOURCE: n/a**

### 2.1 Files to create

| Path | Purpose |
| --- | --- |
| `.github/workflows/workflow.demo.yml` | push to `demo` → resolve promoted tag → deploy → smoke test |
| `.github/workflows/workflow.ithc.yml` | same for `ithc` |
| `.github/workflows/workflow.perftest.yml` | same for `perftest` |
| `.github/workflows/job.resolve-promoted-images.yml` | shared reusable job: outputs `helm-apps`, `image-tag`, `short-sha`, `timestamp` (see §2.3) |
| `infrastructure/env-config.tf` | `locals.env_config` map keyed on `var.env` (see §1.5) |

### 2.2 Files to modify

| Path | Change |
| --- | --- |
| `.github/workflows/stage.infrastructure.yml` | add `environments` input; matrix over it with `include` for `aks-subscription`; drop the `plan-exitcode` output (lines 11-14) |
| `.github/workflows/workflow.main.yml:40-47` | pass `environments: '["aat","demo","ithc","perftest"]'` |
| `.github/workflows/job.helm-deploy.yml` | add `image-tag` input; add `Resolve environment configuration` step; replace lines 111, 116-117 with derived values; collapse lines 147-181 into one deploy step; parameterise the DNS step zone at line 190 and change its guard at line 184 |
| `.github/workflows/stage.deploy.yml` | add `image-tag` input (default `""`), pass through to `job.helm-deploy.yml` |
| `.github/workflows/jobs/build-and-publish-images/set-image-variables.sh` | accept optional 7th arg `image_tag_override`; when set, emit `{APP}_IMAGE=<override>` for every entry in `helm_apps` and skip the affected/not-affected branch (lines 65-96) |
| `helm/cath-service/values.template.yaml` | lines 35, 37, 45, 62: replace `.aat.platform.hmcts.net` with `.{{ .Values.global.environment }}.platform.hmcts.net`; lines 38, 47: `ENABLE_TEST_SUPPORT: "${ENABLE_TEST_SUPPORT:-true}"` |
| `infrastructure/postgres.tf:17,25,27` | read `subnet_suffix`, `pgsql_sku`, `pgsql_storage_mb` from `local.env_config[var.env]` |
| `infrastructure/redis.tf:15-17` | read `sku_name`, `capacity` from `local.env_config[var.env]` |

No change needed to `apps/web/helm/values.yaml`, `apps/api/helm/values.yaml`,
`apps/crons/helm/values.yaml` or `apps/postgres/helm/values.yaml` — all four already template their
hostnames and `THIRD_PARTY_KEY_VAULT` on `{{ .Values.global.environment }}`
(`apps/web/helm/values.yaml:18,20,26,33-35`, `apps/api/helm/values.yaml:5`,
`apps/postgres/helm/values.yaml:...ingressHost`), and `aadIdentityName: cath` already matches the
managed identity created by `module.key_vault` with `create_managed_identity = true`
(`infrastructure/keyvault.tf:17`).

No change needed to `helm/cath-service/values.preview.template.yaml` — it is preview-only. Note that
`apps/web/helm/values.yaml.test.ts` enforces keyVault parity between it and
`apps/web/helm/values.yaml`; do not touch either secrets list.

### 2.3 Skipping build and resolving the already-promoted master image tag

**This is the part of the ticket that does not work as described, and it needs a code change.**

Where tags come from today:

- `job.build-and-publish-images.yml:130-136` pushes two tags per affected app. On master
  (`change-id: aat`, `workflow.main.yml:37`) those are `aat-<short-sha>` and the floating `aat`.
- `job.promote-images.yml:81-93` then pushes `prod-<short-sha>-<TIMESTAMP>` and `latest`, where
  `TIMESTAMP` is generated inside that step (`job.promote-images.yml:82`) and **is never emitted as
  a job output or recorded anywhere**.

Consequences:

1. **`prod-<sha>-<timestamp>` is not consumable.** Nothing outside that one step knows the
   timestamp. A new workflow cannot reconstruct the tag. If a `prod-*` tag is genuinely wanted as
   the promotion contract, `job.promote-images.yml` must emit it as a workflow output and
   `stage.promote-images.yml` must surface it — that is extra work not in the ticket.
2. **`latest` is unusable.** It is mutable, so consecutive deploys produce an identical pod spec and
   Kubernetes performs no rollout — the deploy silently no-ops. It also violates the repo's own
   "no `latest` tags" rule.
3. **The floating `aat` tag has the same no-op problem** for the same reason.
4. **`change-id` currently drives both the release name and the image tag.**
   `set-image-variables.sh:46-50` builds `RELEASE_NAME=cath-service-<change-id>` and
   `:70-95` builds `{APP}_IMAGE` from the same `change-id`. So passing `change-id: demo` gives the
   correct release name `cath-service-demo` but an image tag `demo` that was never pushed, while
   passing `change-id: aat` gives the right tag but a release name colliding with the live AAT
   release. **These two uses must be decoupled.**

**Recommended resolution.** Add an `image-tag` override that bypasses only the tag derivation:

- `job.resolve-promoted-images.yml` (new, one job, `ubuntu-latest`):
  - checkout, then compute `helm-apps` the same way `detect-affected-apps.sh:53` does:
    `find apps/*/helm -name Chart.yaml | sed ... | jq -R -s -c 'split("\n") | map(select(. != ""))'`
  - `short-sha=$(echo "${{ github.sha }}" | cut -c1-7)`, `timestamp=$(date +%Y%m%d%H%M%S)`
  - Azure OIDC login + `az acr login`, then per app resolve the tag:
    prefer `aat-<short-sha>`; if `az acr repository show-tags --name hmctsprod --repository cath/<app>`
    does not contain it, fall back to the floating `aat`. Emit a single `image-tag` when all apps
    agree, and fail loudly if `aat` is also absent.
  - outputs: `helm-apps`, `image-tag`, `short-sha`, `timestamp`
- The three new workflows call it, then `stage.deploy.yml` with
  `change-id: demo` (release name), `image-tag: <resolved>`, `affected-apps: '[]'`,
  `helm-apps: <resolved>`, `environment: demo`, then `stage.smoke-test.yml` with
  `runner-group: azure-prod` (matching `workflow.main.yml:74`).

Why `aat-<short-sha>` is the right tag: per #1020 the `demo`/`ithc`/`perftest` branches are synced
*from* master, so `github.sha` on those branches is the same commit master built and smoke-tested.
`aat-<short-sha>` therefore names exactly the promoted master image, is immutable, and changes on
every promotion so the rollout actually happens.

The per-app fallback is not optional. `job.build-and-publish-images.yml:110` only builds
`affected-apps`, so on a master run that touched only `apps/web`, the tag `aat-<sha>` exists for
`cath/cath-web` but not for `cath/cath-api`. Without the fallback the deploy fails on an
`ImagePullBackOff` for the unchanged apps.

**Explicitly: none of the three new workflows may reference `stage.build.yml`,
`job.detect-changes.yml` or `stage.promote-images.yml`.**

### 2.4 Ingress host / `BASE_URL` generalisation

`helm/cath-service/values.template.yaml` hardcodes the zone in four places — lines 35, 37, 45, 62.
The fix is one substitution, not one template per environment:

- line 35 `ingressHost: "${TEAM_NAME}-{{ .Release.Name }}-web.{{ .Values.global.environment }}.platform.hmcts.net"`
- line 37 `BASE_URL: "https://${TEAM_NAME}-{{ .Release.Name }}-web.{{ .Values.global.environment }}.platform.hmcts.net"`
- line 45 api `ingressHost`, line 62 postgres `ingressHost` — same pattern

This works because `global.environment` is already `${ENVIRONMENT:-aat}`
(`values.template.yaml:4`), `ENVIRONMENT` is exported from `job.helm-deploy.yml:77` as
`inputs.environment`, and the nodejs base chart `tpl`-renders `ingressHost` — proven by
`apps/web/helm/values.yaml:18` already using the same expression. So **a single generalised
`values.template.yaml` satisfies the AC; do not create `values.demo.template.yaml` and friends.**

`ENABLE_TEST_SUPPORT` (lines 38 and 47) becomes `"${ENABLE_TEST_SUPPORT:-true}"`, with the value
written by the new resolve step in `job.helm-deploy.yml` (`false` for `demo`, `true` otherwise).
Keeping the `:-true` default preserves current aat behaviour if the variable is ever unset.

**The ingress-host AC as written is wrong and must be corrected.** The ticket asks for
`cath-web.demo.platform.hmcts.net` / `cath-api.demo.platform.hmcts.net` from *this pipeline*. Those
are the plain, non-release-scoped names, and `helm/cath-service/values.template.yaml:18-31` documents
at length why the pipeline must not claim them: Flux (`cnp-flux-config/apps/cath`) owns the plain
names, and two ingresses claiming the same host makes traefik load-balance across a healthy and a
broken pod, surfacing as intermittent 502s. The correct outcome is:

- **This pipeline** deploys `cath-cath-service-demo-web.demo.platform.hmcts.net` (release-scoped),
  consistent with aat.
- **The plain `cath-web.demo.platform.hmcts.net` / `cath-api.demo...` hosts** are satisfied by the
  Flux release, which reads `apps/web/helm/values.yaml:18` and `apps/api/helm/values.yaml:5` — both
  already resolve to the correct per-environment host with zero code change. That is the #566
  dependency.

Flag this on the ticket rather than implementing the collision.

Related: the DNS registration step (`job.helm-deploy.yml:183-237`) is `aat`-only and hardcodes
`ZONE="aat.platform.hmcts.net"` at line 190. Change the guard to
`if: inputs.environment != 'preview'` and set `ZONE="${{ inputs.environment }}.platform.hmcts.net"`.
`RESOURCE_GROUP="core-infra-intsvc-rg"` and `SUBSCRIPTION="DTS-CFTPTL-INTSVC"` (lines 189, 191) are
the same for all CNP non-prod zones. Without this the release-scoped hosts have no A record and the
smoke test cannot pass (§3.2). This is a two-line change to an existing step, so treat it as in
scope even though DNS generally is #1021.

### 2.5 Bootstrap Key Vault secrets — the AC as written targets the wrong vault

The ticket says to seed `cath-bootstrap-{env}` with "the secrets the apps mount — every `name:`
under `keyVaults.cath.secrets`". That is incorrect. `keyVaults.cath` in the nodejs base chart mounts
the vault named `cath-{global.environment}`, i.e. the **application** vault from
`infrastructure/keyvault.tf`. `cath-bootstrap-{env}` is explicitly documented at
`infrastructure/keyvault-bootstrap.tf:1-5` as holding E2E test credentials that are "deliberately
never mounted into running pods". Seeding app secrets there would have no effect on the pods.

Furthermore, E2E on the new environments is Out of Scope, and `job.e2e-test.yml:44` and
`nightly.yml:88` both hardcode `KV="cath-bootstrap-aat"`. So **`cath-bootstrap-{demo,ithc,perftest}`
should be created by Terraform (it already is, `keyvault-bootstrap.tf:26-39`) but needs no secrets
seeded at all** until E2E is extended to those environments.

The secrets that must be seeded are into **`cath-demo` / `cath-ithc` / `cath-perftest`**. Full
enumeration below, split by who creates them.

**Created by Terraform — do not seed by hand:**

| Secret name | Source |
| --- | --- |
| `app-insights-connection-string` | `infrastructure/appinsights.tf:46` |
| `postgres-host` | `infrastructure/postgres.tf:32` |
| `postgres-user` | `infrastructure/postgres.tf:38` |
| `postgres-password` | `infrastructure/postgres.tf:44` |
| `postgres-port` | `infrastructure/postgres.tf:50` |
| `postgres-url` | `infrastructure/postgres.tf:56` |
| `redis-host` | `infrastructure/redis.tf:20` |
| `redis-port` | `infrastructure/redis.tf:26` |
| `redis-access-key` | `infrastructure/redis.tf:32` |
| `redis-url` | `infrastructure/redis.tf:38` |
| `storageaccount-connection-string` | `infrastructure/storage.tf:25` |
| `storageaccount-name` | `infrastructure/storage.tf:31` |

**Must be seeded out-of-band into each `cath-{env}` vault (22 secrets).** Names taken verbatim from
`apps/web/helm/values.yaml:53-103` and `apps/api/helm/values.yaml:13-38`:

From `apps/web/helm/values.yaml`:

1. `session-secret`
2. `govuk-notify-api-key`
3. `sso-client-id`
4. `sso-client-secret`
5. `sso-issuer-url`
6. `sso-sg-system-admin`
7. `sso-sg-admin-ctsc`
8. `sso-sg-admin-local`
9. `cft-idam-client-secret`
10. `auto-pip-stg-courtel-api`
11. `courtel-certificate`
12. `b2c-tenant-id`
13. `auto-pip-stg-pip-account-management-stg-id`
14. `auto-pip-stg-pip-account-management-stg-pwd`
15. `b2c-ad-url`
16. `auto-pip-stg-pip-frontend-stg-id`
17. `auto-pip-stg-pip-frontend-stg-pwd`

Additionally from `apps/api/helm/values.yaml`:

18. `app-tenant-id`
19. `cath-service-api-client-id`
20. `cath-service-api-client-scope`
21. `xhibit-s3-access-key`
22. `xhibit-s3-access-key-secret`

`apps/crons/helm/values.yaml` and `apps/postgres/helm/values.yaml` mount only
`app-insights-connection-string` and `postgres-url`, both Terraform-managed.

Two corrections to the ticket's prose list:

- It asks for `cath-service-api-client-{id,secret,scope}`. **`cath-service-api-client-secret` is not
  in either app's values file** — it appears only in `job.e2e-test.yml:64`, read from the *bootstrap*
  vault. Do not add it to the application vault.
- `sso-client-id-dev` / `sso-client-secret-dev` are preview-only
  (`helm/cath-service/values.preview.template.yaml:73-76`) and must not be created in the new
  environments' vaults.

### 2.6 Key Vault access policies for the workload identity

No code change. `infrastructure/keyvault.tf:1-18` passes `create_managed_identity = true`, and
`cnp-module-key-vault` grants that identity read access vault-wide — the "vault-wide pattern" the AC
refers to. `aadIdentityName: cath` in all four app charts matches the identity name the module
derives from `product`. `infrastructure/storage.tf:21-22` and
`infrastructure/keyvault-third-party.tf:18-26` already wire the same identity into the storage
account and third-party vault. All of this reproduces per-environment automatically once
`var.env` changes.

### 2.7 Manual / out-of-band steps

**Code changes in this repo (reviewable, PR-able):** everything in §2.1 and §2.2.

**Out-of-band, cannot be done in this repo:**

1. Create the three service principals and add them as GitHub **repository secrets**:
   `AZURE_CREDENTIALS_CFT_DEMO`, `AZURE_CREDENTIALS_CFT_ITHC`, `AZURE_CREDENTIALS_CFT_PERFTEST`.
   They need AKS admin on `cft-{env}-{suffix}-aks` (the deploy uses `admin: 'true'`,
   `job.helm-deploy.yml:118`).
2. Confirm/create the Terraform state containers `tfstate-demo`, `tfstate-ithc`,
   `tfstate-perftest` in `mgmtstatestorenonprod`, if the library does not create them.
3. Run the first `terraform apply` per environment (via a `master` merge, since
   `workflow.preview.yml` stays plan-only).
4. Seed the 22 secret **values** listed in §2.5 into `cath-demo`, `cath-ithc`, `cath-perftest`.
5. Register OIDC redirect URIs on the SSO / B2C / CFT IDAM app registrations for the new hosts, or
   accept that browser login does not work there (§3 and CLARIFICATIONS).
6. Create the `demo` / `ithc` / `perftest` branches — #1020.
7. Land the Flux overlays — #566.

**Secret values must never be committed.** The only thing that lands in git is the secret *name*
appearing in a Helm values file, which is already the case. No `az keyvault secret set` command with
a literal value goes into any workflow, script, or docs file in this repo.

### 2.8 Blocked verification

- **#566 (Flux overlays)** — until the overlays exist, the plain `cath-web.{env}.platform.hmcts.net`
  hosts do not exist and the namespace may not be Flux-managed. This blocks the corrected reading of
  the "Ingress hosts resolve per environment" AC (§2.4). The release-scoped pipeline hosts are
  independent of #566 and can be verified without it.
- **#1020 (branch creation)** — `on: push: branches: [demo]` cannot fire until the branch exists, so
  "A deploy to each new environment completes and smoke tests pass" cannot be demonstrated. The
  workflows can be smoke-tested in the interim by adding `workflow_dispatch` to each — recommended,
  and cheap.

---

## 3. Error Handling and Edge Cases

### 3.1 Missing repository secret

If `AZURE_CREDENTIALS_CFT_DEMO` is absent, `secrets[format(...)]` evaluates to an empty string and
`azure/login@v3` fails with a generic parse error, not "secret missing". Add an explicit guard in the
resolve step: if the credentials expression is empty, `echo "::error::AZURE_CREDENTIALS_CFT_DEMO is
not set"` and `exit 1`. Cheap, and turns a confusing failure into an actionable one.

### 3.2 Missing DNS record

Without the §2.4 DNS-step generalisation, the release-scoped hosts have no A record in
`{env}.platform.hmcts.net`. `helm upgrade --atomic` still succeeds (the ingress object is created),
`get-deployment-urls.sh` still returns the URLs from the ingress spec, and then
`job.smoke-test.yml:56` gets `HTTP_STATUS=000` and fails after 10 retries over ~100 s. Symptom looks
like an app failure; it is a DNS failure. The `Network diagnostics` step
(`job.smoke-test.yml:31-43`) will show `dig` returning NXDOMAIN — read that first.

### 3.3 Missing Flux overlay

A missing overlay does not fail this pipeline — this pipeline uses `helm upgrade` directly
(`hmcts/cnp-githubactions-library/helm-deploy`), not Flux. What breaks is the plain hostnames and any
Flux-owned namespace prerequisites. If the `cath` namespace does not exist in the target cluster,
`helm upgrade` fails with `namespaces "cath" not found`. Namespace creation is a Flux/CNP
onboarding concern, so treat #566 as a hard prerequisite for the first deploy even though it does not
appear in the failure message.

### 3.4 Missing branch

`on: push: branches: [demo]` on a non-existent branch is inert — GitHub shows the workflow with "This
workflow has no runs yet" and no error. Silent. Mitigate with `workflow_dispatch`.

### 3.5 Storage account name constraints for `cathsa{env}`

`infrastructure/storage.tf:5` builds `cathsa${var.env}`:

| env | name | length |
| --- | --- | --- |
| demo | `cathsademo` | 10 |
| ithc | `cathsaithc` | 10 |
| perftest | `cathsaperftest` | 13 |

All within 3-24 characters and lowercase alphanumeric, so the *format* rules pass. The real risk is
**global uniqueness across all of Azure** — these are short, guessable names and could already be
taken by an unrelated tenant, or by a PIP-era resource. A collision fails the apply with
`StorageAccountAlreadyTaken`. Check before applying:
`az storage account check-name --name cathsademo`. If taken, the name pattern must change (e.g.
`cathsa{env}01`), which is a `ForceNew` on the existing `cathsaaat` — see the warning at
`infrastructure/main.tf:20-25`, so any pattern change must be scoped so `aat` keeps its current name.

### 3.6 Environment whose infrastructure is not yet applied

The deploy does **not** fail fast. Sequence of what actually happens:

1. `helm upgrade` succeeds in creating objects.
2. The CSI SecretProviderClass for `keyVaults.cath` points at a non-existent `cath-demo` vault.
3. Pods stay in `ContainerCreating` with events like
   `failed to get secretproviderclass ... FetchSecret ... VaultNotFound`.
4. `--atomic --timeout 15m0s` (`job.helm-deploy.yml:181`) rolls the release back after 15 minutes.
5. The job's 35-minute timeout (`job.helm-deploy.yml:52`) is not reached, so the failure is at least
   reported rather than cancelled.

Total cost of the mistake: ~15 minutes and a rolled-back release. Diagnose with
`kubectl describe pod -n cath` and `kubectl get events -n cath --sort-by='.lastTimestamp'`. This is
why Phase 1 must be fully applied before the first Phase 2 run, and why adding
`workflow_dispatch` matters — you want to trigger the first deploy deliberately.

Partial application is worse than none: if the vault exists but a secret is missing (say
`session-secret` was not seeded), the same `VaultNotFound`-class failure occurs per-secret and is
easy to misread as an infrastructure problem. Seed all 22 before the first deploy.

### 3.7 Per-environment Terraform state container does not exist

If `tfstate-demo` is absent and the library does not create it, `terraform init` fails with
`containers/tfstate-demo ... ContainerNotFound`. Because `fail-fast: false` is set, `aat` still
applies. Fix out-of-band with `az storage container create`. Do **not** work around it by pointing
the new environments at `tfstate-aat` via `state-store-container-name` — that would put four
environments in one state file and make a `demo` mistake destroy `aat` resources.

### 3.8 `00` vs `01` cluster selection

`cft-{env}-00` is the current assumption, matching `job.helm-deploy.yml:116-117`. CNP provides both
`00` and `01` for demo/ithc/perftest. If a service is only onboarded to `01`, `aks-set-context`
fails with `ResourceNotFound` on `cft-demo-00-aks`. Mitigate by making the suffix an input
(`cluster-suffix`, default `00`) so switching is a one-line workflow change rather than a code
change. See CLARIFICATIONS.

Second-order risk: if a service is deployed to both `00` and `01`, both clusters run a `cath-web`
and both traefiks claim the host — the same intermittent-502 failure mode described at
`helm/cath-service/values.template.yaml:18-31`. Only ever target one cluster from this pipeline.

### 3.9 Key Vault soft-delete / purge-protection name collisions

Three vaults per environment are created: `cath-{env}` (`keyvault.tf`),
`cath-bootstrap-{env}` (`keyvault-bootstrap.tf:29`), `cath-tp-{env}`
(`keyvault-third-party.tf:4`). Longest name is `cath-bootstrap-perftest` at 23 characters — inside
the 24-character limit, but with only one character of headroom. Any future prefix change breaks
perftest first.

Vault names are globally unique *and* reserved for the soft-delete retention window (typically 90
days) after deletion. If a PIP/SDS-era `cath-demo` or `cath-tp-demo` was ever created and deleted,
the apply fails with `VaultAlreadyExists` / "exists in soft deleted state". Resolution is
`az keyvault list-deleted` then either `az keyvault recover` (preferred — Terraform will then adopt
it, though it may need importing) or `az keyvault purge` (blocked if purge protection is on, in which
case you wait out the retention period or rename). Check all nine names before the first apply.

### 3.10 CFT IDAM host may not exist per environment

`apps/web/helm/values.yaml:34` sets
`CFT_IDAM_URL: https://idam-web-public.{{ .Values.global.environment }}.platform.hmcts.net`. Preview
already has to override this back to aat (`values.preview.template.yaml:36`) because no
`idam-web-public.preview...` exists. `idam-web-public.ithc...` and `...perftest...` are likely
absent too. This does not fail the deploy or the smoke test (which only checks `/`), but CFT IDAM
login will 502. If confirmed absent, add a `CFT_IDAM_URL` override to `values.template.yaml` driven
by the same resolve step.

### 3.11 Image tag absent in ACR

Covered in §2.3: the per-app fallback from `aat-<sha>` to the floating `aat` is required. If neither
exists (e.g. the branch was synced from a master commit whose build failed), fail the resolve job
with an explicit error rather than letting the deploy get to `ImagePullBackOff` 15 minutes later.

---

## 4. Acceptance Criteria Mapping

### Phase 1 — Infrastructure

| AC | How satisfied | How verified |
| --- | --- | --- |
| Terraform runs for `demo`, `ithc`, `perftest` as well as `aat`; `stage.infrastructure.yml` no longer hardcodes one environment | `environments` JSON input + matrix with `include` (§1.3); `workflow.main.yml:40-47` passes all four | Master run shows four `Terraform` matrix legs. Verifiable in CI. |
| Terraform state separated per environment | No code change — `state.tf:2` empty backend plus the library's `tfstate-{environment}` default (§1.4) | `az storage container list --account-name mgmtstatestorenonprod` shows four containers; init log shows the container name per leg. **Requires the containers to exist (§3.7).** |
| Per-env resources provisioned (app KV, bootstrap KV, Postgres, Redis, `cathsa{env}`, App Insights, `cath` MI) | Existing `infrastructure/*.tf`, all keyed on `var.env`; plus `env-config.tf` for subnet/sizing variance (§1.5) | `terraform apply` output, then `az resource list -g cath-demo -o table`. **Only verifiable after the out-of-band first apply.** |
| `AZURE_CREDENTIALS_CFT_{DEMO,ITHC,PERFTEST}` repo secrets added | **Out-of-band only** (§2.7 item 1) — cannot be done from this repo | Settings → Secrets shows all three. Indirectly proven when a deploy authenticates. **Blocked on whoever owns SP creation (see CLARIFICATIONS).** |
| Each new bootstrap KV seeded with the secrets the apps mount | **AC is wrong as written** (§2.5). The apps mount `cath-{env}`, not `cath-bootstrap-{env}`. Deliverable is: 22 secrets seeded into `cath-{env}`; bootstrap vaults created empty. | `az keyvault secret list --vault-name cath-demo` contains all 22 plus the 12 Terraform-managed ones. **Out-of-band; values never committed.** Needs the AC reworded. |
| KV access policies grant the `cath` workload identity read access, matching the vault-wide pattern | No code change — `create_managed_identity = true` at `keyvault.tf:17` (§2.6) | `az keyvault show --name cath-demo --query properties.accessPolicies`; ultimately proven by pods reaching `Running`. |
| `terraform plan` clean and `apply` succeeds per environment | Achieved once §1.5 variance is correct | Master run: four green legs, plan showing no changes on a second run. **Out-of-band apply; may surface §3.5 / §3.9 collisions.** |

### Phase 2 — Deploy workflows

| AC | How satisfied | How verified |
| --- | --- | --- |
| `workflow.{demo,ithc,perftest}.yml` created, each on push to its branch | Three new files (§2.1) | Files present; runs appear on push. **Blocked on #1020 for the push trigger** — verify via `workflow_dispatch` in the interim. |
| Each skips the build stage entirely and deploys the master-promoted tag | No reference to `stage.build.yml`; `job.resolve-promoted-images.yml` resolves `aat-<short-sha>` with a floating-`aat` fallback; new `image-tag` input threads it to Helm (§2.3) | Run graph shows no Build job. Deployed pod image equals the aat pod image: `kubectl get deploy -n cath -o jsonpath='{..image}'` in both clusters. **Requires the `image-tag` plumbing and the `set-image-variables.sh` change — the current pipeline exposes no consumable promoted tag.** |
| Each calls `stage.deploy.yml` then `stage.smoke-test.yml`, as `workflow.main.yml` does | Mirrors `workflow.main.yml:49-74` minus build/promote/e2e | Run graph. |
| `job.helm-deploy.yml` generalised: cluster/RG derived from environment; correct credentials per environment; `global-environment` set to the target | Single derivation step + `secrets[format(...)]` + one deploy step (§1.2) | Job log shows resolved cluster and `global-environment`; deployed SecretProviderClass references `cath-demo`. |
| A values template exists per environment, or `values.template.yaml` is generalised | **Generalised** — one template; four `.aat.` suffixes replaced with `{{ .Values.global.environment }}` (§2.4). Explicitly do not add per-env templates. | `helm template helm/cath-service -f values.template.yaml --set global.environment=demo` renders demo hosts. Local, verifiable now. |
| `ENABLE_TEST_SUPPORT` false for demo, true for ithc and perftest | `"${ENABLE_TEST_SUPPORT:-true}"` in the template, value set by the resolve step (§2.4) | `kubectl get deploy cath-service-demo-web -n cath -o yaml \| grep -A1 ENABLE_TEST_SUPPORT`; and `/test-support/**` returns 404 on demo, 200 on ithc/perftest. |
| Ingress hosts resolve per environment (`cath-web.demo.platform.hmcts.net` etc.) | **AC needs correcting** (§2.4). This pipeline deploys release-scoped hosts by design; the plain names are Flux-owned and already templated at `apps/web/helm/values.yaml:18` / `apps/api/helm/values.yaml:5`. | `kubectl get ingress -n cath`. **The plain-name half is blocked on #566**, and DNS on the §2.4 step generalisation. |
| A deploy to each new environment completes and smoke tests pass | The above, plus the DNS-step generalisation (§2.4) so hosts resolve | Green `Smoke Test` job. **Blocked on: repo secrets, first apply, secret seeding, #566, #1020.** This is the last AC to close and cannot be closed from a PR alone. |

---

## 5. Open Questions

### CLARIFICATIONS NEEDED

1. **Which cluster does each environment target — `00` or `01`?** `job.helm-deploy.yml:116-117`
   assumes `00`. CNP provides both for demo/ithc/perftest. Getting this wrong is a hard
   `ResourceNotFound`, and targeting both is an intermittent-502 trap (§3.8). Confirm per
   environment from `cnp-flux-config/clusters/{demo,ithc,perftest}`, and confirm whether the choice
   must match wherever the Flux overlay from #566 lands.

2. **Do demo / ithc / perftest need different Postgres sizing from aat?** aat is
   `GP_Standard_D2ds_v4`, 65536 MB, `auto_grow_enabled = true` (`postgres.tf:25-28`). Applying that
   verbatim to three more environments triples that spend for environments that are mostly idle.
   Specifically: can demo and ithc drop to a Burstable SKU, and does perftest need more than
   `D2ds_v4`?

3. **Does perftest need different scaling?** Nothing in this repo pins replica counts for web/api —
   the nodejs base chart's default HPA applies (`apps/postgres/helm/values.yaml` is the only chart
   that disables autoscaling, and only for the migration pod). If perftest is to carry meaningful
   load, it needs explicit `autoscaling.minReplicas` / `maxReplicas` and `cpuRequests` /
   `memoryRequests`, plus a Redis SKU above `Basic C0` (`redis.tf:15-17`, single node, no SLA, no
   replication). What load profile is perftest sized for?

4. **Who provisions the three `AZURE_CREDENTIALS_CFT_*` service principals, and what scope do they
   need?** They need AKS admin on the target cluster (`admin: 'true'`, `job.helm-deploy.yml:118`).
   Separately: does Terraform also need per-environment credentials? Today
   `stage.infrastructure.yml:32` runs *all* Terraform as
   `AZURE_CREDENTIALS_CFT_PREVIEW` against `subscription: DCD-CNP-DEV` with
   `aks-subscription: DCD-CFTAPPS-STG`. For demo/ithc/perftest the Postgres and Redis private
   endpoints need read access to subnets in a *different* CFTAPPS subscription
   (`main.tf:7-11` `azurerm.postgres_network` provider). Either the preview SP is granted network
   read in DCD-CFTAPPS-{DEMO,ITHC,PERFTEST}, or the matrix must pass per-environment credentials.
   Which?

5. **Is `subscription: DCD-CNP-DEV` correct for all three new environments?** Currently hardcoded at
   `stage.infrastructure.yml:27`. If demo/ithc/perftest application resources live in a different
   non-prod subscription, that becomes a per-environment matrix field too.

6. **Does the expanded Postgres subnet exist in the demo / ithc / perftest vnets?**
   `postgres.tf:16-17` sets `subnet_suffix = "expanded"` with the comment "original postgresql
   subnet is full" — a stg-specific fact. If the expanded subnet does not exist in the other vnets,
   the module fails on subnet lookup and `subnet_suffix` must be per-environment
   (`""` for the new ones).

7. **Should `cath-bootstrap-{demo,ithc,perftest}` be seeded at all?** E2E on the new environments is
   Out of Scope, and both `job.e2e-test.yml:44` and `nightly.yml:88` hardcode `cath-bootstrap-aat`.
   Recommendation: create the vaults (Terraform does this already) and seed nothing. Confirm, and
   reword the Phase 1 AC to point the app secrets at `cath-{env}` (§2.5).

8. **Is the ingress-host AC intended as release-scoped or plain?** As written it asks this pipeline
   to claim `cath-web.demo.platform.hmcts.net`, which collides with the Flux release and reproduces
   the documented 502 (§2.4). Confirm the plain names are Flux's and this pipeline stays
   release-scoped, as on aat.

9. **Who registers the OIDC redirect URIs for the new hosts?** `apps/web/helm/values.yaml:28-33`
   makes `BASE_URL` the basis for every SSO / B2C / CFT IDAM redirect URI. New per-environment hosts
   mean new redirect URIs on `sso-client-id` and the B2C app registrations, or login fails with
   AADSTS50011 — exactly the failure documented at
   `helm/cath-service/values.preview.template.yaml:66-72`. Also: are demo/ithc/perftest meant to
   reuse the aat SSO app registration, or get their own?

10. **Do `idam-web-public.ithc.platform.hmcts.net` and `...perftest...` exist?** If not,
    `CFT_IDAM_URL` (`apps/web/helm/values.yaml:34`) needs a per-environment override, as preview
    already does (§3.10).

11. **What is the promotion contract meant to be?** The ticket says "the image tag promoted by the
    master build", but `job.promote-images.yml:81-93` produces `prod-<sha>-<timestamp>` (timestamp
    never exposed) and `latest` (mutable, no-op rollouts). This plan resolves `aat-<short-sha>`
    instead. If `prod-*` is the intended contract, `job.promote-images.yml` must emit the tag as an
    output and `stage.promote-images.yml` must surface it — additional scope. Confirm which.

12. **Do the three Terraform state containers already exist in `mgmtstatestorenonprod`, and does the
    library create them?** Determines whether task 3 in tasks.md is needed (§3.7).
