# VIBE-209: Blob Ingestion API - Implementation Tasks

## Infrastructure Assessment
- [x] **NO NEW INFRASTRUCTURE REQUIRED** - Uses existing Azure AD, PostgreSQL, Redis
- [x] Verified OAuth infrastructure exists (Azure AD tenant, app registrations)
- [x] Verified database supports new columns and tables
- [x] Verified Redis available for blob storage
- [x] Verified Application Insights configured for monitoring

## Phase 1: Database Schema & Models

### Database Changes
- [ ] Update `apps/postgres/prisma/schema.prisma`:
  - [ ] Add `noMatch Boolean @default(false) @map("no_match")` to Artefact model
  - [ ] Create PublicationAuditLog model with all required fields
  - [ ] Add indexes on audit log (timestamp, sourceSystem, status, locationId)
- [ ] Create migration: `yarn db:migrate:dev --name add-publication-audit-schema`
- [ ] Generate Prisma client: `yarn db:generate`
- [ ] Verify schema in Prisma Studio: `yarn db:studio`

### Update Existing Models
- [ ] Update `libs/publication/src/repository/model.ts`:
  - [ ] Add `noMatch?: boolean` to Artefact interface
- [ ] Update `libs/publication/src/repository/queries.ts`:
  - [ ] Add `noMatch` to createArtefact data mapping
  - [ ] Add `noMatch` to query result mappings
  - [ ] Write unit tests for noMatch field handling

### Create New Models
- [ ] Create `libs/api-publication/src/models.ts` with interfaces:
  - [ ] `PublicationRequest` interface
  - [ ] `PublicationResponse` interface
  - [ ] `PublicationErrorResponse` interface
  - [ ] `IngestionResult` interface
  - [ ] `AuditLogEntry` interface
  - [ ] `ValidationError` interface

### Testing
- [ ] Test migration rollback
- [ ] Test default value for noMatch column
- [ ] Verify indexes created correctly
- [ ] Test Prisma client generation

---

## Phase 2: OAuth Authentication Infrastructure

### Create API Auth Module
- [ ] Create `libs/api-auth/` directory structure
- [ ] Create `libs/api-auth/package.json`:
  - [ ] Add dependencies: passport, passport-azure-ad
  - [ ] Add peerDependencies: express
  - [ ] Add scripts: build, dev, test, lint
- [ ] Create `libs/api-auth/tsconfig.json` extending root
- [ ] Register in root `tsconfig.json` paths: `"@hmcts/api-auth": ["libs/api-auth/src"]`

### Implement Bearer Strategy
- [ ] Create `libs/api-auth/src/bearer-strategy.ts`:
  - [ ] Import BearerStrategy from passport-azure-ad
  - [ ] Configure OAuth options from environment
  - [ ] Implement token verification callback
  - [ ] Extract and validate app roles
  - [ ] Handle verification errors
  - [ ] Export createBearerStrategy function
- [ ] Write unit tests for bearer strategy:
  - [ ] Test valid token with correct role
  - [ ] Test valid token with incorrect role
  - [ ] Test expired token
  - [ ] Test invalid signature
  - [ ] Test missing role claim

### Create Authorization Middleware
- [ ] Create `libs/api-auth/src/require-api-role.ts`:
  - [ ] Implement requireApiRole function
  - [ ] Use passport.authenticate with oauth-bearer
  - [ ] Validate user roles from token
  - [ ] Return 401 for invalid tokens
  - [ ] Return 403 for insufficient permissions
  - [ ] Export as RequestHandler
- [ ] Write unit tests for middleware:
  - [ ] Test successful authentication
  - [ ] Test missing token
  - [ ] Test invalid token
  - [ ] Test missing role
  - [ ] Test correct role

### Environment Configuration
- [ ] Add to Azure Key Vault (per environment):
  - [ ] `api-oauth-identity-metadata`
  - [ ] `api-oauth-client-id`
  - [ ] `api-oauth-issuer`
  - [ ] `api-oauth-audience`
- [ ] Update `apps/api/helm/values.yaml`:
  - [ ] Add Key Vault secret mappings
- [ ] Update `apps/api/config/custom-environment-variables.json`:
  - [ ] Map OAuth environment variables
- [ ] Update `apps/api/.env.example`:
  - [ ] Document OAuth variables

### Configure Passport in API App
- [ ] Update `apps/api/src/app.ts`:
  - [ ] Import passport and bearer strategy
  - [ ] Initialize passport before routes
  - [ ] Register bearer strategy
  - [ ] Do NOT use session (stateless API)
- [ ] Write integration tests:
  - [ ] Test passport initialization
  - [ ] Test strategy registration

### Module Exports
- [ ] Create `libs/api-auth/src/index.ts`:
  - [ ] Export createBearerStrategy
  - [ ] Export requireApiRole
  - [ ] Export types

---

## Phase 3: Validation Logic

### Business Rules Validation
- [ ] Create `libs/api-publication/src/validation/business-rules.ts`:
  - [ ] Import types from models.ts
  - [ ] Implement validateBusinessRules function
  - [ ] Validate required fields (locationId, listTypeId, provenance, etc.)
  - [ ] Validate provenance enum (XHIBIT, LIBRA, SJP)
  - [ ] Validate language enum (ENGLISH, WELSH)
  - [ ] Validate sensitivity enum (PUBLIC, PRIVATE, CLASSIFIED)
  - [ ] Validate date format (ISO 8601)
  - [ ] Validate displayFrom < displayTo
  - [ ] Return array of ValidationError
- [ ] Write unit tests:
  - [ ] Test each validation rule individually
  - [ ] Test valid input returns empty array
  - [ ] Test multiple errors returned together
  - [ ] Test edge cases (empty strings, null, undefined)

### Schema Validation Integration
- [ ] Create `libs/api-publication/src/validation/schema-validator.ts`:
  - [ ] Import validateListTypeJson from @hmcts/list-types-common
  - [ ] Implement validatePublicationSchema function
  - [ ] Pass listTypeId and content to validator
  - [ ] Map validation errors to ValidationError format
  - [ ] Handle validator exceptions
- [ ] Write unit tests:
  - [ ] Test valid JSON against schema
  - [ ] Test invalid JSON structure
  - [ ] Test missing required fields in JSON
  - [ ] Test invalid data types in JSON
  - [ ] Test with mock list type schemas

### Location Validation
- [ ] Create `libs/api-publication/src/validation/location-validator.ts`:
  - [ ] Import getLocationById from @hmcts/location
  - [ ] Implement validateLocation function
  - [ ] Parse locationId to number
  - [ ] Call getLocationById
  - [ ] Return { exists: boolean, location?: Location }
  - [ ] Handle invalid location IDs (NaN)
- [ ] Write unit tests:
  - [ ] Test existing location returns true
  - [ ] Test non-existent location returns false
  - [ ] Test invalid location ID (non-numeric)
  - [ ] Test with mock location data

### Validation Module Index
- [ ] Create `libs/api-publication/src/validation/index.ts`:
  - [ ] Export validateBusinessRules
  - [ ] Export validatePublicationSchema
  - [ ] Export validateLocation
  - [ ] Export ValidationError type

---

## Phase 4: Core Ingestion Service

### Create Module Structure
- [ ] Create `libs/api-publication/` directory
- [ ] Create `libs/api-publication/package.json`:
  - [ ] Set name: "@hmcts/api-publication"
  - [ ] Add dependencies: ajv, @hmcts/publication, @hmcts/location, @hmcts/list-types-common, @hmcts/postgres, @hmcts/redis
  - [ ] Add scripts: build, dev, test, lint
- [ ] Create `libs/api-publication/tsconfig.json`
- [ ] Create `libs/api-publication/src/config.ts`:
  - [ ] Export apiRoutes path
  - [ ] Export prismaSchemas path
- [ ] Create `libs/api-publication/src/index.ts`:
  - [ ] Export ingestion service functions
  - [ ] Export models/types
- [ ] Register in root `tsconfig.json`: `"@hmcts/api-publication": ["libs/api-publication/src"]`

### Implement Ingestion Service
- [ ] Create `libs/api-publication/src/ingestion/service.ts`:
  - [ ] Import all validation functions
  - [ ] Import createArtefact from @hmcts/publication
  - [ ] Implement ingestPublication function:
    - [ ] Accept PublicationRequest and sourceSystem
    - [ ] Track start time for performance metrics
    - [ ] Call validateBusinessRules
    - [ ] Return error if business validation fails
    - [ ] Call validatePublicationSchema
    - [ ] Return error if schema validation fails
    - [ ] Call validateLocation
    - [ ] Set noMatch based on location existence
    - [ ] Generate artefactId (UUID)
    - [ ] Call createArtefact with noMatch flag
    - [ ] Call storePublicationBlob
    - [ ] Call logAuditEvent (success)
    - [ ] Calculate processing time
    - [ ] Return IngestionResult with success
    - [ ] Catch exceptions and return error result
    - [ ] Call logAuditEvent (error) in catch block
- [ ] Write unit tests:
  - [ ] Test successful ingestion (location exists)
  - [ ] Test successful ingestion (location not found, noMatch=true)
  - [ ] Test business validation failure
  - [ ] Test schema validation failure
  - [ ] Test artefact creation failure
  - [ ] Test blob storage failure
  - [ ] Mock all dependencies

### Blob Storage
- [ ] Create `libs/api-publication/src/ingestion/blob-storage.ts`:
  - [ ] Import getRedisClient from @hmcts/redis
  - [ ] Implement storePublicationBlob function:
    - [ ] Accept artefactId and content
    - [ ] Generate Redis key: `publication-blob:${artefactId}`
    - [ ] Serialize content to JSON
    - [ ] Store in Redis with TTL (1 hour)
    - [ ] Handle Redis errors
  - [ ] Implement getPublicationBlob function for retrieval
- [ ] Write unit tests:
  - [ ] Test successful storage
  - [ ] Test successful retrieval
  - [ ] Test Redis connection error
  - [ ] Test TTL expiration
  - [ ] Mock Redis client

### Response Formatting
- [ ] Create `libs/api-publication/src/ingestion/response-formatter.ts`:
  - [ ] Implement formatSuccessResponse function
  - [ ] Implement formatErrorResponse function
  - [ ] Map error codes to HTTP status codes
  - [ ] Include appropriate error details
- [ ] Write unit tests:
  - [ ] Test success response format
  - [ ] Test each error type format
  - [ ] Verify all required fields present

---

## Phase 5: Audit Logging

### Audit Logging Service
- [ ] Create `libs/api-publication/src/audit/logging.ts`:
  - [ ] Import prisma from @hmcts/postgres
  - [ ] Implement logAuditEvent function:
    - [ ] Accept AuditLogEntry
    - [ ] Generate UUID for log entry
    - [ ] Set timestamp if not provided
    - [ ] Insert into publication_audit_log table
    - [ ] Handle database errors gracefully (log to console, don't throw)
  - [ ] Add logging for success, validation error, location not found, system error
- [ ] Write unit tests:
  - [ ] Test successful log creation
  - [ ] Test each status type
  - [ ] Test database error handling (doesn't throw)
  - [ ] Mock Prisma client

### Audit Query Functions
- [ ] Create `libs/api-publication/src/audit/queries.ts`:
  - [ ] Implement getAuditLogsBySourceSystem(sourceSystem, limit)
  - [ ] Implement getFailedIngestions(daysBack)
  - [ ] Implement getAuditLogByArtefactId(artefactId)
  - [ ] Implement getAuditLogsByLocationId(locationId, limit)
  - [ ] Add pagination support
- [ ] Write unit tests:
  - [ ] Test each query function
  - [ ] Test pagination
  - [ ] Test with no results
  - [ ] Mock Prisma client

### Alerting Logic
- [ ] Create `libs/api-publication/src/audit/alerting.ts`:
  - [ ] Import Application Insights client
  - [ ] Implement checkErrorThreshold function:
    - [ ] Query error count for source system in last 5 minutes
    - [ ] If count >= 10, send alert
    - [ ] Track alert sent to avoid duplicates
  - [ ] Implement alertOnNoMatch function:
    - [ ] Send alert when location not found
    - [ ] Include location ID and source system
  - [ ] Implement sendAlert helper:
    - [ ] Log to Application Insights
    - [ ] Include severity level
    - [ ] Include context data
- [ ] Write unit tests:
  - [ ] Test threshold detection
  - [ ] Test alert sending
  - [ ] Test duplicate alert prevention
  - [ ] Mock Application Insights

### Audit Log Cleanup Job
- [ ] Create `apps/crons/src/jobs/cleanup-audit-logs.ts`:
  - [ ] Calculate cutoff date (90 days ago)
  - [ ] Delete audit logs older than cutoff
  - [ ] Log deletion count
  - [ ] Handle errors
- [ ] Schedule in cron configuration
- [ ] Write unit tests:
  - [ ] Test cleanup with old logs
  - [ ] Test cleanup with no old logs
  - [ ] Test date calculation
  - [ ] Mock Prisma client

### Module Exports
- [ ] Create `libs/api-publication/src/audit/index.ts`:
  - [ ] Export logAuditEvent
  - [ ] Export query functions
  - [ ] Export alerting functions

---

## Phase 6: API Route Implementation

### Create API Route
- [ ] Create `libs/api-publication/src/routes/v1/publication.ts`:
  - [ ] Import Express types
  - [ ] Import requireApiRole from @hmcts/api-auth
  - [ ] Import ingestPublication service
  - [ ] Import validation functions
  - [ ] Import response formatters
- [ ] Implement GET handler:
  - [ ] Return API documentation/info
  - [ ] Include version, endpoints, required auth
- [ ] Implement POST handler:
  - [ ] Extract request body
  - [ ] Extract source system from req.user (appid from token)
  - [ ] Call ingestPublication(body, sourceSystem)
  - [ ] Format response based on result
  - [ ] Return appropriate HTTP status code
  - [ ] Handle errors with try-catch
- [ ] Apply middleware:
  - [ ] Export POST as array: [requireApiRole("api.publisher.user"), postHandler]
  - [ ] Export GET as handler function

### Request Processing
- [ ] Add request size limit middleware:
  - [ ] Configure express.json({ limit: "10mb" })
  - [ ] Handle payload too large errors
- [ ] Add rate limiting:
  - [ ] Install express-rate-limit
  - [ ] Configure 100 requests per minute per source
  - [ ] Return 429 when limit exceeded

### Error Handling
- [ ] Implement error handler middleware:
  - [ ] Catch all route errors
  - [ ] Log to Application Insights
  - [ ] Format error response
  - [ ] Don't leak sensitive info
- [ ] Map error types to status codes:
  - [ ] VALIDATION_ERROR → 400
  - [ ] UNAUTHORIZED → 401
  - [ ] FORBIDDEN → 403
  - [ ] PAYLOAD_TOO_LARGE → 413
  - [ ] INTERNAL_ERROR → 500

### Register Route in API App
- [ ] Update `libs/api-publication/src/config.ts`:
  - [ ] Export apiRoutes = { path: path.join(__dirname, "routes") }
- [ ] Update `apps/api/src/app.ts`:
  - [ ] Import apiRoutes from @hmcts/api-publication/config
  - [ ] Add to createSimpleRouter mount points
  - [ ] Ensure OAuth middleware initialized before routes
- [ ] Update `apps/api/package.json`:
  - [ ] Add "@hmcts/api-publication": "workspace:*"
  - [ ] Add "@hmcts/api-auth": "workspace:*"

### Testing
- [ ] Write route integration tests:
  - [ ] Test GET returns documentation
  - [ ] Test POST requires authentication (401)
  - [ ] Test POST requires role (403)
  - [ ] Test POST with valid payload (200)
  - [ ] Test POST with invalid payload (400)
  - [ ] Test POST with large payload (413)
  - [ ] Test rate limiting (429)
  - [ ] Mock authentication
  - [ ] Mock ingestion service

---

## Phase 7: Integration & Testing

### Unit Test Coverage
- [ ] Run coverage report: `yarn test:coverage`
- [ ] Ensure >80% coverage for:
  - [ ] libs/api-auth
  - [ ] libs/api-publication
  - [ ] Updated libs/publication queries
- [ ] Fix any gaps in test coverage
- [ ] Add tests for edge cases
- [ ] Add tests for error scenarios

### Integration Tests
- [ ] Create `libs/api-publication/src/routes/v1/publication.test.ts`:
  - [ ] Test complete ingestion flow
  - [ ] Test with valid OAuth token
  - [ ] Test authentication failures
  - [ ] Test authorization failures
  - [ ] Test validation failures
  - [ ] Test location not found (noMatch=true)
  - [ ] Test blob storage integration
  - [ ] Test audit log creation
  - [ ] Use supertest for HTTP testing
  - [ ] Mock external dependencies

### E2E Tests
- [ ] Create `e2e-tests/tests/api-publication.spec.ts`:
  - [ ] Test TS1: Valid blob ingestion
  - [ ] Test TS2: Invalid schema
  - [ ] Test TS3: Unknown court (no_match scenario)
  - [ ] Test TS4: Missing required field
  - [ ] Test TS5: Provenance mismatch
  - [ ] Test TS6: Logging verification
  - [ ] Test TS8: Large blob (>10MB)
  - [ ] Test TS9: API security (invalid/missing token)
- [ ] Create helper to obtain OAuth token for tests
- [ ] Use Playwright's request API
- [ ] Verify database state after operations
- [ ] Verify audit logs created

### Performance Testing
- [ ] Create performance test script:
  - [ ] Send concurrent requests
  - [ ] Measure response times (P50, P95, P99)
  - [ ] Measure throughput (requests per minute)
  - [ ] Target: <500ms response time
  - [ ] Target: ≥1000 requests per minute
- [ ] Identify bottlenecks
- [ ] Optimize slow queries
- [ ] Optimize validation logic if needed

### Security Testing
- [ ] Test token validation:
  - [ ] Test with expired token (should reject)
  - [ ] Test with invalid signature (should reject)
  - [ ] Test with wrong audience (should reject)
  - [ ] Test with missing role (should reject)
- [ ] Test input sanitization:
  - [ ] Test SQL injection attempts (should be blocked by Prisma)
  - [ ] Test XSS attempts in JSON content
  - [ ] Test oversized payloads
- [ ] Test rate limiting:
  - [ ] Verify 429 after threshold
  - [ ] Verify different sources have separate limits
- [ ] Run security scanner on code

---

## Phase 8: Documentation & Monitoring

### API Documentation
- [ ] Create `docs/api/publication-endpoint.md`:
  - [ ] Document endpoint URL
  - [ ] Document authentication requirements
  - [ ] Document request schema with examples
  - [ ] Document response schema with examples
  - [ ] Document all error codes
  - [ ] Document rate limits
  - [ ] Include curl examples
  - [ ] Include Postman collection
- [ ] Create OpenAPI/Swagger spec (optional):
  - [ ] Define schemas
  - [ ] Define security requirements
  - [ ] Define responses

### Integration Guide
- [ ] Create `docs/integration/source-system-guide.md`:
  - [ ] Overview of integration
  - [ ] Prerequisites (Azure AD app registration)
  - [ ] How to obtain OAuth credentials
  - [ ] How to request access token
  - [ ] How to call the API
  - [ ] Code examples (curl, Node.js, Python)
  - [ ] Testing checklist
  - [ ] Troubleshooting common issues
  - [ ] FAQ section
  - [ ] Contact information for support

### Monitoring Setup
- [ ] Configure Application Insights:
  - [ ] Add custom metric tracking in ingestion service
  - [ ] Track request rate by source system
  - [ ] Track success/failure rate
  - [ ] Track response times
  - [ ] Track noMatch occurrences
- [ ] Create monitoring dashboard:
  - [ ] Request rate chart
  - [ ] Success rate chart
  - [ ] Response time chart (P50, P95, P99)
  - [ ] Error rate chart by type
  - [ ] noMatch incidents chart
- [ ] Configure alerts:
  - [ ] Alert on error rate >10 in 5 minutes
  - [ ] Alert on noMatch incidents
  - [ ] Alert on response time >1 second
  - [ ] Alert on availability <99%

### Code Documentation
- [ ] Add JSDoc comments to all public functions:
  - [ ] Document parameters
  - [ ] Document return values
  - [ ] Document error conditions
  - [ ] Add usage examples
- [ ] Add inline comments for complex logic
- [ ] Create architecture diagram (update specification.md)
- [ ] Update CLAUDE.md:
  - [ ] Document API authentication pattern
  - [ ] Document audit logging pattern
  - [ ] Add examples for future API endpoints

### Update Project Documentation
- [ ] Update README.md:
  - [ ] Add API endpoint to services table
  - [ ] Document new environment variables
  - [ ] Update development setup instructions
- [ ] Update CHANGELOG:
  - [ ] Document new feature
  - [ ] List all changes
- [ ] Create runbook:
  - [ ] Common operational tasks
  - [ ] Troubleshooting procedures
  - [ ] Emergency contacts

---

## Phase 9: Deployment Preparation

### Environment Configuration
- [ ] Add OAuth secrets to Azure Key Vault:
  - [ ] Demo environment (pip-ss-kv-demo)
  - [ ] Test environment (pip-ss-kv-test)
  - [ ] Staging environment (pip-ss-kv-stg)
  - [ ] Production environment (pip-ss-kv-prod)
- [ ] Update Helm charts:
  - [ ] Add Key Vault secret mappings in values.yaml
  - [ ] Configure rate limiting per environment
  - [ ] Set resource limits (CPU, memory)
- [ ] Configure Application Insights per environment
- [ ] Verify database migrations:
  - [ ] Test in demo
  - [ ] Test in test
  - [ ] Test in staging
  - [ ] Prepare for production

### Feature Flag Setup
- [ ] Add feature flag for API endpoint:
  - [ ] Use environment variable: ENABLE_PUBLICATION_API
  - [ ] Default to false
  - [ ] Check flag before registering route
- [ ] Test feature flag:
  - [ ] Verify endpoint disabled when flag is false
  - [ ] Verify endpoint enabled when flag is true
  - [ ] Test toggling without restart

### Rollback Plan
- [ ] Document rollback procedure:
  - [ ] Step 1: Disable feature flag
  - [ ] Step 2: Verify endpoint no longer accessible
  - [ ] Step 3: Redeploy previous version if needed
  - [ ] Step 4: Rollback database migration if needed
- [ ] Test rollback in demo environment
- [ ] Create rollback script (if applicable)
- [ ] Identify rollback decision criteria

### Pre-Deployment Checklist
- [ ] All unit tests passing: `yarn test`
- [ ] All integration tests passing
- [ ] All E2E tests passing: `yarn test:e2e`
- [ ] Code coverage ≥80%
- [ ] No TypeScript errors: `yarn build`
- [ ] No linting errors: `yarn lint:fix`
- [ ] Security scan passed
- [ ] Code review completed
- [ ] Documentation complete
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Feature flag ready
- [ ] Rollback plan documented
- [ ] Team notified

### Deployment Steps
- [ ] Deploy to demo environment:
  - [ ] Run database migrations
  - [ ] Deploy application
  - [ ] Enable feature flag
  - [ ] Run smoke tests
  - [ ] Verify monitoring
- [ ] Deploy to test environment:
  - [ ] Run database migrations
  - [ ] Deploy application
  - [ ] Enable feature flag
  - [ ] Run full test suite
  - [ ] Pilot with one source system
- [ ] Deploy to staging environment:
  - [ ] Run database migrations
  - [ ] Deploy application
  - [ ] Enable feature flag
  - [ ] Performance testing
  - [ ] Security testing
- [ ] Deploy to production:
  - [ ] Schedule deployment window
  - [ ] Run database migrations
  - [ ] Deploy application (flag off)
  - [ ] Verify deployment successful
  - [ ] Enable feature flag for one source system
  - [ ] Monitor for 24 hours
  - [ ] Enable for all source systems
  - [ ] Remove feature flag after 1 week

---

## Post-Deployment Tasks

### Monitoring & Support (Week 1)
- [ ] Monitor error rates hourly
- [ ] Review all failed ingestion attempts
- [ ] Verify alerting is working correctly
- [ ] Check performance metrics meet targets
- [ ] Respond to any incidents within SLA
- [ ] Collect feedback from source systems

### Source System Onboarding
- [ ] Schedule onboarding calls with each source system:
  - [ ] XHIBIT team
  - [ ] LIBRA team
  - [ ] SJP team
- [ ] Walk through integration guide
- [ ] Assist with OAuth app registration
- [ ] Provide test credentials for test environment
- [ ] Conduct integration testing with each system
- [ ] Monitor initial production traffic

### Optimization (Week 2-4)
- [ ] Analyze slow queries in audit logs
- [ ] Optimize validation logic if needed
- [ ] Tune rate limiting based on actual usage
- [ ] Review and optimize audit log retention
- [ ] Optimize blob storage TTL if needed
- [ ] Address any performance issues

### Documentation Updates
- [ ] Update docs based on feedback
- [ ] Add FAQ entries for common questions
- [ ] Create troubleshooting guide for common issues
- [ ] Document lessons learned
- [ ] Share knowledge with team

---

## Success Criteria

### Functional
- [x] API endpoint accepts and processes valid JSON blobs
- [x] OAuth authentication validates tokens correctly
- [x] App role authorization works (api.publisher.user)
- [x] All validation rules implemented and working
- [x] Location not found correctly sets noMatch=true
- [x] Artefacts created with all required fields
- [x] Audit logging captures all ingestion attempts
- [x] Error handling covers all scenarios

### Non-Functional
- [ ] Response time <500ms for 95% of requests
- [ ] Throughput ≥1000 requests per minute
- [ ] >80% code coverage on all modules
- [ ] All E2E tests passing
- [ ] Zero critical security vulnerabilities
- [ ] Zero high-priority bugs in production

### Operational
- [ ] Monitoring dashboard showing key metrics
- [ ] Alerts configured and tested
- [ ] Audit log cleanup job running daily
- [ ] Rollback procedure tested and documented
- [ ] Integration guide published and shared
- [ ] Source systems successfully onboarded

---

## Notes

### Dependencies
- Requires `passport-azure-ad` for OAuth bearer token strategy
- Reuses existing validation logic from `@hmcts/list-types-common`
- Reuses existing artefact creation from `@hmcts/publication`
- Reuses existing location lookup from `@hmcts/location`

### Key Decisions
- Use OAuth 2.0 Client Credentials Flow (machine-to-machine)
- Store blob content in Redis (same as manual upload)
- Audit log retention: 90 days minimum
- Maximum payload size: 10MB
- Rate limit: 100 requests per minute per source system
- Response time target: <500ms
- Throughput target: ≥1000 requests per minute

### Open Questions (To Be Resolved)
- [ ] Confirm retry mechanism (manual vs automated after location added)
- [ ] Confirm notification mechanism for noMatch incidents
- [ ] Confirm schema versioning strategy
- [ ] Confirm cleanup job schedule for audit logs
- [ ] Confirm if batch ingestion support needed in future
