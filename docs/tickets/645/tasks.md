# Implementation Tasks: #645 - PHT Weekly Hearing List

## Implementation Tasks

### Lib module
- [ ] Create `libs/list-types/pht-weekly-hearing-list/package.json`
- [ ] Create `libs/list-types/pht-weekly-hearing-list/tsconfig.json`
- [ ] Create `libs/list-types/pht-weekly-hearing-list/src/models/types.ts` — `PhtHearing`, `PhtHearingList`
- [ ] Create `libs/list-types/pht-weekly-hearing-list/src/schemas/pht-weekly-hearing-list.json`
- [ ] Create `libs/list-types/pht-weekly-hearing-list/src/locales/en.ts`
- [ ] Create `libs/list-types/pht-weekly-hearing-list/src/locales/cy.ts`
- [ ] Create `libs/list-types/pht-weekly-hearing-list/src/rendering/renderer.ts`
- [ ] Create `libs/list-types/pht-weekly-hearing-list/src/rendering/renderer.test.ts`
- [ ] Create `libs/list-types/pht-weekly-hearing-list/src/validation/json-validator.ts`
- [ ] Create `libs/list-types/pht-weekly-hearing-list/src/conversion/pht-config.ts` (Excel converter, registers `PHT_WEEKLY_HEARING_LIST`)
- [ ] Create `libs/list-types/pht-weekly-hearing-list/src/pdf/pdf-generator.ts`
- [ ] Create `libs/list-types/pht-weekly-hearing-list/src/pdf/pdf-template.njk`
- [ ] Create `libs/list-types/pht-weekly-hearing-list/src/pdf/pdf-generator.test.ts`
- [ ] Create `libs/list-types/pht-weekly-hearing-list/src/config.ts`
- [ ] Create `libs/list-types/pht-weekly-hearing-list/src/index.ts`

### Page (web app)
- [ ] Create `apps/web/src/pages/(list-types)/pht-weekly-hearing-list/index.ts` (page controller)
- [ ] Create `apps/web/src/pages/(list-types)/pht-weekly-hearing-list/index.test.ts`
- [ ] Create `apps/web/src/pages/(list-types)/pht-weekly-hearing-list/pht-weekly-hearing-list.njk`

### Registration
- [ ] Add `PHT_WEEKLY_HEARING_LIST` entry to `libs/location/src/list-type-data.ts`
- [ ] Add import + PDF generator entry to `libs/publication/src/processing/service.ts`
- [ ] Add `moduleRoot` import + path to `modulePaths` in `apps/web/src/app.ts`
- [ ] Add `"@hmcts/pht-weekly-hearing-list": "workspace:*"` to `apps/web/package.json`
- [ ] Add `"@hmcts/pht-weekly-hearing-list": "workspace:*"` to `libs/publication/package.json`
- [ ] Add path aliases to root `tsconfig.json`

### Verification
- [ ] Run `yarn test` — all tests pass
- [ ] Run `yarn lint:fix` — no lint errors
