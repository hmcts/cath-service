# #904 — CFT Lists Important Information Text Issue

## Implementation Tasks

### Bug 1 — merge the resolved location name into the Important Information text

- [ ] In `libs/list-types/daily-cause-list-common/src/rendering/renderer.ts` line 176, replace `venueName: jsonData.venue.venueName` with `venueName: locationName`, adding a one-line comment explaining *why* (the open justice statement must name the court resolved from the `location` table, not the JSON venue).
- [ ] Confirm no other code in the shared renderer depends on `openJustice.venueName` holding the raw JSON venue name; leave the `header` block (lines 168–173) and the `locationName` computation (lines 165–166) untouched.
- [ ] Remove the now-redundant `openJustice` override and its comment in `libs/list-types/cop-daily-cause-list/src/rendering/renderer.ts` lines 59–65 (subject to clarification 3).

### Bug 2 / Path A — stop emitting town and county from the venue address

- [ ] In `libs/list-types/daily-cause-list-common/src/rendering/renderer.ts`, delete the `town` block (lines 54–56) and the `county` block (lines 58–60) from `formatAddress`, keeping the `!address` guard and the empty-string filtering.

### Bug 2 / Path B — stop rendering court-house town and county (subject to clarification 1)

- [ ] Delete the town/county blocks at lines 76–81 of `apps/web/src/pages/(list-types)/civil-daily-cause-list/civil-daily-cause-list.njk`.
- [ ] Delete the town/county blocks at lines 82–87 of `apps/web/src/pages/(list-types)/family-daily-cause-list/family-daily-cause-list.njk`.
- [ ] Delete the town/county blocks at lines 79–84 of `apps/web/src/pages/(list-types)/civil-and-family-daily-cause-list/civil-and-family-daily-cause-list.njk`.
- [ ] Delete lines 41–42 of `libs/list-types/civil-daily-cause-list/src/pdf/pdf-template.njk`.
- [ ] Delete lines 41–42 of `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk`.
- [ ] Delete lines 43–44 of `libs/list-types/civil-and-family-daily-cause-list/src/pdf/pdf-template.njk`.
- [ ] Verify in each of the six templates that the `courtHouseAddress` guard, the `line[]` loop and the `postCode` block are intact and that a court house with only town/county still renders its name without markup errors.

### Renderer tests

- [ ] Update `libs/list-types/daily-cause-list-common/src/rendering/renderer.test.ts` line 46 to expect `["St Aldate's", "OX1 1TL"]`, keeping `town`/`county` in the input fixture (lines 25–30).
- [ ] Rename the existing test around line 88 to state that `openJustice.venueName` falls back to the JSON venue name when the location does not resolve.
- [ ] Add a test (mocked `getLocationById` returning a `name` different from `venue.venueName`) asserting `openJustice.venueName` is the location name — this must fail before the Bug 1 fix.
- [ ] Add a test with `locale: "cy"` and a mocked `welshName` asserting `openJustice.venueName` is the Welsh location name.
- [ ] Add a test asserting `openJustice.venueName === header.locationName` for both `en` and `cy`.
- [ ] Add a test asserting `header.addressLines` excludes supplied `town` and `county`, and one asserting `["Line 1", "AB1 2CD"]` for a `line` + `postCode` only address.
- [ ] Update `libs/list-types/cop-daily-cause-list/src/rendering/renderer.test.ts` lines 82–88 to assert COP passes the shared `openJustice` through unchanged (only if the COP override was removed).

### Web template tests (Cheerio structural assertions, no raw HTML matching)

- [ ] Update `apps/web/src/pages/(list-types)/civil-daily-cause-list/civil-daily-cause-list.njk.test.ts` `describe("Court house details")` (lines 171–205): expect `["1 Court Street", "Building B", "SW1A 1AA"]` at line 188, and rework the partial-address test (line 191) to `["2 Branch Road", "M1 1AA"]` with an accurate test name.
- [ ] Update `apps/web/src/pages/(list-types)/family-daily-cause-list/family-daily-cause-list.njk.test.ts` `describe("Court house address")` (lines 238–274) the same way.
- [ ] Update `apps/web/src/pages/(list-types)/civil-and-family-daily-cause-list/civil-and-family-daily-cause-list.njk.test.ts` `describe("Court house address variations")` (lines 195–228) the same way.
- [ ] In each of the three web template tests, add an assertion that the supplied court-house `town` and `county` strings are absent from `$("#court-lists-container").text()`.
- [ ] In each of the three web template tests, add an assertion that the important-information `<details>` block contains the value supplied as `openJustice.venueName`, in English and in Welsh (`t = cy`). Family already covers the English case at line 218; add civil and civil-and-family.
- [ ] Add a court-house fixture with only `town`/`county` and assert the court house name still renders with no address paragraphs.

### PDF template tests (new — none exist today)

- [ ] Add `"@hmcts/test-support": "workspace:*"` as a devDependency to `libs/list-types/civil-daily-cause-list/package.json`, `libs/list-types/family-daily-cause-list/package.json` and `libs/list-types/civil-and-family-daily-cause-list/package.json`, then run `yarn install`.
- [ ] Create `libs/list-types/civil-daily-cause-list/src/pdf/pdf-template.njk.test.ts` using `createTestEnvironment([__dirname])` and `render` from `@hmcts/test-support` (never `nunjucks.configure()`), inferring Cheerio types from `render` rather than importing `cheerio`.
- [ ] Create the equivalent `pdf-template.njk.test.ts` in `libs/list-types/family-daily-cause-list/src/pdf/`.
- [ ] Create the equivalent `pdf-template.njk.test.ts` in `libs/list-types/civil-and-family-daily-cause-list/src/pdf/`.
- [ ] In each PDF template test, assert: the `.info-box` renders the open justice sentence containing the supplied `openJustice.venueName` (in `en` and `cy`); `.header-section .address` renders exactly the supplied `header.addressLines`; a court house whose address includes `town`/`county` renders neither in `.court-section .address` while `line[]` and `postCode` still render.

### Verification

- [ ] Run `yarn lint:fix` and `yarn format` from the repo root.
- [ ] Run `yarn test` from the repo root and confirm the three CFT packages, `daily-cause-list-common`, `cop-daily-cause-list` and `apps/web` all pass.
- [ ] Manually load each of the three list pages and confirm the Important Information paragraph names the location (not the JSON venue) and that no town or county appears in the venue header or any court-house block.
- [ ] Repeat the manual check with `?lng=cy` on all three pages and confirm the Welsh sentence names the Welsh location name.
- [ ] Download the generated PDF for each of the three list types and confirm the same two fixes in the info box and the address blocks.
- [ ] Upload a payload that includes `town` and `county` for both `venue.venueAddress` and a `courtHouseAddress` and confirm it still passes schema validation and publishes successfully.
