# #3: Dependency Dashboard

**State:** OPEN
**Assignees:** None
**Author:** app/renovate
**Labels:** None
**Created:** 2025-10-10T11:12:59Z
**Updated:** 2026-02-23T14:13:37Z

## Description

This issue lists Renovate updates and detected dependencies. Read the [Dependency Dashboard](https://docs.renovatebot.com/key-concepts/dashboard/) docs to learn more.

### Config Migration Needed

- Select a checkbox to let Renovate create an automated Config Migration PR.

### Deprecations / Replacements

| Datasource | Package | Replacement PR? |
|------------|------|--------------|
| npm | passport-azure-ad | Unavailable (manual migration required) |

### Rate-Limited Updates

The following updates are currently rate-limited:

- `@biomejs/cli-linux-arm64` → v2.4.4
- `nodemon` → v3.1.14
- `happy-dom` → v20.7.0
- `actions/github-script` → v8
- `undici` → v7
- `govuk-frontend` → v6

### Open PRs

- PR #401 — `@biomejs/biome` → v2.4.4
- PR #373 — `@playwright/test` → v1.58.2
- PR #393 — `applicationinsights` → v3.13.0
- PR #394 — `config` → v4.4.0
- PR #395 — `dotenv` → v17.3.1
- PR #396 — `express-session` → v1.19.0
- PR #397 — `govuk-frontend` → v5.14.0
- PR #400 — `notifications-node-client` → v8.3.0
- PR #398 — `redis` → v5.11.0
- PR #196 — `@types/node` → v24.10.13

### Blocked

- PR #107 — Prisma monorepo → v7 (major) — closed and blocked

## Comments

### Comment by OgechiOkelu on 2026-02-23T14:06:43Z

@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-02-23T14:09:43Z

## 1. User Story

**As a** developer maintaining the cath-service codebase
**I want to** address outstanding Renovate dependency updates, replace the deprecated `passport-azure-ad` package, and evaluate major version upgrades
**So that** the application remains secure, uses supported libraries, and avoids accumulating technical debt from outdated dependencies

## 2. Background

Renovate has identified dependency updates across the monorepo. The most significant items requiring engineering decisions are:

1. **`passport-azure-ad` is deprecated** — The package's GitHub repository now redirects to Microsoft's MSAL library (`@azure/msal-node`). This is a security-relevant dependency used for Azure AD OIDC authentication in `libs/auth`. No automated replacement PR is available; a manual migration is required.

2. **Major version upgrades (rate-limited)** — `govuk-frontend` v6, `undici` v7 require intentional evaluation before enabling.

3. **Prisma v7 upgrade is blocked** — PR #107 was closed and must be recreated. Prisma v7 is a major release with potential breaking changes to the Prisma client API.

4. **Ten open minor/patch PRs** — These are routine updates (applicationinsights, config, dotenv, express-session, govuk-frontend v5 patch, notifications-node-client, redis, @playwright/test, @biomejs/biome, @types/node) that can be reviewed and merged after verifying CI passes.

## 3. Acceptance Criteria

* `passport-azure-ad` is removed and replaced with a supported OIDC library
* SSO-disabled development mode is preserved
* SSO-configured production mode works
* Open patch/minor PRs are merged
* `govuk-frontend` v6 upgrade is evaluated
* Prisma v7 upgrade is evaluated

## 4. Page Specifications

### passport-azure-ad Migration (libs/auth)

Files to change:
- `libs/auth/src/config/passport-config.ts` — Replace `OIDCStrategy` with `@azure/msal-node` `ConfidentialClientApplication`
- `libs/auth/src/config/sso-config.ts` — Update config shape to match MSAL's `Configuration` interface
- `libs/auth/package.json` — Remove `passport-azure-ad`, add `@azure/msal-node`
- Root `package.json` — Remove `passport-azure-ad` and `@types/passport-azure-ad`

Migration flow:
```
OIDCStrategy callback flow (current)
  └── passport redirects to Azure AD
  └── Azure AD posts code to /sso/return
  └── OIDCStrategy exchanges code for tokens
  └── verifyOidcCallback receives accessToken → Graph API → UserProfile → done()

MSAL replacement flow
  └── /sso/login: msal.getAuthCodeUrl() → redirect to Azure AD
  └── /sso/return: msal.acquireTokenByCode(req.body.code) → TokenResponse
  └── Custom passport strategy receives TokenResponse → Graph API → UserProfile → done()
```

### Prisma v7 Migration (apps/postgres)

Review `apps/postgres/src/` and all `libs/*/prisma/` schema files against the Prisma v7 migration guide.

## 5. Assumptions & Open Questions

* **passport-azure-ad replacement library**: Spec assumes `@azure/msal-node`. Alternative: `openid-client`. Team should confirm preferred approach.
* **SSO_AUTHORITY config variable**: Should `SSO_IDENTITY_METADATA` be reused (with path stripped) or replaced with `SSO_AUTHORITY`?
* **govuk-frontend v6 timing**: v6 has significant breaking changes to Nunjucks macros. Spike needed before enabling rate-limited PR.
* **undici v7**: Currently pinned at v6.23.0 via resolution. v7 assumed deferred.
* **Prisma v7 blocked PR**: PR #107 was manually closed. Reason for closure should be confirmed before recreating.
* **CFT IDAM authentication**: `libs/auth/src/cft-idam/` is a separate auth path unaffected by this migration.

### Comment by OgechiOkelu on 2026-02-23T14:13:37Z

@plan
