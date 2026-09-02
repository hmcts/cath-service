# Technical Plan — Issue #794: Fix non-strategic lists Sensitivity issue

## 1. Technical Approach

The `canAccessPublicationData` function in `libs/publication/src/authorisation/service.ts` already implements the correct access control logic. The bug is purely a missing enforcement on three read/download paths. The fix adds the existing check to those paths — no new access logic is introduced.

### Three exposure points to close

| Path | Current state | Fix |
|------|---------------|-----|
| `createSimpleListTypeHandler` (all non-strategic JSON list pages) | No auth check | Add access check centrally in the handler |
| `getFlatFileForDisplay` (flat-file display page) | No auth check | Accept `user`, add check, return `ACCESS_DENIED` error |
| `getFileForDownload` + download API route | No auth check | Accept `user`, add check, return `ACCESS_DENIED` error |

### Recommended approach: centralise in `createSimpleListTypeHandler`

Rather than adding an opt-in `checkAccess` flag (which creates the same footgun for future list types), always enforce `canAccessPublicationData` inside `createSimpleListTypeHandler`. The handler already loads the artefact via `getArtefactById`; adding the list type lookup and access check mirrors exactly what `createListTypeHandler` does when `checkAccess: true`.

---

## 2. Implementation Details

### File: `apps/web/src/pages/(list-types)/list-type-handler.ts`

**Current `SimpleHandlerOptions<T>` interface** — no access control fields.

**Change:** After the `getArtefactById` call inside `createSimpleListTypeHandler`, add:

```typescript
const dbListType = await prisma.listType.findUnique({ where: { id: artefact.listTypeId } });
const listType: ListType = {
  id: artefact.listTypeId,
  provenance: dbListType?.allowedProvenance ?? "",
  isNonStrategic: dbListType?.isNonStrategic ?? true,
};
if (!canAccessPublicationData(req.user, artefact, listType)) {
  res.status(403).render("errors/403", { ... });
  return;
}
```

The exact 403 render arguments pattern (locale, `en`/`cy` error objects) should match what `createListTypeHandler` already does — check line ~80–95 of the current handler for the exact shape.

**Imports to add:** `canAccessPublicationData`, `ListType` from `@hmcts/publication`; `prisma` from `@hmcts/postgres-prisma`.

Both are already imported in the same file by `createListTypeHandler` — confirm they are at the top of the file (not inside the closure) and reuse them.

---

### File: `libs/public-pages/src/flat-file/flat-file-service.ts`

**`getFlatFileForDisplay` signature change:**

```typescript
// Before
export async function getFlatFileForDisplay(artefactId: string, locationId: string, locale: string)

// After
export async function getFlatFileForDisplay(artefactId: string, locationId: string, locale: string, user: UserProfile | undefined)
```

**`getFileForDownload` signature change:**

```typescript
// Before
export async function getFileForDownload(artefactId: string)

// After
export async function getFileForDownload(artefactId: string, user: UserProfile | undefined)
```

**Logic to add** (after existing `isFlatFile`/window/location checks, before fetching the file buffer):

```typescript
const dbListType = await prisma.listType.findUnique({ where: { id: artefact.listTypeId } });
const listType: ListType = {
  id: artefact.listTypeId,
  provenance: dbListType?.allowedProvenance ?? "",
  isNonStrategic: dbListType?.isNonStrategic ?? true,
};
if (!canAccessPublicationData(user, artefact, listType)) {
  return { error: "ACCESS_DENIED" as const };
}
```

**Error union update** — add `"ACCESS_DENIED"` to the existing discriminated union returned by both functions.

**Imports to add:** `UserProfile` from `@hmcts/auth` (or wherever the type lives), `canAccessPublicationData`, `ListType` from `@hmcts/publication`, `prisma` from `@hmcts/postgres-prisma`.

Check `libs/public-pages/package.json` — if `@hmcts/publication` is not already a dependency, add it.

---

### File: `apps/web/src/pages/(public)/hearing-lists/[locationId]/[artefactId]/index.ts`

**Change:** Pass `req.user` to `getFlatFileForDisplay` and handle the new error code before the existing redirect logic:

```typescript
const result = await getFlatFileForDisplay(artefactId, locationId, locale, req.user);

if (result.error === "ACCESS_DENIED") {
  res.status(403).render("errors/403", { /* existing 403 render args pattern */ });
  return;
}
```

The `ACCESS_DENIED` check must appear before the non-PDF redirect to `/api/flat-file/${...}/download`, ensuring a denied user is never sent to the download endpoint.

---

### File: `libs/public-pages/src/routes/api/flat-file/[artefactId]/download.ts`

**Change:** Pass `req.user` to `getFileForDownload` and map `ACCESS_DENIED` to HTTP 403:

```typescript
const result = await getFileForDownload(artefactId, req.user);

if (result.error === "ACCESS_DENIED") {
  res.status(403).json({ error: "Access denied" });
  return;
}
```

---

## 3. Error Handling & Edge Cases

- **Missing list type:** If `prisma.listType.findUnique` returns `null` for a `CLASSIFIED` artefact, `allowedProvenance` defaults to `""`. `canAccessPublication` with `CLASSIFIED` checks `user.provenance === listType.provenance` — an empty provenance will not match any real provenance, so access is denied. **Fail-closed** behaviour is preserved.
- **Missing sensitivity field:** `canAccessPublication` already defaults to `CLASSIFIED` if sensitivity is null/empty. No change needed.
- **PUBLIC artefacts:** `canAccessPublication` returns `true` for any sensitivity `PUBLIC` regardless of user. No regression for public content.
- **Non-PDF flat file redirect:** The `ACCESS_DENIED` check in the display page runs before the redirect branch, so denied users never reach the download API.
- **Unauthenticated users on strategic list pages:** Unaffected — `createListTypeHandler` with `checkAccess: true` already handles them.

---

## 4. Acceptance Criteria Mapping

| Criterion | Satisfied by |
|-----------|-------------|
| Public blocked from CLASSIFIED JSON list | `createSimpleListTypeHandler` access check |
| Public blocked from PRIVATE JSON list | `createSimpleListTypeHandler` access check |
| Public blocked from flat-file display | `getFlatFileForDisplay` + display page 403 handler |
| Public blocked from flat-file download | `getFileForDownload` + download route 403 handler |
| PUBLIC lists remain accessible | `canAccessPublicationData` returns true for PUBLIC (no change) |
| Verified user with matching provenance accesses CLASSIFIED | `canAccessPublication` CLASSIFIED logic (no change) |
| Verified user without matching provenance blocked | `canAccessPublication` CLASSIFIED logic (no change) |
| CTSC/Local admin denied data | `canAccessPublicationData` blocks INTERNAL_ADMIN_* on PRIVATE/CLASSIFIED (no change) |
| SYSTEM_ADMIN retains full access | `canAccessPublication` SYSTEM_ADMIN shortcut (no change) |

---

## 5. Tests to Write / Update

### Unit tests for `createSimpleListTypeHandler` (list-type-handler.test.ts)

Add test cases:
- Unauthenticated user requesting a CLASSIFIED artefact → 403
- Unauthenticated user requesting a PRIVATE artefact → 403
- Unauthenticated user requesting a PUBLIC artefact → renders page (no regression)
- Verified user with matching provenance requesting CLASSIFIED → renders page
- SYSTEM_ADMIN requesting any sensitivity → renders page

### Unit tests for `flat-file-service.ts`

Add test cases to both `getFlatFileForDisplay` and `getFileForDownload`:
- User = undefined, artefact sensitivity = CLASSIFIED → returns `{ error: "ACCESS_DENIED" }`
- User = undefined, artefact sensitivity = PRIVATE → returns `{ error: "ACCESS_DENIED" }`
- User = undefined, artefact sensitivity = PUBLIC → returns file (no regression)
- Verified user, matching provenance, CLASSIFIED → returns file

### Unit tests for `hearing-lists/[locationId]/[artefactId]/index.ts`

Add test cases:
- `getFlatFileForDisplay` returns `ACCESS_DENIED` → renders 403, status 403
- `ACCESS_DENIED` for a non-PDF artefact → does NOT redirect to download endpoint

### Unit tests for download API route

Add test cases:
- `getFileForDownload` returns `ACCESS_DENIED` → responds 403 JSON `{ error: "Access denied" }`

---

## 6. Open Questions / Clarifications Needed

- **Dependency check:** Confirm `@hmcts/publication` is (or can be) a dependency of `libs/public-pages`. If not, the access check for flat files needs to move to the web app layer (display page + download route) with a double artefact fetch, or a shared helper needs to be extracted.
- **`UserProfile` import path:** Confirm the exact import path for `UserProfile` in `libs/public-pages` — check what `apps/web` uses for `req.user` type.
- **`prisma` in `libs/public-pages`:** Confirm `@hmcts/postgres-prisma` is already a dependency (likely yes, as `getArtefactById` calls the DB).
- **Existing 403 render args in `createSimpleListTypeHandler`:** The handler currently uses `en`/`cy` objects from the list-type page — the 403 render must use consistent content. Check `createListTypeHandler`'s 403 path for the exact argument shape and replicate it.
- **Non-strategic upload UI:** Out of scope, but the Sensitivity selector at upload should probably be constrained to `PUBLIC` only for list types that are intended to always be public — worth flagging to the service team.
