# Code Review: Issue #428

## Summary

This implementation adds 10 new non-strategic hearing list types across 4 new lib modules and 10 new page controllers, following the established pattern of `@hmcts/care-standards-tribunal-weekly-hearing-list`. The architecture is sound and the code quality is generally high. However, there are two bugs that will cause silent rendering failures in production — one in the SIAC/POAC/PAAC PDF template and one in the SIAC/POAC/PAAC web template — and a product decision about SIAC/POAC/PAAC sensitivity level that is currently resolved in the wrong direction. The verification tasks in Group 12 are not yet complete.

---

## CRITICAL Issues

### 1. SIAC/POAC/PAAC PDF template references an undefined key `t.importantInformation`

**Files:**
- `libs/list-types/siac-poac-paac-weekly-hearing-list/src/pdf/pdf-template.njk` line 21
- `libs/list-types/siac-poac-paac-weekly-hearing-list/src/locales/en.ts`

**Problem:** The PDF template renders `{{ t.importantInformation }}` but the `en.ts` and `cy.ts` locale objects have no `importantInformation` key. The locale only exports `siacImportantInformation`, `poacImportantInformation`, and `paacImportantInformation`. Nunjucks silently outputs an empty string for undefined variables, so all three PDF outputs will show a blank important information section with no error.

**Impact:** Every generated PDF for SIAC, POAC, and PAAC will have an empty "Important information" box, silently dropping legally required content from the downloadable document.

**Solution:** The PDF generator accepts a `courtName` parameter and a `listTitle` parameter, which identifies which tribunal is being rendered. The generator should resolve the correct accordion text and pass it explicitly to the template. Either add a `importantInformation` parameter to `PdfGenerationOptions` in `pdf-generator.ts` and require callers to supply it, or resolve it inside the generator using a map keyed on `courtName`. The template variable name can remain `importantInformation`.

---

### 2. SIAC/POAC/PAAC web templates render the important information link as literal markdown text

**Files:**
- `apps/web/src/pages/(list-types)/siac-weekly-hearing-list/siac-weekly-hearing-list.njk` line 32
- `apps/web/src/pages/(list-types)/poac-weekly-hearing-list/poac-weekly-hearing-list.njk` line 32
- `apps/web/src/pages/(list-types)/paac-weekly-hearing-list/paac-weekly-hearing-list.njk` line 32

**Problem:** The `siacImportantInformation` locale string is stored as a multi-paragraph string containing a Markdown-style hyperlink: `[Find out what to expect coming to a court or tribunal](https://www.gov.uk/guidance/what-to-expect-coming-to-a-court-or-tribunal)`. The template renders this via `{{ importantInformation }}` which outputs the raw text, so users see the literal markdown syntax rather than a working anchor link.

Contrast this with the FTT Tax, FTT LRT, and FTT RPT modules, which correctly separate the link into distinct locale keys (`importantInformationText`, `importantInformationLinkText`, `importantInformationLinkUrl`) and render the anchor explicitly in the template.

**Impact:** The external "Find out what to expect" link required by the ticket specification is broken for all three SIAC/POAC/PAAC pages. Users see raw text like `[Find out what to expect coming to a court or tribunal](https://...)` rather than a clickable link. This is an accessibility failure (WCAG 2.1 SC 4.1.3 — status messages and interactive content must be programmatically determinable).

**Solution:** Refactor the `siacImportantInformation`, `poacImportantInformation`, and `paacImportantInformation` locale keys to follow the same pattern used in `ftt-tax-chamber-weekly-hearing-list`. Replace the single string with three keys per tribunal variant: `siacImportantInformationText`, `siacImportantInformationLinkText`, `siacImportantInformationLinkUrl`. Update the SIAC, POAC, and PAAC templates to render the link explicitly with `<a href="...">`. The cy.ts locale stubs must mirror the same key structure.

---

### 3. SIAC/POAC/PAAC `defaultSensitivity` set to `Public` — unresolved open question

**File:** `libs/location/src/list-type-data.ts` lines 327, 340, 352

**Problem:** The plan explicitly flagged this as an open question (plan.md Open Question 2): *"If these lists contain information about persons whose identities need protection (which the accordion text implies), `Classified` or `Private` may be more appropriate than `Public`."* The implementation has resolved this as `Public` without documented confirmation from the product owner.

The important information text itself states *"The tribunal sometimes uses reference numbers or initials to protect the anonymity of those involved in the appeal"*, which strongly implies these are not straightforwardly public lists.

**Impact:** Setting the wrong sensitivity level means access control may be incorrectly applied, potentially exposing hearing information about individuals under anonymity protection to users who should not have access.

**Solution:** Obtain explicit written confirmation from the product owner about the intended sensitivity level for IDs 28, 29, and 30 before these entries go live. If `Public` is confirmed, document the confirmation in the ticket.

---

## HIGH PRIORITY Issues

### 4. `@hmcts/postgres-prisma` listed as a dependency but is never imported

**Files:**
- `libs/list-types/siac-poac-paac-weekly-hearing-list/package.json` line 29
- `libs/list-types/ftt-tax-chamber-weekly-hearing-list/package.json` line 29
- `libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/package.json` line 29
- `libs/list-types/ftt-rpt-weekly-hearing-list/package.json` line 29

**Problem:** All four new packages declare `"@hmcts/postgres-prisma": "workspace:*"` as a dependency. No file within any of these modules imports from `@hmcts/postgres-prisma`. This appears to be copied directly from the reference module (`care-standards-tribunal-weekly-hearing-list`), which also carries this unused dependency. None of the new modules query the database directly — all DB access goes through `@hmcts/publication` via `getArtefactById`.

**Impact:** Unnecessary dependency increases bundle size and can trigger Prisma client initialisation in environments where a database connection is not available, adding latency and potential startup errors to unrelated test runs.

**Solution:** Remove `@hmcts/postgres-prisma` from the `dependencies` section of all four new `package.json` files.

### 5. Inline `<style>` block in every new template

**Files:**
- `apps/web/src/pages/(list-types)/siac-weekly-hearing-list/siac-weekly-hearing-list.njk` lines 3–9
- All corresponding templates for POAC, PAAC, FTT Tax, FTT LRT, and FTT RPT (5 regions)

**Problem:** Each template injects a `<style>` block into the `head` block:
```html
<style>
  .back-to-top {
    margin-top: 40px;
  }
</style>
```
This pattern is directly copied from the CST reference module, which has the same issue. The CLAUDE.md frontend rules state: "Never use inline styles — use GOV.UK classes only." Injecting a `<style>` block per page is equivalent to inline styling — it is not a shared module stylesheet, it is not processed by Vite, and it bypasses the Helmet CSP nonce applied to script tags. GOV.UK provides `govuk-!-margin-top-*` spacing utilities that make this unnecessary.

**Impact:** Minor CSP inconsistency, and pattern proliferation — each new list type template copies this block.

**Solution:** Replace the `back-to-top` class with `govuk-!-margin-top-6` on the wrapping `<div>` directly and remove the `{% block head %}` override. This was already carried from CST; fixing it here avoids spreading the pattern further.

### 6. Group 12 verification tasks are incomplete

**File:** `docs/tickets/428/tasks.md` lines 172–175

**Problem:** All five verification tasks in Group 12 are marked unchecked. The implementation is not considered complete until `yarn test` passes, `yarn build` compiles without TypeScript errors, and the new URL paths are exercised.

**Impact:** There may be TypeScript or test failures not yet surfaced by this review.

**Solution:** Run `yarn test` and `yarn build` from the monorepo root and fix any failures before marking this implementation as ready for deployment.

---

## SUGGESTIONS

### 7. Module ordering inconsistency in `siac-poac-paac` `index.ts`

**File:** `libs/list-types/siac-poac-paac-weekly-hearing-list/src/index.ts`

The CLAUDE.md convention requires: consts → exported functions → other functions → interfaces/types. In `index.ts`, the `// Business logic exports` comment appears before the locale exports but `// Locale exports` comment appears between the two locale export lines (cy before en, with the comment between them). The inline comments are also mislabelled — `cy` is exported before `en` under a comment that says "Business logic exports", which makes the grouping confusing. Minor, but worth tidying for consistency.

### 8. `ValidationResult` re-exported from `@hmcts/siac-poac-paac-weekly-hearing-list`

**File:** `libs/list-types/siac-poac-paac-weekly-hearing-list/src/index.ts` line 4

`export type { ValidationResult } from "@hmcts/publication"` re-exports a type that belongs to another module. Consumers should import `ValidationResult` from `@hmcts/publication` directly. The other three new modules do not do this, so SIAC/POAC/PAAC is inconsistent. The CST reference module does not re-export it either.

### 9. `as any` usage in test mocks

**File:** `apps/web/src/pages/(list-types)/siac-weekly-hearing-list/index.test.ts` lines 107, 177, 195

Three `as any` casts appear when mocking the artefact returned by `getArtefactById`. The test mock objects should be typed properly using the actual artefact type from `@hmcts/publication` to avoid suppressing TypeScript's ability to catch interface mismatches in future. The same pattern likely appears in some of the other 9 controller test files (not all were reviewed). Use `Partial<Artefact>` or construct a minimal typed stub instead.

### 10. `console.error` rather than a structured logger

All new page controllers use `console.error` for error logging, consistent with the CST reference module. This is inherited behaviour rather than a new regression, but worth flagging: structured logging (e.g. via an `@hmcts/logger` abstraction) would improve observability in production. The CLAUDE.md security requirement states "No sensitive data in logs"; the current `console.error` calls log file paths (which include the artefactId) and raw error objects, which may contain stack traces. These should not be surfaced to users (and they are not), but structured logging would give more control over log levels and redaction.

---

## Positive Feedback

- The shared-module strategy for SIAC/POAC/PAAC and for the five RPT variants is correct. Grouping identical field sets into a single package avoids duplication without sacrificing per-list URL and locale control. This directly follows the established CST pattern and the CLAUDE.md architecture guidance.
- Converter registrations are correct: each module registers both by numeric ID (`registerConverter`) and by name (`registerConverterByName`), which is the right defensive approach given the plan's note about potential DB ID differences across environments.
- `list-type-data.ts` entries are correctly placed as IDs 28–37, not 24–33 — the implementation correctly resolved the ID collision documented in the plan.
- The `shortenedFriendlyName` for PAAC (ID 30) is `"PACC Weekly Hearing List"` (double-C), matching the ticket specification exactly and preserving the known typo for the product owner to confirm.
- All 10 JSON Schemas are draft-07, consistent with the rest of the codebase, and correctly use the no-HTML regex pattern for string fields.
- Email summary builders consistently return only `[Date, Time/Hearing Time, Case Reference Number]` across all 10 list types, exactly as the ticket requires.
- FTT Tax Chamber, FTT LRT, and FTT RPT templates correctly separate the important information body text from the external link, using distinct locale keys and rendering the anchor explicitly — this is the correct pattern.
- All 10 page controller test files cover the five key scenarios: successful render, missing `artefactId` (400), artefact not found (404), JSON file not found (404), validation failure (400), and server error (500). The test structure correctly follows Arrange-Act-Assert.
- The `apps/web/src/app.ts` wiring is clean — all four new `moduleRoot` imports are present and added to `modulePaths` in the correct location.
- Root `tsconfig.json` has all 8 required path entries (4 module roots + 4 `/config` sub-paths).

---

## Test Coverage Assessment

**Unit tests (libs):** All four lib modules have tests for `renderer`, `email-summary/summary-builder`, `pdf-generator`, and `config`. Coverage of the rendering and email-summary paths is comprehensive. The PDF generator tests exercise the success and error paths. No gaps identified in the lib-level tests.

**Unit tests (page controllers):** All 10 page controllers have test files covering all five error and success scenarios. The `as any` casts in test mocks are a minor type-safety issue noted above. The tests do not exercise the Welsh (`cy`) locale path, which means a regression in locale switching would not be caught.

**E2E tests:** No E2E tests were added for the new list types. Given that Group 12 verification tasks are not complete and the implementation is non-strategic (internal upload route, not public-facing journey pages), this is acceptable as a first pass, but E2E coverage should be added before the service goes live.

**Accessibility tests:** No automated accessibility tests exist for the new pages. Given the rendering bug in items 1 and 2 above, this is currently moot, but axe-core inline accessibility checks should be added to any future E2E tests for these pages.

---

## Acceptance Criteria Verification

| Criterion | Status | Notes |
|-----------|--------|-------|
| Validation schemas created for all 10 list types | PASS | All schemas present in `schemas/` directories |
| Error handling in place for validation | PASS | 400/404/500 paths covered in all controllers |
| Valid publications saved via current method | PASS | Follows CST pattern; PDF and JSON storage paths identical |
| List types classified; user groups decided | PARTIAL | `defaultSensitivity: "Public"` for SIAC/POAC/PAAC is an unresolved open question (Critical issue 3) |
| New PDF template for each list | PASS | PDF templates created for all four modules |
| Unified email summary format | PASS | All 10 lists return `[Date, Time/Hearing Time, Case Reference Number]` |
| Email summary fields: Date, Time, Case Reference Number | PASS | Confirmed across all `summary-builder.ts` files |
| New style guide (page template) for each list | PASS | All 10 Nunjucks templates created |
| List manipulation for style guide | PASS | Search input present in all templates |
| SIAC/POAC/PAAC display names correct | PASS | `englishFriendlyName` values match ticket spec |
| Upload form labels correct | PASS | `shortenedFriendlyName` values match (including "PACC" double-C) |
| SIAC/POAC/PAAC region is London | PASS | `subJurisdictionIds: [25]`, `[23]`, `[21]` — correct sub-jurisdictions |
| SIAC/POAC/PAAC important information accordion content | FAIL | Link renders as raw markdown text on web pages (Critical issue 2); PDF omits it entirely (Critical issue 1) |
| SIAC/POAC/PAAC fields: Date, Time, Appellant, Case Ref, Hearing Type, Courtroom, Additional info | PASS | All 7 fields present in schema, converter, model, renderer, and template |
| FTT Tax Chamber display name and upload form label correct | PASS | Matches ticket spec |
| FTT Tax region is National | PASS | `subJurisdictionIds: [16]` |
| FTT Tax important information accordion content | PASS | All 5 paragraphs and external link present and rendered correctly |
| FTT Tax fields: Date, Hearing Time, Case Name, Case Ref, Judge(s), Member(s), Venue/Platform | PASS | All 7 fields correct |
| FTT LRT display name and upload form label correct | PASS | Matches ticket spec |
| FTT LRT region is National | PASS | `subJurisdictionIds: [15]` |
| FTT LRT important information accordion content | PASS | Contains `[insert office email]` placeholder as specified |
| FTT LRT fields: Date, Hearing Time, Case Name, Case Ref, Judge, Venue/Platform | PASS | All 6 fields correct |
| FTT RPT 5 regional display names correct | PASS | All match ticket spec |
| FTT RPT regional upload form labels correct | PASS | All match ticket spec |
| FTT RPT regions: Eastern, London, Midlands, Northern, Southern | PASS | All use `subJurisdictionIds: [24]` |
| FTT RPT important information accordion content | PASS | Contains `[insert office email]` placeholder, rendered correctly via `importantInformationText` pattern |
| FTT RPT fields: Date, Time, Venue, Case Type, Case Ref, Judge(s), Member(s), Hearing Method, Additional Info | PASS | All 9 fields correct |

---

## Overall Assessment

**NEEDS CHANGES**

Two bugs must be fixed before deployment: the SIAC/POAC/PAAC PDF template renders an empty important information section (Critical issue 1), and all three SIAC/POAC/PAAC web templates output the external link as raw markdown text rather than an anchor (Critical issue 2). The SIAC/POAC/PAAC sensitivity level requires product owner confirmation before go-live (Critical issue 3). Group 12 verification tasks must also be completed. The remaining issues are lower priority but should be addressed: remove the unused `postgres-prisma` dependency from all four `package.json` files, and eliminate the inline `<style>` blocks from the templates.
