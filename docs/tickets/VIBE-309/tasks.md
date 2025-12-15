# VIBE-309: Implementation Tasks

## Implementation Tasks

- [x] Create branch from vibe-166-cst-excel-list
- [x] Create libs/list-type-config module structure with package.json and tsconfig.json
- [x] Add module to root tsconfig.json paths
- [x] Create Prisma schema for list_types and list_types_sub_jurisdictions tables with unique constraint on name
- [x] Generate and apply database migration
- [x] Create list-type-service.ts, list-type-queries.ts, and list-type-validation.ts with unique name validation
- [x] Implement "Enter Details" page controller and Nunjucks template with validation
- [x] Implement "Select Sub-jurisdictions" page controller and template
- [x] Implement "Preview" page controller and template
- [x] Implement "Success" page controller and template
- [x] Implement "Edit List Type" flow (reuse same pages with pre-populated data)
- [x] Update System Admin dashboard to include "Configure List Type" tile
- [x] Add English and Welsh translations to locales files
- [x] Register module in apps/web/src/app.ts
- [x] Create migration script to automatically import data from mock-list-types.ts to database
- [x] Run migration script to populate database (requires database connection)
- [x] Update manual and non-strategic upload pages to use shortened_friendly_name from database
- [x] Replace all usages of mock-list-types.ts with database queries
- [x] Delete libs/list-types/common/src/mock-list-types.ts file

## Testing Tasks

- [x] Write unit tests for validation logic (12 tests passing)
- [x] Write E2E tests for configure list type flow
- [x] Test complete create and edit user journeys with validation and Welsh language
