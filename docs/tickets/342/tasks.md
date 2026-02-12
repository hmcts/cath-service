# Implementation Tasks

## Database Setup
- [ ] Create Prisma model for ListType in apps/postgres/prisma/schema.prisma
- [ ] Update Artefact model to include listType relationship
- [ ] Run `yarn db:migrate:dev` to create migration
- [ ] Verify migration file includes list_type table creation
- [ ] Verify migration file includes seed data for 9 list types
- [ ] Verify migration file includes foreign key constraint on artefact.list_type_id
- [ ] Run migration and verify list_type table populated correctly

## Create List Type Repository Module
- [ ] Create directory structure: libs/list-types/repository/src/
- [ ] Create package.json for @hmcts/list-types-repository
- [ ] Create tsconfig.json for module
- [ ] Create list-type-service.ts with getAllListTypes, getListTypeById, getNonStrategicListTypes, getStrategicListTypes, getListTypeByName
- [ ] Create list-type-service.test.ts with comprehensive unit tests
- [ ] Create index.ts to export service functions
- [ ] Update root tsconfig.json to add @hmcts/list-types-repository path

## Update Publication Module
- [ ] Update libs/publication/src/repository/queries.ts (lines 182, 204)
- [ ] Update libs/publication/src/repository/service.ts (line 60)
- [ ] Update libs/publication/src/authorisation/middleware.ts (line 87)
- [ ] Update libs/publication/src/index.ts exports
- [ ] Update unit tests in publication module to mock Prisma client

## Update Admin Pages Module
- [ ] Update libs/admin-pages/src/pages/manual-upload/index.ts (line 15)
- [ ] Update libs/admin-pages/src/pages/non-strategic-upload/index.ts (line 16)
- [ ] Update libs/admin-pages/src/pages/remove-list-confirmation/index.ts (line 19)
- [ ] Update libs/admin-pages/src/pages/remove-list-search-results/index.ts (lines 66, 121)
- [ ] Update libs/admin-pages/src/pages/non-strategic-upload-summary/index.ts
- [ ] Update libs/admin-pages/src/pages/manual-upload-summary/index.ts
- [ ] Update libs/admin-pages/src/manual-upload/validation.ts (line 1)
- [ ] Update unit tests in admin-pages module to mock Prisma client

## Update Public Pages Module
- [ ] Update libs/public-pages/src/pages/summary-of-publications/index.ts
- [ ] Update libs/public-pages/src/flat-file/flat-file-service.ts
- [ ] Update unit tests in public-pages module to mock Prisma client

## Update API Module
- [ ] Update libs/api/src/blob-ingestion/repository/service.ts
- [ ] Update libs/api/src/blob-ingestion/validation.ts
- [ ] Update unit tests in api module to mock Prisma client

## Update List Types Module
- [ ] Update libs/list-types/common/src/index.ts (remove mockListTypes export)
- [ ] Update libs/list-types/civil-and-family-daily-cause-list/src/pages/index.ts
- [ ] Update unit tests in list-types module to mock Prisma client

## Cleanup
- [ ] Delete libs/list-types/common/src/mock-list-types.ts
- [ ] Search codebase for remaining "mockListTypes" imports (should be 0)
- [ ] Search codebase for remaining "@hmcts/list-types-common" imports referencing mockListTypes

## Testing & Verification
- [ ] Run yarn test to verify all unit tests pass
- [ ] Run yarn test:e2e to verify E2E tests pass
- [ ] Manual test: verify manual upload page displays strategic list types dropdown
- [ ] Manual test: verify non-strategic upload page displays non-strategic list types
- [ ] Manual test: verify summary of publications shows correct friendly names
- [ ] Manual test: verify Welsh translations display correctly (lng=cy)
- [ ] Manual test: attempt to create artefact with invalid listTypeId (should fail)
- [ ] Query database to verify foreign key constraint exists: SELECT * FROM information_schema.table_constraints WHERE constraint_name LIKE '%list_type%';

## Documentation
- [ ] Update any documentation referencing mockListTypes
- [ ] Update CLAUDE.md if list types are mentioned as an example pattern
