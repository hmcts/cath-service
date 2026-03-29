# Implementation Tasks: #301 — Third Party User Management

## Implementation Tasks

### Database & Data Layer
- [x] Create `libs/third-party-user/` module with `package.json`, `tsconfig.json`
- [x] Create `libs/third-party-user/prisma/schema.prisma` with `third_party_user` and `third_party_subscription` models
- [x] Create `libs/third-party-user/src/config.ts` exporting `prismaSchemas`
- [x] Create `libs/third-party-user/src/name-validation.ts` with validation functions
- [x] Create `libs/third-party-user/src/third-party-user-service.ts` with CRUD service functions
- [x] Write unit tests for `name-validation.ts` and `third-party-user-service.ts`
- [x] Register `@hmcts/third-party-user` in root `tsconfig.json` paths
- [x] Register `prismaSchemas` from `@hmcts/third-party-user/config` in `apps/postgres/src/schema-discovery.ts`
- [x] Run `yarn db:generate` to update Prisma client with new models (migration SQL created manually at `apps/postgres/prisma/migrations/20260318000000_add_third_party_user/migration.sql`)

### LaunchDarkly Integration
- [x] Add `@launchdarkly/node-server-sdk` dependency to `libs/system-admin-pages/package.json`
- [x] Create `libs/system-admin-pages/src/feature-flags/launch-darkly.ts` with LD client wrapper
- [ ] Add `CATH_LD_KEY` env var to local `.env.example` / environment configuration

### Page: Manage Third Party Users (`/third-party-users`)
- [x] Create `libs/system-admin-pages/src/pages/third-party-users/en.ts` and `cy.ts`
- [x] Create `libs/system-admin-pages/src/pages/third-party-users/index.ts` controller (GET)
- [x] Create `libs/system-admin-pages/src/pages/third-party-users/index.njk` template with table and "Create new user" button
- [x] Write unit tests for the controller

### Page: Create Third Party User (`/third-party-users/create`)
- [x] Create `en.ts` and `cy.ts`
- [x] Create `index.ts` controller (GET + POST with name validation, session storage)
- [x] Create `index.njk` template with text input and error summary
- [x] Write unit tests for the controller

### Page: Create Summary (`/third-party-users/create/summary`)
- [x] Create `en.ts` and `cy.ts`
- [x] Create `index.ts` controller (GET + POST with idempotency via `session.createdId`, audit log)
- [x] Create `index.njk` template with GOV.UK summary list and Change link
- [x] Write unit tests for the controller

### Page: Create Confirmation (`/third-party-users/create/confirmation`)
- [x] Create `en.ts` and `cy.ts`
- [x] Create `index.ts` controller (GET: read created name from session, clear session)
- [x] Create `index.njk` template with GOV.UK panel component
- [x] Write unit tests for the controller

### Page: Manage User (`/third-party-users/[id]`)
- [x] Create `en.ts` and `cy.ts`
- [x] Create `index.ts` controller (GET: load user + subscription count from DB)
- [x] Create `index.njk` template with summary table, green "Manage subscriptions" button, red "Delete user" button
- [x] Write unit tests for the controller

### Page: Manage Subscriptions (`/third-party-users/[id]/subscriptions`)
- [x] Create `en.ts` and `cy.ts`
- [x] Create `index.ts` controller (GET + POST: paginated, LaunchDarkly flag for UI variant, session accumulation, audit log on final save)
- [x] Create `index.njk` template with conditional radio/dropdown rendering and pagination controls
- [x] Write unit tests for the controller (both LD flag states)

### Page: Subscriptions Updated Confirmation (`/third-party-users/[id]/subscriptions/confirmation`)
- [x] Create `en.ts` and `cy.ts`
- [x] Create `index.ts` controller (GET)
- [x] Create `index.njk` template with GOV.UK panel and "Manage third party users" link
- [x] Write unit tests for the controller

### Page: Delete Confirmation (`/third-party-users/[id]/delete`)
- [x] Create `en.ts` and `cy.ts`
- [x] Create `index.ts` controller (GET + POST: Yes/No radios, audit log on Yes)
- [x] Create `index.njk` template with radios and dynamic H1 including user name
- [x] Write unit tests for the controller

### Page: Delete Success (`/third-party-users/[id]/delete/confirmation`)
- [x] Create `en.ts` and `cy.ts`
- [x] Create `index.ts` controller (GET)
- [x] Create `index.njk` template with GOV.UK panel, "Manage another third party user" and "Home" links
- [x] Write unit tests for the controller

### E2E Tests
- [x] Create `e2e-tests/tests/third-party-user-management.spec.ts` covering:
  - Create third-party user journey (including validation, Welsh, accessibility)
  - Manage subscriptions journey (radio button variant)
  - Delete third-party user journey (including No cancellation path)

## Notes

- Database migration SQL is at `apps/postgres/prisma/migrations/20260318000000_add_third_party_user/migration.sql`. Run `yarn db:migrate:dev` to apply it to the database.
- LaunchDarkly flag key: `third-party-subscriptions-radio-buttons` (false = dropdown, true = radio buttons)
- `CATH_LD_KEY` environment variable must be set for LaunchDarkly to function; the feature flag defaults to `false` (radio button variant) when unavailable.
