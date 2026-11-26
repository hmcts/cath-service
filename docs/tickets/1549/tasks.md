# #1549: Implementation Tasks

Page directory: `libs/system-admin-pages/src/pages/third-party-subscribers/[id]/subscriptions/manage/`

## Implementation Tasks

### Template
- [x] In `index.njk`, replace lines 89–93 (`{% if isLastPage %}` save / else next) with a `govuk-button-group` containing:
  - `govukButton({ text: saveButton, name: "action", value: "save" })` on every page
  - `govukButton({ text: nextButton, name: "action", value: "next", classes: "govuk-button--secondary" })` inside `{% if not isLastPage %}`

### Controller (`index.ts`)
- [x] Extract a module-local (not exported) `buildExistingSubscriptions(subscriptions, listTypes)` from GET lines 40–49 and use it in GET.
- [x] In `postHandler`, replace lines 89–92 so that when the session is missing or `userId !== id`, `pending` is seeded from `buildExistingSubscriptions(user.subscriptions, listTypes)` and not set to `{}`.
- [x] In both handlers, compute `totalPages` as `Math.max(1, Math.ceil(listTypes.length / PAGE_SIZE))` and clamp `page` to `[1, totalPages]` before slicing.
- [x] Replace lines 104–110 with an action branch:
  - Save when `action === "save"`, or when `action` isn't `"next"` and this is the last page (today's behaviour for a missing or unrecognised action).
  - Otherwise redirect without saving: to `?page=N+1` on a page that isn't the last, or to the current page on the last page (plus `&lng=cy`).
  - Saving keeps the existing save, audit and success-redirect code (lines 112–128).
- [x] Leave `en.ts` / `cy.ts` unchanged. Confirm `saveButton` and `nextButton` exist in both.

### Unit tests (`index.test.ts`, AAA)
- [x] Add a mock helper that returns 21+ list types so the tests have 2 pages.
- [x] U1: GET clamps a `page` above `totalPages`. Update the "should indicate last page" test.
- [x] U2: POST `action=next` on page 1 of 2 stores the selections in the session, redirects to `?page=2`, and does not call `updateThirdPartySubscriptions`.
- [x] U3: POST `action=next` in Welsh redirects to `?page=2&lng=cy`.
- [x] U4: POST `action=save` on page 1 of 2 persists the page 1 body values merged with the seeded page 2 values, redirects to success and sets the audit metadata.
- [x] U5: POST `action=save` with no session seeds from `user.subscriptions`, so an existing subscription on an unvisited page is kept.
- [x] U6: POST `action=save` with a session for a different `userId` re-seeds and does not save that subscriber's pending values.
- [x] U7: POST with no `action` keeps today's behaviour: page 1 of 2 redirects to `?page=2` without saving; the last page saves and redirects to success.
- [x] U8: POST `action=save` in Welsh redirects to `/success?lng=cy`.
- [x] Add `action: "save"` to the existing last-page save and audit-metadata tests.

### Template tests (new `index.njk.test.ts`)
- [x] Add `"@hmcts/test-support": "workspace:*"` to `devDependencies` in `libs/system-admin-pages/package.json` and run `yarn install`.
- [x] Use `createTestEnvironment([__dirname, <libs/web-core/src/views>])` and `render` with a `baseData(locale, overrides)` builder. Use Cheerio structural assertions and no AAA comments.
- [x] T1: on a page that isn't the last, Save (`button[name=action][value=save]`) and secondary Next (`button[name=action][value=next]`) are both inside `.govuk-button-group`.
- [x] T2: on the last page, Save is present and Next is absent (`toHaveLength(0)`).
- [x] T3: the Welsh render shows `cy.saveButton` and `cy.nextButton`.
- [x] T4: `en` and `cy` have the same keys, including `tableHeadings` and `sensitivityOptions`.
- [x] T5: the buttons render with both `useDropdown: true` and `useDropdown: false`.

### E2E (`e2e-tests/tests/system-admin/third-party-user-management.spec.ts`)
- [x] E2E-1: rewrite "user can manage subscriptions for a third party user @nightly" (lines 100–156) and remove the loop that clicks Next until Save appears (lines 132–148). The new journey:
  1. On page 1, assert both Save and Next are visible, and run the Axe check.
  2. Switch to Welsh and assert "Cadw tanysgrifiadau" and "Nesaf" are visible, then switch back.
  3. Select Public for the first list type and click Next.
  4. On page 2, select Private for the first list type and click Save.
  5. Assert the success panel.
  6. Reopen Manage subscriptions and assert that page 1's selection and page 2's selection (after clicking Next) are checked.
- [x] Leave `test.describe.skip` (lines 25–26) in place, as decided, and note in the PR that the updated journey doesn't run while the suite is skipped.

### Verification
- [x] Run `yarn test` for `@hmcts/system-admin-pages`, then `yarn lint:fix` from the root.
- [ ] Check manually: save from page 1 in English and Welsh, and confirm the subscriptions on unvisited pages are unchanged in the DB.
