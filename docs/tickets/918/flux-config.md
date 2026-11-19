# #918 cnp-flux-config changes (draft, PR to hmcts/cnp-flux-config pending)

Verified against `hmcts/cnp-flux-config` `master` on 2026-11-19 with `gh api repos/hmcts/cnp-flux-config/contents/...`.

- `apps/cath/cath-crons/` currently holds `cath-crons.yaml`, `image-policy.yaml`, `image-repo.yaml`. There are no per-env patches for `cath-crons`.
- `cath-crons.yaml` is listed in `apps/cath/{aat,demo,perftest,prod}/base/kustomization.yaml`.
- `apps/cath/stg/base/kustomization.yaml` does not exist. `apps/cath/preview/base/kustomization.yaml` does not list `cath-crons`.

## Merge order

Merge only after a `cath-crons` image built from a commit containing `apps/crons/src/purge-user-archive.ts` has been promoted. The tag currently pinned in `cath-crons.yaml` (`prod-dd1704f-20261118143110`) predates this change. Replace `<TAG>` below with the then-current tag that the `flux-system:cath-crons` image policy resolves to (image automation will keep it in step with `cath-crons.yaml` afterwards). Otherwise the job fails daily with `Cannot find module './purge-user-archive.js'`.

## New file: `apps/cath/cath-crons/cath-crons-purge-user-archive.yaml`

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cath-crons-purge-user-archive
spec:
  releaseName: cath-crons-purge-user-archive
  interval: 5m
  install:
    remediation:
      retries: 3
  upgrade:
    remediation:
      strategy: uninstall
      retries: 3
  values:
    job:
      releaseNameOverride: cath-crons-purge-user-archive
      image: hmctsprod.azurecr.io/cath/cath-crons:<TAG> # {"$imagepolicy": "flux-system:cath-crons"}
      schedule: "0 2 * * *"
      environment:
        SCRIPT_NAME: purge-user-archive
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

`job.environment` is merged with the chart defaults (`NODE_ENV: production`, `POSTGRES_DATABASE: cath`), so only `SCRIPT_NAME` changes. `keyVaults` (`postgres-url` -> `DATABASE_URL`), `aadIdentityName` and `concurrencyPolicy: Forbid` come from the chart. AKS evaluates CronJob schedules in UTC.

## Kustomization diffs

`apps/cath/aat/base/kustomization.yaml`

```diff
   - ../../cath-api/cath-api.yaml
   - ../../cath-crons/cath-crons.yaml
+  - ../../cath-crons/cath-crons-purge-user-archive.yaml
   - ../../cath-postgres/cath-postgres.yaml
   - ../../../base/slack-provider/aat
```

`apps/cath/demo/base/kustomization.yaml`

```diff
   - ../../cath-api/cath-api.yaml
   - ../../cath-crons/cath-crons.yaml
+  - ../../cath-crons/cath-crons-purge-user-archive.yaml
   - ../../cath-postgres/cath-postgres.yaml
   - ../../../base/slack-provider/demo
```

`apps/cath/perftest/base/kustomization.yaml`

```diff
   - ../../cath-api/cath-api.yaml
   - ../../cath-crons/cath-crons.yaml
+  - ../../cath-crons/cath-crons-purge-user-archive.yaml
   - ../../cath-postgres/cath-postgres.yaml
   - ../../../base/slack-provider/perftest
```

`apps/cath/prod/base/kustomization.yaml`

```diff
   - ../../cath-api/cath-api.yaml
   - ../../cath-crons/cath-crons.yaml
+  - ../../cath-crons/cath-crons-purge-user-archive.yaml
   - ../../cath-postgres/cath-postgres.yaml
   - ../../../base/slack-provider/prod
```

No change to `apps/cath/cath-crons/cath-crons.yaml`, the image policy/repository, stg or preview.
