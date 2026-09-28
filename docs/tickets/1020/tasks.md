# #1020 — Tasks

## Implementation Tasks

### Prerequisites (no code; on failure, fix upstream before continuing)
- [ ] Confirm the repository secrets exist: `gh secret list | grep -E "AZURE_CREDENTIALS_CFT_(DEMO|PERFTEST)|AZURE_CLIENT_ID|AZURE_TENANT_ID"`. Already verified present on 2026-09-28.
- [ ] Confirm Flux has created the namespace on each cluster:
  - `az aks get-credentials -g cft-demo-00-rg -n cft-demo-00 && kubectl get ns cath`
  - The same for `cft-perftest-00`
  - If missing, chase #566 reconciliation.
- [ ] Confirm the application secrets are seeded. Compare `az keyvault secret list --vault-name cath-demo --query "[].name" -o tsv | sort` against the `cath-aat` list. Do the same for `cath-perftest`. All 22 must be present.
- [ ] Confirm the DNS path (Clarification 3):
  - The CFT demo/perftest SPs can write records in zones `demo.platform.hmcts.net` / `perftest.platform.hmcts.net` (`core-infra-intsvc-rg`, `DTS-CFTPTL-INTSVC`).
  - `azure-prod` runners can resolve those zones.

### Manual deploy before wiring (uses the copies already on master)
- [ ] Confirm master HEAD was built by a green master run, so that `aat-<short-sha>` exists. HEAD `eebb2e48` was built in run 36410845956.
- [ ] Dispatch Demo: `gh workflow run workflow.demo.yml --ref master`. Watch it with `gh run watch` until resolve, deploy and smoke are all green. Record the run URL.
- [ ] Dispatch Perftest: `gh workflow run workflow.perftest.yml --ref master`. Watch it until green and record the run URL.
- [ ] If either fails, fix the cause (secrets, Flux, DNS) outside this change and re-dispatch. Do not start wiring until both are green.
- [ ] Check the releases: `helm history cath-service-demo -n cath` and `helm history cath-service-perftest -n cath` show the `aat-<short-sha>` image.

### Code changes (branch off master)
- [x] `workflow.demo.yml`: add `workflow_call:` under `on:`. Rewrite the header, trigger and concurrency comments (plan 2.1).
- [x] `workflow.perftest.yml`: the same change (plan 2.2).
- [x] `workflow.main.yml`: add the `deploy-demo` and `deploy-perftest` jobs after `promote-stage`. Use `needs: [promote-stage]`, `if: always() && needs.promote-stage.result == 'success'` and `secrets: inherit`. Add no `permissions:` and no `with:` (plan 2.3).
- [x] `job.resolve-promoted-images.yml`: replace the "Per #1020 … synced from master" comment (plan 2.4).
- [x] `workflow.ithc.yml`: comment-only update pointing to #1082 and #1084, with no trigger change (plan 2.5), subject to Clarification 5.
- [x] `grep -rn "synced from master\|#1020" .github/` returns nothing.

### Verification before merge
- [x] Run actionlint locally, since CI has none: `docker run --rm -v "$PWD":/repo -w /repo rhysd/actionlint:latest -color .github/workflows/workflow.main.yml .github/workflows/workflow.demo.yml .github/workflows/workflow.perftest.yml .github/workflows/workflow.ithc.yml .github/workflows/job.resolve-promoted-images.yml`
- [ ] Dispatch the edited workflows from the feature branch to prove the `workflow_call` addition did not break the file: `gh workflow run workflow.demo.yml --ref <branch>`. This deploys that branch HEAD's resolved tag. Floating-tag fallback is acceptable here, or skip this step if the deploy should not come from a branch.
- [ ] Open the PR with links to the two green manual dispatch runs, and a note on the operational rule: do not dispatch Demo or Perftest while a master run is at or after Promote.

### Post-merge verification
- [ ] The merge commit's master run shows Build → Deploy to AAT → Smoke Test → Promote → Demo and Perftest (Resolve → Deploy → Smoke Test), all green.
- [ ] `helm history` for both releases shows a new revision with `aat-<merge short-sha>` for the apps built in that run.
- [ ] Tick the ACs on #1020 and link the master run.
