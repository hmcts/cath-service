# VIBE-316: Implementation Tasks

## Phase 1: Database Schema ⚠️ CRITICAL - DO FIRST

- [ ] Update `libs/postgres/prisma/schema.prisma` to add ListSearchConfig model
- [ ] Update `libs/postgres/prisma/schema.prisma` to add ArtefactSearch model
- [ ] Update Subscription model to add searchType and searchValue fields
- [ ] Generate Prisma migration: `yarn db:migrate:dev`
- [ ] Create data migration script at `libs/postgres/scripts/migrate-subscriptions.ts`
- [ ] Test migration script locally
- [ ] Run migration to migrate existing location subscriptions

## Phase 2: List Search Config Module

### Module Setup
- [ ] Create directory structure: `libs/list-search-config/src/{pages,locales}`
- [ ] Create `libs/list-search-config/package.json`
- [ ] Create `libs/list-search-config/tsconfig.json`
- [ ] Create `libs/list-search-config/src/config.ts`
- [ ] Create `libs/list-search-config/src/index.ts`

### Repository Layer
- [ ] Create `libs/list-search-config/src/list-search-config-repository.ts`
- [ ] Implement `findByListTypeId(listTypeId: string)`
- [ ] Implement `create(data: ListSearchConfigData)`
- [ ] Implement `update(id: string, data: ListSearchConfigData)`
- [ ] Add unit tests for repository

### Service Layer
- [ ] Create `libs/list-search-config/src/list-search-config-service.ts`
- [ ] Implement `getConfigForListType(listTypeId: string)`
- [ ] Implement `saveConfig(listTypeId, caseNumberField, caseNameField)`
- [ ] Add validation for field name pattern: `^[a-zA-Z0-9_]+$`
- [ ] Add unit tests for service

### Pages
- [ ] Create `libs/list-search-config/src/pages/list-search-config.ts` controller
- [ ] Implement GET handler to load existing config
- [ ] Implement POST handler with validation
- [ ] Add content objects (en and cy)
- [ ] Create `libs/list-search-config/src/pages/list-search-config.njk` template
- [ ] Add form with govukInput components
- [ ] Add error summary component
- [ ] Add validation error messages

### Translations
- [ ] Create `libs/list-search-config/src/locales/en.ts`
- [ ] Create `libs/list-search-config/src/locales/cy.ts`
- [ ] Add button text, error messages, help text

### Module Registration
- [ ] Register module in `apps/web/src/app.ts`
- [ ] Register assets in `apps/web/vite.config.ts`
- [ ] Register Prisma schema in `apps/postgres/src/schema-discovery.ts`
- [ ] Update root `tsconfig.json` with module path

## Phase 3: Artefact Search Extraction

### Extractor Implementation
- [ ] Create `libs/publication/src/artefact-search-extractor.ts`
- [ ] Implement `extractCaseData(listTypeId, jsonPayload, artefactId)`
- [ ] Add logic to look up config from list_search_config table
- [ ] Add logic to extract fields from JSON using configured field names
- [ ] Add graceful handling for missing/null values
- [ ] Add unit tests for extractor

### Repository
- [ ] Create `libs/publication/src/artefact-search-repository.ts`
- [ ] Implement `create(artefactId, caseNumber, caseName)`
- [ ] Add unit tests for repository

### Integration
- [ ] Update `libs/publication/src/publication-service.ts` to call extractor
- [ ] Store extracted data in artefact_search table
- [ ] Add error logging (don't fail publication on extraction error)
- [ ] Update `libs/publication/src/routes/publication-api.ts` to integrate extraction
- [ ] Add integration tests

## Phase 4: Subscription Updates

### Repository Updates
- [ ] Update `libs/subscription/src/subscription-repository.ts`
- [ ] Change location queries to use searchType/searchValue
- [ ] Update all location-based queries
- [ ] Add unit tests for updated queries

### Service Updates
- [ ] Update `libs/subscription/src/subscription-service.ts`
- [ ] Update location subscription creation to use search_type/search_value
- [ ] Update fulfilment queries
- [ ] Add unit tests for updated service

## Phase 5: Final Migration

- [ ] Verify all location subscriptions migrated correctly
- [ ] Verify location-based fulfilment works with new schema
- [ ] Create migration to drop location_id column
- [ ] Run `yarn db:migrate:dev` to drop column

## Phase 6: Testing

### Unit Tests
- [ ] Test list search config validation
- [ ] Test artefact search extraction logic
- [ ] Test repository methods
- [ ] Ensure >80% coverage on business logic

### Integration Tests
- [ ] Test publication processing with extraction
- [ ] Test subscription fulfilment with new schema
- [ ] Test admin config page save/load

### E2E Tests
- [ ] Test admin configures list search fields journey
- [ ] Test publication is processed and case data extracted
- [ ] Test location subscription fulfilment works
- [ ] Include Welsh translation checks
- [ ] Include accessibility checks with Axe

## Phase 7: Documentation & Cleanup

- [ ] Update README if needed
- [ ] Run `yarn lint:fix` to fix any linting issues
- [ ] Run `yarn format` to format code
- [ ] Review all changes
- [ ] Create pull request

## Notes

- **Critical**: Do Phase 1 first - database schema changes are required for everything else
- Keep `location_id` column during migration to avoid data loss
- Test migration thoroughly before dropping the column
- Ensure existing location subscriptions continue working throughout
