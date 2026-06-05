# Implementation Tasks

## Database Schema

- [x] Add `LocationReference` model to `libs/location/prisma/schema.prisma` with fields: `location_reference_id`, `location_id`, `provenance`, `provenance_location_id`, `provenance_location_type`; add `@@unique([provenance, provenanceLocationId])` constraint and `onDelete: Cascade` back-relation on `Location`
- [x] Add `locationType` field (nullable `String`) to `ListType` model in `libs/location/prisma/schema.prisma`
- [x] Create migration for `location_reference` table (`yarn db:migrate:dev`)
- [x] Create migration for `location_type` column on `list_types` table (`yarn db:migrate:dev`)
- [x] Run `yarn db:generate` to regenerate the Prisma client

## Location Reference Queries

- [x] Create `libs/location/src/location-reference/model.ts` with `LOCATION_REFERENCE_PROVENANCES` and `LOCATION_REFERENCE_TYPES` string literal union constants
- [x] Create `libs/location/src/location-reference/queries.ts` with `getLocationByProvenanceLocationId(provenance, provenanceLocationId, locationType?)` that queries `location_reference` joined to `location`, excluding soft-deleted locations
- [x] Export `getLocationByProvenanceLocationId` from `libs/location/src/index.ts`

## CSV Upload - Model & Parser

- [x] Add `PROVENANCE`, `PROVENANCE_LOCATION_ID`, `PROVENANCE_LOCATION_TYPE` fields to `CsvRow` interface in `libs/system-admin-pages/src/reference-data-upload/model.ts`
- [x] Add `provenance`, `provenanceLocationId`, `provenanceLocationType` fields to `ParsedLocationData` interface in the same file
- [x] Add the three new column names to `REQUIRED_HEADERS` in `libs/system-admin-pages/src/reference-data-upload/parsers/csv-parser.ts`
- [x] Parse and map the three new fields in the row-level loop in `csv-parser.ts`
- [x] Update `csv-parser.test.ts` to cover new fields present and new fields missing

## CSV Upload - Validation

- [x] Fix in-file location name duplicate check in `libs/system-admin-pages/src/reference-data-upload/validation/validation.ts` to key on `(locationName, locationId)` so identical names for the same ID are allowed
- [x] Fix in-file Welsh location name duplicate check with the same `(welshLocationName, locationId)` keying
- [x] Add validation that `provenance` is non-empty and is one of the allowed values from `LOCATION_REFERENCE_PROVENANCES`
- [x] Add validation that `provenanceLocationId` is non-empty
- [x] Add validation that `provenanceLocationType` is non-empty and is one of the allowed values from `LOCATION_REFERENCE_TYPES`
- [x] Add validation that `(provenance, provenanceLocationId)` is unique within the uploaded CSV
- [x] Update `validation.test.ts` to cover all new rules and the relaxed name-uniqueness rule

## CSV Upload - Repository

- [x] Update `upsertLocations` in `libs/system-admin-pages/src/reference-data-upload/repository/upload-repository.ts` to upsert a `location_reference` row for each CSV row using the `(provenance, provenanceLocationId)` unique key
- [x] Update `upload-repository.test.ts` to assert `locationReference` upsert is called with correct data

## Provenance Enum Update

- [x] Add `CP_CATH = "CP_CATH"` and `PDDA = "PDDA"` to the `Provenance` enum in `libs/publication/src/provenance.ts`
- [x] Add corresponding entries to `PROVENANCE_LABELS` in the same file

## Blob Ingestion - Model & Validation

- [x] Add `resolvedLocationId?: string` to `BlobValidationResult` interface in `libs/api/src/blob-ingestion/repository/model.ts`
- [x] Add `CP_CATH` and `PDDA` to `ALLOWED_PROVENANCES` in `libs/api/src/blob-ingestion/validation.ts`
- [x] Define `EXTERNAL_PROVENANCES` constant (`SNL`, `COMMON_PLATFORM`, `CP_CATH`, `PDDA`) in `validation.ts`
- [x] Update location validation in `validateBlobRequest` to branch on external vs internal provenance: external provenances call `getLocationByProvenanceLocationId(provenance, court_id, listTypeLocationType)`, internal provenances call `getLocationById(parseInt(court_id))`
- [x] Populate `resolvedLocationId` in the returned `BlobValidationResult` with the looked-up internal location ID
- [x] Update `validation.test.ts` to cover external provenance resolution and the new allowed provenance values

## Blob Ingestion - Service

- [x] Update `processBlobIngestion` in `libs/api/src/blob-ingestion/repository/service.ts` to use `validation.resolvedLocationId ?? request.court_id` as the `locationId` argument for `createArtefact` and `processPublication`
- [x] Update `service.test.ts` to assert the resolved location ID is used when provenance is external

## Tests

- [x] Verify all unit tests pass: `yarn test`
