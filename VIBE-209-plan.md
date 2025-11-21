# VIBE-209: Blob Ingestion in CaTH - Implementation Plan

## Summary
Implement secure OAuth-protected API endpoint for automated ingestion of hearing list JSON blobs from source systems with comprehensive validation, location matching (with no_match flag), and complete audit logging.

## Key Implementation Points

### Phase 1: Database & Module Setup (1 hour)
1. Add `no_match` column to artefact table
2. Create ingestion_audit table
3. Set up libs/blob-ingestion module
4. Install dependencies (ajv, passport-azure-ad)

### Phase 2: OAuth Authentication (1.5 hours)
1. Implement oauth-middleware.ts using existing app registrations
2. Validate Bearer tokens against Azure AD
3. Check app role `api.publisher.user`
4. Return 401/403 for auth failures

### Phase 3: Validation & Processing (2.5 hours)
1. Create JSON schema (blob-schema.json)
2. Implement validation-service.ts with Ajv
3. Build location-lookup-service.ts
4. Create publication-transform-service.ts
5. Implement ingestion-service.ts orchestration

### Phase 4: API Endpoint (1 hour)
1. Create POST /api/v1/publication route
2. Apply middlewares (OAuth, size limit)
3. Handle request/response flow
4. Return appropriate HTTP status codes

### Phase 5: Audit & Monitoring (1 hour)
1. Implement audit logging
2. Add metrics tracking
3. Configure alerts
4. Create monitoring dashboard

### Phase 6: Testing (2 hours)
1. Unit tests (validation, services)
2. Integration tests (API endpoint)
3. E2E tests (various scenarios)
4. Security testing (OAuth)

## Technical Decisions

**Location Matching**: When court_id not found in master data, still ingest publication but set no_match=true. This allows data capture while awaiting admin action.

**Reuse Existing Logic**: Use same publication processing as manual upload to maintain consistency and reduce duplication.

**Async Processing**: Consider message queue for large blobs to avoid request timeouts.

## Definition of Done
- [ ] OAuth authentication working with app role check
- [ ] JSON schema validation comprehensive
- [ ] Location matching with no_match flag
- [ ] Audit logging captures all attempts
- [ ] All tests pass
- [ ] API documentation complete
- [ ] Security review approved
