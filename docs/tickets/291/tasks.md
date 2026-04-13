# Tasks: Refactor values.dev.yaml Files (#291)

## Implementation Tasks

- [ ] Confirm how local development invokes Helm (which command/script applies `-f values.dev.yaml` after `-f values.yaml`) so the merge order is understood before making changes
- [ ] Verify that the HMCTS nodejs chart v3.2.0 handles `null` map values in `keyVaults` without rendering errors by running `helm template` locally with a test null entry
- [ ] Update `apps/api/helm/values.dev.yaml`: remove the duplicate `pip-ss-kv-stg.secrets` block and add `cath: null` to suppress the production vault
- [ ] Update `apps/web/helm/values.dev.yaml`: remove all duplicate scalar and environment settings, retaining only `CFT_IDAM_URL` under `environment` and the full `pip-ss-kv-stg.secrets` array with dev-specific secret names
- [ ] Run `helm template` for both charts with the combined values files and verify the rendered output matches the expected configuration (no `cath` vault in API output; dev secret names and `CFT_IDAM_URL` present in web output)
- [ ] Start the service locally and confirm the SSO login flow completes without errors (end-to-end test per AC)
- [ ] Push to GitHub and confirm the pipeline passes
