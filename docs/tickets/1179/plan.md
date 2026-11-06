# Technical Plan: #1179 Local dev: .env values should override Key Vault secrets

## 1. Technical Approach

### Root cause

Both `apps/web/src/app.ts` and `apps/api/src/app.ts` call `getPropertiesVolumeSecrets()` as the first statement of `createApp()`. When `LOCAL_DEV=true`, the library (`@hmcts-cft/cloud-native-platform` 2.3.0, `dist/properties-volume/properties.js`) takes the Azure Key Vault path (`tryLoadFromAzureVault`). `loadFromAzureVault` runs `process.env[key] = value` for every secret under `keyVaults` in `values.dev.yaml`. It does not check whether the variable is already set, so it overwrites whatever `--env-file-if-exists=../../.env` loaded.

### Options considered

| Option | Description | Verdict |
|---|---|---|
| A. Snapshot and reapply (the ticket's suggestion) | Before the call, copy the non-empty `process.env` entries. After the call, write them back. | Works, but it mutates `process.env` twice. Key Vault values sit in `process.env` for a short time, and the returned secrets object still contains the Key Vault values that were then discarded. |
| B. `omit` (chosen) | When `LOCAL_DEV=true`, add the names of the non-empty `process.env` variables to the existing `omit` option. | One call, no write-back, and no window where Key Vault values are in `process.env`. It uses a documented library option. |

### Why `omit` works here

- In `azure-vault.js` (`processSecret`), the config key is `secret.alias ?? normalizeSecretName(secretName)`. Every entry in both `values.dev.yaml` files has an `alias`, and that alias is the env var name (for example `GOVUK_NOTIFY_API_KEY`).
- `shouldOmit(key, omit)` matches on the full key or on its last dot-separated segment. Env var names contain no dots, so a list of `process.env` names matches the aliases exactly.
- Omitted keys are skipped before injection, and they are also left out of the returned secrets object. That object is not used anywhere in the apps today.
- `omit` is only applied on the Azure path. The mount-point path (`loadSecretsFromMountPoint`) ignores it. That makes no difference here: we only add to `omit` when `LOCAL_DEV=true`, which is exactly when the Azure path is used (chartPath exists and `NODE_ENV !== "production"`). In deployed environments `omit` stays as it is today.

### Shape of the change (per app)

```ts
const isLocalDev = process.env.LOCAL_DEV === "true";
const helmValues = isLocalDev ? "values.dev.yaml" : "values.yaml";

export async function createApp(): Promise<Express> {
  // web: omit: localEnvOverrides()   api: omit: ["DATABASE_URL", ...localEnvOverrides()]
  await getPropertiesVolumeSecrets({ chartPath, omit: localEnvOverrides(), vaultUriSuffix: process.env.VAULT_URI_SUFFIX });
  ...
}

// Locally, a non-empty value from .env or the shell takes precedence over Key Vault.
function localEnvOverrides(): string[] {
  if (!isLocalDev) return [];
  return Object.entries(process.env)
    .filter(([, value]) => value !== undefined && value.trim() !== "")
    .map(([key]) => key);
}
```

- web: `omit: localEnvOverrides()` (web passes no `omit` today, so this is equivalent to `[]` when deployed).
- api: `omit: ["DATABASE_URL", ...localEnvOverrides()]`.
- `localEnvOverrides()` must read `process.env` inside `createApp()`, at call time, not when the module loads.

### Shared helper vs inline

Recommendation: write a small private (non-exported) function in each `app.ts`. Do not create a lib helper.

- The logic is about five lines, has no dependencies, and is startup wiring, not business logic. That fits CLAUDE.md's "apps are composition" rule as well as the existing `getRedisClient`-style helpers in `apps/web/src/app.ts`.
- `apps/api` and `apps/web` share no lib that is the right home for this. `@hmcts/web-core` is a web/Express UI lib, and adding an env-precedence helper there would be an odd dependency for api. A new lib for five lines is YAGNI.
- Two copies is an acceptable cost. If `apps/crons` ever gains `LOCAL_DEV` support (a third copy), move the helper into a lib at that point.
- The function is not exported. Tests exercise it through `createApp()`.

## 2. Implementation Details

TEMPLATE SOURCE: n/a

### Files changed

```
apps/web/src/app.ts            # isLocalDev const, localEnvOverrides(), pass omit
apps/web/src/app.test.ts       # LOCAL_DEV toggle helper + precedence tests, unstubAllEnvs in afterEach
apps/api/src/app.ts            # isLocalDev const, localEnvOverrides(), merge into existing omit
apps/api/src/app.test.ts       # precedence tests using existing createAppWithLocalDev helper
apps/web/.env.example          # note on .env > Key Vault precedence and live Notify key risk
apps/api/helm/values.dev.yaml  # update Notify comment (no longer "never send real emails" if overridden)
apps/web/helm/values.dev.yaml  # same note next to the Notify secret
```

- `apps/api` has no `.env.example`. Both apps load the root `.env`, so the note goes in `apps/web/.env.example` only, as the AC asks. Its wording should say the rule applies to both apps.
- No API endpoints, database or Prisma changes, Nunjucks templates or locale content.
- `apps/crons/src/index.ts` always uses `values.yaml` and has no `LOCAL_DEV` switch, so it is out of scope.

### Test approach for module-level `LOCAL_DEV`

`helmValues`/`chartPath` (and the new `isLocalDev`) are computed when the module loads. `apps/api/src/app.test.ts` already handles this with `createAppWithLocalDev()` (`vi.stubEnv` + `vi.resetModules()` + dynamic import). Copy that pattern into `apps/web/src/app.test.ts`. Do not move the `LOCAL_DEV` read into `createApp()`: this keeps the production diff minimal and consistent with the existing api test.

The `getPropertiesVolumeSecrets` mock gets a per-test `mockImplementation` that follows the library's contract: write each fake Key Vault secret to `process.env` unless its key is in `options.omit`. The assertions then check the effective `process.env.GOVUK_NOTIFY_API_KEY`, which maps directly onto the ACs. Each test also asserts the `omit` argument, so the test fails if the fake and the real call drift apart.

Seed the env vars with `vi.stubEnv()` so `vi.unstubAllEnvs()` restores them. The fake's writes to `process.env` must also be cleaned up (stub the key first so the restore covers it).

## 3. Error Handling & Edge Cases

| Case | Behaviour |
|---|---|
| `.env` has `GOVUK_NOTIFY_API_KEY=` (empty) | Filtered out of `omit`, so the Key Vault test key is used. Safe default kept. |
| Whitespace-only value (`KEY="  "`) | Treated as empty (`trim() !== ""`), so Key Vault wins. Node's `--env-file` trims unquoted values already. This covers quoted whitespace. |
| Variable not in `.env` at all | Not in `process.env`, so not omitted, and Key Vault is used. |
| Variable set in the shell or devcontainer env rather than `.env` | Also wins. This is intentional (the ticket says "or the shell environment"). It is a source of surprise if a stale value is exported in a shell profile, so the `.env.example` note mentions it. |
| `LOCAL_DEV` unset, `false` or any value other than `"true"` | `localEnvOverrides()` returns `[]`. web calls with `omit: []` (same as the current default) and api keeps `["DATABASE_URL"]`. No behaviour change. |
| Key Vault load fails locally (no `az login`, permission denied) | Unchanged. `failOnError` is false outside production, so the library warns and falls back to the mount point, which does not exist locally (warning, `{}`). `.env` values are untouched either way. Omitting keys does not avoid the fetch: the library still fetches every listed secret before filtering, so one inaccessible secret still fails the whole vault load, as it does today. |
| Stale Key Vault-managed values already in a developer's `.env` (for example an old `SSO_CLIENT_SECRET`) | These values used to be overwritten silently. They will now win, which can break sign-in locally. The current root `.env` has none of these keys. The `.env.example` note tells developers to delete overrides they no longer need. |
| Large `omit` list (every non-empty env var, including `PATH` and similar) | Harmless. `omit.includes()` runs over a few hundred entries for about 20 secrets, once at startup. |
| Deployed (`NODE_ENV=production`) | The Azure path is skipped and the mount-point path ignores `omit`. Unaffected either way. |

## 4. Acceptance Criteria Mapping

| AC | How satisfied | Verification |
|---|---|---|
| `LOCAL_DEV=true` + `GOVUK_NOTIFY_API_KEY` set in `.env` gives the `.env` value and real emails | The key is non-empty, so it goes into `omit` and the library does not inject the Key Vault value. | Unit test (web + api). Manual: temporarily add `console.log(process.env.GOVUK_NOTIFY_API_KEY?.slice(0, 12))` before and after the `getPropertiesVolumeSecrets` call in `apps/web/src/app.ts`, run `yarn dev`, and confirm both lines show the `.env` value (before the fix, the second line showed the Key Vault value). Then trigger a subscription email to an address you own and confirm it arrives. Remove the log afterwards. |
| Absent or empty key in `.env` gives the Key Vault test key | Empty or absent keys are filtered out of `omit`. | Unit tests for both the empty and the absent case. Manual: set `GOVUK_NOTIFY_API_KEY=`, and the after-call log shows the Key Vault value. |
| Applies to web and api and to every secret in `values.dev.yaml` | Generic name-based filter over all of `process.env`, applied in both `app.ts` files. | Unit test with a second, non-Notify secret (for example `SSO_CLIENT_ID` for web, `AZURE_TENANT_ID` for api). Manual check on api with the same log. |
| No change when `LOCAL_DEV` is not `true` | `localEnvOverrides()` returns `[]`. | Unit test in each app: deployed mode, so Key Vault value wins even when the env var is set. Assert `omit` equals `[]` for web and `["DATABASE_URL"]` for api. |
| Unit tests in both `app.test.ts` files | See section 5. | `yarn test` from the root. |
| `.env.example` note | Comment added near `LOCAL_DEV` and in the GOV.UK Notify section. | Review the diff. |

## 5. Test Scenarios

Unit (Vitest, AAA), in both `apps/web/src/app.test.ts` and `apps/api/src/app.test.ts`:

1. `LOCAL_DEV=true`, `GOVUK_NOTIFY_API_KEY=env-key`: after `createApp()`, the env value is `env-key` and `omit` contains `GOVUK_NOTIFY_API_KEY`.
2. `LOCAL_DEV=true`, `GOVUK_NOTIFY_API_KEY=""`: Key Vault value is used and `omit` does not contain the key.
3. `LOCAL_DEV=true`, key not set: Key Vault value is used.
4. `LOCAL_DEV=true`, whitespace-only value: Key Vault value is used.
5. `LOCAL_DEV=true`, a second, non-Notify secret set in env: the env value wins, which proves the filter is generic.
6. `LOCAL_DEV` unset, `GOVUK_NOTIFY_API_KEY=env-key`: Key Vault value wins. `omit` is `[]` (web) or `["DATABASE_URL"]` (api).
7. api only: `LOCAL_DEV=true`, so `omit` still contains `DATABASE_URL` as well as the local overrides.

Existing tests, "should configure properties volume" (web) and "helm chart selection" (api), must still pass.

E2E: none. This is local-only startup behaviour that depends on a developer's `.env` and live Key Vault access. Playwright runs against an app whose secrets are already fixed, so it cannot observe the change and would add nothing.

Manual: the before/after `console.log` check and the real-inbox delivery check in section 4.

## CLARIFICATIONS NEEDED

1. **Shell env precedence:** the ticket says "`.env` (or the shell environment)". The chosen approach cannot tell the two apart, so any non-empty `process.env` value wins. Confirm that is wanted. A stale `export SSO_CLIENT_ID=...` in a shell profile would now take effect silently.
2. **Startup visibility:** should the app log, at startup when `LOCAL_DEV=true`, which Key Vault secret names were overridden locally (names only, never values)? It would make an accidental live Notify key obvious, which helps with the Risk section of the ticket. Not included in the plan (YAGNI) unless requested.
3. **`values.dev.yaml` comment:** the api comment says "test key so local runs never send real emails". The plan rewords it to "...unless overridden in .env". Confirm that is acceptable rather than leaving the helm files untouched.
4. **Crons:** `apps/crons` has no `LOCAL_DEV` switch and always reads `values.yaml`. Confirm it stays out of scope.
