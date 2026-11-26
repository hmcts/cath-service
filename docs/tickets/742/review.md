# Code Review: Issue #742 - SJP publishing-time advisory on /summary-of-publications

## Summary

A small change to page content and display logic in one page directory, `apps/web/src/pages/(public)/summary-of-publications/`, plus additions to two existing E2E journeys:

- `en.ts:12-13` / `cy.ts:26-28`: two new keys, `sjpAdvisoryPrefix` and `sjpAdvisoryMessage`. The English matches the AC word for word. The Welsh is the copy supplied in the ticket.
- `index.ts:10-12`: a module-scope constant, `SJP_LOCATION_ID = 9`. `index.ts:137` works out `isSjpVenue` from the parsed integer `locationId`. `index.ts:151-153` passes three flat props to the template.
- `index.njk:29-33`: one conditional `<p class="govuk-body" id="sjp-publishing-advisory"><strong>...</strong> ...</p>`. It sits after the FaCT paragraph and caution message, and before the branch that shows either the list or the no-list message.
- Tests: 5 controller tests, 9 template tests (one of them an `it.each` with 2 cases), and an extended `requiredKeys` check. The existing unauthenticated location-9 E2E journey now has advisory checks and inline axe scans in English and Welsh. The existing non-SJP no-publications E2E test now asserts the advisory is absent.

The implementation is the smallest change that meets the AC. It follows the plan exactly, and I found nothing that needs fixing before merge.

**Hardcoded location ID is acceptable.** I checked this rule directly. `libs/postgres-prisma/prisma/schema/location.prisma:70` declares `locationId Int @id @map("location_id")` with no `@default(autoincrement())`. `libs/location/src/location-data.ts:67-68` explicitly seeds `locationId: 9` as `"Single Justice Procedure"`. The CLAUDE.md ban applies to `ListType.id`, which is autoincrement. `Location.locationId` is set explicitly, so it is the same in every environment. The existing code already relies on the literal: `apps/web/src/pages/(public)/view-option/index.ts:42` and `apps/web/src/pages/(verified)/account-home/index.njk:22`. The comment at `index.ts:10-11` explains why the value is stable, which is the kind of comment CLAUDE.md allows.

## 🚨 CRITICAL Issues

None.

- **Security:** Both new strings go through default Nunjucks autoescaping (`index.njk:31`). There is no `| safe` and no `| sanitiseHtml`. The bold text comes from a real `<strong>` element, not from HTML inside the locale string. `index.njk.test.ts:299-315` proves that injected `<script>`, `<img onerror>` and `<em>` are escaped. No user input is added. The existing `/400` guards (`index.ts:25-39`) run before `isSjpVenue` is worked out.
- **Accessibility:** It uses a semantic `<p>` + `<strong>`, with no ARIA, no live region, no new tab stop and no change to headings. The text is always in the DOM in the right reading order. It inherits `govuk-body` contrast.
- **Type safety:** No new `any`. The comparison is `number === number`, with no type coercion.

## ⚠️ HIGH PRIORITY Issues

None.

## 💡 SUGGESTIONS

1. ✅ **FIXED** — raw `html` asserts replaced with a structural check that the escaped prefix renders as literal text. **Raw-HTML string assertions in the escaping test** (`index.njk.test.ts:313-314`)
   - `expect(html).not.toContain("<script>alert(1)</script>")` and `expect(html).not.toContain('onerror="alert(2)"')` check slices of the raw HTML. `.claude/rules/testing.md` says to assert on structure, not strings. The structural checks just above them (`index.njk.test.ts:309-312`: no `script`, `img` or `em` inside the advisory, exactly one `strong`) already prove the same thing. This copies the existing pattern at `index.njk.test.ts:166-167`, so it is consistent with the file. It is still redundant.
   - **Approach:** Remove the two `html` asserts, or keep them and accept them as an extra safety net. Low priority either way.

2. ✅ **FIXED** — replaced with a typed `it.each` over unauthenticated / verified / system admin users, with `filterPublicationsForSummary` returning `[]`. **User-type controller test uses a mistyped fixture hidden by a double cast** (`index.test.ts:777`)
   - `{ userId: "admin-1", roles: ["SYSTEM_ADMIN"] } as unknown as Request["user"]` does not match `UserProfile` (`libs/auth/src/user-profile.ts:1-12`). That type has `id`, `email`, `displayName` and a singular `role`. `roles` is only used during authentication. The `as unknown as` cast hides the mismatch. `filterPublicationsForSummary` is mocked to pass everything through (`index.test.ts:5-7`), so this test only proves the flag ignores `req.user`, which it would do with any object.
   - **Approach:** Use a fixture of the correct type, `{ id: "admin-1", email: "admin@example.com", displayName: "Admin", role: "SYSTEM_ADMIN" }`, and drop the `unknown` cast.

3. **SJP location literal now appears in three places** (`index.ts:12`, `view-option/index.ts:42`, `account-home/index.njk:22`)
   - The plan (CLARIFICATIONS #6) deliberately keeps the constant local, because moving it to `@hmcts/location` would break the `@hmcts/location` mock factory in `index.test.ts:9-31`. The reasoning holds. Track it as a follow-up if a fourth consumer appears.

4. **Content: "Please note"**
   - The GOV.UK style guide discourages "please" unless you are asking the user to do something inconvenient. The wording is mandated verbatim by the ticket, so the implementation is right not to change it. A content designer could raise it with the service owner. No code change.

5. **Pre-release operational checks, from plan CLARIFICATIONS #2 and #4, listed in `tasks.md` as outstanding**
   - Check whether `location_metadata.cautionMessage` is set for location 9 on STG. If it is, the page shows two stacked notices. The AC is still met, but the page reads poorly.
   - Get Welsh Language Unit sign-off on the supplied Welsh copy.
   - The ticket AC explicitly fixes the scope as `locationId=9` and the message as unconditional, which answers CLARIFICATIONS #1 and #3. Neither blocks merge.

## ✅ Positive Feedback

- The insertion point is right. One block at `index.njk:29-33` covers both the lists-available and no-lists states without duplicating markup.
- `<p>` rather than `<div>` avoids clashing with the existing `div.govuk-body` selectors used in the caution and no-list tests.
- Splitting prefix and message keys keeps HTML out of the locale files, keeps autoescaping on, and keeps en/cy key parity (`index.njk.test.ts:319-321`).
- `isSjpVenue` is based on the numeric ID, not `location.name`, which changes with locale and can be edited by admins.
- Module ordering follows CLAUDE.md: module consts before the exported `GET` (`index.ts:12-19`). The render context passes flat props.
- Template tests follow `.claude/rules/testing.md`: Cheerio structural queries, `toHaveLength`, no AAA comments, conditional rendering checked both ways (present at `:225-234`, absent in both states at `:264-274`), Welsh rendering with no English leakage (`:287-297`), DOM-order checks by child index rather than string offsets, and the admin `noListMessage` edge case (`:256-262`).
- Controller tests follow AAA with explicit comments and cover SJP with and without publications, a non-SJP venue, the Welsh locale and user type.
- E2E follows the minimum-test rule. It adds no new `test()` blocks, and the advisory checks, DOM order check, Welsh and inline axe scans (`publication-authorisation.spec.ts:96-155`) sit inside the existing journey. The axe rule set matches the rest of that file. The extended test is not one of the `test.skip` blocks (those are at `:367`, `:427`, `:493`).
- The negative E2E case sits in the right place (`summary-of-publications.spec.ts:321-322`), because that file's dynamic locations are never location 9.

## Test Coverage Assessment

**Unit tests (apps/web):** the 62 tests in `index.test.ts` and `index.njk.test.ts` pass. I re-ran them for this review.

**Statement coverage, changed workspace (apps/web, scoped to the changed controller):**
Command, run from `apps/web`: `npx vitest run "src/pages/(public)/summary-of-publications" --coverage --coverage.include="**/summary-of-publications/*.ts" --coverage.reporter=text`

| File | Stmts | Branch | Funcs | Lines |
|---|---|---|---|---|
| `summary-of-publications/index.ts` | **100%** (54/54) | 94.73% (36/38) | 100% | 100% |

The two uncovered branches are at `index.ts:20` (`|| "en"` fallback) and `index.ts:73` (`|| "Unknown"` fallback in Welsh). Both are old code, and both new branches at `index.ts:137` are covered. This is above the 80% threshold.

**e2e-tests workspace:** no unit coverage applies. From the context provided, `publication-authorisation.spec.ts` + `summary-of-publications.spec.ts` gave 6 passed and 4 skipped. The skips existed before this change, and the extended location-9 journey is not one of them.

**Template tests:** they cover rendering, bold prefix, placement relative to FaCT / select-list / no-publications / admin no-list, absence on non-SJP in both states, the caution message coming first, Welsh, escaping, and locale key parity.

**Accessibility:** inline axe scans run on location 9 in English (`publication-authorisation.spec.ts:104-105`) and Welsh (`:154-155`), with the advisory present. The existing axe scan on the non-SJP no-publications page is kept (`summary-of-publications.spec.ts:325-327`).

**Gaps (acceptable):** the "SJP with no lists" state cannot be reached in E2E, because location 9 always has seeded publications. It is covered by the template test (`index.njk.test.ts:246-254`) and the controller test (`index.test.ts:726-742`). A non-SJP venue with lists present is covered at template level only (`index.njk.test.ts:264-274`, first case) and by the controller test at `index.test.ts:744-755`.

## Acceptance Criteria Verification

- [x] **Advisory shown on SJP venue when no lists are published.** Any user viewing `/summary-of-publications?locationId=9` with no publications sees the advisory below the FaCT paragraph, directly above "Sorry, no lists found for this court", with "Please note:" in bold.
  - Text is word for word: `en.ts:12-13`. Bold: `index.njk:31` (`<strong>`). Placement: `index.njk:29-33` comes after FaCT (`:21-23`) and before the no-publications `<p>` (`:61`). Not tied to user type: `index.ts:137` does not read `req.user`.
  - Evidence: `index.njk.test.ts:246-254` (below FaCT, above `noPublicationsMessage`), `:225-234` (bold prefix and full text), `index.test.ts:726-742` (flag true with no publications), `index.test.ts:774-788` (not tied to user type). The manual check in `tasks.md` confirmed the order FaCT → advisory → "Sorry, no lists found".

- [x] **Advisory shown on SJP venue when lists are published.** The same advisory appears below the FaCT paragraph and directly above "Select the list you want to view from the link(s) below:".
  - Same template block, before `index.njk:36`.
  - Evidence: `index.njk.test.ts:236-244`, `index.test.ts:708-724`. E2E: `publication-authorisation.spec.ts:96-102` (visible, bold prefix, full text) and `:114-127` (DOM order before the select-list sentence).

- [x] **Advisory not shown on non-SJP venues**, in either the lists-available or no-lists state.
  - Gate: `index.ts:137`, `index.njk:29`.
  - Evidence: `index.test.ts:744-755` (`locationId=1` → `false`), `index.njk.test.ts:264-274` (both states absent), E2E `summary-of-publications.spec.ts:321-322` (dynamic non-SJP location, no-lists state).

- [x] **Welsh advisory.** With `?lng=cy`, the Welsh advisory shows, "Sylwer:" is bold, and no English advisory text remains.
  - `cy.ts:26-28` matches the ticket copy. The straight apostrophe in `gwrandawiadau'r` matches the existing file style.
  - Evidence: `index.njk.test.ts:287-297` (Welsh prefix in `<strong>`, Welsh text, English prefix and message absent), `index.test.ts:757-772`, E2E `publication-authorisation.spec.ts:143-151`. Parity: `index.njk.test.ts:319-321`.

- [x] **Coexistence with an admin-configured caution message.** The order is caution message, then SJP advisory, then list/no-list content.
  - Template order: `index.njk:25-27` → `:29-33` → `:35+`.
  - Evidence: `index.njk.test.ts:276-285` (caution before advisory before select-list). The no-list branch follows the same insertion point, and the admin no-list order is covered at `:256-262`.

- [x] **Accessibility.** No new WCAG 2.2 AA violations in English or Welsh, and the advisory is read out in normal document order.
  - Semantic `<p>` + `<strong>` with no ARIA or live region (`index.njk:30-32`), placed in DOM order.
  - Evidence: inline axe scans with the advisory present in English (`publication-authorisation.spec.ts:104-105`) and Welsh (`:154-155`), passing per the E2E run provided.

**Result: 6 met / 0 partial / 0 unmet.**

## Next Steps

- [ ] Optional: drop the redundant raw-HTML asserts at `index.njk.test.ts:313-314`
- [ ] Optional: use a fixture of the correct `UserProfile` type at `index.test.ts:777` and remove the `as unknown as` cast
- [ ] Before release: check `location_metadata.cautionMessage` for location 9 on STG (plan CLARIFICATIONS #2)
- [ ] Before release: get Welsh Language Unit sign-off on the Welsh copy (plan CLARIFICATIONS #4)
- [ ] Follow-up (not this ticket): move the SJP location ID into `@hmcts/location` if another TypeScript consumer appears

## Overall Assessment

**APPROVED**

The change is correct and small, meets all six acceptance criteria, and is tested at controller, template and E2E level, including inline accessibility checks in both languages. There are no security, accessibility, type-safety or convention violations. The hardcoded `9` is allowed because `Location.locationId` is an explicit, seeded, non-autoincrement primary key. The remaining items are optional test tidy-ups and pre-release operational checks that do not need code changes.
