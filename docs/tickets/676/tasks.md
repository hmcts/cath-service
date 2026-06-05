# Implementation Tasks — #676 CSV SJP Hearing Lists

## Implementation Tasks

- [ ] Add `papaparse` and `@types/papaparse` to `libs/list-types/common/package.json`
- [ ] Create `libs/list-types/common/src/sjp/sjp-csv.ts` with `buildPressListCsv` and `buildPublicListCsv`
- [ ] Create `libs/list-types/common/src/sjp/sjp-csv.test.ts` with unit tests for both builders
- [ ] Add `getAllSjpPublicCases` to `libs/list-types/common/src/sjp/sjp-service.ts`
- [ ] Add tests for `getAllSjpPublicCases` to `libs/list-types/common/src/sjp/sjp-service.test.ts`
- [ ] Export `buildPressListCsv`, `buildPublicListCsv`, `getAllSjpPublicCases` from `libs/list-types/common/src/index.ts`
- [ ] Create `libs/list-types/sjp-press-list/src/pages/download.ts` (GET handler)
- [ ] Create `libs/list-types/sjp-press-list/src/pages/download.test.ts`
- [ ] Add `downloadHeading`, `downloadCsv`, `downloadCsvAriaLabel` to `libs/list-types/sjp-press-list/src/pages/en.ts` and `cy.ts`
- [ ] Update `libs/list-types/sjp-press-list/src/pages/index.ts` to pass `downloadCsvUrl` to template
- [ ] Add download block to `libs/list-types/sjp-press-list/src/pages/sjp-press-list.njk`
- [ ] Create `libs/list-types/sjp-public-list/src/pages/download.ts` (GET handler)
- [ ] Create `libs/list-types/sjp-public-list/src/pages/download.test.ts`
- [ ] Add `downloadHeading`, `downloadCsv`, `downloadCsvAriaLabel` to `libs/list-types/sjp-public-list/src/pages/en.ts` and `cy.ts`
- [ ] Update `libs/list-types/sjp-public-list/src/pages/index.ts` to pass `downloadCsvUrl` to template
- [ ] Add download block to `libs/list-types/sjp-public-list/src/pages/sjp-public-list.njk`
- [ ] Add `buildCsvDownloadLink` helper and `link_to_csv` to `TemplateParameters` in `libs/notifications/src/govnotify/template-config.ts`
- [ ] Wire `link_to_csv` in `buildFallbackEmailData` (and enhanced path) for the 4 SJP list type IDs in `libs/notifications/src/notification/notification-service.ts`
- [ ] Confirm/add `artefactId` to `PublicationEvent` in `libs/notifications/src/notification/validation.ts` if needed
- [ ] Run `yarn test` and fix any failures
- [ ] Run `yarn lint:fix` across modified packages
