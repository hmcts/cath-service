# Implementation Tasks - PDDA/HTML Upload (Issue #334)

## Database Migration

- [ ] Create Prisma migration file for artefact type column
  - [ ] Add `type` column to artefact table (VARCHAR 50)
  - [ ] Backfill existing records with 'LIST' value
  - [ ] Set column to NOT NULL
  - [ ] Add index on type column
- [ ] Update Prisma schema in `apps/postgres/prisma/schema.prisma`
  - [ ] Add `type String` field to Artefact model
  - [ ] Add `@@index([type])` directive
- [ ] Run migration with `yarn db:migrate:dev`
- [ ] Verify migration applied successfully

## Module Setup

- [ ] Create new library module `libs/pdda-html-upload/`
- [ ] Create `package.json` with dependencies
  - [ ] Add `@aws-sdk/client-s3@3.712.0`
  - [ ] Add `multer@1.4.5-lts.1`
  - [ ] Add peer dependency `express@^5.2.0`
  - [ ] Add dev dependencies (@types/express, @types/multer, typescript, vitest)
  - [ ] Configure exports for `.` and `./config` paths
- [ ] Create `tsconfig.json` extending root config
- [ ] Add module to root `tsconfig.json` paths as `@hmcts/pdda-html-upload`
- [ ] Create directory structure:
  - [ ] `src/routes/v1/`
  - [ ] `src/validation/`
  - [ ] `src/s3/`

## Core Implementation

- [ ] Create `src/types.ts` with TypeScript interfaces
  - [ ] FileValidationResult interface
  - [ ] S3UploadResult interface
  - [ ] PddaHtmlUploadRequest interface
  - [ ] PddaHtmlUploadResponse interface
- [ ] Create `src/validation/file-validation.ts`
  - [ ] Implement `validatePddaHtmlUpload()` function
  - [ ] Validate artefact_type === "LCSU"
  - [ ] Validate file extension (.htm, .html case-insensitive)
  - [ ] Validate file size (configurable max)
  - [ ] Validate filename security (no path traversal)
  - [ ] Validate file not empty
- [ ] Create `src/s3/s3-client.ts`
  - [ ] Implement `createS3Client()` factory function
  - [ ] Read AWS config from environment variables
  - [ ] Throw error if required config missing
- [ ] Create `src/s3/s3-upload-service.ts`
  - [ ] Implement `uploadHtmlToS3()` function
  - [ ] Generate S3 key with date-based path and UUID
  - [ ] Use PutObjectCommand to upload file
  - [ ] Use HeadObjectCommand to verify upload
  - [ ] Add metadata (originalFilename, correlationId, uploadTimestamp)
  - [ ] Error handling with descriptive messages
- [ ] Create `src/routes/v1/pdda-html.ts`
  - [ ] Import and reuse `authenticateApi()` middleware
  - [ ] Configure multer for in-memory storage
  - [ ] Implement POST handler array with middleware chain
  - [ ] Validate request using file-validation
  - [ ] Upload to S3 using s3-upload-service
  - [ ] Log audit events (success and failure)
  - [ ] Return appropriate HTTP status codes
- [ ] Create `src/config.ts`
  - [ ] Export `apiRoutes` with path to routes directory
- [ ] Create `src/index.ts`
  - [ ] Empty for now (business logic exports if needed later)

## Integration

- [ ] Update `apps/api/src/app.ts`
  - [ ] Import `apiRoutes` from `@hmcts/pdda-html-upload/config`
  - [ ] Add to routeMounts array
- [ ] Install dependencies at root level
  - [ ] Run `yarn install` to add new packages

## Unit Tests

- [ ] Create `src/validation/file-validation.test.ts`
  - [ ] Test valid HTML file with LCSU passes
  - [ ] Test valid HTM file with LCSU passes
  - [ ] Test invalid extension rejected
  - [ ] Test invalid artefact_type rejected
  - [ ] Test empty file rejected
  - [ ] Test oversized file rejected
  - [ ] Test path traversal in filename rejected
- [ ] Create `src/s3/s3-client.test.ts`
  - [ ] Test client creation with valid config
  - [ ] Test error when config missing
- [ ] Create `src/s3/s3-upload-service.test.ts`
  - [ ] Mock S3Client methods
  - [ ] Test S3 key generation format
  - [ ] Test successful upload returns correct result
  - [ ] Test upload error handling
  - [ ] Test verification step
- [ ] Create `src/routes/v1/pdda-html.test.ts`
  - [ ] Mock authenticateApi middleware
  - [ ] Mock multer file upload
  - [ ] Mock S3 upload service
  - [ ] Test successful upload returns 201
  - [ ] Test validation errors return 400
  - [ ] Test S3 errors return 500
  - [ ] Test correlation ID passthrough
- [ ] Run all unit tests with `yarn test`

## E2E Tests

- [ ] Create `e2e-tests/tests/pdda-html-upload.spec.ts`
  - [ ] Test complete upload journey with valid HTML file
  - [ ] Test file validation errors
  - [ ] Test authentication requirement
  - [ ] Test S3 verification (verify uploaded file exists)
  - [ ] Tag with `@nightly` for nightly test runs
- [ ] Run E2E tests with `yarn test:e2e:all`

## Environment Configuration

- [ ] Document new environment variables in comments/README
  - [ ] `AWS_S3_XHIBIT_BUCKET_NAME`
  - [ ] `AWS_S3_XHIBIT_REGION`
  - [ ] `AWS_S3_XHIBIT_PREFIX` (default: "pdda-html/")
  - [ ] `AWS_ACCESS_KEY_ID`
  - [ ] `AWS_SECRET_ACCESS_KEY`
  - [ ] `PDDA_HTML_MAX_FILE_SIZE` (default: 10485760)
- [ ] Configure Azure Key Vault secrets
  - [ ] Add `xhibit-s3-access-key` secret
  - [ ] Add `xhibit-s3-access-key-secret` secret
- [ ] Add environment variables to deployment configuration

## Quality & Documentation

- [ ] Run `yarn lint:fix` to fix any linting issues
- [ ] Run `yarn format` to format code
- [ ] Verify all tests pass (`yarn test`)
- [ ] Verify TypeScript compiles without errors (`yarn build`)
- [ ] Add inline code comments for complex logic
- [ ] Update CLAUDE.md if new patterns introduced (if needed)

## Manual Testing

- [ ] Start local development environment
- [ ] Upload valid .html file with LCSU artefact type
- [ ] Upload valid .htm file with LCSU artefact type
- [ ] Verify files appear in S3 bucket with correct keys
- [ ] Test validation errors (wrong extension, missing artefact_type)
- [ ] Test authentication failure (no token)
- [ ] Verify correlation ID in response matches request header
- [ ] Verify logs contain expected audit information
- [ ] Verify logs do NOT contain file content or AWS credentials

## Deployment Preparation

- [ ] Review and resolve all "CLARIFICATIONS NEEDED" from plan.md
- [ ] Create deployment checklist for operations team
- [ ] Verify S3 bucket exists and credentials have correct permissions
- [ ] Document rollback procedure
- [ ] Set up monitoring/alerting for new endpoint
