# Plan: #789 - Cookie banner confirmation message not shown after accepting

## Technical Approach

The cookie banner renders three `<div class="govuk-cookie-banner__message">` panels inside a single `.govuk-cookie-banner` element:

1. The initial prompt panel (Accept / Reject buttons)
2. The accepted confirmation panel (`.cookie-banner-accept-message`)
3. The rejected confirmation panel (`.cookie-banner-reject-message`)

The `@hmcts/cookie-manager` library shows a confirmation panel by iterating the **direct children** of `.govuk-cookie-banner` and toggling the HTML `hidden` attribute:

```js
child.hidden = !child.classList.contains(confirmationClass);
```

The bug is that the confirmation panels in `cookie-banner.njk` are currently hidden via an inline `style="display: none;"`. When the library sets `child.hidden = false` on the accepted message panel, the inline style still takes precedence in the cascade and keeps the panel invisible.

The fix is to replace `style="display: none;"` on both confirmation panels with the HTML `hidden` attribute. This is the correct, accessible pattern the library expects and also aligns with the GOV.UK cookie banner template which uses the `hidden` attribute.

## Implementation Details

### File to change

**`/Users/kian.kwa/IdeaProjects/cath-service/libs/web-core/src/views/components/cookie-banner.njk`**

Replace inline `style="display: none;"` on both confirmation message `<div>` elements with the `hidden` attribute.

Current (lines 24 and 39):
```html
<div class="govuk-cookie-banner__message govuk-width-container cookie-banner-accept-message" style="display: none;">
...
<div class="govuk-cookie-banner__message govuk-width-container cookie-banner-reject-message" style="display: none;">
```

Fixed:
```html
<div class="govuk-cookie-banner__message govuk-width-container cookie-banner-accept-message" hidden>
...
<div class="govuk-cookie-banner__message govuk-width-container cookie-banner-reject-message" hidden>
```

No other files need to change. The JavaScript config in `web.ts` is already correct - the `confirmationClass` values match the CSS classes used in the template.

## Error Handling & Edge Cases

**Banner already dismissed**: The server-side middleware (`cookie-manager-middleware.ts`) sets `showBanner: false` once `cookie_policy` or `cookies_preferences_set` cookies exist, so the banner is not rendered at all on subsequent page loads. No change needed here.

**JavaScript disabled**: The banner will remain in its initial prompt state since no JS runs to toggle the panels. This is acceptable; users without JS can use `/cookie-preferences` via the "View cookies" link already present in the banner.

**Rapid double-click**: The library handles this correctly - `hidden` is a boolean attribute, so repeated clicks are idempotent.

**Both `hidden` and `style` present**: Removing `style="display: none;"` and replacing with `hidden` eliminates the conflict entirely.

## Acceptance Criteria Mapping

| Acceptance criterion | How it is met |
|---|---|
| Clicking "Accept analytics cookies" shows the accepted confirmation message | `hidden` attribute removed from `.cookie-banner-accept-message` by the library on click |
| Clicking "Reject analytics cookies" shows the rejected confirmation message | `hidden` attribute removed from `.cookie-banner-reject-message` by the library on click |
| "Hide cookie message" button dismisses the banner | Unchanged - the `CookieBannerAction` handler in `web.ts` removes the banner element on the "hide" action |
| Confirmation message contains a link to `/cookie-preferences` | Already present in the template; no change needed |
