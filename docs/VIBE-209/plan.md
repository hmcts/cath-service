# VIBE-209: Blob Ingestion API - Implementation Plan

## Overview

This plan outlines the step-by-step implementation of the publication ingestion API endpoint with OAuth authentication, validation, and audit logging capabilities.

## Implementation Phases

### Phase 1: Database Schema & Models (2 days)

**Objective:** Establish data layer foundation

#### 1.1 Update Artefact Table Schema
- [ ] Add `noMatch` column to Prisma schema in `apps/postgres/prisma/schema.prisma`
- [ ] Create migration: `yarn db:migrate:dev --name add-no-match-column`
- [ ] Update `libs/publication/src/repository/model.ts` to include noMatch field
- [ ] Update `libs/publication/src/repository/queries.ts` to handle noMatch in createArtefact

#### 1.2 Create Audit Log Table
- [ ] Add `PublicationAuditLog` model to Prisma schema
- [ ] Create migration: `yarn db:migrate:dev --name add-publication-audit-log`
- [ ] Generate Prisma client: `yarn db:generate`
- [ ] Verify schema in Prisma Studio: `yarn db:studio`

#### 1.3 Create TypeScript Interfaces
- [ ] Create `libs/api-publication/src/models.ts` with interfaces:
  - `PublicationRequest`
  - `PublicationResponse`
  - `IngestionResult`
  - `AuditLogEntry`

**Deliverables:**
- Updated Prisma schema with migrations
- TypeScript type definitions
- Database tables created and verified

**Testing:**
- Run migrations in test environment
- Verify schema structure
- Test rollback procedure

---

### Phase 2: OAuth Authentication Infrastructure (3 days)

**Objective:** Implement OAuth 2.0 bearer token authentication with app role validation

#### 2.1 Create API Auth Module
- [ ] Create new module: `libs/api-auth/`
- [ ] Set up package.json with dependencies:
  - `passport`
  - `passport-azure-ad`
  - `@types/passport`
- [ ] Create `libs/api-auth/tsconfig.json`
- [ ] Register module in root `tsconfig.json` paths

#### 2.2 Implement Bearer Strategy
- [ ] Create `libs/api-auth/src/bearer-strategy.ts`
- [ ] Configure OAuth identity metadata from environment variables
- [ ] Implement token validation logic
- [ ] Extract and validate app roles from token claims
- [ ] Handle token verification errors

#### 2.3 Create Authorization Middleware
- [ ] Create `libs/api-auth/src/require-api-role.ts`
- [ ] Implement role-based access control
- [ ] Add proper error responses (401, 403)
- [ ] Export middleware for use in routes

#### 2.4 Environment Configuration
- [ ] Add OAuth config variables to Azure Key Vault:
  - `api-oauth-identity-metadata`
  - `api-oauth-client-id`
  - `api-oauth-issuer`
  - `api-oauth-audience`
- [ ] Update `apps/api/config/custom-environment-variables.json`
- [ ] Update `apps/api/.env.example` with OAuth variables
- [ ] Document OAuth setup in README

#### 2.5 Configure Passport in API App
- [ ] Update `apps/api/src/app.ts` to initialize passport
- [ ] Register bearer strategy
- [ ] Add passport middleware to Express app
- [ ] Verify passport is initialized before routes

**Deliverables:**
- Functional OAuth authentication module
- Bearer token validation
- Role-based authorization middleware
- Environment configuration

**Testing:**
- Unit tests for bearer strategy
- Unit tests for authorization middleware
- Mock token generation for testing
- Integration tests with valid/invalid tokens

---

### Phase 3: Validation Logic (2 days)

**Objective:** Implement comprehensive request validation

#### 3.1 Business Rules Validation
- [ ] Create `libs/api-publication/src/validation/business-rules.ts`
- [ ] Implement `validateBusinessRules()` function
- [ ] Validate required fields
- [ ] Validate provenance values (XHIBIT, LIBRA, SJP)
- [ ] Validate language values (ENGLISH, WELSH)
- [ ] Validate sensitivity values (PUBLIC, PRIVATE, CLASSIFIED)
- [ ] Validate date formats and ranges
- [ ] Validate display window logic

#### 3.2 Schema Validation Integration
- [ ] Create `libs/api-publication/src/validation/schema-validator.ts`
- [ ] Integrate with `@hmcts/list-types-common`
- [ ] Implement `validatePublicationSchema()` function
- [ ] Handle schema validation errors gracefully
- [ ] Map validation errors to user-friendly messages

#### 3.3 Location Validation
- [ ] Create `libs/api-publication/src/validation/location-validator.ts`
- [ ] Integrate with `@hmcts/location` service
- [ ] Implement `validateLocation()` function
- [ ] Return location existence status
- [ ] Handle invalid location IDs

**Deliverables:**
- Complete validation module
- Integration with existing validation services
- Comprehensive error messages

**Testing:**
- Unit tests for business rules (all scenarios)
- Unit tests for schema validation
- Unit tests for location validation
- Test invalid inputs and edge cases

---

### Phase 4: Core Ingestion Service (3 days)

**Objective:** Implement main publication ingestion logic

#### 4.1 Create Module Structure
- [ ] Create `libs/api-publication/` directory structure
- [ ] Create `package.json` with dependencies
- [ ] Create `tsconfig.json` extending root config
- [ ] Create `src/config.ts` for module configuration
- [ ] Create `src/index.ts` for exports

#### 4.2 Implement Ingestion Service
- [ ] Create `libs/api-publication/src/ingestion/service.ts`
- [ ] Implement `ingestPublication()` function
- [ ] Orchestrate validation steps
- [ ] Handle location not found (set noMatch=true)
- [ ] Integrate with existing `createArtefact()` from `@hmcts/publication`
- [ ] Implement error handling and rollback

#### 4.3 Blob Storage
- [ ] Create `libs/api-publication/src/ingestion/blob-storage.ts`
- [ ] Implement `storePublicationBlob()` function
- [ ] Store blob content in Redis (reuse pattern from manual upload)
- [ ] Generate unique blob storage key
- [ ] Set appropriate TTL for blob data

#### 4.4 Response Formatting
- [ ] Create `libs/api-publication/src/ingestion/response-formatter.ts`
- [ ] Format success responses
- [ ] Format error responses
- [ ] Include appropriate status codes
- [ ] Include detailed error information for debugging

**Deliverables:**
- Complete ingestion service implementation
- Blob storage integration
- Standardized response format

**Testing:**
- Unit tests for ingestion service
- Mock all external dependencies
- Test success scenarios
- Test all error scenarios
- Test noMatch flag logic

---

### Phase 5: Audit Logging (2 days)

**Objective:** Implement comprehensive audit logging

#### 5.1 Audit Logging Service
- [ ] Create `libs/api-publication/src/audit/logging.ts`
- [ ] Implement `logAuditEvent()` function
- [ ] Store audit logs in database
- [ ] Include all required fields (timestamp, source, status, etc.)
- [ ] Handle logging failures gracefully (don't block ingestion)

#### 5.2 Audit Queries
- [ ] Create `libs/api-publication/src/audit/queries.ts`
- [ ] Implement `getAuditLogsBySourceSystem()`
- [ ] Implement `getFailedIngestions()`
- [ ] Implement `getAuditLogByArtefactId()`
- [ ] Add pagination support

#### 5.3 Alerting Logic
- [ ] Create `libs/api-publication/src/audit/alerting.ts`
- [ ] Implement `checkErrorThreshold()` function
- [ ] Implement `alertOnNoMatch()` function
- [ ] Integrate with Application Insights for alerts
- [ ] Configure alert thresholds

#### 5.4 Cleanup Job
- [ ] Create `apps/crons/src/jobs/cleanup-audit-logs.ts`
- [ ] Implement 90-day retention policy
- [ ] Schedule daily cleanup job
- [ ] Add monitoring for cleanup job

**Deliverables:**
- Complete audit logging system
- Query functions for audit data
- Alerting on error thresholds
- Automated cleanup job

**Testing:**
- Unit tests for audit logging
- Test all audit scenarios
- Test query functions
- Test alerting thresholds
- Test cleanup job

---

### Phase 6: API Route Implementation (2 days)

**Objective:** Create RESTful API endpoint

#### 6.1 Create API Route
- [ ] Create `libs/api-publication/src/routes/v1/publication.ts`
- [ ] Implement GET handler (return endpoint documentation)
- [ ] Implement POST handler
- [ ] Apply authentication middleware (`requireApiRole("api.publisher.user")`)
- [ ] Apply rate limiting middleware
- [ ] Add request size limit (10MB)

#### 6.2 Request Processing
- [ ] Parse and validate request body
- [ ] Extract source system from OAuth token (appid claim)
- [ ] Call ingestion service
- [ ] Log audit event
- [ ] Format and return response

#### 6.3 Error Handling
- [ ] Implement try-catch wrapper
- [ ] Handle validation errors (400)
- [ ] Handle authentication errors (401)
- [ ] Handle authorization errors (403)
- [ ] Handle payload too large errors (413)
- [ ] Handle system errors (500)
- [ ] Return appropriate error responses

#### 6.4 Register Route in API App
- [ ] Update `libs/api-publication/src/config.ts` to export route path
- [ ] Update `apps/api/src/app.ts` to import and mount routes
- [ ] Update `apps/api/package.json` to include dependency
- [ ] Verify route registration with tests

**Deliverables:**
- Functional API endpoint
- Complete error handling
- Route registered in API app

**Testing:**
- Integration tests for route handlers
- Test all HTTP methods
- Test all response codes
- Test authentication/authorization
- Test rate limiting

---

### Phase 7: Integration & Testing (3 days)

**Objective:** Comprehensive testing and integration verification

#### 7.1 Unit Test Coverage
- [ ] Achieve >80% code coverage for all modules
- [ ] Test all validation functions
- [ ] Test ingestion service
- [ ] Test audit logging
- [ ] Test authentication/authorization
- [ ] Mock all external dependencies

#### 7.2 Integration Tests
- [ ] Test complete ingestion flow
- [ ] Test with valid OAuth tokens
- [ ] Test authentication failures
- [ ] Test authorization failures
- [ ] Test validation failures
- [ ] Test location not found scenario
- [ ] Test blob storage integration
- [ ] Test audit log creation

#### 7.3 E2E Tests
- [ ] Create E2E test suite in `e2e-tests/tests/api-publication.spec.ts`
- [ ] Test TS1: Valid blob ingestion
- [ ] Test TS2: Invalid schema
- [ ] Test TS3: Unknown court (no_match)
- [ ] Test TS4: Missing required field
- [ ] Test TS5: Provenance mismatch
- [ ] Test TS6: Logging verification
- [ ] Test TS8: Large blob
- [ ] Test TS9: API security

#### 7.4 Performance Testing
- [ ] Test response time (<500ms target)
- [ ] Test throughput (1000 req/min target)
- [ ] Test with concurrent requests
- [ ] Identify and fix bottlenecks

#### 7.5 Security Testing
- [ ] Verify token validation
- [ ] Test with expired tokens
- [ ] Test with invalid signatures
- [ ] Test role-based access
- [ ] Verify input sanitization
- [ ] Test rate limiting

**Deliverables:**
- Comprehensive test suite
- >80% code coverage
- Passing E2E tests
- Performance benchmarks
- Security verification

**Testing:**
- Run full test suite: `yarn test`
- Run E2E tests: `yarn test:e2e`
- Run coverage report: `yarn test:coverage`
- Manual testing with Postman/curl

---

### Phase 8: Documentation & Monitoring (2 days)

**Objective:** Complete documentation and monitoring setup

#### 8.1 API Documentation
- [ ] Create OpenAPI/Swagger specification
- [ ] Document authentication requirements
- [ ] Document request/response schemas
- [ ] Document error codes and meanings
- [ ] Include example requests/responses
- [ ] Document rate limits

#### 8.2 Integration Guide
- [ ] Create integration guide for source systems
- [ ] Document OAuth app registration steps
- [ ] Document how to obtain access tokens
- [ ] Provide code examples in multiple languages
- [ ] Document testing procedures
- [ ] Create troubleshooting guide

#### 8.3 Monitoring Setup
- [ ] Configure Application Insights metrics
- [ ] Set up custom metric tracking
- [ ] Create monitoring dashboard
- [ ] Configure alerts for error thresholds
- [ ] Configure alerts for no_match incidents
- [ ] Document monitoring procedures

#### 8.4 Code Documentation
- [ ] Add JSDoc comments to all public functions
- [ ] Document complex business logic
- [ ] Add inline comments for clarity
- [ ] Create architecture diagrams
- [ ] Update CLAUDE.md with new patterns

#### 8.5 Update README
- [ ] Add API endpoint documentation
- [ ] Document environment variables
- [ ] Add setup instructions
- [ ] Document testing procedures

**Deliverables:**
- Complete API documentation
- Integration guide for source systems
- Monitoring dashboard
- Alert configuration
- Updated project documentation

---

### Phase 9: Deployment Preparation (1 day)

**Objective:** Prepare for production deployment

#### 9.1 Environment Configuration
- [ ] Add OAuth secrets to Key Vault (demo, test, stg, prod)
- [ ] Update Helm values for each environment
- [ ] Configure rate limiting per environment
- [ ] Set up monitoring in each environment
- [ ] Verify database migrations work

#### 9.2 Feature Flag Setup
- [ ] Add feature flag for API endpoint
- [ ] Deploy behind feature flag initially
- [ ] Test feature flag toggle
- [ ] Document feature flag usage

#### 9.3 Rollback Plan
- [ ] Document rollback procedure
- [ ] Test database rollback
- [ ] Verify system works with feature flag off
- [ ] Create rollback checklist

#### 9.4 Deployment Checklist
- [ ] Verify all tests pass
- [ ] Verify code coverage meets standards
- [ ] Run security scan
- [ ] Review code with team
- [ ] Update CHANGELOG
- [ ] Tag release version

**Deliverables:**
- Production-ready configuration
- Feature flag implementation
- Rollback plan
- Deployment checklist

---

## Dependencies & Prerequisites

### External Dependencies
- Azure AD app registration with `api.publisher.user` role
- Source systems configured with OAuth credentials
- Database migrations applied
- Redis instance available
- Application Insights configured

### Internal Dependencies
- `@hmcts/publication` - Artefact creation logic
- `@hmcts/location` - Location validation
- `@hmcts/list-types-common` - Schema validation
- `@hmcts/postgres` - Database access
- `@hmcts/redis` - Blob storage

### Development Tools
- Node.js 22+
- Yarn 4+
- PostgreSQL 14+
- Redis 6+
- Docker (for local services)

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| OAuth token validation performance | Medium | Low | Cache Azure AD public keys |
| Database performance with audit logs | High | Medium | Implement partitioning, add indexes |
| Large blob ingestion impacts performance | Medium | Medium | Enforce 10MB limit, consider async processing |
| Schema validation failures on valid data | High | Low | Extensive testing with real data |
| Redis unavailable affects blob storage | High | Low | Implement fallback storage mechanism |

### Business Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Source systems send invalid data | Medium | High | Comprehensive validation and clear error messages |
| Location master data incomplete | Medium | Medium | no_match flag allows ingestion, alerts admins |
| High volume ingestion impacts other services | High | Low | Rate limiting, separate API instances |
| Audit logs grow too large | Medium | High | Automated cleanup job, partitioning |

---

## Success Criteria

### Functional Requirements
- [x] API endpoint accepts valid JSON blobs
- [x] OAuth authentication with app role validation works
- [x] All validation rules implemented and tested
- [x] Location not found sets no_match=true
- [x] Audit logging captures all ingestion attempts
- [x] Error handling covers all scenarios

### Non-Functional Requirements
- [ ] Response time <500ms for valid requests
- [ ] Throughput ≥1000 requests per minute
- [ ] >80% code coverage
- [ ] All E2E tests passing
- [ ] Zero critical security vulnerabilities
- [ ] Complete API documentation

### Operational Requirements
- [ ] Monitoring dashboard configured
- [ ] Alerts set up for error thresholds
- [ ] Audit log cleanup job running
- [ ] Rollback procedure tested
- [ ] Integration guide published

---

## Timeline Summary

| Phase | Duration | Dependencies | Deliverables |
|-------|----------|--------------|-------------|
| 1. Database Schema | 2 days | None | Updated schema, migrations |
| 2. OAuth Auth | 3 days | Phase 1 | Auth module, middleware |
| 3. Validation | 2 days | Phase 1 | Validation functions |
| 4. Ingestion Service | 3 days | Phase 1, 3 | Core service logic |
| 5. Audit Logging | 2 days | Phase 1 | Logging, queries, alerts |
| 6. API Route | 2 days | Phase 2, 3, 4, 5 | API endpoint |
| 7. Testing | 3 days | Phase 6 | Test suite, coverage |
| 8. Documentation | 2 days | Phase 7 | Docs, guides |
| 9. Deployment | 1 day | Phase 8 | Production ready |

**Total Duration:** 20 working days (4 weeks)

---

## Team Allocation

### Backend Developer (Primary)
- Database schema design
- OAuth authentication implementation
- Ingestion service development
- API route implementation
- Integration testing

### DevOps Engineer
- Environment configuration
- Key Vault setup
- Deployment pipeline
- Monitoring setup

### QA Engineer
- Test case development
- E2E test implementation
- Performance testing
- Security testing

### Technical Writer
- API documentation
- Integration guide
- Operational documentation

---

## Post-Deployment Activities

### Monitoring (Week 1)
- Monitor error rates hourly
- Review all failed ingestion attempts
- Verify alerting is working
- Check performance metrics

### Optimization (Week 2-4)
- Analyze slow queries
- Optimize validation logic if needed
- Tune rate limiting
- Review and optimize audit log retention

### Source System Onboarding
- Schedule calls with each source system team
- Walk through integration guide
- Assist with OAuth setup
- Conduct integration testing
- Monitor initial production traffic

### Documentation Updates
- Update docs based on feedback
- Add FAQ section
- Create runbook for common issues
- Document lessons learned

---

## Rollout Strategy

### Phase 1: Internal Testing (Week 1)
- Deploy to demo environment
- Internal team testing
- Fix any critical issues

### Phase 2: Pilot with One Source System (Week 2)
- Enable for one source system in test environment
- Monitor closely
- Gather feedback
- Make adjustments

### Phase 3: Gradual Rollout (Week 3-4)
- Enable for all source systems in test
- Move to staging environment
- Final validation

### Phase 4: Production Launch (Week 5)
- Deploy to production with feature flag off
- Enable for one source system
- Monitor for 24 hours
- Enable for remaining source systems
- Monitor for one week

### Phase 5: Full Production (Week 6)
- Remove feature flag
- Full monitoring
- Continuous optimization
