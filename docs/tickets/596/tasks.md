# Implementation Tasks: #596 Magistrates Public List

## Implementation Tasks

### Library module
- [ ] Create `libs/list-types/magistrates-public-list/` directory structure
- [ ] Create `package.json` (copy from `magistrates-standard-list`, update name/dependencies)
- [ ] Create `tsconfig.json` (copy from `magistrates-standard-list`)
- [ ] Copy `magistrates-standard-list` schema to `src/schemas/magistrates-public-list.json`
- [ ] Create `src/config.ts` (moduleRoot, assets, schemaPath)
- [ ] Create `src/models/types.ts` (re-export RenderOptions from @hmcts/list-types-common)
- [ ] Create `src/validation/json-validator.ts` (validateMagistratesPublicList)
- [ ] Create `src/rendering/renderer.ts` (renderMagistratesPublicListData — port from magistrates-standard-list dist)
- [ ] Create `src/rendering/renderer.test.ts`
- [ ] Create `src/locales/en.ts` (all keys per acceptance criteria)
- [ ] Create `src/locales/cy.ts` (all Welsh keys per acceptance criteria)
- [ ] Create `src/pdf/pdf-generator.ts` (generateMagistratesPublicListPdf using PDF_BASE_STYLES)
- [ ] Create `src/pdf/pdf-template.njk` (port from magistrates-standard-list, include restriction section)
- [ ] Create `src/index.ts` (export renderer, validator, PDF generator, locales, types)

### Page (apps/web)
- [ ] Create `apps/web/src/pages/(list-types)/magistrates-public-list/index.ts` (createListTypeHandler + createCauseListRender)
- [ ] Create `apps/web/src/pages/(list-types)/magistrates-public-list/magistrates-public-list.njk` (6-column table, restriction section, open justice, search, data source)

### Registration
- [ ] Add `@hmcts/magistrates-public-list` path alias to root `tsconfig.json`
- [ ] Add `@hmcts/magistrates-public-list: workspace:*` to `apps/web/package.json`
- [ ] Import `moduleRoot` from `@hmcts/magistrates-public-list/config` in `apps/web/src/app.ts` and add to `modulePaths`

### Verification
- [ ] `yarn test` passes (renderer.test.ts + all existing tests)
- [ ] Page accessible at `GET /magistrates-public-list?artefactId=` with valid data
- [ ] Returns 400 for missing artefactId, 404 for not found, 403 for no access, 400 for invalid JSON
- [ ] Welsh content renders correctly via `?lng=cy`
- [ ] PDF generated correctly with restriction section
