# Issue #742 — Implementation Tasks

## Content
- [ ] Add `sjpAdvisoryPrefix` and `sjpAdvisoryMessage` to `apps/web/src/pages/(public)/summary-of-publications/en.ts`
- [ ] Add `sjpAdvisoryPrefix` and `sjpAdvisoryMessage` to `apps/web/src/pages/(public)/summary-of-publications/cy.ts` using the Welsh copy from the ticket

## Controller
- [ ] Add module-scope `const SJP_LOCATION_ID = 9;` to the top of `apps/web/src/pages/(public)/summary-of-publications/index.ts`
- [ ] Pass `isSjpVenue`, `sjpAdvisoryPrefix` and `sjpAdvisoryMessage` into the existing `res.render` call

## Template
- [ ] Insert the advisory `<p class="govuk-body" id="sjp-publishing-advisory">` block into `index.njk` between the `cautionMessage` block and the `publications.length > 0` conditional, with `<strong>` around the prefix

## Unit tests — `summary-of-publications/index.test.ts`
- [ ] `locationId=9` with publications → `isSjpVenue: true` and English advisory strings in the render context
- [ ] `locationId=9` with no publications → same advisory values passed
- [ ] `locationId=1` → `isSjpVenue: false`
- [ ] `locationId=9` with `locale: "cy"` → Welsh advisory strings

## Template tests — `summary-of-publications/index.njk.test.ts`
- [ ] Extend the `buildData` helper with `isSjpVenue: false` and the two advisory keys
- [ ] Advisory renders once with bold `Please note:` when `isSjpVenue` is true
- [ ] Advisory appears before `selectListMessage` in the publications-present state
- [ ] Advisory appears before `noPublicationsMessage` in the empty state
- [ ] Advisory absent when `isSjpVenue` is false, in both states
- [ ] `cautionMessage` renders before the advisory when both are present
- [ ] Welsh advisory renders with `cy` locale and no English advisory text remains
- [ ] Add `sjpAdvisoryPrefix` and `sjpAdvisoryMessage` to the required-keys assertion

## E2E
- [ ] Extend the existing unauthenticated SJP journey in `e2e-tests/tests/publication-authorisation.spec.ts` (`locationId=9`) to assert the advisory and its bold prefix, and the Welsh advisory at the existing `lng=cy` step — do not add a standalone test
- [ ] Assert the advisory is absent in an existing non-SJP journey in `e2e-tests/tests/summary-of-publications.spec.ts`

## Verify
- [ ] `yarn lint:fix` and `yarn format`
- [ ] `yarn test` passes from the repo root
- [ ] Manually check `/summary-of-publications?locationId=9` and `?locationId=9&lng=cy`, plus a non-SJP location
