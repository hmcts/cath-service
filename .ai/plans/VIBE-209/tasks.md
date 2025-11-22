# VIBE-209: Blob Ingestion - Task Breakdown

## Phase 1: Database Schema (1 hour)

### Task 1.1: Add no_match column to artefact table
- [ ] Modify `apps/postgres/prisma/schema.prisma`
- [ ] Add `noMatch Boolean @default(false) @map("no_match")` to Artefact model
- [ ] Run `yarn db:generate` to update Prisma client
- [ ] Create migration: `yarn db:migrate:dev --name add-artefact-no-match`
- [ ] Verify migration on dev database

**Files**: `apps/postgres/prisma/schema.prisma`

### Task 1.2: Create ingestion_audit table
- [ ] Add IngestionAudit model to `apps/postgres/prisma/schema.prisma`
- [ ] Include all fields: id, sourceSystem, courtId, validationResult, etc.
- [ ] Add indexes on sourceSystem, courtId, createdAt, validationResult
- [ ] Run `yarn db:generate`
- [ ] Create migration: `yarn db:migrate:dev --name create-ingestion-audit`
- [ ] Verify migration and indexes created

**Files**: `apps/postgres/prisma/schema.prisma`

**Acceptance**: Both migrations run successfully, no errors in Prisma client generation

---

## Phase 2: Module Setup (1 hour)

### Task 2.1: Create blob-ingestion module structure
- [ ] Create `libs/blob-ingestion` directory
- [ ] Create subdirectories: `src/routes`, `src/ingestion`, `src/validation`, `src/audit`, `src/middleware`
- [ ] Create `prisma/` directory for module schema

**Command**: `mkdir -p libs/blob-ingestion/src/{routes,ingestion,validation,audit,middleware} libs/blob-ingestion/prisma`

### Task 2.2: Create package.json
- [ ] Create `libs/blob-ingestion/package.json`
- [ ] Set name to `@hmcts/blob-ingestion`
- [ ] Add dependencies: `@hmcts/postgres`, `@hmcts/publication`, `@hmcts/location`, `ajv`, `ajv-formats`, `passport-azure-ad`
- [ ] Add peerDependencies: `express`
- [ ] Add scripts: build, dev, test, lint
- [ ] Configure exports: `.` and `./config`

**Files**: `libs/blob-ingestion/package.json`

### Task 2.3: Create tsconfig.json
- [ ] Create `libs/blob-ingestion/tsconfig.json`
- [ ] Extend root tsconfig
- [ ] Set outDir to `./dist`, rootDir to `./src`
- [ ] Enable declaration and declarationMap
- [ ] Exclude test files and dist

**Files**: `libs/blob-ingestion/tsconfig.json`

### Task 2.4: Create config.ts and index.ts
- [ ] Create `libs/blob-ingestion/src/config.ts` with apiRoutes, prismaSchemas exports
- [ ] Create `libs/blob-ingestion/src/index.ts` for business logic exports
- [ ] Add __dirname helper using fileURLToPath

**Files**:
- `libs/blob-ingestion/src/config.ts`
- `libs/blob-ingestion/src/index.ts`

### Task 2.5: Register module in root tsconfig
- [ ] Edit root `tsconfig.json`
- [ ] Add `"@hmcts/blob-ingestion": ["libs/blob-ingestion/src"]` to paths
- [ ] Run `yarn install` to update workspace

**Files**: `tsconfig.json`

**Acceptance**: Module compiles with `yarn workspace @hmcts/blob-ingestion build`, TypeScript paths resolve

---

## Phase 3: JSON Schema Validation (1.5 hours)

### Task 3.1: Create JSON schema definition
- [ ] Create `libs/blob-ingestion/src/validation/blob-schema.json`
- [ ] Define schema with required fields: court_id, publication_date, hearing_type, hearing_list, metadata
- [ ] Add properties validation for all fields
- [ ] Define hearing_list item schema (case_id, case_name required)
- [ ] Add format validation for publication_date (date-time)
- [ ] Add enum validation for hearing_type and source_system
- [ ] Add minItems: 1 for hearing_list array

**Files**: `libs/blob-ingestion/src/validation/blob-schema.json`

### Task 3.2: Create blob-validator.ts
- [ ] Create `libs/blob-ingestion/src/validation/blob-validator.ts`
- [ ] Import AJV and ajv-formats
- [ ] Import blob-schema.json using `with { type: "json" }`
- [ ] Create validateBlobData() function
- [ ] Configure AJV with allErrors: true
- [ ] Add format support with ajv-formats
- [ ] Return ValidationResult interface (isValid, errors, schemaVersion)
- [ ] Map AJV errors to user-friendly messages

**Files**: `libs/blob-ingestion/src/validation/blob-validator.ts`

### Task 3.3: Write unit tests
- [ ] Create `libs/blob-ingestion/src/validation/blob-validator.test.ts`
- [ ] Test valid blob passes validation
- [ ] Test missing required field fails (court_id, publication_date, hearing_list, metadata)
- [ ] Test invalid date format fails
- [ ] Test invalid enum value fails (hearing_type, source_system)
- [ ] Test empty hearing_list fails
- [ ] Test missing nested required field fails (case_id in hearing_list)
- [ ] Verify error messages are descriptive

**Files**: `libs/blob-ingestion/src/validation/blob-validator.test.ts`

**Acceptance**: All validation tests pass, coverage >90%

---

## Phase 4: OAuth Authentication Middleware (1.5 hours)

### Task 4.1: Create oauth-authenticate.ts middleware
- [ ] Create `libs/blob-ingestion/src/middleware/oauth-authenticate.ts`
- [ ] Import passport-azure-ad BearerStrategy
- [ ] Create authenticateOAuth() function returning Express middleware
- [ ] Configure BearerStrategy with Azure AD settings from env vars
- [ ] Validate token signature and expiration
- [ ] Extract app roles from token claims
- [ ] Check for `api.publisher.user` role
- [ ] Return 401 for missing/invalid token
- [ ] Return 403 for missing app role
- [ ] Attach user info to req.user

**Files**: `libs/blob-ingestion/src/middleware/oauth-authenticate.ts`

### Task 4.2: Write unit tests
- [ ] Create `libs/blob-ingestion/src/middleware/oauth-authenticate.test.ts`
- [ ] Mock passport-azure-ad
- [ ] Test valid token with correct app role passes
- [ ] Test missing token returns 401
- [ ] Test invalid token returns 401
- [ ] Test expired token returns 401
- [ ] Test missing app role returns 403
- [ ] Test wrong app role returns 403
- [ ] Verify req.user populated correctly

**Files**: `libs/blob-ingestion/src/middleware/oauth-authenticate.test.ts`

**Acceptance**: All auth scenarios covered, tests pass

---

## Phase 5: Location Lookup Service (1 hour)

### Task 5.1: Create location-lookup.ts
- [ ] Create `libs/blob-ingestion/src/ingestion/location-lookup.ts`
- [ ] Import `@hmcts/location` queries
- [ ] Create lookupLocation() function accepting court_id
- [ ] Query location data by court_id
- [ ] Return { found: boolean, locationId?: string }
- [ ] Handle errors gracefully (return found: false)

**Files**: `libs/blob-ingestion/src/ingestion/location-lookup.ts`

### Task 5.2: Write unit tests
- [ ] Create `libs/blob-ingestion/src/ingestion/location-lookup.test.ts`
- [ ] Mock `@hmcts/location` queries
- [ ] Test existing court_id returns found: true with locationId
- [ ] Test non-existing court_id returns found: false
- [ ] Test error during lookup returns found: false
- [ ] Verify no exceptions thrown

**Files**: `libs/blob-ingestion/src/ingestion/location-lookup.test.ts`

**Acceptance**: Location lookup works for existing and non-existing courts

---

## Phase 6: Blob Transform Service (1 hour)

### Task 6.1: Create blob-transform.ts
- [ ] Create `libs/blob-ingestion/src/ingestion/blob-transform.ts`
- [ ] Import Artefact model from `@hmcts/publication`
- [ ] Create transformBlobToArtefact() function
- [ ] Accept blob data and location lookup result
- [ ] Map court_id to locationId
- [ ] Map publication_date to contentDate
- [ ] Map metadata.source_system to provenance
- [ ] Set noMatch flag from location lookup
- [ ] Generate artefactId using uuid
- [ ] Set display dates (displayFrom, displayTo)
- [ ] Set isFlatFile: false
- [ ] Set sensitivity and language defaults
- [ ] Return Artefact object

**Files**: `libs/blob-ingestion/src/ingestion/blob-transform.ts`

### Task 6.2: Write unit tests
- [ ] Create `libs/blob-ingestion/src/ingestion/blob-transform.test.ts`
- [ ] Test transformation with location found (noMatch: false)
- [ ] Test transformation with location not found (noMatch: true)
- [ ] Test all required Artefact fields populated
- [ ] Test date conversions correct
- [ ] Test provenance mapping
- [ ] Verify artefactId generated

**Files**: `libs/blob-ingestion/src/ingestion/blob-transform.test.ts`

**Acceptance**: Blob transforms to valid Artefact model

---

## Phase 7: Audit Repository (1 hour)

### Task 7.1: Create audit model types
- [ ] Create `libs/blob-ingestion/src/audit/model.ts`
- [ ] Define IngestionAuditLog interface
- [ ] Match Prisma schema fields
- [ ] Export types

**Files**: `libs/blob-ingestion/src/audit/model.ts`

### Task 7.2: Create audit-repository.ts
- [ ] Create `libs/blob-ingestion/src/audit/audit-repository.ts`
- [ ] Import prisma from `@hmcts/postgres`
- [ ] Create createAuditLog() function
- [ ] Accept audit log data
- [ ] Insert into ingestion_audit table
- [ ] Return created record ID
- [ ] Handle database errors

**Files**: `libs/blob-ingestion/src/audit/audit-repository.ts`

### Task 7.3: Write unit tests
- [ ] Create `libs/blob-ingestion/src/audit/audit-repository.test.ts`
- [ ] Mock Prisma client
- [ ] Test successful audit log creation
- [ ] Test all fields persisted correctly
- [ ] Test error handling
- [ ] Verify database method called with correct data

**Files**: `libs/blob-ingestion/src/audit/audit-repository.test.ts`

**Acceptance**: Audit logs persist successfully with all fields

---

## Phase 8: Ingestion Service (1.5 hours)

### Task 8.1: Create ingestion-service.ts
- [ ] Create `libs/blob-ingestion/src/ingestion/ingestion-service.ts`
- [ ] Import validation, location lookup, transform, audit, publication modules
- [ ] Create ingestBlob() function accepting request data
- [ ] Call validateBlobData()
- [ ] If validation fails, log audit and return 422 error
- [ ] Call lookupLocation()
- [ ] Call transformBlobToArtefact() with location result
- [ ] Call createArtefact() from `@hmcts/publication`
- [ ] Log successful audit
- [ ] Return success response with artefact_id and no_match flag
- [ ] Handle errors and log audit for failures

**Files**: `libs/blob-ingestion/src/ingestion/ingestion-service.ts`

### Task 8.2: Write unit tests
- [ ] Create `libs/blob-ingestion/src/ingestion/ingestion-service.test.ts`
- [ ] Mock all dependencies
- [ ] Test successful ingestion (location found)
- [ ] Test successful ingestion (location not found, no_match=true)
- [ ] Test validation failure returns 422
- [ ] Test audit logged on success
- [ ] Test audit logged on failure
- [ ] Test error handling
- [ ] Verify createArtefact called with correct data

**Files**: `libs/blob-ingestion/src/ingestion/ingestion-service.test.ts`

**Acceptance**: Service orchestrates all steps correctly, >85% coverage

---

## Phase 9: API Endpoint and Middleware (1 hour)

### Task 9.1: Create payload-size-limit.ts middleware
- [ ] Create `libs/blob-ingestion/src/middleware/payload-size-limit.ts`
- [ ] Create payloadSizeLimit() function
- [ ] Read MAX_INGESTION_PAYLOAD_SIZE from env (default 10MB)
- [ ] Check Content-Length header
- [ ] Return 413 if exceeds limit
- [ ] Otherwise call next()

**Files**: `libs/blob-ingestion/src/middleware/payload-size-limit.ts`

### Task 9.2: Create payload-size-limit.test.ts
- [ ] Create `libs/blob-ingestion/src/middleware/payload-size-limit.test.ts`
- [ ] Test payload under limit passes
- [ ] Test payload over limit returns 413
- [ ] Test missing Content-Length passes

**Files**: `libs/blob-ingestion/src/middleware/payload-size-limit.test.ts`

### Task 9.3: Create ingestion-api.ts route
- [ ] Create `libs/blob-ingestion/src/routes/ingestion-api.ts`
- [ ] Export POST handler for /api/v1/publication
- [ ] Apply authenticateOAuth middleware
- [ ] Apply payloadSizeLimit middleware
- [ ] Parse request body
- [ ] Call ingestBlob() service
- [ ] Format success response (200 OK)
- [ ] Format error responses (400, 401, 403, 413, 422, 500)
- [ ] Handle async errors

**Files**: `libs/blob-ingestion/src/routes/ingestion-api.ts`

**Acceptance**: API endpoint handles all HTTP methods and status codes correctly

---

## Phase 10: App Registration (0.5 hours)

### Task 10.1: Register blob-ingestion routes in API app
- [ ] Edit `apps/api/src/app.ts`
- [ ] Import `{ apiRoutes as blobIngestionRoutes } from "@hmcts/blob-ingestion/config"`
- [ ] Add blobIngestionRoutes to routeMounts array
- [ ] Verify route registration in simple-router

**Files**: `apps/api/src/app.ts`

### Task 10.2: Update environment variables
- [ ] Add MAX_INGESTION_PAYLOAD_SIZE to `.env.example`
- [ ] Document Azure AD OAuth variables if not present
- [ ] Add ALLOWED_SOURCE_SYSTEMS

**Files**: `.env.example`

### Task 10.3: Manual E2E test
- [ ] Start dev environment: `yarn dev`
- [ ] POST valid blob to `/api/v1/publication` using curl/Postman
- [ ] Verify 200 response with artefact_id
- [ ] Check artefact created in database
- [ ] Check audit log created
- [ ] Test with invalid blob, verify 422 response

**Acceptance**: API endpoint accessible and functional end-to-end

---

## Phase 11: Testing (2 hours)

### Task 11.1: Write E2E tests
- [ ] Create `e2e-tests/blob-ingestion.spec.ts`
- [ ] Set up test fixtures (valid/invalid blobs)
- [ ] Test TS1: Valid blob with existing court (200 OK, no_match=false)
- [ ] Test TS2: Valid blob with unknown court (200 OK, no_match=true)
- [ ] Test TS3: Malformed JSON (400 Bad Request)
- [ ] Test TS4: Missing required field court_id (422)
- [ ] Test TS5: Invalid source_system value (422)
- [ ] Test TS6: Payload exceeds 10MB (413)
- [ ] Test TS7: No authentication token (401)
- [ ] Test TS8: Invalid token (401)
- [ ] Test TS9: Missing app role (403)
- [ ] Test TS10: Invalid date-time format (422)
- [ ] Test TS11: Empty hearing_list array (422)
- [ ] Test TS12: Audit log created (check database)
- [ ] Test TS13: Duplicate blob supersedes existing (check supersededCount)

**Files**: `e2e-tests/blob-ingestion.spec.ts`

### Task 11.2: Run coverage reports
- [ ] Run `yarn test:coverage`
- [ ] Verify blob-ingestion module >80% coverage
- [ ] Fix any uncovered critical paths
- [ ] Commit coverage reports

**Acceptance**: All E2E tests pass, coverage >80%

---

## Phase 12: Documentation and Monitoring (1 hour)

### Task 12.1: Create OpenAPI specification
- [ ] Create `docs/api/blob-ingestion.openapi.yaml`
- [ ] Document POST /api/v1/publication endpoint
- [ ] Include request/response schemas
- [ ] Document all status codes
- [ ] Add authentication requirements
- [ ] Include examples

**Files**: `docs/api/blob-ingestion.openapi.yaml`

### Task 12.2: Create module README
- [ ] Create `libs/blob-ingestion/README.md`
- [ ] Document module purpose
- [ ] List dependencies
- [ ] Explain configuration
- [ ] Provide usage examples
- [ ] Document environment variables

**Files**: `libs/blob-ingestion/README.md`

### Task 12.3: Add monitoring (if infrastructure exists)
- [ ] Add metrics for ingestion success/failure rates
- [ ] Configure alerts for high failure rates
- [ ] Document monitoring setup

**Acceptance**: Complete documentation available for developers and operators

---

## Final Checklist

### Code Quality
- [ ] All TypeScript strict mode checks pass
- [ ] No `any` types without justification
- [ ] All imports use `.js` extensions
- [ ] Biome lint passes: `yarn lint`
- [ ] Code formatted: `yarn format`

### Testing
- [ ] All unit tests pass: `yarn test`
- [ ] All E2E tests pass: `yarn test:e2e`
- [ ] Coverage >80%: `yarn test:coverage`

### Database
- [ ] Migrations applied successfully
- [ ] Prisma client generated
- [ ] Indexes created

### Integration
- [ ] Module registered in apps/api
- [ ] Environment variables documented
- [ ] Routes accessible

### Documentation
- [ ] API specification complete
- [ ] README created
- [ ] Environment variables documented
- [ ] Code comments where needed

### Security
- [ ] OAuth authentication working
- [ ] App role authorization enforced
- [ ] Payload size limits enforced
- [ ] No secrets in code
- [ ] Security review completed

### Deployment
- [ ] Works in dev environment
- [ ] Ready for code review
- [ ] PR created with description
- [ ] Tests pass in CI/CD

---

## Estimated Time Breakdown

| Phase | Tasks | Estimated Hours |
|-------|-------|-----------------|
| Phase 1: Database Schema | 2 tasks | 1.0 |
| Phase 2: Module Setup | 5 tasks | 1.0 |
| Phase 3: JSON Schema Validation | 3 tasks | 1.5 |
| Phase 4: OAuth Authentication | 2 tasks | 1.5 |
| Phase 5: Location Lookup | 2 tasks | 1.0 |
| Phase 6: Blob Transform | 2 tasks | 1.0 |
| Phase 7: Audit Repository | 3 tasks | 1.0 |
| Phase 8: Ingestion Service | 2 tasks | 1.5 |
| Phase 9: API Endpoint | 3 tasks | 1.0 |
| Phase 10: App Registration | 3 tasks | 0.5 |
| Phase 11: Testing | 2 tasks | 2.0 |
| Phase 12: Documentation | 3 tasks | 1.0 |
| **TOTAL** | **32 tasks** | **13.0 hours** |

---

## Notes

- Follow HMCTS monorepo conventions from CLAUDE.md
- Use ES modules with `.js` extensions on imports
- Colocate tests with source files
- No types.ts files - keep types with implementation
- Use functional style, avoid classes unless necessary
- All database operations through Prisma
- All validation using AJV and JSON Schema
- Reuse existing components from @hmcts packages
