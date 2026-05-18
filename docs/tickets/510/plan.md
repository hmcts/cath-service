# Technical Plan — Issue #510: Subscribe by case name, case reference number, case ID or URN

## 1. Technical Approach

The feature extends the existing subscription system to support subscriptions by case name and case reference number (including case ID and URN). The majority of the UI scaffolding already exists — the `subscription-management` page already renders the tab layout and the `add-email-subscription` page already presents all three radio options. The core work is:

1. Extending the `subscription` database table with `case_name` and `case_number` display columns.
2. Adding artefact search queries to `libs/subscriptions` so the search pages can query the `artefact_search` table.
3. Implementing the `getCaseSubscriptionsByUserId` stub in `libs/subscriptions`.
4. Adding `createCaseSubscription` to `libs/subscriptions`.
5. Creating three new page controllers and templates for the case subscription journey.
6. Updating the existing `add-email-subscription` POST handler to route to the new pages.
7. Extending the session type to hold case search wizard state.
8. Adding a `CASE_NUMBER` fulfillment query to `libs/notifications`.

### Architecture decisions

- **Gateway page**: The existing `/add-email-subscription` page (`libs/verified-pages/src/pages/add-email-subscription/`) is functionally identical to the `/subscription-add` page described in the spec. It already has all three radio options and Welsh translations. Rather than creating a duplicate page, the existing page's POST handler is updated to redirect to `/case-name-search` and `/case-reference-search`. The `subscription-management` template already links to `/add-email-subscription` — no button href change is needed.

- **Artefact search queries**: The `ArtefactSearch` model already exists in `apps/postgres/prisma/schema.prisma` and is accessible via `prisma.artefactSearch` through `@hmcts/postgres`. The search query functions belong in `libs/subscriptions/src/repository/queries.ts` alongside the existing subscription queries, keeping the data access for the subscription domain co-located.

- **Session wizard state**: New case-specific fields are added to the existing `emailSubscriptions` session namespace in `libs/verified-pages/src/session.ts`, consistent with the existing pattern.

- **Notification fulfillment**: A new query `findActiveSubscriptionsByCaseNumber` is added to `libs/notifications/src/notification/subscription-queries.ts`. The notification service will need updating to invoke this query when an artefact with a matching `case_number` is ingested.

- **Party name column**: The `subscription-management` template already has a `tableHeaderPartyName` column. The `artefact_search` table has no `party_name` field, so the `CaseSubscriptionDto` will not include a `partyName` property and that column will render empty. The template will not be changed — this is an acceptable gap pending a future schema extension.

- **Search result limit**: `searchByCaseName` will apply a `take: 50` limit to prevent unbounded result sets.

---

## 2. Implementation Details

### File structure
that we do not need 
**Modified files:**

```
libs/subscriptions/
  prisma/schema.prisma                          # Add caseName, caseNumber to Subscription
  src/repository/queries.ts                     # Add artefact search + case subscription queries
  src/repository/service.ts                     # Implement getCaseSubscriptionsByUserId, add createCaseSubscription

libs/notifications/
  src/notification/subscription-queries.ts      # Add findActiveSubscriptionsByCaseNumber

libs/verified-pages/
  src/session.ts                                # Extend emailSubscriptions session type
  src/pages/add-email-subscription/index.ts     # Update POST to route caseName/caseReference
  src/pages/pending-subscriptions/index.ts      # Update confirm logic to handle case subscriptions + conditional button label
```

**New files:**

```
libs/verified-pages/src/pages/
  case-name-search/
    index.ts
    index.njk
    en.ts
    cy.ts
    index.test.ts
  case-reference-search/
    index.ts
    index.njk
    en.ts
    cy.ts
    index.test.ts
  case-search-results/
    index.ts
    index.njk
    en.ts
    cy.ts
    index.test.ts
```

### Database schema change

Add two nullable columns to the `Subscription` model in `libs/subscriptions/prisma/schema.prisma`:

```prisma
model Subscription {
  subscriptionId String    @id @default(uuid()) @map("subscription_id") @db.Uuid
  userId         String    @map("user_id") @db.Uuid
  searchType     String    @map("search_type") @db.VarChar(50)
  searchValue    String    @map("search_value")
  caseName       String?   @map("case_name")
  caseNumber     String?   @map("case_number")
  dateAdded      DateTime  @default(now()) @map("date_added")

  user                  User                   @relation(fields: [userId], references: [userId], onDelete: Cascade, onUpdate: Cascade)
  notificationAuditLogs NotificationAuditLog[]

  @@unique([userId, searchType, searchValue], name: "unique_user_subscription")
  @@index([userId], name: "idx_subscription_user")
  @@index([searchType, searchValue], name: "idx_subscription_search")
  @@map("subscription")
}
```

Run `yarn db:migrate:dev` after the schema change.

### New query functions — `libs/subscriptions/src/repository/queries.ts`

```typescript
// Search artefact_search by case name (partial match, case-insensitive), limit 50
export async function searchByCaseName(term: string): Promise<CaseSearchResult[]>

// Search artefact_search by case number (exact match)
export async function searchByCaseNumber(reference: string): Promise<CaseSearchResult[]>

// Create a subscription record with case display fields
export async function createCaseSubscriptionRecord(
  userId: string,
  searchType: string,
  searchValue: string,
  caseName: string,
  caseNumber: string | null
): Promise<Subscription>

// Find case subscriptions for a user
export async function findCaseSubscriptionsByUserId(userId: string): Promise<Subscription[]>
```

`CaseSearchResult` type (co-located in queries.ts):
```typescript
interface CaseSearchResult {
  caseNumber: string | null;
  caseName: string | null;
}
```

### New / updated service functions — `libs/subscriptions/src/repository/service.ts`

Replace the stub:
```typescript
export async function getCaseSubscriptionsByUserId(userId: string, _locale = "en"): Promise<CaseSubscriptionDto[]>
```

New function:
```typescript
export async function createCaseSubscription(
  userId: string,
  searchType: "CASE_NAME" | "CASE_NUMBER",
  searchValue: string,
  caseName: string,
  caseNumber: string | null
): Promise<void>
```

`CaseSubscriptionDto` type (co-located in service.ts):
```typescript
interface CaseSubscriptionDto {
  subscriptionId: string;
  caseName: string | null;
  caseNumber: string | null;
  dateAdded: Date;
}
```

### Session type extension — `libs/verified-pages/src/session.ts`

```typescript
declare module "express-session" {
  interface SessionData {
    emailSubscriptions: {
      // existing fields...
      caseNameSearch?: string;
      caseReferenceSearch?: string;
      caseSearchResults?: CaseSearchResult[];
      searchSource?: "/case-name-search" | "/case-reference-search";
      pendingCaseSubscription?: {
        caseName: string;
        caseNumber: string | null;
        searchType: "CASE_NAME" | "CASE_NUMBER";
        searchValue: string;
      };
    };
  }
}
```

`CaseSearchResult` needs to be imported or inlined here from the subscriptions lib. Since session.ts is a module declaration file, use a local interface definition to avoid cross-module type dependencies at declaration level.

### New page: `case-name-search`

- GET: Render text input. Repopulate from `req.session.emailSubscriptions.caseNameSearch` if set.
- POST: Validate non-empty. Call `searchByCaseName`. If no results, re-render with error. If results found, store in `req.session.emailSubscriptions.caseSearchResults`, store `searchSource: '/case-name-search'` and `caseNameSearch` value, redirect to `/case-search-results`.

### New page: `case-reference-search`

- GET: Render text input. Repopulate from `req.session.emailSubscriptions.caseReferenceSearch` if set.
- POST: Validate non-empty. Call `searchByCaseNumber`. If no results, re-render with error. If results found, store in session, store `searchSource: '/case-reference-search'`, redirect to `/case-search-results`.

### New page: `case-search-results`

- GET: Read `caseSearchResults` from session. If missing, redirect to `req.session.emailSubscriptions.searchSource || '/add-email-subscription'`. Render table of results as radio buttons.
- POST: Validate a radio is selected. Parse selected value (encoded as `caseName|||caseNumber`). Store `pendingCaseSubscription` in session with `searchType` derived from `searchSource`. Redirect to `/pending-subscriptions`.

The composite radio value `caseName|||caseNumber` uses a delimiter unlikely to appear in court data. The `searchType` stored on `pendingCaseSubscription` is determined from `req.session.emailSubscriptions.searchSource`: if source is `/case-name-search`, `searchType = "CASE_NAME"` and `searchValue = caseName`; if source is `/case-reference-search`, `searchType = "CASE_NUMBER"` and `searchValue = caseNumber`.

### Updated page: `pending-subscriptions`

The existing `/pending-subscriptions` page handles the confirm step for all subscription types:

- GET: Existing behaviour is unchanged for the location subscription display. Additionally check for `req.session.emailSubscriptions.pendingCaseSubscription`. If present and there are **no** pending location subscriptions (`pendingSubscriptions` is empty), render the confirm button with the label **"Confirm subscription"** instead of the existing location-subscription label.
- POST (confirm action): If `pendingCaseSubscription` is present in session, call `createCaseSubscription(userId, searchType, searchValue, caseName, caseNumber)` before (or instead of) the existing location subscription logic. Handle Prisma `P2002` unique constraint error by re-rendering with a duplicate error message. On success, clear `pendingCaseSubscription` from session and redirect to the existing `/subscription-confirmed` page.

### Notification fulfillment — `libs/notifications/src/notification/subscription-queries.ts`

Add:
```typescript
export async function findActiveSubscriptionsByCaseNumber(caseNumber: string): Promise<SubscriptionWithUser[]>
```

The notification service that processes ingested artefacts must be updated to call this query when an `ArtefactSearch` record with a `case_number` is created, then trigger emails via Gov Notify for each matched subscriber.

---

## 3. Error Handling & Edge Cases

- **Empty search input**: Validate in POST handlers before querying the database. Re-render with GOV.UK error summary and inline error.
- **No search results**: Run the query, check for empty array, re-render on the search page with the appropriate "No results found" / "No matching case found" error rather than redirecting to an empty results page.
- **Missing session data on GET**: `case-search-results` and `case-subscription-confirm` redirect away if their required session data is missing (prevents direct URL access mid-journey).
- **Duplicate subscription**: The database has a `unique_user_subscription` constraint on `(userId, searchType, searchValue)`. Catch Prisma `P2002` error in the confirm POST handler and re-render with a user-facing message rather than a 500.
- **Artefact search across multiple artefacts**: The same `case_number` may appear in multiple `ArtefactSearch` rows (one per artefact). Use `distinct` on `caseNumber`/`caseName` in `searchByCaseName` and `searchByCaseNumber` to avoid duplicate results on the results page.
- **Session expiry mid-journey**: No specific handling beyond the existing session middleware; missing session fields redirect the user back to an appropriate start page.

---

## 4. Acceptance Criteria Mapping

| Acceptance criterion | Implementation |
|---|---|
| Tab view: All / By case / By court | Already rendered in `subscription-management` template. `getCaseSubscriptionsByUserId` stub replaced with real query. |
| Case subscriptions table shows Case name, Reference number, Date added | `CaseSubscriptionDto` returns `caseName`, `caseNumber`, `dateAdded`. Template already has these columns. |
| Empty state message when no subscriptions | Already implemented in `subscription-management` template. |
| Add email subscription gateway with 3 radio options | Existing `add-email-subscription` page already has this. POST handler updated to route new options. |
| Validation: no radio selected | Already in `add-email-subscription`. |
| "By court or tribunal name" → `/location-name-search` | Already implemented. |
| "By case name" → case name search journey | New `case-name-search` page with full journey. |
| "By case reference number" → case reference journey | New `case-reference-search` page with full journey. |
| Validation: empty case name | POST handler on `case-name-search`. |
| "No results found" on case name | POST handler on `case-name-search` re-renders with error. |
| Search results page with selectable cases | `case-search-results` page with radio rows. |
| Confirm page shows selected case details | `pending-subscriptions` page reads `pendingCaseSubscription` from session; button label is "Confirm subscription" when no location subscriptions are pending. |
| Subscription saved and visible immediately | `createCaseSubscription` called on `pending-subscriptions` confirm POST; `subscription-management` reads from DB on next request. |
| Subscription fulfillment for CASE_NUMBER | New query in `libs/notifications`; notification service updated to invoke it. |
| Welsh translations on all pages | `cy.ts` files created for all new pages. |
| WCAG 2.2 AA | Standard GOV.UK macros used throughout; fieldset+legend wrapping radio buttons on results page. |

---

## 5. Clarifications Needed

**1. Gateway page URL conflict**
The spec describes a new `/subscription-add` page, but the existing `/add-email-subscription` page already implements the same gateway with all three radio options and Welsh translations. Updating the existing page avoids duplication. Confirm whether the URL must change to `/subscription-add` (which would require a redirect from the old URL and updating the `subscription-management` button href) or whether updating the existing `/add-email-subscription` POST handler is sufficient.

**2. Party name column on subscription management**
The `subscription-management` template already includes a "Party name(s)" column header for case subscriptions. The `artefact_search` table has no `party_name` field. The `CaseSubscriptionDto` will not populate this field and the column will render empty. Confirm whether the column should be removed from the template or left as a placeholder for a future data source.

**3. CASE_NAME subscription fulfillment**
The spec states `CASE_NUMBER` subscriptions trigger email notifications when a matching artefact is ingested. For `CASE_NAME` subscriptions, the user selected a specific case from search results, so the `caseNumber` value will typically be stored in the `caseNumber` column. Confirm whether `CASE_NAME` search-type subscriptions should also trigger notifications (using the stored `caseNumber` value for matching), or only `CASE_NUMBER` subscriptions do.

**4. Missing Welsh translations**
The following strings are placeholders in the ticket (marked "Welsh placeholder" or "[WELSH TRANSLATION REQUIRED]"). Implementation will use the English text with a `// TODO: Welsh translation required` comment until provided:
- "Enter a case name" validation error (cy)
- "No results found" (cy) — note: `Ni ddaethpwyd o hyd i unrhyw ganlyniad` is provided in the ticket body
- "No matching case found" (cy)
- "Select a case" heading and validation error (cy)
- "Confirm email subscription" heading (cy)
- "Confirm" button (cy)
- "Subscription added" heading (cy)
- "Your email subscription has been added." body (cy)
- "Email subscriptions" link text (cy)
- "You are already subscribed to this case" error (cy)

**5. Notification service wiring**
The plan adds a new `findActiveSubscriptionsByCaseNumber` query to `libs/notifications`. Confirm the exact location in the notification service where this query should be invoked (i.e., which function handles post-ingestion subscription matching), and whether this is in scope for this ticket or a follow-up.
