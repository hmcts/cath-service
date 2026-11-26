# Tasks: #1095 PROD identities for GitHub Actions deploy and Terraform

Legend: **[OUT-OF-BAND: PlatOps]**, **[OUT-OF-BAND: Repo admin]**, **[IN-REPO]**, **[COORDINATION]**

## Implementation Tasks

- [x] 1. **[OUT-OF-BAND: PlatOps]** Create the `cath-service-prod` app registration (hmcts/central-app-registration#262, member of `DTS Operations (env:prod)`). Done 2026-10-20.
- [x] 2. **[COORDINATION]** Raise the PROD role assignment request with PlatOps (DTSPO-35946). Done 2026-10-20.
- [ ] 3. **[COORDINATION]** Update DTSPO-35946 with the scope list from plan.md Section 1:
  - drop the deploy-side `cath-prod` KV read
  - add the Terraform `az ad sp show` Graph self-read
  - add RG-create rights (or pre-created RGs)
  - add `subnets/join` on the PROD vnets
  - optionally add the `hmcts-prod` Log Analytics read and APIM `cft-api-mgmt-prod` contributor
  - state the requirement that the credential JSON `subscriptionId` is `DCD-CFTAPPS-PROD`

  Resolve Clarifications 1, 3, 4, 6, 7, 8 and 9 in the same thread.
- [ ] 4. **[COORDINATION]** Raise OIDC (Clarification 2) with PlatOps as a follow-up. If adopted, note that the subject should be `repo:hmcts/cath-service:environment:prod`, not `ref:refs/heads/master`, because a ref subject blocks PR plans and non-master runs. Comment the expected impact on #1099 and #1096.
- [x] 5. **[OUT-OF-BAND: PlatOps]** (PlatOps report done 2026-10-26, unverified until task 10) Grant the deploy scopes: AKS Cluster Admin Role on `cft-prod-00-aks` and `cft-prod-01-aks` (`DCD-CFTAPPS-PROD`), and Private DNS Zone Contributor on the PROD private zone.
- [x] 6. **[OUT-OF-BAND: PlatOps]** (PlatOps report done 2026-10-26, unverified until task 10) Grant the Terraform scopes:
  - Contributor in `DCD-CNP-PROD` (cath RGs, plus create rights)
  - network read/join in `DCD-CFTAPPS-PROD`
  - listKeys on `mgmtstatestoreprod` / `mgmt-state-store-prod`
  - Key Vault management for `cath-prod`, `cath-bootstrap-prod`, `cath-tp-prod`
  - Graph self-read
- [x] 7. **[IN-REPO]** (Workflow written 2026-10-26 on `feature/1095-verify-prod-credentials`, actionlint 1.7.12 clean. Opening the PR and merging to master is still pending.) On a feature branch, add `.github/workflows/one-shot.verify-prod-credentials.yml` as outlined in plan.md Section 2:
  - `workflow_dispatch` only
  - `contents: read`
  - secret-name matrix
  - missing-secret guard
  - login and active-subscription check (fail if not DCD-CFTAPPS-PROD)
  - `az aks get-credentials --admin` plus a `kubectl get svc traefik -n admin` probe for 00 and 01
  - PROD DNS zone read
  - `az ad sp show`
  - state store listKeys (count only)
  - `az role assignment list`
  - CFTAPPS-PROD vnet list

  Use the one-shot header comment style ("run once from master, then delete"). Run `actionlint`. Open a PR and get it merged, because `workflow_dispatch` only appears once the file is on master.
- [ ] 8. **[IN-REPO]** ~~Skipped: the secret already existed before the workflow was written, so the missing-secret guard can't be tested this way.~~ Test Scenario 3: before the secret exists, dispatch the workflow from master and check it fails at the guard with `AZURE_CREDENTIALS_CFT_PROD is not set`.
- [x] 9. (Done: secret added; subscriptionId changed to DCD-CFTAPPS-PROD; verified by run 40354863343.) **[OUT-OF-BAND: Repo admin]** (Secret added 2026-10-26T14:17Z; dispatch still pending) Add `AZURE_CREDENTIALS_CFT_PROD` as a repository secret (GitHub UI, or `gh secret set` reading from stdin). Get the value only through the PlatOps secure handover. Never paste it into Slack, Jira, issues or PRs. Then dispatch the verification workflow from master (Test Scenarios 1 and 2). If Clarification 1 results in a split, also add `AZURE_CREDENTIALS_CFT_PROD_TERRAFORM` and add it to the matrix.
- [x] 10. (Done: grants match, see docs/GITHUB_SECRETS_SETUP.md. DNS check deferred to the PROD DNS ticket.) **[IN-REPO]** Check the `az role assignment list` output from the run against plan.md Section 1. Raise any gaps back on DTSPO-35946 and re-run task 9's dispatch until green. Post the green run URL on #1095 (AC4).
- [x] 11. (Done: run 40354863343 logs contain no secret, key or kubeconfig content.) **[IN-REPO]** Test Scenario 4: review the green run's logs for any client secret, storage key or kubeconfig content. If anything leaked, ask PlatOps to rotate immediately and fix the workflow.
- [x] 12. **[IN-REPO]** (Done 2026-10-26: PROD expiry 20 October 2028, owner @junaidiqbalmoj. Non-prod rows stay TBC; out of scope for #1095.)` placeholders for expiry, rotation owner and non-prod principal names. Fill them in and post expiry and owner on #1095 to complete.) Add an "Azure deploy and Terraform credentials" section to `docs/GITHUB_SECRETS_SETUP.md` covering `AZURE_CREDENTIALS_CFT_PROD` (and the non-prod `AZURE_CREDENTIALS_CFT_*` for completeness): principal name, used by, scopes, expiry date, rotation owner, rotation route. No values. Post the expiry and owner as a comment on #1095 (AC5).
- [ ] 13. **[COORDINATION]** Set a rotation reminder about 30 days before expiry, owned by the named rotation owner.
- [ ] 14. (Deferred: keep the workflow until the PROD DNS ticket runs it with `check-dns=true -f dns-zone=platform.hmcts.net`, then delete it there.) **[IN-REPO]** Delete `one-shot.verify-prod-credentials.yml` in a follow-up PR after the green run.
- [ ] 15. **[COORDINATION]** Tick the ACs on #1095, link the run and the doc PR, and hand over to #1096 (Terraform) and #1099 (deploy), noting the `subscriptionId` requirement and the OIDC outcome.
