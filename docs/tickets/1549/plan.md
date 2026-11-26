# #1549: Show "Save subscriptions" on every page of third-party Manage subscriptions: Technical Plan

## 1. Technical Approach

The page at `/third-party-subscribers/:id/subscriptions/manage` already keeps pending selections in the session across pages. The GET handler seeds them from the subscriber's existing subscriptions. Only two things block saving from any page:

- **Template**: `index.njk` lines 89–93 render either Save or Next, depending on `isLastPage`.
- **Controller**: `postHandler` in `index.ts` lines 104–110 decides between "go to next page" and "save" using only `isLastPage`. The form does not submit which button was pressed.

The fix:

1. Render both buttons inside a `govuk-button-group`. Each button is a named submit button (`name="action"`, `value="save"` or `value="next"`). "Save subscriptions" is the primary button and appears on every page. "Next" is a secondary button and appears on every page except the last.
2. In `postHandler`, branch on `req.body.action` rather than on `isLastPage`. Every POST still merges the current page's selections into `session.thirdPartySubscriptions.pending`, as lines 94–102 do now, before the branch.
3. Make the POST session fallback safe. Lines 89–92 currently create an empty `pending` when the session is missing. Saving that empty `pending` would delete every subscription on pages the user hasn't visited, because `updateThirdPartySubscriptions` (`libs/third-party-user/src/third-party-user-service.ts` lines 34–59) deletes all rows and then recreates them. Today this is unlikely: you can only save from the last page, which you reach through GETs that seed the session. Once Save is on page 1, it is the main risk this fix introduces. The POST must seed from the user's existing subscriptions, using the same logic as GET lines 40–49. It must also do this when the session belongs to a different subscriber (`userId !== id`).

Key considerations:
- **Progressive enhancement**: plain HTML submit buttons with name/value, so no JavaScript is needed. The browser sends only the name/value of the button that was clicked.
- **Implicit submission**: pressing Enter inside the form submits with the first submit button in DOM order. With Save first, Enter saves. This matches GOV.UK guidance that the primary action comes first. See Clarifications.
- **No DB or API changes.** The service function, audit logging (lines 112–126) and the success redirect stay as they are.
- **Session shape is unchanged**: `{ thirdPartySubscriptions?: { userId: string; pending: Record<string, string> } }`, where `pending` is keyed by `listType.name` and the value is `PUBLIC | PRIVATE | CLASSIFIED`.

## 2. Implementation Details

TEMPLATE SOURCE: n/a — bug fix to an existing cath-service template (the third-party subscriber manage-subscriptions `index.njk`); no new page and nothing to migrate from pip-frontend.

Page directory: `libs/system-admin-pages/src/pages/third-party-subscribers/[id]/subscriptions/manage/`

| File | Change |
|---|---|
| `index.njk` | Replace lines 89–93 (the `{% if isLastPage %}` block) with a `govuk-button-group` containing `govukButton({ text: saveButton, name: "action", value: "save" })` and, inside `{% if not isLastPage %}`, `govukButton({ text: nextButton, name: "action", value: "next", classes: "govuk-button--secondary" })`. Nothing else in the template changes. |
| `index.ts` | (a) Extract a module-local helper `buildExistingSubscriptions(subscriptions, listTypes): Record<string, string>` from GET lines 40–49 and use it in both handlers. (b) In `postHandler`, replace lines 89–92: when `!session.thirdPartySubscriptions \|\| session.thirdPartySubscriptions.userId !== id`, seed `pending` from `buildExistingSubscriptions(user.subscriptions, listTypes)`. (c) Clamp `page` to `[1, max(totalPages, 1)]` in both handlers. To do this, move the `totalPages` calculation above the page slice. (d) Replace lines 104–110 with an action branch (below). |
| `en.ts` / `cy.ts` | No new keys. `saveButton` ("Save subscriptions" / "Cadw tanysgrifiadau") and `nextButton` ("Next" / "Nesaf") already exist. `previousButton` exists but is unused. See Clarifications. |
| `index.test.ts` | Update and extend the POST tests (see Test Scenarios). |
| `index.njk.test.ts` (new) | Template test using `createTestEnvironment` / `render` from `@hmcts/test-support`, with the template dir and `libs/web-core/src/views`. |
| `libs/system-admin-pages/package.json` | Add `"@hmcts/test-support": "workspace:*"` to `devDependencies`. The package has no template tests yet. |
| `e2e-tests/tests/system-admin/third-party-user-management.spec.ts` | Rewrite the "user can manage subscriptions for a third party user @nightly" journey (lines 100–156). Its loop that clicks Next until Save appears (lines 132–148) no longer reflects the behaviour. |

POST branch (replaces lines 104–110):

```ts
const totalPages = Math.max(1, Math.ceil(listTypes.length / PAGE_SIZE));
const isLastPage = page >= totalPages;
const action = req.body.action;
const lngSuffix = locale === "cy" ? "&lng=cy" : "";
const manageUrl = `/third-party-subscribers/${id}/subscriptions/manage`;

const isSave = action === "save" || (action !== "next" && isLastPage);

if (!isSave) {
  return res.redirect(`${manageUrl}?page=${isLastPage ? page : page + 1}${lngSuffix}`);
}
// existing save + audit + success redirect (lines 112–128), unchanged
```

`action` is not a list type name. List type names are upper snake case, such as `CIVIL_DAILY_CAUSE_LIST`, so the body key can't collide with a list type field.

API endpoints and DB schema: no changes.

## 3. Error Handling & Edge Cases

| Case | Behaviour |
|---|---|
| Save on page 1, pages 2..N never visited | `pending` was seeded in GET from existing subscriptions, so unvisited list types keep their current sensitivity. Only page 1's list types are overwritten from the body. |
| Session missing at POST (expired, or POST without a prior GET) | Seed from `user.subscriptions` before merging. This prevents the delete-all-then-recreate in `updateThirdPartySubscriptions` from wiping unvisited pages. |
| Session belongs to another subscriber (two tabs, `userId !== id`) | Re-seed for this subscriber, so another subscriber's pending selections are never saved here. This is also a fix to the current POST, which only checks that the session exists. |
| `action` missing or unrecognised (e.g. `delete`, `""`, array) | Behaves exactly as today (decided): on the last page it saves; on any other page it goes to the next page. |
| `action=next` on the last page (tampered) | No DB write; redirect to the same page. |
| `page` invalid (`abc`, `0`, `-1`) | Already coerced to 1 by `Math.max(1, parseInt(...) \|\| 1)`. |
| `page` greater than `totalPages` | Clamp to `totalPages`. Otherwise GET renders an empty table, and POST would slice nothing and save. |
| Zero list types | `totalPages` is treated as 1, page 1 is the last page, only Save is shown, and saving stores nothing. |
| Subscriber not found | Unchanged: redirect to `/third-party-subscribers` (with `?lng=cy` for Welsh). |
| Welsh | The form posts to the current URL, which keeps `?page=N&lng=cy` because the form has no `action` attribute. The next/same-page redirects append `&lng=cy`. The success redirect uses `lngParam`. Button text comes from `cy.ts`. |
| Unauthorised user | Unchanged: `requireRole([USER_ROLES.SYSTEM_ADMIN])` on GET and POST. |
| Leaving without saving | Pending selections stay in the session until the next save or until the user's session expires. Moving between pages never writes to the DB. |

## 4. Acceptance Criteria Mapping

| AC | How it is satisfied | Verified by |
|---|---|---|
| Save visible on every page | The template renders Save without any condition | Template test (first, middle and last page); E2E asserts Save on page 1 |
| Saving from any page keeps current-page, visited-page and existing unvisited selections | Every POST merges into session `pending`. GET and POST seed from existing subscriptions. `action=save` persists the whole `pending` map. | Unit tests: save from page 1 with seeded session, and save with no session; E2E saves from a page that isn't the last and checks persistence |
| Next on every page except last | `{% if not isLastPage %}` around the Next button | Template test (Next present on page 1, absent on last page); unit test that `action=next` redirects to `page+1` |
| Move between pages without saving | `action=next` only updates the session and redirects. `updateThirdPartySubscriptions` is not called. | Unit test asserts the service is not called; E2E clicks Next first |
| Works in Welsh | Existing `cy.ts` keys; redirects keep `lng=cy` | Template test with `cy`; unit tests for the Welsh next and save redirects; E2E Welsh check on page 1 |
| Tests updated | `index.test.ts`, new `index.njk.test.ts`, updated E2E journey | Covered by the tasks in tasks.md |

## 5. Test Scenarios

E2E: one journey (update the existing test, don't add new ones).

- **E2E-1: system admin saves third-party subscriptions from a page that isn't the last (`@nightly`)**
  1. Create the subscriber via API and open Manage subscriptions.
  2. Assert that page 1 shows "Page 1 of N" and both Save and Next.
  3. Run an Axe check.
  4. Switch to Welsh and assert "Cadw tanysgrifiadau" and "Nesaf" are visible, then switch back.
  5. Select Public for the first list type and click Next.
  6. On page 2, assert Save is visible and select Private for the first list type.
  7. Click Save. Page 2 is not the last page in a seeded environment with more than 40 list types.
  8. Assert the success panel.
  9. Reopen Manage subscriptions and assert both selections are checked: page 1's radio, and page 2's after clicking Next.

  Error paths covered by unit tests: the tampered action, session handling and page clamping cases in section 3. These paths are not E2E journeys.

Unit (`index.test.ts`, AAA):
- U1: GET clamps `page` greater than `totalPages`, and still renders `isLastPage` correctly. Update the existing "should indicate last page" test.
- U2: POST `action=next` on a page that isn't the last stores the page selections in the session, redirects to `?page=2`, and does not call `updateThirdPartySubscriptions`. Mock 21+ list types so there are 2 pages.
- U3: POST `action=next` in Welsh redirects to `?page=2&lng=cy`.
- U4: POST `action=save` on page 1 of 2 persists the merged map: page 1 body values plus seeded values for page 2 list types. It then redirects to success and sets the audit metadata.
- U5: POST `action=save` with no session seeds from `user.subscriptions`, so an unvisited page's existing subscription is kept.
- U6: POST `action=save` with a session for a different `userId` re-seeds and does not save the other subscriber's selections.
- U7: POST with no `action` keeps today's behaviour: on page 1 of 2 it redirects to `?page=2` without saving; on the last page it saves and redirects to success.
- U8: POST `action=save` on the last page in Welsh redirects to `/success?lng=cy`. Update the existing last-page save tests to send `action: "save"`.
- Keep the existing "user not found" and "audit metadata" tests. Add `action: "save"` to the audit test.

Template (`index.njk.test.ts`, Cheerio, no AAA comments):
- T1: on a page that isn't the last, there is one `button[name=action][value=save]` with the text `en.saveButton`, and one `button[name=action][value=next]` with the secondary class, both inside `.govuk-button-group`.
- T2: on the last page, Save is present and Next is absent.
- T3: Welsh render shows `cy.saveButton` and `cy.nextButton`.
- T4: locale-key parity between `en` and `cy`, for top-level keys and the nested `tableHeadings` and `sensitivityOptions`.
- T5: both `useDropdown` variants render the buttons, so the button group sits outside the dropdown/radio branch.

## 6. Open Questions

### Decisions (2026-11-18)

1. Previous / GOV.UK Pagination: out of scope for this ticket.
2. Button order: Save (primary) first, then Next (secondary).
3. Missing or unrecognised `action`: behave as today (save on the last page, go to the next page otherwise).
5. After saving from any page: go to the success page, as now.

4. E2E suite: leave the `test.describe.skip` in place. Still update the journey, but it won't run until the suite is unskipped.
6. Untranslated "for" in the hidden labels: leave as is; out of scope.

No clarifications remain open.

### CLARIFICATIONS NEEDED (original list)

1. **Previous and numbered navigation**: should this ticket add the GOV.UK Pagination component or a "Previous" button, or should that be deferred? `previousButton` already exists in `en.ts`/`cy.ts` but is unused. Pagination links are GET links, so they would skip the POST that merges the current page into the session, and the user would lose the current page's unsaved changes. Proposal: defer to a separate ticket. Pagination would need either submit-button pagination or a POST-and-redirect design.
2. **Button order and Enter key**: proposal is Save (primary) first and Next (secondary) second. Pressing Enter then saves. Is that acceptable, or should Next come first, so implicit submission navigates and the primary button sits second?
3. **Tampered or missing `action`**: proposal is to treat it as a no-op redirect to the current page. The current last-page behaviour saves without needing an `action`. Confirm no other client posts to this route without `action`.
4. **E2E suite is skipped**: `test.describe.skip("Third Party User Management")` at line 25–26 of the spec means the updated journey won't run. Should this ticket unskip it, or is it skipped for an environment reason that is tracked elsewhere?
5. **Success then return**: after saving from page 1, should the user still go to the success page (proposed, keeping current behaviour), or stay on the same page with a notification banner?
6. **Untranslated aria-label fragment**: not in scope, but the select `aria-label` and the radio hidden labels contain a hardcoded English "for" (template lines 32, 62, 68, 74, 80). Should that be fixed here, as part of "works in Welsh", or raised separately?
