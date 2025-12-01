# VIBE-209: Blob Ingestion in CaTH

## Overview
Implement API endpoint to ingest and validate JSON blobs from source systems for auto-publishing hearing lists in CaTH.

## Problem Statement
To auto-publish a hearing list in CaTH, a blob (JSON file) must be ingested and validated from a source system through an API. The system should validate, process, and publish the blob against the appropriate court venue in CaTH.

## User Story
**As a** System
**I want to** ingest a blob from a source system
**So that** I can display and publish a hearing list in CaTH

## Pre-Conditions
1. API connections between the source system and CaTH have been successfully established and tested
2. A validation schema has been implemented to assess incoming blobs
3. A Style Guide defining the JSON format, data structure, and field requirements has been documented
4. Venues (courts) for publishing hearing lists have already been created and stored in the Court Master Reference Data within CaTH

## Technical Requirements

### Database Changes
- Add new column `no_match` to `artefact` table
  - Type: Boolean
  - Mandatory field
  - Set to `true` when publication location doesn't exist in CaTH

### API Endpoint
- **Endpoint:** `/api/publication`
- **Method:** POST
- **Authentication:** OAuth 2.0 using existing app registrations
- **Protected by:** App role `api.publisher.user`
- **Request Type:** JSON
- **Response Codes:**
  - `200 OK` – Blob ingested and published successfully
  - `400 Bad Request` – Invalid JSON or missing required fields
  - `404 Not Found` – Court ID not found in CaTH reference data
  - `500 Internal Server Error` – Validation or system failure

### Validation Rules
The endpoint should use the same logic/behaviour as the manual upload processing:

1. Validate blob structure against pre-established JSON schema
2. Verify required fields are present: `court_id`, `publication_date`, `hearing_list`
3. Validate data types match expectations (strings, arrays, timestamps)
4. Check Court ID / Provenance Location ID exists in Court Master Reference Data
5. Verify provenance matches authorized provenance list
6. Validate blob doesn't exceed size limits

### Business Logic
- Only blobs for courts in the location master reference data should be fully processed
- Where a new blob is received and the location is not created in CaTH:
  - Publication should still be ingested
  - Set `no_match` column to `true`
  - Log incident and notify source system
- All ingestion attempts must be logged with timestamp and source system ID
- Logs should retain data for minimum 90 days for auditing

## Acceptance Criteria
1. When a blob (JSON file) is received in CaTH, it must be validated against the pre-established validation schema
2. Each blob must include valid metadata that associates it with a location venue created in CaTH
3. Only blobs referencing existing location (as defined in the Location Master Reference Data) should be ingested and processed
4. Once validation passes, the blob is successfully processed and automatically published to CaTH
5. All ingestion and validation actions must be auditable and stored in system logs for traceability
6. When location doesn't exist, publication is still created with `no_match` set to `true`

## Data Validation and Mapping Rules

| Field | Description | Validation Rule | Required | Source |
|-------|-------------|-----------------|----------|--------|
| Court ID / Provenance Location ID | Unique ID linking blob to CaTH court | Must match entry in Court Master Reference Data | Yes | Source System |
| Blob Metadata | Includes publication timestamp, source, and hearing type | Must match schema format | Yes | Source System |
| Hearing Details | Core content of the blob (cases, times, judges, etc.) | Must match schema structure | Yes | Source System |
| JSON Format | Blob must be valid JSON format | JSON schema validation | Yes | Source System |
| Provenance | Identifies source system (e.g., XHIBIT, LIBRA, SJP) | Must match authorized provenance list | Yes | Source System |

## Error Handling and Logging
- All ingestion attempts must be logged with timestamp and source system ID
- Validation errors trigger:
  - Error response to the source API
  - Creation of a Validation Report entry
- Serious ingestion errors (schema corruption, unhandled exceptions) must raise system alerts to admins
- Logs should retain data for minimum 90 days for auditing

## Test Scenarios

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS1 | Valid blob ingestion | Send valid JSON via API with existing Court ID | Blob ingested, validated, and published |
| TS2 | Invalid schema | Send malformed JSON | Error 400, ingestion blocked |
| TS3 | Unknown court | Send blob with unrecognised Court ID | Publication still created, no_match set to true |
| TS4 | Missing required field | Omit required field from JSON | Validation failure, error logged |
| TS5 | Provenance mismatch | Send blob with invalid provenance type | Validation blocked, incident logged |
| TS6 | Logging verification | Check validation report | Record includes timestamp, error, and source system |
| TS7 | Retry after admin fix | Add missing court and resend blob | Ingestion succeeds |
| TS8 | Large blob | Send JSON exceeding limits | Rejected with "Payload too large" message |
| TS9 | API security | Attempt unauthorized request | Request denied with 401 error |
| TS10 | System alerting | Trigger repeated ingestion errors | System sends alert to admin |

## Content (i18n)

### English (EN)
- Success Message: "Blob ingested and published successfully."
- Error Message: "Unable to ingest blob. Please verify schema or court reference data."
- Report Label: "Validation Report"

### Welsh (CY)
- Success Message: "Wedi mewnforio a chyhoeddi'r blob yn llwyddiannus."
- Error Message: "Methu mewnforio'r blob. Gwiriwch y cynllun neu'r data cyfeirnod llys."
- Report Label: "Adroddiad Dilysu"

## Assumptions / Open Questions
- Confirm if ingestion retry should be manual or automated after admin correction
- Confirm maximum file size limit for blob ingestion (e.g., 10MB)
- Confirm how often validation reports are generated (real-time or daily batch)
- Confirm if versioning is needed for schema validation (v1, v2)
- Confirm if notification to the source system should be via email or API response callback
- Confirm header information requirements for the API endpoint
