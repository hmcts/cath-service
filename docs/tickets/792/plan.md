# Technical Plan: #792 — Mental Health Tribunal Daily Hearing List

## 1. Technical Approach

This is a pure data/configuration change. There is no validation schema and no style guide, making this a non-strategic list type. The work involves:

1. Adding a new entry to the list-type seed data (`list-type-data.ts`).
2. Adding a new location entry to the location seed data (`location-data.ts`) — a "Mental Health Tribunal" location is required so that a `LocationMetadata` caution message record can be attached to it.
3. The caution message itself is not seeded in code. It is entered by a system admin at runtime via the existing `location-metadata-manage` admin journey.

No new pages, routes, templates, or migrations are required. The `LocationMetadata` model and the non-strategic upload flow already handle everything this ticket needs.

---

## 2. Implementation Details

### File: `libs/location/src/list-type-data.ts`

Add a new entry at the end of the `listTypeData` array. The current highest id is **27** (SJP_DELTA_PUBLIC_LIST), so the new entry takes id **28**.

```typescript
{
  id: 28,
  name: "MENTAL_HEALTH_DAILY_HEARING_LIST",
  englishFriendlyName: "Mental Health Tribunal Daily Hearing List",
  welshFriendlyName: "Rhestr Wrandawiadau Dyddiol y Tribiwnlys Iechyd Meddwl",
  provenance: "MANUAL_UPLOAD",
  isNonStrategic: true,
  defaultSensitivity: "Public",
  subJurisdictionIds: [20]
}
```

Key decisions:
- `isNonStrategic: true` — no JSON schema or style guide exists, so this is uploaded via the non-strategic upload journey.
- `provenance: "MANUAL_UPLOAD"` — consistent with other manually-uploaded non-strategic list types such as id 15 (KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST).
- `subJurisdictionIds: [20]` — verified: subJurisdictionId 20 is "Mental Health Tribunal" under jurisdictionId 4 (Tribunal) in `location-data.ts`.
- No `urlPath` field — non-strategic uploads are served as flat files, not rendered pages.
- The Welsh translation `"Rhestr Wrandawiadau Dyddiol y Tribiwnlys Iechyd Meddwl"` is sourced from `templates/tech-spec-references/welsh-translations-catalogue.json`.

### File: `libs/location/src/location-data.ts`

Add a new location entry. The current highest locationId is **12**, so the new entry takes locationId **13**.

```typescript
{
  locationId: 13,
  name: "Mental Health Tribunal",
  welshName: "Tribiwnlys Iechyd Meddwl",
  regions: [8],
  subJurisdictions: [20]
}
```

Key decisions:
- `regions: [8]` — regionId 8 is "National", as specified in the acceptance criteria and confirmed in `location-data.ts`.
- `subJurisdictions: [20]` — links this location to the Mental Health Tribunal sub-jurisdiction.
- The Welsh location name `"Tribiwnlys Iechyd Meddwl"` matches the existing `welshName` on subJurisdictionId 20.
- This location entry is necessary because `LocationMetadata` (which holds `cautionMessage`) has a foreign key to `Location`. Without a location row, there is no way to attach the caution message via the admin UI.

### Post-deployment admin action (not code)

After deployment, a system admin must:
1. Navigate to the location metadata admin journey and search for "Mental Health Tribunal".
2. Set the English caution message: `Mental health hearings are held in private and unless a request has been made by the patient for a public hearing a hearing list will not be published.`
3. Set the Welsh caution message accordingly.

This is not seeded in code because caution messages are managed at runtime through the `location-metadata-manage` admin page, consistent with how all other caution messages are maintained.

### No other files require changes

- The non-strategic upload dropdown (`apps/web/src/pages/(admin)/non-strategic-upload/index.ts`) calls `findNonStrategicListTypes()` which queries `listType.isNonStrategic = true`. Once the new list type is seeded, it will appear in the dropdown automatically — no code change needed.
- `findNonStrategicListTypes()` in `libs/system-admin-pages/src/list-type/queries.ts` already selects `shortenedFriendlyName` and falls back to `friendlyName`. Since no `shortenedFriendlyName` is set for this entry, the dropdown will display `"Mental Health Tribunal Daily Hearing List"` — matching the acceptance criteria.
- The `summary-of-publications/index.njk` template already renders `{{ cautionMessage | safe }}` when present. No template changes are needed.
- No new Prisma migration is required because no schema changes are made.

---

## 3. Error Handling & Edge Cases

- **Seed upsert safety**: The seed uses `upsert` on `listType.name`, so re-running the seed will not create duplicates.
- **Location seed guard**: Location seeding only runs when tables are empty (`tablesEmpty`). Adding a new location to `location-data.ts` means it will be created on fresh environments. For existing environments, a system admin would need to create the location manually or via a one-off migration script — this is an open question (see section 5).
- **Missing sub-jurisdiction**: The seed throws if no sub-jurisdictions match. SubJurisdictionId 20 is already seeded, so this will not fail.
- **Caution message not set**: If no `LocationMetadata` record exists for the location, the summary-of-publications page simply renders nothing for `cautionMessage`. Citizens see no message until a system admin sets it — acceptable because the message is informational, not blocking.

---

## 4. Acceptance Criteria Mapping

| Acceptance criterion | Implementation |
|---|---|
| Mental Health Tribunal Daily Hearing List created in the front end | New entry in `list-type-data.ts` (id 28) with `isNonStrategic: true` |
| Linked to Tribunal jurisdiction | Via `subJurisdictionIds: [20]` which belongs to `jurisdictionId: 4` (Tribunal) |
| Linked to National region | New location entry in `location-data.ts` with `regions: [8]` (National) |
| Same name displayed on the manual upload form | `findNonStrategicListTypes()` returns `friendlyName: "Mental Health Tribunal Daily Hearing List"` which the dropdown renders |
| Caution message displayed on summary of publications | System admin sets `cautionMessage` via the location-metadata-manage page; template already renders it |
| No validation schema or style guide | `isNonStrategic: true`, no `urlPath` set — uploaded as flat file via non-strategic upload journey |

---

## 5. Open Questions / Clarifications Needed

1. **Existing environments**: The `locationData.locations` seed only runs when tables are empty. For existing deployed environments (e.g., staging, production), the new "Mental Health Tribunal" location (id 13) will not be automatically created by the seed. A one-off database migration or a change to the seed strategy (e.g., upsert locations unconditionally) may be needed. Confirm whether this needs to be handled in-ticket or via a separate ops task.

2. **Caution message Welsh text**: The ticket specifies the English caution message exactly. A Welsh translation needs to be confirmed before the system admin sets it in the admin UI. Is there an agreed Welsh translation, or should the system admin coordinate with the content team?

3. **`provenance` field**: The ticket does not specify a provenance value. `"MANUAL_UPLOAD"` is used here by analogy with other manually uploaded non-strategic list types. Confirm this is correct.

4. **`defaultSensitivity`**: Set to `"Public"` as a reasonable default. Mental Health hearings are held in private, but the hearing *list* (if published) would be public. Confirm the intended default sensitivity.
