# Code Review: Issue #596 — Magistrates Public List

## Summary

The core module structure, registration, renderer, PDF generator, validation, and email summary are all implemented correctly and follow the established patterns. The renderer tests are thorough and good quality. However there are several gaps against the acceptance criteria: the table columns, restriction text content, and locale keys all diverge from the ticket spec, two required tests are missing, and there are accessibility and code quality issues in the templates.

---

## 🚨 CRITICAL Issues

### 1. Table columns do not match the ticket spec

**Files:** `magistrates-public-list.njk:99–105`, `pdf-template.njk:91–97`

The ticket specifies 6 columns: **Time, Defendant name, Case number, Offence, Plea, Results**.

The implementation renders 5 columns: Sitting At, URN, Name, Hearing Type, Prosecuting Authority.

The data model (`CaseData`) also has no `plea` or `results` fields. Either the column spec needs to be implemented, or the ticket spec needs to be confirmed as superseded by the actual JSON schema. This must be resolved before deployment.

---

### 2. Restriction information content does not match the ticket spec

**File:** `libs/list-types/magistrates-public-list/src/locales/en.ts:9–19`

The ticket defines specific restriction text, e.g.:
- `restrictionInformationHeading`: `"Restriction information"`
- `restrictionInformationBoldText`: `"Further information about reporting restrictions may be obtained from the Clerk of the Court before any publication is made."`
- `restrictionInformationP1`: `"In these cases, certain information may be subject to reporting restrictions..."`
- `restrictionBulletPoint1/2`: different wording

The implementation uses generic contempt-of-court text copied from another list type, which is legally distinct content. Both EN and CY locale files are affected.

---

### 3. Locale keys diverge from the acceptance criteria

**File:** `libs/list-types/magistrates-public-list/src/locales/en.ts`

Keys required by the ticket that are absent or renamed:
- `listDate` should be `"List for date:"` — implemented as `"List for"` (missing colon and "date")
- `lastUpdated` should be `"Last updated:"` — implemented as `listUpdated: "Last updated DATE at"` (different key name, different format)
- `publishedAt: "Published at:"` — absent entirely
- `defendant`, `caseNumber`, `offence`, `plea`, `results`, `resultsProviso` — all absent
- `linkToTop: "Back to top"` — absent
- `openJusticeTitle: "Open justice"` — absent

The `cy.ts` file has equivalent gaps.

---

## ⚠️ HIGH PRIORITY Issues

### 4. Page title uses `<h2>` instead of `<h1>`

**File:** `magistrates-public-list.njk:33`

```html
<h2 class="govuk-heading-l">{{ t.header }} {{ header.locationName }}</h2>
```

Every page must have exactly one `<h1>` for WCAG 2.2 AA compliance. The page title is currently rendered as `<h2>`, which breaks heading hierarchy and is a screen reader accessibility failure.

---

### 5. Open Justice collapsible section is absent

**File:** `magistrates-public-list.njk`

The acceptance criterion "Open Justice collapsible section present" is not met. The template has no `<details>` element for open justice content.

---

### 6. Back to top link is absent

**File:** `magistrates-public-list.njk`

`linkToTop: "Back to top"` is in the acceptance criteria but neither the locale key nor the link exist in the template.

---

### 7. Missing `pdf-generator.test.ts`

The acceptance criteria requires `src/pdf/pdf-generator.test.ts`. The file does not exist. The PDF generator has no unit test coverage.

---

### 8. Missing page controller `index.test.ts`

The acceptance criteria requires `index.test.ts` for the page controller in `apps/web/src/pages/(list-types)/magistrates-public-list/`. The file does not exist.

---

### 9. `t.sittingAt` reused for two distinct purposes

**Files:** `magistrates-public-list.njk:79,100`, `pdf-template.njk:78,92`

`t.sittingAt` = `"Sitting at"` is used both as:
1. The section heading `"Sitting at {locationName}"`
2. The table column header for the hearing time

These are semantically distinct. The table column header should have its own key (e.g. `t.time`), otherwise both will show "Sitting at" which is incorrect as a column label.

---

### 10. Data source always rendered in web template, even when empty

**File:** `magistrates-public-list.njk:178–180`

```nunjucks
<p ... style="font-size: 14px;">
  {{ t.dataSource }}: {{ dataSource }}
</p>
```

There is no `{% if dataSource %}` guard (unlike the PDF template at line 161–163). When `dataSource` is empty this renders `"Data Source: "`. The inline `style="font-size: 14px;"` also violates GOV.UK standards — use `govuk-body-s` instead.

---

## 💡 Suggestions

### 11. PDF template `lang` attribute is hardcoded

**File:** `pdf-template.njk:1`

`<html lang="en">` should reflect the actual render locale. Welsh PDFs will have an incorrect language attribute, which affects screen readers and spell checking.

### 12. `processCourtLists` mutates input data

**File:** `renderer.ts:97–122`

The function mutates the passed-in `jsonData` directly (adds `formattedJudiciaries`, `time`, `defendant`, etc. as computed fields). This is the established pattern for this codebase's magistrates renderers so it is acceptable pragmatically, but it means re-rendering the same data object has side effects.

---

## ✅ Positive Feedback

- **Module registration** is complete and correct — `app.ts`, `tsconfig.json`, `package.json`, and `apps/web` dependency are all wired up properly.
- **Renderer tests** are comprehensive — 20+ cases covering header, judiciary formatting, case/application defendant extraction, offences, address formatting, edge cases, and Welsh locale. Good quality.
- **Email summary integration** (`EMAIL_BUILDER_REGISTRY`) and **PDF generator integration** (`PDF_GENERATOR_REGISTRY`) are correctly registered in the notification and publication services.
- **Page controller** follows the `createListTypeHandler` + `createCauseListRender` pattern cleanly.
- **Validation and error handling** (400/404/403) is correctly delegated to `createListTypeHandler`.
- **Warning icon** in the PDF uses the reliable `display: inline-block` + `line-height` approach that matches GOV.UK's implementation.
- **Offence/restriction rows** use inline `border-right: none` / `border-left: none` for reliable PDF rendering.

---

## Test Coverage Assessment

- **Unit tests (renderer):** Good — 20+ scenarios covering all renderer logic paths
- **Unit tests (PDF generator):** Missing — no `pdf-generator.test.ts`
- **Unit tests (page controller):** Missing — no `index.test.ts`
- **Unit tests (locales):** Present (`locales.test.ts`)
- **Unit tests (validator):** Present (`json-validator.test.ts`)
- **E2E tests:** Not assessed (not in scope for this ticket per tasks.md)

---

## Acceptance Criteria Verification

- [x] New lib `libs/list-types/magistrates-public-list/` created
- [x] Module registered in `apps/web/src/app.ts`
- [x] Path alias in root `tsconfig.json`
- [x] Package dependency in `apps/web/package.json`
- [x] PDF generation implemented
- [x] Welsh language via `?lng=cy`
- [x] Returns 400/404/403 correctly (via `createListTypeHandler`)
- [x] `yarn test` — renderer, locale, validator tests present
- [ ] Table columns: Time, Defendant name, Case number, Offence, Plea, Results — **NOT MET** (different columns)
- [ ] Correct restriction information content — **NOT MET** (wrong text)
- [ ] Locale keys match spec (`listDate`, `lastUpdated`, `publishedAt`, etc.) — **NOT MET**
- [ ] Open Justice collapsible section — **NOT MET**
- [ ] Back to top link — **NOT MET**
- [ ] `pdf-generator.test.ts` — **NOT MET**
- [ ] Page controller `index.test.ts` — **NOT MET**
- [ ] Page `<h1>` heading — **NOT MET** (uses `<h2>`)

---

## Next Steps

- [ ] Resolve table column spec vs implementation discrepancy (confirm with product whether columns are correct)
- [ ] Update restriction information text in `en.ts` and `cy.ts` to match ticket spec
- [ ] Align locale keys to acceptance criteria (`listDate`, `lastUpdated`, `publishedAt`, `defendant`, `caseNumber`, `offence`, `plea`, `results`, `resultsProviso`, `linkToTop`, `openJusticeTitle`)
- [ ] Fix `<h2>` → `<h1>` on page title
- [ ] Add Open Justice `<details>` section
- [ ] Add Back to top link
- [ ] Add `{% if dataSource %}` guard and remove inline style in web template
- [ ] Add `t.time` locale key; use it for the table column header instead of `t.sittingAt`
- [ ] Write `pdf-generator.test.ts`
- [ ] Write page controller `index.test.ts`
- [ ] Fix `<html lang="en">` in PDF template to be locale-aware

---

## Overall Assessment

**NEEDS CHANGES** — Critical content issues (wrong restriction text, wrong table columns, wrong locale keys) and missing tests/accessibility fixes must be addressed before this can be merged.
