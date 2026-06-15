# Plan: #582 - System Admin Reference Data Upload - Backend Logic Update

## Overview

This ticket adds provenance support to location reference data. Currently the `location` table stores a single internal ID per court/tribunal. External systems (SNL, COMMON_PLATFORM, CP_CATH, PDDA) use their own IDs. The work breaks into three distinct areas:

1. Add `location_reference` table and update the CSV upload pipeline to accept and store provenance data.
2. Update reference data upload validation to handle the provenance-aware uniqueness rules correctly.
3. Update the publication upload API so external systems can submit their own provenance location IDs, which are translated to the internal location ID before storage.

## Technical Approach

### 1. Database Schema Changes

**New `location_reference` table** in `libs/location/prisma/schema.prisma`:

```prisma
model LocationReference {
  locationReferenceId  String @id @default(cuid()) @map("location_reference_id")
  locationId           Int    @map("location_id")
  provenance           String @map("provenance") @db.VarChar(50)
  provenanceLocationId String @map("provenance_location_id") @db.VarChar(255)
  provenanceLocationType String @map("provenance_location_type") @db.VarChar(50)

  location Location @relation(fields: [locationId], references: [locationId], onDelete: Cascade)

  @@unique([provenance, provenanceLocationId])
  @@map("location_reference")
}
```

The `@@unique([provenance, provenanceLocationId])` constraint ensures that within a given provenance, each external ID maps to exactly one location. Multiple rows for the same `locationId` are permitted (one per provenance).

The `Location` model in the same schema needs a back-relation added:

```prisma
model Location {
  // ... existing fields
  locationReferences LocationReference[]
}
```

**New `location_type` column on `list_types` table** in `libs/location/prisma/schema.prisma`:

```prisma
model ListType {
  // ... existing fields
  locationType String? @map("location_type") @db.VarChar(50)
}
```

The column is nullable because existing list types will not have a value initially. New list types created for external-system publication uploads need a value set.

**Enums** (kept as TypeScript string literal unions, not Prisma enums, to remain consistent with how `provenance` is already stored as a plain `String` column in the `artefact` and `list_types` tables):

```typescript
// libs/location/src/location-reference/model.ts
export const LOCATION_REFERENCE_PROVENANCES = ["SNL", "COMMON_PLATFORM", "CP_CATH", "PDDA"] as const;
export type LocationReferenceProvenance = (typeof LOCATION_REFERENCE_PROVENANCES)[number];

export const LOCATION_REFERENCE_TYPES = ["VENUE", "REGION", "OWNING_HEARING_LOCATION", "NATIONAL"] as const;
export type LocationReferenceType = (typeof LOCATION_REFERENCE_TYPES)[number];
```

Note: The provenance values for `location_reference` (`SNL`, `COMMON_PLATFORM`, `CP_CATH`, `PDDA`) are a subset of the values in `libs/publication/src/provenance.ts`. The existing `Provenance` enum there (`MANUAL_UPLOAD`, `XHIBIT`, `SNL`, `COMMON_PLATFORM`) is used for publication provenance, not location reference provenance. `CP_CATH` and `PDDA` are new values needed only for location reference; the publication `Provenance` enum in `libs/publication/src/provenance.ts` and `ALLOWED_PROVENANCES` in `libs/api/src/blob-ingestion/validation.ts` need `CP_CATH` and `PDDA` added to support those systems uploading publications.

### 2. CSV Upload Pipeline Changes

**New CSV columns** required in the CSV file format (in `libs/system-admin-pages/src/reference-data-upload/`):

- `PROVENANCE` - one of `SNL`, `COMMON_PLATFORM`, `CP_CATH`, `PDDA`
- `PROVENANCE_LOCATION_ID` - external system's ID string
- `PROVENANCE_LOCATION_TYPE` - one of `VENUE`, `REGION`, `OWNING_HEARING_LOCATION`, `NATIONAL`

Because a single location can have multiple provenances, the CSV will allow multiple rows with the same `LOCATION_ID` (and same `LOCATION_NAME` / `WELSH_LOCATION_NAME`), one row per provenance. The parser and model must be updated to handle this.

**Files to change:**

- `libs/system-admin-pages/src/reference-data-upload/model.ts` - extend `CsvRow` and `ParsedLocationData` with provenance fields
- `libs/system-admin-pages/src/reference-data-upload/parsers/csv-parser.ts` - add the three new headers to `REQUIRED_HEADERS`; parse and validate each new field; return one `ParsedLocationData` entry per CSV row (not per location)
- `libs/system-admin-pages/src/reference-data-upload/validation/validation.ts` - update uniqueness rules (see section 3 below)
- `libs/system-admin-pages/src/reference-data-upload/repository/upload-repository.ts` - upsert `location_reference` rows in addition to `location` rows
- `libs/system-admin-pages/src/reference-data-upload/services/enrichment-service.ts` - pass provenance data through to the preview

### Updated model interfaces

```typescript
// libs/system-admin-pages/src/reference-data-upload/model.ts
export interface CsvRow {
  LOCATION_ID: string;
  LOCATION_NAME: string;
  WELSH_LOCATION_NAME: string;
  EMAIL: string;
  CONTACT_NO: string;
  SUB_JURISDICTION_NAME: string;
  REGION_NAME: string;
  PROVENANCE: string;
  PROVENANCE_LOCATION_ID: string;
  PROVENANCE_LOCATION_TYPE: string;
}

export interface ParsedLocationData {
  locationId: number;
  locationName: string;
  welshLocationName: string;
  email: string;
  contactNo: string;
  subJurisdictionNames: string[];
  regionNames: string[];
  provenance: string;
  provenanceLocationId: string;
  provenanceLocationType: string;
}
```

`EnrichedLocationData` extends `ParsedLocationData` unchanged (provenance fields are already present via spread).

### Updated CSV parser logic

The parser currently returns one `ParsedLocationData` per CSV row. With the new fields this remains the same shape. The key change is that the parser must no longer treat duplicate `LOCATION_ID` values as an error - duplicate IDs are allowed as long as each row has a distinct provenance (this is validated in the validation layer, not the parser).

### Updated upload repository logic

```typescript
// In upsertLocations(), after upserting the location:
await tx.locationReference.upsert({
  where: {
    provenance_provenanceLocationId: {
      provenance: row.provenance,
      provenanceLocationId: row.provenanceLocationId
    }
  },
  create: {
    locationId: row.locationId,
    provenance: row.provenance,
    provenanceLocationId: row.provenanceLocationId,
    provenanceLocationType: row.provenanceLocationType
  },
  update: {
    locationId: row.locationId,
    provenanceLocationType: row.provenanceLocationType
  }
});
```

The delete-and-recreate pattern used for `location_region` and `location_sub_jurisdiction` is NOT appropriate here because multiple rows in the same upload may target the same `locationId` with different provenances. Instead, upsert individually per row.

### 3. Validation Rule Update

The ticket specifies the following uniqueness rules:

- **Error**: CSV has multiple rows with the same location name OR Welsh location name but different location IDs.
- **Error**: CSV rows have the same location name OR Welsh location name as an existing DB record, but with a different location ID.
- **Allowed**: CSV has rows with the same location name OR Welsh location name for the same location ID but different provenances.

The current `validateLocationData` in `libs/system-admin-pages/src/reference-data-upload/validation/validation.ts` already handles the first two rules correctly (it checks name uniqueness keyed to `locationId`). The current code maps `locationName -> rowNumber` and errors if the same name appears twice regardless of ID.

The fix is to change the duplicate-detection maps to key on `(locationName, locationId)` rather than `locationName` alone when building the in-file duplicate check. For the DB check the existing logic (exclude rows where `locationId` matches) already handles this correctly.

Concrete change to the in-file loop:

```typescript
// Key: locationName (lower) -> Set of locationIds
const locationNameToIds = new Map<string, Set<number>>();

for (const row of data) {
  const key = row.locationName.toLowerCase();
  const existing = locationNameToIds.get(key) ?? new Set();
  if (existing.size > 0 && !existing.has(row.locationId)) {
    errors.push({ text: `Location name "${row.locationName}" appears for multiple location IDs`, href: "#file" });
  }
  existing.add(row.locationId);
  locationNameToIds.set(key, existing);
}
// Same pattern for welshLocationName
```

**New validation rules to add:**

- `PROVENANCE` must be non-empty and one of `SNL`, `COMMON_PLATFORM`, `CP_CATH`, `PDDA`.
- `PROVENANCE_LOCATION_ID` must be non-empty.
- `PROVENANCE_LOCATION_TYPE` must be non-empty and one of `VENUE`, `REGION`, `OWNING_HEARING_LOCATION`, `NATIONAL`.
- Within the CSV, `(provenance, provenanceLocationId)` must be unique (since that is the DB unique constraint).

**Unique constraint on `location` table** - The ticket says "Location name and Welsh location name on the location table should have unique constraint." The migration `20251117172706` already creates `UNIQUE INDEX "location_name_key"` and `UNIQUE INDEX "location_welsh_name_key"`. No new constraint migration is required; the constraint already exists.

### 4. Publication Upload API Changes

**Goal:** When `provenance` in the blob ingestion request body is one of `SNL`, `COMMON_PLATFORM`, `CP_CATH`, `PDDA`, treat `court_id` as the external provenance location ID and resolve it to the internal `location_id` before storing.

**Where to add the lookup:** `libs/api/src/blob-ingestion/validation.ts` currently calls `getLocationById(parseInt(court_id))`. This needs to change:

- If `provenance` is `MANUAL_UPLOAD` or `XHIBIT`: keep using `court_id` as the internal integer location ID (existing behaviour).
- If `provenance` is an external system (`SNL`, `COMMON_PLATFORM`, `CP_CATH`, `PDDA`): use `court_id` as the provenance location ID string, query `location_reference` table for `(provenance, provenanceLocationId)` and, if found, use the resulting `locationId` as the internal ID.

A new query function is needed in `libs/location/src/`:

```typescript
// libs/location/src/location-reference/queries.ts
export async function getLocationByProvenanceLocationId(
  provenance: string,
  provenanceLocationId: string
): Promise<Location | undefined>
```

This function queries `location_reference` by `(provenance, provenanceLocationId)`, joins to `location`, and returns the `Location`. It should be exported from `libs/location/src/index.ts`.

**Changes to `validation.ts`:**

```typescript
const EXTERNAL_PROVENANCES = ["SNL", "COMMON_PLATFORM", "CP_CATH", "PDDA"];

// Inside validateBlobRequest, location validation section:
let locationExists = false;
let resolvedLocationId: string | undefined;

if (request.court_id) {
  if (EXTERNAL_PROVENANCES.includes(request.provenance)) {
    const location = await getLocationByProvenanceLocationId(request.provenance, request.court_id);
    locationExists = !!location;
    if (location) resolvedLocationId = location.locationId.toString();
  } else {
    const locationId = Number.parseInt(request.court_id, 10);
    if (Number.isNaN(locationId)) {
      errors.push({ field: "court_id", message: "court_id must be a valid number" });
    } else {
      const location = await getLocationById(locationId);
      locationExists = !!location;
      if (location) resolvedLocationId = locationId.toString();
    }
  }
}

return {
  isValid: errors.length === 0,
  errors,
  locationExists,
  resolvedLocationId,   // NEW - the internal location ID to use
  listTypeId: ...
};
```

**`BlobValidationResult` interface** needs `resolvedLocationId?: string` added to `libs/api/src/blob-ingestion/repository/model.ts`.

**`processBlobIngestion` in `libs/api/src/blob-ingestion/repository/service.ts`** must use `validation.resolvedLocationId ?? request.court_id` wherever it currently uses `request.court_id` as the location ID passed to `createArtefact` and `processPublication`.

**`ALLOWED_PROVENANCES`** in `libs/api/src/blob-ingestion/validation.ts` needs `CP_CATH` and `PDDA` added:

```typescript
const ALLOWED_PROVENANCES = ["XHIBIT", "MANUAL_UPLOAD", "SNL", "COMMON_PLATFORM", "CP_CATH", "PDDA"];
```

The `Provenance` enum in `libs/publication/src/provenance.ts` should also have `CP_CATH` and `PDDA` added, and `PROVENANCE_LABELS` updated accordingly.

### 5. `list_type` `location_type` Field

The `location_type` column added to `list_types` is used during publication upload: when querying `location_reference`, the system filters by `provenanceLocationType` matching the list type's `locationType`. The ticket states: "query the `location` table by the provenance location ID, provenance and the list type provenance location type to convert the provenance location ID to internal location ID."

This means `getLocationByProvenanceLocationId` should accept an optional `locationType` parameter. When provided (i.e. for external system uploads), the query joins `location_reference` filtering on `provenance_location_type = locationType` in addition to `provenance` and `provenance_location_id`.

The validation flow needs to retrieve the list type's `locationType` value and pass it to the lookup:

```typescript
// After resolving listTypeId from the list type name:
const listTypeLocationType = listType?.locationType ?? undefined;

// Then in the location lookup for external provenances:
const location = await getLocationByProvenanceLocationId(
  request.provenance,
  request.court_id,
  listTypeLocationType
);
```

## File Structure

All changes are within existing modules. No new `libs/` modules are created.

```
libs/location/
  prisma/schema.prisma              MODIFY - add LocationReference model, locationType to ListType
  src/location-reference/
    model.ts                        NEW - LOCATION_REFERENCE_PROVENANCES, LOCATION_REFERENCE_TYPES constants
    queries.ts                      NEW - getLocationByProvenanceLocationId()
  src/index.ts                      MODIFY - export getLocationByProvenanceLocationId

apps/postgres/prisma/migrations/
  <timestamp>_add_location_reference/migration.sql   NEW
  <timestamp>_add_list_type_location_type/migration.sql  NEW

libs/system-admin-pages/src/reference-data-upload/
  model.ts                          MODIFY - add provenance fields to CsvRow, ParsedLocationData
  parsers/csv-parser.ts             MODIFY - add PROVENANCE, PROVENANCE_LOCATION_ID, PROVENANCE_LOCATION_TYPE to REQUIRED_HEADERS; parse and pass through
  validation/validation.ts          MODIFY - fix name-uniqueness logic; add provenance field validation
  repository/upload-repository.ts   MODIFY - upsert location_reference rows

libs/api/src/blob-ingestion/
  repository/model.ts               MODIFY - add resolvedLocationId to BlobValidationResult
  repository/service.ts             MODIFY - use resolvedLocationId for locationId passed to createArtefact/processPublication
  validation.ts                     MODIFY - add external provenance resolution; extend ALLOWED_PROVENANCES

libs/publication/src/
  provenance.ts                     MODIFY - add CP_CATH, PDDA to Provenance enum and PROVENANCE_LABELS
```

## Error Handling & Edge Cases

- **CSV missing new headers**: `parseCsv` returns `ParseResult.success = false` with a clear "Missing required columns" message.
- **Invalid provenance value**: Validation returns a per-row error citing the invalid value and the allowed values list.
- **External provenance location ID not found in `location_reference`**: This is treated the same as the current "location not found" case - `locationExists = false`, `no_match = true` in the response. No hard error; the artefact is stored with `noMatch = true`.
- **Duplicate `(provenance, provenanceLocationId)` within a single CSV upload**: Validation should detect this and return an error before the upsert, since it would cause a DB unique constraint violation.
- **Provenance is an external system but `court_id` is a plain integer**: This could happen if a caller passes the internal ID instead of the provenance ID. This will result in a `no_match` response because there will be no `location_reference` row for that string. No special-case handling is needed.
- **`list_type.location_type` is null for an external-provenance upload**: The `locationType` parameter to `getLocationByProvenanceLocationId` should be treated as "no filter" (match any type) when undefined, to avoid unnecessarily rejecting lookups where the list type has not been configured with a `locationType`.

## Acceptance Criteria Mapping

| Acceptance criterion | Implementation |
|---|---|
| PROVENANCE, PROVENANCE_LOCATION_ID, PROVENANCE_LOCATION_TYPE added to CSV format | New fields in `CsvRow`, `REQUIRED_HEADERS` in csv-parser.ts |
| Above fields are mandatory and non-empty | Validation in `validation.ts` |
| New `location_reference` table with specified fields | New Prisma model + migration |
| Provenance values restricted to SNL/COMMON_PLATFORM/CP_CATH/PDDA | Constant + validation check |
| `provenance_location_type` values restricted to VENUE/REGION/OWNING_HEARING_LOCATION/NATIONAL | Constant + validation check |
| Error when CSV has same name/Welsh name with different IDs | Fixed in-file duplicate check in `validation.ts` |
| Error when CSV name/Welsh name conflicts with different ID in DB | Already implemented; no change needed |
| Unique constraint on `location.name` and `location.welsh_name` | Already exists in migration 20251117172706 |
| Same name allowed for same location ID with different provenances | Fixed in-file duplicate check keys on `(name, locationId)` |
| Frontend manual upload always uses internal location ID | Already the case; `locationId` is an integer selected from a location picker |
| External systems use provenance location ID in `court_id` header | Resolved in `validation.ts` using `location_reference` lookup |
| `location_type` added to `list_type` table | New column in Prisma schema + migration |
| External upload resolves by provenance location ID + provenance + location type | `getLocationByProvenanceLocationId` with optional `locationType` filter |

## Clarifications Needed

- **`list_type.location_type` management**: The ticket adds `location_type` to `list_types` but does not describe a UI for setting it. Should this be set via a database migration/seed for existing list types, or is there a separate story for the system admin UI to configure it? If it remains nullable, external-system uploads that depend on type-filtering will silently skip the type filter.
- **`location_reference` and soft-deleted locations**: Should `getLocationByProvenanceLocationId` exclude locations where `deletedAt IS NOT NULL`? The existing `getLocationById` already excludes deleted locations, so consistency suggests yes.
- **`CP_CATH` in publication `Provenance` enum**: The existing `Provenance` enum in `libs/publication/src/provenance.ts` only has `SNL` and `COMMON_PLATFORM` as external values. Adding `CP_CATH` and `PDDA` here affects `PROVENANCE_LABELS` which is used in the audit log detail view. A display label should be agreed upon.
- **XHIBIT provenance**: The current `ALLOWED_PROVENANCES` for blob ingestion includes `XHIBIT`, but `XHIBIT` is not in the new `location_reference` provenance set. Does XHIBIT still use the old integer `court_id` lookup? This plan assumes yes (it is in the "internal" provenance set alongside `MANUAL_UPLOAD`).
