# Technical Plan — #296 VIBE-307: Verified User Select & Edit List Type

## What Already Exists (from VIBE-309)

- `/subscription-management` — shows existing location subscriptions (Page 1)
- `/location-name-search` — search + filter locations by jurisdiction/region (Page 3)
- `/pending-subscriptions` — review selected venues, currently saves and redirects to `/subscription-confirmed` (Page 4)
- `/subscription-confirmed` — basic success page (Page 8, simplified)
- `libs/subscriptions/src/repository/service.ts` — `createSubscription`, `replaceUserSubscriptions`, `getAllSubscriptionsByUserId`, etc.
- `libs/subscriptions/prisma/schema.prisma` — `Subscription` model (location subscriptions only)
- `ListType` model (in postgres prisma schema) with `ListTypeSubJurisdiction` junction

## What Needs to Be Built

### 1. Database Schema Addition

Add to `libs/subscriptions/prisma/schema.prisma`:

```prisma
model SubscriptionListType {
  subscriptionListTypeId String   @id @default(uuid()) @map("subscription_list_type_id") @db.Uuid
  userId                 String   @map("user_id") @db.Uuid
  listTypeId             Int      @map("list_type_id")
  language               String   @map("language") @db.VarChar(20)
  dateAdded              DateTime @default(now()) @map("date_added")

  user User @relation(fields: [userId], references: [userId], onDelete: Cascade, onUpdate: Cascade)

  @@unique([userId, listTypeId], name: "unique_user_subscription_list_type")
  @@index([userId], name: "idx_subscription_list_type_user")
  @@map("subscription_list_type")
}
```

Language values: `"ENGLISH"`, `"WELSH"`, `"ENGLISH_AND_WELSH"`

The `User` model in the postgres prisma schema will also need a relation added to `ListTypeSubscription`. Since the subscription schema only owns `Subscription`, we add `ListTypeSubscription` alongside it.

### 2. New Service Functions in `libs/subscriptions/src/repository/`

Add `list-type-subscription-queries.ts`:
- `findListTypeSubscriptionsByUserId(userId)` — ordered by dateAdded DESC
- `findListTypeSubscriptionByUserAndListType(userId, listTypeId)` — unique lookup
- `deleteListTypeSubscription(listTypeSubscriptionId, userId)` — authorised delete
- `deleteAllListTypeSubscriptionsByUserId(userId)` — bulk delete

Add `list-type-subscription-service.ts`:
- `createListTypeSubscriptions(userId, listTypeIds, language)` — upserts list type subs for a user: creates new records, and **updates the `language` field** on any (userId, listTypeId) combination that already exists; no deletions
- `getListTypeSubscriptionsByUserId(userId)` — returns list with `listTypeName`, `listTypeId`, `language`, `dateAdded`
- `removeListTypeSubscription(subscriptionId, userId)` — authorised single removal

Export from `libs/subscriptions/src/index.ts`.

### 3. Session Type Extension

Add to `libs/verified-pages/src/session.ts` (new file, augments express-session):

```typescript
declare module "express-session" {
  interface SessionData {
    emailSubscriptions: {
      pendingSubscriptions?: string[];           // location IDs (existing)
      pendingListTypeIds?: number[];             // NEW
      pendingLanguage?: string;                  // NEW: "ENGLISH"|"WELSH"|"ENGLISH_AND_WELSH"
      confirmationComplete?: boolean;            // existing
      confirmedLocations?: string[];             // existing
      subscriptionToRemove?: string;             // existing
    };
  }
}
```

### 4. New Page: `/add-email-subscription` (Page 2)

`libs/verified-pages/src/pages/add-email-subscription/`

- GET: render method selection (3 radio options)
- POST: validate selection, redirect to `/location-name-search` (for "court or tribunal name"); "By case name" and "By case reference" options are **placeholder only** in this ticket — selecting them should redirect to a not-yet-implemented page (or show a not-implemented response)
- Validation: error if no radio selected

### 5. Modified Page 4: `pending-subscriptions`

Change the `action === "confirm"` branch:
- Instead of saving and redirecting to `/subscription-confirmed`, call `replaceUserSubscriptions` then redirect to `/select-list-types`
- Store confirmed location IDs in session for display on Page 7

### 6. New Page: `/select-list-types` (Page 5)

`libs/verified-pages/src/pages/select-list-types/`

**GET logic:**
1. Get pending location IDs from session (`pendingSubscriptions` — still in session at this point, or from `confirmedLocations`)
2. Fetch each location's sub-jurisdictions via `getLocationById()` (which includes `subJurisdictions: number[]`)
3. Collect unique sub-jurisdiction IDs from all selected locations
4. Query `ListType` records that have matching entries in `ListTypeSubJurisdiction`
5. If no locations selected (edit flow), show all list types
6. Sort list types alphabetically, group by first letter
7. Fetch existing user list type subscriptions to pre-tick checkboxes (for edit flow)
8. Render with grouped list types

**POST logic:**
1. Read `selectedListTypes` from body (array of list type IDs, or empty)
2. Validate: if `selectedListTypes` is empty → show error "Please select a list type to continue"
3. Store `pendingListTypeIds` in session
4. Redirect to `/select-list-version`

### 7. New Page: `/select-list-version` (Page 6)

`libs/verified-pages/src/pages/select-list-version/`

- GET: render 3 radio options (English, Welsh, English and Welsh); pre-select from session if returning via back
- POST: validate radio selected → store `pendingLanguage` in session → redirect to `/confirm-subscriptions`
- Validation: error if no version selected

### 8. New Page: `/confirm-subscriptions` (Page 7)

`libs/verified-pages/src/pages/confirm-subscriptions/`

**GET logic:**
1. Read `confirmedLocations`, `pendingListTypeIds`, `pendingLanguage` from session
2. Fetch location names for confirmed location IDs
3. Fetch list type names for pending list type IDs
4. Render 3 tables: courts/tribunals, list types, version
5. Render action links: Remove (list type), Change version, Add another subscription

**POST actions:**
- `action = "confirm"` → call `createListTypeSubscriptions(userId, pendingListTypeIds, pendingLanguage)` → clear pending session data → set `confirmationComplete = true` → redirect to `/subscription-confirmed`
- `action = "remove-list-type"` → remove list type ID from `pendingListTypeIds` in session → redirect back to GET
- `action = "change-version"` → redirect to `/select-list-version`

### 9. Updated Page: `/subscription-confirmed` (Page 8)

Enhance `libs/verified-pages/src/pages/subscription-confirmed/` to show useful navigation links:
- Add another subscription → `/add-email-subscription`
- Manage your current email subscriptions → `/subscription-management`
- Find a court or tribunal → `/location-name-search`
- Select which list type to receive → `/select-list-types`

### 10. Updated Page: `/subscription-management` (Page 1)

Add to the template:
- "Add email subscription" green button → links to `/add-email-subscription`
- For each subscription row, add "Edit list type" link → `/subscription-configure-list`

The controller stays the same; template changes only.

### 11. Notification Integration (In Scope)

When a publication is received in the ingestion pipeline, query `subscription_list_type` for all users subscribed to that list type whose language preference matches the publication's language, and send notification emails.

This touches wherever publication ingestion is handled (likely `libs/api/` or `apps/api/`). It is confirmed in scope for this ticket.

## Key Technical Decisions

### Sub-jurisdiction Filtering for List Types

The `Location` model has `subJurisdictions: number[]` (from `LocationSubJurisdiction` junction). The `ListType` model has `ListTypeSubJurisdiction` junction. To find list types for selected locations:

```typescript
// 1. Get sub-jurisdiction IDs from all selected locations
const locations = await Promise.all(locationIds.map(id => getLocationById(id)));
const subJurisdictionIds = [...new Set(locations.flatMap(l => l?.subJurisdictions ?? []))];

// 2. If no sub-jurisdictions found, return empty list (show none)
if (subJurisdictionIds.length === 0) return [];

// 3. Find list types matching any of those sub-jurisdictions
const listTypes = await prisma.listType.findMany({
  where: {
    deletedAt: null,
    listTypeSubJurisdictions: {
      some: { subJurisdictionId: { in: subJurisdictionIds } }
    }
  },
  include: { listTypeSubJurisdictions: true },
  orderBy: { friendlyName: 'asc' }
});
```

### Session Flow

```
Page 3 (location-name-search POST)
  → session.emailSubscriptions.pendingSubscriptions = [locationIds]

Page 4 (pending-subscriptions POST "confirm")
  → replaceUserSubscriptions(userId, locationIds)   // save locations
  → session.emailSubscriptions.confirmedLocations = [locationIds]
  → delete session.emailSubscriptions.pendingSubscriptions
  → redirect /select-list-types

Page 5 (select-list-types POST)
  → session.emailSubscriptions.pendingListTypeIds = [listTypeIds]
  → redirect /select-list-version

Page 6 (select-list-version POST)
  → session.emailSubscriptions.pendingLanguage = "ENGLISH"|"WELSH"|"ENGLISH_AND_WELSH"
  → redirect /confirm-subscriptions

Page 7 (confirm-subscriptions POST "confirm")
  → createListTypeSubscriptions(userId, pendingListTypeIds, pendingLanguage)
  → session.emailSubscriptions.confirmationComplete = true
  → delete pendingListTypeIds, pendingLanguage, confirmedLocations
  → redirect /subscription-confirmed
```

### Edit Flow (from subscription-management "Edit list type")

The edit flow uses three dedicated pages, separate from the add subscription flow:

**`/subscription-configure-list`**
- GET: show all list types (no sub-jurisdiction filtering); pre-tick the user's existing list type subscriptions
- POST: validate at least one selected (error: "Please select a list type to continue") → store `pendingListTypeIds` in session → redirect to `/subscription-configure-list-language`

**`/subscription-configure-list-language`**
- GET: show language radio options; pre-select the user's current language if one is already set
- POST: validate radio selected → store `pendingLanguage` in session → redirect to `/subscription-configure-list-preview`

**`/subscription-configure-list-preview`**
- GET: read `pendingListTypeIds` and `pendingLanguage` from session; resolve list type names; display selected list types and language version
- POST `confirm` → `createListTypeSubscriptions(userId, pendingListTypeIds, pendingLanguage)` (upsert — merges with existing) → clear pending session data → redirect to `/subscription-confirmed`
- POST `remove-list-type` → remove ID from `pendingListTypeIds` in session → redirect back to GET
- POST `change-language` → redirect to `/subscription-configure-list-language`

The "Edit list type" link on Page 1 navigates to `/subscription-configure-list` (no query parameter needed).

## File Structure

```
libs/subscriptions/
└── src/
    └── repository/
        ├── list-type-subscription-queries.ts  (NEW)
        └── list-type-subscription-service.ts  (NEW)

libs/subscriptions/prisma/schema.prisma         (MODIFIED)

libs/verified-pages/
└── src/
    ├── session.ts                              (NEW — session type augmentation)
    └── pages/
        ├── subscription-management/            (MODIFIED — template only)
        ├── pending-subscriptions/              (MODIFIED — POST confirm redirects to /select-list-types)
        ├── add-email-subscription/             (NEW)
        │   ├── en.ts
        │   ├── cy.ts
        │   ├── index.ts
        │   ├── index.test.ts
        │   └── index.njk
        ├── select-list-types/                  (NEW)
        │   ├── en.ts
        │   ├── cy.ts
        │   ├── index.ts
        │   ├── index.test.ts
        │   └── index.njk
        ├── select-list-version/                (NEW)
        │   ├── en.ts
        │   ├── cy.ts
        │   ├── index.ts
        │   ├── index.test.ts
        │   └── index.njk
        ├── confirm-subscriptions/              (NEW)
        │   ├── en.ts
        │   ├── cy.ts
        │   ├── index.ts
        │   ├── index.test.ts
        │   └── index.njk
        ├── subscription-configure-list/        (NEW — edit flow step 1)
        │   ├── en.ts
        │   ├── cy.ts
        │   ├── index.ts
        │   ├── index.test.ts
        │   └── index.njk
        ├── subscription-configure-list-language/ (NEW — edit flow step 2)
        │   ├── en.ts
        │   ├── cy.ts
        │   ├── index.ts
        │   ├── index.test.ts
        │   └── index.njk
        ├── subscription-configure-list-preview/ (NEW — edit flow step 3)
        │   ├── en.ts
        │   ├── cy.ts
        │   ├── index.ts
        │   ├── index.test.ts
        │   └── index.njk
        └── subscription-confirmed/             (MODIFIED — enhanced links)
```

## Clarifications

1. **Notification scope**: Confirmed **in scope** — notification integration (email on publication receipt for list type subscribers) must be implemented in this ticket.
2. **Edit flow**: Confirmed **merge** — "Edit list type" merges new selections with existing subscriptions (upsert, do not delete existing entries).
3. **Sub-jurisdiction edge case**: Confirmed **show none** — if selected locations have no sub-jurisdictions, no list types are displayed.
4. **Language deduplication**: Confirmed **update existing** — if a user subscribes to a list type they already have, update the language on the existing record.
5. **Page 2 scope**: Confirmed **placeholder only** — "By case name" and "By case reference" are rendered as radio options but do not link to a functional flow in this ticket.
