# Tasks: Issue #510 — Subscribe by case name or case reference number

## Prerequisites

- [ ] Confirm feature branch `feature/VIBE-316-refactor-artefact-search-extraction-subscription` is available and up to date
- [ ] Confirm open questions 1 and 2 from plan.md with product owner (party name column, CASE_NAME fulfillment)
- [ ] Obtain missing Welsh translations from content designer (items marked [WELSH TRANSLATION REQUIRED] in plan.md)

## Database

- [ ] Add `caseName` and `caseNumber` nullable fields to `Subscription` model in `libs/subscriptions/prisma/schema.prisma`
- [ ] Run `yarn db:migrate:dev` to generate and apply the migration
- [ ] Run `yarn db:generate` to regenerate the Prisma client

## Queries — `libs/subscriptions/src/repository/queries.ts`

- [ ] Add `searchByCaseName(term: string)` — queries `artefact_search` WHERE `case_name` ILIKE `%term%` LIMIT 50
- [ ] Add `searchByCaseNumber(reference: string)` — queries `artefact_search` WHERE `case_number` = reference
- [ ] Add `createCaseSubscriptionRecord(userId, searchType, searchValue, caseName, caseNumber)`
- [ ] Add `findCaseSubscriptionsByUserId(userId)` — filters to `searchType IN ('CASE_NAME', 'CASE_NUMBER')`

## Service — `libs/subscriptions/src/repository/service.ts`

- [ ] Add `CaseSubscriptionDto` interface (colocated in service.ts)
- [ ] Add `createCaseSubscription(userId, searchType, searchValue, caseName, caseNumber)` with P2002 duplicate handling
- [ ] Implement `getCaseSubscriptionsByUserId(userId, locale)` replacing the existing stub

## Session types

- [ ] Extend the `emailSubscriptions` session namespace with `caseSearchResults`, `pendingCaseSubscription`, and `caseSearchSource` fields

## New page: `subscription-add`

- [ ] Create `libs/verified-pages/src/pages/subscription-add/en.ts`
- [ ] Create `libs/verified-pages/src/pages/subscription-add/cy.ts`
- [ ] Create `libs/verified-pages/src/pages/subscription-add/index.ts` (GET and POST with middleware chain)
- [ ] Create `libs/verified-pages/src/pages/subscription-add/index.njk` (radio group, error summary)
- [ ] Write unit tests in `libs/verified-pages/src/pages/subscription-add/index.test.ts`

## New page: `case-name-search`

- [ ] Create `libs/verified-pages/src/pages/case-name-search/en.ts`
- [ ] Create `libs/verified-pages/src/pages/case-name-search/cy.ts`
- [ ] Create `libs/verified-pages/src/pages/case-name-search/index.ts` (GET and POST with validation, session storage, and search call)
- [ ] Create `libs/verified-pages/src/pages/case-name-search/index.njk` (text input, no-results inset, error summary)
- [ ] Write unit tests in `libs/verified-pages/src/pages/case-name-search/index.test.ts`

## New page: `case-reference-search`

- [ ] Create `libs/verified-pages/src/pages/case-reference-search/en.ts`
- [ ] Create `libs/verified-pages/src/pages/case-reference-search/cy.ts`
- [ ] Create `libs/verified-pages/src/pages/case-reference-search/index.ts` (GET and POST with validation, session storage, and search call)
- [ ] Create `libs/verified-pages/src/pages/case-reference-search/index.njk` (text input, no-results inset, error summary)
- [ ] Write unit tests in `libs/verified-pages/src/pages/case-reference-search/index.test.ts`

## New page: `case-search-results`

- [ ] Create `libs/verified-pages/src/pages/case-search-results/en.ts`
- [ ] Create `libs/verified-pages/src/pages/case-search-results/cy.ts`
- [ ] Create `libs/verified-pages/src/pages/case-search-results/index.ts` (GET with session guard and redirect, POST with radio validation)
- [ ] Create `libs/verified-pages/src/pages/case-search-results/index.njk` (results table with radio per row, error summary)
- [ ] Write unit tests in `libs/verified-pages/src/pages/case-search-results/index.test.ts`

## New page: `case-subscription-confirm`

- [ ] Create `libs/verified-pages/src/pages/case-subscription-confirm/en.ts`
- [ ] Create `libs/verified-pages/src/pages/case-subscription-confirm/cy.ts`
- [ ] Create `libs/verified-pages/src/pages/case-subscription-confirm/index.ts` (GET with session guard, POST calling createCaseSubscription with P2002 handling)
- [ ] Create `libs/verified-pages/src/pages/case-subscription-confirm/index.njk` (summary list, confirm button)
- [ ] Write unit tests in `libs/verified-pages/src/pages/case-subscription-confirm/index.test.ts`

## New page: `case-subscription-confirmed`

- [ ] Create `libs/verified-pages/src/pages/case-subscription-confirmed/en.ts`
- [ ] Create `libs/verified-pages/src/pages/case-subscription-confirmed/cy.ts`
- [ ] Create `libs/verified-pages/src/pages/case-subscription-confirmed/index.ts` (GET only)
- [ ] Create `libs/verified-pages/src/pages/case-subscription-confirmed/index.njk` (GOV.UK panel, link to /subscription-management)
- [ ] Write unit tests in `libs/verified-pages/src/pages/case-subscription-confirmed/index.test.ts`

## Updated page: `subscription-management`

- [ ] Update GET handler to call both `getCaseSubscriptionsByUserId` and `getCourtSubscriptionsByUserId`
- [ ] Add `?tab` query param handling (all / case / court) with default of all
- [ ] Update template: change "Add email subscription" link target to `/subscription-add`
- [ ] Update template: add three tab links with counts
- [ ] Update template: render case subscriptions table conditionally by tab
- [ ] Update template: show "You do not have any active subscriptions" when both lists are empty
- [ ] Update unit tests for subscription-management GET handler

## E2E test

- [ ] Write E2E test in `e2e-tests/tests/` covering the full case name subscription journey (includes validation, Welsh, accessibility, and success confirmation)
- [ ] Write E2E test covering the case reference number subscription journey

## QA / regression

- [ ] Verify the location subscription journey still works end-to-end via the new `/subscription-add` gateway
- [ ] Verify duplicate subscription error is surfaced correctly on `/case-subscription-confirm`
- [ ] Verify Welsh language (`?lng=cy`) on all new pages
- [ ] Verify tab filtering on `/subscription-management` with mixed location and case subscriptions
