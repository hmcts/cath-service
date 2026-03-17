# Technical Plan: #438 — CaTH Lists for Manual Publishing

## 1. Technical Approach

This ticket is a reference data extension. Four new non-strategic list types are added to `mock-list-types.ts`, a new "National" region is added to location seed data, and the existing MHT `noListMessage` infrastructure is used to display the privacy notice. No new pages, routes, or components are required.

The approach is:
- Add 4 new `ListType` entries to `libs/list-types/common/src/mock-list-types.ts`
- Add "National" region (regionId: 7) to `libs/location/src/location-data.ts` and `e2e-tests/utils/seed-reference-data.ts`
- Document that an admin must set `noListMessage` on each MHT location via the existing system-admin location metadata UI
- Verify alphabetical sort on the summary-of-publications page naturally handles IAC ordering (no code change needed)
- Add an E2E test covering all new list types

## 2. Implementation Details

### 2.1 New List Types

**File:** `libs/list-types/common/src/mock-list-types.ts`

Add 4 entries after the existing 23 (IDs 24–27):

```typescript
{
  id: 24,
  name: "POSSESSION_DAILY_CAUSE_LIST",
  englishFriendlyName: "PCOL Daily Cause List",
  welshFriendlyName: "[WELSH TRANSLATION REQUIRED]",
  provenance: "MANUAL_UPLOAD",
  urlPath: "possession-daily-cause-list",
  isNonStrategic: true
},
{
  id: 25,
  name: "MENTAL_HEALTH_TRIBUNAL_DAILY_HEARING_LIST",
  englishFriendlyName: "Mental Health Tribunal Daily Hearing List",
  welshFriendlyName: "Rhestr Wrandawiadau Dyddiol y Tribiwnlys Iechyd Meddwl",
  provenance: "MANUAL_UPLOAD",
  urlPath: "mental-health-tribunal-daily-hearing-list",
  isNonStrategic: true
},
{
  id: 26,
  name: "IMMIGRATION_AND_ASYLUM_CHAMBER_DAILY_LIST",
  englishFriendlyName: "Immigration and Asylum Chamber Daily List",
  welshFriendlyName: "Rhestr Ddyddiol y Siambr Mewnfudo a Lloches",
  provenance: "MANUAL_UPLOAD",
  urlPath: "immigration-and-asylum-chamber-daily-list",
  isNonStrategic: true
},
{
  id: 27,
  name: "IMMIGRATION_AND_ASYLUM_CHAMBER_DAILY_LIST_ADDITIONAL_CASES",
  englishFriendlyName: "Immigration and Asylum Chamber Daily List \u2013 Additional Cases",
  welshFriendlyName: "[WELSH TRANSLATION REQUIRED]",
  provenance: "MANUAL_UPLOAD",
  urlPath: "immigration-and-asylum-chamber-daily-list-additional-cases",
  isNonStrategic: true
}
```

Once added, the non-strategic upload page at `/non-strategic-upload` will automatically include these in the list type dropdown because it filters `mockListTypes` with `isNonStrategic: true` (see `libs/admin-pages/src/pages/non-strategic-upload/index.ts:17`).

The strategic upload page at `/manual-upload` filters with `!listType.isNonStrategic` so these will **not** appear there.

### 2.2 National Region — Production Seed Data

**File:** `libs/location/src/location-data.ts`

Add to the `regions` array:

```typescript
{
  regionId: 7,
  name: "National",
  welshName: "Cenedlaethol"
}
```

This is the authoritative source used by `libs/location/src/seed-data.ts` when seeding local development environments.

### 2.3 National Region — E2E Test Seed Data

**File:** `e2e-tests/utils/seed-reference-data.ts`

Add to the regions array in `seedRegions()`:

```typescript
{ regionId: 7, name: "National", welshName: "Cenedlaethol" }
```

This mirrors the production data for E2E test runs.

### 2.4 Mental Health Tribunal — `noListMessage` (data operation, not code)

The `noListMessage` is stored in `location_metadata` per location. The existing infrastructure already:
- Stores English (`no_list_message`) and Welsh (`welsh_no_list_message`) variants
- Displays them on `/summary-of-publications` when present (see `libs/public-pages/src/pages/summary-of-publications/index.ts:102`)
- Renders them via `libs/public-pages/src/pages/summary-of-publications/index.njk:52`

**No code change is required.** An admin must set the following message for each Mental Health Tribunal location using the existing location metadata management UI (`/location-metadata-manage`):

- **English:** `Mental health hearings are held in private and unless a request has been made by the patient for a public hearing a hearing list will not be published.`
- **Welsh:** `Cynhelir gwrandawiadau iechyd meddwl yn breifat ac oni bai bod y claf wedi gwneud cais am wrandawiad cyhoeddus ni chaiff rhestr gwrandawiadau ei chyhoeddi.`

### 2.5 IAC Sort Order — Verification Only

The existing sort logic in `libs/public-pages/src/pages/summary-of-publications/index.ts:83-86` sorts publications by `listTypeName` using `localeCompare`. Since `"Immigration and Asylum Chamber Daily List"` is alphabetically before `"Immigration and Asylum Chamber Daily List \u2013 Additional Cases"`, the requirement is satisfied by the existing implementation.

**No code change is required.** This must be verified in the E2E test.

## 3. Error Handling & Edge Cases

- **Welsh translations missing for 2 list types**: The `welshFriendlyName` for `POSSESSION_DAILY_CAUSE_LIST` and `IMMIGRATION_AND_ASYLUM_CHAMBER_DAILY_LIST_ADDITIONAL_CASES` requires input from the Welsh translation team. A placeholder must be replaced before merging to production.
- **regionId: 7 conflict**: Confirm no "National" region already exists in the production database. The seed logic uses `upsert` so duplicate entries are safe; however, if regionId 7 is already taken by a different region in production, the seed data must be adjusted.
- **noListMessage per-location**: The message is not automatically applied to all MHT locations — an admin must explicitly set it for each location. This is a deployment/operational concern, not a code defect.

## 4. Acceptance Criteria Mapping

| Acceptance Criterion | Implementation |
|---|---|
| PCOL Daily Cause List created and linked to Civil Jurisdiction; displayed as "PCOL Daily Cause List" on upload form | Add entry ID 24 to `mock-list-types.ts` with `isNonStrategic: true` and `englishFriendlyName: "PCOL Daily Cause List"`. Jurisdiction association is informational (no code filtering by jurisdiction in upload form). |
| Mental Health Tribunal Daily Hearing List linked to Tribunal jurisdiction and National region | Add entry ID 25 to `mock-list-types.ts`; add National region (regionId: 7) to seed data. Admin assigns MHT locations to National region via existing UI. |
| MHT noListMessage displayed on summary of publications | No code change. Admin sets `noListMessage` per MHT location via existing system-admin UI. |
| IAC Daily List and IAC Daily List – Additional Cases created | Add entries IDs 26 and 27 to `mock-list-types.ts`. |
| IAC Daily List always appears before IAC Daily List – Additional Cases | Existing alphabetical sort in summary-of-publications satisfies this. Verify in E2E test. |

## 5. Files to Change

| File | Change |
|---|---|
| `libs/list-types/common/src/mock-list-types.ts` | Add 4 new list type entries (IDs 24–27) |
| `libs/location/src/location-data.ts` | Add National region (regionId: 7) to `regions` array |
| `e2e-tests/utils/seed-reference-data.ts` | Add National region (regionId: 7) to `seedRegions()` |
| `e2e-tests/tests/manual-upload.spec.ts` (or new spec) | Add E2E tests for new list types |

## 6. Clarifications Needed

1. **Welsh translations**: What are the approved Welsh translations for "PCOL Daily Cause List" and "Immigration and Asylum Chamber Daily List – Additional Cases"?

2. **jurisdictionId on ListType interface**: Should the `ListType` interface be extended with an optional `jurisdictionId` field? The current upload form does not filter list types by jurisdiction, so this would be informational only for now. If filtering is planned in future, adding it now is cleaner.

3. **National region in production**: Does the production database already contain a "National" region? If yes, what is its regionId? The seed data should match the production value.

4. **IAC sub-jurisdiction**: The issue spec notes that IAC has an existing sub-jurisdiction (subJurisdictionId: 6, jurisdictionId: 4). Should the new IAC list types reference this sub-jurisdiction in addition to the Tribunal jurisdiction?

5. **Scope of noListMessage**: Is the `noListMessage` expected to be pre-populated via a database migration for known MHT locations, or is it the admin's responsibility to set it after deployment?
