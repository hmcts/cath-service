# Code Review: Issue #794 — Fix non-strategic lists Sensitivity issue

## Summary

The implementation closes three exposure points that allowed public users to view CLASSIFIED or PRIVATE non-strategic hearing lists. The security logic is correctly reused from the existing `canAccessPublicationData` function and access control runs before any blob content is fetched. The core fix is sound and the approach is consistent with how strategic lists already work.

However, there are two issues that require attention before deployment: the 403 error page will render with empty title, heading, and body text for every non-strategic list type (because the locale objects they pass do not contain `error403Title` or `error403Message`), and the `createSimpleListTypeHandler` 403 response does not set `Cache-Control` headers to prevent browsers from caching the denied response.

---

## CRITICAL Issues

### 1. 403 page renders with empty title and message for all non-strategic list types

**Files:** `apps/web/src/pages/(list-types)/list-type-handler.ts` lines 183–192; every non-strategic list-type locale file

**Problem:** `createSimpleListTypeHandler` renders the 403 page as:
```typescript
return res.status(403).render("errors/403", {
  en: { title: en.error403Title, message: en.error403Message },
  cy: { title: cy.error403Title, message: cy.error403Message }
});
```
The template (`errors/403.njk`) uses:
```njk
{% set title = title or t.title %}
<h1>{{ title or t.heading }}</h1>
<p>{{ message or t.defaultMessage }}</p>
<p>{{ t.contactPrefix }} ... {{ t.contactSuffix }}</p>
```
None of the non-strategic locale objects define `error403Title` or `error403Message`. Verified for: `siac-poac-paac-weekly-hearing-list`, `ftt-tax-chamber-weekly-hearing-list`, `ftt-rpt-weekly-hearing-list`, `ftt-lands-registration-tribunal-weekly-hearing-list`, `grc-weekly-hearing-list`, `care-standards-tribunal-weekly-hearing-list`, `cic-weekly-hearing-list`, `ast-daily-hearing-list`, `wpafcc-weekly-hearing-list`, `send-daily-hearing-list`, `utiac-jr-daily-hearing-list`, `utiac-statutory-appeal-daily-hearing-list`, `rcj-standard-daily-cause-list`, `administrative-court-daily-cause-list`, `upper-tribunal-administrative-appeals-chamber-daily-hearing-list`, `upper-tribunal-lands-chamber-daily-hearing-list`, `upper-tribunal-tax-and-chancery-chamber-daily-hearing-list`.

The render interceptor spreads `en.error403Title` (which is `undefined`) as `title` into the template context. Nunjucks treats explicitly-passed `undefined` as falsy, so the heading falls back to `t.heading`. However, `t` in the template context is whatever `res.locals.t` is at 403 render time — the 403 render call does not pass `t`, so this will be stale or undefined. The result is a 403 page that renders with an empty heading, empty paragraph, and missing contact information for all non-strategic list types.

The `hearing-lists/[locationId]/[artefactId]/index.ts` 403 handler (lines 30–35) has the same problem since `en.error403Title` and `en.error403Message` are not defined in `apps/web/src/pages/(public)/hearing-lists/en.ts` either.

**Impact:** Security enforcement works (HTTP 403 is returned), but the error page is broken — users see a blank page with no explanation. This is a functional regression affecting user experience for every non-strategic list type denial.

**Solution (two options):**

Option A — Simplest: pass `message` and `title` directly as hardcoded fallback strings:
```typescript
return res.status(403).render("errors/403", {
  en: {
    title: (en.error403Title as string | undefined) ?? "Access Denied",
    message: (en.error403Message as string | undefined) ?? "You do not have permission to view this publication."
  },
  cy: {
    title: (cy.error403Title as string | undefined) ?? "Mynediad Gwrthodwyd",
    message: (cy.error403Message as string | undefined) ?? "Nid oes gennych ganiatâd i weld y cyhoeddiad hwn."
  }
});
```

Option B — Preferred for consistency: add `error403Title` and `error403Message` fields to all non-strategic locale files (as the strategic list types do, e.g. `civil-and-family-daily-cause-list`). This makes the locale contract explicit and testable.

The same fix is needed in `apps/web/src/pages/(public)/hearing-lists/[locationId]/[artefactId]/index.ts` and in the `hearing-lists` `en.ts`/`cy.ts`.

---

## HIGH PRIORITY Issues

### 2. Missing Cache-Control headers on 403 responses from createSimpleListTypeHandler and the display page

**Files:** `apps/web/src/pages/(list-types)/list-type-handler.ts` lines 182–193; `apps/web/src/pages/(public)/hearing-lists/[locationId]/[artefactId]/index.ts` lines 30–35

**Problem:** The 403 responses from both `createSimpleListTypeHandler` and the flat-file display page do not set `Cache-Control: no-store` headers. The download API route correctly sets:
```typescript
res.setHeader("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
```
but the HTML 403 renders do not. A browser or CDN could cache a 403 response, potentially creating inconsistent behaviour (though the risk of caching a 403 as a false positive is lower than caching a 200 access-granted response).

**Impact:** Medium risk. CDN or browser caching of the 403 HTML responses. The download API is correct; the rendering paths are inconsistent.

**Recommendation:** Add `res.setHeader("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate")` before the `res.status(403).render(...)` calls in both locations, matching the download route's pattern.

### 3. Test gaps in list-type-handler.test.ts — verified user and admin role cases not covered

**File:** `apps/web/src/pages/(list-types)/list-type-handler.test.ts`

**Problem:** The plan specified five test cases. Only three are implemented:
- Unauthenticated + CLASSIFIED → 403 (covered, line 84)
- Unauthenticated + PRIVATE → 403 (covered, line 102)
- Unauthenticated + PUBLIC → renders page (covered, line 116)
- SYSTEM_ADMIN + CLASSIFIED → renders page (covered, line 132)

Missing:
- **Verified user with matching provenance + CLASSIFIED → access granted** (acceptance criterion 6 from the ticket)
- **CTSC or Local admin + PRIVATE/CLASSIFIED → 403** (acceptance criterion 8 from the ticket)

These are important because `canAccessPublicationData` has distinct branches for `INTERNAL_ADMIN_CTSC`/`INTERNAL_ADMIN_LOCAL` roles. Without these tests, regressions in the authorisation service's CTSC/admin logic would not be caught at the handler level.

**Recommendation:** Add the two missing test cases to `list-type-handler.test.ts`.

### 4. Test gap — getFileForDownload does not test the verified user case

**File:** `libs/public-pages/src/flat-file/flat-file-service.test.ts`

**Problem:** The plan called for a test: "Verified user, matching provenance, CLASSIFIED → returns file." This case is absent from the `getFileForDownload` describe block. Only the denial cases are tested. The `getFlatFileForDisplay` describe block also lacks this case. While `canAccessPublicationData` is mocked, having an explicit test that the service returns success when access is granted for a CLASSIFIED artefact with a matching-provenance user verifies the plumbing is correct end-to-end.

**Recommendation:** Add one test per function: verified user (mocked `canAccessPublicationData` returns `true`) + CLASSIFIED artefact → file data returned.

---

## SUGGESTIONS

### 5. `SimpleLocaleContent` does not declare error403 fields, TypeScript cannot catch the gap

**File:** `apps/web/src/pages/(list-types)/list-type-handler.ts` line 121

The `SimpleLocaleContent` type is `{ [key: string]: unknown }`, which means TypeScript will not warn when a list-type locale object is passed without `error403Title`/`error403Message`. The `LocaleContent` type used by `createListTypeHandler` correctly declares these as optional fields (`error403Title?: string`). Consider updating `SimpleLocaleContent` to include:
```typescript
type SimpleLocaleContent = {
  error403Title?: string;
  error403Message?: string;
  [key: string]: unknown;
};
```
This makes the expected shape visible and helps prevent the regression described in issue 1 from occurring again without at least a deliberate override.

### 6. `canAccessPublicationData` called with always-defined `ListType` when `dbListType` is null

**File:** `apps/web/src/pages/(list-types)/list-type-handler.ts` lines 175–180; `libs/public-pages/src/flat-file/flat-file-service.ts` lines 27–32 and 80–85

When `prisma.listType.findUnique` returns `null`, both the handler and the service construct a `ListType` with `provenance: ""` and `isNonStrategic: true` rather than passing `undefined`. The `canAccessPublicationData` function accepts `ListType | undefined` and specifically checks `if (!listType) return false` for CLASSIFIED artefacts. The implemented approach achieves fail-closed behaviour via an empty provenance string (no user provenance will equal `""`), but it bypasses the explicit null guard in the service. This is functionally equivalent but slightly inconsistent with how `canAccessPublicationData` is designed. Consider aligning:
```typescript
const dbListType = await prisma.listType.findUnique({ where: { id: artefact.listTypeId } });
const listType: ListType | undefined = dbListType
  ? { id: dbListType.id, provenance: dbListType.allowedProvenance, isNonStrategic: dbListType.isNonStrategic }
  : undefined;
```
This matches the pattern already used in `createListTypeHandler` (lines 62–68) and makes the fail-closed intent explicit.

### 7. `createListTypeHandler` retains the opt-in `checkAccess` footgun

**File:** `apps/web/src/pages/(list-types)/list-type-handler.ts` lines 24–25

The plan noted that an opt-in `checkAccess` flag creates a footgun for future list types. `createSimpleListTypeHandler` correctly makes access control unconditional, but `createListTypeHandler` still uses `checkAccess: false` as its default. This is out of scope for #794, but worth flagging: any new list type that uses `createListTypeHandler` without `checkAccess: true` will be unprotected.

---

## Positive Feedback

- The implementation correctly reuses the existing `canAccessPublicationData` function without duplicating any access-control logic. This is the right approach.
- Access control runs before `getFileBuffer` is called, so blob content is never fetched for denied users on any of the three exposure points.
- The `createSimpleListTypeHandler` access check runs before the `guardArtefact` callback, which is the correct ordering.
- The non-PDF redirect in `hearing-lists/.../index.ts` is correctly blocked when `ACCESS_DENIED` is returned — the check at lines 29–35 returns early before the redirect at line 71. This satisfies the requirement that a denied user is never sent to the download endpoint.
- The download API route sets `Cache-Control: no-store` headers on denied responses (line 23).
- All 17 new unit tests pass. Test file structure follows the AAA pattern required by `.claude/rules/testing.md`.
- The mock artefact in `list-type-handler.test.ts` uses `listTypeId: 999` to confirm the logic is independent of numeric IDs, consistent with the CLAUDE.md guidance.
- `getFileForDownload` passes `req.user` to the service and the integration test at line 276 verifies this explicitly.
- TypeScript types are used correctly throughout: `UserProfile | undefined`, `ListType`, `Artefact` — no arbitrary `any` additions in production code. The `as any` in test mocks is unavoidable given Prisma's full return type.
- `.js` extensions are used on all relative imports.

---

## Test Coverage Assessment

**Unit tests:** The three key files each have new access-control tests. `flat-file-service.test.ts` has 17 tests covering the new paths. `list-type-handler.test.ts` has 4 tests for `createSimpleListTypeHandler`. The download API route test covers the `ACCESS_DENIED` → 403 JSON case. All 3438 existing tests continue to pass with no regressions.

**Missing coverage:** As detailed in issues 3 and 4 above — verified user with matching provenance (CLASSIFIED → granted), CTSC/Local admin (PRIVATE/CLASSIFIED → denied), and the `hearing-lists` display page does not test that `req.user` is passed to `getFlatFileForDisplay` (the test mocks the whole import and does not verify call arguments).

**E2E tests:** No E2E tests are included. Given that this is a security fix affecting access control paths, an E2E test that verifies a public user receives a 403 on a CLASSIFIED non-strategic list URL would be valuable. However, E2E test creation requires seeded CLASSIFIED non-strategic artefacts which may not be practical in the CI environment without additional fixture work.

---

## Acceptance Criteria Verification

| Criterion | Status | Notes |
|-----------|--------|-------|
| 1. Public user blocked from CLASSIFIED non-strategic JSON list → HTTP 403 | PASS | `createSimpleListTypeHandler` calls `canAccessPublicationData` before serving JSON |
| 2. Public user blocked from PRIVATE non-strategic JSON list → HTTP 403 | PASS | Same path |
| 3. Public user blocked from flat-file display (CLASSIFIED/PRIVATE) → HTTP 403 | PASS | `getFlatFileForDisplay` returns `ACCESS_DENIED`; display page renders 403 |
| 4. Public user blocked from flat-file download → HTTP 403 JSON | PASS | Download route returns `{ error: "Access denied" }` with 403 |
| 5. PUBLIC lists remain accessible | PASS | `canAccessPublicationData` returns `true` for PUBLIC sensitivity |
| 6. Verified user with matching provenance → access granted | PASS (runtime logic) / UNTESTED (unit test gap) | Logic is correct in `canAccessPublicationData`; no unit test at handler level |
| 7. Verified user without matching provenance → HTTP 403 | PASS (runtime logic) / UNTESTED (unit test gap) | Logic is correct |
| 8. CTSC/Local admin denied data for PRIVATE/CLASSIFIED | PASS (runtime logic) / UNTESTED (unit test gap) | Logic is in `canAccessPublicationData` |
| 9. SYSTEM_ADMIN retains full access | PASS | Tested in `list-type-handler.test.ts` |
| **All accepted** | **With caveats** | Core security enforcement is correct; 403 page rendering is broken for non-strategic types (issue 1) |

---

## Next Steps

- [ ] Fix critical issue 1: add `error403Title`/`error403Message` to all non-strategic locale files, or use hardcoded fallback strings in the handler renders — confirm the 403 page renders with visible content
- [ ] Fix the same in `hearing-lists/en.ts` and `hearing-lists/cy.ts` (the flat-file display page 403 path)
- [ ] Address issue 2: add `Cache-Control: private, max-age=0, no-cache, no-store, must-revalidate` header before the HTML 403 renders in `createSimpleListTypeHandler` and the flat-file display page
- [ ] Add missing unit tests (issues 3 and 4): verified user + CLASSIFIED → granted; CTSC/Local admin + PRIVATE/CLASSIFIED → denied
- [ ] Consider suggestion 5: tighten `SimpleLocaleContent` type to declare `error403Title?` and `error403Message?`
- [ ] Consider suggestion 6: align the `null` listType handling to pass `undefined` rather than a default object, to match `createListTypeHandler` and the explicit intent of `canAccessPublicationData`
- [ ] Re-run `yarn test` after the above changes

---

## Overall Assessment

**NEEDS CHANGES**

The access control enforcement logic is correct and all three exposure points are closed. The critical blocker is that the 403 error page will render completely empty for every non-strategic list type, because none of those locale files define the `error403Title` and `error403Message` fields that the handler tries to pass to the template. This is a user-facing functional regression accompanying the security fix. Fix issue 1 and 2 before deploying to production.
