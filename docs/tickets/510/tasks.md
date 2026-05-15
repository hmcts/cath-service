# Implementation Tasks — Issue #510: Subscribe by case name, case reference number, case ID or URN

## Implementation Tasks

### Database

- [x] Add `caseName` (`String? @map("case_name")`) and `caseNumber` (`String? @map("case_number")`) optional fields to the `Subscription` model in `libs/subscriptions/prisma/schema.prisma`
- [x] Run `yarn db:migrate:dev` to generate and apply the migration
- [x] Run `yarn db:generate` to regenerate the Prisma client

### Subscription queries — `libs/subscriptions/src/repository/queries.ts`

- [x] Add `CaseSearchResult` interface (`caseNumber: string | null`, `caseName: string | null`)
- [x] Add `searchByCaseName(term: string)` — case-insensitive partial match on `artefact_search.case_name`, distinct results, limit 50
- [x] Add `searchByCaseNumber(reference: string)` — exact match on `artefact_search.case_number`, distinct results
- [x] Add `createCaseSubscriptionRecord(userId, searchType, searchValue, caseName, caseNumber)` — creates subscription with the new case fields
- [x] Add `findCaseSubscriptionsByUserId(userId)` — finds subscriptions where `searchType IN ('CASE_NAME', 'CASE_NUMBER')`

### Subscription service — `libs/subscriptions/src/repository/service.ts`

- [x] Add `CaseSubscriptionDto` interface (`subscriptionId`, `caseName`, `caseNumber`, `dateAdded`)
- [x] Replace the `getCaseSubscriptionsByUserId` stub with a real implementation using `findCaseSubscriptionsByUserId`
- [x] Add `createCaseSubscription(userId, searchType, searchValue, caseName, caseNumber)` — validates no duplicate exists, then calls `createCaseSubscriptionRecord`
- [x] Export `createCaseSubscription` and `CaseSubscriptionDto` from `libs/subscriptions/src/index.ts` (via the existing `export * from "./repository/service.js"`)
- [x] Add unit tests for `getCaseSubscriptionsByUserId` and `createCaseSubscription` in `libs/subscriptions/src/repository/service.test.ts`
- [x] Add unit tests for `searchByCaseName`, `searchByCaseNumber`, `createCaseSubscriptionRecord`, `findCaseSubscriptionsByUserId` in `libs/subscriptions/src/repository/queries.test.ts`

### Session type — `libs/verified-pages/src/session.ts`

- [x] Add `caseNameSearch?: string` to the `emailSubscriptions` session namespace
- [x] Add `caseReferenceSearch?: string`
- [x] Add `caseSearchResults?: Array<{ caseNumber: string | null; caseName: string | null }>`
- [x] Add `searchSource?: "/case-name-search" | "/case-reference-search"`
- [x] Add `pendingCaseSubscription?: { caseName: string; caseNumber: string | null; searchType: "CASE_NAME" | "CASE_NUMBER"; searchValue: string }`

### Gateway page update — `libs/verified-pages/src/pages/add-email-subscription/index.ts`

- [x] In the POST handler, add routing for `subscriptionMethod === "caseName"` → redirect to `/case-name-search`
- [x] In the POST handler, add routing for `subscriptionMethod === "caseReference"` → redirect to `/case-reference-search`
- [x] Update the `add-email-subscription` unit test to cover the two new redirect cases

### New page: `case-name-search`

- [x] Create `libs/verified-pages/src/pages/case-name-search/en.ts` with all content keys from the plan
- [x] Create `libs/verified-pages/src/pages/case-name-search/cy.ts` with Welsh translations (use English as placeholder where translation is pending)
- [x] Create `libs/verified-pages/src/pages/case-name-search/index.ts`:
  - GET: render form, repopulate `caseName` value from `req.session.emailSubscriptions.caseNameSearch`
  - POST: validate non-empty; call `searchByCaseName`; on no results re-render with error; on results store in session and redirect to `/case-search-results`
- [x] Create `libs/verified-pages/src/pages/case-name-search/index.njk` using `govukInput`, `govukButton`, `govukErrorSummary`, `govukBackLink`
- [x] Create `libs/verified-pages/src/pages/case-name-search/index.test.ts` covering GET render, POST empty validation, POST no-results error, POST success redirect

### New page: `case-reference-search`

- [x] Create `libs/verified-pages/src/pages/case-reference-search/en.ts`
- [x] Create `libs/verified-pages/src/pages/case-reference-search/cy.ts`
- [x] Create `libs/verified-pages/src/pages/case-reference-search/index.ts`:
  - GET: render form, repopulate from `req.session.emailSubscriptions.caseReferenceSearch`
  - POST: validate non-empty; call `searchByCaseNumber`; on no results re-render with error; on results store in session and redirect to `/case-search-results`
- [x] Create `libs/verified-pages/src/pages/case-reference-search/index.njk`
- [x] Create `libs/verified-pages/src/pages/case-reference-search/index.test.ts` covering GET render, POST empty validation, POST no-results error, POST success redirect

### New page: `case-search-results`

- [x] Create `libs/verified-pages/src/pages/case-search-results/en.ts`
- [x] Create `libs/verified-pages/src/pages/case-search-results/cy.ts`
- [x] Create `libs/verified-pages/src/pages/case-search-results/index.ts`:
  - GET: read `caseSearchResults` from session; if missing redirect to `searchSource || '/add-email-subscription'`; render results table as radio buttons
  - POST: validate a radio is selected; parse composite value; store `pendingCaseSubscription` in session; redirect to `/pending-subscriptions`
- [x] Create `libs/verified-pages/src/pages/case-search-results/index.njk` — fieldset + legend wrapping a table with radio inputs, Case name and Reference number columns, Continue button
- [x] Create `libs/verified-pages/src/pages/case-search-results/index.test.ts` covering GET with missing session (redirect), GET with results (render), POST no selection (error), POST valid selection (redirect to `/pending-subscriptions`)

### Updated page: `pending-subscriptions`

- [x] Update `libs/verified-pages/src/pages/pending-subscriptions/index.ts` GET handler to check for `pendingCaseSubscription` in session; if present and `pendingSubscriptions` is empty, pass `confirmButtonLabel: t.confirmSubscription` to the template
- [x] Update the POST confirm handler in `pending-subscriptions/index.ts` to: if `pendingCaseSubscription` is present, call `createCaseSubscription`; catch Prisma `P2002` and re-render with duplicate error; on success clear `pendingCaseSubscription` from session and redirect to `/subscription-confirmed`
- [x] Add `confirmSubscription` content key ("Confirm subscription" / "Cadarnhewch tanysgrifiad") to `pending-subscriptions/en.ts` and `cy.ts`
- [x] Update `libs/verified-pages/src/pages/pending-subscriptions/index.test.ts` to cover: GET with pending case and no location subscriptions (button label changes), POST confirm with case subscription (saves to DB, redirects to `/subscription-confirmed`), POST confirm with duplicate case subscription (re-renders with error)

### Notification fulfillment — `libs/notifications/src/notification/subscription-queries.ts`

- [x] Add `findActiveSubscriptionsByCaseNumber(caseNumber: string)` — queries subscriptions where `searchType = 'CASE_NUMBER'` and `searchValue = caseNumber`, includes user email
- [ ] Update the notification service to call `findActiveSubscriptionsByCaseNumber` when processing an ingested artefact that has a matching `case_number` in `artefact_search`
- [x] Add unit tests for the new query in `libs/notifications/src/notification/subscription-queries.test.ts`

### Verification

- [x] Run `yarn test` from the root to confirm all unit tests pass
- [ ] Run `yarn lint:fix` to resolve any Biome warnings
- [ ] Manually test the full case name journey end-to-end
- [ ] Manually test the full case reference journey end-to-end
- [ ] Verify newly added subscription appears immediately in `subscription-management` tabs
- [ ] Verify Welsh translations render correctly on all new pages (`?lng=cy`)
- [ ] Create E2E test `e2e-tests/case-subscription.spec.ts` covering:
  - "user can subscribe to a case by name @nightly" — full journey including empty validation, no-results error, results page selection, pending-subscriptions confirm with "Confirm subscription" button, redirect to `/subscription-confirmed`, subscription visible in management page; inline Welsh check and axe accessibility scan
  - "user can subscribe to a case by reference number @nightly" — full journey including empty validation, no-match error, results page selection, pending-subscriptions confirm, redirect to `/subscription-confirmed`; inline Welsh check and axe accessibility scan
