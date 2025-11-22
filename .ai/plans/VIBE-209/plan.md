# VIBE-209: Blob Ingestion in CaTH - Implementation Plan

## Executive Summary

Implement secure OAuth-protected API endpoint (`POST /api/v1/publication`) for automated ingestion of hearing list JSON blobs from source systems (XHIBIT, LIBRA, SJP, CPP). The solution includes comprehensive JSON schema validation, location matching with a `no_match` flag for unrecognized courts, and complete audit logging for compliance and troubleshooting.

**Estimated Effort**: 8-10 hours development + 2 hours testing + 1 hour documentation = 11-13 hours total

## Key Technical Decisions

### 1. Module Organization
Create new `libs/blob-ingestion` module following HMCTS monorepo conventions with clear separation of concerns:
- Routes for HTTP handling
- Services for business logic
- Middleware for cross-cutting concerns
- Validation with JSON schema
- Repository for data access

### 2. Reuse Existing Components
- Use existing `@hmcts/publication` createArtefact() function for consistency
- Leverage existing `@hmcts/location` queries for location lookup
- Reuse existing AJV validation pattern from publication module
- Follow existing OAuth patterns from auth module

### 3. Location Matching Strategy
When court_id not found in location master data:
- Continue processing (don't reject)
- Set `no_match=true` flag on artefact
- Return 200 OK with warning message
- Allow admin to manually map court later
- This prevents data loss while awaiting reference data updates

### 4. Error Handling Philosophy
- Validation errors: Return detailed field-level errors (422)
- Authentication errors: Clear security messages (401/403)
- System errors: Log full details, return generic message (500)
- Audit all attempts regardless of outcome

### 5. Security Approach
- OAuth 2.0 Bearer token validation using passport-azure-ad
- App role check: `api.publisher.user` required
- Source system verification from token claims
- Payload size limits enforced before processing
- CORS restricted to authorized origins

## Implementation Phases

### Phase 1: Database Schema (1 hour)

**Tasks**:
1. Add `no_match` column to existing `artefact` table
2. Create new `ingestion_audit` table with comprehensive fields
3. Add indexes for query performance
4. Create and test migration scripts

**Files**:
- `apps/postgres/prisma/schema.prisma` (modify)

**Acceptance Criteria**:
- Migration runs successfully on dev database
- `artefact.no_match` defaults to false
- `ingestion_audit` indexes created
- No breaking changes to existing queries

### Phase 2: Module Setup (1 hour)

**Tasks**:
1. Create `libs/blob-ingestion` directory structure
2. Set up package.json with dependencies
3. Configure tsconfig.json
4. Create module config.ts and index.ts
5. Register module in root tsconfig.json
6. Create Prisma schema for ingestion_audit

**Files**:
- `libs/blob-ingestion/package.json` (create)
- `libs/blob-ingestion/tsconfig.json` (create)
- `libs/blob-ingestion/prisma/schema.prisma` (create)
- `libs/blob-ingestion/src/config.ts` (create)
- `libs/blob-ingestion/src/index.ts` (create)
- `tsconfig.json` (modify)

**Acceptance Criteria**:
- Module compiles successfully
- TypeScript paths resolve correctly
- Prisma client generates for ingestion_audit

### Phase 3: JSON Schema Validation (1.5 hours)

**Tasks**:
1. Define comprehensive JSON schema for ingestion blobs
2. Create blob-validator.ts using AJV
3. Add format validation (date-time, time patterns)
4. Map validation errors to user-friendly messages
5. Write comprehensive unit tests

**Files**:
- `libs/blob-ingestion/src/validation/blob-schema.json` (create)
- `libs/blob-ingestion/src/validation/blob-validator.ts` (create)
- `libs/blob-ingestion/src/validation/blob-validator.test.ts` (create)

**Acceptance Criteria**:
- All required fields validated
- Data types and formats enforced
- Enum values validated (hearing_type, source_system)
- Detailed error messages for all validation failures
- Unit tests cover all validation scenarios

### Phase 4: OAuth Authentication Middleware (1.5 hours)

**Tasks**:
1. Create OAuth middleware using passport-azure-ad
2. Configure Bearer strategy with Azure AD settings
3. Validate token signature and expiration
4. Extract and verify app role `api.publisher.user`
5. Extract source system from token claims
6. Write unit tests with mocked tokens

**Files**:
- `libs/blob-ingestion/src/middleware/oauth-authenticate.ts` (create)
- `libs/blob-ingestion/src/middleware/oauth-authenticate.test.ts` (create)

**Acceptance Criteria**:
- Valid tokens accepted
- Invalid/expired tokens rejected (401)
- Missing app role rejected (403)
- Source system extracted correctly
- Tests cover all auth scenarios

### Phase 5: Location Lookup Service (1 hour)

**Tasks**:
1. Create location-lookup.ts service
2. Query location master data by court_id
3. Implement fallback to provenance_location_id
4. Return boolean indicating match found
5. Write unit tests with mocked location data

**Files**:
- `libs/blob-ingestion/src/ingestion/location-lookup.ts` (create)
- `libs/blob-ingestion/src/ingestion/location-lookup.test.ts` (create)

**Acceptance Criteria**:
- Successful lookup returns location details
- Failed lookup returns false (not error)
- Tests cover existing and non-existing courts

### Phase 6: Blob Transform Service (1 hour)

**Tasks**:
1. Create blob-transform.ts service
2. Map external blob format to internal Artefact model
3. Handle optional fields gracefully
4. Set provenance from metadata
5. Generate artefact ID
6. Write unit tests

**Files**:
- `libs/blob-ingestion/src/ingestion/blob-transform.ts` (create)
- `libs/blob-ingestion/src/ingestion/blob-transform.test.ts` (create)

**Acceptance Criteria**:
- All required Artefact fields populated
- Date/time conversions correct
- no_match flag set appropriately
- Tests cover various blob structures

### Phase 7: Audit Repository (1 hour)

**Tasks**:
1. Create audit-repository.ts for database operations
2. Implement createAuditLog() function
3. Include all relevant fields (status, errors, timing)
4. Write unit tests with mocked Prisma

**Files**:
- `libs/blob-ingestion/src/audit/audit-repository.ts` (create)
- `libs/blob-ingestion/src/audit/audit-repository.test.ts` (create)
- `libs/blob-ingestion/src/audit/model.ts` (create)

**Acceptance Criteria**:
- Audit logs persist correctly
- All fields captured accurately
- Tests verify database operations

### Phase 8: Ingestion Service (1.5 hours)

**Tasks**:
1. Create ingestion-service.ts to orchestrate flow
2. Call validation, location lookup, transform, and publish
3. Handle no_match flag logic
4. Use existing createArtefact() from publication module
5. Return success/error responses
6. Write comprehensive unit tests

**Files**:
- `libs/blob-ingestion/src/ingestion/ingestion-service.ts` (create)
- `libs/blob-ingestion/src/ingestion/ingestion-service.test.ts` (create)

**Acceptance Criteria**:
- Validation failures return 422 with details
- Location not found sets no_match=true, continues
- Artefact created successfully
- Audit logged for all outcomes
- Tests cover success and failure paths

### Phase 9: API Endpoint (1 hour)

**Tasks**:
1. Create POST /api/v1/publication route
2. Apply OAuth middleware
3. Apply payload size limit middleware
4. Parse request body
5. Call ingestion service
6. Format responses with appropriate HTTP codes
7. Write integration tests

**Files**:
- `libs/blob-ingestion/src/routes/ingestion-api.ts` (create)
- `libs/blob-ingestion/src/middleware/payload-size-limit.ts` (create)
- `libs/blob-ingestion/src/middleware/payload-size-limit.test.ts` (create)

**Acceptance Criteria**:
- Route registered and accessible
- Middleware chain executes correctly
- Responses match API specification
- Integration tests pass

### Phase 10: App Registration (0.5 hours)

**Tasks**:
1. Register blob-ingestion routes in apps/api/src/app.ts
2. Update environment variables documentation
3. Test end-to-end flow

**Files**:
- `apps/api/src/app.ts` (modify)
- `.env.example` (modify)

**Acceptance Criteria**:
- API endpoint accessible via apps/api
- Environment variables documented
- E2E manual test successful

### Phase 11: Testing (2 hours)

**Tasks**:
1. Write E2E tests covering all test scenarios
2. Test with valid and invalid blobs
3. Test authentication and authorization
4. Test location matching scenarios
5. Verify audit logging
6. Run coverage reports

**Files**:
- `e2e-tests/blob-ingestion.spec.ts` (create)

**Acceptance Criteria**:
- All 13 test scenarios pass
- Code coverage >80%
- E2E tests run in CI/CD

### Phase 12: Documentation & Monitoring (1 hour)

**Tasks**:
1. Create OpenAPI specification
2. Document environment variables
3. Add monitoring metrics
4. Configure alerts
5. Update README

**Files**:
- `docs/api/blob-ingestion.openapi.yaml` (create)
- `libs/blob-ingestion/README.md` (create)

**Acceptance Criteria**:
- API documented with examples
- Monitoring configured
- Alerts set up for failure rates

## Configuration Requirements

### Environment Variables

Add to `.env`:

```bash
# Blob Ingestion Configuration
MAX_INGESTION_PAYLOAD_SIZE=10485760  # 10MB in bytes

# Azure AD OAuth Configuration (existing)
AZURE_AD_TENANT_ID=<tenant-id>
AZURE_AD_CLIENT_ID=<client-id>
AZURE_AD_ISSUER=https://login.microsoftonline.com/<tenant-id>/v2.0

# Source System Configuration
ALLOWED_SOURCE_SYSTEMS=XHIBIT,LIBRA,SJP,CPP
```

### Azure AD Configuration

1. Ensure app registration has app role defined:
   - Name: `api.publisher.user`
   - Value: `api.publisher.user`
   - Description: "Allows publishing hearing lists via API"

2. Grant app role to source system service principals

## Testing Strategy

### Unit Tests (Co-located with source)
- Validation logic (all schema rules)
- Location lookup (found/not found)
- Blob transformation (field mapping)
- Ingestion service (orchestration)
- Audit repository (database operations)
- All middleware (auth, size limits)

### Integration Tests
- API endpoint with mocked OAuth
- Full request/response cycle
- Database interactions

### E2E Tests
- Valid blob → success (TS1)
- Unknown court → success with no_match (TS2)
- Malformed JSON → 400 (TS3)
- Missing required field → 422 (TS4)
- Invalid enum value → 422 (TS5)
- Payload too large → 413 (TS6)
- No auth token → 401 (TS7)
- Invalid token → 401 (TS8)
- Missing app role → 403 (TS9)
- Invalid date format → 422 (TS10)
- Empty hearing list → 422 (TS11)
- Audit log verification (TS12)
- Duplicate blob supersedes (TS13)

## Risk Mitigation

### Risk 1: OAuth Configuration Complexity
**Mitigation**:
- Start with detailed documentation
- Provide example token payloads
- Create OAuth testing utilities

### Risk 2: Performance with Large Blobs
**Mitigation**:
- Implement payload size limits
- Monitor processing times
- Consider async processing for future

### Risk 3: Schema Evolution
**Mitigation**:
- Version schema in metadata
- Plan for backward compatibility
- Document breaking changes clearly

### Risk 4: Location Matching Ambiguity
**Mitigation**:
- Clear documentation on court_id format
- Admin UI for manual mapping (future)
- Comprehensive audit logging

## Rollout Plan

### Phase 1: Dev Environment
1. Deploy to dev environment
2. Manual testing with sample blobs
3. Verify OAuth integration
4. Test location matching

### Phase 2: Integration Testing
1. Coordinate with source system teams
2. Provide test credentials
3. Test with real-world data samples
4. Iterate on validation rules

### Phase 3: Staging
1. Deploy to staging
2. Full E2E testing
3. Performance testing
4. Security review

### Phase 4: Production
1. Deploy during maintenance window
2. Monitor ingestion rates
3. Set up alerts
4. Gradual rollout to source systems

## Success Metrics

- Ingestion success rate >95%
- API response time p95 <2 seconds
- Zero security incidents
- Audit log completeness 100%
- Test coverage >80%

## Dependencies

### Code Dependencies
- `@hmcts/publication` (existing)
- `@hmcts/location` (existing)
- `@hmcts/postgres` (existing)
- `ajv` version 8.17.1
- `ajv-formats` version 3.0.1
- `passport-azure-ad` version 4.3.5

### External Dependencies
- Azure AD app registrations configured
- Location master data populated
- Network connectivity from source systems

### Team Dependencies
- OAuth configuration by infrastructure team
- Test credentials from Azure AD admin
- Sample blobs from source system teams

## Post-Implementation

### Monitoring
- Dashboard showing ingestion rates by source system
- Alerts on high failure rates (>10% in 5 minutes)
- Daily report of no_match occurrences
- Performance metrics (response times, payload sizes)

### Support
- Runbook for common issues
- Documentation for source system teams
- Troubleshooting guide using audit logs

### Future Enhancements
- Batch ingestion endpoint
- Async processing with message queue
- Webhook callbacks to source systems
- Schema version management
- Rate limiting per source system
- Admin UI for no_match resolution
