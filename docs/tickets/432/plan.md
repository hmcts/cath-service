# Technical Plan: Add All Cookies to the Cookie Page (#432)

## Technical Approach

The cookie policy page is missing three cookies that are actively set by the application. The fix is purely content - no logic or middleware changes are needed. We add a new `cookieManagement` section to the content objects in `en.ts` and `cy.ts`, then add a corresponding template block in `index.njk`.

The three missing cookies are functional/essential cookies (required for the service to operate correctly) and should be grouped together in a new dedicated section positioned after the existing `introMessage` section, as they relate to cookie consent management and user preferences rather than session or authentication concerns.

## Implementation Details

### New Section: Cookie Management

A new `cookieManagement` section will be added to `sections` in both `en.ts` and `cy.ts`, covering these three cookies:

| Cookie | Purpose | Expiry |
|---|---|---|
| `cookie_policy` | Stores your cookie preferences as JSON | 1 year |
| `cookies_preferences_set` | Records that you have responded to the cookie banner | When you close your browser |
| `locale` | Stores your language preference (English or Welsh) | 30 days |

Cookie details confirmed from source:
- `cookie_policy`: set in `cookie-helpers.ts` via `setCookiePolicy()`, `maxAge: 365 * 24 * 60 * 60 * 1000`, `httpOnly: false`
- `cookies_preferences_set`: set in `cookie-helpers.ts` via `setCookieBannerSeen()`, no `maxAge` (session cookie), `httpOnly: true`
- `locale`: set in `locale-middleware.ts` via `localeMiddleware()`, `maxAge: 30 * 24 * 60 * 60 * 1000`, `httpOnly: true`

### Changes to `libs/web-core/src/pages/cookie-policy/en.ts`

Add a `cookieManagement` key inside `sections`, after `introMessage`:

```typescript
cookieManagement: {
  heading: "To remember your cookie preferences",
  description:
    "We store cookies to remember the choices you make about cookies and your language preference, so you do not have to make them again when you return to the service.",
  cookies: [
    [{ text: "cookie_policy" }, { text: "Saves your cookie preferences" }, { text: "1 year" }],
    [{ text: "cookies_preferences_set" }, { text: "Records that you have seen and responded to the cookie banner" }, { text: "When you close your browser" }],
    [{ text: "locale" }, { text: "Saves your language preference (English or Welsh)" }, { text: "30 days" }]
  ]
}
```

### Changes to `libs/web-core/src/pages/cookie-policy/cy.ts`

Add the equivalent Welsh translation with identical structure:

```typescript
cookieManagement: {
  heading: "I gofio eich dewisiadau cwcis",
  description:
    "Rydym yn storio cwcis i gofio'r dewisiadau a wnewch am gwcis a'ch dewis iaith, fel nad oes rhaid i chi eu gwneud eto pan fyddwch yn dychwelyd i'r gwasanaeth.",
  cookies: [
    [{ text: "cookie_policy" }, { text: "Cadw eich dewisiadau cwcis" }, { text: "1 flwyddyn" }],
    [{ text: "cookies_preferences_set" }, { text: "Cofnodi eich bod wedi gweld ac ymateb i'r faner cwcis" }, { text: "Pan fyddwch yn cau eich porwr" }],
    [{ text: "locale" }, { text: "Cadw eich dewis iaith (Cymraeg neu Saesneg)" }, { text: "30 diwrnod" }]
  ]
}
```

### Changes to `libs/web-core/src/pages/cookie-policy/index.njk`

Add a new template block for the `cookieManagement` section, positioned after the existing `introMessage` block (around line 80) and before the `session` block:

```njk
<!-- Cookie management section -->
<h3 class="govuk-heading-s">{{ sections.cookieManagement.heading }}</h3>
<p class="govuk-body">{{ sections.cookieManagement.description }}</p>
{{ govukTable({
  head: [
    { text: tableHeaders.name },
    { text: tableHeaders.purpose },
    { text: tableHeaders.expiry }
  ],
  rows: sections.cookieManagement.cookies
}) }}
```

This section follows the same pattern as `introMessage` (heading, description, table) — no structural changes to the template are needed beyond adding this block.

## Error Handling and Edge Cases

There are no runtime error cases introduced by this change. The content is static and the template rendering pattern already handles the `sections` object consistently. No controller changes are needed.

## Acceptance Criteria Mapping

| Criteria | Approach |
|---|---|
| `cookie_policy` appears on the cookie page | New `cookieManagement` section in content files and template |
| `cookies_preferences_set` appears on the cookie page | Included in the same new section |
| `locale` appears on the cookie page | Included in the same new section |
| Welsh translations present | New `cy.ts` section with matching structure |
| Existing sections unaffected | Changes are additive only |

## CLARIFICATIONS NEEDED

1. **Placement of `locale` cookie** - The `locale` cookie stores language preference, not cookie consent. It could reasonably be placed in its own section or grouped with cookie management cookies. The plan above groups all three in one section for simplicity, but a separate "Language preference" section is also defensible.

2. **`cookies_preferences_set` expiry wording** - The cookie has no `maxAge` set, making it a session cookie. "When you close your browser" is used to be consistent with how `connect.sid` and `__auth-token` are described, but confirming this is the intended wording would be good.

3. **Section ordering** - The plan places `cookieManagement` between `introMessage` and `session`. An alternative is to place it immediately after `introMessage` since they are closely related (both concern the cookie banner). This is what the plan does, but if there is a preferred ordering based on GOV.UK guidance for cookie pages, that should take precedence.
