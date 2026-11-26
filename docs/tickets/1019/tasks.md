# Tasks: #1019 — Provision and deploy to Demo, ITHC and Perftest (CNP)

Tasks marked **[MANUAL]** cannot be done from this repo and must be done out-of-band.
Tasks marked **[BLOCKED]** depend on another ticket.

## Implementation Tasks

### Pre-flight checks (do these before writing any code)

- [x] Resolve the CLARIFICATIONS NEEDED list in `plan.md` — at minimum items 1 (cluster 00 vs 01), 4 (who provisions the service principals), 5 (application subscription), 6 (expanded Postgres subnet) and 11 (promotion contract). Items 1, 5 and 6 change the code that gets written.
  - 2/3 (sizing): mirror aat everywhere — sizing does **not** vary, so `pgsql_sku`, `pgsql_storage_mb` and the redis `sku_name`/`capacity` stay hardcoded in `postgres.tf`/`redis.tf` and are NOT in `env-config.tf`.
  - 11 (promotion contract): resolve `aat-<short-sha>` per app from ACR with a fallback to the floating `aat` tag. `job.promote-images.yml` and `stage.promote-images.yml` unchanged.
  - 1 (cluster): **assumed `00`**, parameterised as the `cluster-suffix` input (default `"00"`) on `job.helm-deploy.yml` and `stage.deploy.yml`.
  - 6 (subnet): **assumed** `"expanded"` for aat, module default (`null`) for demo/ithc/perftest — `infrastructure/env-config.tf`.
  - 5 (subscription): `DCD-CNP-DEV` for all four, now a per-environment lookup in `stage.infrastructure.yml`.
  - 4 (Terraform credentials): unchanged — still `AZURE_CREDENTIALS_CFT_PREVIEW`.
- [ ] **[MANUAL]** Check storage account name availability: `az storage account check-name --name cathsademo`, `cathsaithc`, `cathsaperftest`. — [MANUAL: not actionable from repo]
- [ ] **[MANUAL]** Check for soft-deleted Key Vaults blocking the nine new names (`cath-{env}`, `cath-bootstrap-{env}`, `cath-tp-{env}` for demo/ithc/perftest): `az keyvault list-deleted`. — [MANUAL: not actionable from repo]
- [ ] **[MANUAL]** Confirm whether `tfstate-demo`, `tfstate-ithc`, `tfstate-perftest` exist in `mgmtstatestorenonprod`, and whether the CNP terraform-deploy library creates them. — [MANUAL: not actionable from repo]

### Phase 1 — Infrastructure

- [x] Create `infrastructure/env-config.tf` with a `locals.env_config` map keyed on `var.env` covering `subnet_suffix`, ~~`pgsql_sku`, `pgsql_storage_mb`, redis `sku_name` and `capacity`~~, with `aat` values matching today exactly. Sizing removed per the decision to mirror aat everywhere — the map carries only `subnet_suffix`.
- [x] Update `infrastructure/postgres.tf:17` to read from `local.env_config[var.env]` (via `local.postgres_subnet_suffix`). Lines 25/27 (`pgsql_sku`, `pgsql_storage_mb`) deliberately unchanged.
- [x] ~~Update `infrastructure/redis.tf:15-17` to read from `local.env_config[var.env]`~~ — not done by decision: redis sizing is identical in all four environments, so `redis.tf` is untouched.
- [x] Run `terraform fmt -check infrastructure/` locally (`job.terraform-fmt.yml` gates the plan).
- [x] Add an `environments` JSON input to `.github/workflows/stage.infrastructure.yml` (default `'["aat"]'`), convert the `terraform` job to a `fail-fast: false` matrix over it, and ~~use `include` to attach `aks-subscription` per environment~~ use inline `fromJson` lookups for `subscription` and `aks-subscription`. `include:` cannot be used: an include entry that overrides an existing matrix key ADDS a combination rather than annotating one, so a caller passing `'["aat"]'` would have silently planned all four environments.
- [x] Remove the `plan-exitcode` output from `.github/workflows/stage.infrastructure.yml:11-14` — it becomes non-deterministic under a matrix and nothing consumes it.
- [x] Update `.github/workflows/workflow.main.yml:40-47` to pass `environments: '["aat","demo","ithc","perftest"]'`. Leave `workflow.preview.yml:40-47` on the `["aat"]` default.
- [ ] **[MANUAL]** Create the three service principals and add `AZURE_CREDENTIALS_CFT_DEMO`, `AZURE_CREDENTIALS_CFT_ITHC`, `AZURE_CREDENTIALS_CFT_PERFTEST` as GitHub repository secrets, with AKS admin on the target clusters. — [MANUAL: not actionable from repo]
- [ ] **[MANUAL]** Create the three Terraform state containers, if the library does not. — [MANUAL: not actionable from repo]
- [ ] Open the Phase 1 PR; confirm the PR run still plans only `aat` and is unchanged. — [MANUAL: not actionable from repo — no PR opened, no push]
- [ ] Merge to `master`; confirm four green `Terraform` matrix legs and a successful `apply` for demo, ithc and perftest. — [MANUAL: not actionable from repo]
- [ ] **[MANUAL]** Verify per-environment resources exist: `az resource list -g cath-demo -o table` (repeat for ithc, perftest), including `cathsa{env}` in `cath-{env}` — the new environments put the storage account in the shared group, so `az group show -n cath-{env}-cath` must return `ResourceNotFound`. — [MANUAL: not actionable from repo]
- [ ] **[MANUAL]** Seed the 22 application secret **values** into `cath-demo`, `cath-ithc` and `cath-perftest` (full list in `plan.md` §2.5). Never commit values. Do not seed the Terraform-managed secrets, and do not create the `-dev` SSO secrets. — [MANUAL: not actionable from repo]
- [ ] **[MANUAL]** Confirm the `cath` managed identity has read access on each `cath-{env}` vault: `az keyvault show --name cath-demo --query properties.accessPolicies`. — [MANUAL: not actionable from repo]
- [ ] Re-run the master infrastructure stage and confirm a clean second plan (no changes) for all four environments. — [MANUAL: not actionable from repo]

### Phase 2 — Deploy workflows

- [x] Generalise `helm/cath-service/values.template.yaml`: replace `.aat.platform.hmcts.net` at lines 35, 37, 45 and 62 with `.{{ .Values.global.environment }}.platform.hmcts.net`, and lines 38 and 47 with `ENABLE_TEST_SUPPORT: "${ENABLE_TEST_SUPPORT:-true}"`.
- [x] Verify locally: `helm template helm/cath-service -f helm/cath-service/values.template.yaml --set global.environment=demo` renders demo hosts and no `.aat.` remains. Verified for all four environments.
- [x] Add an optional 7th `image_tag_override` argument to `.github/workflows/jobs/build-and-publish-images/set-image-variables.sh` that, when set, emits `{APP}_IMAGE=<override>` for every entry in `helm_apps` and bypasses the affected/not-affected branch at lines 65-96. Keep `RELEASE_NAME` derivation unchanged. Also accepts a JSON object of app -> tag, because the ACR fallback in plan.md §2.3 can legitimately resolve different tags for different apps.
- [x] Add `image-tag` and `cluster-suffix` inputs to `.github/workflows/job.helm-deploy.yml` (defaults `""` and `00`).
- [x] Add a `Resolve environment configuration` step to `job.helm-deploy.yml` that writes `CLUSTER`, `GLOBAL_ENVIRONMENT`, `VALUES_TEMPLATE`, `ENABLE_TEST_SUPPORT` and `DNS_ZONE` to `$GITHUB_ENV` from one `case` block, and fails with an explicit error if the resolved Azure credentials are empty.
- [x] Replace the credentials ternary at `job.helm-deploy.yml:111` with `secrets[format('AZURE_CREDENTIALS_CFT_{0}', inputs.environment)]`, and the cluster/RG ternaries at lines 116-117 with the derived `CLUSTER`. **Dynamic secret indexing has not been executed on a branch** — see the risk note in `plan.md` §1.2; if it does not resolve, the fallback is five named `secrets:` inputs.
- [x] Collapse the two deploy steps (`job.helm-deploy.yml:147-181`) into a single `hmcts/cnp-githubactions-library/helm-deploy@main` step driven by the resolved values.
- [x] Generalise the DNS step: change the guard at `job.helm-deploy.yml:184` to `inputs.environment != 'preview'` and the zone at line 190 to `${{ inputs.environment }}.platform.hmcts.net` (via `DNS_ZONE`).
- [x] Add the `image-tag` input to `.github/workflows/stage.deploy.yml` and pass it through to `job.helm-deploy.yml`. `cluster-suffix` is threaded through too, so overriding `00` -> `01` stays a one-line change.
- [x] Create `.github/workflows/job.resolve-promoted-images.yml`: outputs `helm-apps`, `image-tag`, `short-sha`, `timestamp`. Resolves `aat-<short-sha>` per app via `az acr repository show-tags`, falls back to the floating `aat`, and fails loudly if neither exists.
- [x] Create `.github/workflows/workflow.demo.yml`: `on: push: branches: [demo]` plus `workflow_dispatch`, concurrency group `demo`; jobs = resolve-promoted-images → `stage.deploy.yml` (`change-id: demo`, `environment: demo`, `affected-apps: '[]'`) → `stage.smoke-test.yml` (`runner-group: azure-prod`). No build, no promote, no e2e.
- [x] Create `.github/workflows/workflow.ithc.yml` — identical apart from branch, concurrency group and `demo` → `ithc`.
- [x] Create `.github/workflows/workflow.perftest.yml` — identical apart from branch, concurrency group and `demo` → `perftest`.
- [x] Run `yarn test` and `yarn lint:fix` — `yarn lint` is green (70/70). `apps/web/helm/values.yaml.test.ts` guards the keyVault lists: 6 tests, passing. `apps/web` tests pass in isolation (376 files / 3907 tests). The full-workspace `yarn test` fails one `@hmcts/web` test per run, a different one each time, always with a 10s hook/test timeout, and always passing in isolation — reproduced on a stashed clean tree, so it is machine-load flakiness, not this change.
- [x] Confirm the aat path is unchanged: master still deploys `cath-service-aat` (change-id `aat`) to `cft-aat-00` (`cluster-suffix` default `00`) with `ENABLE_TEST_SUPPORT=true` and release-scoped `.aat.` hosts (verified by `helm template --set global.environment=aat`).
- [ ] Open the Phase 2 PR and confirm the preview deploy is unaffected (still `cft-preview-00`, `global-environment: aat`, `values.preview.template.yaml`). — [MANUAL: not actionable from repo — no PR opened. The three values are asserted in the `preview)` branch of the new `case` block in `job.helm-deploy.yml`.]

### Verification (after both phases merge)

- [ ] **[BLOCKED #566]** Confirm the Flux overlays for demo, ithc and perftest exist and the `cath` namespace is present in each target cluster. — [BLOCKED #566]
- [ ] **[MANUAL]** Trigger `workflow.demo.yml` via `workflow_dispatch`; confirm no Build job runs, the deployed image matches the aat image, and the smoke test passes. — [MANUAL: not actionable from repo]
- [ ] **[MANUAL]** Repeat the dispatch verification for ithc and perftest. — [MANUAL: not actionable from repo]
- [ ] **[MANUAL]** Confirm `ENABLE_TEST_SUPPORT`: `/test-support/**` returns 404 on demo and 200 on ithc and perftest. — [MANUAL: not actionable from repo]
- [ ] **[BLOCKED #1020]** Create the `demo`, `ithc` and `perftest` branches from master and confirm the push trigger fires and deploys end to end. — [BLOCKED #1020]
- [ ] **[MANUAL]** Register the new hosts' OIDC redirect URIs on the SSO / B2C app registrations, or record that browser login is knowingly not working on the new environments. — [MANUAL: not actionable from repo]
- [ ] Raise a follow-up to reword the two incorrect ACs on #1019: the bootstrap-vault seeding AC (should target `cath-{env}`) and the ingress-host AC (plain names are Flux-owned; this pipeline is release-scoped). — [MANUAL: not actionable from repo — requires editing the GitHub issue]
