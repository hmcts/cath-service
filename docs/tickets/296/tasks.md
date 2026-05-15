# Implementation Tasks — #296 VIBE-307

## Database

- [x] Add `ListTypeSubscription` model to `libs/subscriptions/prisma/schema.prisma`
- [x] Run `yarn db:migrate:dev` to generate and apply migration
- [x] Run `yarn db:generate` to regenerate Prisma client

## Subscription Service (libs/subscriptions)

- [x] Create `libs/subscriptions/src/repository/list-type-subscription-queries.ts` with: `findListTypeSubscriptionsByUserId`, `findListTypeSubscriptionByUserAndListType`, `deleteListTypeSubscription`, `deleteAllListTypeSubscriptionsByUserId`
- [x] Create `libs/subscriptions/src/repository/list-type-subscription-service.ts` with: `createListTypeSubscriptions`, `getListTypeSubscriptionsByUserId`, `removeListTypeSubscription`
- [x] Export new functions from `libs/subscriptions/src/index.ts`
- [x] Write unit tests for list type subscription queries and service

## Session Types

- [x] Create `libs/verified-pages/src/session.ts` to extend `express-session` `SessionData` with `pendingListTypeIds`, `pendingLanguage` fields

## Page 2: Add Email Subscription (method selection)

- [x] Create `libs/verified-pages/src/pages/add-email-subscription/en.ts` and `cy.ts`
- [x] Create `libs/verified-pages/src/pages/add-email-subscription/index.ts` (GET renders radio form; POST validates selection and redirects to `/location-name-search`)
- [x] Create `libs/verified-pages/src/pages/add-email-subscription/index.njk`
- [x] Write unit tests for the controller

## Modify Page 4: Pending Subscriptions

- [x] Update `libs/verified-pages/src/pages/pending-subscriptions/index.ts`: change `action === "confirm"` POST handler to redirect to `/select-list-types` instead of `/subscription-confirmed` (location subscriptions still saved here)

## Page 5: Select List Types

- [x] Create `libs/verified-pages/src/pages/select-list-types/en.ts` and `cy.ts`
- [x] Create `libs/verified-pages/src/pages/select-list-types/index.ts`:
  - GET: fetch sub-jurisdictions from selected locations, query list types by sub-jurisdiction, group alphabetically, pre-tick existing subscriptions in edit mode
  - POST: validate at least one list type selected, store `pendingListTypeIds` in session, redirect to `/select-list-version`
- [x] Create `libs/verified-pages/src/pages/select-list-types/index.njk` (alphabetically grouped checkboxes)
- [x] Write unit tests for the controller

## Page 6: Select List Version

- [x] Create `libs/verified-pages/src/pages/select-list-version/en.ts` and `cy.ts`
- [x] Create `libs/verified-pages/src/pages/select-list-version/index.ts` (GET: radio options; POST: validate, store `pendingLanguage` in session, redirect to `/confirm-subscriptions`)
- [x] Create `libs/verified-pages/src/pages/select-list-version/index.njk`
- [x] Write unit tests for the controller

## Page 7: Confirm Subscriptions

- [x] Create `libs/verified-pages/src/pages/confirm-subscriptions/en.ts` and `cy.ts`
- [x] Create `libs/verified-pages/src/pages/confirm-subscriptions/index.ts`:
  - GET: read session, resolve location and list type names, render 3 tables
  - POST `confirm`: call `createListTypeSubscriptions`, clear session, redirect to `/subscription-confirmed`
  - POST `remove-list-type`: remove ID from session, re-render
  - POST `change-version`: redirect to `/select-list-version`
- [x] Create `libs/verified-pages/src/pages/confirm-subscriptions/index.njk`
- [x] Write unit tests for the controller

## Page 8: Subscription Confirmed (enhanced)

- [x] Update `libs/verified-pages/src/pages/subscription-confirmed/en.ts` and `cy.ts` with navigation link text
- [x] Update `libs/verified-pages/src/pages/subscription-confirmed/index.njk` to render 4 navigation links (add another, manage subscriptions, find court, select list type)

## Page 1: Subscription Management (minor updates)

- [x] Update `libs/verified-pages/src/pages/subscription-management/index.njk`: add "Add email subscription" green button linking to `/add-email-subscription`
- [x] Update `libs/verified-pages/src/pages/subscription-management/index.njk`: add "Edit list type" link per subscription row linking to `/subscription-configure-list`

## Edit Flow: `/subscription-configure-list` (step 1)

- [x] Create `libs/verified-pages/src/pages/subscription-configure-list/en.ts` and `cy.ts`
- [x] Create `libs/verified-pages/src/pages/subscription-configure-list/index.ts`:
  - GET: fetch all list types (no sub-jurisdiction filtering); pre-tick the user's existing list type subscriptions
  - POST: validate at least one list type selected, store `pendingListTypeIds` in session, redirect to `/subscription-configure-list-language`
- [x] Create `libs/verified-pages/src/pages/subscription-configure-list/index.njk` (alphabetically grouped checkboxes, pre-ticked)
- [x] Write unit tests for the controller

## Edit Flow: `/subscription-configure-list-language` (step 2)

- [x] Create `libs/verified-pages/src/pages/subscription-configure-list-language/en.ts` and `cy.ts`
- [x] Create `libs/verified-pages/src/pages/subscription-configure-list-language/index.ts`:
  - GET: render language radio options; pre-select the user's current language if already set
  - POST: validate radio selected, store `pendingLanguage` in session, redirect to `/subscription-configure-list-preview`
- [x] Create `libs/verified-pages/src/pages/subscription-configure-list-language/index.njk`
- [x] Write unit tests for the controller

## Edit Flow: `/subscription-configure-list-preview` (step 3)

- [x] Create `libs/verified-pages/src/pages/subscription-configure-list-preview/en.ts` and `cy.ts`
- [x] Create `libs/verified-pages/src/pages/subscription-configure-list-preview/index.ts`:
  - GET: read `pendingListTypeIds` and `pendingLanguage` from session, resolve list type names, render summary
  - POST `confirm`: call `createListTypeSubscriptions`, clear pending session data, redirect to `/subscription-confirmed`
  - POST `remove-list-type`: remove ID from `pendingListTypeIds` in session, redirect back to GET
  - POST `change-language`: redirect to `/subscription-configure-list-language`
- [x] Create `libs/verified-pages/src/pages/subscription-configure-list-preview/index.njk`
- [x] Write unit tests for the controller

## Notification Integration

- [x] Locate where publication ingestion is handled (likely `libs/api/` or `apps/api/`)
- [x] On publication receipt, query `subscription_list_type` for all users subscribed to the matching `listTypeId` whose `language` matches the publication's language (or `ENGLISH_AND_WELSH`)
- [x] Send notification emails to matched users via the existing notification service
- [x] Write unit tests for the notification query/dispatch logic

## Testing

- [x] Run `yarn test --filter=@hmcts/subscriptions` and ensure all pass
- [x] Run `yarn test --filter=@hmcts/verified-pages` and ensure all pass
- [x] Run `yarn test` to confirm no cross-package regressions
