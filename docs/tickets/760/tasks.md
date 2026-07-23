# Implementation Tasks — #760

## Part A — Venue / name change
- [ ] Confirm A1 (sub-jurisdiction) vs A2 (Location) rename with SM (Clarification 1)
- [ ] Rename sub-jurisdiction id 24 `name`/`welshName` in `libs/location/src/location-data.ts`
- [ ] Rename sub-jurisdiction id 24 in `apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql`
- [ ] (If A2) Rename matching `Location.name`/`welshName` in seed data
- [ ] Verify A-Z page filter shows the new label (read live from DB)
- [ ] Confirm existing subscriptions display the new name (no migration needed — keyed on locationId)

## Part B — New Market Rents list type
- [ ] Add `FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST` to `libs/list-types/common/src/list-type-data.ts` (friendly + shortened + Welsh names, subJurisdiction 24)
- [ ] Add row to `apps/postgres/prisma/scripts/001_insert_missing_list_types.sql`
- [ ] Add list-type→sub-jurisdiction (24) link in `003_upsert_sub_jurisdictions_and_list_type_links.sql`
- [ ] Register converter in `libs/list-types/ftt-rpt-weekly-hearing-list/src/conversion/ftt-rpt-config.ts`
- [ ] Add PDF registry entry in `libs/publication/src/processing/service.ts`
- [ ] Add email-summary mapping in `libs/notifications/src/notification/notification-service.ts`
- [ ] Add `rptMarketRentsCourtName`/`rptMarketRentsPageTitle` to `en.ts` + `cy.ts`
- [ ] Add name to `LIST_TYPE_CONFIG` in the page controller `index.ts`
- [ ] Add `import "@hmcts/ftt-rpt-weekly-hearing-list";` to `non-strategic-upload/index.ts`
- [ ] Confirm reuse of existing schema/validator (no new schema unless required — Clarification 6)

## Part C — Open-justice wording + region emails
- [ ] Refactor open-justice locale into composable parts with `{email}` token (en.ts + cy.ts)
- [ ] Add region-email map (+ Market Rents bold-paragraph flag) to `LIST_TYPE_CONFIG`
- [ ] Add Market Rents bold paragraph text (EN + CY) to locales
- [ ] Update web accordion template to render lead sentence, region `mailto:`, short-notice sentence, optional bold paragraph, guidance link
- [ ] Update PDF template open-justice wording to match
- [ ] Resolve EN/CY "telephone or video" inconsistency (Clarification 4)

## Tests
- [ ] Page-controller unit test: Market Rents title/court name + per-region email in accordion
- [ ] Template test: revised wording, region mailto link, Market Rents bold paragraph present/absent, Welsh rendering, EN/CY key parity
- [ ] PDF test: Market Rents title
- [ ] E2E: one Market Rents view journey (happy path + accessibility + Welsh inline)
- [ ] `yarn lint:fix`, `yarn test`, seed + manual check of upload dropdown label

## Blocked on clarifications
- [ ] Resolve Clarifications 1–6 in plan.md before/while implementing
