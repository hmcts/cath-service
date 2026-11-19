# #918 cnp-flux-config changes

PR: https://github.com/hmcts/cnp-flux-config/pull/49220. Merge it after hmcts/cath-service#1578.

This follows the pattern used by `apps/fact/fact-cron-trigger*`: each cron gets its own folder with a base HelmRelease and one file per environment.

## `apps/cath/cath-crons-purge-user-archive/`

- `cath-crons-purge-user-archive.yaml` is the base HelmRelease:
  - uses the `cath-crons` chart and image
  - uses its own `flux-system:cath-crons-purge-user-archive` image policy
  - sets `SCRIPT_NAME: purge-user-archive` and `schedule: "0 2 * * *"`
  - sets `releaseNameOverride`; without it the chart default names the job `<release>-crons`
- `aat.yaml`, `demo.yaml`, `perftest.yaml`, `prod.yaml`: per-environment patches that set `schedule`.
- `image-repo.yaml` (`hmctsprod.azurecr.io/cath/cath-crons`) and `image-policy.yaml`. Both are registered in `apps/cath/automation/kustomization.yaml`.

## Kustomizations

`apps/cath/{aat,demo,perftest,prod}/base/kustomization.yaml` each get:
- a resource entry for `../../cath-crons-purge-user-archive/cath-crons-purge-user-archive.yaml`
- a patch entry for `../../cath-crons-purge-user-archive/<env>.yaml`

Stg, preview and the existing `cath-crons` release are unchanged.
