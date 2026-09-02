# Tasks: #859 — Register four High Court flat-file daily cause lists

## Implementation Tasks

- [x] Resolve CLARIFICATION 1 (`isNonStrategic` value vs upload journey) before writing code
- [x] Confirm `provenance`, `defaultSensitivity`, `subJurisdictionIds` and enum `name` values against CaTH ORG / #846 (CLARIFICATIONS 2–5)
- [x] Add the four object literals to `libs/list-types/common/src/list-type-data.ts` (end of the `listTypeData` array, before line 674)
- [x] Add co-located unit test `libs/list-types/common/src/list-type-data.test.ts` asserting each new entry's fields and name/urlPath uniqueness
- [x] Run `yarn lint:fix` and `yarn format`
- [x] Run `yarn db:generate` (no schema change; re-seed requires a running DB — deferred to deploy/local run)
- [~] Manually verify each type is selectable in the correct upload journey and a flat file (PDF) uploads with `isFlatFile: true` (deferred manual QA — requires running app + seeded DB; delivered by existing generic upload journey, `isNonStrategic: false` places types in `/manual-upload` which accepts PDF/CSV/DOC)
- [~] Manually verify view/download via `/hearing-lists/[locationId]/[artefactId]` shows correct EN and CY names (`?lng=cy`) (deferred manual QA — served by existing generic `flat-file-service.ts`)
- [~] Manually verify 403 access control behaviour for a non-public artefact (deferred manual QA — enforced by existing `canAccessPublicationData` guard)
- [x] Run `yarn test` from the root and confirm the workspace passes (only failure was a flaky 5000ms timeout in unrelated `apps/web/src/server.test.ts` under parallel load; passes in isolation)
