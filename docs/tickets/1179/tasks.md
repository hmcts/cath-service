# Tasks: #1179 Local dev: .env values should override Key Vault secrets

## Implementation Tasks

### apps/web
- [x] In `apps/web/src/app.ts`, add the module-level `const isLocalDev = process.env.LOCAL_DEV === "true"` and use it for `helmValues`
- [x] Add a private (non-exported) `localEnvOverrides()` that returns the names of non-empty, non-whitespace `process.env` entries when `isLocalDev`, and `[]` otherwise. Place it after `createApp` per the module ordering rules
- [x] Pass `omit: localEnvOverrides()` to `getPropertiesVolumeSecrets` (keep `chartPath` and `vaultUriSuffix`)

### apps/api
- [x] In `apps/api/src/app.ts`, add the same `isLocalDev` const and private `localEnvOverrides()`
- [x] Change the call to `omit: ["DATABASE_URL", ...localEnvOverrides()]`

### Docs and config comments
- [x] In `apps/web/.env.example`, near `LOCAL_DEV`, note that when `LOCAL_DEV=true` any non-empty value in `.env` (or the shell) overrides the Key Vault secret for both web and api. Empty values fall back to Key Vault. Remove overrides you no longer need
- [x] In the GOV.UK Notify section of `apps/web/.env.example`, warn that setting a live `GOVUK_NOTIFY_API_KEY` sends real emails, so local user and subscription data must only hold addresses you own
- [x] In both `values.dev.yaml` files, update the Notify comment to say the test key is used unless overridden in `.env` (clarification 3: reworded)

### Tests: apps/web/src/app.test.ts
- [x] Add a `createAppWithLocalDev(localDev)` helper (`vi.stubEnv` + `vi.resetModules` + dynamic import) mirroring the api test
- [x] Add `vi.unstubAllEnvs()` to `afterEach`
- [x] Add a `getPropertiesVolumeSecrets` fake `mockImplementation` that writes fake Key Vault secrets to `process.env` unless they are in `options.omit`. Stub those keys first so they are restored
- [x] Test: `LOCAL_DEV=true`, `GOVUK_NOTIFY_API_KEY` set, so the env value wins and `omit` contains the key
- [x] Test: `LOCAL_DEV=true`, `GOVUK_NOTIFY_API_KEY=""`, so the Key Vault value is used
- [x] Test: `LOCAL_DEV=true`, key absent, so the Key Vault value is used
- [x] Test: `LOCAL_DEV=true`, whitespace-only value, so the Key Vault value is used
- [x] Test: `LOCAL_DEV=true`, non-Notify secret (`SSO_CLIENT_ID`) set, so the env value wins
- [x] Test: `LOCAL_DEV` unset, key set, so the Key Vault value wins and `omit` is `[]`

### Tests: apps/api/src/app.test.ts
- [x] Add the same fake `getPropertiesVolumeSecrets` implementation, reusing the existing `createAppWithLocalDev`
- [x] Test: `LOCAL_DEV=true`, `GOVUK_NOTIFY_API_KEY` set, so the env value wins
- [x] Test: `LOCAL_DEV=true`, empty value, so the Key Vault value is used
- [x] Test: `LOCAL_DEV=true`, key absent, so the Key Vault value is used
- [x] Test: `LOCAL_DEV=true`, whitespace-only value, so the Key Vault value is used
- [x] Test: `LOCAL_DEV=true`, non-Notify secret (`AZURE_TENANT_ID`) set, so the env value wins
- [x] Test: `LOCAL_DEV=true`, so `omit` still contains `DATABASE_URL`
- [x] Test: `LOCAL_DEV` unset, key set, so the Key Vault value wins and `omit` equals `["DATABASE_URL"]`

### Verification
- [x] `yarn test` passes from the root (including existing "configure properties volume" and "helm chart selection" tests)
- [x] `yarn lint:fix` is clean
- [x] Manual: temporary `console.log` of the masked `GOVUK_NOTIFY_API_KEY` before and after `getPropertiesVolumeSecrets` in web. With the key set in `.env`, both lines show the `.env` value. With `GOVUK_NOTIFY_API_KEY=`, the after-call line shows the Key Vault value. Remove the log
- [x] Manual: repeat the log check for api
- [ ] Manual: with a live key in `.env`, trigger a subscription email to an owned address and confirm it arrives in the real inbox
- [x] No E2E tests (local-only startup behaviour, see plan section 5)
