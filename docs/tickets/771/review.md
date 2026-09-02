# Code Review: Issue #771 — Magistrates Standard List

## Summary

This implementation adds the `magistrates-standard-list` list type as a new lib (`libs/list-types/magistrates-standard-list/`) and a corresponding page controller in `apps/web/src/pages/(list-types)/magistrates-standard-list/`. It follows the established `civil-and-family-daily-cause-list` module pattern and is largely well-structured. The renderer, validator, PDF generator, controller, and tests are all present and all 33 tests pass.

However, there are several issues that must be addressed before deployment:

1. The `libs/publication/package.json` is missing the `@hmcts/magistrates-standard-list` dependency even though `service.ts` imports from it — this will cause a production build failure.
2. The `libs/list-types/magistrates-standard-list/package.json` is missing the `build:pdf-templates` script, which means the PDF template will not be copied to `dist/` during production builds.
3. The locale content deviates from the acceptance criteria in several key fields.
4. The HTML template is missing the Open Justice collapsible section and the Back to Top link, both of which are acceptance criteria.
5. Multiple custom inline styles in the HTML template violate GOV.UK Design System conventions.

---

## CRITICAL Issues

### 1. Missing dependency in `libs/publication/package.json`

**File:** `/Users/kian.kwa/IdeaProjects/cath-service/libs/publication/package.json`

**Problem:** `libs/publication/src/processing/service.ts` (line 10) imports directly from `@hmcts/magistrates-standard-list`, but `@hmcts/magistrates-standard-list` is not listed in `libs/publication/package.json` dependencies. The other list type packages (e.g., `@hmcts/civil-and-family-daily-cause-list`, `@hmcts/care-standards-tribunal-weekly-hearing-list`) are all explicitly listed. This package is absent.

**Impact:** The production build for `libs/publication` will fail because the dependency cannot be resolved. PDF generation for the magistrates standard list will be broken at the build level in production.

**Solution:** Add `"@hmcts/magistrates-standard-list": "workspace:*"` to the `dependencies` object in `libs/publication/package.json`.

---

### 2. Missing `build:pdf-templates` script in `package.json`

**File:** `/Users/kian.kwa/IdeaProjects/cath-service/libs/list-types/magistrates-standard-list/package.json`

**Problem:** The `build` script is `"tsc"` only. The reference implementation (`civil-and-family-daily-cause-list`) uses `"build": "tsc && yarn build:nunjucks && yarn build:pdf-templates"` to copy `.njk` files to `dist/pdf/`. Without the copy step, `pdf-template.njk` will not exist at `dist/pdf/pdf-template.njk` in production, and `configureNunjucks(__dirname)` in `pdf-generator.ts` will resolve to `dist/pdf/` but find no template there.

**Impact:** PDF generation will throw a template-not-found error in production. Development works only because the `default` export condition in `package.json` uses the `src/` path directly.

**Solution:** Add the build script:
```json
"build": "tsc && yarn build:pdf-templates",
"build:pdf-templates": "mkdir -p dist/pdf && cp src/pdf/*.njk dist/pdf/"
```

---

### 3. Acceptance criteria locale keys not matching — `restrictionInformationHeading`, bullet points, and paragraph structure

**File:** `/Users/kian.kwa/IdeaProjects/cath-service/libs/list-types/magistrates-standard-list/src/locales/en.ts` (lines 10–20)

**Problem:** The ticket acceptance criteria (and the plan's template structure) specify the reporting restriction section should contain the statutory text from Children and Young Persons Act 1933 s.49, s.39, and the Criminal Procedure (Insanity) Act 1964 s.4A. The implementation uses entirely different text: generic advice about checking restrictions before publication rather than the statutory notices. The ticket specifies:

- `restrictionInformationHeading`: "Restriction information"
- `restrictionBulletPoint1`: "the name, address or school of the young person"
- `restrictionBulletPoint2`: "any particulars calculated to lead to the identification of the young person"

The implementation has:
- `restrictionInformationHeading`: "Restrictions on publishing or writing about these cases" (not matching)
- `restrictionBulletPoint1`: "the court directly" (not matching)
- `restrictionBulletPoint2`: "HM Courts and Tribunals Service on 0330 808 4407" (not matching)

The Welsh locale (`cy.ts`) similarly does not match the specified Welsh keys.

**Impact:** The page will not display the legally mandated statutory reporting restriction notices that the acceptance criteria require. This is a statutory compliance issue for a court publication service.

**Solution:** Update the locale files to use the exact content specified in the ticket acceptance criteria for `restrictionInformationHeading`, `restrictionInformationP1` through `restrictionInformationP4`, `restrictionBulletPoint1`, `restrictionBulletPoint2`, and all corresponding Welsh values.

---

## HIGH PRIORITY Issues

### 4. Open Justice collapsible section is absent from the HTML template

**File:** `/Users/kian.kwa/IdeaProjects/cath-service/apps/web/src/pages/(list-types)/magistrates-standard-list/magistrates-standard-list.njk`

**Problem:** The ticket acceptance criteria states "Open Justice collapsible section present". The plan specifies a `govuk-details` component with `t.openJusticeTitle`. The template has no Open Justice section at all. The locale files do not contain `openJusticeTitle` or any Open Justice content. The only `govuk-details` usage in the template is for individual offence disclosure, not a top-level Open Justice section.

**Impact:** An acceptance criterion is unmet. The page differs from the specified design.

**Solution:** Add a `govuk-details` component between the reporting restriction section and the case search input, using `t.openJusticeTitle` as the summary text.

---

### 5. "Back to top" link is absent from the HTML template

**File:** `/Users/kian.kwa/IdeaProjects/cath-service/apps/web/src/pages/(list-types)/magistrates-standard-list/magistrates-standard-list.njk`

**Problem:** The ticket acceptance criteria specifies `linkToTop` as a required content key ("Back to top" / "Yn ôl i'r brig"), and the plan confirms a back-to-top link at the bottom of the page. Neither the locale files nor the template contain this key or link.

**Impact:** An acceptance criterion is unmet.

**Solution:** Add `linkToTop` to both locale files and add an anchor link at the bottom of the template (before or after the data source attribution) linking to `#top` or `#main-content`.

---

### 6. Inline styles in the HTML template violate GOV.UK Design System conventions

**File:** `/Users/kian.kwa/IdeaProjects/cath-service/apps/web/src/pages/(list-types)/magistrates-standard-list/magistrates-standard-list.njk` (lines 3–13, and line 213)

**Problem:** The template uses a `<style>` block in `{% block head %}` with custom CSS classes (`.linked-cases-heading`, `.offence-summary`, `.add-border-bottom`, `.restriction-list-section`, `.govuk-accordion__controls`). Line 213 uses an inline `style="font-size: 14px;"`. The GOV.UK Design System requires custom styles to go in the module's stylesheet (a `.scss` file in `src/assets/css/`), not inline `<style>` blocks in templates. Overriding `.govuk-accordion__controls` is also a GOV.UK component override that should be avoided.

**Impact:** These styles are not reusable, they bypass the design system's build process, and overriding GOV.UK component internals (`.govuk-accordion__controls`) may break with future design system upgrades.

**Solution:** Move custom styles to a dedicated SCSS file. Remove the inline `style="font-size: 14px;"` from line 213 and use a GOV.UK utility class such as `govuk-body-s` instead.

---

### 7. `config.ts` is missing the `assets` export

**File:** `/Users/kian.kwa/IdeaProjects/cath-service/libs/list-types/magistrates-standard-list/src/config.ts`

**Problem:** The CLAUDE.md module guidelines and other list type implementations export an `assets` path from `config.ts`. The `civil-and-family-daily-cause-list` config exports `moduleRoot` and `assets`. The magistrates-standard-list `config.ts` only exports `moduleRoot` and `schemaPath`. While this module has no CSS assets currently, the plan specifies `src/config.ts` should follow the same shape as the reference implementation, and `apps/web/vite.config.ts` may expect this export pattern for consistency.

**Impact:** If the module ever gains CSS assets, the missing export will require changes to the app config. The inconsistency with the reference pattern also makes future maintenance harder.

**Solution:** Add `export const assets = path.join(__dirname, "assets/");` to `config.ts` for consistency with the module pattern, even if no assets currently exist.

---

### 8. Multiple locale keys in `en.ts` and `cy.ts` deviate from acceptance criteria

**File:** `/Users/kian.kwa/IdeaProjects/cath-service/libs/list-types/magistrates-standard-list/src/locales/en.ts`

**Problem:** The acceptance criteria define a specific set of page content keys:

| Required key | Required EN value | Implemented |
|---|---|---|
| `title` | "Magistrates Standard List" | Present, correct |
| `listDate` | "List for date:" | Implemented as "List for" (missing "date:") |
| `lastUpdated` | "Last updated:" | Present, correct |
| `publishedAt` | "Published at:" | Implemented as "at" (truncated, used as a conjunction) |
| `venueAddress` | "Venue address" | Not present as a key |
| `openJusticeTitle` | "Open justice" | Not present |
| `defendant` | "Defendant" | Not present |
| `caseNumber` | "Case number" | Not present |
| `offence` | "Offence" | Not present as a top-level label key |
| `results` | "Results" | Not present |
| `resultsProviso` | "Results proviso" | Not present |
| `noHearings` | "No hearings today" | Present, correct |
| `linkToTop` | "Back to top" | Not present |

The implementation has added many other keys (`sittingAt`, `reference`, `dobAndAge`, `asn`, `pncId`, etc.) that reflect the richer data model, but the keys required by the ticket are missing or have different values.

**Impact:** Multiple acceptance criteria are not satisfied. The `listDate` key reads "List for" rather than "List for date:", which may confuse users.

**Solution:** Review the acceptance criteria table and ensure all required keys are present with the exact values specified, in addition to the implementation-specific keys already present.

---

### 9. Welsh locale has an untranslated string

**File:** `/Users/kian.kwa/IdeaProjects/cath-service/libs/list-types/magistrates-standard-list/src/locales/cy.ts` (line 32)

**Problem:** `prosecutingAuthority: "Prosecuting Authority Name: "` — this value is left in English in the Welsh locale file. All other fields in `cy.ts` are translated.

**Impact:** Welsh-language users will see an English label for the prosecuting authority field.

**Solution:** Translate this to Welsh. A suitable translation would be "Enw'r Awdurdod Erlyn: ".

---

### 10. Accordion is built with raw HTML rather than the GOV.UK macro

**File:** `/Users/kian.kwa/IdeaProjects/cath-service/apps/web/src/pages/(list-types)/magistrates-standard-list/magistrates-standard-list.njk` (lines 73–210)

**Problem:** The accordion is hand-rolled HTML with the GOV.UK accordion data attributes and CSS classes, rather than using `{% from "govuk/components/accordion/macro.njk" import govukAccordion %}`. This is the same pattern used in other list type templates in this codebase (e.g., `civil-and-family-daily-cause-list`) due to the dynamic nature of the data, so it is an established pattern here. However, the HTML uses `<h1>` tags for court house name and court room name (lines 65, 68, 70) which are inside the accordion and appear after the existing `<h2>` on line 19. Multiple `<h1>` elements on a page violates WCAG 2.2 AA (a page should have exactly one `<h1>`).

**Impact:** Screen readers and assistive technologies use heading structure to navigate pages. Multiple `<h1>` elements break this navigation structure and fail WCAG 2.4.6 (Headings and Labels).

**Solution:** Change lines 65, 68, and 70 from `<h1>` to an appropriate heading level (`<h2>` or `<h3>`) that fits the document outline.

---

### 11. Court house name headings have redundant `tabindex="0"` on non-interactive elements

**File:** `/Users/kian.kwa/IdeaProjects/cath-service/apps/web/src/pages/(list-types)/magistrates-standard-list/magistrates-standard-list.njk` (lines 63, 65, 68, 70)

**Problem:** The `<div class="site-header">` and the three heading elements inside it all have `tabindex="0"`. Static, non-interactive elements should not be in the tab order. Adding `tabindex="0"` to headings and divs forces keyboard users to tab through content that provides no interactive value, increasing the number of tab stops unnecessarily.

**Impact:** Poor keyboard navigation experience, particularly for keyboard-only users and screen reader users. This departs from WCAG 2.1.1 (Keyboard) best practices.

**Solution:** Remove `tabindex="0"` from non-interactive heading and div elements.

---

## SUGGESTIONS

### 12. PDF template reporting restriction section is missing the bullet point lists under P2 and P3

**File:** `/Users/kian.kwa/IdeaProjects/cath-service/libs/list-types/magistrates-standard-list/src/pdf/pdf-template.njk` (lines 67–77)

**Problem:** The plan's template structure specifies two separate bullet point lists — one under P2 (s.49) and one under P3 (s.39), each with `restrictionBulletPoint1` and `restrictionBulletPoint2`. The PDF template renders P1 through P4 as paragraphs but the single `<ul>` (lines 73–76) appears after P4, not after P2 and P3 individually.

**Impact:** If the locale values are updated to the statutory content, the bullet structure in the PDF will not match the HTML view. This is a minor rendering inconsistency between HTML and PDF output.

**Solution:** Align the PDF template bullet point placement with the HTML template once the locale keys are corrected.

---

### 13. `pdf-generator.ts` does not pass page-specific locale translations to the PDF

**File:** `/Users/kian.kwa/IdeaProjects/cath-service/libs/list-types/magistrates-standard-list/src/pdf/pdf-generator.ts` (lines 32–36)

**Problem:** `loadTranslations` loads from `src/locales/en.ts` and `src/locales/cy.ts` (the lib-level error strings). The PDF template uses `t.title`, `t.listDate`, `t.sittingAt`, `t.name`, etc. — keys that are defined in the lib locales because they were placed there, not in the page-level locales. This works for now, but the locale architecture is inconsistent: the lib locales contain page display strings that belong at the page level per the CLAUDE.md guidelines.

**Impact:** This is a structural inconsistency. The lib locales mix error messages (which are legitimately lib-level) with display strings (title, listDate, name, etc.) that would normally live at the page level. This could create confusion as the codebase grows.

**Solution:** Consider whether the display strings in the lib locale should move to the page locale, or whether the current arrangement is intentional to support the PDF generator. If intentional, add a brief comment explaining why these display strings are in the lib locale.

---

### 14. `RenderOptions` is defined in `renderer.ts` rather than exported from `models/types.ts`

**File:** `/Users/kian.kwa/IdeaProjects/cath-service/libs/list-types/magistrates-standard-list/src/rendering/renderer.ts` (lines 22–26)

**Problem:** The `RenderOptions` interface is defined inline in `renderer.ts`. The plan notes it should be in `models/types.ts`. The CLAUDE.md rule is to colocate types with the appropriate code, which in this case means alongside the renderer is acceptable, but the plan specifically called for it to be in the models file.

**Impact:** Minor organisational inconsistency with the plan. Low impact.

**Solution:** Move `RenderOptions` to `models/types.ts` and import it into `renderer.ts`.

---

### 15. Missing JSON validator tests

**File:** `libs/list-types/magistrates-standard-list/src/validation/` (no test file present)

**Problem:** The tasks list specifies creating `json-validator.test.ts` with "valid and invalid fixture tests". The `validation/` directory contains only `json-validator.ts`. No test file for the validator was created.

**Impact:** The validator function is untested. Other modules in this codebase (e.g., `civil-and-family-daily-cause-list`) have dedicated validator tests.

**Solution:** Add `libs/list-types/magistrates-standard-list/src/validation/json-validator.test.ts` with at minimum one test for a valid document passing validation and one for an invalid document (missing required `document.publicationDate`) failing validation.

---

### 16. Missing PDF generator tests

**File:** `libs/list-types/magistrates-standard-list/src/pdf/` (no test file present)

**Problem:** The tasks list specifies creating `pdf-generator.test.ts`. No test file exists for the PDF generator.

**Impact:** The PDF generation path is untested. Other modules in this codebase have PDF generator tests.

**Solution:** Add `libs/list-types/magistrates-standard-list/src/pdf/pdf-generator.test.ts` following the pattern from `civil-and-family-daily-cause-list`.

---

### 17. Missing `config.test.ts`

**File:** `libs/list-types/magistrates-standard-list/src/` (no `config.test.ts` present)

**Problem:** The tasks list specifies creating `config.test.ts` verifying `moduleRoot` and `assets` paths. The plan calls for this file. It is present in the reference implementation.

**Impact:** Minor gap in test coverage.

**Solution:** Add `config.test.ts` to verify the `moduleRoot` and `schemaPath` exports resolve to real paths.

---

### 18. `tsconfig.json` is missing `src/assets/` from the exclude list

**File:** `/Users/kian.kwa/IdeaProjects/cath-service/libs/list-types/magistrates-standard-list/tsconfig.json`

**Problem:** The CLAUDE.md template for `tsconfig.json` specifies `"exclude": [..., "src/assets/"]`. The implementation omits `"src/assets/"` from the exclude list. While the module has no assets currently, this is an inconsistency with the template and other modules.

**Solution:** Add `"src/assets/"` to the exclude array for consistency.

---

## Positive Feedback

- The renderer is well-structured with clean functional decomposition. Private helper functions (`buildCaseHearingInfo`, `buildApplicationHearingInfo`, `addHearingToSittings`, `buildPartyInfo`, etc.) are appropriately named and single-purpose.
- The renderer correctly handles both case and application hearings, the dual defendant/subject party model, both individual and organisation party types, and in-custody/gender formatting.
- The JSON schema is the canonical pip-data-management schema, not a best-effort approximation.
- The `RenderedMagistratesStandardListHeader` and related rendered types are well-designed and provide a clean contract between the renderer and the template.
- The controller correctly passes both `en` and `cy` objects and a resolved `t` to the template, following the established pattern.
- The page controller tests are comprehensive: they cover 400 (missing artefactId), 404 (artefact not found), 403 (access denied), 404 (JSON blob not found), 400 (validation failure), 200 (English), 200 (Welsh), 500 (unexpected error), provenance label resolution, and unknown provenance fallback.
- The email summary builder is a well-structured bonus: despite the ticket noting this is a "TODO for later", it has been implemented with full tests covering middle names, multiple offences, organisation parties, and prosecuting authority extraction.
- The `list-type-data.ts` entry correctly uses `CRIME_IDAM` provenance, `defaultSensitivity: "Classified"`, and `subJurisdictionIds: [7]`, matching the established magistrates list pattern.
- All module registration steps are complete: `apps/web/src/app.ts`, `apps/web/package.json`, root `tsconfig.json` path alias, `libs/location/src/list-type-data.ts`, and `libs/publication/src/processing/service.ts`.
- The time formatting (12-hour am/pm) is correct and consistent with how other magistrates list types in the codebase format times.

---

## Test Coverage Assessment

- **Unit tests (renderer):** Good coverage — 16 tests covering header structure, location resolution, Welsh locale, location fallback, date/time formatting, empty court lists, court room rendering, judiciary name inclusion, party name formatting (gender, custody), offence processing, reporting restriction details, applications, prosecuting authority, and attendance method.
- **Unit tests (email summary):** Good coverage — 6 tests covering middle names for defendants and applicants, multiple offences, organisation parties, absent offences, and prosecuting authority.
- **Unit tests (controller):** Good coverage — 9 tests covering all error paths and both locale scenarios.
- **Unit tests (validator):** Not present. Task was specified but not completed.
- **Unit tests (PDF generator):** Not present. Task was specified but not completed.
- **Unit tests (config):** Not present. Task was specified but not completed.
- **E2E tests:** Not present (acceptable for this ticket type — no E2E tests are specified in the acceptance criteria).
- **All 33 existing tests pass.**

---

## Acceptance Criteria Verification

| Criterion | Status |
|---|---|
| New lib at `libs/list-types/magistrates-standard-list/` | Passed |
| `src/models/types.ts` present | Passed |
| `src/validation/json-validator.ts` present | Passed |
| `src/schemas/magistrates-standard-list.json` present | Passed |
| `src/rendering/renderer.ts` and `renderer.test.ts` present | Passed |
| `src/pdf/pdf-generator.ts` and `pdf-template.njk` present | Passed |
| `src/index.ts` and `src/config.ts` present | Passed |
| `package.json` and `tsconfig.json` present | Passed |
| Page at `GET /magistrates-standard-list?artefactId=` | Passed |
| Page content EN keys present and correct | **Failed** — `listDate`, `publishedAt`, `venueAddress`, `openJusticeTitle`, `defendant`, `caseNumber`, `offence`, `results`, `resultsProviso`, `linkToTop` missing or incorrect |
| Page content CY keys present and correct | **Failed** — same issues plus untranslated `prosecutingAuthority` |
| Hearings table columns present | Partial — column data is rendered, but column header keys (`defendant`, `caseNumber`, `offence`, `plea`, `results`) are not defined as locale keys |
| Reporting restriction section (statutory) | **Failed** — text is generic advice, not the statutory s.49/s.39/s.4A text |
| Open Justice collapsible section | **Failed** — not present |
| Case search input | Passed |
| Data source attribution | Passed |
| Returns 400 if `artefactId` missing | Passed |
| Returns 404 if artefact not found | Passed |
| Returns 403 if no access | Passed |
| Returns 400 if JSON fails validation | Passed |
| PDF generated matching HTML structure | Passed |
| PDF includes reporting restriction | Passed (but with incorrect statutory text) |
| PDF saved to storage | Passed |
| Welsh via `?lng=cy` | Partial — Welsh locale present but missing required keys and has untranslated value |
| Module registered in `apps/web/src/app.ts` | Passed |
| Path alias in `tsconfig.json` | Passed |
| Package added to `apps/web/package.json` | Passed |
| Unit tests pass | Passed (but validator, PDF generator, and config tests not created) |
| `yarn test` passes | Passed |

---

## Next Steps

- [ ] Add `"@hmcts/magistrates-standard-list": "workspace:*"` to `libs/publication/package.json` dependencies (CRITICAL)
- [ ] Add `build:pdf-templates` script to `libs/list-types/magistrates-standard-list/package.json` (CRITICAL)
- [ ] Update `en.ts` and `cy.ts` locale files to use the statutory reporting restriction text from the acceptance criteria (CRITICAL)
- [ ] Add missing locale keys: `openJusticeTitle`, `venueAddress`, `defendant`, `caseNumber`, `offence` (table heading), `results`, `resultsProviso`, `linkToTop`, and correct `listDate` to "List for date:" (HIGH)
- [ ] Add the Open Justice collapsible section to the HTML template (HIGH)
- [ ] Add the Back to Top link to the HTML template and locale files (HIGH)
- [ ] Fix Welsh `prosecutingAuthority` untranslated value (HIGH)
- [ ] Fix multiple `<h1>` elements in the template — change court house/room headings to `<h2>` or `<h3>` (HIGH)
- [ ] Remove `tabindex="0"` from non-interactive heading and div elements (HIGH)
- [ ] Move custom styles from inline `<style>` block to a SCSS file; remove inline `style="font-size: 14px;"` (HIGH)
- [ ] Add `assets` export to `config.ts` (SUGGESTION)
- [ ] Add `json-validator.test.ts`, `pdf-generator.test.ts`, and `config.test.ts` (SUGGESTION)
- [ ] Re-run `yarn test` after fixes to confirm all tests still pass

---

## Overall Assessment

**NEEDS CHANGES**

The core implementation is solid: the renderer, schema, types, validation, controller, and test coverage for existing tests are well done. However, the implementation cannot be deployed as-is because the `libs/publication/package.json` dependency is missing (production build will fail), the `build:pdf-templates` script is absent (production PDF generation will fail), and multiple acceptance criteria are unmet — particularly the statutory reporting restriction content, the Open Justice section, and the Back to Top link. The heading hierarchy and `tabindex` issues are accessibility failures that must be resolved before the page goes live.
