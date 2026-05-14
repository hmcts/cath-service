# Implementation Tasks - PDDA/HTML Upload (Issue #334)

## Database Migration

- [x] Create Prisma migration file for artefact type column
  - [x] Add `type` column to artefact table (VARCHAR 50)
  - [x] Backfill existing records with 'LIST' value
  - [x] Set column to NOT NULL
  - [x] Add index on type column
- [x] Update Prisma schema in `apps/postgres/prisma/schema.prisma`
  - [x] Add `type String` field to Artefact model
  - [x] Add `@@index([type])` directive
- [ ] Run migration with `yarn db:migrate:dev` (SKIPPED - no database running in dev env)
- [ ] Verify migration applied successfully (SKIPPED - no database running in dev env)

## Module Setup

- [x] Create new library module `libs/pdda-html-upload/`
- [x] Create `package.json` with dependencies
  - [x] Add `@aws-sdk/client-s3@3.712.0`
  - [x] Add `multer@1.4.5-lts.1`
  - [x] Add peer dependency `express@^5.2.0`
  - [x] Add dev dependencies (@types/express, @types/multer, typescript, vitest)
  - [x] Configure exports for `.` and `./config` paths
- [x] Create `tsconfig.json` extending root config
- [x] Add module to root `tsconfig.json` paths as `@hmcts/pdda-html-upload`
- [x] Create directory structure:
  - [x] `src/routes/v1/`
  - [x] `src/validation/`
  - [x] `src/s3/`

## Core Implementation

- [x] Create `src/types.ts` with TypeScript interfaces
  - [x] FileValidationResult interface
  - [x] S3UploadResult interface
  - [x] PddaHtmlUploadRequest interface
  - [x] PddaHtmlUploadResponse interface
- [x] Create `src/validation/file-validation.ts`
  - [x] Implement `validatePddaHtmlUpload()` function
  - [x] Validate artefact_type === "LCSU"
  - [x] Validate file extension (.htm, .html case-insensitive)
  - [x] Validate file size (configurable max)
  - [x] Validate filename security (no path traversal)
  - [x] Validate file not empty
- [x] Create `src/s3/s3-client.ts`
  - [x] Implement `createS3Client()` factory function
  - [x] Read AWS config from environment variables
  - [x] Throw error if required config missing
- [x] Create `src/s3/s3-upload-service.ts`
  - [x] Implement `uploadHtmlToS3()` function
  - [x] Generate S3 key with date-based path and UUID
  - [x] Use PutObjectCommand to upload file
  - [x] Use HeadObjectCommand to verify upload
  - [x] Add metadata (originalFilename, correlationId, uploadTimestamp)
  - [x] Error handling with descriptive messages
- [x] Create `src/routes/v1/pdda-html.ts`
  - [x] Import and reuse `authenticateApi()` middleware
  - [x] Configure multer for in-memory storage
  - [x] Implement POST handler array with middleware chain
  - [x] Validate request using file-validation
  - [x] Upload to S3 using s3-upload-service
  - [x] Log audit events (success and failure)
  - [x] Return appropriate HTTP status codes
- [x] Create `src/config.ts`
  - [x] Export `apiRoutes` with path to routes directory
- [x] Create `src/index.ts`
  - [x] Empty for now (business logic exports if needed later)

## Integration

- [x] Update `apps/api/src/app.ts`
  - [x] Import `apiRoutes` from `@hmcts/pdda-html-upload/config`
  - [x] Add to routeMounts array
- [x] Install dependencies at root level
  - [x] Run `yarn install` to add new packages

## Unit Tests

- [x] Create `src/validation/file-validation.test.ts`
  - [x] Test valid HTML file with LCSU passes
  - [x] Test valid HTM file with LCSU passes
  - [x] Test invalid extension rejected
  - [x] Test invalid artefact_type rejected
  - [x] Test empty file rejected
  - [x] Test oversized file rejected
  - [x] Test path traversal in filename rejected
- [x] Create `src/s3/s3-client.test.ts`
  - [x] Test client creation with valid config
  - [x] Test error when config missing
- [x] Create `src/s3/s3-upload-service.test.ts`
  - [x] Mock S3Client methods
  - [x] Test S3 key generation format
  - [x] Test successful upload returns correct result
  - [x] Test upload error handling
  - [x] Test verification step
- [x] Create `src/routes/v1/pdda-html.test.ts`
  - [x] Mock authenticateApi middleware
  - [x] Mock multer file upload
  - [x] Mock S3 upload service
  - [x] Test successful upload returns 201
  - [x] Test validation errors return 400
  - [x] Test S3 errors return 500
  - [x] Test correlation ID passthrough
- [x] Run all unit tests with `yarn test`

## E2E Tests

- [ ] Create `e2e-tests/tests/pdda-html-upload.spec.ts` (SKIPPED - requires AWS S3 credentials)
  - [ ] Test complete upload journey with valid HTML file
  - [ ] Test file validation errors
  - [ ] Test authentication requirement
  - [ ] Test S3 verification (verify uploaded file exists)
  - [ ] Tag with `@nightly` for nightly test runs
- [ ] Run E2E tests with `yarn test:e2e:all` (SKIPPED - requires AWS S3 credentials)

## Environment Configuration

- [x] Document new environment variables in comments/README (documented in plan.md)
  - [x] `AWS_S3_XHIBIT_BUCKET_NAME`
  - [x] `AWS_S3_XHIBIT_REGION`
  - [x] `AWS_S3_XHIBIT_PREFIX` (default: "pdda-html/")
  - [x] `AWS_ACCESS_KEY_ID`
  - [x] `AWS_SECRET_ACCESS_KEY`
  - [x] `PDDA_HTML_MAX_FILE_SIZE` (default: 10485760)
- [ ] Configure Azure Key Vault secrets (deployment task)
  - [ ] Add `xhibit-s3-access-key` secret
  - [ ] Add `xhibit-s3-access-key-secret` secret
- [ ] Add environment variables to deployment configuration (deployment task)

## Quality & Documentation

- [x] Run `yarn lint:fix` to fix any linting issues
- [x] Run `yarn format` to format code
- [x] Verify all tests pass (`yarn test`)
- [x] Verify TypeScript compiles without errors (`yarn build`)
- [x] Add inline code comments for complex logic
- [x] Update CLAUDE.md if new patterns introduced (not needed - follows existing patterns)

## Manual Testing

- [ ] Start local development environment (SKIPPED - requires AWS credentials and database)
- [ ] Upload valid .html file with LCSU artefact type (SKIPPED - requires AWS credentials)
- [ ] Upload valid .htm file with LCSU artefact type (SKIPPED - requires AWS credentials)
- [ ] Verify files appear in S3 bucket with correct keys (SKIPPED - requires AWS credentials)
- [ ] Test validation errors (wrong extension, missing artefact_type) (SKIPPED - requires AWS credentials)
- [ ] Test authentication failure (no token) (SKIPPED - requires AWS credentials)
- [ ] Verify correlation ID in response matches request header (SKIPPED - requires AWS credentials)
- [ ] Verify logs contain expected audit information (SKIPPED - requires AWS credentials)
- [ ] Verify logs do NOT contain file content or AWS credentials (SKIPPED - requires AWS credentials)

## Deployment Preparation

- [ ] Review and resolve all "CLARIFICATIONS NEEDED" from plan.md (DEPLOYMENT TASK)
- [ ] Create deployment checklist for operations team (DEPLOYMENT TASK)
- [ ] Verify S3 bucket exists and credentials have correct permissions (DEPLOYMENT TASK)
- [ ] Document rollback procedure (DEPLOYMENT TASK)
- [ ] Set up monitoring/alerting for new endpoint (DEPLOYMENT TASK)
