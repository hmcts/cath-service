# #1020 — Deploy Demo and Perftest from the master build after successful promote

## 1. Technical Approach

### Strategy

Add a bare `workflow_call:` trigger to the existing `workflow.demo.yml` and `workflow.perftest.yml`. Then add two sibling jobs to `workflow.main.yml`, `deploy-demo` and `deploy-perftest`, that `uses:` those workflows. Both are gated on `needs.promote-stage.result == 'success'`. Nothing in the deploy chain is duplicated, and no job, script or input changes. The only edits are triggers, two caller jobs and comments.

The resulting master run graph:

```
build-stage ─► deploy-stage (aat) ─► smoke-test-stage ─► promote-stage ─┬─► deploy-demo     (resolve ─► deploy ─► smoke)
                                                                        └─► deploy-perftest (resolve ─► deploy ─► smoke)
```

### Findings from the repo (points 1–9)

**1. Nesting depth: no blocker.**
The deepest path is `workflow.main.yml` → `workflow.demo.yml` → `stage.deploy.yml` (`workflow.demo.yml:32`) → `job.helm-deploy.yml` (`stage.deploy.yml:57`). The smoke path has the same depth: `workflow.demo.yml:50` → `stage.smoke-test.yml` → `job.smoke-test.yml` / `job.pr-comment.yml` (`stage.smoke-test.yml:29,36`). `job.helm-deploy.yml` has no `uses: ./` of its own, and neither do the smoke or PR-comment jobs.
- That makes 4 levels (caller plus 3 nested). This fits both the old limit of 4 levels and the current raised limit of 10.
- Count of unique reusable workflows: the current master run already loads 24. Those are detect-changes, stage.build, lint, test, osv-scanner, google's `osv-scanner-reusable.yml` (`job.osv-scanner.yml:17`), build-and-publish-images, stage.infrastructure, terraform-fmt, terraform, stage.deploy, helm-deploy, stage.smoke-test, pr-comment, smoke-test, stage.e2e, e2e-test, stage.cleanup, helm-cleanup, stage.promote-images, promote-images, helm-publish, publish-openapi and save-successful-sha.
- Run 36410845956 succeeded with those 24, which is only possible under the raised limit of 50 unique workflows. Adding `workflow.demo.yml`, `workflow.perftest.yml` and `job.resolve-promoted-images.yml` brings the total to 27.

**2. Permissions: no change needed. Do NOT add a partial `permissions:` block to the caller jobs.**
- `workflow.main.yml` has no top-level `permissions` and no job-level `permissions`. The repo default is `default_workflow_permissions: write` (checked via `gh api repos/hmcts/cath-service/actions/permissions/workflow`).
- The chain declares these job-level permissions:
  - `job.resolve-promoted-images.yml:43-45`: `contents: read`, `id-token: write`
  - `job.helm-deploy.yml:73-76`: `contents: read`, `id-token: write`, `pull-requests: write`
  - `job.smoke-test.yml`: none
  - `job.pr-comment.yml:22-23`: `pull-requests: write`, but the job is skipped because `is-pr` defaults to false
- The same main run already grants these through the same `stage.deploy.yml` → `job.helm-deploy.yml` path for aat, including OIDC `azure/login`. See `workflow.main.yml:57-72`; the job "Deploy to AAT / Deploy / Deploy to aat" succeeded in run 36410845956. `stage.promote-images` → `job.promote-images.yml:34-36` also uses `id-token: write` successfully.
- **Trap:** if someone later adds `permissions:` to `deploy-demo` or `deploy-perftest`, it caps every nested job. It must then include at least `contents: read`, `id-token: write` and `pull-requests: write`. `job.helm-deploy.yml` requests `pull-requests: write` unconditionally, and GitHub rejects the whole `Main` workflow at load time if a nested job asks for more than the caller grants. That would block aat as well. Keep the caller jobs consistent with every other job in `workflow.main.yml` and declare no permissions.

**3. Concurrency: no deadlock. Keep the top-level group.**
- The `workflow.main.yml:8-10` group is `main`. The `workflow.demo.yml:19-21` and `workflow.perftest.yml:19-21` groups are `demo` and `perftest`, all with `cancel-in-progress: false`.
- GitHub honours a called workflow's top-level `concurrency`. Deadlock only happens when a called workflow uses the same group as its caller, and these names are all distinct.
- The groups are useful when called from main. They serialise a master-triggered deploy against a manual `workflow_dispatch` of the same Helm release (`cath-service-demo`), so two `helm upgrade`s never race on one release.
- **Residual risk (accepted, documented):** a concurrency group holds at most one running and one pending run, and a newer pending run replaces the older one.
  - Because `main` serialises master runs, at most one master-originated caller is ever in `demo` or `perftest`.
  - The master deploy can only be cancelled if a dispatch is running, the master deploy is pending, and a second dispatch is queued behind it.
  - Operational rule: do not dispatch Demo or Perftest while a master run is at or after promote.
- Moving the group to job level (on `deploy-stage` only) has the same pending-replacement semantics and gives no benefit. Keep it as is. Only the comment changes.

**4. Event context: no blocker.**
- In a called workflow, `github.*` is the caller's context: `event_name=push`, `ref=refs/heads/master`, `sha=<master commit>`.
- Every event-dependent value in the chain was checked:
  - `job.resolve-promoted-images.yml:60` uses only `github.sha`. In the master run that is the commit just built, deployed to aat and promoted, which is exactly what the ticket wants.
  - `job.helm-deploy.yml` uses only `inputs.*` and `secrets.*`.
    - The release name comes from `change-id` (`set-image-variables.sh:59-67`), which gives `cath-service-demo` and `cath-service-perftest` regardless of event.
    - Image tags come from `image-tag` (`set-image-variables.sh:81-98`).
  - `stage.smoke-test.yml:28` runs PR Comment only when `inputs.is-pr` is set. It defaults to false (`:14-18`) and the demo/perftest workflows never set it (`workflow.demo.yml:51-54`).
  - `hmcts/cnp-githubactions-library/helm-deploy/action.yaml` reads only `github.server_url` and `github.repository` (lines 266-267, used for `builtFrom`).
  - No cleanup job exists in the demo/perftest chain.
- The only `github.event_name` / `github.ref_name` uses are in `job.lint.yml:50` and `job.save-successful-sha.yml:37`. Neither is in the chain.
- `workflow.demo.yml` and `workflow.perftest.yml` define no `inputs`, so nothing behaves differently between dispatch and call.
- Dispatch versus call: the only difference is which commit `github.sha` points at. When dispatched from master, it is master HEAD.

**5. Secrets: correct.**
- `secrets: inherit` passes through at every level: `workflow.demo.yml:27,44` → `stage.deploy.yml:67`.
- `job.helm-deploy.yml:87,187` reads `secrets[format('AZURE_CREDENTIALS_CFT_{0}', inputs.environment)]`. For these environments that evaluates to `AZURE_CREDENTIALS_CFT_demo` and `AZURE_CREDENTIALS_CFT_perftest`. Secret lookups are case-insensitive, and aat already relies on this.
- The repository secrets exist per `gh secret list`:
  - `AZURE_CREDENTIALS_CFT_DEMO`, added 2026-09-22
  - `AZURE_CREDENTIALS_CFT_PERFTEST`, added 2026-09-23
  - `AZURE_CLIENT_ID` and `AZURE_TENANT_ID`, used by `job.resolve-promoted-images.yml:81-82` and `job.helm-deploy.yml:170-171`
- `stage.deploy.yml` does not use GitHub `environment:` protection, so there are no environment-scoped secrets or approval gates to worry about.
- The new caller jobs must pass `secrets: inherit`.

**6. `job.resolve-promoted-images.yml`: keep as is.**
- When called from main it gives the same answer as build-stage's outputs:
  - `short-sha` is `github.sha` cut to 7 characters, the same derivation as build.
  - Apps built in this run get `aat-<short-sha>`.
  - Apps not built fall back to the floating `aat` tag (`:105-117`). That is exactly what aat just ran and smoke-tested, because `set-image-variables.sh:117-130` gives unaffected apps the floating `change-id` tag.
- The `main` concurrency group means no other run can move the floating `aat` tag between build and resolve.
- Passing build outputs through instead would mean adding `workflow_call.inputs` to both workflows, plus a second code path to keep dispatch working. That is duplication with no correctness gain.
- Cost: one extra job of about 1 minute per environment.

**7. Trailing jobs: none should depend on the new jobs.**
- `save-code-success` (`workflow.main.yml:123-129`) depends on `build-stage` only. It already does not wait for the aat deploy, and the cache it writes decides what the next build rebuilds, not where it deploys.
- `stage.promote-images.yml:41-54` records the docker-build SHA inside promote and must stay independent of demo/perftest. Otherwise a demo failure would force aat to rebuild.
- `publish-openapi` and `save-infra-success` are unrelated.
- `cleanup-stage` is `if: false` and targets aat.
- Consequence to accept: if demo fails and the next master push changes no code, build is skipped, so promote and deploy-demo are skipped too, and demo is not retried automatically. Recover with "Re-run failed jobs" on the failed master run, or by dispatching Demo.

**8. Stale comments (grep `1020` / `synced from master`):**
- `workflow.demo.yml:3-9,14-16`
- `workflow.perftest.yml:3-9,14-16`
- `workflow.ithc.yml:3-9,14-16`
- `job.resolve-promoted-images.yml:3-4,13-15`

Branch sync now belongs to #1084 and ITHC to #1082. The "all four environments" wording is also stale, because ithc is parked (`workflow.main.yml:50-54`). `workflow.ithc.yml` gets a comment-only change and no `workflow_call`.

**9. Workflow lint and tests: none in CI.**
- No actionlint or yamllint config, and no test reads `.github/workflows`.
- `lefthook.yml` runs Biome only, which does not lint YAML.
- `job.lint.yml` lints TypeScript packages.
- An invalid `workflow.demo.yml` would make the entire `Main` workflow fail at load time, including aat. Run actionlint locally before pushing (see tasks).

### Key considerations
- The deploys run after promote, so they cannot affect aat's deploy, smoke test or promotion. A failure makes the master run red and nothing else.
- Demo and perftest are separate jobs, not a matrix, so there is no fail-fast and one cannot cancel the other.
- `always()` is required in the `if:`. `infrastructure-stage` is normally skipped, and without `always()` the implicit `success()` treats a skipped ancestor as a reason to skip. This matches the existing pattern at `workflow.main.yml:61,77,107`.
- Master run time grows by the slower of the two parallel chains: resolve (about 1 min), helm deploy (up to 15 min timeout, `job.helm-deploy.yml:195`) and smoke (up to about 3.5 min). Today the run takes about 16 min.

## 2. Implementation Details

TEMPLATE SOURCE: n/a

No pages, list types, libs or apps change. Only `.github/workflows/` changes.

### 2.1 `.github/workflows/workflow.demo.yml` (lines 1-21)

```yaml
name: Demo

# Deploys the image master already built and promoted. There is deliberately no
# build, promote or e2e stage here: rebuilding would produce a different image
# for the same source.
#
# How it runs:
#   - workflow_call: workflow.main.yml calls this once promote-stage succeeds, so
#     github.sha is the master commit just built, deployed to aat, smoke-tested
#     and promoted.
#   - workflow_dispatch: redeploys the dispatched ref's HEAD (normally master).
#   - push to demo: inert until the demo branch exists. Moving the deploy onto a
#     dedicated branch is #1084.
#
# Infrastructure is applied from master (stage.infrastructure.yml runs Terraform
# for every non-prod environment), so it is not repeated here either.
on:
  push:
    branches:
      - demo
  workflow_dispatch:
  workflow_call:

# Serialises a master-triggered deploy against a manual dispatch of the same
# release. It must differ from the caller's `main` group: a called workflow
# sharing its caller's group deadlocks.
concurrency:
  group: demo
  cancel-in-progress: false
```

A bare `workflow_call:` is valid and already used, for example at `job.lint.yml:3-4`. Jobs (lines 23-54) are unchanged.

### 2.2 `.github/workflows/workflow.perftest.yml` (lines 1-21)

This is identical to 2.1 with `demo` replaced by `perftest` in the name, the push branch, the comment and the concurrency group. Jobs (lines 23-55) are unchanged.

### 2.3 `.github/workflows/workflow.main.yml`: insert after `promote-stage` (after line 114)

```yaml
  # Demo and perftest redeploy the image promote-stage just promoted. They run
  # after promote, so a failure here turns the run red but cannot touch aat.
  # Separate jobs rather than a matrix, so one environment failing cannot cancel
  # the other. Keyed off promote-stage, so if promotion moves behind E2E (#1004)
  # these inherit that gate.
  deploy-demo:
    name: Demo
    needs: [promote-stage]
    if: always() && needs.promote-stage.result == 'success'
    uses: ./.github/workflows/workflow.demo.yml
    secrets: inherit

  deploy-perftest:
    name: Perftest
    needs: [promote-stage]
    if: always() && needs.promote-stage.result == 'success'
    uses: ./.github/workflows/workflow.perftest.yml
    secrets: inherit
```

These jobs deliberately have no `permissions:` (see finding 2) and no `with:`, because the called workflows take no inputs. The job names give readable check names in the run, for example `Demo / Deploy to Demo / Deploy / Deploy to demo` and `Perftest / Smoke Test / Smoke Test / Smoke Test`. These are distinct from aat's `Deploy to AAT / …` and `Smoke Test / …`.

### 2.4 `.github/workflows/job.resolve-promoted-images.yml` (lines 3-15)

```yaml
# Resolves the image tag the master build already pushed, so the demo and
# perftest deploys (and ithc, once #1082 lands) reuse it instead of rebuilding.
#
# Why aat-<short-sha> and not the promote stage's tags:
#   - prod-<sha>-<timestamp> (job.promote-images.yml) generates the timestamp
#     inside the step and never emits it, so the tag cannot be reconstructed here
#   - `latest` and the floating `aat` tag are mutable, so redeploying them
#     produces an identical pod spec and Kubernetes performs no rollout at all -
#     the deploy silently no-ops
#
# workflow.main.yml calls the demo/perftest workflows after promote-stage, so
# github.sha is the commit that run built, smoke-tested and promoted, and
# aat-<short-sha> names exactly that image. A workflow_dispatch resolves the
# dispatched ref's HEAD the same way.
```

### 2.5 `.github/workflows/workflow.ithc.yml` (lines 3-16): comment only, no trigger change

```yaml
# Deploys the image master already built and promoted. There is deliberately no
# build, promote or e2e stage here: rebuilding would produce a different image
# for the same source.
#
# Not yet called from workflow.main.yml: ithc cannot be provisioned until its
# key vault name frees up (#1067). Wiring it in, like demo and perftest, is
# #1082. Until then it only runs on workflow_dispatch, or on push to an ithc
# branch, which does not exist (#1084).
#
# Infrastructure is applied from master (stage.infrastructure.yml), so it is not
# repeated here either.
```

## 3. Error Handling & Edge Cases

| Case | Behaviour | Mitigation |
|---|---|---|
| Application secrets missing from `cath-demo` / `cath-perftest` Key Vault | CSI secret-store mount fails, so pods stay `ContainerCreating` and `helm upgrade` hits its 15m timeout (`job.helm-deploy.yml:195`). The job is capped at 35m (`:68`). The cnp action's recovery handles the release left in pending state on the next run. The master run goes red about 20 minutes late. | Prerequisite check in tasks before the manual dispatch. The manual dispatch surfaces it without turning master red. |
| Flux has not reconciled the `cath` namespace on `cft-demo-00` / `cft-perftest-00` | `helm upgrade` fails fast with `namespaces "cath" not found`. | Prerequisite `kubectl get ns cath` check, then the manual dispatch. |
| `AZURE_CREDENTIALS_CFT_<ENV>` missing | Fails fast with an explicit error (`job.helm-deploy.yml:95-98`). | Both secrets exist today. |
| DNS registration or resolution fails for `*.demo.platform.hmcts.net` | "Register DNS" (`job.helm-deploy.yml:200-256`) fails if the CFT SP lacks rights on zone `demo.platform.hmcts.net` in `DTS-CFTPTL-INTSVC`. Alternatively, the smoke test on `azure-prod` gets HTTP 000. | Caught by the manual dispatch. See Clarification 3. |
| Demo fails, perftest succeeds (or the reverse) | The jobs are independent, so the other environment completes. The master run conclusion is `failure`. aat is already promoted and unaffected. | Use "Re-run failed jobs" on the master run. Resolve re-reads the same `github.sha`, so it redeploys the same image. Alternatively, dispatch the workflow while master HEAD is still that commit. |
| Master push that builds nothing (no code changes, so `build-stage` is skipped) | The aat deploy, smoke and promote are skipped, so `deploy-*` is skipped. Demo and perftest stay on the previous image. This is correct, because nothing new was promoted. | None needed. |
| Infra-only change | Same as above: no build, so no demo/perftest deploy. | None needed. Infra still applies for demo and perftest. |
| `build-stage` fails or aat smoke fails | `promote-stage` is not `success`, so the deploys are skipped. Demo and perftest never get an image that failed aat. | By design. |
| Some apps unaffected in this build | Resolve falls back to the floating `aat` tag with a `::warning::` (`job.resolve-promoted-images.yml:111-113`). This is the same image aat is running. | Expected. The warning shows in the run annotations. |
| Concurrent master merges | The `main` group serialises runs. Because runs are longer, more pushes collapse and the newer pending run replaces the older one. That is pre-existing behaviour, made more frequent here. The surviving run builds everything changed since the last successful build SHA and deploys HEAD. | Accept. #1084 decouples the deploys if run time becomes a problem. |
| Manual dispatch while a master run is deploying the same env | The master deploy waits in the `demo` group. With a second dispatch queued, the pending master deploy is replaced and cancelled, and the master run is not green. | Operational rule: do not dispatch while master is at or after promote. |
| Dispatch when master HEAD built nothing | Every app falls back to the floating `aat` tag, which is the latest aat image. Harmless. | Prefer dispatching when HEAD is a built commit. It is today (`eebb2e48`, run 36410845956 built web, api and postgres). |
| Invalid YAML or schema in the called workflows | The whole `Main` workflow fails to load, including aat. | Run actionlint locally, and dispatch the edited workflows from the feature branch before merging (see tasks). |

## 4. Acceptance Criteria Mapping

| AC | How satisfied | How verified |
|---|---|---|
| `workflow.demo.yml` and `workflow.perftest.yml` gain `workflow_call:` and keep `push` and `workflow_dispatch` | 2.1 and 2.2 | Diff review. actionlint passes. Both remain dispatchable in the Actions UI. |
| `workflow.main.yml` gains `deploy-demo` and `deploy-perftest` that `uses:` the existing workflows | 2.3 | Diff: `uses: ./.github/workflows/workflow.{demo,perftest}.yml`, no copied jobs. |
| …run only when `promote-stage` is `success` | `if: always() && needs.promote-stage.result == 'success'` | The first master run shows them running after Promote. A run where smoke fails shows them skipped. |
| …run independently | Two sibling jobs with `needs: [promote-stage]` only, no matrix | Run graph shows two parallel branches. |
| …pass `secrets: inherit` | 2.3 | Diff review. The deploy logs show Azure login succeeding. |
| One manual `workflow_dispatch` of each workflow succeeds before wiring into master | Tasks 3-4, dispatching the existing master copies, done before the PR merges | Links to the two green Demo and Perftest runs recorded in the PR description. |
| A merge to master deploys to demo and perftest, and smoke tests pass on both | The PR changes `.github/workflows/`, which is in the code-change paths (`workflow.main.yml:17`), so the merge itself triggers a full build and deploy chain | The merge commit's master run shows `Demo / Smoke Test …` and `Perftest / Smoke Test …` green. `helm history cath-service-demo -n cath` shows a new revision with image `aat-<sha>`. |
| The full chain is observable in the master run | One run graph: Build → Deploy to AAT → Smoke Test → Promote → Demo / Perftest (resolve → deploy → smoke) | Screenshot or link of the run graph in the PR. |
| A failed demo or perftest deploy fails the master run visibly and cannot affect aat | The deploys are downstream of promote, and a failing job makes the run conclusion `failure` | Reasoned from the graph, since aat jobs have already completed. Optionally shown by the first dispatch if a prerequisite is missing. Not deliberately induced on master. |
| Comments updated to describe the actual trigger | 2.1, 2.2, 2.4 and 2.5 | `grep -rn "synced from master\|#1020" .github/` returns nothing. |

## 5. CLARIFICATIONS NEEDED

1. **App secrets (dependency ⬜):** who confirms the 22 application secrets are seeded in `cath-demo` and `cath-perftest`, and against which list? Is it the aat vault's secret names? This is the most likely cause of a failed first dispatch.
2. **Flux and cluster:** has #566 reconciled the `cath` namespace on `cft-demo-00` and `cft-perftest-00` specifically? `cluster-suffix` defaults to `00` (`stage.deploy.yml:38-42`).
3. **DNS vs #1021:** the ticket puts DNS out of scope, but the "Register DNS" step and the smoke test both depend on it. The CFT demo/perftest SPs need write access to `demo.platform.hmcts.net` / `perftest.platform.hmcts.net` in `core-infra-intsvc-rg` (`DTS-CFTPTL-INTSVC`). The `azure-prod` runner group must also resolve and reach those hosts. If either is missing, smoke fails and this ticket's "smoke tests pass on both" AC cannot be met until #1021 lands. Does #1021 need to land first?
4. **Perftest test-support:** `job.helm-deploy.yml:113-116` enables test-support endpoints for perftest (demo has them disabled). Is that intended for an environment that will now update on every merge?
5. **ITHC comment:** the AC lists only demo, perftest and resolve, but `workflow.ithc.yml` carries the same stale "#1020" comment. Is a comment-only update there acceptable, or should it be left for #1082?
6. **Longer master runs:** adding about 10-20 minutes to every master run increases push collapsing under the `main` group. Is that acceptable until #1084, or should there be an agreed threshold for pulling the deploys back out?
