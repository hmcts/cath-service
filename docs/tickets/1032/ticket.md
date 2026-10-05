# #1032: Replace the non-standard B2C_IDAM provenance with PI_AAD

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-09-11T16:13:41Z
**Updated:** 2026-10-05T12:47:25Z

## Description

## User Story

**As a** verified (media) CaTH user
**I want** my account's provenance to be recorded as `PI_AAD`, the value the rest of the platform uses
**So that** I can access the publications my provenance is entitled to, and admin filtering returns the right accounts

## Problem

`B2C_IDAM` is not a provenance that exists anywhere else in the platform. The shared model ([`pip-data-models` `UserProvenances`](https://github.com/hmcts/pip-data-models/blob/master/src/main/java/uk/gov/hmcts/reform/pip/model/account/UserProvenances.java)) defines `CFT_IDAM`, `CRIME_IDAM`, `PI_AAD` and `SSO`. **`B2C_IDAM` is this project's own name for `PI_AAD`** — the same thing, spelled differently.

Because the two names coexist, the codebase has drifted into an inconsistent state: some places write `B2C_IDAM`, list-type reference data uses `PI_AAD`, one query has a hand-written compatibility shim treating them as equal, and the validated provenance list omits `PI_AAD` entirely.

## Live impact: verified users cannot open SJP Press Lists

`canAccessPublication` ([`libs/publication/src/authorisation/service.ts:33-34`](https://github.com/hmcts/cath-service/blob/master/libs/publication/src/authorisation/service.ts#L33)) does an **exact string match** on provenance for `CLASSIFIED` publications:

```ts
if (sensitivity === Sensitivity.CLASSIFIED) {
  if (!isVerifiedUser(user)) return false;
  if (!listType) return false;
  return !!user.provenance && listType.provenance.split(",").includes(user.provenance);
}
```

Every verified/media user is created with `userProvenance: "B2C_IDAM"` ([`libs/account/src/repository/service.ts:24`](https://github.com/hmcts/cath-service/blob/master/libs/account/src/repository/service.ts#L24) and `:40`), but the list types they need declare `PI_AAD`. `["PI_AAD"].includes("B2C_IDAM")` is `false`, so access is denied.

Three list types default to `Classified` **and** allow `PI_AAD`:

| List type | Allowed provenance | Default sensitivity | Effect on a `B2C_IDAM` user |
|---|---|---|---|
| `SJP_PRESS_LIST` | `PI_AAD` **only** | `Classified` | **Denied — no verified user can open it at all** |
| `SJP_DELTA_PRESS_LIST` | `PI_AAD` **only** | `Classified` | **Denied — no verified user can open it at all** |
| `MAGISTRATES_STANDARD_LIST` | `CRIME_IDAM`, `PI_AAD` | `Classified` | Denied for media users; `CRIME_IDAM` users unaffected |

For the two SJP press lists, `PI_AAD` is the *only* permitted provenance — so the effect is that the audience those lists exist for cannot reach them.

Scope note: `PUBLIC` publications are unaffected (returned before the provenance check) and `PRIVATE` only requires the `VERIFIED` role, so `SJP_PUBLIC_LIST`, `SJP_DELTA_PUBLIC_LIST`, `MAGISTRATES_PUBLIC_LIST` and `MENTAL_HEALTH_TRIBUNAL_HEARING_LIST` are not affected at their default sensitivity. They *would* be affected if published as `Classified`, since sensitivity is set per publication rather than fixed by list type.

## Every occurrence — 14 across 9 files

### Writes the wrong value into the database

| Location | Current |
|---|---|
| `libs/account/src/repository/service.ts:24` | `userProvenance: "B2C_IDAM"` — new media user |
| `libs/account/src/repository/service.ts:40` | `userProvenance: "B2C_IDAM"` — `updateLocalMediaUser` create branch |

### Type allows both spellings

| Location | Current |
|---|---|
| `libs/account/src/repository/model.ts:5` | `userProvenance: "SSO" \| "CFT_IDAM" \| "CRIME_IDAM" \| "B2C_IDAM" \| "PI_AAD"` |

The union containing both is itself the evidence of the confusion — nothing tells a developer which to use.

### Validation rejects the correct value

| Location | Current |
|---|---|
| `libs/system-admin-pages/src/user-management/validation.ts:6` | `VALID_PROVENANCES = ["CFT_IDAM", "SSO", "B2C_IDAM", "CRIME_IDAM"]` |

**`PI_AAD` is missing**, so a filter request carrying the platform-standard value fails validation.

### Compatibility shim papering over the split

| Location | Current |
|---|---|
| `libs/system-admin-pages/src/user-management/queries.ts:55` | `filters.provenances.flatMap((p) => (p === "B2C_IDAM" ? ["B2C_IDAM", "PI_AAD"] : [p]))` |

This exists because **both values are already present in the data**. It should be deleted once the data is consistent.

### User interface

| Location | Current |
|---|---|
| `apps/web/src/pages/(system-admin)/find-users/index.ts:119` | `B2C_IDAM: content.provenanceB2c` |
| `apps/web/src/pages/(system-admin)/find-users/index.ts:143` | `B2C_IDAM: content.provenanceB2c` |
| `apps/web/src/pages/(system-admin)/find-users/index.njk:96` | checkbox `value: "B2C_IDAM"` |
| `apps/web/src/pages/(system-admin)/manage-user/[userId]/index.ts:24` | `PROVENANCE_DISPLAY = { B2C_IDAM: "B2C" }` |

### Tests

| Location | Note |
|---|---|
| `libs/publication/src/authorisation/service.test.ts:173` | Titled *"should handle B2C_IDAM with CRIME_IDAM list type"* but the user it builds has **`PI_AAD`** — the test name and the code already disagree |
| `libs/account/src/repository/service.test.ts:39, 46, 89` | Assert `B2C_IDAM` is written |
| `libs/admin-pages/src/media-application/service.test.ts:200` | Asserts provenance `B2C_IDAM` |

## Acceptance Criteria

* **Scenario:** New media accounts are created with the platform-standard provenance
    * **Given** a media user is created or updated via `libs/account/src/repository/service.ts`
    * **When** the local user record is written
    * **Then** `userProvenance` is `PI_AAD`, and `B2C_IDAM` is never written

* **Scenario:** Existing accounts are migrated
    * **Given** `user` rows exist with `user_provenance = 'B2C_IDAM'`
    * **When** the migration runs
    * **Then** every such row becomes `PI_AAD`, and no row retains `B2C_IDAM`

* **Scenario:** The type no longer admits the removed value
    * **Given** `libs/account/src/repository/model.ts`
    * **Then** `userProvenance` is `"SSO" | "CFT_IDAM" | "CRIME_IDAM" | "PI_AAD"` and `B2C_IDAM` does not compile

* **Scenario:** `PI_AAD` is a valid provenance for admin filtering
    * **Given** a System Admin filters users by provenance
    * **When** `PI_AAD` is submitted
    * **Then** it passes validation and returns the media accounts

* **Scenario:** The compatibility shim is gone
    * **Given** `user-management/queries.ts`
    * **Then** the `flatMap` expanding `B2C_IDAM` to `["B2C_IDAM", "PI_AAD"]` is removed and the filter passes provenances straight through

* **Scenario:** Verified users can open SJP Press Lists
    * **Given** a verified media user whose provenance is `PI_AAD`
    * **When** they open a `CLASSIFIED` `SJP_PRESS_LIST` publication
    * **Then** access is granted

* **Scenario:** No `B2C_IDAM` remains anywhere
    * **Given** the repository after this change
    * **When** searched case-sensitively for `B2C_IDAM` outside `requirements/` and `docs/tickets/`
    * **Then** there are no matches in source, templates, tests or reference data

* **Scenario:** Welsh and English admin labels still render
    * **Given** the System Admin find-users and manage-user pages
    * **When** a media account is displayed or filtered
    * **Then** the user-facing label is unchanged in both locales, regardless of the internal value change

## Out of Scope

- The `B2C_*` / `AZURE_B2C_*` **configuration** names (`B2C_CLIENT_ID`, `AZURE_B2C_TENANT_ID`, `b2c-login` route, `libs/auth/src/config/b2c-config.ts`). Those correctly describe the Azure AD B2C sign-in mechanism and are a different concept from the account provenance value. Only the provenance value changes.
- Provenance corrections to list-type reference data — #698.

## Open Questions

1. **Does the user-facing label change?** The internal value becomes `PI_AAD`, but `PROVENANCE_DISPLAY` shows "B2C" and the filter checkbox is labelled from `content.provenanceB2c`. "B2C" describes the sign-in method and may be clearer to admins than `PI_AAD`. Recommendation: change only the internal value and leave the display label alone, so this stays a data-consistency fix with no UI copy change. Confirm — if the label should change too, Welsh copy is needed.
2. **How many rows are affected?** Needs a count of `user` rows by `user_provenance` per environment before the migration, to size it and to confirm both values really do coexist as `queries.ts:55` implies.
3. **Is `B2C_IDAM` stored anywhere outside the `user` table?** `audit_log` records free text, and third-party or subscription records may carry a provenance string. Worth a check so the migration is complete.
4. **Does anything outside this repo send or read `B2C_IDAM`?** If any external caller filters on it, we need a transition period accepting both on input while only ever writing `PI_AAD`.

## Notes

The service is not yet live, so the migration is expected to be low-risk. If that changes, the safe order is: accept both on read → migrate data → write only `PI_AAD` → remove the shim.

## References

- Shared model: [`UserProvenances.java`](https://github.com/hmcts/pip-data-models/blob/master/src/main/java/uk/gov/hmcts/reform/pip/model/account/UserProvenances.java)
- Authorisation check: `libs/publication/src/authorisation/service.ts:33-34`
- Related: #698 (provenance for all list types, which standardises on `PI_AAD`)


## Comments

No comments on this issue.
