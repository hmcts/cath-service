# Technical Plan: #1622 [A11y] Package 3 - Verified user journey: subscriptions and dashboard

## 1. Technical Approach

All seven items are template, CSS and small controller fixes to pages that already exist. No new pages, routes, libs, schema or API changes.

Strategy:

- **Use GOV.UK macros the way they are meant to be used.** Most of the findings come from hand-rolled markup (an SVG `<title>` tooltip, a layout table, inline JS validation, inline `style` on buttons, a separate `h1` plus a visually hidden legend). The fix in each case is to switch to the standard macro option: `hint`, `fieldset.legend.isPageHeading`, `errorMessage`, and the existing link-button classes.
- **Validate on the server, not in inline JS.** `delete-subscription` only validates in an inline `<script>`. Today a POST with no choice is treated as "came from subscription-management" and redirects back to GET, so the error never reaches the server. Without JS there is no error at all. The controller will tell the confirmation-form POST apart from the subscription-management POST and render the GOV.UK error summary and inline error.
- **Keep markup contracts the e2e tests and client JS rely on.** Checkbox `id="location-{id}"`, `name="locationIds"`, the `#selectionCount` counter, the `.verified-tile` class and the `Unsubscribe from {name}` aria-labels all stay the same.
- **Do not touch shared CSS that other pages still use.** `.court-table`, `.court-letter` and related rules in `apps/web/src/assets/css/filter-panel.scss` are still used by `(public)/courts-tribunals-list`, so they stay.

Key considerations:

- Item 3.1 affects **two** journeys that both show the same tooltip: add subscription (`subscription-add-list-language` → `subscription-confirmation-preview`) and edit list type (`subscription-configure-list-language` → `subscription-configure-list-preview`). Both are fixed.
- Item 3.6: the audit points at `background: none`. Two "Your email subscriptions" pages have Remove buttons:
  - `pending-subscriptions/index.njk` sets `background: none` as an **inline style**. Inline styles beat the `.govuk-link:focus` stylesheet rule, so the yellow focus background never shows. This matches what the audit describes ("dark underline and a thin yellow line", which is the `box-shadow` without the background).
  - `subscription-management/index.njk` uses `.govuk-button-as-link`. That class sets `background: none`, but its `:focus` rule sets `background-color: #ffdd00` with higher specificity, so it should already be fine. Check it in a browser before changing it.
- Item 3.3 overlaps with Package 1 item 1.6, which also changes the account-home tiles. 3.3 proceeds in this ticket (decision 6); whichever of 3.3 / 1.6 merges second must keep the reflow CSS working.

## 2. Implementation Details

**TEMPLATE SOURCE: n/a**

No API, database, Prisma schema, migration or new-dependency changes.

### File structure (files touched)

```
apps/web/src/assets/css/
├── verified-pages.scss                       # 3.3 tile stacking below tablet
└── web.scss                                  # 3.1 remove .app-version-header* rules
apps/web/src/pages/(verified)/
├── subscription-add-list-language/           # 3.1 hint (index.njk, en.ts, cy.ts, index.njk.test.ts)
├── subscription-configure-list-language/     # 3.1 hint (index.njk, en.ts, cy.ts, index.njk.test.ts)
├── subscription-confirmation-preview/        # 3.1 remove tooltip (index.njk, en.ts, cy.ts, index.njk.test.ts)
├── subscription-configure-list-preview/      # 3.1 remove tooltip (index.njk, en.ts, cy.ts, index.njk.test.ts)
├── location-name-search/                     # 3.2 (index.ts, index.njk, index.test.ts, index.njk.test.ts)
├── account-home/                             # 3.3 (index.njk.test.ts only, if a class is added)
├── delete-subscription/                      # 3.4 + 3.5 (index.ts, index.njk, index.test.ts, index.njk.test.ts)
├── pending-subscriptions/                    # 3.6 (index.njk, index.njk.test.ts)
├── subscription-management/                  # 3.6 verify only
└── add-email-subscription/                   # 3.7 (index.njk, index.njk.test.ts)
apps/web/src/pages/(system-admin)/
├── delete-user-confirm/[userId]/             # 3.4 (index.njk, index.njk.test.ts)
└── delete-third-party-user/                  # 3.4 audit finding (index.njk, index.njk.test.ts)
e2e-tests/tests/verified-user/
├── email-subscriptions.spec.ts
└── account-home.spec.ts
e2e-tests/tests/system-admin/user-management.spec.ts
```

### 3.1 Tooltip → hint text

Current: `<svg ... focusable="false"><title>{{ versionTooltip }}</title></svg>` inside a `role="region"` span in the "Version" table header. It can't be focused and the content is only exposed as an SVG title on hover.

- `apps/web/src/pages/(verified)/subscription-confirmation-preview/index.njk` lines 162-175: replace the `<div class="app-version-header">…</div>` with plain `{{ tableHeaderVersion }}`.
- `apps/web/src/pages/(verified)/subscription-configure-list-preview/index.njk` lines 55-68: same change using `{{ versionColumnHeader }}`.
- Remove `versionTooltip` from `subscription-confirmation-preview/{en,cy}.ts` and `subscription-configure-list-preview/{en,cy}.ts`.
- `apps/web/src/assets/css/web.scss` lines 78-92: delete `.app-version-header`, `.app-version-header__info` and `.app-version-header__icon` (nothing else uses them).
- `apps/web/src/pages/(verified)/subscription-add-list-language/index.njk` and `subscription-configure-list-language/index.njk`: add `hint: { text: versionHint }` to the existing `govukRadios` call. The macro links it to the fieldset with `aria-describedby`, so screen readers announce it with the question.
- Add `versionHint` to both pages' `en.ts`/`cy.ts`, reusing the existing wording:
  - en: "This version change will affect the previously selected language for all existing subscriptions."
  - cy: "Bydd y newid fersiwn hwn yn effeithio ar yr iaith a ddewiswyd yn flaenorol ar gyfer yr holl danysgrifiadau presennol."
  - A Welsh translation already exists, but the wording was written for a change made on the check answers page (decision 2: reuse verbatim).

### 3.2 Courts grouped under `h2` letter headings

Current: `location-name-search/index.njk` lines 121-147 render a `<table class="govuk-table court-table">`. The letter appears only in the first row of each group (`tableRows` built in `index.ts` lines 165-174 with `letter: index === 0 ? letter : ""`).

- `apps/web/src/pages/(verified)/location-name-search/index.ts`:
  - Replace the `TableRow` interface and the `tableRows` loop with `locationGroups`, built as `Object.entries(filteredGroupedLocations).map(([letter, locations]) => ({ letter, locations }))`. This also removes the mutable `push`.
  - Pass `locationGroups` to the render instead of `tableRows`. Move the `LocationGroup` interface to the bottom of the file.
  - `availableLetters` is passed but never used in the template. Leave it alone; it's out of scope.
- `apps/web/src/pages/(verified)/location-name-search/index.njk`: replace the table with:

  ```njk
  {% for group in locationGroups %}
    <h2 class="govuk-heading-m" id="letter-{{ group.letter }}">{{ group.letter }}</h2>
    <div class="govuk-checkboxes govuk-checkboxes--small govuk-!-margin-bottom-6" data-module="govuk-checkboxes">
      {% for location in group.locations %}
        <div class="govuk-checkboxes__item">
          <input class="govuk-checkboxes__input" id="location-{{ location.locationId }}" name="locationIds" type="checkbox" value="{{ location.locationId }}">
          <label class="govuk-label govuk-checkboxes__label" for="location-{{ location.locationId }}">
            {{ location.welshName if locale == "cy" else location.name }}
          </label>
        </div>
      {% endfor %}
    </div>
  {% endfor %}
  ```

  Keep the hand-written items rather than the `govukCheckboxes` macro. The macro wraps each call in its own `govuk-form-group` and generates ids from `idPrefix` + index, which would break `#location-{id}`, which the e2e tests and labels depend on.
- Client-side dependencies checked:
  - The inline `#selectionCount` script selects `input[name="locationIds"]`. Unaffected.
  - `apps/web/src/assets/js/filter-panel.ts` uses `.filter-section-toggle`. Unaffected.
  - `apps/web/src/assets/js/table-search.ts` targets `#hearings-table` / `.hearings-table`. Not on this page.
- Heading outline: `h1` page heading, `h2` "Filter" (mojFilter), `h2` per letter, `h2` "Total selected". This is a valid outline.
- CSS: no change. `.court-table*` rules stay for `(public)/courts-tribunals-list`.

### 3.3 Dashboard reflow at 320px

Current: `apps/web/src/assets/css/verified-pages.scss` lines 1-6 set `.verified-tiles-container { display: flex; gap: 1.5em; }` with no breakpoint and no wrap. The three `flex: 1 1 0` tiles squeeze side by side at 320px, and long words ("subscriptions", Welsh "tanysgrifiadau") push past the tile width.

- Make the container `flex-direction: column` by default, and switch to `flex-direction: row` from the GOV.UK tablet breakpoint (`@media (min-width: 40.0625em)`, the same literal `dashboard.scss` uses).
- Add `overflow-wrap: anywhere` to `.verified-tile` so long words can't force overflow.
- Template `account-home/index.njk` needs no change.
- At 320px, also check whether the rest of the page scrolls sideways:
  - the phase banner language toggle has `white-space: nowrap` (`web.scss` line 146)
  - the service navigation
  - the fixed `.app-watermark` with `right: -48px`

  Fix only what is actually shown to overflow on the account-home page.

### 3.4 Fieldset + legend with `h1` (and audit of other pages)

- `apps/web/src/pages/(verified)/delete-subscription/index.njk`:
  - Remove `<h2 class="govuk-heading-l">{{ header }}</h2>`.
  - Add `fieldset: { legend: { text: header, isPageHeading: true, classes: "govuk-fieldset__legend--l" } }` to `govukRadios`.
  - Replace the `parent-box` wrapper with `govuk-grid-row` / `govuk-grid-column-two-thirds` to match the other confirmation pages.
- `apps/web/src/pages/(system-admin)/delete-user-confirm/[userId]/index.njk`:
  - Remove the separate `<h1 class="govuk-heading-xl">`.
  - Change the legend to `isPageHeading: true, classes: "govuk-fieldset__legend--xl"`.
- Audit of other confirmation pages with radios:

| Page | Current state | Action |
|---|---|---|
| `(system-admin)/delete-third-party-user/index.njk` | **No fieldset or legend at all.** The audit's "current code" (`name="confirmDelete"`, no `idPrefix`) matches this page. The error href `#confirm-delete` (from `validateRadioSelection`) doesn't match the generated id `confirmDelete`, so the summary link is broken | Fix: add the fieldset with the `h1` legend (`isPageHeading: true`), remove the separate `h1`, add `idPrefix: "confirm-delete"` |
| `(system-admin)/region-data-delete/index.njk` | Separate `h1` plus a visually hidden legend repeating it | Out of scope: left to Package 4 item 4.7 |
| `(system-admin)/location-jurisdiction-delete/index.njk` | Same | Out of scope: left to Package 4 item 4.7 |
| `(system-admin)/jurisdiction-data-delete/index.njk` | Same | Out of scope: left to Package 4 item 4.7 |
| `libs/system-admin-pages/src/pages/third-party-subscribers/[id]/delete/confirmation/index.njk` | Same | Out of scope: left to Package 4 item 4.7 |
| `(system-admin)/location-metadata-delete-confirmation/index.njk` | Separate `h1` ("…for {name}?") plus a hidden legend with **different** text (`radioLegend`) | Out of scope: left to Package 4 item 4.7 |
| `(system-admin)/delete-court-confirm`, `delete-court-publications`, `delete-court-subscriptions`, `(verified)/confirm-bulk-unsubscribe`, `(admin)/remove-list-confirmation`, `(admin)/media-applications/[id]/approve.njk`, `reject.njk` | Fieldset with a hidden legend. Summary content sits between the `h1` and the radios, so the `h1` can't go in the legend | No change. Already passes 1.3.1. List as checked |
| `(system-admin)/delete-list-type/index.njk` | Visible `--m` legend separate from the `h1`, with a summary list between them | No change |
| `(verified)/subscription-add-list-language`, `subscription-configure-list-language` | Already use `isPageHeading: true` | No change |

The five pages with a separate `h1` plus a duplicate hidden legend already pass 1.3.1. Their double-announcement fix is left to Package 4 item 4.7 (decision 4) and is not changed in this ticket.

### 3.5 Error summary and inline error on remove-subscription

`apps/web/src/pages/(verified)/delete-subscription/index.ts` POST:

- The subscription-management Remove form posts `subscriptionId`. The confirmation form posts the hidden `subscription`. Use that difference:
  - `subscriptionId` present and no `subscription` → redirect to GET (unchanged behaviour)
  - `subscription` present and `unsubscribe-confirm` missing or not `yes`/`no` → render the page with errors
- Do the ownership check (`getSubscriptionById`) before rendering errors, as today.
- Error object: keep `{ titleText, errorList: [{ text: t.errorNoSelection, href: "#unsubscribe-confirm" }] }`. `idPrefix: "unsubscribe-confirm"` makes the first radio's id `unsubscribe-confirm`, so the summary link moves focus to the first option.

`apps/web/src/pages/(verified)/delete-subscription/index.njk`:

- Add `errorMessage: errors and { text: errors.errorList[0].text }` to `govukRadios`. The macro puts the error inside the fieldset, after the legend and above the radios, and adds `govuk-form-group--error`.
- Delete the whole `{% block bodyEnd %}` inline script (lines 60-86). That script causes the overlap: `form.querySelector('[id^="unsubscribe-confirm"]')` matches the first radio **input**, so the error `<p>` is inserted inside the first `govuk-radios__item`, and that item gets the error class.
- Error summary focus on load comes from `initAll()` in `apps/web/src/assets/js/web.ts`. GOV.UK ErrorSummary focuses itself on init, so no custom JS is needed.
- Page title: change the error prefix from "There is a problem - " to the GOV.UK "Error: " convention that sibling pages use (`{% if errors %}Error: {% endif %}{{ title }} - …`).

### 3.6 Remove button focus style

- `apps/web/src/pages/(verified)/pending-subscriptions/index.njk` lines 73 and 110: replace `class="govuk-link govuk-body-m" style="background: none; border: none; …"` with `class="app-link-button"`. That class (`web.scss` lines 53-76) already provides the link look and the full GOV.UK focus state (`background-color: #fd0; box-shadow: 0 -2px #fd0, 0 4px #0b0c0c`), and the confirmation-preview pages already use it.
  - To keep the 19px size the inline `font-size: 19px` gave, keep `govuk-body-m` alongside it (`class="app-link-button govuk-body-m"`). `.app-link-button` resets the margin, so the row height doesn't change.
- `apps/web/src/pages/(verified)/subscription-management/index.njk`: check focus in Chrome, Edge and Safari. If the focus background doesn't show, apply the same class swap to the four `govuk-link govuk-button-as-link` buttons. The `aria-label`s stay the same.

### 3.7 Add email subscription legend

`apps/web/src/pages/(verified)/add-email-subscription/index.njk`:

- Remove `<h1 class="govuk-heading-l">{{ heading }}</h1>`.
- Change the legend to `{ text: heading, isPageHeading: true, classes: "govuk-fieldset__legend--l" }`.
- The `govukInsetText` currently sits between the `h1` and the form. It can't stay there once the `h1` moves into the legend. Replace it with `hint: { text: insetText }` on `govukRadios`, which links it with `aria-describedby` so it's announced with the question. Don't nest an inset block inside the hint. Remove the unused `govukInsetText` import. Confirmed (decision 3).
- The error href `#subscriptionMethod` already matches the first radio id. No controller change.

## 3. Error Handling & Edge Cases

| Case | Expected behaviour |
|---|---|
| delete-subscription: Continue with no radio chosen, JS on or off | Server renders the error summary (focused on load) and inline error above the radios. Title gets the "Error: " prefix |
| delete-subscription: tampered `unsubscribe-confirm` value (e.g. `maybe`) | Same error render as above |
| delete-subscription: tampered or foreign `subscription` id on confirmation POST | Ownership check fails, redirect to `/subscription-management` (unchanged) |
| delete-subscription: invalid UUID in `subscription` | Redirect to `/subscription-management` (unchanged) |
| delete-subscription: Welsh locale error | `cy.errorSummaryTitle` and `cy.errorNoSelection` render |
| location-name-search: filters return no locations | No letter headings and no checkboxes render. Same as today's empty table. No "no results" message is added (out of scope) |
| location-name-search: Welsh locale | Groups keyed by Welsh first letter (`getLocationsGroupedByLetter("cy")`). Labels use `welshName` |
| location-name-search: a letter with one court | Heading plus one checkbox |
| Language pages: validation error | The hint still renders between the legend and the error message (macro order: legend → hint → error) |
| subscription-add-list-language: no inline `errorMessage` today (summary only) | Not in scope for this ticket. Noted, but not changed |
| delete-third-party-user: no selection | Summary link `#confirm-delete` now resolves to the first radio because of `idPrefix` |
| Account home at 320px in Welsh | Longer Welsh descriptions wrap inside the stacked tiles with no horizontal scroll |
| Remove focus on pending-subscriptions | Tabbing shows the yellow background and black underline. Mouse hover colour is unchanged |

## 4. Acceptance Criteria Mapping

### 3.1
| AC | How satisfied | Verification |
|---|---|---|
| Tooltip removed from check answers page | SVG/`app-version-header` markup removed from both preview templates, and `versionTooltip` keys deleted | `.njk.test.ts`: `.app-version-header` and `svg title` have length 0 on both previews. E2E: absent on the preview |
| Content shown as hint on the language page before choosing | `hint: { text: versionHint }` on both language pages | `.njk.test.ts`: `.govuk-hint` text equals `en.versionHint` / `cy.versionHint`, and the fieldset `aria-describedby` includes the hint id. E2E: hint visible |
| No mouse-only information on the journey | The tooltip was the only hover-only content. All content is now in static text | Manual keyboard walk-through of both journeys |
| Checked with keyboard only | | Manual: Chrome, Edge, Safari |

### 3.2
| AC | How satisfied | Verification |
|---|---|---|
| Letters displayed as standalone rows before their lists | `h2` per letter above each group (confirmed, decision 1) | `.njk.test.ts`: `h2` texts in order A, B… |
| Table markup removed | `<table>` removed from the template | `.njk.test.ts`: `table` has length 0 |
| Courts grouped under a heading per letter, followed by its checkboxes | Each `h2` is immediately followed by a `.govuk-checkboxes` holding that letter's items | `.njk.test.ts`: `$("h2#letter-A").next(".govuk-checkboxes").find("input")` count matches the fixture |
| Each checkbox has a linked label | `id="location-{id}"` / `for="location-{id}"` kept | `.njk.test.ts`: every input id has a matching `label[for]`. Axe in E2E |
| VoiceOver: headings navigable, courts under their letter | | Manual: VoiceOver Safari rotor |

### 3.3
| AC | How satisfied | Verification |
|---|---|---|
| At 320px content stacks with no horizontal scroll | Column flex below tablet, `overflow-wrap` on tiles | E2E: at 320px viewport, `scrollWidth <= clientWidth` on `/account-home`. Manual 400% zoom at 1280px |
| Nothing cut off or overlapping | | Manual: Chrome, Edge, Safari (en and cy) |
| Checked in Chrome, Edge, Safari | | Manual |

### 3.4
| AC | How satisfied | Verification |
|---|---|---|
| Each affected radio group in a fieldset with a legend | `fieldset.legend` on delete-subscription, delete-user-confirm and delete-third-party-user | `.njk.test.ts`: `fieldset.govuk-fieldset legend` has length 1 |
| Single-question pages: legend contains the `h1` | `isPageHeading: true` | `.njk.test.ts`: `legend h1.govuk-fieldset__heading` text equals the question, and the page has exactly one `h1` |
| Both pages fixed and other confirmation pages checked | Audit table in §2 3.4 lists every page with radios checked and the outcome | Review of this plan. Template tests on the fixed pages |
| Screen reader announces the question on the first option | | Manual: VoiceOver Safari, JAWS Edge |

### 3.5
| AC | How satisfied | Verification |
|---|---|---|
| No choice → GOV.UK error summary at top, focus moves to it | Server-side render with `errors`. `initAll()` focuses ErrorSummary | `index.test.ts`: renders with `errors` when `subscription` is present and the choice is missing. E2E: `.govuk-error-summary` visible and focused |
| Inline error above radios, no overlap | `errorMessage` via macro. Inline JS removed | `.njk.test.ts`: `.govuk-error-message` is inside the fieldset and before `.govuk-radios`, and `.govuk-form-group--error` is on the form group. E2E: error text visible |
| Summary link moves focus to the first radio | href `#unsubscribe-confirm` equals the first radio id | `.njk.test.ts`: summary link href matches `input.govuk-radios__input` first id. E2E: click link, first radio focused |

### 3.6
| AC | How satisfied | Verification |
|---|---|---|
| Remove controls show the full GOV.UK focus style | Inline `background: none` removed. `app-link-button` focus rule applies | `.njk.test.ts`: Remove buttons have no `style` attribute and have class `app-link-button`. Manual focus check (styling isn't asserted in E2E per testing rules) |
| Checked with keyboard on Chrome, Edge, Safari | | Manual, on both pending-subscriptions and subscription-management |

### 3.7
| AC | How satisfied | Verification |
|---|---|---|
| Visually hidden legend removed | Legend no longer has `govuk-visually-hidden` | `.njk.test.ts`: `legend.govuk-visually-hidden` has length 0 |
| `h1` inside the legend, fieldset wraps the whole group | `isPageHeading: true` | `.njk.test.ts`: `fieldset legend h1` equals `heading`, there's one `h1`, and the radios are inside the fieldset |
| Question announced once | | Manual: VoiceOver Safari, JAWS Edge |

## 5. Test Scenarios

There is one E2E scenario per user journey. Validations, Welsh and axe checks run inline. Unit and template tests are listed separately.

### E2E

**S1. Subscribe by court journey** (`e2e-tests/tests/verified-user/email-subscriptions.spec.ts`, existing "complete subscription journey…" test, extended)
- `/add-email-subscription`: exactly one `h1`, the `h1` is inside the radio group's legend (`getByRole("group", { name: /how do you want to add an email subscription/i })`). Axe passes.
- `/location-name-search`: letter `h2` headings present (`getByRole("heading", { level: 2, name: "A" })`). The test location checkbox is still found by `#location-{id}` and by its label. No `table` inside the results form. Axe passes.
- Keyboard: select the test location using Tab and Space.
- `/subscription-add-list-language`: hint text visible. Switch to Cymraeg and check the Welsh hint, then switch back. Axe passes.
- `/subscription-confirmation-preview`: hint and tooltip text absent. Axe passes.
- Complete through to `/subscription-confirmed`.

**S2. Unsubscribe journey with validation** (`email-subscriptions.spec.ts`, existing `@nightly` unsubscribe test, extended)
- On `/delete-subscription`: the radio group is named by the `h1` question. Axe passes.
- Continue with no choice:
  - URL stays on `/delete-subscription`
  - `.govuk-error-summary` is visible and focused
  - inline error visible
  - title starts "Error:"
  - axe passes
- Click the summary link: the first radio ("Yes") is focused.
- Switch to Cymraeg, submit empty, and check the Welsh error text.
- Choose No → `/subscription-management`. Then Remove → Yes → `/unsubscribe-confirmation` (existing).
- On `/subscription-management` and `/pending-subscriptions`: Tab to a Remove button and assert it receives focus (`toBeFocused`). The visual style is checked manually.

**S3. Edit list type journey** (`email-subscriptions.spec.ts`, existing `@nightly` "edit list type" test, extended)
- `/subscription-configure-list-language`: hint visible (en and cy).
- `/subscription-configure-list-preview`: no tooltip text. Axe passes.

**S4. Account home at small widths** (`e2e-tests/tests/verified-user/account-home.spec.ts`, existing test, extended)
- Set viewport to 320×800 and assert `document.documentElement.scrollWidth <= document.documentElement.clientWidth`, in en and cy.
- The three `.verified-tile` links are still visible and clickable. Axe passes.

**S5. System admin delete user** (`e2e-tests/tests/system-admin/user-management.spec.ts`, existing delete step, extended)
- The existing `getByRole("heading", { name: "Are you sure you want to delete {email}?", level: 1 })` still passes.
- Add `getByRole("group", { name: … })` to confirm the legend.
- Submit empty: error summary shows, and its link focuses the first radio.

### Unit / template (Vitest)

**`delete-subscription/index.test.ts`**
- POST with `subscriptionId` only → redirect to GET (rename the existing test).
- POST with `subscription` and no choice → `render` with `errors.errorList[0].href === "#unsubscribe-confirm"`.
- POST with `subscription` and an invalid choice → error render.
- POST with `subscription` the user doesn't own → redirect.
- Welsh error text.

**`delete-subscription/index.njk.test.ts`**
- Legend `h1`, one `h1` on the page.
- Error state: summary present, inline error before `.govuk-radios`, form group error class.
- No inline `<script>` containing `unsubscribe-confirm-error`.
- Welsh.

**`location-name-search/index.test.ts`**
- Render args include `locationGroups` shaped `{ letter, locations }[]` in order.
- No `tableRows`.

**`location-name-search/index.njk.test.ts`**
- Add a two-letter fixture and check:
  - `h2` per letter
  - checkboxes follow the right heading
  - labels linked by `for`/`id`
  - no `table`
  - Welsh names when `locale: "cy"`
  - empty groups → no letter headings

**Language and preview templates**
- `subscription-add-list-language/index.njk.test.ts` and `subscription-configure-list-language/index.njk.test.ts`: hint text (en/cy) and `aria-describedby` on the fieldset.
- `subscription-confirmation-preview/index.njk.test.ts` and `subscription-configure-list-preview/index.njk.test.ts`: version header has no SVG or tooltip.
- en/cy key parity for all four pages.

**Other templates**
- `add-email-subscription/index.njk.test.ts`: legend `h1`, no visually hidden legend, one `h1`, inset/hint text still rendered.
- `pending-subscriptions/index.njk.test.ts`: Remove buttons have `app-link-button` and no inline `style`.
- `delete-user-confirm/[userId]/index.njk.test.ts`, `delete-third-party-user/index.njk.test.ts`: legend `h1`, one `h1`. For third-party user, the error summary href matches the first radio id.

## 6. Resolved decisions (25 Nov 2026)

1. **3.2:** Use a real `<h2>` per letter (styled `govuk-heading-m`), table removed. Confirmed.
2. **3.1:** Reuse the existing English and Welsh `versionTooltip` text verbatim as the hint. No new translation needed.
3. **3.7:** Turn the inset text into radio `hint` text. Confirmed.
4. **Scope:** The five admin pages with a separate `h1` plus a hidden legend (`region-data-delete`, `location-jurisdiction-delete`, `jurisdiction-data-delete`, `location-metadata-delete-confirmation`, third-party-subscribers delete confirmation) are left to Package 4 item 4.7. Not changed here.
5. **"Delete {user}":** Fix both `delete-third-party-user` and `delete-user-confirm/[userId]`.
6. **3.3 vs 1.6:** Proceed with 3.3 in this ticket. Whichever change merges second rebases onto the other and keeps the reflow CSS and `account-home.spec.ts` selectors working.
7. **3.6:** The audit screenshot is of `/pending-subscriptions`. Fix the inline style there; `/subscription-management` is only re-checked in a browser.
8. **Public courts-and-tribunals list:** No follow-up ticket.
