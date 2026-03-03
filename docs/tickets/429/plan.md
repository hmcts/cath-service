# Technical Plan: Issue #429 — GRC, WPAFCC & UTIAC Non-Strategic List Types

## 1. Technical Approach

Five new list-type modules will be added to `libs/list-types/`, each following the established pattern of `libs/list-types/care-standards-tribunal-weekly-hearing-list/` (the CST module). Every module is self-contained and exports configuration through a `/config` path entry-point and business logic through the root path entry-point.

The two weekly lists (GRC id:24, WPAFCC id:25) share identical field structures and differ only in names, opening-statement text, and converter registration IDs. The three daily lists (UTIAC SA id:26, UTIAC JR London id:27, UTIAC JR Leeds id:28) each have a distinct field schema and opening-statement text.

The implementation touches five layers:

1. **Common data** — `libs/list-types/common/src/mock-list-types.ts` receives five new entries (IDs 24–28).
2. **Per-module library** — one new `libs/list-types/<name>/` directory per list type, containing every file described in Section 3.
3. **Root TypeScript paths** — `tsconfig.json` gains five new path aliases.
4. **Web application registration** — `apps/web/src/app.ts` imports `moduleRoot` and `pageRoutes` from each new module and registers them alongside the existing list-type modules.
5. **E2E tests** — one Playwright spec per module, tagged `@nightly`, covering the full page-view journey, Welsh, and accessibility inline.

No database schema changes are required; all data is stored as JSON files via the existing `TEMP_UPLOAD_DIR` / storage mechanism.

---

## 2. Implementation Details

### 2.1 Changes to `libs/list-types/common/src/mock-list-types.ts`

Append five entries to the `mockListTypes` array:

| id | name | englishFriendlyName | welshFriendlyName | provenance | urlPath | isNonStrategic |
|----|------|---------------------|-------------------|------------|---------|----------------|
| 24 | `GRC_WEEKLY_HEARING_LIST` | General Regulatory Chamber Weekly Hearing List | Welsh placeholder | MANUAL_UPLOAD | `grc-weekly-hearing-list` | true |
| 25 | `WPAFCC_WEEKLY_HEARING_LIST` | First-tier Tribunal (War Pensions and Armed Forces Compensation) Weekly Hearing List | Welsh placeholder | MANUAL_UPLOAD | `wpafcc-weekly-hearing-list` | true |
| 26 | `UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST` | Upper Tribunal (Immigration and Asylum) Chamber Statutory Appeal Daily Hearing List | Welsh placeholder | MANUAL_UPLOAD | `utiac-statutory-appeal-daily-hearing-list` | true |
| 27 | `UTIAC_JR_LONDON_DAILY_HEARING_LIST` | Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: London Daily Hearing List | Welsh placeholder | MANUAL_UPLOAD | `utiac-jr-london-daily-hearing-list` | true |
| 28 | `UTIAC_JR_LEEDS_DAILY_HEARING_LIST` | Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Leeds Daily Hearing List | Welsh placeholder | MANUAL_UPLOAD | `utiac-jr-leeds-daily-hearing-list` | true |

The `welshFriendlyName` values use `"Welsh placeholder"` because confirmed Welsh translations for the new tribunal names are not yet available.

### 2.2 Root `tsconfig.json` path additions

```json
"@hmcts/grc-weekly-hearing-list": ["libs/list-types/grc-weekly-hearing-list/src"],
"@hmcts/wpafcc-weekly-hearing-list": ["libs/list-types/wpafcc-weekly-hearing-list/src"],
"@hmcts/utiac-statutory-appeal-daily-hearing-list": ["libs/list-types/utiac-statutory-appeal-daily-hearing-list/src"],
"@hmcts/utiac-jr-london-daily-hearing-list": ["libs/list-types/utiac-jr-london-daily-hearing-list/src"],
"@hmcts/utiac-jr-leeds-daily-hearing-list": ["libs/list-types/utiac-jr-leeds-daily-hearing-list/src"]
```

No `/config` sub-path alias is needed in `tsconfig.json`; the existing pattern (other modules) only registers the root path there.

### 2.3 `apps/web/src/app.ts` registration

For each new module, add an import pair at the top of the file alongside the existing list-type imports:

```typescript
import {
  moduleRoot as grcModuleRoot,
  pageRoutes as grcRoutes
} from "@hmcts/grc-weekly-hearing-list/config";
// ... repeat for wpafcc, utiacSa, utiacJrLondon, utiacJrLeeds
```

Add each `moduleRoot` to the `modulePaths` array so Nunjucks can resolve the module's templates:

```typescript
const modulePaths = [
  // ... existing entries ...
  grcModuleRoot,
  wpafccModuleRoot,
  utiacSaModuleRoot,
  utiacJrLondonModuleRoot,
  utiacJrLeedsModuleRoot
];
```

Register each router in the "list type routes" block:

```typescript
app.use(await createSimpleRouter(grcRoutes));
app.use(await createSimpleRouter(wpafccRoutes));
app.use(await createSimpleRouter(utiacSaRoutes));
app.use(await createSimpleRouter(utiacJrLondonRoutes));
app.use(await createSimpleRouter(utiacJrLeedsRoutes));
```

### 2.4 Module naming conventions (upload form vs front-end summary)

The ticket specifies different names for the upload form vs the public-facing summary. The upload-form names are driven by `englishFriendlyName` on the list type record (which uses short names). The full names in `englishFriendlyName` in `mock-list-types.ts` are the front-end summary names. No additional configuration is needed beyond the `mockListTypes` entry.

---

## 3. Per-Module File Inventory

All five modules share an identical top-level layout. The table below covers every file. Field-specific content differs per module as described in Section 2.

### Module structure (all five)

```
libs/list-types/<module-name>/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts
    ├── index.ts
    ├── models/
    │   └── types.ts
    ├── conversion/
    │   └── <abbrev>-config.ts
    ├── schemas/
    │   └── <module-name>.json
    ├── rendering/
    │   └── renderer.ts
    ├── email-summary/
    │   └── summary-builder.ts
    ├── pdf/
    │   ├── pdf-generator.ts
    │   └── pdf-template.njk
    └── pages/
        ├── index.ts
        ├── <module-name>.njk
        ├── en.ts
        └── cy.ts
```

### File descriptions

| File | Purpose |
|------|---------|
| `package.json` | Module metadata, workspace dependencies, build scripts (`build:nunjucks`, `build:schemas`), `exports` map for `.` and `./config` |
| `tsconfig.json` | Extends root tsconfig; sets `outDir: ./dist`, `rootDir: ./src`; excludes test files and `src/assets/` |
| `src/config.ts` | Exports `moduleRoot`, `pageRoutes` (with URL prefix matching the list's `urlPath`) |
| `src/index.ts` | Side-effect import of conversion config to register the converter; re-exports from `email-summary`, `models/types`, `pdf-generator`, `rendering/renderer` |
| `src/models/types.ts` | TypeScript interfaces for a single hearing record and the full list (array type alias) |
| `src/conversion/<abbrev>-config.ts` | `ExcelConverterConfig` constant with all field definitions and validators; calls `registerConverter(<id>, createConverter(...))` |
| `src/schemas/<module-name>.json` | JSON Schema (draft-07, array of objects) with all fields, `required` list, and `no-html` patterns for string fields |
| `src/rendering/renderer.ts` | `renderData` function; maps raw JSON array to display-ready structure; formats dates and times via `@hmcts/list-types-common` utilities; returns `{ header, hearings }` |
| `src/email-summary/summary-builder.ts` | `extractCaseSummary` function; maps each hearing to `[Date, Time, CaseReferenceNumber/AppealReferenceNumber]` tuples for the email notification |
| `src/pdf/pdf-generator.ts` | `generate<Name>Pdf` function; calls `renderData`, loads translations, renders `pdf-template.njk` via Nunjucks, calls `generatePdfFromHtml`, saves via `savePdfToStorage` |
| `src/pdf/pdf-template.njk` | Standalone HTML/Nunjucks PDF template; mirrors the web template's data but with inline CSS from `PDF_BASE_STYLES` |
| `src/pages/index.ts` | Express GET handler; validates `artefactId`, reads JSON from `TEMP_UPLOAD_DIR`, validates against schema, calls `renderData`, renders the page template |
| `src/pages/<module-name>.njk` | Nunjucks page template extending `layouts/base-template.njk`; uses `{% block page_content %}` |
| `src/pages/en.ts` | English content including `pageTitle`, column headers, important-information accordion text (including hyperlinks), search labels, caution notes, `provenanceLabels` |
| `src/pages/cy.ts` | Welsh content with identical structure to `en.ts`; untranslated strings use `"Welsh placeholder"` |

### Field schema per module

#### GRC (id:24) and WPAFCC (id:25) — identical schema

Required fields: `date` (DD/MM/YYYY), `hearingTime` (time format), `caseReferenceNumber`, `caseName`, `judges`, `modeOfHearing`, `venue`

Optional fields: `members`, `additionalInformation`

No-html pattern applied to all string fields except `date` and `hearingTime`.

#### UTIAC SA (id:26)

Required fields: `hearingTime`, `appellant`, `appealReferenceNumber`, `judges`, `hearingType`, `location`

Optional fields: `representative`, `additionalInformation`

Note: The `date` field is derived from the artefact's `displayFrom` rather than a spreadsheet column (see Open Questions).

#### UTIAC JR London (id:27)

Required fields: `hearingTime`, `caseTitle`, `caseReferenceNumber`, `judges`, `hearingType`, `location`

Optional fields: `representative`, `additionalInformation`

#### UTIAC JR Leeds (id:28)

Required fields: `venue`, `judges`, `hearingTime`, `caseReferenceNumber`, `caseTitle`, `hearingType`

Optional fields: `additionalInformation`

### Important-information accordion content per module

All modules display this content via the `importantInformation*` keys in `en.ts`/`cy.ts`. The "Observe a court..." link is shared across all five.

**GRC**: Two text paragraphs (parties/email paragraph, recording-offence paragraph) plus two GOV.UK links (telephone/video hearing guidance; observe a hearing).

**WPAFCC**: One text paragraph (observers/media email armedforces.listing@justice.gov.uk) plus one GOV.UK link (observe a hearing).

**UTIAC JR London & Leeds**: One text paragraph ("subject to change until 4:30pm...") plus one GOV.UK link (observe a hearing). These two modules share identical accordion content.

**UTIAC SA**: Two text paragraphs (5pm update schedule; email uppertribunallistingteam@justice.gov.uk) plus one GOV.UK link (observe a hearing).

### Email summary fields

All five modules extract three fields per row:

| Module | Field 1 | Field 2 | Field 3 |
|--------|---------|---------|---------|
| GRC | Date | Time (`hearingTime`) | Case Reference Number (`caseReferenceNumber`) |
| WPAFCC | Date | Time (`hearingTime`) | Case Reference Number (`caseReferenceNumber`) |
| UTIAC SA | Date (from `displayFrom`) | Time (`hearingTime`) | Appeal Reference Number (`appealReferenceNumber`) |
| UTIAC JR London | Date (from `displayFrom`) | Time (`hearingTime`) | Case Reference Number (`caseReferenceNumber`) |
| UTIAC JR Leeds | Date (from `displayFrom`) | Time (`hearingTime`) | Case Reference Number (`caseReferenceNumber`) |

The GRC and WPAFCC modules include a `date` column in the spreadsheet, so `extractCaseSummary` reads `hearing.date`. For the three UTIAC modules, the date comes from the artefact's `displayFrom`; the summary builder receives the rendered date as a parameter or derives it from the rendered hearings data.

---

## 4. Error Handling & Validation

### Converter layer (Excel to JSON)

- Missing required fields: `createConverter` / `ExcelConverterConfig` throws a structured error per row; the upload handler catches this and renders a validation error page with the row-level messages.
- HTML in text fields: `validateNoHtmlTags` throws immediately on detection; the error message names the field and row.
- Invalid date format: `validateDateFormat(DD_MM_YYYY_PATTERN, ...)` throws with the expected format shown.
- Invalid time format: `validateTimeFormatSimple` throws with the expected format (e.g., `9:30am`).
- Empty sheet / fewer than `minRows: 1`: the converter framework rejects the upload before field validation runs.

### Schema validation (page render)

- The page controller calls `createJsonValidator(schemaPath)` and checks `validationResult.isValid`.
- On failure: logs `validationResult.errors` and renders `errors/common` with a 400 status.
- Missing `artefactId` query parameter: renders `errors/common` with a 400 status.
- Artefact not found in the publication service: renders `errors/common` with a 404 status.
- JSON file unreadable from `TEMP_UPLOAD_DIR`: logs the error and renders `errors/common` with a 404 status.
- Unhandled exceptions from `renderData` or `getArtefactById`: caught by the outer `try/catch`; renders `errors/common` with a 500 status.

### PDF generation

- `generatePdfFromHtml` failure: `createPdfErrorResult(error)` returns `{ success: false, error: string }` — caller logs and surfaces the error.
- All errors are handled by the shared `try/catch` pattern in the generator function; no exceptions propagate to the route handler.

---

## 5. Acceptance Criteria Mapping

| Acceptance Criterion | Implementation |
|---------------------|----------------|
| Validation schemas created for each hearing list | JSON Schema files in `src/schemas/<name>.json` per module |
| Error handling for validation schemas | Converter validators throw per-row errors; page controller catches schema and runtime errors; all render `errors/common` |
| Valid publications saved via current method | `savePdfToStorage` and existing `TEMP_UPLOAD_DIR` JSON mechanism — unchanged |
| List types classified; user groups decided | `isNonStrategic: true`, `provenance: "MANUAL_UPLOAD"` in `mockListTypes`; user-group access level is an open question (see Section 6) |
| New PDF template for each hearing list | `src/pdf/pdf-template.njk` per module with fields matching each list's schema |
| Unified email summary format (Date, Time, Case Reference) | `extractCaseSummary` in `src/email-summary/summary-builder.ts` per module returns exactly these three fields |
| New style guide (rendering) for each list | `src/pages/<name>.njk` and `src/rendering/renderer.ts` per module |
| List manipulation for style guide | Existing `case-search-input` JavaScript from `@hmcts/list-types-common` is included via the shared assets; no additional sorting or grouping unless confirmed (see Section 6) |
| GRC: weekly, short name on upload form | `id:24`, `name: GRC_WEEKLY_HEARING_LIST`, `englishFriendlyName` is the full name (summary); upload-form short name handled by the upload UI using a separate display label |
| WPAFCC: weekly, short name on upload form | `id:25`, same pattern as GRC |
| UTIAC SA: daily, short name on upload form | `id:26`, same pattern |
| UTIAC JR London: daily | `id:27` |
| UTIAC JR Leeds: daily | `id:28` |
| Regions set correctly | `mockListTypes` entries do not currently carry a `region` field; region is stored in the artefact metadata. No code change required in the library modules; the upload form / artefact creation sets the region. |
| Opening statements correct | `importantInformation*` keys in `en.ts`/`cy.ts` per module, rendered in the `<details>` accordion on the page and in the PDF template |

---

## 6. Open Questions / Clarifications Needed

1. **User group access level**: The acceptance criteria state "user groups are decided based on authorised access to the list types (Public, Private, etc)". This is not resolved in the ticket. Confirm whether each of the five lists is Public or restricted before the upload form is configured.

2. **Date field for UTIAC daily lists**: The UTIAC SA, JR London, and JR Leeds spreadsheets do not include a `date` column. The email-summary spec requires Date as the first field. Confirm whether the artefact's `displayFrom` date should be used as the "Date" value in the email summary, or whether a date column should be added to the spreadsheets.

3. **List manipulation in style guide**: Does "list manipulation" refer only to the existing `case-search-input` text-filter JavaScript (already provided by `@hmcts/list-types-common`), or is additional sorting or grouping by date/venue required for any of the five lists?

4. **Welsh translations**: All five modules have Welsh content marked as `"Welsh placeholder"`. Confirmed Welsh translations for tribunal names, column headers, opening statements, and page titles are needed before the lists go live.

5. **Opening-statement placement for GRC**: The ticket lists two separate paragraphs plus two separate links for GRC. Confirm the intended visual order: (1) parties/email paragraph, (2) recording-offence paragraph, (3) telephone/video link, (4) observe-a-hearing link — or a different arrangement.

6. **UTIAC SA opening statement attribution**: The ticket comment notes "Assumption: the fourth opening statement ('We update this list by 5pm...') is intended for UTIAC Statutory Appeal Daily Hearing List." This should be confirmed with the tribunal team.
