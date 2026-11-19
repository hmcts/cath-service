# #351 cnp-flux-config changes (draft, PR not opened)

Draft of the hmcts/cnp-flux-config PR that schedules `cath-inactive-verification-cron`. It follows the
layout of hmcts/cnp-flux-config#49220 (#918 purge cron) and #48436 (media reporting cron).

## Merge order

1. Merge the cath-service PR for #351.
2. Wait until a `cath-crons` image that contains `dist/inactive-verification.js` has been built and image
   automation has written its tag into `cath-inactive-verification-cron.yaml`.
3. Merge this cnp-flux-config PR. Merging earlier makes every run fail, because the script is not in the image yet.

## Why per-cluster schedules

Each environment has two AKS clusters, `00` and `01`, and both deploy everything in `apps/cath/<env>/base`.
The cath-crons chart sets `disableActiveClusterCheck: true`, so a single schedule would run in both clusters
and send every reminder email twice. The days are split between the clusters, which gives one run a day:

| Cluster | Schedule | Runs |
|---|---|---|
| `00` | `1 8 1-31/2 * *` | 08:01 UTC on odd days |
| `01` | `1 8 2-30/2 * *` | 08:01 UTC on even days |

The 31st and the 1st are both odd, so `00` runs on both. It is still one run per calendar day.

## Why `backoffLimit: 0`

The HMCTS `job` chart defaults to `backoffLimit: 6` with `restartPolicy: OnFailure`. The script exits 1 when any
single user fails, so a retry would re-send every reminder due that day. With `backoffLimit: 0` the failure is still
reported, and the next scheduled run catches up on deletions (they use `<=`). Exact-day reminders missed by a failed
run are not re-sent, which is PIP's behaviour.

## `INACTIVE_ACCOUNTS_START_DATE`

Required. It is the go-live date of each environment (`YYYY-MM-DD`, UTC). Without it, or with an invalid value, the
job exits 1 before any query or email. It is set in the per-cluster patches, with the same value for both clusters
of an environment. Replace each placeholder before merging:

| Environment | Placeholder |
|---|---|
| aat | `<AAT_GO_LIVE_YYYY-MM-DD>` |
| demo | `<DEMO_GO_LIVE_YYYY-MM-DD>` |
| perftest | `<PERFTEST_GO_LIVE_YYYY-MM-DD>` |
| prod | `<PROD_GO_LIVE_YYYY-MM-DD>` |

## New files

### `apps/cath/cath-inactive-verification-cron/cath-inactive-verification-cron.yaml`

No schedule here; it is set per cluster.

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cath-inactive-verification-cron
spec:
  releaseName: cath-inactive-verification-cron
  values:
    job:
      releaseNameOverride: cath-inactive-verification-cron
      image: hmctsprod.azurecr.io/cath/cath-crons:<TAG_WITH_INACTIVE_VERIFICATION> # {"$imagepolicy": "flux-system:cath-inactive-verification-cron"}
      backoffLimit: 0
      environment:
        SCRIPT_NAME: inactive-verification
  chart:
    spec:
      chart: cath-crons
      version: ">=0.1.0-0"
      sourceRef:
        kind: HelmRepository
        name: hmctsprod-oci
        namespace: flux-system
      interval: 1m
```

### `apps/cath/cath-inactive-verification-cron/image-repo.yaml`

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  annotations:
    hmcts.github.com/image-registry: hmctsprod
  name: cath-inactive-verification-cron
spec:
  image: hmctsprod.azurecr.io/cath/cath-crons
```

### `apps/cath/cath-inactive-verification-cron/image-policy.yaml`

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: cath-inactive-verification-cron
spec:
  imageRepositoryRef:
    name: cath-inactive-verification-cron
```

### `apps/cath/cath-inactive-verification-cron/<env>/00.yaml` (aat, demo, perftest, prod)

Shown for aat. For the other environments, use the matching placeholder.

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cath-inactive-verification-cron
spec:
  values:
    job:
      schedule: "1 8 1-31/2 * *"
      environment:
        INACTIVE_ACCOUNTS_START_DATE: "<AAT_GO_LIVE_YYYY-MM-DD>"
```

### `apps/cath/cath-inactive-verification-cron/<env>/01.yaml` (aat, demo, perftest, prod)

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cath-inactive-verification-cron
spec:
  values:
    job:
      schedule: "1 8 2-30/2 * *"
      environment:
        INACTIVE_ACCOUNTS_START_DATE: "<AAT_GO_LIVE_YYYY-MM-DD>"
```

The patch is a strategic merge on the HelmRelease, so `job.environment.INACTIVE_ACCOUNTS_START_DATE` is merged
alongside `SCRIPT_NAME` from the base file rather than replacing it.

## Changed files

### `apps/cath/automation/kustomization.yaml`

```yaml
  - ../cath-inactive-verification-cron/image-repo.yaml
  - ../cath-inactive-verification-cron/image-policy.yaml
```

### `apps/cath/<env>/base/kustomization.yaml` (aat, demo, perftest, prod)

```yaml
  - ../../cath-inactive-verification-cron/cath-inactive-verification-cron.yaml
```

### `apps/cath/<env>/00/kustomization.yaml` and `/01/kustomization.yaml` (aat, demo, perftest, prod)

Cluster `00`:

```yaml
patches:
- path: ../../cath-inactive-verification-cron/<env>/00.yaml
```

Cluster `01`:

```yaml
patches:
- path: ../../cath-inactive-verification-cron/<env>/01.yaml
```

Stg, preview and the existing `cath-crons` release are unchanged. The chart default `SCRIPT_NAME: example` in
`apps/crons/helm/values.yaml` stays, so the umbrella release keeps running the placeholder.

## Conflict note

#48436 and #49220 also add a `patches:` block to the same `00`/`01` kustomization files. Whichever PR merges later
needs a rebase that merges the entries into a single `patches:` list, for example on aat cluster `00`:

```yaml
patches:
- path: ../../cath-crons-purge-user-archive/aat/00.yaml
- path: ../../cath-inactive-verification-cron/aat/00.yaml
```

Before opening the PR, check all 8 overlays render with
`kubectl kustomize --load-restrictor LoadRestrictionsNone apps/cath/<env>/<cluster>`.

## Checks on aat after deployment (manual)

- On each cluster, `kubectl -n cath get cronjob cath-inactive-verification-cron` shows that cluster's schedule.
- Trigger a run with `kubectl -n cath create job --from=cronjob/cath-inactive-verification-cron test-run` and check
  the logs contain counts only (no emails, names, tokens or connection strings).
- A second manual run on the same day re-sends that day's reminders. Do not do this in prod.
