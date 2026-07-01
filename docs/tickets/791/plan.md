# Plan: IAC Daily List – Register New List Types (#791)

## 1. Technical Approach

Register two new IAC (Immigration and Asylum Chamber) list types for manual upload. Once registered they appear automatically in the admin manual-upload dropdown (which queries all non-strategic list types) and on the public Summary of Publications page.

No new pages, templates, routes, or database schema changes are required. List-type data is sourced from `libs/location/src/list-type-data.ts` and seeded into the database via `libs/location/src/seed-list-types.ts`. Adding two entries to that file and re-running the seed is sufficient for non-production environments.

The one additional code change needed is a stable ordering fix in the Summary of Publications sort comparator. The current comparator sorts by localised friendly name (`listTypeName`). Under Welsh locale the translated names may not preserve the required relative order (Daily List before Additional Cases). The fix adds an explicit priority lookup keyed on the stable `name` field, which is locale-independent.

**Change footprint:**
- `libs/location/src/list-type-data.ts` — add two entries
- `apps/web/src/pages/(public)/summary-of-publications/index.ts` — extend sort comparator
- Unit tests for the updated comparator

---

## 2. Implementation Details

### 2.1 New list-type entries in `libs/location/src/list-type-data.ts`

Append the following two objects to the `listTypeData` array (after id 27). The IAC sub-jurisdiction id is **6** (`"Immigration and Asylum Chamber"`, `welshName: "Siambr Mewnfudo a Lloches"`, `jurisdictionId: 4`).

The closest existing analogue is id 15 (`KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST`): `provenance: "MANUAL_UPLOAD"`, `isNonStrategic: true`, `defaultSensitivity: "Public"`, `urlPath: "kings-bench-masters-daily-cause-list"`. IAC lists differ in that they are flat-file only and do not need a rendered viewer page — but note that the seed script maps `urlPath` to the `url` column and stores an empty string when `urlPath` is falsy (`url: listType.urlPath || ""`). Confirm whether `urlPath` should be `undefined` or a slug before merging (see Open Questions).

```typescript
{
  id: 28,
  name: "IMMIGRATION_AND_ASYLUM_CHAMBER_DAILY_LIST",
  englishFriendlyName: "Immigration and Asylum Chamber Daily List",
  welshFriendlyName: "Rhestr Ddyddiol y Siambr Mewnfudo a Lloches",
  provenance: "MANUAL_UPLOAD",
  urlPath: undefined,
  isNonStrategic: true,
  defaultSensitivity: "Public",
  shortenedFriendlyName: "IAC Daily List",
  subJurisdictionIds: [6]
},
{
  id: 29,
  name: "IMMIGRATION_AND_ASYLUM_CHAMBER_DAILY_LIST_ADDITIONAL_CASES",
  englishFriendlyName: "Immigration and Asylum Chamber Daily List – Additional Cases",
  welshFriendlyName: "[WELSH TRANSLATION REQUIRED]",
  provenance: "MANUAL_UPLOAD",
  urlPath: undefined,
  isNonStrategic: true,
  defaultSensitivity: "Public",
  shortenedFriendlyName: "IAC Daily List – Additional Cases",
  subJurisdictionIds: [6]
}
```

(`–` is the en dash `–`. Confirm en dash vs hyphen — see Open Questions.)

### 2.2 Ordering fix in `apps/web/src/pages/(public)/summary-of-publications/index.ts`

**Root cause.** The sort comparator (lines 100–112) uses `a.listTypeName` / `b.listTypeName`, which is the localised friendly name resolved at line 64:

```typescript
const listTypeName = locale === "cy" ? listType?.welshFriendlyName || "Unknown" : listType?.friendlyName || "Unknown";
```

Under Welsh locale the translated friendly names determine order. If the Welsh translation for Additional Cases does not sort after the Welsh Daily List name, the two publications will appear in the wrong order.

**Fix — two steps:**

**Step 1.** Include the stable `name` field in the mapped publication object. `listType?.name` is already available from `listTypeMap` (the `findAllListTypes` query selects `name`). Add it to the object returned by `publicationsWithDetails.map`:

```typescript
return {
  // ...existing fields...
  listTypeName,
  listTypeStableName: listType?.name ?? "",   // add this line
  // ...
};
```

**Step 2.** Add an IAC priority constant and use it in the comparator:

```typescript
const IAC_LIST_ORDER: Record<string, number> = {
  IMMIGRATION_AND_ASYLUM_CHAMBER_DAILY_LIST: 0,
  IMMIGRATION_AND_ASYLUM_CHAMBER_DAILY_LIST_ADDITIONAL_CASES: 1
};

uniquePublications.sort((a, b) => {
  if (a.listTypeName !== b.listTypeName) {
    // If both entries are in the IAC pair, use explicit priority
    const aOrder = IAC_LIST_ORDER[a.listTypeStableName];
    const bOrder = IAC_LIST_ORDER[b.listTypeStableName];
    if (aOrder !== undefined && bOrder !== undefined) {
      return aOrder - bOrder;
    }
    return a.listTypeName.localeCompare(b.listTypeName);
  }
  // Then by date descending
  const dateComparison = new Date(b.contentDate).getTime() - new Date(a.contentDate).getTime();
  if (dateComparison !== 0) {
    return dateComparison;
  }
  // Finally by language
  return a.language.localeCompare(b.language);
});
```

This is a strictly additive change — existing list types are not affected. Non-IAC publications fall through to the original `localeCompare` path.

Place the `IAC_LIST_ORDER` constant at the top of the file, before the exported `GET` handler, following the module ordering convention (module-scope consts first).

### 2.3 Seeding / deployment

The seed script at `libs/location/src/seed-list-types.ts` upserts list types keyed on `name`. Adding entries to `list-type-data.ts` and running `yarn db:migrate:dev` (which triggers the seed in non-prod) is sufficient for dev, CI, and staging environments.

The seed is **skipped in production** (`ENVIRONMENT === "prod"`). For production deployments a manual insert or migration-based seed extension will be needed. Clarify the production data-loading process with the team.

### 2.4 No other changes needed

- No new pages, templates, or locale files.
- No Prisma schema changes (the `ListType` model already covers all required fields).
- The manual-upload dropdown is populated by `findNonStrategicListTypes()`, which queries all non-strategic list types — the new entries will appear automatically once seeded.
- The flat-file viewer does not require a `urlPath` for display; `isFlatFile: true` artefacts are rendered via a generic route.

---

## 3. Error Handling and Edge Cases

- **Only one IAC list published.** The ordering fix only activates when both `a.listTypeStableName` and `b.listTypeStableName` are in the IAC pair (`aOrder !== undefined && bOrder !== undefined`). If only one IAC list is published, the comparator falls through to `localeCompare` as normal.
- **Non-IAC list types.** `IAC_LIST_ORDER` lookups return `undefined` for all existing list types; the condition `aOrder !== undefined && bOrder !== undefined` is false, so the existing sort path runs unchanged.
- **Welsh locale.** Ordering is now driven by the stable `name` key, not the translated friendly name, so it is locale-independent.
- **Welsh translation placeholder.** Until the Welsh translation for id 29 is confirmed, the seed will store the placeholder string. This is acceptable for a dev/staging deployment but must be resolved before production.

---

## 4. Acceptance Criteria Mapping

| Acceptance criterion | Implementation |
|---|---|
| IAC Daily List appears in manual-upload list-type dropdown | id 28 added to `list-type-data.ts` with `isNonStrategic: true`, `provenance: "MANUAL_UPLOAD"`, `subJurisdictionIds: [6]` |
| IAC Daily List – Additional Cases appears in dropdown | id 29 added with same configuration |
| Both lists appear on Summary of Publications for an IAC venue | Both list types linked to sub-jurisdiction 6; `filterPublicationsForSummary` and the existing template handle display |
| Daily List always sorts before Additional Cases | `IAC_LIST_ORDER` priority map in sort comparator |
| Order is stable under Welsh locale | Sort uses `listTypeStableName` (locale-independent `name` field) rather than translated friendly name |

---

## 5. Open Questions (CLARIFICATIONS NEEDED)

1. **Welsh translation for id 29 (`IMMIGRATION_AND_ASYLUM_CHAMBER_DAILY_LIST_ADDITIONAL_CASES`).** Both `welshFriendlyName` and `shortenedFriendlyName` (Welsh equivalent of "IAC Daily List – Additional Cases") need confirmed translations before production deployment.

2. **Welsh translation for id 28 `welshFriendlyName`.** "Rhestr Ddyddiol y Siambr Mewnfudo a Lloches" is used as a placeholder based on existing Welsh naming patterns for the IAC sub-jurisdiction. Confirm with a Welsh language reviewer.

3. **En dash vs hyphen in "Additional Cases".** The brief uses an en dash (`–`). Confirm the intended character so it is consistent with the Welsh translation and any downstream display.

4. **`defaultSensitivity` for both lists.** Assumed `"Public"` by analogy with other manual-upload non-strategic lists. Confirm.

5. **`urlPath` requirement.** `KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST` (id 15) has `urlPath: "kings-bench-masters-daily-cause-list"` even though it is a manual-upload list. The seed stores `urlPath || ""` in the `url` column. Confirm whether IAC flat-file lists need a `urlPath` slug for the flat-file viewer route, or whether `undefined` (stored as `""`) is correct.

6. **Production data loading.** The seed skips `ENVIRONMENT === "prod"`. Confirm how new list types are loaded into the production database (migration-appended seed, manual script, or another mechanism).
