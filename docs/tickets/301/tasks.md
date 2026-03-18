# Implementation Tasks: #301 — Third Party User Management

## Implementation Tasks

### Database & Data Layer
- [ ] Create `libs/third-party-user/` module with `package.json`, `tsconfig.json`
- [ ] Create `libs/third-party-user/prisma/schema.prisma` with `third_party_user` and `third_party_subscription` models
- [ ] Create `libs/third-party-user/src/config.ts` exporting `prismaSchemas`
- [ ] Create `libs/third-party-user/src/name-validation.ts` with validation functions
- [ ] Create `libs/third-party-user/src/third-party-user-service.ts` with CRUD service functions
- [ ] Write unit tests for `name-validation.ts` and `third-party-user-service.ts`
- [ ] Register `@hmcts/third-party-user` in root `tsconfig.json` paths
- [ ] Register `prismaSchemas` from `@hmcts/third-party-user/config` in `apps/postgres/src/schema-discovery.ts`
- [ ] Run `yarn db:migrate:dev` to generate migration for new tables

### LaunchDarkly Integration
- [ ] Add `@launchdarkly/node-server-sdk` dependency to `libs/system-admin-pages/package.json`
- [ ] Create `libs/system-admin-pages/src/feature-flags/launch-darkly.ts` with LD client wrapper
- [ ] Add `CATH_LD_KEY` env var to local `.env.example` / environment configuration

### Page: Manage Third Party Users (`/third-party-users`)
- [ ] Create `libs/system-admin-pages/src/pages/third-party-users/en.ts` and `cy.ts`
- [ ] Create `libs/system-admin-pages/src/pages/third-party-users/index.ts` controller (GET)
- [ ] Create `libs/system-admin-pages/src/pages/third-party-users/index.njk` template with table and "Create new user" button
- [ ] Write unit tests for the controller

### Page: Create Third Party User (`/third-party-users/create`)
- [ ] Create `en.ts` and `cy.ts`
- [ ] Create `index.ts` controller (GET + POST with name validation, session storage)
- [ ] Create `index.njk` template with text input and error summary
- [ ] Write unit tests for the controller

### Page: Create Summary (`/third-party-users/create/summary`)
- [ ] Create `en.ts` and `cy.ts`
- [ ] Create `index.ts` controller (GET + POST with idempotency via `session.createdId`, audit log)
- [ ] Create `index.njk` template with GOV.UK summary list and Change link
- [ ] Write unit tests for the controller

### Page: Create Confirmation (`/third-party-users/create/confirmation`)
- [ ] Create `en.ts` and `cy.ts`
- [ ] Create `index.ts` controller (GET: read created name from session, clear session)
- [ ] Create `index.njk` template with GOV.UK panel component
- [ ] Write unit tests for the controller

### Page: Manage User (`/third-party-users/[id]`)
- [ ] Create `en.ts` and `cy.ts`
- [ ] Create `index.ts` controller (GET: load user + subscription count from DB)
- [ ] Create `index.njk` template with summary table, green "Manage subscriptions" button, red "Delete user" button
- [ ] Write unit tests for the controller

### Page: Manage Subscriptions (`/third-party-users/[id]/subscriptions`)
- [ ] Create `en.ts` and `cy.ts`
- [ ] Create `index.ts` controller (GET + POST: paginated, LaunchDarkly flag for UI variant, session accumulation, audit log on final save)
- [ ] Create `index.njk` template with conditional radio/dropdown rendering and pagination controls
- [ ] Write unit tests for the controller (both LD flag states)

### Page: Subscriptions Updated Confirmation (`/third-party-users/[id]/subscriptions/confirmation`)
- [ ] Create `en.ts` and `cy.ts`
- [ ] Create `index.ts` controller (GET)
- [ ] Create `index.njk` template with GOV.UK panel and "Manage third party users" link
- [ ] Write unit tests for the controller

### Page: Delete Confirmation (`/third-party-users/[id]/delete`)
- [ ] Create `en.ts` and `cy.ts`
- [ ] Create `index.ts` controller (GET + POST: Yes/No radios, audit log on Yes)
- [ ] Create `index.njk` template with radios and dynamic H1 including user name
- [ ] Write unit tests for the controller

### Page: Delete Success (`/third-party-users/[id]/delete/confirmation`)
- [ ] Create `en.ts` and `cy.ts`
- [ ] Create `index.ts` controller (GET)
- [ ] Create `index.njk` template with GOV.UK panel, "Manage another third party user" and "Home" links
- [ ] Write unit tests for the controller

### E2E Tests
- [ ] Create `e2e-tests/tests/third-party-user-management.spec.ts` covering:
  - Create third-party user journey (including validation, Welsh, accessibility)
  - Manage subscriptions journey (radio button variant)
  - Manage subscriptions journey (dropdown variant, if LD flag testable)
  - Delete third-party user journey (including No cancellation path)
