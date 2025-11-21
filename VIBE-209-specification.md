# VIBE-209: Blob Ingestion in CaTH - Technical Specification

## Overview
Implement secure API endpoint for automated ingestion and validation of hearing list JSON blobs from source systems, enabling auto-publication of hearing lists in CaTH with comprehensive validation, error handling, and audit logging.

## User Story
**As a** System
**I want to** ingest a blob from a source system
**So that** I can display and publish a hearing list

## Pre-conditions
- API connections between source systems and CaTH established
- Validation schema implemented for incoming blobs
- Style Guide defining JSON format documented
- Venues (courts) created in Court Master Reference Data

## Technical Requirements

### 1. Database Changes
Add `no_match` column to `artefact` table:
```prisma
model Artefact {
  // ... existing fields
  noMatch Boolean @map("no_match") @default(false)

  @@map("artefact")
}
```

### 2. API Endpoint

**Endpoint**: `POST /api/v1/publication`
**Authentication**: OAuth 2.0 using existing app registrations
**App Role**: `api.publisher.user`
**Content-Type**: `application/json`
**Max Payload Size**: 10MB (configurable)

**Request Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
X-Source-System: <provenance-identifier>
```

**Request Body**:
```json
{
  "court_id": "CATH-00123",
  "provenance_location_id": "EXT-98765",
  "publication_date": "2025-11-21T10:00:00Z",
  "hearing_type": "Crown Court",
  "hearing_list": [
    {
      "case_id": "T20257890",
      "case_name": "R v Smith",
      "hearing_time": "10:00",
      // ... additional hearing details
    }
  ],
  "metadata": {
    "source_system": "XHIBIT",
    "version": "2.0"
  }
}
```

**Response Codes**:
- `200 OK` - Blob ingested and published successfully
- `400 Bad Request` - Invalid JSON or missing required fields
- `401 Unauthorized` - Authentication failed
- `403 Forbidden` - Insufficient app role permissions
- `404 Not Found` - Court ID not found (but still ingested with no_match=true)
- `413 Payload Too Large` - Blob exceeds size limit
- `422 Unprocessable Entity` - Validation schema failure
- `500 Internal Server Error` - System failure

### 3. Validation Schema

JSON Schema validation for incoming blobs:

```json
{
  "type": "object",
  "required": ["court_id", "publication_date", "hearing_list"],
  "properties": {
    "court_id": {
      "type": "string",
      "minLength": 1
    },
    "provenance_location_id": {
      "type": "string"
    },
    "publication_date": {
      "type": "string",
      "format": "date-time"
    },
    "hearing_type": {
      "type": "string",
      "enum": ["Crown Court", "Magistrates Court", "Family Court", "Tribunal"]
    },
    "hearing_list": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["case_id", "case_name"],
        "properties": {
          "case_id": { "type": "string" },
          "case_name": { "type": "string" },
          "hearing_time": { "type": "string" }
        }
      }
    },
    "metadata": {
      "type": "object",
      "required": ["source_system"],
      "properties": {
        "source_system": {
          "type": "string",
          "enum": ["XHIBIT", "LIBRA", "SJP", "CPP"]
        },
        "version": { "type": "string" }
      }
    }
  }
}
```

### 4. Validation Rules

| Field | Validation Rule | Required | Action on Failure |
|-------|----------------|----------|-------------------|
| JSON Format | Must be valid JSON | Yes | 400 Bad Request |
| court_id | Must be non-empty string | Yes | 422 validation error |
| provenance_location_id | String identifier | No | - |
| publication_date | ISO 8601 date-time | Yes | 422 validation error |
| hearing_list | Non-empty array | Yes | 422 validation error |
| metadata.source_system | Must match authorized provenance | Yes | 422 validation error |
| Court exists in master data | Check location table | No | Set no_match=true, continue |
| Payload size | < 10MB | Yes | 413 Payload Too Large |

### 5. Processing Logic

```
1. Authenticate request (OAuth token validation)
2. Verify app role (api.publisher.user)
3. Check payload size
4. Parse JSON
5. Validate against JSON schema
6. Check court_id in location master data
   - If found: Set no_match=false
   - If not found: Set no_match=true
7. Transform blob to internal publication format
8. Create artefact record in database
9. Use existing manual upload logic for publication
10. Log ingestion attempt
11. Return success/error response
```

### 6. Error Handling

| Scenario | HTTP Code | Response | Logging |
|----------|-----------|----------|---------|
| Malformed JSON | 400 | `{"error": "Invalid JSON format"}` | Error with blob snippet |
| Missing required field | 422 | `{"error": "Missing field: court_id"}` | Warning with details |
| Invalid provenance | 422 | `{"error": "Invalid source_system"}` | Warning |
| Court not found | 200 | `{"warning": "Court not found", "no_match": true}` | Info |
| Payload too large | 413 | `{"error": "Payload exceeds 10MB"}` | Warning |
| Authentication failed | 401 | `{"error": "Unauthorized"}` | Security log |
| Insufficient permissions | 403 | `{"error": "Forbidden"}` | Security log |
| System error | 500 | `{"error": "Internal server error"}` | Error with stack trace |

## Architecture

### Module Structure
```
libs/blob-ingestion/
├── src/
│   ├── routes/
│   │   └── ingestion-api.ts              # API endpoint
│   ├── services/
│   │   ├── ingestion-service.ts          # Core ingestion logic
│   │   ├── validation-service.ts         # JSON schema validation
│   │   ├── location-lookup-service.ts    # Check court master data
│   │   └── publication-transform-service.ts # Transform to internal format
│   ├── middleware/
│   │   ├── oauth-middleware.ts           # OAuth authentication
│   │   └── payload-size-middleware.ts    # Size limit check
│   ├── validators/
│   │   └── blob-schema.json              # JSON schema definition
│   ├── repositories/
│   │   └── ingestion-audit-repository.ts # Audit log persistence
│   └── config.ts                         # Module exports
├── prisma/
│   └── schema.prisma                     # Audit log schema
├── package.json
└── tsconfig.json
```

### Database Schema

#### ingestion_audit Table
```prisma
model IngestionAudit {
  id              String   @id @default(cuid())
  sourceSystem    String   @map("source_system")
  courtId         String?  @map("court_id")
  provenanceId    String?  @map("provenance_id")
  validationResult String  @map("validation_result") // "PASS", "FAIL"
  errorMessage    String?  @map("error_message")
  noMatch         Boolean  @map("no_match") @default(false)
  artefactId      String?  @map("artefact_id")
  payloadSize     Int      @map("payload_size")
  requestHeaders  Json?    @map("request_headers")
  createdAt       DateTime @default(now()) @map("created_at")

  @@map("ingestion_audit")
  @@index([sourceSystem])
  @@index([courtId])
  @@index([createdAt])
}
```

## Implementation Tasks

### Task 1: Database Migration
- Add `no_match` column to `artefact` table
- Create `ingestion_audit` table
- Run migrations on all environments

### Task 2: Create Blob Ingestion Module
- Set up libs/blob-ingestion package
- Configure package.json with dependencies (ajv for JSON schema validation)
- Add TypeScript configuration

### Task 3: Implement OAuth Middleware
- Create oauth-middleware.ts
- Integrate with existing Azure AD app registrations
- Validate Bearer token
- Check app role `api.publisher.user`
- Return 401/403 for failures

### Task 4: Implement JSON Schema Validation
- Create blob-schema.json with validation rules
- Create validation-service.ts using Ajv
- Validate required fields
- Validate data types and formats
- Validate provenance against whitelist
- Return detailed validation errors

### Task 5: Build Location Lookup Service
- Create location-lookup-service.ts
- Query location table by court_id or provenance_location_id
- Return boolean indicating if court exists
- Cache lookups for performance

### Task 6: Build Publication Transform Service
- Create publication-transform-service.ts
- Transform external blob format to internal publication format
- Map fields from source to CaTH schema
- Handle missing optional fields

### Task 7: Implement Ingestion Service
- Create ingestion-service.ts
- Orchestrate validation → lookup → transform → publish flow
- Handle no_match flag logic
- Create artefact record
- Reuse existing manual upload publication logic
- Return success/error responses

### Task 8: Build API Endpoint
- Create ingestion-api.ts route
- POST /api/v1/publication endpoint
- Apply OAuth middleware
- Apply payload size middleware
- Parse request body
- Call ingestion service
- Return appropriate HTTP responses
- Handle async processing

### Task 9: Implement Audit Logging
- Create ingestion-audit-repository.ts
- Log all ingestion attempts
- Store validation results
- Store error messages
- Retain for 90 days minimum

### Task 10: Testing
- Unit tests for validation-service
- Unit tests for ingestion-service
- Unit tests for location-lookup-service
- Integration tests for API endpoint (mocked OAuth)
- E2E tests:
  - Valid blob → published successfully
  - Invalid JSON → 400 error
  - Missing required field → 422 error
  - Unknown court → 200 with no_match=true
  - Payload too large → 413 error
  - Unauthorized → 401 error

### Task 11: Monitoring & Alerting
- Add metrics for ingestion success/failure rates
- Alert on high failure rates
- Dashboard for ingestion statistics
- Monitor no_match occurrences

## API Response Examples

### Success Response
```json
{
  "status": "success",
  "message": "Blob ingested and published successfully",
  "artefact_id": "art_abc123",
  "court_id": "CATH-00123",
  "no_match": false,
  "publication_url": "/publications/art_abc123"
}
```

### Court Not Found (but still ingested)
```json
{
  "status": "success",
  "message": "Blob ingested with warnings",
  "artefact_id": "art_xyz789",
  "court_id": "EXT-98765",
  "no_match": true,
  "warnings": [
    "Court ID not found in master reference data"
  ]
}
```

### Validation Error Response
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "field": "court_id",
      "message": "Field is required"
    },
    {
      "field": "publication_date",
      "message": "Must be valid ISO 8601 date-time"
    }
  ]
}
```

## Test Scenarios

| ID | Scenario | Expected Result |
|----|----------|----------------|
| TS1 | Valid blob with existing court | 200 OK, published, no_match=false |
| TS2 | Valid blob with unknown court | 200 OK, published, no_match=true |
| TS3 | Malformed JSON | 400 Bad Request |
| TS4 | Missing required field | 422 Unprocessable Entity |
| TS5 | Invalid provenance | 422 validation error |
| TS6 | Payload too large | 413 Payload Too Large |
| TS7 | No authentication token | 401 Unauthorized |
| TS8 | Invalid token | 401 Unauthorized |
| TS9 | Insufficient app role | 403 Forbidden |
| TS10 | Audit log verification | Record created with all details |

## Security & Compliance

### Authentication
- OAuth 2.0 Bearer tokens
- Azure AD app registrations
- App role-based authorization
- Token validation on every request

### Authorization
- App role: `api.publisher.user`
- Source system identification in headers
- Rate limiting per source system

### Data Protection
- Audit logs encrypted at rest
- PII handling in compliance with GDPR
- Logs retained for 90 days minimum
- Sensitive data masked in logs

### Security Headers
- CORS configured for authorized origins only
- Content-Type validation
- Payload size limits
- Request timeouts

## Risks & Questions
1. Confirm header information requirements (X-Source-System, etc.)
2. Should retry be manual or automated after court creation?
3. Confirm maximum payload size (10MB proposed)
4. Confirm validation report generation frequency
5. Confirm schema versioning strategy
6. Confirm notification method for source systems (API response vs callback)
7. Should no_match publications be visible in UI?

## Out of Scope (Future Iterations)
- Automated retry mechanism
- Batch ingestion of multiple blobs
- Webhook callbacks to source systems
- Real-time validation report dashboard
- Schema version management
- Duplicate blob detection

## Dependencies
- Existing manual upload processing logic
- OAuth app registrations in Azure AD
- Location master reference data
- Artefact table and publication system

## Definition of Done
- [ ] `no_match` column added to artefact table
- [ ] API endpoint `/api/v1/publication` created
- [ ] OAuth middleware implemented
- [ ] JSON schema validation working
- [ ] Location lookup service functional
- [ ] Publication transform service working
- [ ] Audit logging captures all attempts
- [ ] Error handling for all scenarios
- [ ] Unit tests >80% coverage
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] API documentation created
- [ ] Monitoring/alerting configured
- [ ] Security review approved
- [ ] Code review approved
