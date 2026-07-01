# Implementation Tasks — #438 PCOL Daily Cause List

## Pre-implementation

- [ ] Confirm with product owner: `isNonStrategic: true` (non-strategic upload form) or `false` (standard manual upload form)
- [ ] Confirm Welsh friendly name (or agree to default to English string)
- [ ] Confirm sub-jurisdiction: Civil Court only (`[1]`) or additional sub-jurisdictions

## Implementation

- [ ] Check current max `id` in `libs/location/src/list-type-data.ts` (expected: 27, next: 28)
- [ ] Add `PCOL_DAILY_CAUSE_LIST` entry to `listTypeData` array in `libs/location/src/list-type-data.ts`
- [ ] Run `yarn db:migrate:dev` and verify the new `list_type` row and sub-jurisdiction junction row are created
- [ ] Verify "PCOL Daily Cause List" appears in the correct upload form dropdown (manual-upload or non-strategic-upload depending on `isNonStrategic` value)

## Testing

- [ ] Add/update unit test in `libs/location/` to assert the PCOL entry has unique `id`, `name`, `urlPath`, and correct `subJurisdictionIds`
- [ ] Verify Welsh display name renders correctly via `?lng=cy`
- [ ] Extend existing E2E upload journey test (`@nightly`) to cover PCOL selection and upload

## Quality

- [ ] Run `yarn lint:fix` — no Biome warnings
- [ ] Run `yarn test` — all tests pass
