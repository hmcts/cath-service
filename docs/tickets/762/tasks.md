# Implementation Tasks: #762

## Implementation Tasks

- [ ] Update `searchByCaseNumber` in `libs/subscriptions/src/repository/queries.ts` to add `listSearchConfig` filter and display-window filter (mirror `searchByCaseName` pattern)
- [ ] Update `searchByCaseNumber` tests in `libs/subscriptions/src/repository/queries.test.ts` to assert the new filter shape and add empty-config early-return test
- [ ] Remove `tableHeaderPartyName` key from `apps/web/src/pages/(verified)/subscription-management/en.ts`
- [ ] Remove `tableHeaderPartyName` key from `apps/web/src/pages/(verified)/subscription-management/cy.ts`
- [ ] Remove `Applicant` field and unused `extractParty` import from `libs/list-types/civil-and-family-daily-cause-list/src/email-summary/summary-builder.ts`
- [ ] Update `libs/list-types/civil-and-family-daily-cause-list/src/email-summary/summary-builder.test.ts` to remove assertions for `Applicant` field
- [ ] Run `yarn test` and confirm all tests pass
- [ ] Run `yarn lint:fix` and confirm no linting issues
