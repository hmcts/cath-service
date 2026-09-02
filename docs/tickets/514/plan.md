# Technical Plan: #514 — Magistrates Adult Court List (Crime Portal / Libra)

## 1. Technical Approach

Create a single package `@hmcts/magistrates-adult-court-list` that serves both list type variants:
- `MAGISTRATES_ADULT_COURT_LIST_DAILY` — Magistrates Adult Court List - Daily (id: 57)
- `MAGISTRATES_ADULT_COURT_LIST_FUTURE` — Magistrates Adult Court List - Future (id: 58)

Both variants share an identical schema, renderer, PDF template, and email summary builder. They differ only in their list type name and display title (injected via locale keys). The architecture mirrors `libs/list-types/magistrates-public-list/` exactly.

## 2. File Structure

```
libs/list-types/magistrates-adult-court-list/
├── package.json            # @hmcts/magistrates-adult-court-list
├── tsconfig.json
└── src/
    ├── config.ts           # exports moduleRoot, assets
    ├── index.ts            # barrel exports
    ├── schemas/
    │   └── magistrates-adult-court-list.json
    ├── validation/
    │   ├── json-validator.ts
    │   └── json-validator.test.ts
    ├── rendering/
    │   ├── renderer.ts
    │   └── renderer.test.ts
    ├── pdf/
    │   ├── pdf-generator.ts
    │   └── pdf-template.njk
    ├── email-summary/
    │   ├── summary-builder.ts
    │   └── summary-builder.test.ts
    └── locales/
        ├── en.ts
        └── cy.ts

apps/web/src/pages/(list-types)/
├── magistrates-adult-court-list-daily/
│   ├── index.ts
│   └── index.njk
└── magistrates-adult-court-list-future/
    ├── index.ts
    └── index.njk
```

## 3. Implementation Details

### 3.1 JSON Schema (`src/schemas/magistrates-adult-court-list.json`)

Model on the upstream schema at `pip-data-management`. Draft-07, `$defs`-based. Required per case: Defendant Name, Case Number, Offence Code, Offence Title. Optional/nullable: Date of Birth, Address, Age, Informant, Offence Summary, Block Start. Include HTML-injection patterns (`<`, `>`) in `not/pattern` for string fields, consistent with other CaTH schemas.

### 3.2 Validation (`src/validation/json-validator.ts`)

```typescript
import { validateJson } from "@hmcts/publication";
import schema from "../schemas/magistrates-adult-court-list.json" with { type: "json" };

export function validateMagistratesAdultCourtList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
```

### 3.3 Renderer (`src/rendering/renderer.ts`)

Transforms raw JSON into a display view model:
- Resolve venue/court name (Welsh-aware via `res.locals.lng`).
- Group hearings by **Block Start** and session/courtroom.
- Format dates/times to Europe/London using shared utilities from `@hmcts/list-types-common`.
- Per case: flatten Defendant Name, Date of Birth, Address, Age, Informant, Case Number, Offence Code, Offence Title, Offence Summary.
- Return `{ header, reportingRestrictions, listData }`.

Export: `renderMagistratesAdultCourtList(json, options)` + `MagistratesAdultCourtListData` type.

### 3.4 Locales (`src/locales/en.ts` and `cy.ts`)

English keys: list titles, all field labels (Block Start, Defendant Name, Date of Birth, Address, Age, Informant, Case Number, Offence Code, Offence Title, Offence Summary, Sitting at, Session start, Listing time), reporting restrictions guidance (full text from issue), common labels (Back, Download a copy, etc).

Welsh keys: mirror English structure. Translations from issue:
- Defendant Name → Enw'r Diffynnydd
- Case Number → Rhif yr Achos
- Sitting at → Yn eistedd yn
- Session start → Amser Cychwyn y Sesiwn
- Listing time → Amser rhestru
- Full Welsh reporting restrictions text from issue verbatim.

### 3.5 PDF Generator (`src/pdf/pdf-generator.ts`)

```typescript
export async function generateMagistratesAdultCourtListPdf(params: GeneratePdfParams): Promise<PdfResult> {
  // use shared generatePdfFromHtml() + savePdfToStorage() from @hmcts/pdf-generation
}
```

The `pdf-template.njk` is a standalone inline-styled template (same pattern as `magistrates-public-list/src/pdf/pdf-template.njk`). Displays all ten fields in a table grouped by Block Start.

### 3.6 Email Summary (`src/email-summary/summary-builder.ts`)

```typescript
export function extractCaseSummary(jsonData: unknown): CaseSummary[] {
  // Returns: Defendant Name, Informant, Case Number, Offence Title per case
}
export { formatCaseSummaryForEmail } from "@hmcts/list-types-common";
```

### 3.7 Web Controllers

Both controllers are thin — use `createListTypeHandler` + `createCauseListRender` factory:

```typescript
// apps/web/src/pages/(list-types)/magistrates-adult-court-list-daily/index.ts
import {
  magistratesAdultCourtListCy as cy,
  magistratesAdultCourtListEn as en,
  type MagistratesAdultCourtListData,
  renderMagistratesAdultCourtList,
  validateMagistratesAdultCourtList
} from "@hmcts/magistrates-adult-court-list";
import { createCauseListRender, createListTypeHandler } from "../list-type-handler.js";

export const GET = createListTypeHandler<MagistratesAdultCourtListData>({
  en, cy,
  validate: validateMagistratesAdultCourtList,
  logPrefix: "magistrates-adult-court-list-daily",
  checkAccess: true,
  render: createCauseListRender(renderMagistratesAdultCourtList, "magistrates-adult-court-list-daily", en, cy)
});
```

The Future controller is identical except `logPrefix` and `createCauseListRender` slug use `"magistrates-adult-court-list-future"`.

The `.njk` templates extend the standard list-type layout and render reporting restrictions + session-grouped case tables using GOV.UK Frontend components.

## 4. Central Wiring

| File | Change |
|---|---|
| `libs/location/src/list-type-data.ts` | Add entries with id 57 (DAILY) and id 58 (FUTURE), provenance `CRIME_IDAM`, subJurisdictionIds `[7]` |
| `libs/publication/src/processing/service.ts` | Import `generateMagistratesAdultCourtListPdf`, add both keys to `PDF_GENERATOR_REGISTRY` |
| `libs/notifications/src/notification/notification-service.ts` | Import `extractMagistratesAdultCourtListCaseSummary` + `formatMagistratesAdultCourtListCaseSummaryForEmail`, add both keys to `EMAIL_BUILDER_REGISTRY` |
| `apps/web/src/app.ts` | `import { moduleRoot as magistratesAdultCourtListModuleRoot } from "@hmcts/magistrates-adult-court-list/config"`, add to `modulePaths` |
| `apps/web/package.json` | Add `"@hmcts/magistrates-adult-court-list": "workspace:*"` |
| `libs/publication/package.json` | Add `"@hmcts/magistrates-adult-court-list": "workspace:*"` |
| `libs/notifications/package.json` | Add `"@hmcts/magistrates-adult-court-list": "workspace:*"` |
| Root `tsconfig.json` | Add `"@hmcts/magistrates-adult-court-list": ["libs/list-types/magistrates-adult-court-list/src"]` |

## 5. Testing Approach

**Unit (Vitest, co-located):**
- Validator: accepts valid Daily/Future payloads, rejects payloads missing required fields, rejects HTML injection.
- Renderer: groups by Block Start, formats dates, exposes all ten fields per case.
- Email summary: `extractCaseSummary` returns exactly Defendant Name, Informant, Case Number, Offence Title per case.
- Web controllers: renders with correct `en`, `cy`, `t` locals for both Daily and Future.

**E2E (Playwright — single journey per list, `@nightly`):**
- View Daily list → confirm fields + reporting restrictions → switch to Welsh → run Axe → download PDF.
- Same for Future list.

## 6. Open Questions

1. **Sub-jurisdiction id** — assumed `[7]` (same as MAGISTRATES_PUBLIC_LIST). Confirm before implementation.
2. **Seed ids** — assuming 57 and 58 after current max 56 (MAGISTRATES_STANDARD_LIST). Confirm no collision at implementation time.
3. **JSON payload differences** — assumed Daily and Future payloads are structurally identical. If they differ in required fields, a second schema or conditional validation is needed.
4. **Welsh translations** — gaps remain for: Date of Birth, Address, Age, Offence Code, Offence Title, Offence Summary. These need to be sourced from the pip-frontend Welsh locale file or confirmed by a translator.
