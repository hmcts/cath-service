# Code Review: Issue #830

Third party subscriber status (Pending / Active / Suspended), Phase 1.

## Summary

Phase 1 of the plan has been implemented:
- a `status` column on `third_party_user`;
- domain helpers in `@hmcts/third-party-user`;
- the `/third-party-subscribers/:id/status` and `/status/success` pages;
- a Status row on the Manage page;
- view and update audit entries;
- Welsh content;
- unit, template and e2e tests.

The code is small, follows the sibling `delete/confirmation` and `delete/success` pages closely, and is type safe. Biome and `tsc --noEmit` pass for `libs/system-admin-pages` and `libs/third-party-user`. All unit and template tests pass: 502 in system-admin-pages, 43 in third-party-user and 3 in postgres-prisma.

Two genuine Phase 1 defects were found. Both are accessibility issues the new pages inherited from sibling templates, and I confirmed both by rendering the templates:
1. The status page `<title>` has no `Error:` prefix when validation fails.
2. The success page renders a "Back" link to `#`, which comes from the base template's default `backLink` block.

The Phase 1 verification task in tasks.md is still unchecked, and the e2e journey has never actually run.

Four ACs are not met. **None of them is a Phase 1 code defect:**
- Three are **deferred to Phase 2 by plan**: the ACTIVE delivery gate, skip logging, and test connection ignoring status.
- One is **replaced by plan, pending author agreement**: the backfill to ACTIVE.

Under the review rules these still make the verdict NEEDS CHANGES. postgres-prisma statement coverage is below 80%, but that reflects generated Prisma client code, not this change.

A pre-existing issue, not counted below: there is no app-wide CSRF token on POST forms (`libs/web-core/src/types/express.ts:15` declares `csrfToken` but nothing in `apps/web/src/app.ts` provides it). The new status form inherits this, the same as every sibling form. Raise it separately.

## 🚨 CRITICAL Issues

No genuine Phase 1 code defects are critical. The items below are listed because the review rules require every unmet AC to appear here.

1. **AC: "Existing subscribers already receiving pushes are set to ACTIVE when this is released"**. **Replaced by plan, pending author agreement.**
   - `apps/postgres/prisma/migrations/20261026143850_add_third_party_user_status/migration.sql:2` adds `DEFAULT 'PENDING'` and has no backfill.
   - **Impact:** None today. Per plan section 1, no `third_party_user` subscriber receives pushes yet, and the Courtel path (`legacy_third_party_*`) is untouched and ungated. The migration matches legacy `V1.15`.
   - **Fix:** Get the ticket author (junaidiqbalmoj) to agree in writing and reword the AC (plan Clarification 2) before merge. If the author refuses, add `UPDATE "third_party_user" SET "status" = 'ACTIVE';` to a new migration. Do not edit the generated one.

2. **AC: "Only `ACTIVE` subscribers receive publication pushes (new, updated and deleted publications)"**. **Deferred to Phase 2 by plan.**
   - There is no code to gate. `grep` confirms nothing reads `third_party_user` / `third_party_subscription` to deliver; the only readers are `libs/third-party-user/src/third-party-user-service.ts` and `.../subscriptions/manage/index.ts`.
   - **Fix:** Complete the Phase 2 checkpoint in tasks.md once the OAuth delivery ticket merges. See HIGH item 5 for the ordering risk.

3. **AC: "`PENDING` and `SUSPENDED` subscribers are skipped without error, and the skip is logged with the subscriber id"**. **Deferred to Phase 2 by plan.**
   - This depends on item 2 and on Clarification 1. Legacy added the skip log and removed it the next day.
   - **Fix:** Settle Clarification 1 with the ticket author before Phase 2 starts, because the answer decides whether the check goes in the service or in the query.

4. **AC: "Test connection (#829) works regardless of status"**. **Deferred to Phase 2 by plan (checkpoint).**
   - There is no test-connection code in the repo (`grep -i "test.?connection|healthCheck"` over `libs/third-party-user` and `libs/system-admin-pages` finds nothing), so there is nothing to verify.
   - **Fix:** At the checkpoint, confirm that #829 looks subscribers up with `findThirdPartyUserById` (which has no status filter) and add a regression test in #829.

## ⚠️ HIGH PRIORITY Issues

### Genuine Phase 1 defects

1. **The status page `<title>` has no `Error:` prefix on validation failure** (GOV.UK validation pattern, WCAG 2.2 SC 3.3.1 / 4.1.3 support).
   - **Files:**
     - `libs/system-admin-pages/src/pages/third-party-subscribers/[id]/status/index.njk:1-12` does not override `pageTitle`;
     - `libs/web-core/src/views/components/page-title.njk:1-2` renders `pageTitle` as it is.
   - **Verified:** I rendered the template with `errors` set. The title is `"Manage subscriber status -  - GOV.UK"`, with no `Error:`.
   - **Impact:** Screen reader users hear the title first on reload. Without the prefix they are not told the submission failed until they reach the error summary.
   - **Fix:** Use the pattern the repo already uses in `apps/web/src/pages/(verified)/case-name-search/index.njk:8`, for example:
     ```njk
     {% block pageTitle %}{% if errors %}{{ errorPrefix }} {% endif %}{% include "components/page-title.njk" %}{% endblock %}
     ```
     Add `errorPrefix: "Error:"` / `"Gwall:"` to `status/en.ts` and `status/cy.ts`, and add a template test for both locales.
   - The sibling system-admin pages, such as `delete/confirmation`, have the same gap. Don't copy it into a new page.

2. **The success page shows a "Back" link pointing to `#`.**
   - **Files:**
     - `libs/system-admin-pages/src/pages/third-party-subscribers/[id]/status/success/index.njk:1-4` does not override `backLink`;
     - `libs/web-core/src/views/layouts/base-template.njk:34-39` defaults to `govukBackLink({ text: back, href: "#" })`.
   - **Verified:** The rendered success page has exactly one `a.govuk-back-link` with `href="#"` and text "Back".
   - **Impact:** It is a dead link: activating it does nothing except add `#` to the URL, which fails users' expectations of where it goes (WCAG 2.4.4 link purpose). GOV.UK confirmation pages should not offer a Back link after a completed transaction, because going back invites a resubmit.
   - **Fix:** Add `{% block backLink %}{% endblock %}` to `success/index.njk`. Remove the then-unused `back` key from `success/en.ts:7` and `success/cy.ts:7`. Add a template test asserting `$("a.govuk-back-link")` has length 0. Raise the same bug against `delete/success` and `oauth-config/success` separately.

3. **The Phase 1 verification task is incomplete, and the e2e journey has never been executed.**
   - **Files:** `docs/tickets/830/tasks.md:42` ("Run `yarn lint:fix`, `yarn test` and the new e2e test") is unchecked. `e2e-tests/tests/system-admin/third-party-subscriber-status.spec.ts` could not run locally because of AADSTS50011, the same as every existing system-admin spec.
   - **Impact:** The selectors have not been proven against a real browser:
     - `getByRole("link", { name: "Change Status" })`;
     - the Cancel `<a role="button">`;
     - `getByRole("row", { name: subscriber.name })` on the list page;
     - the axe results on all three pages.
     The template tests cover the markup, but not the routing, the session or the audit middleware working together.
   - **Fix:** Run the spec in CI or against STG, where the SSO redirect URI is registered, before merge. Then tick the task.

### Required by the review rules

4. **postgres-prisma statement coverage is 16.88%** ⚠️ (below 80%).
   - The only change in this workspace is one schema line (`libs/postgres-prisma/prisma/schema/third-party-user.prisma:4`). The figure is driven by the generated Prisma client (`generated/prisma/runtime/client.js` at 15.62%). The hand-written `src/index.ts` is at 77.77%, which was already the case before this change.
   - **Recommendation:** Exclude `generated/**` from coverage in `libs/postgres-prisma`'s vitest config so the figure means something. No test change is needed for #830.

### Plan risk (deferred work, not a Phase 1 defect)

5. **The "Suspended" option is available in the UI before it has any effect.**
   - **Impact:** From the moment the OAuth delivery ticket merges until Phase 2 merges, an admin can set a subscriber to Suspended. The UI confirms "status has been successfully updated", but the subscriber still receives pushes. That is a misleading control on a data-sharing path.
   - **Recommendation:** Do one of the following:
     - make the OAuth delivery ticket depend on #830 Phase 2;
     - add the `ACTIVE` gate in the delivery ticket itself;
     - feature-flag the Status row and Change link until Phase 2 lands.
     Record whichever you choose in plan.md.

## 💡 SUGGESTIONS

1. **Build radio items in the controller, not with a Nunjucks `push` idiom.** In `status/index.njk:36-43`, the `(radioItems.push(...), radioItems)` comma trick is hard to read. The controller already maps `THIRD_PARTY_USER_STATUSES` (`status/index.ts:86`), so add `checked: value === selectedStatus` there and pass `items: statusItems` straight to `govukRadios`. This also moves the pre-selection logic into unit-testable TypeScript.

2. **Don't reimplement domain logic in mocks.** `status/index.test.ts:11-16` mocks `@hmcts/third-party-user` with its own copy of `isThirdPartyUserStatus` and `THIRD_PARTY_USER_STATUSES`. If the real list changes, these tests will still pass against the stale copy. Use `vi.importActual` for the two pure exports and mock only `findThirdPartyUserById` and `updateThirdPartyUserStatus`.

3. **The audit action string formats are inconsistent within the feature.** The POST entry goes through `auditLogMiddleware`, which normalises it to `UPDATE_THIRD_PARTY_SUBSCRIBER_STATUS` (`audit-log/middleware.ts:154-156`). The GET entry calls `logAction` directly and stores the raw enum value, `"View third party subscriber status"` (`status/index.ts:63`). The audit-log viewer will show the VIEW and UPDATE entries in different formats, which makes filtering awkward. `jurisdiction-management/service.ts:103` has the same split, but it is worth normalising here. Either pass `AuditLogAction.VIEW_THIRD_PARTY_SUBSCRIBER_STATUS.toUpperCase().replace(/[^A-Z0-9_]/g, "_")`, or extract the middleware's normaliser into a function that both paths use.

4. **Validation-failure audit entries get a path-derived action name containing the UUID.** `req.auditMetadata` is only set on success (`status/index.ts:43-47`). A validation re-render is therefore logged by the middleware as `THIRD_PARTY_SUBSCRIBERS_<uuid>_STATUS` (`middleware.ts:159-175`). Set `req.auditMetadata = { action: UPDATE_THIRD_PARTY_SUBSCRIBER_STATUS, entityInfo: ... }` before the `isThirdPartyUserStatus` check, without `shouldLog`, so failures carry the same action name.

5. **There is a race between the lookup and the update.** If the subscriber is deleted between `findThirdPartyUserById` (`status/index.ts:30`) and `updateThirdPartyUserStatus` (`:41`), Prisma throws P2025 and the admin sees a 500. Plan section 3 assumes the re-fetch covers this case, but there is still a window. Catch `P2025` and redirect to `/third-party-subscribers${lngParam}`, or accept the risk explicitly in plan.md.

6. **Consider a DB `CHECK` constraint.** `status` is a free `VARCHAR(20)` (`third-party-user.prisma:4`). Only the POST handler enforces the three allowed values; the test-support API or future Phase 2 code could write anything. A migration with `CHECK ("status" IN ('PENDING','ACTIVE','SUSPENDED'))` would make the AC hold at the data layer. Repo convention avoids Prisma enums, but a raw CHECK in a migration does not conflict with that.

7. **The visually hidden text casing is wrong.** `manage/index.njk:37` uses `tableHeadings.status`, so screen readers announce "Change Status" / "Newid Statws" with a capital letter mid-phrase. GOV.UK summary list examples use lowercase ("Change status"). Add a dedicated `changeStatusHidden: "status"` / `"statws"` key.

8. **Locale strings are duplicated.** `statusLabels` appears in both `manage/en.ts:9-13` and `status/en.ts:4-8`, and the same applies to `cy`. The plan accepts this, but the labels are tied to the domain's `THIRD_PARTY_USER_STATUSES`. A single shared locale in `libs/system-admin-pages/src/locales/` (or a key-parity test asserting both files match) would stop them drifting.

9. **The legend repeats the H1.** The H1 "Manage subscriber status" (`status/index.njk:23`) is followed by a separate `--m` legend "Status" (`:48-53`). GOV.UK question pages usually make the legend the page heading (`isPageHeading: true`). Keeping the AC's H1 is fine, but consider `legend: { text: pageTitle, isPageHeading: true, classes: "govuk-fieldset__legend--l" }` and dropping the standalone `<h1>`. Screen reader users would then hear the question once, not twice.

10. **The success page can be reached directly.** `status/success/index.ts` renders "status has been successfully updated" for any `:id`, including unknown ones and ones where no update happened. This matches the sibling success pages; a one-shot session flag set in POST would prevent a false confirmation.

11. **The e2e "Cancel without saving" check could be stronger.** `third-party-subscriber-status.spec.ts:49-52` asserts the Manage page text only. Also call `getTestThirdPartyUser(subscriber.id)` and assert `status === "PENDING"`; this means adding `status` to `ThirdPartyUserRecord` in `e2e-tests/utils/test-support-api.ts`. That proves nothing was posted.

12. **AAA layout.** testing.md asks for Arrange-Act-Assert. The new test in `libs/third-party-user/src/third-party-user-service.test.ts:177-189` and `third-party-user-status.test.ts` follow the existing file style (blank-line separated, no comments). That is acceptable, but add the comments if the team wants strict consistency with `status/index.test.ts`.

13. **Get Welsh sign-off.** The Welsh Language Unit should review the draft Welsh, especially "Yn yr arfaeth" (Pending) and "Wedi'i atal" (Suspended), before release (plan Clarification 3).

## ✅ Positive Feedback

- **The decisions are well researched.** Plan section 1 traces legacy CaTH behaviour (`V1.15`, `collectThirdPartySubscriberConfigurationList`, `handleThirdPartyHealthCheck`) and explains why the Courtel path stays ungated. The phasing is honest; it doesn't stub delivery code that doesn't exist.
- **Validation is tight.** `isThirdPartyUserStatus` (`third-party-user-status.ts:3-5`) takes `unknown` and is a real type guard. The tests reject lowercase, padded, array, object, null and number inputs. The POST handler reads `req.body?.status` as `unknown` (`status/index.ts:35`), so a missing body cannot crash it. There is no `any` and no unchecked `as` on user input.
- **The error wiring is correct.** The error summary links to `#status`. govuk-frontend 6.2.0's radios template (`radios/template.njk:21`) gives the first item `id="status"`, the template test asserts `input#status` (`status/index.njk.test.ts:56-60`), and the fieldset has `aria-describedby="status-error"`, which matches the inline error id (verified by rendering).
- **The audit design suits its context.** The view audit is wrapped in try/catch, with a comment explaining why, because `logAction` rethrows (`status/index.ts:55-69`). It is tested, including the failure path. The update audit records `OLD -> NEW`.
- **The access control is properly tested.** Each handler array is asserted to have `requireRole([SYSTEM_ADMIN])` first and the handler second (`status/index.test.ts:49-59`, `status/success/index.test.ts:23-28`).
- **The template tests follow testing.md:**
  - they use `createTestEnvironment` and Cheerio structural queries;
  - they use `toHaveLength`;
  - they have no AAA comments;
  - they assert both the error and no-error states;
  - they render both locales;
  - they check en/cy key parity, including the nested `statusLabels` and `tableHeadings`;
  - they confirm `select` is absent.
- **Progressive enhancement holds.** The page is a plain `<form method="post" novalidate>`, and Cancel is a link, so it posts nothing. No JavaScript is needed.
- **The e2e is a single journey, following CLAUDE.md:**
  - it covers the default status, pre-selection, Welsh, axe on three pages, Cancel, and selecting a radio with the keyboard;
  - it confirms the change and checks the final state;
  - it cleans up in `finally`.
- **Language is preserved** on every redirect and link (`lngParam`).

## Test Coverage Assessment

**Unit tests**

`status/index.test.ts` covers:
- not found on GET and POST, in en and cy;
- pre-selection;
- Welsh labels;
- the view audit, including audit failure;
- four invalid inputs × 2 locales;
- an undefined body;
- a successful update in en and cy;
- the update audit;
- resubmitting the same status.

The manage tests cover all three labels, Welsh, and the unknown-label fallback. The domain tests cover the type guard and the `update` call. The coverage is thorough.

**Template tests**

These cover the status, success and manage templates in both locales, with key parity. One gap: no test asserts the success page has no back link, or that the title has an `Error:` prefix (see HIGH items 1 and 2).

**E2E**

There is one journey spec, which has **not been executed** (see HIGH item 3). The validation error state cannot be reached through the UI, because a radio is always pre-selected (`status` is `NOT NULL`), so unit and template tests reasonably cover it.

**Accessibility**

The e2e runs axe inline on the Manage, Status and Success pages, but it has not run. No automated check catches the `href="#"` back link or the missing `Error:` prefix.

**Statement coverage per changed workspace** (the "All files" % Stmts from `npx vitest run --coverage` in each workspace directory):

| Workspace | % Stmts | Notes |
|---|---|---|
| `@hmcts/third-party-user` | 83.6% | `third-party-user-status.ts` is fully covered and omitted from the table. `third-party-user-service.ts` is at 95.45%. The shortfall is in the pre-existing `vault-service.ts` (67.85%, lines 31-47). |
| `@hmcts/system-admin-pages` | 93.64% | `[id]/status` 100% (branches 76.92%; the `\|\| "en"` and `req.user?.x \|\| "unknown"` fallbacks are uncovered), `[id]/status/success` 100%, `[id]/manage` 100%, `src/audit-log` 95.76% |
| `@hmcts/postgres-prisma` | ⚠️ 16.88% | Almost all of this is the generated Prisma client. The only #830 change is one schema line. Hand-written `src/index.ts` is at 77.77%. |

## Acceptance Criteria Verification

**Status values and defaults**
- [x] A third-party subscriber has one of three statuses: `PENDING`, `ACTIVE`, `SUSPENDED`. See `libs/third-party-user/src/third-party-user-status.ts:1-5` and POST validation at `libs/system-admin-pages/src/pages/third-party-subscribers/[id]/status/index.ts:37-39`. The DB has no CHECK constraint (suggestion 6).
- [x] A newly created subscriber defaults to `PENDING`. See `libs/postgres-prisma/prisma/schema/third-party-user.prisma:4` and `apps/postgres/prisma/migrations/20261026143850_add_third_party_user_status/migration.sql:2`. `createThirdPartyUser` relies on the DB default (`third-party-user-service.ts:32`).
- [ ] Existing subscribers already receiving pushes are set to `ACTIVE` when this is released, so current delivery is not interrupted. **Replaced by plan, pending author agreement.** The migration defaults all rows to PENDING, as legacy V1.15 did. No `third_party_user` row receives pushes today, and the Courtel path is untouched.

**Manage subscriber page (`/third-party-subscribers/:id/manage`)**
- [x] The summary list shows a **Status** row (displayed as Pending / Active / Suspended) with a **Change** link. See `[id]/manage/index.njk:29-41` (the row and the Change link at `:35-37`), the label mapping at `[id]/manage/index.ts:30`, and the content at `[id]/manage/en.ts:7-14` and `cy.ts:7-14`.

**Change status page (`/third-party-subscribers/:id/status`)**
- [x] Only System Admins can access it. See `[id]/status/index.ts:52-53` (`requireRole([USER_ROLES.SYSTEM_ADMIN])` on GET and POST) and `[id]/status/success/index.ts:19`.
- [x] The page title and H1 are "Manage subscriber status". See `[id]/status/en.ts:2`, the H1 at `[id]/status/index.njk:23`, and the title through `libs/web-core/src/views/components/page-title.njk:1-2`. The `Error:` prefix is missing (HIGH item 1), but that is not part of this AC.
- [x] The current status is pre-selected. See `[id]/status/index.njk:41` (`checked: item.value == selectedStatus`), with `selectedStatus: user.status` coming from `[id]/status/index.ts:21`.
- [x] The admin chooses one status and selects **Confirm**; **Cancel** returns to the Manage subscriber page without saving. Confirm is at `[id]/status/index.njk:59-61`, and the update and redirect at `[id]/status/index.ts:41-49`. Cancel is a link to `manageUrl` at `[id]/status/index.njk:6` and `:63-67`, so nothing is posted.
- [x] Use GOV.UK radios rather than the legacy `<select>`. See `govukRadios` at `[id]/status/index.njk:45-56`; the template test at `index.njk.test.ts:70-74` asserts there is no `select`.
- [x] If no status is submitted or the value is invalid, show an error summary and an inline error: "Select a status". See `[id]/status/index.ts:37-39`, `[id]/status/en.ts:12`, the error summary at `[id]/status/index.njk:16-21` and the inline error at `:27-34`. The `#status` href matches the first radio's id.
- [x] An unknown subscriber id redirects to `/third-party-subscribers`. See `[id]/status/index.ts:14-17` (GET) and `:30-33` (POST).

**Success page (`/third-party-subscribers/:id/status/success`)**
- [x] A GOV.UK confirmation panel: "Third party account status updated" / "Third party account status has been successfully updated.". See `[id]/status/success/index.njk:8-11` and `[id]/status/success/en.ts:3-4`.
- [x] Followed by: "To further update third party account, you can go to:" with a link to **Manage third party subscribers**. See `[id]/status/success/index.njk:13-16` and `[id]/status/success/en.ts:5-6`.

**Delivery**
- [ ] Only `ACTIVE` subscribers receive publication pushes (new, updated and deleted publications). **Deferred to Phase 2 by plan.** No OAuth delivery code exists yet.
- [ ] `PENDING` and `SUSPENDED` subscribers are skipped without error, and the skip is logged with the subscriber id. **Deferred to Phase 2 by plan**, with logging pending Clarification 1.
- [ ] Test connection (#829) works regardless of status, so a Pending subscriber can be verified before activation. **Deferred to Phase 2 by plan (checkpoint).** #829 is not in the codebase, so there is no evidence either way.

**Audit**
- [x] Viewing the status page and updating the status are both written to the audit log, following the other third-party subscriber pages.
  - **View:** `[id]/status/index.ts:19` and `:56-69`.
  - **Update:** `req.auditMetadata` at `[id]/status/index.ts:43-47`.
  - **Enum values:** `libs/system-admin-pages/src/audit-log/logger.ts:25` and `:27`.
  - The action string format differs between the two entries (suggestion 3).

**Welsh**
- [x] All content on the new pages is available in Welsh (legacy pip-frontend only has English placeholders, so translations are needed).
  - **Files:** `[id]/status/cy.ts:1-14`, `[id]/status/success/cy.ts:1-8` and `[id]/manage/cy.ts:7-14`.
  - **Tests:** key parity is tested in `status/index.njk.test.ts:160-164`, `status/success/index.njk.test.ts` (the "status success content" block) and `manage/index.njk.test.ts` (the "manage content" block).
  - Welsh Language Unit sign-off is still outstanding (suggestion 13).

**Tally:** 14 met, 0 partial, 4 not met, out of 18. Three of the four are deferred to Phase 2 by plan and one is replaced by plan, pending author agreement.

## Next Steps

- [ ] Add the `Error:` / `Gwall:` title prefix to the status page, with template tests (HIGH 1)
- [ ] Remove the `href="#"` back link from the success page, with a template test (HIGH 2)
- [ ] Run the e2e spec in CI or STG, where the SSO redirect URI is valid, then tick the Phase 1 verification task in tasks.md (HIGH 3)
- [ ] Exclude generated Prisma code from postgres-prisma coverage, or note it as accepted (HIGH 4)
- [ ] Agree delivery-ticket ordering, or feature-flag the Change link, so "Suspended" never appears to work when it doesn't (HIGH 5)
- [ ] Get the ticket author to agree to the PENDING default in place of the ACTIVE backfill, and reword the AC (CRITICAL 1)
- [ ] Resolve Clarification 1 (skip logging) before Phase 2 (CRITICAL 3)
- [ ] At the Phase 2 checkpoint: add the ACTIVE gate on every send path and confirm that #829 ignores status (CRITICAL 2-4)
- [ ] Consider suggestions 1-4 (controller-built radio items, `importActual` in mocks, consistent audit action names, audit metadata on validation failure)
- [ ] Get Welsh Language Unit sign-off

## Overall Assessment

**NEEDS CHANGES**

The Phase 1 code is good quality and close to mergeable. The two genuine defects (HIGH 1 and 2) are each one-line template fixes, and the e2e needs to actually run. The NEEDS CHANGES verdict is also required by the review rules: four ACs are unmet (three deferred to Phase 2, one replaced pending author agreement), and postgres-prisma coverage is below 80% because of generated code. None of those reflects a defect in the Phase 1 code. Once the HIGH items are fixed and the author agrees the backfill change, Phase 1 could reasonably be merged on its own as the plan describes, provided HIGH 5 (delivery ordering) is settled first.

## Follow-up fixes (after review)

Both genuine Phase 1 defects are fixed, on the new pages only. The existing third-party subscriber pages have the same two issues and are deliberately left alone, because they are outside this ticket's scope.

- **"Error:" title prefix:** `status/index.njk` now overrides `pageTitle` and adds `errorPrefix` ("Error:" / "Gwall:") when there are errors. Template tests cover both locales, with and without errors.
- **Success page back link to `#`:** `status/success/index.njk` now empties the `backLink` block, following `manual-upload-success`. The unused `back` key is removed from the success page's `en.ts`/`cy.ts`. A template test asserts that there is no back link.

`@hmcts/system-admin-pages`: 505/505 tests pass, and Biome and `tsc --noEmit` are clean.
