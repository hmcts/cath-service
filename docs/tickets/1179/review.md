# Code Review: Issue #1179

Local dev: `.env` values should override Key Vault secrets.

## Summary

The change adds a private `localEnvOverrides()` helper to `apps/web/src/app.ts` and `apps/api/src/app.ts`. When `LOCAL_DEV=true` it returns the names of every non-empty, non-whitespace `process.env` entry. That list goes into the existing `omit` option of `getPropertiesVolumeSecrets()`, so the library skips injecting any Key Vault secret whose alias is already set locally. Docs and helm comments are updated to describe the new precedence and the live-Notify-key risk.

I checked the correctness claim against `@hmcts-cft/cloud-native-platform` 2.3.0 (pinned in both `package.json` files):

- `azure-vault.js` `processSecret`: `configKey = secret.alias ?? normalizeSecretName(secretName)`. Every secret in both `values.dev.yaml` files has an `alias` (21 unique aliases, none containing a dot), so config keys are exactly the env var names.
- `properties.js` `loadFromAzureVault`: `if (typeof value === "string" && !shouldOmit(key, omit))` comes before both `secrets[key] = value` and `process.env[key] = value`. Omitted keys are never written.
- `shouldOmit` matches `omit.includes(key) || omit.includes(lastSegment)`. For dot-free names, last segment == key, so the match is exact.
- `omit` is only passed to `tryLoadFromAzureVault`. `loadSecretsFromMountPoint` ignores it. The Azure path only runs when `chartPath` exists and `NODE_ENV !== "production"`.

Deployed-mode safety: `isLocalDev` is false, so `localEnvOverrides()` returns `[]`. That gives web `omit: []`, the same as the library default and the previous no-`omit` call, and api `omit: ["DATABASE_URL"]`, unchanged. Even if `LOCAL_DEV=true` leaked into a production pod, `NODE_ENV=production` skips the Azure path and the mount-point path ignores `omit`, so behaviour stays the same either way.

The implementation is small and correct. It uses a documented library option and sticks to the agreed clarifications (shell vars also win, no startup log, Notify comment reworded, crons out of scope). The only gap is the second half of AC1 (real-inbox delivery). It was deliberately not exercised, which is why the verdict below is NEEDS CHANGES.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

1. **AC1 only partially verified: real-inbox delivery not demonstrated**
   - **Status**: The mechanism is proven. With `LOCAL_DEV=true` and a non-empty `GOVUK_NOTIFY_API_KEY`, the key goes into `omit` (`apps/web/src/app.ts:80`, `apps/api/src/app.ts:17`) and the `.env` value survives. This is covered by unit tests (`apps/web/src/app.test.ts:321`, `apps/api/src/app.test.ts:138`) and by the manual before/after check in both apps. The Notify consumers read `process.env.GOVUK_NOTIFY_API_KEY` at module load (`libs/notification/src/govuk-notify-service.ts:8`, `libs/notifications/src/notify-templates/template-config.ts:10`). Those modules are only reached through routes registered after `getPropertiesVolumeSecrets()` resolves, since `app.ts` statically imports only `/config` entry points. So the overridden value is what Notify receives.
   - **Missing**: The AC's "emails are delivered to the real inbox" was not observed. The tasks.md item is unticked on purpose: the user chose not to use a live key because it sends real emails.
   - **Recommendation**: Either (a) do the one-off live-key check with an owned address and an otherwise empty local subscription table, then tick the task, or (b) have the ticket owner agree that the env-value check is enough evidence and amend the AC. Real delivery is Notify's behaviour once it has a live key, not this change's. I consider the residual risk low, but the AC as written is not fully evidenced.

## 💡 SUGGESTIONS

1. **Helper and test fakes duplicated across two apps** (`apps/web/src/app.ts:236-242`, `apps/api/src/app.ts:64-70`, and `fakeKeyVault`/`KEY_VAULT_SECRETS` in `apps/web/src/app.test.ts:173-201` and `apps/api/src/app.test.ts:28-47`)
   - **Assessment**: Acceptable. It is about 5 lines with no dependencies, and apps/web and apps/api have no shared lib that would be a natural home. A new lib or an `@hmcts/web-core` dependency in api would be worse (YAGNI). The plan's trigger is sensible: extract the helper if a third consumer appears, for example if `apps/crons` gains `LOCAL_DEV` support.
   - **Approach**: No action now.

2. **Tests verify the call contract, not the library's `omit` semantics**
   - **Benefit/risk**: `getPropertiesVolumeSecrets` is fully mocked, and the fake uses `omit.includes(key)` (exact match). That is accurate for 2.3.0 with dot-free aliases. But if a future library upgrade changed how `omit` matches (for example, only matching normalised secret names), these tests would still pass while the feature broke. The version pin and the `omit` argument assertions reduce this risk, and the manual check covered the real library.
   - **Approach**: Optional. Mention in the bump checklist, or in a one-line comment near `fakeKeyVault`, that the fake mirrors `shouldOmit` from 2.3.0. That way whoever upgrades the library will re-check it. Don't add an integration test against real Key Vault.

3. **Duplicate `createAppWithLocalDev` in web differs slightly from api's**
   - The web version (`apps/web/src/app.test.ts:180-185`) calls `vi.stubEnv("LOCAL_DEV", localDev)` directly. The pre-existing api version (`apps/api/src/app.test.ts:17-26`) branches on `undefined` for no reason, since `vi.stubEnv(key, undefined)` already handles it. Optional cleanup: simplify the api helper to match. This is outside the strict scope of the ticket.

## ✅ Positive Feedback

- Choosing `omit` over the ticket's snapshot/reapply idea was the right call. It is one call with no write-back, and Key Vault values are never in `process.env` for overridden keys.
- `localEnvOverrides()` reads `process.env` at call time inside `createApp()`, not at module load. That is correct: `.env` is loaded by `--env-file` before the module runs, and it also keeps the tests deterministic.
- Deployed-mode diff is effectively zero (web `[]` == library default; api still `["DATABASE_URL"]`).
- CLAUDE.md conventions are followed. The helper is not exported and is tested through `createApp()`. Module ordering is correct: the helper comes after `createApp` and before `getRedisClient` in web, matching order of use. The single comment explains why, not what. `isLocalDev` uses the boolean naming convention.
- Edge cases handled: empty values and whitespace-only values (quoted `"   "` is not trimmed by `--env-file`) both fall back to Key Vault. Absent values fall back too.
- No secret exposure. Only variable names are passed to the library, never values. Nothing is logged. The returned secrets object (which now excludes overridden keys) is not consumed anywhere.
- Including unrelated names (`PATH`, `HOME`, `LOCAL_DEV`, etc.) in `omit` is harmless. `includes()` over a few hundred names for about 20 secrets runs once at startup, and names that match no alias have no effect.
- I checked for stale overrides: none of the 21 Key Vault aliases has a non-empty value in the current root `.env` or `apps/web/.env.example`, and none is exported in the devcontainer shell. Nothing that works today will silently change. No CI workflow sets `LOCAL_DEV`.
- Tests are well isolated. `fakeKeyVault` stubs every fake Key Vault key with `vi.stubEnv` before the fake writes to `process.env`, so `vi.unstubAllEnvs()` (now added to web `afterEach`, `apps/web/src/app.test.ts:213`) reverts both the seeds and the fake's writes. `mockImplementationOnce` together with `mockClear` keeps tests from leaking into each other.
- Tests would fail without the fix. On master, web passes no `omit` and api passes only `["DATABASE_URL"]`, so the fake would write the Key Vault value and every "`.env` value wins" assertion fails. Each test asserts the effective `process.env` value and the `omit` argument, so the fake cannot drift from the real call unnoticed.
- AAA structure and `should ... when ...` naming are consistent throughout.
- Docs are clear and honest about the risk, including the "stale values will silently win" warning (`apps/web/.env.example:14-17`) and the real-emails warning (`apps/web/.env.example:69-72`).

## Test Coverage Assessment

- **Unit tests**: Good. Web has 6 new tests (`apps/web/src/app.test.ts:320-393`) and api has 7 (`apps/api/src/app.test.ts:137-220`). Together they cover: env wins, empty falls back, absent falls back, whitespace falls back, a non-Notify secret wins (generic filter), deployed mode keeps Key Vault with exact `omit` assertions, and (api only) `DATABASE_URL` is still omitted. Existing "should configure properties volume" (web) and "helm chart selection" (api) tests still pass.
- **E2E tests**: N/A. This is local-only startup behaviour that depends on a developer's `.env` and live Key Vault access. Playwright cannot observe it. I agree with the plan's decision.
- **Accessibility tests**: N/A. No templates, UI or user-facing content changed. GOV.UK Design System, Welsh and WCAG categories do not apply.
- **Statement coverage** (run per workspace with `npx vitest run --coverage --coverage.reporter=text-summary`):
  - `apps/web`: **95.58%** statements (5237/5479). 380 files and 3970 tests passed. On the first coverage run, `apps/web/src/app.test.ts`'s first `beforeEach` hit the known 10s cold-import hook timeout. That is the pre-existing flake, which also occurs on clean master. A rerun passed with nothing changed. It is not caused by this change.
  - `apps/api`: **97.27%** statements (143/147). 7 files and 99 tests passed.
  - Both are above 80%.

## Acceptance Criteria Verification

- [~] With `LOCAL_DEV=true` and `GOVUK_NOTIFY_API_KEY` set in `.env`, the app uses the `.env` value and emails are delivered to the real inbox.
  - **Done**: The `.env` value is used. The key is omitted from Key Vault injection at `apps/web/src/app.ts:80,236-242` and `apps/api/src/app.ts:17,64-70`. Tests: `apps/web/src/app.test.ts:321`, `apps/api/src/app.test.ts:138`. Manual check: web and api both print `true` with the fake key in `.env` (`false` on master).
  - **Missing**: Real-inbox delivery with a live key was not observed (tasks.md item deliberately unticked).
- [x] With `LOCAL_DEV=true` and `GOVUK_NOTIFY_API_KEY` absent or empty (`GOVUK_NOTIFY_API_KEY=`) in `.env`, the Key Vault test key is used (default behaviour stays safe).
  - Filter at `apps/web/src/app.ts:240` and `apps/api/src/app.ts:68`. Tests for empty, absent and whitespace values: `apps/web/src/app.test.ts:333,345,357` and `apps/api/src/app.test.ts:150,162,174`. Manual check with an empty value: Key Vault used.
- [x] Applies to both `apps/web` and `apps/api`, and to every secret in `values.dev.yaml`, not just the Notify key.
  - The filter is generic and name-based, in both apps (`apps/web/src/app.ts:236-242`, `apps/api/src/app.ts:64-70`). All 21 aliases in `apps/web/helm/values.dev.yaml` and `apps/api/helm/values.dev.yaml` are dot-free env var names, so they match `shouldOmit` exactly. Non-Notify tests: `apps/web/src/app.test.ts:369` (`SSO_CLIENT_ID`), `apps/api/src/app.test.ts:186` (`AZURE_TENANT_ID`).
- [x] No behaviour change when `LOCAL_DEV` is not `true`.
  - `if (!isLocalDev) return [];` at `apps/web/src/app.ts:238` and `apps/api/src/app.ts:66`. Tests assert exact `omit` (`[]` for web, `["DATABASE_URL"]` for api): `apps/web/src/app.test.ts:382`, `apps/api/src/app.test.ts:210`. The mount-point (production) path ignores `omit` regardless.
- [x] Unit tests in `apps/web/src/app.test.ts` and `apps/api/src/app.test.ts` cover: `.env` value wins locally, empty `.env` value falls back to Key Vault, deployed mode still lets Key Vault win.
  - `apps/web/src/app.test.ts:321,333,382`. `apps/api/src/app.test.ts:138,150,210`.
- [x] `apps/web/.env.example` notes that `.env` values override Key Vault locally, and that a live Notify key in `.env` will send real emails.
  - `apps/web/.env.example:14-17` (precedence, both apps, empty fallback, stale-value warning) and `apps/web/.env.example:69-72` (live key sends real emails). The helm comments are also updated (`apps/web/helm/values.dev.yaml:40`, `apps/api/helm/values.dev.yaml:34`).

**Tally**: 5 met, 1 partial, 0 not met.

## Next Steps

- [ ] Resolve AC1's real-inbox clause. Either do a one-off live-key send to an owned address (with local subscription data limited to addresses you own) and tick the tasks.md item, or get the ticket owner to accept the env-value evidence and amend the AC.
- [ ] Optional: add a note that the `fakeKeyVault` fake mirrors `shouldOmit` from cloud-native-platform 2.3.0, so a future upgrade re-checks it.
- [ ] Optional: simplify the pre-existing api `createAppWithLocalDev` to match the web version.

## Overall Assessment

**NEEDS CHANGES** (advisory)

The code is correct, safe in deployed mode, well tested, and needs no source changes. The verdict is NEEDS CHANGES only because AC1's "emails are delivered to the real inbox" clause has not been demonstrated. Once that clause is verified or formally descoped, this is ready to approve.
