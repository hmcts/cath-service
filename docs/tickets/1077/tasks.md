# Implementation Tasks — #1077 List reconciliation

## Blocked until answered

- [ ] Q1 — confirm intent for `CROWN_*_LIST` → `CROWN_*_PDDA_LIST`, `SSCS_DAILY_LIST`,
      `INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST` (none exist on `master`), and resolve the
      `CROWN_WARNED_PDDA_LIST` vs #957 `CROWN_ADVANCED_PDDA_LIST` collision
- [ ] Q2 — confirm #1077 depends on #1060 (#698) and does not duplicate the provenance work
- [ ] Q3 — decide on `TECHNOLOGY_AND_CONSTRUCTION_COURT_DAILY_CAUSE_LIST` (non-KB)
- [ ] Q4 — decide handling for `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` and
      `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` once #659 removes them upstream
- [ ] Q5 — agree who announces the `x-list-type` change to third-party consumers
- [ ] Q6 — confirm public list-type URLs (`urlPath`) stay unchanged

## Prerequisite

- [ ] Wait for PR #1060 (`feature-698`) to merge, then rebase this branch on `master`

## Migration

- [ ] Add `apps/postgres/prisma/migrations/<ts>_rename_list_types_to_shared_model/migration.sql`
      with 19 guarded in-place renames
      (`UPDATE list_types SET name = '<new>' WHERE name = '<old>' AND NOT EXISTS (SELECT 1 FROM list_types WHERE name = '<new>')`)
- [ ] Verify the migration is idempotent by running `yarn db:migrate` twice against a seeded local DB
- [ ] Verify `artefact`, `subscription_list_type`, `third_party_user_list_type`,
      `legacy_third_party_push_log` and `list_search_config` rows still resolve after the migration

## Rename each of the 19 list types

For each name in the plan's §2.2 table, in one commit per name or one commit per family:

- [ ] `libs/list-types/common/src/list-type-data.ts` — the `name:` field
- [ ] `libs/publication/src/processing/service.ts` — `PDF_GENERATOR_REGISTRY` key and list-title maps
- [ ] `libs/notifications/src/notification/notification-service.ts` — config key
- [ ] `libs/list-types/<pkg>/src/conversion/<x>-config.ts` — `registerConverterByName(...)`
- [ ] `apps/web/src/pages/(list-types)/<page>/index.ts` — `LIST_TYPE_CONFIG` keys
      (administrative court, FTT RPT ×5, RCJ standard)
- [ ] `libs/list-types/<pkg>/src/locales/en.ts` **and** `cy.ts` — any object key named after the list
      type (`rptRegionalEmail`, admin-court and RCJ locale maps); rename in both to keep locale-key
      parity
- [ ] Co-located tests: `index.test.ts`, `*.njk.test.ts`, `pdf/pdf-generator.test.ts`,
      `rendering/renderer.test.ts`
- [ ] `libs/publication/src/processing/service.test.ts`
- [ ] `libs/list-types/common/src/conversion/non-strategic-list-registry.test.ts` (CST only)
- [ ] `apps/web/src/pages/(admin)/non-strategic-upload/index.test.ts` (CST only)
- [ ] `e2e-tests/utils/seed-list-types.ts` and `e2e-tests/tests/summary-of-publications.spec.ts`
      (CST only)
- [ ] Do **not** change `urlPath`, package/directory names, or friendly names

## Verify the renames are complete

- [ ] For each of the 19 old names, `grep -rn "<OLD_NAME>"` returns nothing outside
      `docs/`, `libs/postgres-prisma/generated/` and this ticket's migration
- [ ] `yarn lint:fix` and `yarn format` clean
- [ ] `yarn test` green across all workspaces
- [ ] `yarn test:e2e` green

## Parity test

- [ ] Keep `docs/tickets/1077/reference-list-types.json` as the committed reference snapshot
- [ ] Add `libs/list-types/common/src/list-type-parity.test.ts` asserting:
  - [ ] every `listTypeData` name exists upstream, or is in `CATH_ONLY` with a reason
  - [ ] every upstream name exists in `listTypeData`, or is in `KNOWN_GAPS` with a reason and a
        tracking issue
  - [ ] provenance sets match for every matched name, or are in `PROVENANCE_DIVERGENCES` with a
        reason (depends on #1060's `string[]` representation)
  - [ ] the counts reconcile, so the gap cannot drift silently
  - [ ] `TEST_*` / `E2E_*` names are excluded
- [ ] Populate `KNOWN_GAPS` with all 25 absent names, tagged: 14 `out-of-scope(#659)`,
      3 `deprecated-upstream` (`CARE_STANDARDS_LIST`, `PRIMARY_HEALTH_LIST`,
      `CIC_DAILY_HEARING_LIST`), and the rest pointing at the follow-up tickets
- [ ] Populate `CATH_ONLY` per the Q1 and Q4 decisions

## Follow-up tickets to raise

- [ ] Raise a ticket for `SJP_PRESS_REGISTER` (`PI_AAD`)
- [ ] Raise a ticket for `SSCS_DAILY_LIST` (`CFT_IDAM`) — prerequisite for the next one
- [ ] Raise a ticket for `SSCS_DAILY_LIST_ADDITIONAL_HEARINGS` (`CFT_IDAM`)
- [ ] Do **not** raise a ticket for `CIC_DAILY_HEARING_LIST` — deprecated upstream, superseded by our
      `CIC_WEEKLY_HEARING_LIST`; record the reasoning in a comment on #1077

## Close out

- [ ] Comment on #1077 confirming, with evidence: which of the named lists genuinely exist, which are
      genuinely absent, and the deprecated-upstream findings
- [ ] PR description flags the `x-list-type` contract change on 19 list types and the need for
      `yarn db:migrate` before `yarn db:seed` locally
