# #794: Fix non-strategic lists Sensitivity issue

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** junaidiqbalmoj
**Labels:** (none)
**Created:** 2026-07-01T13:29:36Z
**Updated:** 2026-07-08T16:40:17Z

## Description

If non-strategic list is uploaded as Classified, it can be viewed by public. Classified and Private lists should not be visible to public (same like Civil and Family Daily Cause List). We need to make sure that list Sensitivity is working correctly for all non-strategic list types.

## Comments

### Comment by junaidiqbalmoj on 2026-07-06T10:46:01Z

@SPEC

### Comment by hmctsclaudecode on 2026-07-06T10:49:53Z

# Technical Specification — Issue #794: Fix non-strategic lists Sensitivity issue

## 1. User Story

**As a** member of the public using the Court and Tribunal Hearings service
**I want to** be prevented from viewing Classified or Private non-strategic hearing lists
**So that** sensitive hearing information is only seen by users who are authorised to see it, in the same way Civil and Family Daily Cause Lists are already protected.

Supporting user stories:

**As a** verified professional user (CFT/Crime/B2C IDAM)
**I want to** view non-strategic lists that match my provenance and verification level
**So that** I retain legitimate access after the fix is applied.

**As a** CTSC or Local admin
**I want to** see only Public non-strategic list content (metadata only for Private/Classified)
**So that** access rules are consistent across all list types.

## 2. Background

Non-strategic hearing lists (for example Care Standards Tribunal, CIC, AST, FTT Tax/RPT/LRT, GRC, SIAC/POAC/PAAC, WPAFCC, SEND, UTIAC, RCJ standard-format lists) can be uploaded with a Sensitivity of `PUBLIC`, `PRIVATE`, or `CLASSIFIED` via the non-strategic upload journey (`apps/web/src/pages/(admin)/non-strategic-upload/`).

The authorisation rules that should govern this already exist and are correct:

- `libs/publication/src/authorisation/service.ts` — `canAccessPublication`, `canAccessPublicationData`, `canAccessPublicationMetadata`.
- `Sensitivity` enum: `PUBLIC`, `PRIVATE`, `CLASSIFIED` (`libs/publication/src/sensitivity.ts`).

These rules ARE enforced on strategic list types and on the generic publication route:

- Strategic JSON list pages use `createListTypeHandler({ checkAccess: true })` which calls `canAccessPublicationData` (e.g. Civil, Family, Crown, Magistrates — `apps/web/src/pages/(list-types)/*`).
- `/publication/:id` applies `requirePublicationAccess()` middleware (`apps/web/src/pages/(public)/publication/[id].ts`).
- The summary-of-publications page filters correctly using `filterPublicationsForSummary` → `canAccessPublicationMetadata`.

**The defect:** the enforcement is missing on the rendering/download paths that non-strategic lists actually use. A user can reach a Classified or Private non-strategic list by navigating directly to its URL (the summary page hides it, but the underlying page still serves it). Three exposure points:

1. **Non-strategic JSON list pages** render via `createSimpleListTypeHandler` (`apps/web/src/pages/(list-types)/list-type-handler.ts`), which has **no `checkAccess` option and never calls any access-control function**. Every list type built on this helper is exposed regardless of sensitivity.
2. **Flat-file display** — `getFlatFileForDisplay` (`libs/public-pages/src/flat-file/flat-file-service.ts`) checks location match, flat-file flag, and display window, but **not sensitivity**. Reached via `/hearing-lists/:locationId/:artefactId`.
3. **Flat-file download API** — `getFileForDownload` + `GET /api/flat-file/:artefactId/download` (`libs/public-pages/src/routes/api/flat-file/[artefactId]/download.ts`) has **no sensitivity check**, so the raw file can be downloaded directly.

The fix must apply the existing `canAccessPublicationData` rules on all three paths, matching the behaviour already used by Civil and Family Daily Cause Lists.

## 3. Acceptance Criteria

* **Scenario:** Public user is blocked from a Classified non-strategic JSON list
    * **Given** a non-strategic list (e.g. SIAC Weekly Hearing List) has been uploaded with Sensitivity `CLASSIFIED`
    * **When** an unauthenticated (public) user navigates directly to that list's URL with its `artefactId`
    * **Then** the service returns HTTP 403 and renders the access-denied error page, and no hearing data is shown.

* **Scenario:** Public user is blocked from a Private non-strategic JSON list
    * **Given** a non-strategic list has been uploaded with Sensitivity `PRIVATE`
    * **When** an unauthenticated user navigates directly to that list's URL
    * **Then** the service returns HTTP 403 and no hearing data is shown.

* **Scenario:** Public user is blocked from a Classified/Private flat-file list (display)
    * **Given** a non-strategic flat-file (Excel/PDF) has been uploaded as `CLASSIFIED` or `PRIVATE`
    * **When** an unauthenticated user opens `/hearing-lists/:locationId/:artefactId`
    * **Then** the service returns HTTP 403 and does not render or embed the file.

* **Scenario:** Public user is blocked from downloading a Classified/Private flat file
    * **Given** a non-strategic flat-file has been uploaded as `CLASSIFIED` or `PRIVATE`
    * **When** an unauthenticated user requests `GET /api/flat-file/:artefactId/download`
    * **Then** the service returns HTTP 403 JSON error and does not return the file buffer.

* **Scenario:** Public content remains publicly accessible
    * **Given** a non-strategic list has been uploaded as `PUBLIC`
    * **When** any user (authenticated or not) views or downloads it
    * **Then** access is granted exactly as today.

* **Scenario:** Verified user with matching provenance retains access
    * **Given** a non-strategic list uploaded as `CLASSIFIED` whose list type `allowedProvenance` matches the user's provenance
    * **When** that verified user views the list
    * **Then** access is granted.

* **Scenario:** Verified user without matching provenance is blocked
    * **Given** a non-strategic list uploaded as `CLASSIFIED` whose `allowedProvenance` does not match the user's provenance
    * **When** that verified user views the list
    * **Then** the service returns HTTP 403.

* **Scenario:** CTSC/Local admin sees metadata only, not Private/Classified data
    * **Given** a non-strategic list uploaded as `PRIVATE` or `CLASSIFIED`
    * **When** an INTERNAL_ADMIN_CTSC or INTERNAL_ADMIN_LOCAL user opens the list content
    * **Then** they are denied the list data (HTTP 403 with the data-access-denied message), consistent with strategic lists.

* **Scenario:** System admin retains full access
    * **Given** any non-strategic list at any sensitivity
    * **When** a SYSTEM_ADMIN views it
    * **Then** access is granted.

## 4. Technical Details

Three exposure points to fix:

1. `createSimpleListTypeHandler` in `apps/web/src/pages/(list-types)/list-type-handler.ts` — add access control check
2. `getFlatFileForDisplay` in `libs/public-pages/src/flat-file/flat-file-service.ts` — add sensitivity check
3. Flat-file download API `libs/public-pages/src/routes/api/flat-file/[artefactId]/download.ts` — add sensitivity check

Access decision logic (from `canAccessPublicationData`):
- SYSTEM_ADMIN → always allow
- PUBLIC sensitivity → allow everyone
- No user (unauthenticated) → deny (Private/Classified)
- PRIVATE → allow if verified provenance
- CLASSIFIED → allow if verified AND user.provenance == listType.provenance
- CTSC / Local admin + Private/Classified → deny data (metadata only)
- Otherwise → deny

Provenance must come from the list type's `allowedProvenance` column, not the artefact's `provenance`.
