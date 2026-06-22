# #762: Update Verified User Case Subscription Search Screen

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** None
**Created:** 2026-06-22T08:52:40Z
**Updated:** 2026-06-22T10:37:36Z

## Description

**PROBLEM STATEMENT**

We need to remove the party information from the search result of case name and reference number search. We also need to update the search functionality when user searches by case name and reference number.

**ACCEPTANCE CRITERIA**

Search for case name is showing correct results
Search for case reference number is showing correct results
Subscription email is containing correct information
Party information has been removed from search results for both case name and case reference searches

## Comments

### Comment by OgechiOkelu on 2026-06-22T09:36:54Z
@spec

### Comment by hmctsclaudecode on 2026-06-22T09:42:15Z
# Technical Specification: Update Verified User Case Subscription Search Screen

> GitHub Issue #762 — Update Verified User Case Subscription Search Screen

## 1. User Story
**As a** verified user of the Court and Tribunal Hearings service
**I want to** search for a case by its name or reference number and see clean, accurate results that identify each case only by its name and reference number
**So that** I can reliably subscribe to the correct case updates and receive a subscription email that contains the correct case information, without being shown party information I do not need.

## 2. Background
Verified users can subscribe to email updates for specific cases. They reach the search via `/add-email-subscription`, then choose to search either by case **name** (`/case-name-search`) or by case **reference number** (`/case-reference-search`). Matching cases are listed on the case search results screen (`/case-search-results`), where the user selects one or more cases to subscribe to. Selections flow through `/pending-subscriptions` and `/subscription-confirmation-preview` before being written to the database, after which a confirmation email is sent.

Two problems are being addressed:

1. **Party information must not appear in the case search journey.** Party/applicant data is no longer wanted in the search results or anywhere in the verified subscription-by-case screens. The `subscription-management` content files still carry an unused `tableHeaderPartyName` ("Party name(s)") key, and the email case summary still injects an "Applicant" (party) field — both must be removed so party data is consistently absent.
2. **Case name and case reference searches must return correct results.** The two search queries are currently implemented inconsistently, which produces incorrect or stale results for reference-number searches (see Section 6).

Relevant existing code:
- Search UI controllers/templates: `apps/web/src/pages/(verified)/case-name-search/`, `apps/web/src/pages/(verified)/case-reference-search/`, `apps/web/src/pages/(verified)/case-search-results/`
- Subscription management UI: `apps/web/src/pages/(verified)/subscription-management/`
- Search queries: `libs/subscriptions/src/repository/queries.ts` (`searchByCaseName`, `searchByCaseNumber`)
- Searchable data model: `ArtefactSearch` (`libs/postgres-prisma/prisma/schema/base.prisma`) — stores only `caseNumber` and `caseName`
- Subscription email case summary: `libs/list-types/civil-and-family-daily-cause-list/src/email-summary/summary-builder.ts` and `libs/list-types/daily-cause-list-common/src/email-summary/party-extractor.ts`

### Comment by OgechiOkelu on 2026-06-22T10:37:35Z
@plan
