# VIBE-209: Implementation Tasks

## Database Changes
- [x] Add `no_match` column to `artefact` table in Prisma schema
  - Type: Boolean
  - Required field with default value
  - Run migration to update database

## API Implementation
- [x] Create new API route `/api/v1/publication` (POST)
- [x] Implement OAuth authentication middleware
  - Use existing app registrations
  - Protect with `api.publisher.user` role
- [x] Implement request validation middleware
  - Validate JSON structure
  - Check required fields: `court_id`, `publication_date`, `hearing_list`
  - Validate data types
  - Check blob size limits
- [x] Implement court reference data lookup
  - Query Court Master Reference Data
  - Handle missing court scenarios
- [x] Implement publication processing logic
  - Reuse manual upload processing logic
  - Set `no_match` flag appropriately
  - Create artefact record
- [x] Implement error handling and responses
  - 200 OK for success
  - 400 Bad Request for invalid JSON
  - 401 Unauthorized for auth failures
  - 404 Not Found for unknown courts (when no_match=false)
  - 500 Internal Server Error for system failures

## Logging and Auditing
- [x] Implement ingestion logging
  - Log all ingestion attempts with timestamp
  - Include source system ID
  - Log validation results
  - Retain logs for 90 days minimum
- [x] Implement validation report creation
  - Store validation errors
  - Include all required fields (timestamp, source, court ID, result, error message, action)
- [ ] Implement admin alerting for repeated errors

## Testing
- [x] Unit tests for validation logic
- [x] Unit tests for service logic
- [x] Unit tests for queries
- [x] Unit tests for OAuth middleware
- [ ] Integration tests for API endpoint
  - TS1: Valid blob ingestion
  - TS2: Invalid schema
  - TS3: Unknown court (no_match scenario)
  - TS4: Missing required field
  - TS5: Provenance mismatch
  - TS6: Logging verification
  - TS7: Retry after admin fix
  - TS8: Large blob
  - TS9: API security
  - TS10: System alerting
- [ ] E2E tests for complete ingestion flow

## Documentation
- [ ] Update API documentation with new endpoint
- [ ] Document JSON schema requirements
- [ ] Document error codes and messages

## Open Questions to Resolve
- [ ] Confirm maximum file size limit for blob ingestion (currently 10MB)
- [ ] Confirm retry mechanism (manual vs automated)
- [ ] Confirm validation report generation frequency
- [ ] Confirm schema versioning requirements
- [ ] Confirm notification mechanism to source system
- [ ] Complete OAuth token validation implementation
