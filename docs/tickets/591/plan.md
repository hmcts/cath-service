# Technical Plan: COP Daily Cause List (#591)

**List type:** `COP_DAILY_CAUSE_LIST`
**Route:** `GET /cop-daily-cause-list?artefactId=`
**Reference implementation:** `libs/list-types/civil-and-family-daily-cause-list/` (JSON-only cause list, reuses `@hmcts/daily-cause-list-common`).

---

## 1. Technical Approach

The COP Daily Cause List JSON schema shares the exact `courtLists → courtHouse → courtRoom → session → sittings → hearing → case` shape used by `civil-and-family-daily-cause-list`. That module is a **thin** cause-list lib: it re-exports `renderCauseListData` and `CauseListData` types from `@hmcts/daily-cause-list-common`, and only owns its schema, validator, PDF generator, locales, and email summary. We mirror it exactly.

**Key strategy: clone `civil-and-family-daily-cause-list`, not the ticket's proposed layout.** The ticket/spec proposes a `src/pages/` directory with the controller inside the lib. The actual, working codebase convention for this pattern is different and MUST be followed:

- **Lib** (`libs/list-types/cop-daily-cause-list/src/`): config, index barrel, models/types, schemas, validation, rendering (thin re-export), pdf, email-summary, and **locales** (`src/locales/en.ts` + `cy.ts`).
- **Web controller** lives in the app, not the lib: `apps/web/src/pages/(list-types)/cop-daily-cause-list/index.ts` + `cop-daily-cause-list.njk`. Pages are auto-discovered by `createSimpleRouter` in `app.ts`, so no route registration is needed — only the template name string must match the `.njk` filename.

This avoids inventing a `src/pages/` pattern that the app's page discovery does not consume for cause-list modules.

### Architecture decisions

1. **Reuse `renderCauseListData`** from `@hmcts/daily-cause-list-common` via a one-line re-export in `rendering/renderer.ts`. The COP schema matches the common `CauseListData` shape (judiciary at session level with `johKnownAs`/`isPresiding`, cases with `caseNumber`/`caseName`/`caseType`/`reportingRestrictions`), so no bespoke transform is required. **Verify at implementation time** that no COP-specific fields are dropped; if divergence exists, add a thin wrapper.
2. **Reuse `createListTypeHandler` + `createCauseListRender`** from `apps/web/src/pages/(list-types)/list-type-handler.ts` with `checkAccess: true`. This gives the entire 400/404/403/400-invalid/500 flow for free — no bespoke error handling.
3. **Validator** wraps `validateJson(jsonData, schema, "1.0")` from `@hmcts/publication`, matching civil-and-family's `validateCivilFamilyCauseList`.
4. **PDF generator** mirrors `generateCauseListPdf` — `configureNunjucks(__dirname)`, `loadTranslations`, `PDF_BASE_STYLES` (+ optional COP style constant), `generatePdfFromHtml`, `savePdfToStorage`, `createPdfErrorResult` on failure.
5. **Email summary** ports `CopDailyCauseListSummaryData.java` — an ungrouped list, one entry per case, each a flat `{ label, value }[]` for the four fields: Case reference (`caseNumber`), Case details (`caseName`), Case type (`caseType`), Hearing type (`hearing.hearingType`). Simpler than civil-and-family (no applicant/respondent/representative extraction).
6. **JSON-only** — the civil-and-family reference registers no Excel converter. Unless product confirms Excel uploads for COP (open question), **omit `registerConverterByName`**.

---

## 2. Implementation Details

### New lib: `libs/list-types/cop-daily-cause-list/`

```
libs/list-types/cop-daily-cause-list/
├── package.json                # name @hmcts/cop-daily-cause-list; exports "." + "./config"
├── tsconfig.json               # extends ../../../tsconfig.json
└── src/
    ├── config.ts               # moduleRoot, assets, schemaPath (mirror civil-and-family)
    ├── index.ts                # barrel; MUST export validateCopDailyCauseList (CI guard)
    ├── models/
    │   └── types.ts            # re-export CauseListData etc. from @hmcts/daily-cause-list-common;
    │                           # add COP-specific alias/type if needed
    ├── schemas/
    │   └── cop-daily-cause-list.json     # copied VERBATIM from pip-data-management
    ├── validation/
    │   ├── json-validator.ts             # validateCopDailyCauseList()
    │   └── json-validator.test.ts        # real-schema, one it per required field (11 levels)
    ├── rendering/
    │   ├── renderer.ts                    # export { renderCauseListData } from "@hmcts/daily-cause-list-common"
    │   └── renderer.test.ts               # header/openJustice/listData transform assertions
    ├── locales/
    │   ├── en.ts                          # English page content
    │   └── cy.ts                          # Welsh page content (key-parity with en)
    ├── pdf/
    │   ├── pdf-generator.ts               # generateCopDailyCauseListPdf()
    │   ├── pdf-generator.test.ts
    │   └── pdf-template.njk
    └── email-summary/
        ├── summary-builder.ts             # extractCaseSummary() — 4 COP fields, ungrouped
        └── summary-builder.test.ts
```

**`package.json`** — copy civil-and-family's exactly, renaming to `@hmcts/cop-daily-cause-list`. Keep `build` = `tsc && yarn build:nunjucks && yarn build:pdf-templates`, plus `build:nunjucks` (copy `*.njk`) and `build:pdf-templates` (`mkdir -p dist/pdf && cp src/pdf/*.njk dist/pdf/`). Deps: `@hmcts/daily-cause-list-common`, `@hmcts/pdf-generation`, `@hmcts/postgres-prisma` (workspace:*), `luxon`, `nunjucks`. `exports`: `"."` and `"./config"`.

**`config.ts`**:
```ts
export const moduleRoot = __dirname;
export const assets = path.join(__dirname, "../assets/");
export const schemaPath = path.join(__dirname, "schemas/cop-daily-cause-list.json");
```

**`index.ts`** (barrel — the `validate*` export is mandatory for the CI guard):
```ts
export type { ValidationResult } from "@hmcts/publication";
export * from "./email-summary/summary-builder.js";
export { cy as copDailyCauseListCy } from "./locales/cy.js";
export { en as copDailyCauseListEn } from "./locales/en.js";
export * from "./models/types.js";
export * from "./pdf/pdf-generator.js";
export * from "./rendering/renderer.js";
export { validateCopDailyCauseList } from "./validation/json-validator.js";
```

**`validation/json-validator.ts`**:
```ts
import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/cop-daily-cause-list.json" with { type: "json" };

export function validateCopDailyCauseList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
```

### Web page controller: `apps/web/src/pages/(list-types)/cop-daily-cause-list/`

```
index.ts                    # GET = createListTypeHandler<CauseListData>({...})
cop-daily-cause-list.njk    # template (name string must equal filename stem)
index.test.ts               # controller unit tests
cop-daily-cause-list.njk.test.ts  # template render tests (Cheerio)
en.ts / cy.ts               # import & re-export from lib, OR import lib locales directly
```

**`index.ts`** (mirror civil-and-family exactly):
```ts
import { copDailyCauseListEn as en, copDailyCauseListCy as cy,
         validateCopDailyCauseList } from "@hmcts/cop-daily-cause-list";
import { renderCauseListData, type CauseListData } from "@hmcts/daily-cause-list-common";
import { createCauseListRender, createListTypeHandler } from "../list-type-handler.js";

export const GET = createListTypeHandler<CauseListData>({
  en, cy,
  validate: validateCopDailyCauseList,
  logPrefix: "cop-daily-cause-list",
  checkAccess: true,
  render: createCauseListRender(renderCauseListData, "cop-daily-cause-list", en, cy)
});
```

### Template `cop-daily-cause-list.njk`

Copy civil-and-family's `.njk` as the base and adapt: page heading (`{{ t.title }} {{ header.locationName }}`), FaCT link, venue address, `List for` / `Last updated`, Important information `<details>` accordion carrying the **full Open Justice statement** (section 7 of the spec), conditional Special Category Data warning, search input (`#case-search-input`), `govuk-accordion` per court room showing `Court Room, Before: <judiciary>`, then the **8-column hearings table** (Start time, Case ref, Case name, Case type, Hearing type, Time estimate, Mode of hearing, Reporting restriction), and `Data source` footer.

### Locale content (`libs/.../src/locales/en.ts` + `cy.ts`)

Populate all keys from the ticket's EN/CY tables **plus** every additional key the shared handler/template requires (mirror civil-and-family `en.ts`): `pageTitle`, `factLinkText`, `factLinkUrl`, `factAdditionalText`, `listFor`, `beforeJudge`, `searchCases`, the Open-Justice keys (`openJusticeTitle`, `openJusticeIntro`, `openJusticeContact` — a `(venueName, email, phone) => string` fn, `openJusticeDecision`, `openJusticePrivate`, `openJusticeMoreInfo`, `openJusticeLink`, `openJusticeLinkText`), `cautionNote`, `cautionReporting`, `errorTitle`, `errorMessage`, `error403Title`, `error403Message`. `cy` MUST match `en` key-for-key (`Object.keys(en).sort()` === `Object.keys(cy).sort()`). Use canonical Welsh from the ticket where given; wrap the rest in `[WELSH TRANSLATION REQUIRED: "..."]` markers for the translation pass.

### PDF registry

In `libs/publication/src/processing/service.ts`:
- Add import: `import { type CauseListData, generateCopDailyCauseListPdf } from "@hmcts/cop-daily-cause-list";` (avoid clashing with the existing `CauseListData` import from civil-and-family — import the type only once or alias).
- Add registry entry keyed by name:
```ts
COP_DAILY_CAUSE_LIST: (p) => generateCopDailyCauseListPdf({ ...p, jsonData: p.jsonData as CauseListData }),
```

### Registration wiring

- **Root `tsconfig.json`** `compilerOptions.paths`: add `"@hmcts/cop-daily-cause-list": ["libs/list-types/cop-daily-cause-list/src"]`. Add a `/config` entry only if TS fails to resolve the subpath.
- **`apps/web/src/app.ts`**: `import { moduleRoot as copCauseListModuleRoot } from "@hmcts/cop-daily-cause-list/config";` and add `copCauseListModuleRoot,` to the `modulePaths` array (for Nunjucks template + asset resolution). No route entry needed — page auto-discovered.
- **`apps/web/package.json`**: add `"@hmcts/cop-daily-cause-list": "workspace:*"` to dependencies.
- **Vite**: no per-module change needed — `apps/web/vite.build.ts` globs page templates (`src/pages/**/*.{njk,html}`) automatically. Placing the `.njk` next to the controller is sufficient.

### Excel converter

**Omit** unless product confirms COP accepts Excel uploads (open question 3). The civil-and-family reference is JSON-only and registers no converter.

---

## 3. Error Handling & Edge Cases

All handled by `createListTypeHandler` (no bespoke code):

| Condition | HTTP | Template | Source |
|-----------|------|----------|--------|
| `artefactId` missing | 400 | `errors/common` | `t.errorTitle` / `t.errorMessage` |
| Artefact not found | 404 | `errors/common` | `t.errorTitle` / `t.errorMessage` |
| Blob JSON not found | 404 | `errors/common` | `t.errorTitle` / `t.errorMessage` |
| No access (`checkAccess`) | 403 | `errors/403` | `t.error403Title` / `t.error403Message` |
| Schema validation failed | 400 | `errors/common` | `t.errorTitle` / `t.errorMessage` |
| Unexpected error | 500 | `errors/common` | `t.errorTitle` / `t.errorMessage` |

Edge cases: empty `courtLists` (renders "No hearings"), missing optional fields (`caseName`, `caseType`, `caseSequenceIndicator`, `reportingRestrictions`, `judiciary`, `channel`) must render gracefully; HTML-tag prevention regexes in the schema must be preserved verbatim (do not strip); special-category-data warning conditional both ways in HTML and PDF.

---

## 4. Acceptance Criteria Mapping

| Criterion | How satisfied | Verification |
|-----------|---------------|--------------|
| Route `GET /cop-daily-cause-list?artefactId=` | Page auto-discovered from `apps/web/src/pages/(list-types)/cop-daily-cause-list/` | E2E + controller test |
| Venue name/address, content date, last updated | `renderCauseListData` header output | Renderer + template tests |
| Court rooms in accordion, judiciary per section | `govuk-accordion` + `formattedJudiciaries` | Template test (accordion section per court room) |
| 8-column hearings table | Template table markup | `njk.test.ts` asserts 8 `<th scope="col">` |
| Special category data warning | Conditional `cautionNote`/`cautionReporting` block | Template test present/absent |
| Open Justice collapsible section | `<details>` with full statement | Template test |
| Case search input | `#case-search-input` + client filter (progressive enhancement) | Template test |
| Data source at bottom | `PROVENANCE_LABELS[provenance]` via `createCauseListRender` | Renderer/controller test |
| 400 missing artefactId / 404 not found / 403 no access / 400 invalid JSON | `createListTypeHandler` flow | Controller tests (one per branch) |
| PDF from `pdf-template.njk`, saved, incl. data source + SCD warning, correct language | `generateCopDailyCauseListPdf` | PDF generator tests |
| Email summary: 4 fields per case, ungrouped | `extractCaseSummary` | Summary builder tests |
| Welsh via `?lng=cy`, PDF in correct language | `cy` locale + locale-aware PDF | Template (cy) + PDF locale tests |
| Registration (tsconfig, app.ts, package.json, PDF registry) | Wiring changes above | `yarn test` + build |
| CI guard (schema needs `validate*` export) | `index.ts` exports `validateCopDailyCauseList` | `libs/list-types/common` guard test |

---

## 5. Testing

- **`json-validator.test.ts`** — real schema, no mocks. Fully-hydrated `VALID_DATA` satisfying all 11 required levels; one `it` per required field per level (`document.publicationDate`, `venue.venueName`, `venue.venueContact`, `venueContact.venueEmail`, `venueContact.venueTelephone`, `courtLists[].courtHouse`, `courtHouse.courtHouseName`, `courtHouse.courtRoom`, `courtRoom[].courtRoomName`, `courtRoom[].session`, `session[].sittings`, `sittings[].sittingStart`, `sittings[].sittingEnd`, `sittings[].hearing`, `hearing[].case`, `case[].caseNumber`); plus one HTML-tag-pattern rejection. Deep-clone with `JSON.parse(JSON.stringify(VALID_DATA))`.
- **`renderer.test.ts`** — header/openJustice/listData shape; time/duration formatting; judiciary formatting; empty court list.
- **`index.test.ts`** (controller) — renders with `en`/`cy`/`t`; 400/404/403/400-invalid branches.
- **`summary-builder.test.ts`** — 4 fields per case; multiple cases across sittings/hearings aggregated ungrouped; empty list → empty.
- **`pdf-generator.test.ts`** — PDF generated; data source + SCD warning present where applicable; locale selection; save-to-storage failure surfaced via `createPdfErrorResult`.
- **`cop-daily-cause-list.njk.test.ts`** — 8 table headers; accordion per court room with judiciary; Welsh headings under `cy`; SCD warning both ways; `Object.keys(en)` parity with `cy`. Use `createTestEnvironment` + `render` from `@hmcts/test-support`.
- **E2E (`@nightly`)** — single journey: load list, assert headings/table, toggle `?lng=cy`, axe-core inline, verify data source + Open Justice.

---

## CLARIFICATIONS NEEDED

1. **Column set / labels.** The ticket lists 7 data fields in the AC ("Start Time, Case Ref, Case Details, Case Type, Hearing Type, Time Estimate and Hearing Channel") but 8 columns in the Hearings-table section (adds "Reporting restriction", uses "Case name"). `hearingChannel` label is "Mode of hearing" (issue content) vs "Hearing Channel" (pip-frontend). **Plan assumes the 8-column set and "Mode of hearing".** Confirm definitive set + label.
2. **Open Justice contact details.** "Belfast Laganside Court", `a@b.com`, `+44 1234 1234 1234` look like placeholders — and Belfast (NI) contradicts the England & Wales jurisdiction in the metadata. Are these static, or dynamically sourced from `venue`/`venueContact` (as civil-and-family does via `openJusticeContact(venueName, email, phone)`)? **Plan assumes dynamic population from the artefact venue, falling back to the static statement.**
3. **Excel converter.** Does COP ingest Excel uploads? **Plan assumes JSON-only and omits `registerConverterByName`.**
4. **Module layout.** The ticket proposes the controller inside the lib (`src/pages/`), but the working codebase convention (civil-and-family) puts it in `apps/web/src/pages/(list-types)/` with locales in `src/locales/`. **Plan follows the working convention.** Confirm this is acceptable.
5. **Renderer reuse.** Plan assumes the COP schema matches the common `CauseListData` shape so `renderCauseListData` is reused unchanged. Verify no COP-specific fields are dropped during implementation; add a thin wrapper if they are.
