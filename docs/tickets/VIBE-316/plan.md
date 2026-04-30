# VIBE-316: Implementation Plan

## Overview

This ticket refactors the subscription system to support multiple search types (not just location). The implementation involves database schema changes, a new admin configuration page, publication processing updates, and data migration.

## Critical Files

### New Files to Create

1. **Database Schema**
   - `libs/postgres/prisma/schema.prisma` - Add new tables and modify subscription table
   - `libs/postgres/prisma/migrations/` - Migration files for schema changes

2. **Admin Configuration Module**
   - `libs/list-search-config/package.json` - Module configuration
   - `libs/list-search-config/tsconfig.json` - TypeScript config
   - `libs/list-search-config/src/config.ts` - Module exports
   - `libs/list-search-config/src/index.ts` - Business logic exports
   - `libs/list-search-config/src/pages/list-search-config.ts` - Page controller
   - `libs/list-search-config/src/pages/list-search-config.njk` - Template
   - `libs/list-search-config/src/locales/en.ts` - English translations
   - `libs/list-search-config/src/locales/cy.ts` - Welsh translations
   - `libs/list-search-config/src/list-search-config-service.ts` - Service layer
   - `libs/list-search-config/src/list-search-config-repository.ts` - Data access

3. **Publication Processing**
   - `libs/publication/src/artefact-search-extractor.ts` - Extract case data from JSON
   - `libs/publication/src/artefact-search-repository.ts` - Data access for artefact_search

4. **Subscription Updates**
   - `libs/subscription/src/subscription-repository.ts` - Update queries to use search_type/search_value
   - `libs/subscription/src/subscription-service.ts` - Update business logic

### Files to Modify

1. **Database**
   - `libs/postgres/prisma/schema.prisma` - Update subscription model, add new models

2. **Publication Processing**
   - `libs/publication/src/publication-service.ts` - Add artefact search extraction
   - `libs/publication/src/routes/publication-api.ts` - Integrate extraction

3. **Subscription Fulfilment**
   - `libs/subscription/src/subscription-repository.ts` - Update location queries
   - `libs/subscription/src/subscription-service.ts` - Update location logic

4. **App Registration**
   - `apps/web/src/app.ts` - Register list-search-config module
   - `apps/web/vite.config.ts` - Register module assets
   - `apps/postgres/src/schema-discovery.ts` - Register prisma schema

5. **Root Configuration**
   - `tsconfig.json` - Add @hmcts/list-search-config path

## Implementation Steps

### Phase 1: Database Schema (Priority: Critical)

1. **Create Prisma models** in `libs/postgres/prisma/schema.prisma`
   ```prisma
   model ListSearchConfig {
     id                   String   @id @default(cuid())
     listTypeId           String   @map("list_type_id")
     caseNumberFieldName  String   @map("case_number_field_name") @db.VarChar(100)
     caseNameFieldName    String   @map("case_name_field_name") @db.VarChar(100)
     createdAt            DateTime @default(now()) @map("created_at")
     updatedAt            DateTime @updatedAt @map("updated_at")

     @@map("list_search_config")
   }

   model ArtefactSearch {
     id          String   @id @default(cuid())
     artefactId  String   @map("artefact_id")
     caseNumber  String?  @map("case_number")
     caseName    String?  @map("case_name")
     createdAt   DateTime @default(now()) @map("created_at")

     @@map("artefact_search")
   }
   ```

2. **Update Subscription model**
   - Add `searchType String @map("search_type") @db.VarChar(50)`
   - Add `searchValue String @map("search_value")`
   - Keep `locationId` temporarily for migration

3. **Generate migration**
   ```bash
   yarn db:migrate:dev
   ```

4. **Create data migration script** `libs/postgres/scripts/migrate-subscriptions.ts`
   - Copy location_id → search_value
   - Set search_type = 'LOCATION_ID'
   - Validate migration
   - Remove location_id column in subsequent migration

### Phase 2: List Search Config Module (Priority: High)

1. **Create module structure**
   ```bash
   mkdir -p libs/list-search-config/src/{pages,locales}
   ```

2. **Implement repository** `list-search-config-repository.ts`
   - `findByListTypeId(listTypeId: string)`
   - `create(data: ListSearchConfigData)`
   - `update(id: string, data: ListSearchConfigData)`

3. **Implement service** `list-search-config-service.ts`
   - `getConfigForListType(listTypeId: string)`
   - `saveConfig(listTypeId: string, caseNumberField: string, caseNameField: string)`
   - Validation logic for field names (pattern: `^[a-zA-Z0-9_]+$`)

4. **Create page controller** `pages/list-search-config.ts`
   - GET handler: Load existing config or render empty form
   - POST handler: Validate input, save config, redirect
   - Content objects (en/cy)

5. **Create template** `pages/list-search-config.njk`
   - Form with govukInput components
   - Error summary
   - Validation error messages

6. **Create translations** `locales/en.ts` and `locales/cy.ts`
   - Common button text
   - Error messages
   - Help text

7. **Register module** in apps/web/src/app.ts

### Phase 3: Artefact Search Extraction (Priority: High)

1. **Create extractor** `libs/publication/src/artefact-search-extractor.ts`
   - `extractCaseData(listTypeId: string, jsonPayload: unknown, artefactId: string)`
   - Look up config from list_search_config
   - Extract fields from JSON using configured field names
   - Handle missing/null values gracefully
   - Return extracted data or null

2. **Create repository** `libs/publication/src/artefact-search-repository.ts`
   - `create(artefactId: string, caseNumber: string | null, caseName: string | null)`

3. **Integrate into publication service** `libs/publication/src/publication-service.ts`
   - After artefact is created, call extractor
   - Store extracted data in artefact_search table
   - Log but don't fail if extraction fails

4. **Update API route** `libs/publication/src/routes/publication-api.ts`
   - Ensure extraction is called for both manual upload and API publication

### Phase 4: Subscription Updates (Priority: High)

1. **Update repository** `libs/subscription/src/subscription-repository.ts`
   - Change location queries to use:
     ```typescript
     where: {
       searchType: 'LOCATION_ID',
       searchValue: locationId
     }
     ```

2. **Update service** `libs/subscription/src/subscription-service.ts`
   - Update location subscription creation to use search_type/search_value
   - Update fulfilment queries

3. **Create subscription when user subscribes to location**
   - Set searchType = 'LOCATION_ID'
   - Set searchValue = location ID

### Phase 5: Data Migration (Priority: Critical)

1. **Run migration script** to migrate existing subscriptions
   ```bash
   yarn db:migrate
   node libs/postgres/scripts/migrate-subscriptions.js
   ```

2. **Verify migration**
   - All subscriptions have search_type set
   - All subscriptions have search_value set
   - Location-based fulfilment still works

3. **Remove location_id column** (after verification)
   - Create final migration to drop column
   - Run `yarn db:migrate:dev`

### Phase 6: Testing (Priority: High)

1. **Unit tests**
   - ListSearchConfigService validation
   - ArtefactSearchExtractor logic
   - Repository methods

2. **Integration tests**
   - Publication processing with extraction
   - Subscription fulfilment with new schema
   - Admin config page save/load

3. **E2E tests**
   - Admin configures list search fields
   - Publication is processed and case data extracted
   - Location subscription fulfilment works

### Phase 7: Integration & Registration (Priority: Medium)

1. **Register module** in apps/web/src/app.ts
2. **Update root tsconfig.json** with module path
3. **Test end-to-end** workflow

## Technical Considerations

### Database Migration Strategy

- Keep `location_id` column during migration to avoid data loss
- Migrate data in transaction
- Verify migration success before dropping column
- Plan rollback strategy

### Error Handling

- Publication processing should not fail if:
  - List type has no search config
  - JSON fields are missing
  - Extraction fails
- Log extraction failures for monitoring

### Performance

- Index `artefact_search.artefact_id` for lookups
- Index `subscription(search_type, search_value)` for fulfilment queries

### Backwards Compatibility

- Existing location subscriptions must continue working
- Fulfilment logic must work with new schema
- API contracts should not change

## Testing Strategy

### Unit Tests
- List search config validation
- JSON extraction logic
- Subscription repository queries

### Integration Tests
- Database migrations
- Publication processing flow
- Subscription fulfilment flow

### E2E Tests
- Admin configuration journey
- Publication upload with extraction
- Location subscription notification

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Data migration fails | High | Keep location_id column, use transactions, test thoroughly |
| Extraction breaks publication processing | High | Handle extraction errors gracefully, don't fail publication |
| Existing subscriptions stop working | High | Extensive testing of location-based fulfilment with new schema |
| Config page inaccessible | Medium | Accessibility testing with screen readers |

## Success Criteria

1. ✅ Database schema updated with new tables and subscription changes
2. ✅ Admin can configure list search fields for any list type
3. ✅ Publications extract case data and store in artefact_search table
4. ✅ Existing location subscriptions migrated and working
5. ✅ Location-based fulfilment sends notifications correctly
6. ✅ No references to location_id in subscription code
7. ✅ All tests passing
8. ✅ Accessibility standards met

## Estimated Complexity: Medium-High

This ticket involves database schema changes, data migration, new module creation, and updates to existing publication/subscription logic. The complexity is medium-high due to the need for careful migration planning and ensuring backwards compatibility.
