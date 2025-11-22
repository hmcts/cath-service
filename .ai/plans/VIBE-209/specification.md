# VIBE-209: Blob Ingestion in CaTH - Technical Specification

## Overview
Implement secure API endpoint for automated ingestion and validation of hearing list JSON blobs from source systems (XHIBIT, LIBRA, SJP, CPP), enabling auto-publication of hearing lists in CaTH with comprehensive validation, error handling, and audit logging.

## User Story
**As a** Source System (XHIBIT, LIBRA, SJP, CPP)
**I want to** ingest a hearing list blob via API
**So that** hearing lists are automatically published in CaTH without manual intervention

## Pre-conditions
- API connections between source systems and CaTH established
- OAuth 2.0 app registrations configured in Azure AD
- Validation schema implemented for incoming blobs
- Style Guide defining JSON format documented
- Location master reference data populated

## Business Requirements

### BR1: Automated Ingestion
Source systems must be able to POST hearing list JSON blobs to CaTH API without manual intervention.

### BR2: Location Matching
System must attempt to match court_id with location master data. If no match found, ingest anyway but flag with `no_match=true`.

### BR3: Comprehensive Audit Trail
All ingestion attempts (success and failure) must be logged with sufficient detail for troubleshooting and compliance.

### BR4: Validation Before Processing
Invalid blobs must be rejected with clear error messages before any database changes occur.

### BR5: Security
Only authenticated and authorized systems can ingest blobs. Source system provenance must be verified.

## Technical Requirements

### Database Changes

#### 1. Add `no_match` column to `artefact` table

```prisma
model Artefact {
  artefactId        String   @id @default(uuid()) @map("artefact_id") @db.Uuid
  locationId        String   @map("location_id")
  listTypeId        Int      @map("list_type_id")
  contentDate       DateTime @map("content_date") @db.Date
  sensitivity       String
  language          String
  displayFrom       DateTime @map("display_from")
  displayTo         DateTime @map("display_to")
  lastReceivedDate  DateTime @default(now()) @map("last_received_date")
  isFlatFile        Boolean  @map("is_flat_file")
  provenance        String
  supersededCount   Int      @default(0) @map("superseded_count")
  noMatch           Boolean  @default(false) @map("no_match")

  @@map("artefact")
}
```

#### 2. Create `ingestion_audit` table

```prisma
model IngestionAudit {
  id                String   @id @default(cuid())
  sourceSystem      String   @map("source_system")
  courtId           String?  @map("court_id")
  provenanceId      String?  @map("provenance_id")
  validationResult  String   @map("validation_result") // "PASS", "FAIL", "WARN"
  httpStatus        Int      @map("http_status")
  errorMessage      String?  @map("error_message")
  errorDetails      Json?    @map("error_details")
  noMatch           Boolean  @default(false) @map("no_match")
  artefactId        String?  @map("artefact_id")
  payloadSize       Int      @map("payload_size")
  requestHeaders    Json?    @map("request_headers")
  processingTimeMs  Int?     @map("processing_time_ms")
  createdAt         DateTime @default(now()) @map("created_at")

  @@map("ingestion_audit")
  @@index([sourceSystem])
  @@index([courtId])
  @@index([createdAt])
  @@index([validationResult])
}
```

### API Endpoint Specification

**Endpoint**: `POST /api/v1/publication`
**Authentication**: OAuth 2.0 Bearer token
**App Role**: `api.publisher.user`
**Content-Type**: `application/json`
**Max Payload Size**: 10MB (configurable via `MAX_INGESTION_PAYLOAD_SIZE` env var)

#### Request Headers

```
Authorization: Bearer <oauth-token>
Content-Type: application/json
X-Source-System: <source-system-identifier>
```

#### Request Body Schema

```json
{
  "type": "object",
  "required": ["court_id", "publication_date", "hearing_type", "hearing_list", "metadata"],
  "properties": {
    "court_id": {
      "type": "string",
      "minLength": 1,
      "description": "CaTH location identifier"
    },
    "provenance_location_id": {
      "type": "string",
      "description": "Source system's location identifier"
    },
    "publication_date": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 date-time for publication"
    },
    "hearing_type": {
      "type": "string",
      "enum": ["Crown Court", "Magistrates Court", "Family Court", "Tribunal"],
      "description": "Type of hearing list"
    },
    "hearing_list": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["case_id", "case_name"],
        "properties": {
          "case_id": {
            "type": "string",
            "description": "Unique case identifier"
          },
          "case_name": {
            "type": "string",
            "description": "Case name (e.g., 'R v Smith')"
          },
          "hearing_time": {
            "type": "string",
            "pattern": "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$",
            "description": "Time in HH:MM format"
          },
          "court_room": {
            "type": "string"
          },
          "defendant_name": {
            "type": "string"
          },
          "judge": {
            "type": "string"
          }
        }
      }
    },
    "metadata": {
      "type": "object",
      "required": ["source_system"],
      "properties": {
        "source_system": {
          "type": "string",
          "enum": ["XHIBIT", "LIBRA", "SJP", "CPP"],
          "description": "Source system identifier"
        },
        "version": {
          "type": "string",
          "description": "Schema version"
        }
      }
    }
  }
}
```

#### Example Request

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
      "court_room": "Court 1",
      "defendant_name": "John Smith",
      "judge": "Judge Brown"
    }
  ],
  "metadata": {
    "source_system": "XHIBIT",
    "version": "2.0"
  }
}
```

#### Response Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | Success | Blob ingested and published successfully |
| 400 | Bad Request | Invalid JSON or malformed request |
| 401 | Unauthorized | Authentication failed (missing/invalid token) |
| 403 | Forbidden | Insufficient app role permissions |
| 413 | Payload Too Large | Blob exceeds size limit |
| 422 | Unprocessable Entity | Validation schema failure |
| 500 | Internal Server Error | System failure |

#### Success Response (200 OK)

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

#### Success with Warning (200 OK - Court Not Found)

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

#### Validation Error Response (422)

```json
{
  "status": "error",
  "error": "Validation failed",
  "details": [
    {
      "field": "publication_date",
      "message": "must be string",
      "value": null
    },
    {
      "field": "hearing_list",
      "message": "must NOT have fewer than 1 items"
    }
  ]
}
```

#### Authentication Error Response (401)

```json
{
  "status": "error",
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

### Validation Rules

| Field | Rule | Required | Action on Failure |
|-------|------|----------|-------------------|
| JSON Format | Must be valid JSON | Yes | 400 Bad Request |
| Payload Size | < 10MB | Yes | 413 Payload Too Large |
| OAuth Token | Valid Bearer token | Yes | 401 Unauthorized |
| App Role | `api.publisher.user` | Yes | 403 Forbidden |
| court_id | Non-empty string | Yes | 422 validation error |
| publication_date | ISO 8601 date-time | Yes | 422 validation error |
| hearing_list | Non-empty array | Yes | 422 validation error |
| metadata.source_system | One of: XHIBIT, LIBRA, SJP, CPP | Yes | 422 validation error |
| Court exists | Check location data | No | Set no_match=true, continue |

### Processing Flow

```
1. HTTP Request Received
   ├─> Check payload size (middleware)
   ├─> Parse JSON body (Express)
   └─> Continue

2. Authentication & Authorization
   ├─> Validate OAuth Bearer token (middleware)
   ├─> Verify app role: api.publisher.user (middleware)
   └─> Extract source system from token claims

3. Schema Validation
   ├─> Validate against JSON schema (AJV)
   ├─> Check required fields
   ├─> Validate data types and formats
   └─> Return 422 if validation fails

4. Location Lookup
   ├─> Query location master data by court_id
   ├─> If found: no_match = false
   └─> If not found: no_match = true (WARNING, but continue)

5. Transform Blob
   ├─> Map external format to internal Artefact model
   ├─> Set provenance from metadata.source_system
   ├─> Set no_match flag from location lookup
   └─> Generate artefact ID

6. Create Artefact
   ├─> Use existing createArtefact() from @hmcts/publication
   ├─> Handle duplicates (supersede existing)
   └─> Return artefact_id

7. Audit Logging
   ├─> Log ingestion attempt with all details
   ├─> Include validation result, HTTP status, timing
   └─> Store in ingestion_audit table

8. Return Response
   ├─> Success: 200 with artefact details
   ├─> Warning: 200 with no_match flag
   └─> Error: Appropriate status code with details
```

## Architecture

### Module Structure

```
libs/blob-ingestion/
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma                      # ingestion_audit table
└── src/
    ├── config.ts                          # Module exports for app registration
    ├── index.ts                           # Business logic exports
    ├── routes/
    │   └── ingestion-api.ts               # POST /api/v1/publication endpoint
    ├── ingestion/
    │   ├── ingestion-service.ts           # Orchestration logic
    │   ├── ingestion-service.test.ts
    │   ├── location-lookup.ts             # Check court master data
    │   ├── location-lookup.test.ts
    │   ├── blob-transform.ts              # Transform to Artefact model
    │   └── blob-transform.test.ts
    ├── validation/
    │   ├── blob-validator.ts              # JSON schema validation
    │   ├── blob-validator.test.ts
    │   └── blob-schema.json               # JSON schema definition
    ├── audit/
    │   ├── audit-repository.ts            # Database operations
    │   ├── audit-repository.test.ts
    │   └── model.ts                       # TypeScript types
    └── middleware/
        ├── oauth-authenticate.ts          # OAuth token validation
        ├── oauth-authenticate.test.ts
        ├── payload-size-limit.ts          # Size check middleware
        └── payload-size-limit.test.ts
```

### Dependencies

Add to `libs/blob-ingestion/package.json`:

```json
{
  "dependencies": {
    "@hmcts/postgres": "workspace:*",
    "@hmcts/publication": "workspace:*",
    "@hmcts/location": "workspace:*",
    "ajv": "8.17.1",
    "ajv-formats": "3.0.1",
    "passport-azure-ad": "4.3.5"
  },
  "devDependencies": {
    "@types/passport-azure-ad": "4.3.6",
    "express": "5.1.0"
  }
}
```

## Security Requirements

### Authentication
- OAuth 2.0 Bearer tokens issued by Azure AD
- Token must be valid and not expired
- Token must contain app role `api.publisher.user`
- Source system identification from token claims

### Authorization
- App role check: `api.publisher.user` required
- Source system in metadata must match authenticated source
- Rate limiting per source system (future enhancement)

### Data Protection
- Audit logs encrypted at rest
- PII handling in compliance with GDPR
- Sensitive data masked in logs (e.g., defendant names logged as hash)
- Logs retained for 90 days minimum

### Security Headers
- CORS configured for authorized origins only
- Content-Type validation enforced
- Payload size limits enforced
- Request timeouts configured

## Test Scenarios

| ID | Scenario | Expected Result |
|----|----------|----------------|
| TS1 | Valid blob with existing court | 200 OK, published, no_match=false |
| TS2 | Valid blob with unknown court | 200 OK, published, no_match=true |
| TS3 | Malformed JSON | 400 Bad Request |
| TS4 | Missing required field (court_id) | 422 Unprocessable Entity |
| TS5 | Invalid source_system value | 422 validation error |
| TS6 | Payload exceeds 10MB | 413 Payload Too Large |
| TS7 | No authentication token | 401 Unauthorized |
| TS8 | Invalid/expired token | 401 Unauthorized |
| TS9 | Missing app role | 403 Forbidden |
| TS10 | Invalid date-time format | 422 validation error |
| TS11 | Empty hearing_list array | 422 validation error |
| TS12 | Audit log created | Record in ingestion_audit table |
| TS13 | Duplicate blob (same court/date/type) | Existing artefact superseded |

## Non-Functional Requirements

### Performance
- API response time: < 2 seconds for p95
- Support 100 requests per minute per source system
- Database queries optimized with proper indexes

### Reliability
- All errors logged with sufficient context
- Transaction rollback on failure
- Idempotent operations where possible

### Monitoring
- Track ingestion success/failure rates
- Alert on high failure rates (> 10% in 5 minutes)
- Dashboard showing ingestion statistics by source system
- Monitor no_match occurrences

### Scalability
- Stateless API design
- Database connection pooling
- Consider message queue for large blobs (future)

## Out of Scope (Future Iterations)
- Automated retry mechanism
- Batch ingestion of multiple blobs
- Webhook callbacks to source systems
- Real-time validation report dashboard
- Schema version management
- Duplicate blob detection and deduplication
- Rate limiting per source system
- Asynchronous processing with message queue

## Open Questions
1. Should X-Source-System header be mandatory or derived from OAuth token?
2. Confirm maximum payload size (10MB proposed)
3. Should no_match publications be visible in public UI or admin-only?
4. Retry strategy: manual via re-POST or automated after court creation?
5. Schema versioning strategy for future changes?
6. Notification method for source systems on ingestion failure?

## Dependencies
- Existing `@hmcts/publication` module for artefact creation
- Existing `@hmcts/location` module for location lookup
- OAuth app registrations in Azure AD (app role: api.publisher.user)
- Location master reference data populated

## Definition of Done
- [ ] Database migrations applied (no_match column, ingestion_audit table)
- [ ] API endpoint `/api/v1/publication` implemented
- [ ] OAuth middleware functional with app role check
- [ ] JSON schema validation working with comprehensive error messages
- [ ] Location lookup service functional with no_match flag logic
- [ ] Blob transformation to Artefact model working
- [ ] Audit logging captures all attempts with full details
- [ ] Error handling for all scenarios with appropriate HTTP codes
- [ ] Unit tests >80% coverage
- [ ] Integration tests pass (mocked OAuth)
- [ ] E2E tests pass all scenarios
- [ ] API documentation created (OpenAPI spec)
- [ ] Monitoring and alerting configured
- [ ] Security review approved
- [ ] Code review approved
- [ ] Deployed to dev environment and tested
