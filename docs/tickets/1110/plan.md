# Technical Plan — #1110: Update to the 'no published lists' message

## 1. Technical Approach

This changes content only. The summary of publications page already shows a default empty-state message (`noPublicationsMessage`) when a venue has no lists visible to the user. The controller passes `t.noPublicationsMessage`, and the template renders it as a plain `<p class="govuk-body">`. Only the English and Welsh values change. The tests and the reference catalogue that repeat the old strings also need updating.

Key decisions:

- **Copy is used verbatim from the acceptance criteria.** We do not paraphrase it, machine-translate it or correct its punctuation.
  - EN: `There are no lists available for this court or tribunal today.`
  - CY: `Nid oes unrhyw restrau ar gael ar gyfer y llys na’r tribiwnlys hwn heddiw.`
- **Punctuation (confirmed 2026-10-14):** the Welsh ends with a full stop to match the English, and keeps the curly apostrophe (`na’r`) as supplied.
  - This differs from the earlier plan comment, which straightened the apostrophe.
  - Curly apostrophes already appear in other Welsh locale files, e.g. `apps/web/src/pages/(verified)/confirm-bulk-unsubscribe/cy.ts` (`Enw’r llys neu’r tribiwnlys`). Keeping it is consistent with the codebase and avoids changing approved copy.
  - If the inclusion team confirms either change, only `cy.ts` and the catalogue value need editing. The tests assert through the imported `cy` object, so they will follow automatically.
- **Tests stop repeating copy.** The controller unit test at `index.test.ts:211` currently checks a literal string. It will instead check against the imported `en` and `cy` objects, so the copy lives in exactly one place. E2E tests have to check real text, so they keep literal assertions.
- **No changes to template structure, precedence, component choice, controller logic, routes, API or database.**

## 2. Implementation Details

TEMPLATE SOURCE: n/a

No API changes, no schema changes, no migrations, no new pages or components.

| File | Change |
|---|---|
| `apps/web/src/pages/(public)/summary-of-publications/en.ts:4` | `noPublicationsMessage: "There are no lists available for this court or tribunal today."` |
| `apps/web/src/pages/(public)/summary-of-publications/cy.ts:4` | `noPublicationsMessage: "Nid oes unrhyw restrau ar gael ar gyfer y llys na’r tribiwnlys hwn heddiw."` (curly apostrophe, trailing full stop — confirmed) |
| `apps/web/src/pages/(public)/summary-of-publications/index.test.ts:211` | Import `en`/`cy` from `./en.js`/`./cy.js`. Assert `renderCall.noPublicationsMessage` equals `en.noPublicationsMessage`. Add a matching `cy` case under the existing `Welsh locale` describe. |
| `apps/web/src/pages/(public)/summary-of-publications/index.njk.test.ts` | Small gap-fills only (see below). Existing tests already assert through `en`/`cy` and need no copy edits. |
| `e2e-tests/tests/summary-of-publications.spec.ts:338` | Replace `/sorry, no lists found for this court/i` with the exact new English string, including the full stop. |
| `e2e-tests/tests/summary-of-publications.spec.ts:472` | Replace `/mae'n ddrwg gennym, .../i` with the exact new Welsh string. The curly `’` must match exactly; Playwright `getByText` with a string does not normalise apostrophes. |
| `templates/tech-spec-references/welsh-translations-catalogue.json:356` | Remove the `"Sorry, no lists found for this court"` entry. Add `"There are no lists available for this court or tribunal today.": "Nid oes unrhyw restrau ar gael ar gyfer y llys na’r tribiwnlys hwn heddiw."`, placed in alphabetical order (around the `T` keys). This is a reference file only and has no runtime effect. |

### Existing template test coverage (`index.njk.test.ts`)

Already covered, so no change needed:
- The empty state renders `en.noPublicationsMessage` and shows no errors (line 68).
- `noListMessage` takes precedence and the default message is absent (line 77).
- The populated state shows the select-list message and links, and the default message is absent (line 130).
- The Welsh render shows `cy.noPublicationsMessage` (line 174).
- Locale key parity between `en` and `cy` is checked (line 206). Parity is unaffected because no keys are added or removed.

Gaps to fill:
- The error-state test (line 158) asserts only the error summary. Add `expect($("body").text()).not.toContain(en.noPublicationsMessage)` to prove that `{% elif not error %}` suppresses the message.
- The Welsh render test (line 167) should also assert that `en.noPublicationsMessage` is absent.

`.gitignore` already excludes stale copies of the old string in `apps/web/dist/` and `libs/public-pages/dist/`. These are build artefacts and are not edited.

## 3. Error Handling & Edge Cases

- **Venue-specific `noListMessage` takes precedence (unchanged).** `index.njk:52-56` renders the admin-authored `location_metadata` no-list message instead of the default. Venues with a configured message will not show the new wording, even if their stored text says "Sorry…" or "court". Their stored content is not touched.
- **An error state suppresses the default message (unchanged).** When `error` is set, the `{% elif not error %}` branch hides the default message and only the GOV.UK error summary shows. A new template assertion will cover this.
- **The populated state is unaffected.** When publications exist, the `{% if publications.length > 0 %}` branch shows the select-list message and links. Neither the old nor the new empty-state message appears.
- **Welsh.** The locale is chosen in the controller (`t = locale === "cy" ? cy : en`). The language toggle keeps `locationId`, so both strings appear on the same URL. The curly apostrophe is plain UTF-8 text in a `.ts` file. Nunjucks autoescaping does not change it, so no encoding issue arises.
- **Not an error.** The message stays plain body copy. There is no error summary, warning text, `role="alert"` or `aria-live`, and no new axe rule exclusions.
- **Invalid `locationId`.** This still redirects to `/400` before any rendering, so the message can never show alongside a location error.

## 4. Acceptance Criteria Mapping

| Acceptance criterion | How it is met | How it is verified |
|---|---|---|
| English empty state shows `There are no lists available for this court or tribunal today.` | Updated `en.ts` value | Controller unit test (via `en`), template test (line 68), E2E `should display no publications message when location has no publications` with exact text plus the existing inline axe scan |
| The old English string no longer appears anywhere in the service | Value replaced; catalogue entry removed | `grep -rn "Sorry, no lists found for this court" apps/*/src libs/*/src e2e-tests templates` returns no hits |
| Welsh empty state shows the approved translation | Updated `cy.ts` value (verbatim) | New controller unit test for the `cy` locale, template Welsh test (line 174 plus the English-absent assertion), E2E `should preserve language selection with no publications message @nightly` |
| The previous Welsh string (`Mae'n ddrwg gennym…`) no longer appears | Value replaced; catalogue entry removed | `grep -rn "ddrwg gennym, nid ydym wedi dod o hyd i unrhyw restrau" apps/*/src libs/*/src e2e-tests templates` returns no hits |
| Venue-specific no-list message still takes precedence | Template unchanged | Existing template test (line 77) |
| Pages with published lists are unaffected | Template unchanged | Existing template test (line 130) |
| Accessibility is not regressed | No markup change | Existing axe scan in the English empty-state E2E test, with no new exclusions |

## 5. CLARIFICATIONS NEEDED

1. **Welsh trailing full stop.** RESOLVED (2026-10-14): add a full stop — `…heddiw.`, matching the English.
2. **Apostrophe style in the Welsh.** RESOLVED (2026-10-14): use the curly `’` (`na’r`). This reverses the earlier plan comment, which straightened it.
3. **Venue-specific no-list messages.** Admin-configured `no_list_message` / `welsh_no_list_message` values override the new default and may still contain apologetic or court-only wording. **Default used:** out of scope and left untouched. Should the Service Manager audit those separately?
4. **Admin-facing copy.** The blob explorer and remove-list search show "No publications found for this location". That is a different audience and a different meaning (an empty search result). **Default used:** out of scope.
5. **Dependency on "today".** The wording is accurate because the query returns only artefacts inside their display window right now. If users can later browse lists by date, this message will need revisiting. No action needed in this ticket.
