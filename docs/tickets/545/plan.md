# Technical Plan: Issue #545 — Add Open Justice Licence link to CaTH footer

## 1. Technical Approach

This is a small, self-contained UI change. The CaTH footer is rendered via a single shared Nunjucks component (`libs/web-core/src/views/components/site-footer.njk`) which is included by the base template used by all pages — including auth/B2C-related pages (session-expired, password-reset-success, cft-rejected, etc.). A single change to `site-footer.njk` satisfies the requirement for both the main CaTH footer and the B2C page footer.

No new files, routes, modules, or database changes are needed.

## 2. Implementation Details

### Files to change

| File | Change |
|------|--------|
| `libs/web-core/src/locales/en.ts` | Add `openJusticeLicence` key to `footer` object |
| `libs/web-core/src/locales/cy.ts` | Add Welsh `openJusticeLicence` key to `footer` object |
| `libs/web-core/src/views/components/site-footer.njk` | Append new meta item for the Open Justice Licence link |
| `e2e-tests/tests/page-structure.spec.ts` | Update footer link count from 8 to 9; add link assertion |

### `libs/web-core/src/locales/en.ts`

Add to the `footer` object (after `governmentDigitalService`):

```typescript
openJusticeLicence: "Open Justice Licence",
```

### `libs/web-core/src/locales/cy.ts`

Add to the `footer` object (after `governmentDigitalService`):

```typescript
openJusticeLicence: "Trwydded Cyfiawnder Agored",
```

(Standard Welsh translation used across UK government services for "Open Justice Licence".)

### `libs/web-core/src/views/components/site-footer.njk`

Append after the `governmentDigitalService` item in the `meta.items` array:

```njk
{
  href: "https://caselaw.nationalarchives.gov.uk/open-justice-licence/version/2",
  text: footer.openJusticeLicence,
  attributes: {
    target: "_blank",
    rel: "noopener noreferrer",
    "aria-label": "Open Justice Licence (opens in new tab)"
  }
}
```

The link opens in a new tab (`target="_blank"`) because it is an external legal document — consistent with the existing pattern for Cookies and Accessibility statement links in the same footer. The `rel="noopener noreferrer"` prevents tabnapping. The `aria-label` informs screen reader users the link opens in a new tab.

### `e2e-tests/tests/page-structure.spec.ts`

- Update the `toHaveCount(8)` assertion to `toHaveCount(9)` (line 45).
- Add a new assertion to verify the Open Justice Licence link is present, opens in a new tab, has the correct `href`, `rel`, and `aria-label`.

## 3. Error Handling & Edge Cases

- No user input is involved; no validation needed.
- The link is a static external URL — no dynamic data, no error paths.
- If the external URL becomes unavailable, the link still renders correctly in the footer; this is no different from the existing external footer links (Help, Privacy, etc.).

## 4. Acceptance Criteria Mapping

| Acceptance Criterion | Implementation |
|----------------------|----------------|
| Open Justice Licence link added to CaTH footer | New meta item in `site-footer.njk` |
| Link URL is `https://caselaw.nationalarchives.gov.uk/open-justice-licence/version/2` | `href` set directly in the template |
| Added to B2C page as well | All B2C-related pages extend `base-template.njk` which includes `site-footer.njk` — covered automatically |

## 5. Open Questions

### CLARIFICATIONS NEEDED

1. **Welsh translation**: The Welsh translation `"Trwydded Cyfiawnder Agored"` is the standard translation used in Welsh government services. Please confirm this is correct, or provide the approved Welsh text.

2. **Link position**: The plan places the Open Justice Licence link at the end of the meta items list, after "Government Digital Service". Please confirm the desired ordering.

3. **B2C definition**: If "B2C page footer" refers to a custom HTML template uploaded directly to Azure AD B2C (to skin the hosted sign-in UI) rather than the CaTH-rendered auth pages, that asset is not in this repository and would require a separate change. Please confirm which is meant.
