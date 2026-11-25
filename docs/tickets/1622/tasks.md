# Tasks: #1622 [A11y] Package 3 - Verified user journey: subscriptions and dashboard

## Implementation Tasks

### 3.1 Tooltip to hint text
- [x] Add `versionHint` (en/cy) to `apps/web/src/pages/(verified)/subscription-add-list-language/{en,cy}.ts` and add `hint: { text: versionHint }` to its `govukRadios`
- [x] Add `versionHint` (en/cy) to `apps/web/src/pages/(verified)/subscription-configure-list-language/{en,cy}.ts` and add `hint` to its `govukRadios`
- [x] Remove the SVG tooltip / `app-version-header` markup from `subscription-confirmation-preview/index.njk` and `subscription-configure-list-preview/index.njk`, and delete `versionTooltip` from their `en.ts`/`cy.ts`
- [x] Delete `.app-version-header`, `__info` and `__icon` rules from `apps/web/src/assets/css/web.scss`
- [x] Update the four `.njk.test.ts` files: hint present (en/cy) with `aria-describedby`, tooltip absent, en/cy key parity

### 3.2 Courts grouped by letter heading
- [x] In `location-name-search/index.ts`, replace `tableRows`/`TableRow` with `locationGroups: { letter, locations }[]` (interface at bottom of file)
- [x] In `location-name-search/index.njk`, replace the table with `h2#letter-X` + `.govuk-checkboxes--small` per group, keeping `id="location-{id}"`, `name="locationIds"` and the `#selectionCount` script
- [x] Update `location-name-search/index.test.ts` for `locationGroups`
- [x] Extend `location-name-search/index.njk.test.ts`: h2 per letter, checkboxes follow their heading, label/for linkage, no table, Welsh names, empty result

### 3.3 Dashboard reflow
- [x] In `apps/web/src/assets/css/verified-pages.scss`, stack `.verified-tiles-container` as a column below 40.0625em, use a row from tablet up, and add `overflow-wrap: anywhere` to `.verified-tile`
- [x] Check `/account-home` at 320px (en/cy) for other overflow sources (phase banner nowrap, service nav, watermark) and fix only confirmed ones

### 3.4 Fieldset and legend with h1
- [x] `delete-subscription/index.njk`: remove the `h2`, add a legend with `isPageHeading: true` (`--l`), and swap `parent-box` for a grid row / two-thirds column
- [x] `(system-admin)/delete-user-confirm/[userId]/index.njk`: remove the separate `h1` and make the legend `isPageHeading: true` (`--xl`)
- [x] `(system-admin)/delete-third-party-user/index.njk`: add a fieldset with the h1 legend, remove the separate `h1`, add `idPrefix: "confirm-delete"`
- [x] Update the `.njk.test.ts` files for the three pages above: `legend h1` text, exactly one `h1`, error href matches the first radio id

### 3.5 Remove-subscription error handling
- [x] In `delete-subscription/index.ts` POST, treat a body with `subscription` (confirmation form) and a missing or invalid `unsubscribe-confirm` as a validation error and render `errors`. A body with `subscriptionId` only still redirects to GET
- [x] In `delete-subscription/index.njk`, add `errorMessage` to `govukRadios`, delete the inline `bodyEnd` validation script, and use the "Error: " title prefix
- [x] Update `delete-subscription/index.test.ts`: redirect from subscription-management, error render on empty/invalid choice, ownership failure redirect, Welsh error
- [x] Update `delete-subscription/index.njk.test.ts`: error summary, inline error before the radios, form-group error class, no inline script

### 3.6 Remove button focus
- [x] In `pending-subscriptions/index.njk`, replace the inline-styled Remove buttons with `class="app-link-button govuk-body-m"` and no `style`
- [x] Re-check Remove focus on `/subscription-management` in a browser (audit finding was on `/pending-subscriptions`; no change expected)
- [x] Update `pending-subscriptions/index.njk.test.ts`: Remove buttons have `app-link-button` and no `style` attribute

### 3.7 Add email subscription legend
- [x] In `add-email-subscription/index.njk`, remove the separate `h1`, set the legend to `isPageHeading: true` (`--l`), turn the inset text into radio `hint`, and drop the unused inset import
- [x] Update `add-email-subscription/index.njk.test.ts`: legend h1, no visually hidden legend, one h1, hint text (en/cy)

### E2E
- [x] S1: extend the subscribe journey in `e2e-tests/tests/verified-user/email-subscriptions.spec.ts` (legend group name, letter h2s, keyboard selection, language hint en/cy, no tooltip on preview, axe)
- [x] S2: extend the `@nightly` unsubscribe journey (error summary visible and focused, summary link focuses Yes, Welsh error, "Error:" title, Remove buttons receive keyboard focus on management and pending pages, axe)
- [x] S3: extend the `@nightly` edit list type journey (configure-language hint en/cy, no tooltip on configure preview, axe)
- [x] S4: extend `e2e-tests/tests/verified-user/account-home.spec.ts` with a 320px viewport no-horizontal-scroll check (en/cy) and axe
- [x] S5: extend the delete-user step in `e2e-tests/tests/system-admin/user-management.spec.ts` (radio group named by the h1, empty-submit error summary link focuses the first radio)

### Verification
- [ ] Run `yarn lint:fix`, `yarn test` and `yarn test:e2e` from the repo root
- [ ] Manual keyboard-only pass of the subscribe and edit-list-type journeys (Chrome, Edge, Safari), including the Remove focus style
- [ ] Manual 400% zoom / 320px check of `/account-home` (Chrome, Edge, Safari, en and cy)
- [ ] Manual screen reader check: VoiceOver Safari (letter headings in the rotor, questions announced once, delete-subscription legend), and JAWS Edge on the delete-subscription and delete user pages
