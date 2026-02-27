# #334: PDDA/HTML

**State:** OPEN
**Assignees:** alexbottenberg
**Author:** OgechiOkelu
**Labels:** tech-refinement
**Created:** 2026-02-02T16:41:24Z
**Updated:** 2026-02-11T11:25:41Z

## Description

**PROBLEM STATEMENT**
To implement the Crown lists publishing in CaTH, the PDDA functionality sends data in HTML/HTM format to the AWS S3 bucket. This ticket captures the requirements needed to implement the PDDA/HTML connection.

**AS A** Service
**I WANT** to implement the PDDA/HTML functionality in CaTH
**SO THAT** the Crown hearing lists can be published in CaTH

**TECHNIAL SPECIFICATION**

- Add a new column in artefact table named type - set the value of existing artefacts as LIST.
- Add new artefact type LCSU to be used when system receives an HTML.
- AWS S3 bucket name will be stored a environment variable.
- AWS S3 secrets xhibit-s3-access-key and xhibit-s3-access-key-secret can get from azure keyvault.


**ACCEPTANCE CRITERIA**
•	Both HTM and HTML files are to be accepted
•	When PDDA sends HTML file to CaTH, the file is to be passed through to XHIBIT Simple Storage Service (S3) on AWS; hence, the credential needed to connect and send data to the XHIBIT S3 bucket is configured and the correct residential region of the S3 bucket is specified
•	A new endpoint is created in API to push the data file (HTM/ HTML to AWS S3 bucket since the data ingestion from PDDA is not through the HMI APIM, but through the publication upload endpoint/CaTH APIM.
•	AWS S3 SDK should be set up in API to communicate with S3
•	A new value LCSU is added to the ArtefactType which is to be used by PDDA when sending html to PIP APIM
•	Functional test is added to the API to upload the html file
•	Functional test is added to upload the html/htm file to file to S3 bucket and check the uploaded file exists in the S3 bucket

**Specifications:**
**Form fields**
•	Artefact type
o	Input type: text (enum)
o	Required: Yes
o	Validation:
	Must equal "LCSU" for this PDDA HTM/HTML publishing flow.
	Reject any other value for this endpoint (or route non-LCSU artefact types to existing handling, if applicable — see open clarification).
•	File
o	Input type: file (binary)
o	Required: Yes
o	Validation:
	File extension must be ".htm" or ".html" (case-insensitive).
	File content type must be accepted for HTM/HTML (exact allowed MIME types to confirm; validate if provided, but do not rely solely on MIME type).
	File must not be empty.
	Maximum file size: **TBD (required input).**
•	Filename
o	Input type: text (derived from upload metadata)
o	Required: Yes
o	Validation:
	Must end with ".htm" or ".html" (case-insensitive).
	Must not include path traversal characters/sequences (e.g., "../", "..\").
	Maximum length: **TBD (required input).**
•	S3 destination key (object key)
o	Input type: text (system-generated)
o	Required: Yes (generated)
o	Validation:
	Must map deterministically to an agreed S3 prefix/path for XHIBIT uploads.
	Must be unique enough to avoid overwriting unless overwrites are explicitly required (**TBD**).
•	AWS region
o	Input type: config value
o	Required: Yes
o	Validation:
	Must match the residential region of the target XHIBIT S3 bucket.
•	AWS credentials
o	Input type: secret/config value
o	Required: Yes
o	Validation:
	Must be valid for PutObject (and HeadObject/List if used by verification) against the target bucket/prefix.
•	Correlation / request ID
o	Input type: header (text)
o	Required: No (but recommended)
o	Validation:
	If present, must be a non-empty string; max length **TBD.**
________________________________________
**Content**
•	EN: Title/H1 "PDDA HTM/HTML upload to XHIBIT S3"
•	CY: Title/H1 "Welsh placeholder"
•	EN: Body text — "Accept HTM/HTML files from PDDA via CaTH publication upload flow and upload them to the XHIBIT AWS S3 bucket."
•	CY: Body text — "Welsh placeholder"
•	EN: Endpoint label — "Publication-services: Upload PDDA Crown list (HTM/HTML) to S3"
•	CY: Endpoint label — "Welsh placeholder"
•	EN: Supported file types — ".htm, .html"
•	CY: Supported file types — "Welsh placeholder"
•	EN: Artefact type — "LCSU"
•	CY: Artefact type — "Welsh placeholder"
•	EN: Success response — "Upload accepted and stored"
•	CY: Success response — "Welsh placeholder"
•	EN: Audit/log event — "HTM/HTML artefact received from PDDA and uploaded to XHIBIT S3"
•	CY: Audit/log event — "Welsh placeholder"
•	EN: Button — "Continue"
•	CY: Button — "Welsh placeholder"
________________________________________
**Errors**
•	Invalid file extension
o	EN: "The uploaded file must be an HTM or HTML file"
o	CY: "Welsh placeholder"
•	Missing file
o	EN: "Select an HTM or HTML file to upload"
o	CY: "Welsh placeholder"
•	Invalid artefact type
o	EN: "ArtefactType must be LCSU for HTM/HTML uploads"
o	CY: "Welsh placeholder"
•	File too large
o	EN: "The uploaded file is too large"
o	CY: "Welsh placeholder"
•	Unsupported content type (if validated)
o	EN: "The uploaded file type is not supported"
o	CY: "Welsh placeholder"
•	S3 upload failure (connectivity/permissions)
o	EN: "The file could not be uploaded to storage. Try again."
o	CY: "Welsh placeholder"
•	S3 region misconfiguration
o	EN: "Storage configuration error prevented upload"
o	CY: "Welsh placeholder"
•	S3 verification failure (object not found after upload, if verification is implemented)
o	EN: "Upload could not be verified"
o	CY: "Welsh placeholder"
________________________________________
**Back navigation**
•	Not applicable (service-to-service API flow with no user navigation).
•	If CaTH APIM upload endpoint supports retries:
o	A failed upload must allow safe retry without corrupting downstream state (idempotency expectations TBD).
________________________________________
**Accessibility**
•	Ensure error messages returned by the upload flow are concise, consistent, and machine-readable for any consuming UI (where applicable).
•	Ensure logs/audit events include correlation identifiers to support support/operations without exposing sensitive credentials or file contents.
•	Ensure any user-facing surfacing of errors (if a UI exists in the upload path) follows WCAG 2.2 AA: clear error summary, field association, and predictable language toggling.
________________________________________
**Test Scenarios**
•	File type acceptance
o	Upload ".html" file with ArtefactType=LCSU succeeds and is passed to S3.
o	Upload ".htm" file with ArtefactType=LCSU succeeds and is passed to S3.
o	Upload ".txt" (or any other extension) is rejected with the correct error.
•	ArtefactType validation
o	Upload HTM/HTML with ArtefactType≠LCSU is rejected with the correct error (or routed to existing handling if defined — TBD).
•	S3 integration
o	Successful upload results in an object existing in the XHIBIT S3 bucket at the expected key/prefix.
o	Upload fails gracefully when AWS credentials are invalid (expect appropriate error and no partial success).
o	Upload fails gracefully when S3 region is incorrect/mismatched.
•	API functional test (as per acceptance criteria)
o	Functional test uploads an HTML file through the API and validates the request completes successfully.
•	End-to-end verification functional test (as per acceptance criteria)
o	Functional test uploads an HTML/HTM file and verifies the object exists in S3 (via HeadObject or equivalent).
•	Observability
o	Logs include correlation/request ID (when provided) and record the resulting S3 key, without logging file contents or secrets.
________________________________________
**CLARIFICATIONS REQUIRED BEFORE THIS CAN BE TREATED AS "FINAL"**
•	Exact Publication-services endpoint path, HTTP method, and expected request shape (multipart vs raw body), including required headers.
•	Maximum file size and any timeout expectations.
•	Exact allowed MIME types (if validation is required) and whether MIME validation is mandatory or best-effort.
•	S3 bucket name/prefix conventions and object key naming rules (including whether overwrites are allowed and idempotency strategy).
•	Whether non-LCSU artefact types should be rejected by this new endpoint or handled by existing publication upload logic.
•	Expected response codes for success/failure (e.g., 200/201/202, and specific 4xx/5xx mapping).



## Comments

### Comment by OgechiOkelu on 2026-02-06T09:30:42Z
@spec new-feature.md

### Comment by hmctsclaudecode on 2026-02-06T09:33:18Z
# Technical Specification: PDDA/HTML Upload to AWS S3

## 1. User Story
**As a** CaTH Service
**I want to** accept HTML/HTM files from PDDA and upload them to XHIBIT S3
**So that** Crown hearing lists can be published

## 2. Background
This feature implements the PDDA/HTML connection for Crown lists publishing. PDDA sends data in HTML/HTM format to AWS S3 via CaTH's publication upload endpoint. Unlike standard data ingestion through HMI APIM, PDDA uploads go through the publication upload endpoint/CaTH APIM and require direct passthrough to the XHIBIT S3 bucket on AWS.

The implementation requires:
- A new API endpoint in publication-services for HTML/HTM file uploads
- AWS S3 SDK integration for communication with XHIBIT S3
- A new artefact type value `LCSU` for PDDA HTML uploads
- Validation of file types (HTM/HTML only)
- Configuration of AWS credentials and regional settings

## 3. Acceptance Criteria
* **Scenario:** Accept HTM file from PDDA
    * **Given** PDDA sends an HTM file with ArtefactType=LCSU
    * **When** the file is received at the publication upload endpoint
    * **Then** the file is validated and uploaded to XHIBIT S3 bucket with success response

* **Scenario:** Accept HTML file from PDDA
    * **Given** PDDA sends an HTML file with ArtefactType=LCSU
    * **When** the file is received at the publication upload endpoint
    * **Then** the file is validated and uploaded to XHIBIT S3 bucket with success response

* **Scenario:** Reject non-HTML file types
    * **Given** PDDA sends a file with extension other than HTM/HTML
    * **When** the file is received at the publication upload endpoint
    * **Then** the request is rejected with appropriate error message

* **Scenario:** Validate ArtefactType for PDDA flow
    * **Given** a file is sent with ArtefactType other than LCSU
    * **When** the file is received at the PDDA HTML endpoint
    * **Then** the request is rejected with appropriate error message

* **Scenario:** S3 upload verification
    * **Given** an HTML/HTM file has been successfully processed
    * **When** the upload completes
    * **Then** the file exists in the XHIBIT S3 bucket at the expected location

## 4. User Journey Flow
This is a service-to-service API integration with no user interface:

```
┌──────────┐         ┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   PDDA   │────────▶│  CaTH APIM  │────────▶│  Publication     │────────▶│  XHIBIT S3  │
│  System  │  HTML   │  Endpoint   │         │  Services API    │         │   Bucket    │
└──────────┘         └─────────────┘         └──────────────────┘         └─────────────┘
                           │                           │
                           │                           │
                           ▼                           ▼
                    OAuth validation           File validation
                    ArtefactType=LCSU          Extension: .htm/.html
                                               Upload to S3
                                               Verify object exists
```

**Flow Steps:**
1. PDDA sends HTTP POST request with multipart/form-data containing HTML/HTM file
2. CaTH APIM authenticates request via OAuth
3. Publication-services endpoint validates:
   - ArtefactType equals "LCSU"
   - File extension is .htm or .html (case-insensitive)
   - File is not empty
   - File size within limits
4. AWS S3 SDK uploads file to XHIBIT bucket in configured region
5. Service verifies upload success
6. Response returned to PDDA with success/failure status
7. Audit log created with correlation ID and S3 key (no file contents or secrets)

## 5. Low Fidelity Wireframe
Not applicable - this is a service-to-service API endpoint with no user interface.

## 6. Page Specifications
Not applicable - API endpoint only.

### API Endpoint Specification

**Endpoint:** `POST /api/v1/publication/pdda-html` (path TBD - requires clarification)

**Authentication:** OAuth 2.0 via `authenticateApi()` middleware

**Request Format:** Multipart form-data

**Request Headers:**
- `Content-Type: multipart/form-data`
- `Authorization: Bearer {token}`
- `X-Correlation-ID: {uuid}` (optional but recommended)

**Request Body Parameters:**
```typescript
{
  artefact_type: "LCSU",           // Required: Must equal "LCSU"
  file: <binary>,                  // Required: HTM/HTML file
  // Additional metadata fields TBD based on clarifications
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Upload accepted and stored",
  "s3_key": "path/to/file.html",
  "correlation_id": "uuid"
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "The uploaded file must be an HTM or HTML file",
  "correlation_id": "uuid"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "success": false,
  "message": "The file could not be uploaded to storage. Try again.",
  "correlation_id": "uuid"
}
```

## 7. Content

### English (EN)
- **Endpoint purpose:** "Accept HTM/HTML files from PDDA via CaTH publication upload flow and upload them to the XHIBIT AWS S3 bucket"
- **Artefact type:** "LCSU"
- **Supported file types:** ".htm, .html"
- **Success message:** "Upload accepted and stored"
- **Audit log event:** "HTM/HTML artefact received from PDDA and uploaded to XHIBIT S3"

### Welsh (CY)
Welsh translations required for all user-facing error messages if this endpoint is exposed through any UI layer in the future. For service-to-service API, Welsh translations can be deferred until UI requirements are confirmed.

## 8. URL
`POST /api/v1/publication/pdda-html`

**Path requires clarification** - final endpoint path to be confirmed based on existing publication-services routing conventions.

## 9. Validation

### Request Validation

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| artefact_type | string | Yes | Must equal "LCSU" |
| file | binary | Yes | Must be present, not empty |
| filename | string | Yes (derived) | Must end with .htm or .html (case-insensitive)<br>No path traversal characters (../, ..\\)<br>Max length: **TBD** |
| file size | number | Yes (derived) | Max size: **TBD** |

### File Extension Validation
```typescript
const allowedExtensions = ['.htm', '.html'];
const fileExtension = path.extname(filename).toLowerCase();
if (!allowedExtensions.includes(fileExtension)) {
  // Reject with error
}
```

### Content Type Validation
Validate MIME type if provided in request (exact allowed types **TBD**):
- `text/html`
- `application/octet-stream` (if MIME sniffing is needed)

**Note:** Do not rely solely on MIME type - extension validation is primary.

### Filename Security Validation
```typescript
const pathTraversalPattern = /\.\.\//|\.\.\\/;
if (pathTraversalPattern.test(filename)) {
  // Reject - potential security issue
}
```

### S3 Configuration Validation
- AWS region must match XHIBIT S3 bucket region
- AWS credentials must have PutObject permission
- Bucket name and prefix must be configured
- Object key generation must prevent collisions (idempotency strategy **TBD**)

## 10. Error Messages

### English (EN)

| Error Condition | HTTP Status | Error Message |
|----------------|-------------|---------------|
| Invalid file extension | 400 | "The uploaded file must be an HTM or HTML file" |
| Missing file | 400 | "Select an HTM or HTML file to upload" |
| Invalid artefact type | 400 | "ArtefactType must be LCSU for HTM/HTML uploads" |
| File too large | 400 | "The uploaded file is too large" |
| Unsupported content type | 400 | "The uploaded file type is not supported" |
| S3 upload failure | 500 | "The file could not be uploaded to storage. Try again." |
| S3 region misconfiguration | 500 | "Storage configuration error prevented upload" |
| S3 verification failure | 500 | "Upload could not be verified" |
| Authentication failure | 401 | "Unauthorized" |
| General error | 500 | "Internal server error" |

### Welsh (CY)
Welsh translations to be provided when UI requirements are confirmed.

## 11. Navigation
Not applicable - service-to-service API with no navigation.

**Retry Behavior:**
If CaTH APIM/publication upload endpoint supports retries, failed uploads must allow safe retry without corrupting downstream state. Idempotency requirements **TBD**.

## 12. Accessibility
Not applicable for API endpoint. However:

- Error messages must be concise, consistent, and machine-readable
- Logs and audit events must include correlation identifiers for support/operations
- No sensitive credentials or file contents in logs
- If future UI is built, must follow WCAG 2.2 AA: clear error summary, field association, predictable language toggling

## 13. Test Scenarios

### File Type Acceptance Tests
* Upload .html file with ArtefactType=LCSU - expect 201 success and file in S3
* Upload .htm file with ArtefactType=LCSU - expect 201 success and file in S3
* Upload .txt file with ArtefactType=LCSU - expect 400 error with message "The uploaded file must be an HTM or HTML file"
* Upload .pdf file with ArtefactType=LCSU - expect 400 error

### ArtefactType Validation Tests
* Upload HTML file with ArtefactType≠LCSU - expect 400 error with message "ArtefactType must be LCSU for HTM/HTML uploads"
* Upload HTML file with missing ArtefactType - expect 400 error

### S3 Integration Tests
* Successful upload results in object existing in XHIBIT S3 bucket at expected key/prefix
* Upload with invalid AWS credentials fails gracefully with 500 error (no partial success)
* Upload with incorrect S3 region fails gracefully with 500 error
* Verify uploaded file content matches original file

### Data Management Functional Tests
* Functional test uploads HTML file through data management endpoint
* Validates request completes successfully with 201 status
* Verifies response includes s3_key and correlation_id

### End-to-End S3 Verification Tests
* Functional test uploads HTML/HTM file
* Uses HeadObject or equivalent to verify object exists in S3
* Validates object metadata (size, content-type)
* Confirms object is accessible and retrievable

### File Size and Content Tests
* Upload empty HTML file - expect 400 error with message "Select an HTM or HTML file to upload"
* Upload HTML file exceeding max size - expect 400 error with message "The uploaded file is too large"
* Upload valid HTML file at maximum allowed size - expect 201 success

### Security Tests
* Upload file with path traversal in filename (../evil.html) - expect 400 error or sanitized filename
* Upload file with XSS payload in filename - expect sanitized filename
* Attempt upload without OAuth token - expect 401 error
* Attempt upload with invalid OAuth token - expect 401 error

### Observability Tests
* Verify logs include correlation/request ID when provided
* Verify logs record resulting S3 key
* Verify logs do NOT contain file contents
* Verify logs do NOT contain AWS credentials or secrets
* Verify audit trail records source system, timestamp, status

### Idempotency Tests (if supported)
* Upload same file twice with same correlation ID - verify behavior (**TBD**: should it deduplicate or allow overwrite?)
* Verify S3 object key strategy prevents unintended overwrites

## 14. Assumptions &amp; Open Questions

### Assumptions
* AWS S3 SDK will be added as a dependency to publication-services
* OAuth authentication middleware (`authenticateApi()`) is already implemented and will be reused
* PDDA will send files via multipart/form-data POST requests
* This endpoint is separate from existing blob ingestion endpoint (`/api/v1/publication`)
* File storage in S3 is the only requirement - no database artefact record is created
* HTML/HTM files are passthrough only - no parsing, validation, or transformation required

### Open Questions Requiring Clarification

**Critical for Implementation:**
1. **Endpoint path and HTTP method:** What is the exact endpoint path? Is it `POST /api/v1/publication/pdda-html` or different?
2. **Request structure:** What is the exact multipart form field name for the file? What other fields are required?
3. **Maximum file size:** What is the maximum allowed file size for HTML/HTM uploads?
4. **Maximum filename length:** What is the maximum allowed length for filenames?
5. **Allowed MIME types:** Should we validate MIME types? If yes, which types are allowed?
6. **S3 bucket details:**
   - What is the XHIBIT S3 bucket name?
   - What is the bucket region?
   - What S3 prefix/path should be used for uploads?
   - What is the object key naming convention?
7. **S3 object key strategy:** How should we name files in S3? Should we:
   - Use original filename?
   - Generate UUID-based keys?
   - Use timestamp-based keys?
   - Allow overwrites or ensure uniqueness?
8. **Idempotency:** Should duplicate uploads be prevented? If yes, how (correlation ID, content hash, filename)?
9. **ArtefactType handling:** Should non-LCSU artefact types be:
   - Rejected by this endpoint (return 400)?
   - Routed to existing publication upload logic?
   - Both endpoints handle different artefact types?
10. **Response codes:** What are the expected HTTP status codes for success/failure?
    - 200 OK vs 201 Created for success?
    - Specific 4xx codes for different validation failures?
11. **AWS credentials:** How will AWS credentials be provided?
    - Environment variables?
    - AWS IAM roles?
    - Parameter store/secrets manager?
12. **Correlation ID:** Is X-Correlation-ID header required or optional?

**Important for Testing:**
13. **Test environment S3 bucket:** Do we have a separate S3 bucket for testing?
14. **Functional test approach:** Should functional tests use mock S3 or real S3 bucket?
15. **S3 verification method:** HeadObject, GetObject, or ListObjects for verification?

**Important for Operations:**
16. **Monitoring and alerting:** What metrics should be tracked (upload count, failures, latency)?
17. **Retry strategy:** Should the API support automatic retries? Client-side retries?
18. **Rate limiting:** Should this endpoint have rate limiting?
19. **Audit requirements:** What information must be logged for audit compliance?

### Technical Debt Considerations
* This implementation creates a separate upload path for PDDA that bypasses the standard artefact storage in the database
* Consider future consolidation if PDDA needs to integrate with the standard blob ingestion flow
* AWS S3 SDK dependency should be evaluated for version compatibility and security updates
* Consider adding health check endpoint for S3 connectivity testing

---

## Implementation Notes

### Module Structure
Create new module: `libs/pdda-html-upload`

```
libs/pdda-html-upload/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts                    # Module exports for registration
    ├── index.ts                     # Business logic exports
    ├── routes/
    │   └── pdda-html-upload.ts     # API route handler
    │   └── pdda-html-upload.test.ts
    ├── s3/
    │   └── s3-client.ts            # AWS S3 SDK wrapper
    │   └── s3-client.test.ts
    │   └── s3-upload.ts            # Upload logic
    │   └── s3-upload.test.ts
    └── validation/
        └── file-validator.ts       # File validation logic
        └── file-validator.test.ts
```

### Dependencies
```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.x.x"
  },
  "peerDependencies": {
    "express": "5.2.0"
  }
}
```

### Environment Variables
```bash
AWS_S3_XHIBIT_BUCKET_NAME=xhibit-publications
AWS_S3_XHIBIT_REGION=eu-west-2
AWS_S3_XHIBIT_PREFIX=pdda-html/
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
PDDA_HTML_MAX_FILE_SIZE=10485760  # 10MB in bytes
```

### Artefact Type Addition
Update `libs/publication/src/artefact-type.ts` (to be created):
```typescript
export enum ArtefactType {
  JSON = "JSON",
  FLAT_FILE = "FLAT_FILE",
  LCSU = "LCSU"  // NEW: PDDA HTML uploads
}
```

### Key Files to Modify
* `apps/api/src/app.ts` - Register new pdda-html-upload routes
* Root `tsconfig.json` - Add `@hmcts/pdda-html-upload` path alias
* `.env.example` - Document new AWS environment variables

---

**Next Steps:**
1. Get clarification on all open questions marked as **TBD**
2. Review and approve this specification
3. Create implementation plan with task breakdown
4. Set up AWS S3 test bucket and credentials
5. Begin implementation following HMCTS development guidelines

### Comment by OgechiOkelu on 2026-02-11T11:25:41Z
Note: Initial requirements may have been updated during the tech-refinement which need to be included in the technical plan and may require changes to the initially generated technical specifications during the development of the technical plan. @plan
