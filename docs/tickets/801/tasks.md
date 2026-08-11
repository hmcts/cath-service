# Implementation Tasks

## Prerequisites
- [x] Resolve CLARIFICATIONS in plan.md §5 (sub-jurisdiction [10] confirmed via sibling; friendly/Welsh names sourced from pip-frontend; `additionalInformation` required per confirmed chd-kb-common reuse). Business-copy confirmation for friendly names deferred — using pip values.

## Library module (libs/list-types/chancery-appeals-chd-daily-cause-list)
- [x] Create module skeleton (package.json, tsconfig.json) mirroring companies-winding-up-chd-daily-cause-list
- [x] Add deps: @hmcts/chd-kb-common, @hmcts/list-types-common, @hmcts/pdf-generation, @hmcts/postgres-prisma, exceljs, luxon, nunjucks
- [x] src/config.ts — export moduleRoot
- [x] src/conversion/…-config.ts — registerConverterByName("CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST", createConverter(CHD_KB_EXCEL_CONFIG))
- [x] src/conversion/…-config.test.ts — assert converter registered and headers → JSON
- [x] src/locales/en.ts — pageTitle, fact link, venue/address, importantInformation (two blocks), tableHeaders, noHearings, backToTop, dataSource, provenanceLabels
- [x] src/locales/cy.ts — identical key structure, Welsh values
- [x] src/rendering/renderer.ts — renderChanceryAppealsChdDailyCauseList wrapping renderChdKbHearingList with this list's pageTitle
- [x] src/rendering/renderer.test.ts
- [x] src/pdf/pdf-generator.ts — generateChanceryAppealsChdDailyCauseListPdf
- [x] src/pdf/pdf-generator.test.ts
- [x] src/pdf/pdf-template.njk — adapt from companies-winding-up pdf-template (two info blocks)
- [x] src/index.ts — side-effect converter import + re-export types, validate* (= validateChdKbListType), email summary, locales, renderer, pdf generator

## Page (apps/web/src/pages/(list-types)/chancery-appeals-chd-daily-cause-list)
- [x] index.ts — createSimpleListTypeHandler with SUPPORTED_LIST_TYPE guard on artefact.listTypeName
- [x] chancery-appeals-chd-daily-cause-list.njk — migrated from pip-frontend chancery-appeals-chd-daily-cause-list
- [x] index.test.ts — controller unit tests (400/404/invalid-type/happy path)
- [x] chancery-appeals-chd-daily-cause-list.njk.test.ts — structural (Cheerio) tests, Welsh render, en/cy key parity

## Registration
- [x] libs/list-types/common/src/list-type-data.ts — add CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST entry (subJurisdictionIds:[10], isNonStrategic:true, CFT_IDAM, Public, urlPath)
- [x] libs/publication/src/processing/service.ts — import generator + add to PDF_GENERATOR_REGISTRY by name
- [x] libs/publication package.json — add dependency on new lib
- [x] apps/web/src/app.ts — import moduleRoot from /config and add to Nunjucks modulePaths
- [x] apps/web package.json — add dependency on new lib
- [x] root tsconfig.json — add @hmcts/chancery-appeals-chd-daily-cause-list and /config path entries
- [x] libs/notifications — register email summary + converter side-effect imports on upload pages

## Verification
- [x] yarn db:generate / yarn db:seed locally — list type seeded (deletedAt: null, isNonStrategic: true), no hand-written SQL
- [x] yarn lint:fix && yarn format — biome clean on all changed files
- [x] yarn test (unit + template) green — new lib (9), page (30), publication (388), notifications (77), common (258)
- [x] Confirm guard.test.ts still passes (dispatcher resolves validate* export)
- [x] App boots (https://localhost:8080); new route returns 400 for missing artefactId (handler guard), home 200
- [~] Manual: upload sample Excel / PDF+Excel download / ?lng=cy — controller + converter + PDF verified via unit tests and boot; full manual upload not run in this harness
- [ ] E2E: DEFERRED — the only non-strategic-upload spec is a single generic SSO-gated `.skip`-ped journey, not per-list-type. A Chancery-specific spec would duplicate an existing journey (violates one-test-per-journey) and cannot run here (SSO-gated + skipped).
- [~] Visual check against pip-frontend reference URL — structure verified against pip source (migrated markup + njk structural tests); live visual diff not run
