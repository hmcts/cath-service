# Implementation Tasks: #659 Business and Property Courts Rolls Building venue

> Resolve the CLARIFICATIONS NEEDED in `plan.md` before starting — especially rendering scope,
> region, and sub-jurisdiction, which change the shape of the work.

## Reference data
- [ ] Add `locationId: 26` "Business and Property Courts Rolls Building" venue to `libs/location/src/location-data.ts` (region + sub-jurisdiction per confirmed answers; `provenanceLocationType: "VENUE"`; Welsh name marked `[WELSH TRANSLATION REQUIRED]`).
- [ ] Add the 17 Rolls Building list types to `libs/list-types/common/src/list-type-data.ts` following the RCJ precedent (`provenance`, `isNonStrategic: true`, `defaultSensitivity`, `subJurisdictionIds`, `urlPath`, `welshFriendlyName` marked `[WELSH TRANSLATION REQUIRED]`).
- [ ] Verify unique `name` and `urlPath` for all 17 list types; ensure `subJurisdictionIds` is non-empty.

## Caution message
- [ ] Set the exact English caution message on the venue's `LocationMetadata` via `/location-metadata-manage` (and Welsh once translated). Document the steps for STG/prod.

## Production coordination
- [ ] Prepare/coordinate the reference-data CSV row so the venue is created in STG/prod (routing is by `locationId`, which may differ from the seed value 26).

## Tests
- [ ] Extend `libs/list-types/common/src/list-type-data.test.ts` to assert the 17 new entries (names, friendlyNames, urlPaths, uniqueness).
- [ ] Extend `libs/location/src/seed-data.test.ts` if it asserts location count/contents.
- [ ] Add/extend `apps/web/src/pages/(public)/summary-of-publications/index.test.ts` to verify the venue title composition.
- [ ] Add/extend `apps/web/src/pages/(public)/summary-of-publications/index.njk.test.ts` for FaCT masking, caution message beneath the link, and alphabetical ordering (English + Welsh; locale-key parity).
- [ ] Add one `@nightly` E2E journey in `e2e-tests/tests/`: browse to venue → assert heading, FaCT link, caution message, at least one list link; inline axe check; Welsh toggle. Update `e2e-tests/utils/seed-location-data.ts` / `seed-list-types.ts` if needed.

## Verification
- [ ] Run `yarn db:drop && yarn db:migrate:dev` (fresh local DB) then start the app; confirm the venue and its junction associations seed correctly.
- [ ] Manually verify the summary page for the venue in English and Welsh (`?lng=cy`), including heading, FaCT link masking, caution message and alphabetical list.
- [ ] `yarn lint:fix`, `yarn test`, and E2E all green.

## If per-list rendering is confirmed in scope (only after Q1 answered "yes")
- [ ] For each list type: JSON schema, `validate*` wrapper + test, converter/PDF generator, view page — per CLAUDE.md checklist. Ensure `libs/list-types/common/src/validation/guard.test.ts` passes.
