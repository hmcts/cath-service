# Code Review: Issue #1382

## Summary

This change renames two list types, and only their display names change:

- `ET_FORTNIGHTLY_PRESS_LIST` becomes "Employment Tribunal Advance Hearing List".
- `ET_DAILY_LIST` becomes "Employment Tribunal Daily Hearing List".

The change uses the Welsh names supplied in the ticket. Internal names, URL paths and package names are unchanged, so stored artefacts, subscriptions, links and the Courtel `x-list-type` header are not affected.

`defaultSensitivity: "Public"` was already set on both entries. A new unit test now locks it in. The Courtel AC has moved to #1761 and is not reviewed here.

Files reviewed:
- `libs/list-types/common/src/list-type-data.ts`
- `libs/list-types/common/src/list-type-data.test.ts` (new, untracked)
- `libs/list-types/et-daily-list/src/{locales/en.ts, locales/cy.ts, index.test.ts, pdf/pdf-generator.test.ts, validation/json-validator.ts}`
- `libs/list-types/et-fortnightly-list/src/{locales/en.ts, locales/cy.ts, index.test.ts, pdf/pdf-generator.test.ts, validation/json-validator.ts}`
- `templates/tech-spec-references/welsh-translations-catalogue.json`
- `welsh/catalogue.csv`

Checks I ran:
- **Unit tests:** `vitest run --coverage` passes in all three changed workspaces:
  - common: 417 tests
  - et-daily-list: 38 tests
  - et-fortnightly-list: 41 tests
- **Related tests:** `apps/web` ET page tests (15) and `apps/postgres/prisma/generate-seed-sql.test.ts` (17) pass.
- **Biome:** clean on the changed files.
- **JSON catalogue:** parses as valid JSON.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

None.

## 💡 SUGGESTIONS

1. **Ask the Welsh Language Unit (WLU) about the soft mutation after "Rhestr"**
   - **Where:** `libs/list-types/common/src/list-type-data.ts:109`, `:120`
   - **Issue:** The new names use "Rhestr Gwrandawiadau". The Mental Health Tribunal entry at `list-type-data.ts:142` uses the mutated "Rhestr Wrandawiadau", and the Tax and Land Registration entries use "Rhestr o Wrandawiadau". The Care Standards Tribunal entry at `:131` uses the unmutated form, so the repo is already inconsistent.
   - **Why not a blocker:** The strings match the ticket exactly, which is correct.
   - **Approach:** Ask the WLU whether they meant the unmutated form. If they change it, update `list-type-data.ts`, both `cy.ts` files, both catalogues and the tests together. The CSV ids are hashes of the Welsh text, so they would need regenerating.

2. **"Press List" wording in the important-information text**
   - **Where:** `libs/list-types/et-daily-list/src/locales/en.ts:31`, `libs/list-types/et-fortnightly-list/src/locales/en.ts:33`, and the Welsh "Rhestr y Wasg" at `cy.ts:31` and `cy.ts:33`.
   - **Issue:** Both pages still say "The inclusion of a case in the Press List is no guarantee...". Neither list is now called a Press List, so the sentence may confuse readers.
   - **Why not a blocker:** This is legal or standard wording and outside the AC.
   - **Approach:** Ask the content owner or ticket author whether it should become "this list" (with the Welsh to match) in a follow-up.

3. **Add an en/cy key-parity test to each ET lib**
   - **Where:** neither `et-daily-list` nor `et-fortnightly-list` has `expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort())`.
   - **Current state:** I checked the diffs, and the key sets are unchanged. The only removals were the two stale comments.
   - **Benefit:** A parity test would catch future drift between the locale files. `.claude/rules/testing.md` asks for one.

4. **Old names in the synthetic seed fixture**
   - **Where:** `apps/postgres/prisma/generate-seed-sql.test.ts:42`, `:48`, `:53`
   - **Current state:** These are the only old ET names left outside `docs/`, `requirements/` and the legacy catalogue rows. The plan is right that this fixture is self-contained and does not read `list-type-data.ts`, so leaving it is fine.
   - **Approach:** Optionally update the strings so future greps for the old names come back clean. The fixture's deliberate differences (`isNonStrategic: true`, `defaultSensitivity: null`) must stay.

5. **Catalogue insertion order**
   - **Where:** `welsh/catalogue.csv:156-157`, `welsh-translations-catalogue.json:145-146`
   - **Issue:** The new rows sit after "Employment Tribunals Fortnightly Press List" rather than in strict alphabetical order. Neither file is strictly sorted today (I checked the JSON keys programmatically), so this is cosmetic only.

6. **Branch and function coverage in the ET libs**
   - **Current state:** Branches are 66.66% in both ET libs, and functions are 60% and 66.67%. This was already the case and this change does not touch those lines. Statements are above 80% everywhere.

7. **PDFs already in blob storage**
   - **Issue:** They keep the old title until the list is republished. The plan notes this as acceptable.
   - **Approach:** Make sure the lower-environment verification (Scenario 3) publishes fresh files, rather than checking old PDFs.

## ✅ Positive Feedback

- The change is display-name-only and correctly scoped. `name`, `urlPath` and `defaultSensitivity` are untouched (`list-type-data.ts:107`, `:111`, `:113`, `:118`, `:122`, `:124`), so nothing keyed on the stable name is disturbed.
- No numeric `listTypeId` appears anywhere in the change. The new test finds entries with `listTypeData.find((listType) => listType.name === name)` (`list-type-data.test.ts:11`, `:30`) and follows Arrange-Act-Assert.
- Existing environments are covered without a migration. `generate-seed-sql.ts:153` emits `ON CONFLICT (name) DO UPDATE SET friendly_name, welsh_friendly_name, shortened_friendly_name, ..., default_sensitivity`. Locally, `libs/location/src/seed-list-types.ts:44-57` upserts the same fields.
- The fortnightly locale title and the database friendly name used to differ ("Fortnightly List" vs "Fortnightly Press List"). They now match.
- The stale "listLookup.json" comments were removed from the daily locales, as the plan asked.
- **CSV rows check out:**
  - I recomputed both ids as `sha1(english\0context\0welsh)[:10]` with an empty context: `9a89450a99` and `c915de0fd5` match.
  - The same scheme reproduces the existing `2f334efe58` row.
  - Both new rows end in CRLF, like every other record. The only LF line breaks in the file are inside existing quoted multi-line fields.
  - Status is `approved` and the source is `ticket:hmcts/cath-service#1382`.
- The JSON catalogue is valid and has both new entries. The old rows are kept as translation memory, as agreed.
- No runtime code, template or e2e test refers to the old names. Grepping `apps/`, `libs/` and `e2e-tests/` finds them only in the synthetic seed fixture. The ET templates take the heading from `t.title`, and emails, the summary of publications and the upload picker read the database friendly names.
- **Security, accessibility and performance:** no impact. There is no new input, route, markup or query. The page `<h1>` and the PDF `<title>` keep coming from the locale, now with the new names in both languages.

## Test Coverage Assessment

- **Unit:**
  - `list-type-data.test.ts` asserts the English, Welsh and shortened names, the unchanged `urlPath` and `defaultSensitivity: "Public"` for both entries.
  - Both `index.test.ts` files assert the new EN and CY `title`.
  - The mocked titles in both `pdf-generator.test.ts` files match the new names. They are mock values, not assertions.
- **E2E:** none added. That is reasonable: there is no new page or journey, and no existing spec refers to the ET lists or the old names.
- **Accessibility:** not affected. There is no markup change, and the heading structure is unchanged.
- **Statements coverage per changed workspace:**

| Workspace | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `@hmcts/list-types-common` | 95.11% | 91% | 90.06% | 94.94% |
| `@hmcts/et-daily-list` | 95.12% | 66.66% | 60% | 95.12% |
| `@hmcts/et-fortnightly-list` | 94.33% | 66.66% | 66.66% | 96.07% |

All changed workspaces are above the 80% statements threshold.

## Acceptance Criteria Verification

- [x] The Employment Tribunal fortnightly list is renamed to 'Employment Tribunal Advance Hearing List' while 2nd list is called 'Employment Tribunal Daily Hearing List'.
  - **Reference data:** `libs/list-types/common/src/list-type-data.ts`:
    - Daily list: EN `:108`, CY `:109`, short name `:114`.
    - Fortnightly list: EN `:119`, CY `:120`, short name `:125`.
  - **Page and PDF titles:**
    - `libs/list-types/et-daily-list/src/locales/en.ts:2-3`, `cy.ts:2-3`
    - `libs/list-types/et-fortnightly-list/src/locales/en.ts:2-3`, `cy.ts:2-3`
  - **Welsh catalogues:** `welsh/catalogue.csv:156-157`, `templates/tech-spec-references/welsh-translations-catalogue.json:145-146`
  - **Tests:** `list-type-data.test.ts:11-20`, `:30-39`; `et-daily-list/src/index.test.ts:21-22`; `et-fortnightly-list/src/index.test.ts:21-23`
  - **Deployed environments:** the seed propagates the names through `apps/postgres/prisma/generate-seed-sql.ts:153`.
- [x] The sensitivity for both lists is 'Public'
  - **Reference data:** `libs/list-types/common/src/list-type-data.ts:113`, `:124`
  - **Tests:** locked in by `list-type-data.test.ts:19`, `:38`
  - **Deployed environments:** the seed reasserts `default_sensitivity` at `generate-seed-sql.ts:153`.

(The Courtel AC has moved to #1761 and is out of scope.)

Tally: 2 met, 0 partial, 0 not met.

## Next Steps

- [ ] Ask the WLU about "Rhestr Gwrandawiadau" vs "Rhestr Wrandawiadau" (optional, non-blocking)
- [ ] Ask the content owner whether "Press List" in the important-information text should change (optional follow-up)
- [ ] Add an en/cy key-parity test to both ET libs (optional)
- [ ] Commit the untracked `libs/list-types/common/src/list-type-data.test.ts` with the rest of the change
- [ ] Carry out the per-environment checks in tasks.md after deploy: Scenario 3, and `is_hidden`

## Overall Assessment: APPROVED
