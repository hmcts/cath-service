# Code Review: Issue #436 - Crown PDDA Lists

## Summary

Three new list-type modules have been added: `crown-daily-list`, `crown-firm-list`, and `crown-warned-list`. Each module is self-contained and follows the established module pattern. The integration points (app.ts, processing/service.ts, tsconfig.json) are correctly updated. The overall structure is sound, but there are several issues that need addressing before deployment, ranging from a type-safety anti-pattern used in two renderers to missing page controller tests, a hardcoded file path in all three controllers, and a mismatched route prefix in the crown-daily-list config.

---

## CRITICAL Issues

### 1. Hardcoded filesystem path in all three page controllers

**Files:**
- `libs/list-types/crown-daily-list/src/pages/index.ts` (lines 15-17)
- `libs/list-types/crown-firm-list/src/pages/index.ts` (lines 15-17)
- `libs/list-types/crown-warned-list/src/pages/index.ts` (lines 15-17)

**Problem:** All three controllers navigate to the monorepo root by counting `..` path segments:

```typescript
// Navigate to monorepo root (from libs/list-types/crown-daily-list/src/pages/)
const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..", "..");
const TEMP_UPLOAD_DIR = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");
```

This is fragile and environment-specific. It assumes a fixed directory depth that will silently produce the wrong path if the module is ever moved or the compiled output is placed in a different directory. The other controllers in the codebase that serve publication data (e.g., `administrative-court-daily-cause-list`) do not follow this pattern.

**Impact:** Incorrect file path resolution at runtime leading to 404 errors on all three list pages in any environment where the working directory or module location differs from development assumptions.

**Solution:** Read the upload directory from an environment variable or a shared configuration constant. Check how other publication page controllers resolve this path and follow the same mechanism.

---

### 2. Mutation of typed objects via `as unknown as Record<string, unknown>` in crown-daily-list and crown-firm-list renderers

**Files:**
- `libs/list-types/crown-daily-list/src/rendering/renderer.ts` (lines 94-95, 100, 123, 126, 130)
- `libs/list-types/crown-firm-list/src/rendering/renderer.ts` (lines 104-105, 110, 133, 136, 141)

**Problem:** The renderers mutate the parsed JSON data objects in-place using a double type assertion to bypass TypeScript's type system:

```typescript
(caseItem as unknown as Record<string, unknown>).defendants = defendants.join(", ");
(caseItem as unknown as Record<string, unknown>).representative = representative.trim();
```

This pattern defeats the purpose of TypeScript. The fields `defendants`, `representative`, `formattedJudiciaries`, `time`, and `displayHearingType` are computed properties that do not exist on the declared types, so the code must bypass the type system to attach them. The crown-warned-list renderer avoids this entirely by returning a properly typed `GroupedHearingCategory[]` structure.

**Impact:** Runtime errors are possible if the template references a computed property that was not attached due to a bug in the mutation logic. TypeScript provides no safety net here. The `strict` mode in `tsconfig.json` should be catching this kind of assertion.

**Solution:** Define extended types that include the computed properties, or restructure the renderer to return a new mapped structure rather than mutating the input. The crown-warned-list renderer is the right approach - transform the data into a well-typed output structure and pass that to the template.

---

### 3. Mismatched route prefix in crown-daily-list config

**File:** `libs/list-types/crown-daily-list/src/config.ts` (line 9)

**Problem:** The `pageRoutes` object has a prefix of `/crown-daily-cause-list`:

```typescript
export const pageRoutes = {
  path: path.join(__dirname, "pages"),
  prefix: "/crown-daily-cause-list"   // <-- does not match the module name
};
```

The module name is `crown-daily-list` and the template is named `crown-daily-list.njk`. The other two modules have correct prefixes (`/crown-firm-list` and `/crown-warned-list`). This prefix mismatch means users will navigate to `/crown-daily-cause-list` rather than a consistent URL, and any links in other parts of the application pointing to `/crown-daily-list` will be broken.

**Impact:** Incorrect URL for the Crown Daily List page, inconsistency with the module naming convention, and potential broken navigation links.

**Solution:** Change the prefix to `/crown-daily-list` to match the module name and template name.

---

## HIGH PRIORITY Issues

### 4. Missing page controller tests for all three modules

**Missing files:**
- `libs/list-types/crown-daily-list/src/pages/index.test.ts`
- `libs/list-types/crown-firm-list/src/pages/index.test.ts`
- `libs/list-types/crown-warned-list/src/pages/index.test.ts`

**Problem:** The established pattern in this codebase includes page controller tests. The `administrative-court-daily-cause-list` module has `src/pages/index.test.ts` which covers the GET handler for scenarios including missing artefact, access control failure, invalid JSON, and successful render. None of the three new modules have equivalent tests.

**Impact:** The access control logic (`canAccessPublicationData`), the artefact lookup path, the validation rejection path, and the 403 rendering are untested. These are security-relevant code paths.

**Solution:** Add `index.test.ts` in each module's `pages/` directory following the pattern established in `administrative-court-daily-cause-list/src/pages/index.test.ts`. At minimum test: missing artefactId returns 400, artefact not found returns 404, access denied returns 403, invalid JSON returns 400, successful render passes correct props to the template.

---

### 5. `console.error` used directly in page controllers

**Files:**
- `libs/list-types/crown-daily-list/src/pages/index.ts` (line 112)
- `libs/list-types/crown-firm-list/src/pages/index.ts` (line 112)
- `libs/list-types/crown-warned-list/src/pages/index.ts` (line 112)

**Problem:** All three controllers use `console.error` directly for unexpected error logging:

```typescript
console.error("[crown-daily-list] Unexpected error:", error);
```

The CLAUDE.md security requirements state that no sensitive data should appear in logs. The `error` object passed directly to `console.error` may contain a stack trace, request parameters, or other context that includes sensitive information about the artefact or user request. Other controllers in the codebase use a structured logger.

**Impact:** Potential exposure of sensitive information through unstructured logs; inconsistency with platform logging practices.

**Solution:** Replace `console.error` with the structured logger used elsewhere in the codebase, logging only the error message and relevant non-sensitive identifiers (e.g., artefactId).

---

### 6. `tsconfig.json` missing `/config` path entries for the three new modules

**File:** `tsconfig.json` (lines 35-37)

**Problem:** The tsconfig paths include the module roots but not the `/config` sub-path exports:

```json
"@hmcts/crown-daily-list": ["libs/list-types/crown-daily-list/src"],
"@hmcts/crown-firm-list": ["libs/list-types/crown-firm-list/src"],
"@hmcts/crown-warned-list": ["libs/list-types/crown-warned-list/src"],
```

Other modules with config exports have explicit path entries for both paths:
```json
"@hmcts/sjp-press-list": ["libs/list-types/sjp-press-list/src"],
"@hmcts/sjp-press-list/config": ["libs/list-types/sjp-press-list/src/config"],
```

The `app.ts` file imports from `@hmcts/crown-daily-list/config` etc. Without the explicit path mappings, TypeScript resolution may work at runtime via the `package.json` exports map but will fail during `yarn typecheck`.

**Impact:** TypeScript compilation failure for the config imports from `app.ts`.

**Solution:** Add the three `/config` path entries to `tsconfig.json`:
```json
"@hmcts/crown-daily-list/config": ["libs/list-types/crown-daily-list/src/config"],
"@hmcts/crown-firm-list/config": ["libs/list-types/crown-firm-list/src/config"],
"@hmcts/crown-warned-list/config": ["libs/list-types/crown-warned-list/src/config"],
```

---

### 7. Inline `style` attribute for font size in all three page templates

**Files:**
- `libs/list-types/crown-daily-list/src/pages/crown-daily-list.njk` (line 121)
- `libs/list-types/crown-firm-list/src/pages/crown-firm-list.njk` (line 122)
- `libs/list-types/crown-warned-list/src/pages/crown-warned-list.njk` (line 72)

**Problem:** The data source footer uses an inline style that overrides the GOV.UK Design System typography:

```html
<p class="govuk-body govuk-!-margin-top-6" style="font-size: 14px;">
```

This is flagged as an anti-pattern in the review criteria — inline styles that set custom sizes break the Design System contract. However, this same pattern appears in the existing `civil-and-family-daily-cause-list` template, so this may be an accepted project convention. It is still worth addressing consistently.

**Impact:** Minor inconsistency with GOV.UK Design System typography. The 14px value does not map to a Design System type scale.

**Solution:** Use `govuk-body-s` class instead of the inline style, which renders at the small body text size defined by the Design System.

---

### 8. Crown Firm List accordion groups by sitting rather than by Day → Courtroom → Judiciary

**File:** `libs/list-types/crown-firm-list/src/pages/crown-firm-list.njk` (lines 62-115)

**Problem:** The acceptance criteria specifies "Crown Firm List grouped by Day → Courtroom → Judiciary". The template renders an accordion section per sitting (innermost loop), with the day, courtroom, and judiciary all shown in the section header label. This produces multiple accordion sections when there are multiple sittings per courtroom, rather than hierarchical grouping where the day is the outer accordion and courtroom/judiciary the inner grouping.

**Impact:** The rendered output may not match the style guide specification for the grouping hierarchy, particularly when a firm list contains multiple sittings across multiple days.

**Solution:** Verify against the style guide specification. If Day is intended to be the primary grouping level (outer accordion), the template and renderer need to group sittings by day first before producing accordion sections.

---

## SUGGESTIONS

### 9. Duplicated `createPartyDetails` and `extractDefendantNames` across modules

**Files:** The `createPartyDetails` function is duplicated identically across:
- `crown-daily-list/src/rendering/renderer.ts`
- `crown-daily-list/src/email-summary/summary-builder.ts`
- `crown-firm-list/src/rendering/renderer.ts`
- `crown-firm-list/src/email-summary/summary-builder.ts`
- `crown-warned-list/src/rendering/renderer.ts`
- `crown-warned-list/src/email-summary/summary-builder.ts`

**Benefit:** Extracting this to `@hmcts/list-types-common` would reduce duplication and ensure consistent party name formatting across all list types. The `formatTime`, `formatContentDate`, and `formatPublicationDateTime` functions are also duplicated verbatim across all three renderers and additionally duplicate the implementation in `civil-and-family-daily-cause-list`.

**Approach:** Move shared utility functions to the `@hmcts/list-types-common` package, which is already a dependency of all three modules.

---

### 10. Crown Warned List hearing category matching is locale-sensitive and fragile

**File:** `libs/list-types/crown-warned-list/src/rendering/renderer.ts` (lines 96-103)

**Problem:** The `resolveCategoryFromDescription` function matches categories using `String.includes()` on the lowercased hearing description:

```typescript
function resolveCategoryFromDescription(description: string): string {
  const normalised = (description || "").toLowerCase();
  if (normalised.includes("trial")) return "For Trial";
  if (normalised.includes("plea")) return "For Plea";
  ...
  return "To be allocated";
}
```

The category labels returned (`"For Trial"`, `"For Plea"`, etc.) are English strings hardcoded in the renderer and used directly as display labels in both the web template and PDF template. When the locale is Welsh (`cy`), these category headings will still appear in English. The `en.ts` and `cy.ts` files do not include translations for these category labels.

**Benefit:** Translating category headings through the `t` object would provide full Welsh language support for the Crown Warned List category groupings.

**Approach:** Add category label translations to `en.ts` and `cy.ts`, pass them to the renderer via options, and look up the translated label in the template using the category value as a key.

---

### 11. The `preStatement` translation is a function, not a string — this is a non-standard pattern

**Files:**
- `libs/list-types/crown-warned-list/src/pages/en.ts` (line 7)
- `libs/list-types/crown-warned-list/src/pages/cy.ts` (line 7)

**Problem:** The `preStatement` key holds an arrow function rather than a string:

```typescript
preStatement: (weekCommencing: string) =>
  `The undermentioned cases are warned for...${weekCommencing}...`,
```

This is called in the Nunjucks template as `{{ t.preStatement(header.weekCommencing) }}`. Nunjucks supports calling JavaScript functions from templates, but this is a non-standard pattern for i18n content in this codebase. All other translation keys are plain strings. This complicates testing, static analysis, and future migration to a standard i18n library.

**Approach:** Separate the static text and the dynamic date. Pass `weekCommencing` as a separate template variable and construct the sentence in the template, or define the pre-statement as a string with a placeholder that is replaced in the renderer/controller before passing to the template.

---

### 12. Validator tests do not cover the `courtLists` array content structure

**Files:**
- `libs/list-types/crown-daily-list/src/validation/json-validator.test.ts`
- `libs/list-types/crown-firm-list/src/validation/json-validator.test.ts`
- `libs/list-types/crown-warned-list/src/validation/json-validator.test.ts`

**Problem:** The validator tests cover missing top-level fields and invalid publication date format, but do not test invalid nested structures within `courtLists` (e.g., missing `courtRoomName`, missing `sittingStart`, invalid `sittingStart` format). The JSON schemas do define patterns and required fields for these nested objects, but test coverage does not verify the schemas enforce them.

**Approach:** Add test cases for at least one invalid nested structure (e.g., missing `courtRoomName`, missing `sittingStart`) to confirm the schema validation rejects them.

---

### 13. Module ordering: `createPartyDetails` is defined after functions that call it

**Files:**
- `libs/list-types/crown-daily-list/src/rendering/renderer.ts` (line 62 vs line 78)
- `libs/list-types/crown-firm-list/src/rendering/renderer.ts`

**Problem:** The CLAUDE.md convention states "Other functions should be ordered in the order they are used." The `createPartyDetails` helper is used by `processParties`, but `processParties` is defined at line 78, after `createPartyDetails` at line 62. The `formatTime` and other helpers called by `renderCrownDailyListData` are defined before the export, which is correct. This is a minor ordering inconsistency.

**Approach:** This is a low-priority readability concern. No functional impact.

---

## Positive Feedback

- The crown-warned-list renderer takes the correct approach by transforming input data into a well-typed `GroupedHearingCategory[]` output rather than mutating the input. This is the right pattern for the other two renderers to follow.

- The `DEFENDANT_IN_CUSTODY` role is correctly implemented in the crown-warned-list renderer and both correctly sets `isInCustody` on the row and includes the name in the defendant list. The template then renders the `*` marker correctly.

- JSON schemas use the anti-injection regex pattern `^(?!(.|\r|\n)*<[^>]+>)(.|\r|\n)*$` consistently on all string fields across all three schemas, matching the security practice of the existing schemas in the codebase.

- Welsh translations are complete and cover all user-facing strings. The Welsh content is substantive (not placeholder text) and correctly structured identically to the English equivalents. The crown-warned-list `preStatement` Welsh text is a proper translation, not a copy of the English.

- The `formatWeekCommencing` function in the crown-warned-list renderer correctly handles both ISO date strings and fallback to the raw string for pre-formatted values.

- Test coverage for renderers and email summaries is good. The crown-warned-list renderer tests in particular are comprehensive, covering all five category groupings, the `DEFENDANT_IN_CUSTODY` flag, linked cases, and the fallback to "To be allocated".

- Access control is correctly implemented in all three page controllers using `canAccessPublicationData`, consistent with other list-type page controllers.

- Module structure, package.json exports, build scripts, and dependency declarations are all correctly configured and consistent with the established module pattern.

- PDF generation is registered correctly in `libs/publication/src/processing/service.ts` using the correct type assertions. Integration into `app.ts` follows the established pattern.

---

## Test Coverage Assessment

**Unit tests:**
Renderer tests: Good coverage across all three modules. The crown-warned-list renderer tests are the strongest. Crown-daily-list and crown-firm-list renderer tests cover the core transformation logic adequately.

Email summary tests: Adequate for all three modules. All cover the main happy path, missing defendant, and empty data scenarios.

Validator tests: Minimal. Cover only top-level required field checks. Missing coverage for nested structure validation.

Page controller tests: None. This is a gap compared to the `administrative-court-daily-cause-list` module which has a comprehensive `index.test.ts`. This is the most significant testing gap given the security-relevant access control logic in the controllers.

**E2E tests:** No E2E tests have been added for the three new list types. Given the overall testing strategy this is acceptable for initial implementation but should be addressed before the lists go to production.

**Accessibility tests:** No dedicated accessibility tests. Inline accessibility checks in E2E tests would be the expected approach per CLAUDE.md guidelines.

---

## Acceptance Criteria Verification

- [x] Crown Daily List: Grouping by courtroom + judiciary (accordion per session with courtroom name and judiciary in header)
- [x] Crown Daily List: Fields correct (Hearing Time, Case Reference, Defendant, Hearing Type, Prosecuting Authority, Listing Notes)
- [x] Crown Firm List: Grouped by Day → Courtroom → Judiciary - **PARTIALLY MET**: the accordion groups by sitting with day/courtroom/judiciary in the header label, but not as a hierarchical Day-outer/Courtroom-inner structure as the AC specifies
- [x] Crown Firm List: Fields correct (Case Number, Defendant, Hearing Type, Representative, Prosecuting Authority, Listing Notes)
- [x] Crown Warned List: Grouped by categories (For Trial, For Plea, For Sentence, For Appeal, To be allocated)
- [x] Crown Warned List: Fields correct (Fixed For, Case Reference, Defendant, Prosecuting Authority, Linked Cases, Listing Notes)
- [x] All lists: Grey box opening statement with reporting restrictions (govuk-inset-text)
- [x] Warned List: Pre-statement text about week commencing date
- [x] Defendants in custody marked with * (DEFENDANT_IN_CUSTODY role handled correctly)
- [x] JSON schema validation for each list type
- [x] Email summaries for each list type
- [x] PDF generation for each list type
- [x] English + Welsh translations for all pages
- [x] Integrated into publication processing pipeline

---

## Next Steps

1. Fix the route prefix in `crown-daily-list/src/config.ts` — change `/crown-daily-cause-list` to `/crown-daily-list` (Critical #3)
2. Resolve the hardcoded `MONOREPO_ROOT` path in all three page controllers — use an environment variable or shared config (Critical #1)
3. Add `/config` path mappings to `tsconfig.json` for all three modules (High #6)
4. Add page controller tests (`src/pages/index.test.ts`) for all three modules (High #4)
5. Address the type-safety issue in the crown-daily-list and crown-firm-list renderers — eliminate the `as unknown as Record<string, unknown>` mutations (Critical #2)
6. Replace `console.error` with the structured logger in all three page controllers (High #5)
7. Clarify the Crown Firm List grouping hierarchy against the style guide specification (High #8)
8. Add Welsh translations for Crown Warned List category labels (Suggestion #10)

---

## Overall Assessment

**NEEDS CHANGES**

Three critical issues must be resolved before deployment: the hardcoded filesystem path in all three controllers creates an environment-specific fragility, the type assertion mutation pattern in the crown-daily-list and crown-firm-list renderers bypasses type safety, and the mismatched route prefix for the Crown Daily List will produce an incorrect URL. Three high priority issues (missing tsconfig /config entries, missing page controller tests, and direct console.error usage) also need attention. The acceptance criteria are largely met but the Crown Firm List grouping hierarchy needs clarification against the style guide spec.
