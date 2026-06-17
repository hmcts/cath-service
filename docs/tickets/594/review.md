# Code Review: Issue #594 - Civil Daily Cause List and Family Daily Cause List

## Summary

Two new list-type modules have been added: `@hmcts/civil-daily-cause-list` and `@hmcts/family-daily-cause-list`. Both are correctly structured under `libs/list-types/` and follow the existing module patterns from comparable modules such as `@hmcts/civil-and-family-daily-cause-list`. Both modules are registered in `apps/web/src/app.ts`, the root `tsconfig.json`, and `apps/web/package.json`. All 28 unit tests pass in each module and the linter reports no issues.

The implementation is broadly solid and consistent with the established codebase conventions. There are no security vulnerabilities or accessibility blockers. However, there are several issues that need attention before deployment: pervasive use of `as any` type casts in the renderer, an unvalidated query parameter used directly in a file-system path, inline `<style>` blocks in templates, and near-total code duplication between the two new modules (and against the existing `civil-and-family` module). There is also a missing `publishedAt` display in both templates despite the translation key being defined, and duration labels are hardcoded English strings in templates that should come from the `t` object.

---

## CRITICAL Issues

### 1. Path traversal risk: unvalidated `artefactId` used in file path construction

**Files:**
- `libs/list-types/civil-daily-cause-list/src/pages/index.ts` line 22, 72
- `libs/list-types/family-daily-cause-list/src/pages/index.ts` line 22, 72

**Problem:** `artefactId` is cast directly from the query string and interpolated into a file system path with no validation:

```typescript
const artefactId = req.query.artefactId as string;
// ...
const jsonFilePath = path.join(TEMP_UPLOAD_DIR, `${artefactId}.json`);
```

A crafted value such as `../../../../etc/passwd` would be resolved by `path.join` to a path outside `TEMP_UPLOAD_DIR`. Although the subsequent `getArtefactById` call must succeed first (which reduces the practical risk if that lookup is safe), the pattern is unsafe in isolation and is present across multiple list-type controllers. The `artefactId` should be validated to confirm it is a safe identifier (e.g. matches a CUID/UUID pattern) and the resolved path should be confirmed to start with `TEMP_UPLOAD_DIR` before the file is read.

**Impact:** Potential path traversal allowing an attacker to read arbitrary files accessible to the process.

**Solution:**
```typescript
// Validate artefactId is a safe value (no path separators, matches expected format)
const artefactId = req.query.artefactId as string;
if (!artefactId || !/^[a-zA-Z0-9_-]+$/.test(artefactId)) {
  return res.status(400).render("errors/common", { ... });
}
// After constructing the path, verify it is within the expected directory
const jsonFilePath = path.join(TEMP_UPLOAD_DIR, `${artefactId}.json`);
if (!jsonFilePath.startsWith(TEMP_UPLOAD_DIR + path.sep) && jsonFilePath !== TEMP_UPLOAD_DIR) {
  return res.status(400).render("errors/common", { ... });
}
```

Note: this same pattern exists in the other list-type controllers. The fix should be extracted into a shared helper in `@hmcts/list-types-common`.

---

### 2. Pervasive `as any` casts defeat TypeScript type safety in renderers

**Files:**
- `libs/list-types/civil-daily-cause-list/src/rendering/renderer.ts` lines 83-103, 101-103, 115, 169-172, 177, 200
- `libs/list-types/family-daily-cause-list/src/rendering/renderer.ts` lines 83-103, 101-103, 115, 169-172, 177, 200

**Problem:** The renderer mutates `Sitting`, `Session`, and `CauseListCase` objects to attach computed properties (`time`, `durationAsHours`, `durationAsMinutes`, `caseHearingChannel`, `formattedJudiciaries`, `applicant`, `respondent`, `formattedReportingRestriction`) using `(obj as any).property = value`. This pattern:
- Bypasses TypeScript's type system entirely
- Makes it impossible for the compiler to catch typos or mismatches between what is set here and what is read in the template
- Violates the CLAUDE.md directive: "no `any` without justification"

**Impact:** Runtime errors cannot be caught at compile time. A typo in a property name will produce a silent empty value in the rendered page.

**Solution:** Extend the existing type interfaces with the computed properties, or introduce dedicated "rendered" types:

```typescript
interface RenderedSitting extends Sitting {
  time: string;
  durationAsHours: number;
  durationAsMinutes: number;
  caseHearingChannel: string;
}
```

Return properly typed objects from the rendering functions rather than mutating the originals.

---

## HIGH PRIORITY Issues

### 3. Complete code duplication between the two new modules and the existing `civil-and-family` module

**Files:**
- `libs/list-types/civil-daily-cause-list/src/rendering/renderer.ts`
- `libs/list-types/family-daily-cause-list/src/rendering/renderer.ts`

These two files are byte-for-byte identical. The controller `index.ts` files differ only by the module name in log messages, the validator call, and the template name. The PDF generator files are also functionally identical. The JSON schemas differ only in the `hearingType` example string.

The existing `@hmcts/civil-and-family-daily-cause-list` module already implements the same rendering logic. This creates three copies of the same renderer, three copies of the same controller pattern, and three copies of the same PDF generator.

**Impact:** Any bug fix or enhancement to the shared logic must be applied in three places. This has already happened: `civil-and-family` contains a `console.log` debug statement in its controller (line referencing `MONOREPO_ROOT`) that was not included in the two new modules, indicating divergence has already begun.

**Recommendation:** Extract the shared rendering logic, controller pattern, and PDF generation into `@hmcts/list-types-common` so that the per-list modules only need to supply their schema, translations, and template name. This is a refactoring task that may be deferred to a follow-up ticket, but the duplication should be tracked.

---

### 4. Inline `<style>` blocks in Nunjucks templates override the design system

**Files:**
- `libs/list-types/civil-daily-cause-list/src/pages/civil-daily-cause-list.njk` lines 3-18
- `libs/list-types/family-daily-cause-list/src/pages/family-daily-cause-list.njk` lines 3-18

**Problem:** Both templates inject a `<style>` block directly into the page `<head>` using `{% block head %}{% endblock %}`:

```html
{% block head %}
  {{ super() }}
  <style>
    .govuk-accordion__controls { text-align: right; }
    .no-wrap { white-space: nowrap; }
    .govuk-accordion__section-content { overflow: auto hidden; }
    .govuk-table { overflow: auto hidden; }
  </style>
{% endblock %}
```

Inline styles in government services create several issues:
- They conflict with the Content Security Policy (CSP) header configured by Helmet, which restricts inline styles unless a nonce is applied. Without the nonce, the browser will block these styles.
- They duplicate styles that should live in a module SCSS file under `src/assets/css/`.
- Overriding `govuk-*` classes breaks the design system contract.

**Impact:** Styles may be silently blocked by CSP in production, causing layout failures for `.no-wrap` and table overflow behaviour. This is a visual regression risk.

**Solution:** Move these styles into a dedicated SCSS file (e.g. `libs/list-types/civil-daily-cause-list/src/assets/css/civil-daily-cause-list.scss`) and ensure the `assets` path is registered in the web app's Vite config. Remove the inline `<style>` blocks.

---

### 5. Duration labels are hardcoded English strings in both templates

**Files:**
- `libs/list-types/civil-daily-cause-list/src/pages/civil-daily-cause-list.njk` lines 117-130
- `libs/list-types/family-daily-cause-list/src/pages/family-daily-cause-list.njk` lines 117-130
- `libs/list-types/civil-daily-cause-list/src/pdf/pdf-template.njk` lines 73-87
- `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk` lines 73-87

**Problem:** Duration text is constructed with hardcoded English strings:

```html
{% set durationText = sitting.durationAsHours ~ ' hours' %}
{% set durationText = durationText ~ sitting.durationAsMinutes ~ ' mins' %}
```

When the page is rendered in Welsh (`locale=cy`), the duration column will display "1 hour 30 mins" rather than Welsh equivalent text. The `t` object is available in the template but is not used for these strings. The `en.ts` and `cy.ts` locale files do not include `hour`, `hours`, `min`, or `mins` keys.

**Impact:** Welsh users see English text in the duration column. This is a WCAG and Welsh Language Standards compliance failure for a government service.

**Solution:** Add `hour`, `hours`, `min`, `mins` keys to both `en.ts` and `cy.ts` locale files, then replace the hardcoded strings in the templates with `t.hour`, `t.hours`, `t.min`, `t.mins`.

---

### 6. `publishedAt` translation key defined but never used

**Files:**
- `libs/list-types/civil-daily-cause-list/src/pages/en.ts` line 5
- `libs/list-types/civil-daily-cause-list/src/pages/cy.ts` line 5
- `libs/list-types/family-daily-cause-list/src/pages/en.ts` line 5
- `libs/list-types/family-daily-cause-list/src/pages/cy.ts` line 5

**Problem:** Both `en.ts` and `cy.ts` define a `publishedAt` key ("Published at:" / "Cyhoeddwyd am:"). The templates display `header.lastUpdated` with the label `t.lastUpdated`, but there is no `publishedAt` output in either template. It is unclear whether the design requires a separate "Published at" field or whether `lastUpdated` covers it. The unused key adds dead code.

**Impact:** Either a required field is missing from the rendered page, or there is dead code in the locale files. Either outcome needs resolution.

**Solution:** Either render `publishedAt` in the template if the design requires it, or remove the key from both locale files.

---

### 7. `inline style` attribute used in templates for font size

**Files:**
- `libs/list-types/civil-daily-cause-list/src/pages/civil-daily-cause-list.njk` line 171
- `libs/list-types/family-daily-cause-list/src/pages/family-daily-cause-list.njk` line 171

**Problem:**

```html
<p class="govuk-body" style="font-size: 14px;">
  {{ t.dataSource }}: {{ dataSource }}
</p>
```

Inline `style` attributes are blocked by a strict CSP. Beyond the CSP concern, using a pixel font size directly contradicts the GOV.UK Design System which specifies font sizes via its typography scale (e.g. `govuk-body-s` for smaller text).

**Solution:** Replace with the appropriate GOV.UK class:

```html
<p class="govuk-body-s">
  {{ t.dataSource }}: {{ dataSource }}
</p>
```

---

## SUGGESTIONS

### 8. Controller does not validate the `artefactId` type before use

**File:** `libs/list-types/civil-daily-cause-list/src/pages/index.ts` line 22

The cast `req.query.artefactId as string` will be `undefined` if the parameter is absent (covered by the subsequent `if (!artefactId)` check) but could also be a `string[]` if the query parameter is supplied multiple times (e.g. `?artefactId=a&artefactId=b`). In that case `!artefactId` is falsy, and `path.join(TEMP_UPLOAD_DIR, `${artefactId}.json`)` would produce `...<dir>/a,b.json` or similar. A type-safe check such as `typeof artefactId !== "string"` would be more robust.

---

### 9. `openJustice` data is populated but never rendered in the templates

**Files:**
- `libs/list-types/civil-daily-cause-list/src/pages/civil-daily-cause-list.njk`
- `libs/list-types/family-daily-cause-list/src/pages/family-daily-cause-list.njk`

The controller passes `openJustice` (containing `venueName`, `email`, `phone`) to the template, and the renderer builds this object from `venueContact` data. However, neither template uses `openJustice.email` or `openJustice.phone`. The template only shows the static `t.openJusticeText`. If the design requires displaying court contact details under the open justice section (consistent with other list types), these fields are silently dropped. If they are not required, the `openJustice` object should only contain what is needed.

---

### 10. Tasks checklist was not updated to reflect completion status

**File:** `docs/tickets/594/tasks.md`

All task checkboxes remain unchecked (`- [ ]`) despite the implementation being complete. The checklist should be updated to `- [x]` for completed items to accurately reflect the state of the work.

---

### 11. Missing `tsconfig.json` path alias in the CLAUDE.md-prescribed location

**Files:** `tsconfig.json` (root)

The root `tsconfig.json` correctly includes paths for both new modules. No issues here. This is confirmed.

---

### 12. `applicantRepresentative` and `respondentRepresentative` are computed but never displayed

**Files:**
- `libs/list-types/civil-daily-cause-list/src/rendering/renderer.ts` lines 140-141, 156, 162-163, 170-171
- `libs/list-types/family-daily-cause-list/src/rendering/renderer.ts` same

The renderer computes `applicantRepresentative` and `respondentRepresentative` from party data. Neither property is referenced in the templates (either the web page template or the PDF template). If representative names should appear (e.g. beneath the party name), this is a missing feature. If they are not required, computing and storing them is dead work.

---

## Positive Feedback

- Module structure precisely follows the CLAUDE.md conventions: `config.ts` is separate from `index.ts`, `pageRoutes` uses a `prefix`, `moduleRoot` is exported, and the `package.json` includes `build:nunjucks` and `build:pdf-templates` scripts.
- All four test files pass (28 tests each module, 56 total) with good scenario coverage: missing artefact, 403 access, file read error, validation failure, English/Welsh rendering, provenance labels, and unexpected errors.
- JSON schemas include HTML-injection prevention patterns (`^(?!(.|\\r|\\n)*<[^>]+>)`) on all string fields, providing a defence-in-depth layer against XSS in ingested data.
- Welsh translations are present and complete for all keys in both modules. The Welsh content appears accurate.
- The renderer correctly prioritises the Welsh location name from the database (`location.welshName`) over the JSON data venue name when the locale is `cy`.
- Both modules are correctly registered in `apps/web/src/app.ts` with proper ordering and in `apps/web/package.json` as workspace dependencies.
- Presiding judge ordering logic in `formatJudiciaries` is correctly implemented: presiding judges are moved to the front of the list.
- The GOV.UK accordion pattern is used correctly with `data-module="govuk-accordion"`, and the `govuk-accordion__section--expanded` modifier is applied so content is visible on load without JavaScript.
- `govuk-table` markup (thead/tbody, `scope="col"`) is semantically correct and screen-reader compatible.
- Error responses correctly use locale-specific messages.
- The build succeeds cleanly and the linter reports no issues.

---

## Test Coverage Assessment

- **Unit tests (civil-daily-cause-list):** 28 tests across 4 files. Controller, renderer, PDF generator, and validator are all covered. Pass rate: 100%.
- **Unit tests (family-daily-cause-list):** 28 tests across 4 files. Same coverage pattern. Pass rate: 100%.
- **E2E tests:** No E2E tests have been added for the new routes. Given the CLAUDE.md requirement for E2E tests covering critical user journeys, a test covering the happy path (loading the list, verifying Welsh toggle, and running axe accessibility checks) should be added.
- **Accessibility tests:** No automated accessibility tests exist for these pages. This is covered by the missing E2E tests above.
- **Coverage percentage:** Not available from the automated run, but the scenarios covered are representative of the main branches in the controller logic.

---

## Acceptance Criteria Verification

No `ticket.md` file was found at `docs/tickets/594/ticket.md`, so acceptance criteria are inferred from the tasks checklist in `tasks.md`.

- [x] Create module directory structure for civil-daily-cause-list: Complete
- [x] Create `package.json` for civil-daily-cause-list: Complete
- [x] Create `tsconfig.json` for civil-daily-cause-list: Complete
- [ ] Create `src/models/types.ts` with TypeScript interfaces: Present, but interfaces lack the computed runtime properties (see critical issue #2)
- [x] Create `src/schemas/civil-daily-cause-list.json` schema: Complete
- [x] Create `src/validation/json-validator.ts`: Complete
- [x] Create `src/rendering/renderer.ts`: Complete (with type safety caveat)
- [x] Create `src/pages/en.ts` with English translations: Complete (with `publishedAt` unused key)
- [x] Create `src/pages/cy.ts` with Welsh translations: Complete (with `publishedAt` unused key)
- [x] Create `src/pages/index.ts` page controller: Complete
- [x] Create `src/pages/civil-daily-cause-list.njk` Nunjucks template: Complete (with inline style issues)
- [x] Create `src/pdf/pdf-generator.ts`: Complete
- [x] Create `src/pdf/pdf-template.njk`: Complete
- [x] Create `src/index.ts` business logic exports: Complete
- [x] Create `src/config.ts` module configuration: Complete
- [x] (family module) All equivalent tasks: Complete with same caveats
- [x] Add path aliases to root `tsconfig.json`: Complete
- [x] Register modules in `apps/web/src/app.ts`: Complete
- [x] Add packages as dependencies in `apps/web/package.json`: Complete
- [x] Write unit tests for civil-daily-cause-list controller: Complete (10 tests)
- [x] Write unit tests for civil-daily-cause-list renderer: Complete (8 tests)
- [x] Write unit tests for civil-daily-cause-list PDF generator: Complete (6 tests)
- [x] Write unit tests for civil-daily-cause-list JSON validator: Complete (4 tests)
- [x] Write unit tests for family-daily-cause-list (all four): Complete
- [ ] E2E tests: Not present in this implementation

---

## Next Steps

- [ ] Fix critical issue #1: Add `artefactId` sanitisation and path containment check before the `readFile` call. Extract into a shared helper in `@hmcts/list-types-common`.
- [ ] Fix critical issue #2: Replace `as any` casts in both renderers with typed "rendered" interfaces.
- [ ] Fix high priority issue #4: Move inline CSS to SCSS files under `src/assets/css/`. Register asset paths in the Vite config.
- [ ] Fix high priority issue #5: Add `hour`/`hours`/`min`/`mins` translation keys and use them in templates.
- [ ] Fix high priority issue #6: Resolve the `publishedAt` key — either render it or remove it from both locale files.
- [ ] Fix high priority issue #7: Replace `style="font-size: 14px;"` with `govuk-body-s` class.
- [ ] Add E2E journey test covering both list types (happy path, Welsh, accessibility scan).
- [ ] Track code duplication (issue #3) as a follow-up refactoring ticket.
- [ ] Update `docs/tickets/594/tasks.md` to mark completed items.
- [ ] Re-run tests after fixes.

---

## Overall Assessment

**NEEDS CHANGES**

The implementation is functionally complete and follows the module structure correctly. The critical `as any` type safety issue in the renderers and the path traversal risk on the file read must be addressed before deployment. Several high priority issues affecting Welsh language compliance and CSP compatibility with inline styles also require resolution. The code duplication is significant and should be tracked even if deferred.
