# #744: Update Verified User Case Subscription Search Screen

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** None
**Created:** 2026-06-18T11:44:54Z
**Updated:** 2026-06-19T16:07:25Z

## Description

**PROBLEM STATEMENT**
We need to remove the party information from the search result of case name and reference number search. We also need to update the search functionality when user searches by case name and reference number.

**ACCEPTANCE CRITERIA**
- Search for case name is showing correct results
- Search for case reference number is showing correct results
- Subscription email is containing correct information
- Party information has been removed from search results

## Comments

### Comment by OgechiOkelu on 2026-06-19T16:01:45Z
@spec

### Comment by hmctsclaudecode on 2026-06-19T16:06:40Z
# Technical Specification — Issue #744: Update Verified User Case Subscription Search Screen

## 1. User Story
**As a** verified user of the Court and Tribunal Hearings service
**I want to** search for a case by case name or case reference number and see only the case name and reference number in the results
**So that** I can select the correct case to subscribe to without being confused or misled by party (claimant/respondent) information, and receive accurate subscription confirmation emails.

## 2. Background

Verified users can subscribe to email updates for a specific case via the existing journey that begins at `/add-email-subscription`. They choose to search **by case name** or **by case reference number**, the service queries published artefacts, and the matching cases are listed on the **Subscription case search results** screen (`/case-search-results`) for selection.

Two problems exist today:

1. **Party information leaks into the results.** Search results are sourced from the `artefact_search` table, which is populated by `extractAndStoreArtefactSearch` (`libs/publication/src/artefact-search-extractor.ts`). The fields it extracts are driven per list type by `ListSearchConfig` (`case_name_field_name`, `case_number_field_name`). Where the configured `caseNameFieldName` points at a party-derived field, the "Case name" column on the results screen (and the `caseName` persisted to the subscription, and the `case` parameter in the confirmation email) ends up containing party names rather than the case name. Party information must not be presented in the search results.

2. **Search is returning incorrect results.** Case name search (`searchByCaseName`) and case reference search (`searchByCaseNumber`) in `libs/subscriptions/src/repository/queries.ts` need to return the correct matches for the values the user enters.

Relevant existing code:
- Controllers: `apps/web/src/pages/(verified)/case-name-search/index.ts`, `.../case-reference-search/index.ts`, `.../case-search-results/index.ts`
- Results template: `apps/web/src/pages/(verified)/case-search-results/index.njk`
- Search queries: `libs/subscriptions/src/repository/queries.ts` (`searchByCaseName`, `searchByCaseNumber`)
- Artefact search ingestion: `libs/publication/src/artefact-search-extractor.ts`
- Search field config: `libs/postgres-prisma/prisma/schema/list-search-config.prisma`
- Subscription model: `libs/postgres-prisma/prisma/schema/subscription.prisma`
- Email parameter build: `libs/notifications/src/notification/notification-service.ts` (`formatCaseValue`) and `libs/notifications/src/govnotify/template-config.ts` (`buildTemplateParameters`, `case` param)

This is a remediation of an existing feature, not a new page. No new routes are introduced.

## 3. Acceptance Criteria

* **Scenario:** Case name search returns correct results
    * **Given** I am a signed-in verified user on `/case-name-search`
    * **When** I enter a valid case name of at least 3 characters that matches a currently published artefact
    * **Then** I am taken to `/case-search-results` and shown every matching case, each displaying its case name and reference number

* **Scenario:** Case reference number search returns correct results
    * **Given** I am a signed-in verified user on `/case-reference-search`
    * **When** I enter an exact case reference number, case ID or URN that matches a published artefact
    * **Then** I am taken to `/case-search-results` and shown the matching case(s) with case name and reference number

* **Scenario:** Party information is not shown in search results
    * **Given** I have run a case name or case reference search that returns results
    * **When** the results are displayed on `/case-search-results`
    * **Then** only the case name and reference number are shown, and no party (claimant, respondent, applicant, defendant or other party) name appears in any column or in the persisted case name value

* **Scenario:** Subscription confirmation email contains correct information
    * **Given** I have selected one or more cases and confirmed my subscription
    * **When** a relevant publication triggers a notification email
    * **Then** the email's case value contains the correct case name and/or reference number and contains no party information

* **Scenario:** No matching results
    * **Given** I am on `/case-name-search` or `/case-reference-search`
    * **When** I enter a value that matches no currently published case
    * **Then** I remain on the search page and see the error "There is nothing matching your criteria"

## 4. Open Questions (from spec)

* **Where party data currently enters the results.** The exact list type(s) and field mapping(s) at fault must be confirmed before implementation.
* **Backfill of existing data.** Confirm whether a one-off backfill/re-ingestion job is in scope, or whether correction on next publication is acceptable.
* **Definition of "correct results".** Confirm the specific failing inputs/expected outputs (partial vs exact matching, case sensitivity, display-window behaviour).
* **Display-window parity for reference search.** `searchByCaseName` filters to artefacts within `displayFrom`/`displayTo`; `searchByCaseNumber` does not. Confirm whether reference search should also be restricted to currently-published artefacts.
* **Existing subscriptions.** Confirm whether `subscription` rows already created with party-derived `caseName`/`searchValue` need correcting.
* **No schema change anticipated.** Confirm this work is limited to configuration, extraction logic, query logic, and verification.

### Comment by OgechiOkelu on 2026-06-19T16:07:25Z
@plan
