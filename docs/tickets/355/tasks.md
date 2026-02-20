# Implementation Tasks

## Query Functions

- [ ] Add `getNoMatchArtefacts()` to `libs/publication/src/repository/queries.ts` — `findMany` with `where: { noMatch: true }`
- [ ] Add `refreshMaterialisedViews()` to `libs/publication/src/repository/queries.ts` — two sequential `$executeRaw` calls with logging
- [ ] Add `getSubscriptionArtefacts()` to `libs/publication/src/repository/queries.ts` — `findMany` filtering `displayFrom` to current calendar day and `displayTo > now`
- [ ] Export the three new functions from `libs/publication/src/index.ts`

## Query Tests

- [ ] Add `$executeRaw: vi.fn()` to the existing `vi.mock("@hmcts/postgres", ...)` in `libs/publication/src/repository/queries.test.ts`
- [ ] Add tests for `getNoMatchArtefacts` — returns matching artefacts, returns empty array when none match
- [ ] Add tests for `refreshMaterialisedViews` — calls `$executeRaw` twice with correct view names, propagates errors
- [ ] Add tests for `getSubscriptionArtefacts` — returns artefacts matching today with future `displayTo`, returns empty array when none match

## Cron Scripts

- [ ] Create `apps/crons/src/manage-artefacts.ts` — calls `getNoMatchArtefacts`, logs count or "no results", re-throws errors
- [ ] Create `apps/crons/src/refresh-views.ts` — calls `refreshMaterialisedViews`, re-throws errors
- [ ] Create `apps/crons/src/subscription-artefacts.ts` — calls `getSubscriptionArtefacts`, logs count or "no results", re-throws errors

## Cron Script Tests

- [ ] Create `apps/crons/src/manage-artefacts.test.ts` — results found, empty result, error re-thrown
- [ ] Create `apps/crons/src/refresh-views.test.ts` — successful call logged, error re-thrown
- [ ] Create `apps/crons/src/subscription-artefacts.test.ts` — results found, empty result, error re-thrown
