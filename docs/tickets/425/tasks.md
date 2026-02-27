# Implementation Tasks

## Shared File Updates

- [ ] Add IDs 24, 25, 26 to `libs/list-types/common/src/mock-list-types.ts`
- [ ] Add three path mappings to root `tsconfig.json`

---

## Module: upper-tribunal-tax-chancery-chamber-daily-hearing-list (ID: 24)

- [ ] Create `libs/list-types/upper-tribunal-tax-chancery-chamber-daily-hearing-list/package.json`
- [ ] Create `libs/list-types/upper-tribunal-tax-chancery-chamber-daily-hearing-list/tsconfig.json`
- [ ] Create `libs/list-types/upper-tribunal-tax-chancery-chamber-daily-hearing-list/src/config.ts`
- [ ] Create `libs/list-types/upper-tribunal-tax-chancery-chamber-daily-hearing-list/src/index.ts`
- [ ] Create `libs/list-types/upper-tribunal-tax-chancery-chamber-daily-hearing-list/src/models/types.ts`
- [ ] Create `libs/list-types/upper-tribunal-tax-chancery-chamber-daily-hearing-list/src/schemas/upper-tribunal-tax-chancery-chamber-daily-hearing-list.json`
- [ ] Create `libs/list-types/upper-tribunal-tax-chancery-chamber-daily-hearing-list/src/conversion/uttc-config.ts` (registers converter for listTypeId 24)
- [ ] Create `libs/list-types/upper-tribunal-tax-chancery-chamber-daily-hearing-list/src/rendering/renderer.ts`
- [ ] Create `libs/list-types/upper-tribunal-tax-chancery-chamber-daily-hearing-list/src/pages/en.ts`
- [ ] Create `libs/list-types/upper-tribunal-tax-chancery-chamber-daily-hearing-list/src/pages/cy.ts`
- [ ] Create `libs/list-types/upper-tribunal-tax-chancery-chamber-daily-hearing-list/src/pages/index.ts`
- [ ] Create `libs/list-types/upper-tribunal-tax-chancery-chamber-daily-hearing-list/src/pages/upper-tribunal-tax-chancery-chamber-daily-hearing-list.njk`
- [ ] Create `libs/list-types/upper-tribunal-tax-chancery-chamber-daily-hearing-list/src/pdf/pdf-generator.ts`
- [ ] Create `libs/list-types/upper-tribunal-tax-chancery-chamber-daily-hearing-list/src/pdf/pdf-template.njk`
- [ ] Create `libs/list-types/upper-tribunal-tax-chancery-chamber-daily-hearing-list/src/email-summary/summary-builder.ts` (extracts Date, Time, Case Reference)

---

## Module: upper-tribunal-lands-chamber-daily-hearing-list (ID: 25)

- [ ] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/package.json`
- [ ] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/tsconfig.json`
- [ ] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/config.ts`
- [ ] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/index.ts`
- [ ] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/models/types.ts`
- [ ] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/schemas/upper-tribunal-lands-chamber-daily-hearing-list.json`
- [ ] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/conversion/utlc-config.ts` (registers converter for listTypeId 25)
- [ ] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/rendering/renderer.ts`
- [ ] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/pages/en.ts`
- [ ] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/pages/cy.ts`
- [ ] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/pages/index.ts`
- [ ] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/pages/upper-tribunal-lands-chamber-daily-hearing-list.njk`
- [ ] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/pdf/pdf-generator.ts`
- [ ] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/pdf/pdf-template.njk`
- [ ] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/email-summary/summary-builder.ts` (extracts Date, Time, Case Reference)

---

## Module: upper-tribunal-administrative-appeals-chamber-daily-hearing-list (ID: 26)

- [ ] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/package.json`
- [ ] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/tsconfig.json`
- [ ] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/config.ts`
- [ ] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/index.ts`
- [ ] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/models/types.ts`
- [ ] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/schemas/upper-tribunal-administrative-appeals-chamber-daily-hearing-list.json`
- [ ] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/conversion/utaac-config.ts` (registers converter for listTypeId 26)
- [ ] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/rendering/renderer.ts`
- [ ] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/pages/en.ts`
- [ ] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/pages/cy.ts`
- [ ] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/pages/index.ts`
- [ ] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/pages/upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk` (multi-section opening statement)
- [ ] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/pdf/pdf-generator.ts`
- [ ] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/pdf/pdf-template.njk`
- [ ] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/email-summary/summary-builder.ts` (extracts Date, Time, Case Reference Number)

---

## App Registration

- [ ] Add imports and register routes for all three modules in `apps/web/src/app.ts`
