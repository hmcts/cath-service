# Technical Plan: PCOL Daily Cause List (#438)

## 1. Technical Approach

This is a pure data-configuration change. No new pages, routes, or modules are required. The entire implementation is a single new entry in `libs/location/src/list-type-data.ts`.

Adding an entry to `listTypeData` automatically:
- Seeds a `list_type` row and associated `list_types_sub_jurisdictions` junction rows on deploy
- Makes the list type available in the relevant upload form dropdown
- Registers the `urlPath` slug for downstream routing

No JSON schema, no renderer/PDF module, no validator — confirmed out of scope by the AC.

## 2. Implementation Details

### File to Change

**`libs/location/src/list-type-data.ts`**

Add the following entry. The next available `id` is **28** (verify against the file at implementation time — do not hardcode without checking the current max).

```typescript
{
  id: 28,
  name: "PCOL_DAILY_CAUSE_LIST",
  englishFriendlyName: "PCOL Daily Cause List",
  welshFriendlyName: "PCOL Daily Cause List",   // TRANSLATE: use approved Welsh string if available
  provenance: "MANUAL_UPLOAD",
  urlPath: "pcol-daily-cause-list",
  isNonStrategic: true,                          // see Open Questions — must be confirmed
  defaultSensitivity: "Public",
  shortenedFriendlyName: "PCOL Daily Cause List",
  subJurisdictionIds: [1],                       // Civil Court sub-jurisdiction (Civil jurisdiction)
}
```

**Note on `isNonStrategic`:** The closest existing precedent — `KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST` (id 15) — is `provenance: MANUAL_UPLOAD` and `isNonStrategic: true`, placing it in the **non-strategic upload** form (`/non-strategic-upload`). If PCOL should appear in that same form, use `isNonStrategic: true`. If it must appear in the standard `/manual-upload` form instead, use `isNonStrategic: false`. **This must be confirmed with the product owner before merging** (see Open Questions).

### No Other Code Changes

- `libs/location/src/seed-list-types.ts` — no change needed; seed routine upserts all entries from `listTypeData` automatically.
- `apps/web/src/pages/(admin)/manual-upload/` — no change; dropdown is dynamically sourced.
- `apps/web/src/pages/(admin)/non-strategic-upload/` — no change; same reason.
- No new lib, no schema file, no renderer, no migration file to hand-author.

### Database Effect

On `yarn db:migrate:dev` (or deployment seeding), `seedListTypes()` will:
1. Upsert a row in `list_type` with `name = PCOL_DAILY_CAUSE_LIST`, `provenance = MANUAL_UPLOAD`, `is_non_strategic = true` (or `false` depending on the decision above).
2. Create a row in `list_types_sub_jurisdictions` linking the new list type to sub-jurisdiction id 1 (Civil Court).

## 3. Error Handling & Edge Cases

- **Duplicate id:** The `id` must be unique. Verify the current max before assigning 28 — if another ticket merged concurrently, increment accordingly.
- **Duplicate name / urlPath:** Both must be unique in the array. `PCOL_DAILY_CAUSE_LIST` and `pcol-daily-cause-list` are not currently in use.
- **Welsh translation absent:** If no approved Welsh string is available at implementation time, retain the English string (`"PCOL Daily Cause List"`) as the `welshFriendlyName`. This matches the Civil Daily Cause List precedent.

## 4. Acceptance Criteria Mapping

| AC | How satisfied |
|----|---------------|
| PCOL Daily Cause List created in front end and linked to Civil Jurisdiction | Entry in `listTypeData` with `subJurisdictionIds: [1]` seeds the DB linkage and surfaces the list type in the upload form |
| List name displayed as "PCOL Daily Cause list" in the manual upload form | `shortenedFriendlyName: "PCOL Daily Cause List"` — the upload form renders `shortenedFriendlyName \|\| friendlyName \|\| name` |
| No validation schema or style guide | Nothing added under `libs/list-types/` for PCOL |

## 5. Testing

### Unit Test (existing file)
`libs/location/src/list-type-data.test.ts` (or equivalent) — verify:
- Array contains entry with `name: "PCOL_DAILY_CAUSE_LIST"`
- `id` is unique within the array
- `urlPath` is unique within the array
- `subJurisdictionIds` includes `1`
- `isNonStrategic` matches the agreed value

### Integration / Seed Verification
After running `yarn db:migrate:dev`:
- `list_type` table has a row with `name = PCOL_DAILY_CAUSE_LIST`
- `list_types_sub_jurisdictions` has a junction row for this list type and sub-jurisdiction 1

### E2E (extend existing upload journey, tagged `@nightly`)
Within the existing manual-upload or non-strategic-upload journey test:
- "PCOL Daily Cause List" appears in the list type dropdown
- Selecting it and uploading a file completes without a content-schema validation error
- Welsh display name is visible via `?lng=cy`
- Inline axe accessibility check passes

## 6. Open Questions — CLARIFICATIONS NEEDED

1. **`isNonStrategic` value (blocking):** Should PCOL appear in the `/manual-upload` form (`isNonStrategic: false`) or the `/non-strategic-upload` form (`isNonStrategic: true`, matching `KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST`)? The AC says "manual upload form" but does not distinguish the two routes. The nearest precedent (King's Bench Masters) is non-strategic.

2. **Welsh friendly name:** Is there an approved Welsh translation for "PCOL Daily Cause List"? If not, default to the English string.

3. **Sub-jurisdiction:** Should PCOL only be linked to Civil Court (`subJurisdictionId: 1`), or also to High Court (`10`) or Court of Appeal Civil Division (`5`)?

4. **Default sensitivity:** Confirmed as `Public`? Any reason PCOL content would warrant `Private`?

5. **Display name casing:** The issue body writes "PCOL Daily Cause **list**" (lower-case l). All other list-type friendly names are title-cased. Confirm "PCOL Daily Cause **List**" (upper-case L) is correct.
