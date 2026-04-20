# Technical Plan: Issue #510 — Subscribe by case name or case reference number

## Branch

Branch from: `feature/VIBE-316-refactor-artefact-search-extraction-subscription`

---

## Overview

Extend the CaTH subscription system so verified media users can subscribe to hearing notifications by case name or case reference number. This adds two new `searchType` values (`CASE_NAME`, `CASE_NUMBER`) alongside the existing `LOCATION_ID` type, a new subscription-add gateway page, and five new case-subscription pages.

---

## Database changes

### `libs/subscriptions/prisma/schema.prisma`

Add two nullable columns to the `Subscription` model:

```prisma
caseName   String?  @map("case_name")
caseNumber String?  @map("case_number")
```

New `searchType` values in use: `CASE_NAME`, `CASE_NUMBER` (stored as VarChar(50), unchanged column type).

Run `yarn db:migrate:dev` to generate and apply the migration.

---

## Query changes — `libs/subscriptions/src/repository/queries.ts`

Four new query functions:

**`searchByCaseName(term: string)`**
- Queries `artefact_search` WHERE `case_name` ILIKE `%term%`
- LIMIT 50
- Returns `Array<{ caseName: string; caseNumber: string | null }>`

**`searchByCaseNumber(reference: string)`**
- Queries `artefact_search` WHERE `case_number` = reference (exact match)
- Returns `Array<{ caseName: string; caseNumber: string | null }>`

**`createCaseSubscriptionRecord(userId, searchType, searchValue, caseName, caseNumber)`**
- Creates a `Subscription` row with the new case fields populated
- `searchType` is `"CASE_NAME"` or `"CASE_NUMBER"`

**`findCaseSubscriptionsByUserId(userId)`**
- Finds subscriptions WHERE `searchType IN ('CASE_NAME', 'CASE_NUMBER')` for the given userId

---

## Service changes — `libs/subscriptions/src/repository/service.ts`

**`createCaseSubscription(userId, searchType, searchValue, caseName, caseNumber)`**
- Validates no duplicate (catch Prisma P2002 error and surface it cleanly)
- Calls `createCaseSubscriptionRecord`

**`getCaseSubscriptionsByUserId(userId, locale)` (implements existing stub)**
- Calls `findCaseSubscriptionsByUserId`
- Maps rows to `CaseSubscriptionDto`

**`CaseSubscriptionDto` interface (in service.ts, not a separate types file):**
```typescript
interface CaseSubscriptionDto {
  subscriptionId: string;
  caseName: string | null;
  caseNumber: string | null;
  dateAdded: Date;
}
```

---

## Session extensions

Added to the existing `emailSubscriptions` namespace in `req.session`:

```typescript
caseSearchResults?: Array<{ caseName: string; caseNumber: string | null }>;
pendingCaseSubscription?: {
  searchType: "CASE_NAME" | "CASE_NUMBER";
  searchValue: string;
  caseName: string;
  caseNumber: string | null;
};
caseSearchSource?: "/case-name-search" | "/case-reference-search";
```

---

## New pages — `libs/verified-pages/src/pages/`

All pages follow the standard controller pattern:
```typescript
export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
```

### `subscription-add/` — gateway page

**GET**: Renders a radio group with three options.

**POST**: Validates a selection is made. On failure re-renders with error "Select how you want to add an email subscription." On success redirects:
- `LOCATION` → `/location-name-search`
- `CASE_NAME` → `/case-name-search`
- `CASE_NUMBER` → `/case-reference-search`

### `case-name-search/`

**GET**: Renders a text input. Repopulates from `req.session.emailSubscriptions.caseSearchResults` input if present.

**POST**: Validates input is not empty (error: "Enter a case name"). Calls `searchByCaseName`. If no results, re-renders with "No results found" inset. If results found, stores in `session.emailSubscriptions.caseSearchResults`, sets `caseSearchSource` to `"/case-name-search"`, redirects to `/case-search-results`.

### `case-reference-search/`

**GET**: Renders a text input.

**POST**: Validates input is not empty (error: "Enter reference number"). Calls `searchByCaseNumber`. If no results, re-renders with "No matching case found" inset. If results found, stores in session, sets `caseSearchSource` to `"/case-reference-search"`, redirects to `/case-search-results`.

### `case-search-results/`

**GET**: Reads `session.emailSubscriptions.caseSearchResults`. If missing, redirects back to `caseSearchSource` (or `/case-name-search` as fallback).

Renders a table with two columns (Case name | Reference number) and a radio button per row.

**POST**: Validates a radio is selected (error: "Select a case"). Stores `pendingCaseSubscription` in session from the selected row. Redirects to `/case-subscription-confirm`.

### `case-subscription-confirm/`

**GET**: Reads `pendingCaseSubscription` from session. If missing, redirects to `/subscription-management`. Renders a summary list showing the case name and/or reference number to be subscribed to.

**POST**: Calls `createCaseSubscription`. Catches Prisma P2002 (unique constraint) and re-renders with an appropriate duplicate error message. On success, clears `pendingCaseSubscription` from session, redirects to `/case-subscription-confirmed`.

### `case-subscription-confirmed/`

**GET only**: Renders a GOV.UK panel with heading "Subscription added" and body "Your email subscription has been added." Includes a link to `/subscription-management`.

---

## Updated page — `subscription-management/`

**GET handler changes:**
- Call both `getCaseSubscriptionsByUserId` and `getCourtSubscriptionsByUserId` (existing)
- Read `?tab` query param: `"all"` (default), `"case"`, `"court"`
- Pass tab state and both lists to template

**Template changes:**
- Change "Add email subscription" button/link target from `/location-name-search` to `/subscription-add`
- Add three tab links: "All subscriptions", "Subscriptions by case", "Subscription by court or tribunal" with counts
- Render tables conditionally based on active tab
- If no subscriptions at all, show "You do not have any active subscriptions"

---

## Routing table

| Path | Methods | Page directory |
|------|---------|----------------|
| `/subscription-management` | GET | `subscription-management/` (updated) |
| `/subscription-add` | GET, POST | `subscription-add/` (new) |
| `/case-name-search` | GET, POST | `case-name-search/` (new) |
| `/case-reference-search` | GET, POST | `case-reference-search/` (new) |
| `/case-search-results` | GET, POST | `case-search-results/` (new) |
| `/case-subscription-confirm` | GET, POST | `case-subscription-confirm/` (new) |
| `/case-subscription-confirmed` | GET | `case-subscription-confirmed/` (new) |

No changes to `apps/web/src/app.ts` are required — pages are auto-discovered from the `pages/` directory.

---

## Welsh translations

Translations with confirmed Welsh text from the issue:

| Key | EN | CY |
|-----|----|----|
| pageTitle (subscription-management) | Your email subscriptions | Eich tanysgrifiadau e-bost |
| addSubscriptionButton | Add email subscription | Ychwanegu tanysgrifiad e-bost |
| tabAll | All subscriptions | Pob tanysgrifiad |
| tabCase | Subscriptions by case | Tanysgrifio yn ôl achos |
| tabCourt | Subscription by court or tribunal | Tanysgrifio yn ôl llys neu dribiwnlys |
| noSubscriptions | You do not have any active subscriptions | Nid oes gennych unrhyw danysgrifiadau gweithredol |
| addSubscriptionHeading (subscription-add) | How do you want to add an email subscription? | Sut ydych chi eisiau ychwanegu tanysgrifiad e-bost? |
| publishedInfoHint | You can only search for information that is currently published. | Gallwch ond chwilio am wybodaeth sydd eisoes wedi'i chyhoeddi |
| optionCourt | By court or tribunal name | [WELSH TRANSLATION REQUIRED] |
| optionCaseName | By case name | [WELSH TRANSLATION REQUIRED] |
| optionCaseRef | By case reference number, case ID or unique reference number (URN) | [WELSH TRANSLATION REQUIRED] |
| validationSelectOption (subscription-add) | Select how you want to add an email subscription. | Dewiswch Sut ydych chi eisiau ychwanegu tanysgrifiad e-bost? |
| pageHeading (case-name-search) | By case name | Yn ôl enw'r achos |
| caseNameLabel | Case name | Enw'r Achos |
| validationCaseName | Enter a case name | [WELSH TRANSLATION REQUIRED] |
| noResults (case-name-search) | No results found | [WELSH TRANSLATION REQUIRED] |
| pageHeading (case-reference-search) | By case reference number, case ID or unique reference number (URN) | Yn ôl enw'r achos, Yn ôl cyfeirnod yr achos, ID yr achos neu gyfeirnod unigryw (URN) |
| referenceLabel | Reference number | Cyfeirnod |
| validationReference | Enter reference number | Rhowch gyfeirnod achos dilys |
| noResults (case-reference-search) | No matching case found | [WELSH TRANSLATION REQUIRED] |
| pageHeading (case-search-results) | Select a case | Dewiswch yr achos |
| columnCaseName | Case name | Enw'r Achos |
| columnCaseRef | Reference number | Cyfeirnod yr Achos |
| pageHeading (case-subscription-confirm) | Confirm email subscription | Cadarnhewch tanysgrifiadau e-bost |
| confirmButton | Confirm | Cadarnhewch |
| pageHeading (case-subscription-confirmed) | Subscription added | tanysgrifiadau wedi'i ychwanegu |
| confirmationBody | Your email subscription has been added. | Eich tanysgrifiadau e-bost wedi'i ychwanegu |

Items marked `[WELSH TRANSLATION REQUIRED]` must be provided by the content designer before the page can go live. Use the English text as a placeholder in `cy.ts` files with a `// TODO: Welsh translation required` comment.

---

## Open questions

1. **Party name column**: The acceptance criteria mention a "Party name" results column but `artefact_search` has no `party_name` field. This plan omits it. If required, `artefact_search` schema must be extended and a separate ticket raised.

2. **CASE_NAME notification fulfillment**: The issue specifies CASE_NUMBER matching at notification time but is silent on CASE_NAME. Assumption: when a CASE_NAME subscription is created the matching `caseNumber` (if present) is also stored and used for notification matching. Needs confirmation from the product owner.

3. **Feature branch availability**: This ticket branches from `feature/VIBE-316-refactor-artefact-search-extraction-subscription`. Confirm this branch is available and up to date before starting.

4. **artefact_search scope**: Case name search queries all published artefacts across all courts. If scoping per court is required this is a breaking change to the query.

5. **Entry point change**: Changing the "Add email subscription" button target from `/location-name-search` to `/subscription-add` alters the existing location subscription journey. QA must regression-test the location subscription flow via the new gateway.
