# Issue #582: System admin reference data upload - Backend logic update

## Title
System admin reference data upload - Backend logic update

## Body

*Frontend update is not covered in this ticket.*

Currently the reference data upload does not have the concept of provenance. To support multiple provenances for a location:

- The following fields need to be added to the input CSV file format, the relevant model classes and the database:
  - PROVENANCE
  - PROVENANCE LOCATION ID
  - PROVENANCE LOCATION TYPE
- The above fields should be mandatory and non-empty.
- A new `location_reference` table with the following fields added to store the location provenance:
  - location_reference_id
  - location_id
  - provenance
  - provenance_location_id
  - provenance_location_type
- The possible values for provenance should be one of the enum values below:
  - SNL
  - COMMON_PLATFORM
  - CP_CATH
  - PDDA
- The possible values for provenance_location_type should be one of the enum values below:
  - VENUE
  - REGION
  - OWNING_HEARING_LOCATION
  - NATIONAL

### Reference data upload validation update:
- When the CSV file has multiple records with same location name or welsh location name but different location IDs, we should show the error on frontend.
- When the CSV file has records with the same location name or Welsh location name but different location IDs as existing records on the database, we should also error on frontend.
- Location name and Welsh location name on the location table should have unique constraint.
- The CSV files are allowed to have same location name or Welsh location name for records with the same location ID but different provenances.

### Changes required in publication upload processing to support the use of provenance location ID:
- Frontend manual upload should always use internal location ID to represent the court or tribunal the publication is uploaded to.
- Publication upload using the API currently only uses internal location ID for the `court_id` header. With the addition of provenance in reference data upload, external systems (SNL, COMMON_PLATFORM, CP_CATH, PDDA) should use their owned provenance location ID in the header when uploading publication.
- A new field called `location_type` needs to be added to the `list_type` table with one of the possible values below:
  - VENUE
  - REGION
  - OWNING_HEARING_LOCATION
  - NATIONAL
- When a publication is uploaded by external systems using the API, we should query the `location` table by the provenance location ID, provenance and the list type provenance location type to convert the provenance location ID to internal location ID before storing the publication in the database.

## Assignees
- KianKwa
