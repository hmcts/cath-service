# Plan: Refactor values.dev.yaml Files (#291)

## Problem Statement

Both `apps/api/helm/values.dev.yaml` and `apps/web/helm/values.dev.yaml` contain large amounts of configuration that duplicates `values.yaml`. The dev override files should only contain the delta — the values that differ from the base `values.yaml`. Duplicated configuration in the dev file creates a maintenance trap: a change to `values.yaml` must also be manually reflected in `values.dev.yaml`, and any mismatch introduces a subtle divergence between local and pipeline environments.

---

## Technical Approach

### Helm Merge Semantics

When Helm applies multiple values files (`helm install -f values.yaml -f values.dev.yaml`), the merge rules are:

- **Scalars** (strings, booleans, numbers): the last file wins
- **Maps/objects**: deep-merged recursively — keys present only in `values.yaml` are preserved alongside keys only in `values.dev.yaml`
- **Arrays/sequences**: the last file **replaces** the earlier file's array entirely — there is no element-level merging

The array replacement rule is the critical constraint for `keyVaults[*].secrets`. A dev override for a secrets array must include every secret entry needed (unchanged ones included), not just the new or different ones.

### Key Decision: `cath: null` to Remove a Vault

The `apps/api/helm/values.yaml` registers a `cath` Key Vault. Locally this vault is inaccessible (local dev only connects to `pip-ss-kv-stg`). The current `values.dev.yaml` silently ignores this by not re-declaring the `cath` vault — but due to deep-merge semantics, the `cath` vault is still present in the merged output. The correct way to remove a map key in a Helm values merge is to set it explicitly to `null`.

The HMCTS `nodejs` chart (version 3.2.0, used by both `cath-api` and `cath-web`) passes `keyVaults` into the CSI secrets-store driver configuration. Setting `cath: null` removes the vault entry from the merged map, so no attempt is made to mount secrets from it locally. This is standard Helm/YAML behaviour and does not require any chart-specific support.

---

## Implementation Details

### apps/api/helm/values.dev.yaml

**Current state:**
```yaml
# Local Development Helm Values
# Only connects to staging Key Vault, not production cath vault
# This file is used for local development only
# See values.yaml for production configuration

nodejs:
  keyVaults:
    pip-ss-kv-stg:
      secrets:
        - name: app-tenant-id
          alias: AZURE_TENANT_ID
        - name: app-pip-data-management-id
          alias: AZURE_CLIENT_ID
        - name: app-pip-data-management-scope
          alias: AZURE_SCOPE
```

**Problem:** The `pip-ss-kv-stg` secrets block is identical to `values.yaml`. Due to array replacement semantics, writing a full secrets array that matches base adds no value — it just replaces the base array with an identical copy. The `cath` vault from `values.yaml` is not suppressed; it remains in the merged output via deep-merge.

**Target state:**
```yaml
# Local development override — excludes production cath vault
nodejs:
  keyVaults:
    cath: null
```

**What changes:**
- Remove the redundant `pip-ss-kv-stg.secrets` block (the base provides it unchanged)
- Add `cath: null` to explicitly remove the production `cath` vault from the merged output

**Merged result** (values.yaml + values.dev.yaml):
- `nodejs.keyVaults.cath`: removed (null suppresses the key)
- `nodejs.keyVaults.pip-ss-kv-stg.secrets`: inherited from `values.yaml` as-is

---

### apps/web/helm/values.dev.yaml

**Current state:**
```yaml
nodejs:
  applicationPort: 8080          # duplicate
  aadIdentityName: cath          # duplicate
  ingressHost: cath-web.{{ .Values.global.environment }}.platform.hmcts.net  # duplicate
  image: 'hmctspublic.azurecr.io/cath/cath-web:latest'   # duplicate
  environment:
    REDIS_HOST: 'cath-{{ .Values.global.environment }}.redis.cache.windows.net'  # duplicate
    BASE_URL: 'https://{{ .Values.nodejs.ingressHost }}'   # duplicate
    SSO_ALLOW_HTTP_REDIRECT: 'false'   # duplicate
    CFT_IDAM_URL: 'https://idam-web-public.aat.platform.hmcts.net'   # genuine override
  keyVaults:
    pip-ss-kv-stg:
      secrets:
        - name: sso-client-id-dev      # override: prod uses sso-client-id
          alias: SSO_CLIENT_ID
        - name: sso-client-secret-dev  # override: prod uses sso-client-secret
          alias: SSO_CLIENT_SECRET
        - name: sso-issuer-url         # same as prod
          alias: SSO_IDENTITY_METADATA
        - name: sso-sg-system-admin    # same as prod
          alias: SSO_SYSTEM_ADMIN_GROUP_ID
        - name: sso-sg-admin-ctsc      # same as prod
          alias: SSO_INTERNAL_ADMIN_CTSC_GROUP_ID
        - name: sso-sg-admin-local     # same as prod
          alias: SSO_INTERNAL_ADMIN_LOCAL_GROUP_ID
        - name: cft-idam-client-secret  # genuine override: not in prod
          alias: CFT_IDAM_CLIENT_SECRET
```

**What is a genuine override vs a duplicate:**

| Setting | Status | Reason |
|---|---|---|
| `applicationPort` | Duplicate | Identical value in `values.yaml` |
| `aadIdentityName` | Duplicate | Identical value in `values.yaml` |
| `ingressHost` | Duplicate | Identical value in `values.yaml` |
| `image` | Duplicate | Identical value in `values.yaml` |
| `environment.REDIS_HOST` | Duplicate | Identical value in `values.yaml` |
| `environment.BASE_URL` | Duplicate | Identical value in `values.yaml` |
| `environment.SSO_ALLOW_HTTP_REDIRECT` | Duplicate | Identical value in `values.yaml` |
| `environment.CFT_IDAM_URL` | Genuine override | Dev-only env var, absent from `values.yaml` |
| `keyVaults.pip-ss-kv-stg.secrets` | Genuine override (full array) | Array replacement required; two secret names differ (`sso-client-id-dev`, `sso-client-secret-dev`) and one entry is added (`cft-idam-client-secret`) |

**Target state:**
```yaml
# Local development overrides only
# Applied on top of values.yaml via: helm install -f values.yaml -f values.dev.yaml
nodejs:
  environment:
    CFT_IDAM_URL: 'https://idam-web-public.aat.platform.hmcts.net'
  keyVaults:
    pip-ss-kv-stg:
      secrets:
        - name: sso-client-id-dev
          alias: SSO_CLIENT_ID
        - name: sso-client-secret-dev
          alias: SSO_CLIENT_SECRET
        - name: sso-issuer-url
          alias: SSO_IDENTITY_METADATA
        - name: sso-sg-system-admin
          alias: SSO_SYSTEM_ADMIN_GROUP_ID
        - name: sso-sg-admin-ctsc
          alias: SSO_INTERNAL_ADMIN_CTSC_GROUP_ID
        - name: sso-sg-admin-local
          alias: SSO_INTERNAL_ADMIN_LOCAL_GROUP_ID
        - name: cft-idam-client-secret
          alias: CFT_IDAM_CLIENT_SECRET
```

**Note on the secrets array:** Although four of the seven secrets are identical to `values.yaml`, the full array must be present because arrays are replaced wholesale. Omitting unchanged entries would drop them from the merged output.

---

### apps/crons/helm

No `values.dev.yaml` exists for crons. This is intentional: cron jobs are not run locally, only in the cluster. No change required here.

---

## Verification Approach

### 1. Helm template diff (before and after)

Run `helm template` against both files combined and confirm the rendered output is functionally equivalent to the current dev setup:

```bash
# From the chart directory, with chart dependencies present
helm template cath-api apps/api/helm -f apps/api/helm/values.yaml -f apps/api/helm/values.dev.yaml
helm template cath-web apps/web/helm -f apps/web/helm/values.yaml -f apps/web/helm/values.dev.yaml
```

Check the rendered output for:
- `apps/api`: no `cath` vault secret references; `pip-ss-kv-stg` secrets present with correct names
- `apps/web`: `CFT_IDAM_URL` env var present; `sso-client-id-dev` and `sso-client-secret-dev` used (not the prod names); `cft-idam-client-secret` present

### 2. Local development smoke test

Start the service locally and confirm:
- API connects to `pip-ss-kv-stg` only; no errors attempting to mount `cath` vault secrets
- Web receives `CFT_IDAM_URL`, `SSO_CLIENT_ID` (from `sso-client-id-dev`), and `CFT_IDAM_CLIENT_SECRET`
- SSO login flow completes successfully (end-to-end test per AC)

### 3. GitHub Actions pipeline

Push the branch and confirm all pipeline checks pass. Pipeline deployments use `values.yaml` only (no dev override), so the changes to `values.dev.yaml` have no effect on pipeline runs — the pipeline check validates that `values.yaml` remains unchanged and valid.

---

## Acceptance Criteria Mapping

| Acceptance Criterion | How Satisfied |
|---|---|
| End-to-end tests passing locally | Dev overrides produce the same effective configuration as before for local secrets resolution; removing duplicates does not alter the merged output |
| GitHub pipeline passing | `values.yaml` is unchanged; pipeline deployments are unaffected |

---

## Open Questions / Clarifications Needed

1. **Does the HMCTS nodejs chart (v3.2.0) support `cath: null` to suppress a vault?**
   The standard Helm/YAML null-merge behaviour should work, but it depends on whether the chart iterates `keyVaults` entries with a nil-guard. If the chart does not guard against null map entries, the null key may cause a template rendering error. This should be confirmed by running `helm template` locally with the proposed change before merging.

2. **Is the current `apps/api/helm/values.dev.yaml` actually achieving vault exclusion?**
   Under current deep-merge semantics, the existing dev file does NOT remove the `cath` vault — it is present in the merged output. If local development has been working, it may be because the CSI driver silently skips inaccessible vaults, or because the local setup does not use the Helm chart at all (e.g., values are loaded via environment variables directly). Confirming which code path local dev uses will clarify whether the `cath: null` change has any observable effect beyond correctness.

3. **Is there a `values.dev.yaml` convention enforced by the local dev tooling?**
   Some HMCTS services use a `draft-pr.sh` or `flux` local override script that automatically appends `-f values.dev.yaml`. Confirm how local Helm invocation is wired so that `values.dev.yaml` is actually applied in the correct order (`values.yaml` first, then `values.dev.yaml`).
