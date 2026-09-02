# Code Review: Issue #789 - Cookie Banner Confirmation Message Not Shown

## Summary

The change is a single-line bug fix in `libs/web-core/src/views/components/cookie-banner.njk`. Both confirmation panels (accept and reject) were hidden using the CSS inline style `style="display: none;"`. The `@hmcts/cookie-manager` library reveals a panel by toggling the HTML `hidden` boolean attribute (`child.hidden = false`). Because inline styles have higher specificity than the browser's UA handling of `hidden`, the CSS `display: none` persisted after the library removed the `hidden` attribute, making the confirmation message permanently invisible. The fix replaces `style="display: none;"` with the `hidden` attribute on both panels, which is exactly what the library expects to toggle.

The change is minimal, precise, and correctly targets the root cause identified in the plan.

---

## CRITICAL Issues

None.

---

## HIGH PRIORITY Issues

### 1. E2E test does not verify the confirmation message is visible after accepting or rejecting cookies

**File:** `e2e-tests/tests/cookie-management.spec.ts`

The existing E2E test for the cookie banner journey (`cookie banner journey - display, accept/reject, persistence, and accessibility`) clicks both the accept and reject buttons and then checks that a cookie was set with the correct value. It does not assert that the confirmation message panel (`cookie-banner-accept-message` / `cookie-banner-reject-message`) becomes visible after the click. This is exactly the regression the fix addresses, meaning the test suite would not have caught this bug and would not catch a recurrence.

The test also does not include an axe accessibility scan of the banner itself (the axe scan in the file is only run on the `/cookie-preferences` page).

The test should be extended to:
- Assert `.cookie-banner-accept-message` is visible after clicking accept.
- Assert `.cookie-banner-reject-message` is visible after clicking reject.
- Assert the initial prompt panel is hidden after a choice is made.
- Run an axe scan immediately after the confirmation message appears.

Example additions at the relevant points in the existing test:

```typescript
// After clicking accept:
await page.locator('button:has-text("Accept analytics cookies")').click();
await expect(page.locator('.cookie-banner-accept-message')).toBeVisible();
await expect(page.locator('.cookie-banner-reject-message')).not.toBeVisible();

// After clicking reject:
await page.locator('button:has-text("Reject analytics cookies")').click();
await expect(page.locator('.cookie-banner-reject-message')).toBeVisible();
await expect(page.locator('.cookie-banner-accept-message')).not.toBeVisible();
```

---

### 2. `web.ts` uses `any` type for the cookie manager event callback parameter

**File:** `apps/web/src/assets/js/web.ts`, line 87

```typescript
cookieManager.on("CookieBannerAction", (eventData: any) => {
```

The `any` annotation defeats TypeScript's type safety. If `@hmcts/cookie-manager` exports types for its event payloads, those should be used. If it does not, a local interface should be declared to describe the expected shape. This is unrelated to the current fix but was visible during review.

---

## SUGGESTIONS

### 1. The `hidden` attribute on the initial prompt panel would make the no-JS state explicit

Currently the initial prompt panel (the one with Accept/Reject buttons) has no `hidden` attribute, so it is always visible when the banner is rendered server-side. This is the correct behaviour. However, it is worth noting in a comment that this is intentional, to avoid a future developer adding `hidden` to it by mistake. A brief HTML comment would suffice.

### 2. Manual verification tasks remain open in tasks.md

**File:** `docs/tickets/789/tasks.md`

Three manual browser verification tasks are unchecked:
- Clicking Accept shows the accepted confirmation panel.
- Clicking Reject shows the rejected confirmation panel.
- Clicking Hide removes the banner entirely.

These should be completed before the PR is merged, or the gap should be closed by the E2E test assertion additions described in HIGH PRIORITY issue 1.

---

## Positive Feedback

- The root cause analysis in `plan.md` is correct and well-explained. The distinction between inline `style="display:none"` taking priority over toggling the `hidden` attribute via JS is accurately identified.
- The fix is the minimum change required. No unrelated files were modified.
- The `hidden` attribute is the semantically correct HTML mechanism for this pattern. It is what the GOV.UK cookie banner template uses, and it is the attribute that `@hmcts/cookie-manager` is documented to toggle. The fix aligns the template with both standards.
- The plan correctly identifies that no JavaScript, middleware, or routing changes are required.
- Progressive enhancement is preserved: users without JavaScript see the initial banner in its prompt state and can navigate to `/cookie-preferences` via the "View cookies" link.
- The ARIA attributes (`role="region"`, `aria-label="Cookies on this service"`) on the banner element are correct and untouched.
- The `.claude/settings.json` changes are infrastructure-only (session hook registration and token limit configuration) and do not affect application behaviour.

---

## Test Coverage Assessment

| Layer | Status | Notes |
|---|---|---|
| Unit tests | Not applicable | The change is a Nunjucks template attribute swap; no TypeScript logic is involved. |
| E2E - cookie banner flow | Partial | The existing test covers cookie setting and persistence but does not assert confirmation panel visibility. See HIGH PRIORITY issue 1. |
| E2E - accessibility scan on banner | Missing | Axe is only run on `/cookie-preferences`, not on the banner itself during the accept/reject flow. |
| Manual verification | Incomplete | Three manual tasks in `tasks.md` remain unchecked. |

---

## Acceptance Criteria Verification

| Criterion | Met? | Evidence |
|---|---|---|
| Clicking "Accept analytics cookies" shows the accepted confirmation message | Yes (code) | `hidden` attribute is now on `.cookie-banner-accept-message`; the library will toggle it correctly. |
| Clicking "Reject analytics cookies" shows the rejected confirmation message | Yes (code) | `hidden` attribute is now on `.cookie-banner-reject-message`; the library will toggle it correctly. |
| "Hide cookie message" button dismisses the banner | Yes (unchanged) | The `CookieBannerAction` handler in `web.ts` removes the `.govuk-cookie-banner` element on the hide action; this code is untouched. |
| Confirmation message contains a link to `/cookie-preferences` | Yes (unchanged) | Both confirmation panels already contain `<a class="govuk-link" href="/cookie-preferences">change your cookie settings</a>`. |
| No regression to banner suppression after previous visit | Yes (unchanged) | Server-side middleware suppresses the banner when `cookie_policy` or `cookies_preferences_set` cookies exist; this logic is untouched. |

---

## Next Steps

1. Extend `e2e-tests/tests/cookie-management.spec.ts` to assert the confirmation panel is visible after clicking accept and reject (HIGH PRIORITY issue 1).
2. Add an axe scan at the point when the confirmation message is showing (HIGH PRIORITY issue 1).
3. Complete the three outstanding manual verification tasks in `docs/tickets/789/tasks.md`.
4. Address the `any` type on the `CookieBannerAction` callback in `apps/web/src/assets/js/web.ts` (HIGH PRIORITY issue 2) - this can be done in a follow-up ticket if the type is not easily available from the library.

---

## Overall Assessment: NEEDS CHANGES

The template fix itself is correct and should not be reverted. The change is approved at the code level. However, the pull request should not be merged until the E2E test is extended to assert that the confirmation messages actually become visible after clicking accept and reject (HIGH PRIORITY issue 1). Without this assertion, the regression that prompted this ticket would not be caught by CI, and the fix cannot be verified automatically.
