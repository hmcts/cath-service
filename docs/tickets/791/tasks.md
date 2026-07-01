# Tasks: IAC Daily List (#791)

## Clarifications needed before merging to production

- [ ] Confirm Welsh `welshFriendlyName` for id 28 (`IMMIGRATION_AND_ASYLUM_CHAMBER_DAILY_LIST`) — placeholder "Rhestr Ddyddiol y Siambr Mewnfudo a Lloches" needs Welsh language sign-off
- [ ] Confirm Welsh `welshFriendlyName` and Welsh `shortenedFriendlyName` for id 29 (`IMMIGRATION_AND_ASYLUM_CHAMBER_DAILY_LIST_ADDITIONAL_CASES`) — currently `[WELSH TRANSLATION REQUIRED]`
- [ ] Confirm `defaultSensitivity: "Public"` for both lists
- [ ] Confirm en dash (`–`) vs hyphen (`-`) in "Additional Cases" display name
- [ ] Confirm whether `urlPath` should be `undefined` or a slug (e.g. `"iac-daily-list"`) — check flat-file viewer routing requirements

## Implementation

- [ ] Add `IMMIGRATION_AND_ASYLUM_CHAMBER_DAILY_LIST` (id: 28) to `libs/location/src/list-type-data.ts`
- [ ] Add `IMMIGRATION_AND_ASYLUM_CHAMBER_DAILY_LIST_ADDITIONAL_CASES` (id: 29) to `libs/location/src/list-type-data.ts`
- [ ] Add `listTypeStableName: listType?.name ?? ""` to the mapped publication object in `apps/web/src/pages/(public)/summary-of-publications/index.ts`
- [ ] Add `IAC_LIST_ORDER` constant at module scope in `summary-of-publications/index.ts`
- [ ] Update sort comparator in `summary-of-publications/index.ts` to use `IAC_LIST_ORDER` when both entries are the IAC pair, falling through to `localeCompare` otherwise

## Verification

- [ ] Run `yarn db:migrate:dev` locally to seed the two new list types
- [ ] Verify both IAC list types appear in the manual-upload list-type dropdown when an IAC venue is selected
- [ ] Verify Summary of Publications: upload Additional Cases artefact first, then Daily List artefact — confirm Daily List appears first in the rendered output
- [ ] Verify ordering under Welsh locale (`?lng=cy`)
- [ ] Confirm non-IAC list type ordering is unaffected

## Testing

- [ ] Write unit tests for the updated sort comparator covering:
  - Both IAC lists present — Daily List sorts first
  - Only one IAC list present — no crash, falls through to `localeCompare`
  - Non-IAC lists only — sort behaviour unchanged
  - Mixed IAC and non-IAC lists — IAC lists sort among themselves correctly, non-IAC unaffected
- [ ] Run `yarn lint:fix` and `yarn test`

## Production deployment

- [ ] Confirm production data-loading mechanism for new list types (seed skips `ENVIRONMENT === "prod"`) and coordinate deployment with the team
