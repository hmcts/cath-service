# #904 — CFT Lists Important Information Text Issue

## Implementation Tasks

### Bug 1 — merge the resolved location name into the Important Information text

- [x] In `libs/list-types/daily-cause-list-common/src/rendering/renderer.ts` line 176, replace `venueName: jsonData.venue.venueName` with `venueName: locationName`, adding a one-line comment explaining *why* (the open justice statement must name the court resolved from the `location` table, not the JSON venue).
- [x] Confirm no other code in the shared renderer depends on `openJustice.venueName` holding the raw JSON venue name; leave the `header` block (lines 168–173) and the `locationName` computation (lines 165–166) untouched.
- [~] Remove the now-redundant `openJustice` override and its comment in `libs/list-types/cop-daily-cause-list/src/rendering/renderer.ts` lines 59–65 (subject to clarification 3). **NOT DONE — descoped by decision: COP is to be left completely untouched. Raised as a follow-up.**

### Bug 2 / Path A — stop emitting town and county from the venue address

- [x] In `libs/list-types/daily-cause-list-common/src/rendering/renderer.ts`, delete the `town` block (lines 54–56) and the `county` block (lines 58–60) from `formatAddress`, keeping the `!address` guard and the empty-string filtering.

### Bug 2 / Path B — stop rendering court-house town and county (subject to clarification 1)

- [x] Delete the town/county blocks at lines 76–81 of `apps/web/src/pages/(list-types)/civil-daily-cause-list/civil-daily-cause-list.njk`.
- [x] Delete the town/county blocks at lines 82–87 of `apps/web/src/pages/(list-types)/family-daily-cause-list/family-daily-cause-list.njk`.
- [x] Delete the town/county blocks at lines 79–84 of `apps/web/src/pages/(list-types)/civil-and-family-daily-cause-list/civil-and-family-daily-cause-list.njk`.
- [x] Delete lines 41–42 of `libs/list-types/civil-daily-cause-list/src/pdf/pdf-template.njk`.
- [x] Delete lines 41–42 of `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk`.
- [x] Delete lines 43–44 of `libs/list-types/civil-and-family-daily-cause-list/src/pdf/pdf-template.njk`.
- [x] Verify in each of the six templates that the `courtHouseAddress` guard, the `line[]` loop and the `postCode` block are intact and that a court house with only town/county still renders its name without markup errors.

### Renderer tests

- [x] Update `libs/list-types/daily-cause-list-common/src/rendering/renderer.test.ts` line 46 to expect `["St Aldate's", "OX1 1TL"]`, keeping `town`/`county` in the input fixture (lines 25–30).
- [x] Rename the existing test around line 88 to state that `openJustice.venueName` falls back to the JSON venue name when the location does not resolve.
- [x] Add a test (mocked `getLocationById` returning a `name` different from `venue.venueName`) asserting `openJustice.venueName` is the location name — this must fail before the Bug 1 fix.
- [x] Add a test with `locale: "cy"` and a mocked `welshName` asserting `openJustice.venueName` is the Welsh location name.
- [x] Add a test asserting `openJustice.venueName === header.locationName` for both `en` and `cy`.
- [x] Add a test asserting `header.addressLines` excludes supplied `town` and `county`, and one asserting `["Line 1", "AB1 2CD"]` for a `line` + `postCode` only address.
- [~] Update `libs/list-types/cop-daily-cause-list/src/rendering/renderer.test.ts` lines 82–88 to assert COP passes the shared `openJustice` through unchanged (only if the COP override was removed). **NOT APPLICABLE — the COP override was not removed, so this test is unchanged and still passes.**

### Web template tests (Cheerio structural assertions, no raw HTML matching)

- [x] Update `apps/web/src/pages/(list-types)/civil-daily-cause-list/civil-daily-cause-list.njk.test.ts` `describe("Court house details")` (lines 171–205): expect `["1 Court Street", "Building B", "SW1A 1AA"]` at line 188, and rework the partial-address test (line 191) to `["2 Branch Road", "M1 1AA"]` with an accurate test name.
- [x] Update `apps/web/src/pages/(list-types)/family-daily-cause-list/family-daily-cause-list.njk.test.ts` `describe("Court house address")` (lines 238–274) the same way.
- [x] Update `apps/web/src/pages/(list-types)/civil-and-family-daily-cause-list/civil-and-family-daily-cause-list.njk.test.ts` `describe("Court house address variations")` (lines 195–228) the same way.
- [x] In each of the three web template tests, add an assertion that the supplied court-house `town` and `county` strings are absent from `$("#court-lists-container").text()`.
- [x] In each of the three web template tests, add an assertion that the important-information `<details>` block contains the value supplied as `openJustice.venueName`, in English and in Welsh (`t = cy`). Family already covers the English case at line 218; add civil and civil-and-family.
- [x] Add a court-house fixture with only `town`/`county` and assert the court house name still renders with no address paragraphs.

### PDF template tests (new — none exist today)

- [x] Add `"@hmcts/test-support": "workspace:*"` as a devDependency to `libs/list-types/civil-daily-cause-list/package.json`, `libs/list-types/family-daily-cause-list/package.json` and `libs/list-types/civil-and-family-daily-cause-list/package.json`, then run `yarn install`.
- [x] Create `libs/list-types/civil-daily-cause-list/src/pdf/pdf-template.njk.test.ts` using `createTestEnvironment([__dirname])` and `render` from `@hmcts/test-support` (never `nunjucks.configure()`), inferring Cheerio types from `render` rather than importing `cheerio`.
- [x] Create the equivalent `pdf-template.njk.test.ts` in `libs/list-types/family-daily-cause-list/src/pdf/`.
- [x] Create the equivalent `pdf-template.njk.test.ts` in `libs/list-types/civil-and-family-daily-cause-list/src/pdf/`.
- [x] In each PDF template test, assert: the `.info-box` renders the open justice sentence containing the supplied `openJustice.venueName` (in `en` and `cy`); `.header-section .address` renders exactly the supplied `header.addressLines`; a court house whose address includes `town`/`county` renders neither in `.court-section .address` while `line[]` and `postCode` still render.

### Verification

- [x] Run `yarn lint:fix` and `yarn format` from the repo root. **Done as `biome check --write` on the changed files (repo-wide `lint:fix` would rewrite untouched packages), then verified with `npx turbo lint --force` on all five changed workspaces — all pass.**
- [x] Run `yarn test` from the repo root and confirm the three CFT packages, `daily-cause-list-common`, `cop-daily-cause-list` and `apps/web` all pass. **69/70 turbo tasks pass. `apps/web` reports 375/376 files passing with a pre-existing `EADDRINUSE :::8080` unhandled error from `src/server.test.ts`; verified to reproduce identically on a stashed clean tree.**
- [ ] Manually load each of the three list pages and confirm the Important Information paragraph names the location (not the JSON venue) and that no town or county appears in the venue header or any court-house block. **NOT DONE — needs a running service and a browser; covered by automated renderer and template tests instead. Requires human verification.**
- [ ] Repeat the manual check with `?lng=cy` on all three pages and confirm the Welsh sentence names the Welsh location name. **NOT DONE — needs a running service. Welsh path covered by the `cy` renderer test and Welsh assertions in all six template tests. Requires human verification.**
- [ ] Download the generated PDF for each of the three list types and confirm the same two fixes in the info box and the address blocks. **NOT DONE — needs a running service and PDF generation. Covered by the three new `pdf-template.njk.test.ts` suites. Requires human verification.**
- [ ] Upload a payload that includes `town` and `county` for both `venue.venueAddress` and a `courtHouseAddress` and confirm it still passes schema validation and publishes successfully. **NOT DONE — needs a running service. No schema, validator or model was changed, and the existing `json-validator.test.ts` suites in all three packages still pass. Requires human verification.**

### E2E tests

- [x] Confirmed no E2E spec asserts town/county are displayed or asserts the open justice sentence content, so no `e2e-tests/` change is needed. `summary-of-publications.spec.ts`, `publication-authorisation.spec.ts` and `admin/manual-upload.spec.ts` do supply `town`/`county` in their payloads but only assert list titles, dates, court rooms, judges and case names. Per the repo's rule to minimise E2E count, no new E2E tests were added.
