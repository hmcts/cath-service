# Implementation Tasks: Issue #744

## Prerequisite (blocked — needs answer before coding)

- [ ] Run DB audit to identify which `list_search_config` rows have `caseNameFieldName` set to a party field, and confirm the correct field name for each affected list type
- [ ] Confirm whether backfilling existing `artefact_search` rows is in scope
- [ ] Confirm `displayTo: null` semantics — should null mean no expiry (include in results) or exclude?

## Code Changes

- [ ] Add display window filter to `searchByCaseNumber` in `libs/subscriptions/src/repository/queries.ts`, matching the existing filter pattern in `searchByCaseName`
- [ ] Add unit test for `searchByCaseNumber` asserting expired artefacts are excluded (co-locate with existing query tests)

## Data Fix

- [ ] Update misconfigured `list_search_config` rows — set `caseNameFieldName` to the correct JSON field name for each affected list type (via system admin UI or migration script, using the audit results from the prerequisite step)

## Re-extraction (if backfill is in scope)

- [ ] Write a one-off script `scripts/reextract-artefact-search.ts` that queries all artefacts within their current display window and calls `extractAndStoreArtefactSearch` for each, processing in batches
- [ ] Run script against staging and verify `artefact_search.case_name` no longer contains party values for affected list types
- [ ] Run script against production after config data is updated

## Verification

- [ ] Search by case name — confirm results show case names, not party names
- [ ] Search by case number — confirm expired artefacts are not returned
- [ ] Trigger a subscription notification for a corrected case — confirm email shows case name, not party name
- [ ] Run existing unit tests: `yarn test` — confirm no regressions
