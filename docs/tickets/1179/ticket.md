# #1179: Local dev: .env values should override Key Vault secrets

**State:** OPEN
**Assignees:** HarveyMoj
**Author:** junaidiqbalmoj
**Labels:** 
**Created:** 2026-10-20T11:24:28Z
**Updated:** 2026-10-20T14:33:58Z

## Description

## Problem

When running locally (`LOCAL_DEV=true`), any value set in the root `.env` is silently overwritten by Azure Key Vault for every secret listed under `keyVaults` in `apps/{web,api}/helm/values.dev.yaml`.

Sequence at startup:

1. `tsx --env-file-if-exists=../../.env` loads `.env` into `process.env`.
2. `createApp()` calls `getPropertiesVolumeSecrets({ chartPath })` (`apps/web/src/app.ts`, `apps/api/src/app.ts`).
3. `@hmcts-cft/cloud-native-platform` writes each Key Vault secret into `process.env` unconditionally (`process.env[key] = value`), replacing whatever `.env` set.

Concrete impact: `values.dev.yaml` maps `gov-uk-notify-test-api-key` → `GOVUK_NOTIFY_API_KEY`. Even if a developer puts a live Notify key in `.env`, the app uses the Notify **test** key ("CaTH Test Key - 2025"), so emails never arrive in a real inbox. Sometimes during local development we need to see the actual email in the inbox (e.g. checking template rendering, links and attachments in subscription emails).

The only current workarounds are editing `values.dev.yaml` locally (easy to commit by accident) or setting `LOCAL_DEV=false` (pulls the full deployment secret set from `values.yaml`, which is worse).

## Proposed behaviour

For local development only (`LOCAL_DEV=true`):

- If a variable **has a non-empty value in `.env`** (or the shell environment), that value takes precedence over the Key Vault value.
- If a variable is **not set or empty in `.env`**, the Key Vault value is used, as today.

Deployed environments (`LOCAL_DEV` not `true`) are unchanged — Key Vault / the properties volume remain authoritative.

## Acceptance criteria

- [ ] With `LOCAL_DEV=true` and `GOVUK_NOTIFY_API_KEY` set in `.env`, the app uses the `.env` value and emails are delivered to the real inbox.
- [ ] With `LOCAL_DEV=true` and `GOVUK_NOTIFY_API_KEY` absent or empty (`GOVUK_NOTIFY_API_KEY=`) in `.env`, the Key Vault test key is used (default behaviour stays safe).
- [ ] Applies to both `apps/web` and `apps/api`, and to every secret in `values.dev.yaml`, not just the Notify key.
- [ ] No behaviour change when `LOCAL_DEV` is not `true`.
- [ ] Unit tests in `apps/web/src/app.test.ts` and `apps/api/src/app.test.ts` cover: `.env` value wins locally, empty `.env` value falls back to Key Vault, deployed mode still lets Key Vault win.
- [ ] `apps/web/.env.example` notes that `.env` values override Key Vault locally, and that a live Notify key in `.env` will send real emails.

## Implementation notes

The library has no "don't overwrite" option, so a small change in each `app.ts` is enough: when `LOCAL_DEV=true`, snapshot the non-empty entries of `process.env` before calling `getPropertiesVolumeSecrets()` and reapply them afterwards. Empty values must be excluded from the snapshot, otherwise `GOVUK_NOTIFY_API_KEY=` would wipe the Key Vault value.

## Risk

This deliberately weakens the "local runs never send real emails" safeguard (see comment in `values.dev.yaml`) for anyone who puts a live key in `.env`. Developers must make sure local subscription/user data only contains addresses they own before using a live key.


## Comments

No comments on this issue.
