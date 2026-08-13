# Implementation Tasks

> Reference implementation: `libs/list-types/companies-winding-up-chd-daily-cause-list/` — a thin
> consumer of `@hmcts/chd-kb-common`, which already provides the schema, validator, Excel config,
> types, and renderer for this exact field set. Do NOT write a bespoke schema/config/validator.

- [x] Scaffold lib `libs/list-types/commercial-court-kb-daily-cause-list/` (package.json + tsconfig.json) mirroring `companies-winding-up-chd-daily-cause-list`; deps include `@hmcts/chd-kb-common`
- [x] Add both path aliases (`@hmcts/commercial-court-kb-daily-cause-list` and `/config`) to root `tsconfig.json`
- [x] Create `src/config.ts` (moduleRoot, assets — NO schemaPath; schema lives in `chd-kb-common`)
- [x] Create `src/locales/en.ts` and `cy.ts` (pageTitle, venue/address, important-information + caution copy, tableHeaders keyed judge/time/venue/type/caseNumber/caseName/additionalInformation; key parity)
- [x] Create `src/conversion/commercial-court-kb-daily-cause-list-config.ts` — `createConverter(CHD_KB_EXCEL_CONFIG)` + `registerConverterByName("COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST", …)` + config test
- [x] Create `src/rendering/renderer.ts` — thin wrapper over `renderChdKbHearingList` passing `listTitle` from locales + renderer test
- [x] Migrate style guide/template from pip-frontend `commercial-court-kb-daily-cause-list` into `src/pdf/pdf-template.njk`
- [x] Create `src/pdf/pdf-generator.ts` (`generateCommercialCourtKbDailyCauseListPdf`, copy from companies-winding-up) + pdf-generator test
- [x] Create `src/index.ts` — side-effect converter import; re-export `ChdKbHearing`/`ChdKbHearingList` as `CommercialCourtKb*`; re-export `validateChdKbListType as validateCommercialCourtKbDailyCauseList` + email-summary helpers; export locales, renderer, pdf generator
- [x] Create page `apps/web/src/pages/(list-types)/commercial-court-kb-daily-cause-list/index.ts` (single-type guard, SUPPORTED_LIST_TYPE, `validate = validateChdKbListType`) + `index.test.ts`
- [x] Create page template `commercial-court-kb-daily-cause-list.njk` (flat GOV.UK table, columns in ticket order) + `.njk.test.ts` (incl. Welsh + accessibility)
- [x] Register PDF generator in `PDF_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts`) — no `EXCEL_GENERATOR_REGISTRY` entry needed
- [x] Add list type entry to `libs/list-types/common/src/list-type-data.ts` (subJurisdictionIds [10], Public, isNonStrategic true, urlPath commercial-court-kb-daily-cause-list)
- [x] Add `@hmcts/commercial-court-kb-daily-cause-list` dep to `apps/web/package.json`
- [x] Register `moduleRoot` in `apps/web/src/app.ts` modulePaths
- [x] Register converter via side-effect import in both admin upload pages: `apps/web/src/pages/(admin)/non-strategic-upload/index.ts` and `non-strategic-upload-summary/index.ts` (else Excel→JSON conversion is silently skipped at upload/publish time)
- [x] Register email summary builder in `EMAIL_BUILDER_REGISTRY` (`libs/notifications/src/notification/notification-service.ts`) + add `@hmcts/commercial-court-kb-daily-cause-list` dep to `libs/notifications/package.json` (else subscriber emails fall back to a generic template with no case summary)
- [x] Run `yarn db:generate` and `yarn db:seed`
- [x] Run `yarn lint:fix`, `yarn test` (incl. CI guard test), and verify the pip-frontend staging URL structure matches
