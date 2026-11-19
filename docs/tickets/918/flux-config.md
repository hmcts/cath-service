# #918 cnp-flux-config changes

PR: https://github.com/hmcts/cnp-flux-config/pull/49220. Merge it after hmcts/cath-service#1578.

This follows the `00`/`01` cluster layout used by hmcts/cnp-flux-config#48436.

## Why per-cluster schedules

Each environment runs two AKS clusters, `00` and `01`, and both deploy everything in `apps/cath/<env>/base`. The cath-crons chart sets `disableActiveClusterCheck: true` (`apps/crons/helm/values.yaml`), so a CronJob runs in both clusters. To get one run a day, each cluster has its own schedule:

| Cluster | Schedule | Runs |
|---|---|---|
| `00` | `0 2 1-31/2 * *` | 02:00 UTC on odd days of the month |
| `01` | `0 2 2-30/2 * *` | 02:00 UTC on even days of the month |

The 31st and the 1st are both odd days, so `00` runs on both. It is still one run a day.

## Files

`apps/cath/cath-crons-purge-user-archive/`:
- `cath-crons-purge-user-archive.yaml`: the base HelmRelease. It uses the `cath-crons` chart and image, sets `SCRIPT_NAME: purge-user-archive` and `releaseNameOverride`, and has no schedule.
- `image-repo.yaml` and `image-policy.yaml`: registered in `apps/cath/automation/kustomization.yaml`.
- `<env>/00.yaml` and `<env>/01.yaml` for aat, demo, perftest and prod: each sets `schedule` only.

Kustomizations:
- `apps/cath/<env>/base/kustomization.yaml` adds the base HelmRelease as a resource.
- `apps/cath/<env>/00/kustomization.yaml` and `/01/kustomization.yaml` add a patch for `../../cath-crons-purge-user-archive/<env>/<cluster>.yaml`.

Stg, preview and the existing `cath-crons` release are unchanged.

I checked all 8 overlays with `kubectl kustomize --load-restrictor LoadRestrictionsNone`.

## Conflict note

#48436 also adds a `patches:` block to the same `00`/`01` kustomization files. Whichever of the two PRs merges second needs a rebase that merges both entries into one `patches:` list.
