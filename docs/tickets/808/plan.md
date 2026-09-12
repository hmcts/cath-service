# Technical Plan — #808 Insolvency & Companies Court (ChD) Daily Cause List

New non-strategic, RCJ-standard 7-column list type: Excel upload → JSON conversion → validated artefact → bilingual rendered web page + downloadable PDF (plus the original uploaded flat file).

## 1. Technical Approach

### High-level strategy
This list type is a direct sibling of the existing `companies-winding-up-chd-daily-cause-list`. Both belong to the **Business and Property Courts (Rolls Building)**, Civil jurisdiction, Royal Courts of Justice Group region, and — critically — both use the **exact field contract issue #808 specifies**.

The shared module `@hmcts/chd-kb-common` already implements that contract:

```ts
// libs/list-types/chd-kb-common/src/models/types.ts
interface ChdKbHearing {
  judge: string; time: string; venue: string; type: string;
  caseNumber: string; caseName: string; additionalInformation: string;
}
```

It also provides:
- `CHD_KB_EXCEL_CONFIG` — the dedicated Excel converter config with headers `Judge, Time, Venue, Type, Case Number, Case Name, Additional Information` (this is **NOT** `RCJ_EXCEL_CONFIG`; it uses the issue's keys and `validateTimeFormatSimple`).
- `chd-kb-common.json` — the JSON schema with the exact 7 required fields.
- `validateChdKbListType` — the AJV validator wrapper.
- `renderChdKbHearingList` — the rendering/normalisation core.
- `extractCaseSummary` / `formatCaseSummaryForEmail` — email summary machinery.

**Decision: model the new list type on `companies-winding-up-chd-daily-cause-list` and reuse `@hmcts/chd-kb-common` for schema/types/validation/rendering/email-summary.** This honours the issue's exact JSON contract (`type`, `caseName` — not RCJ's `hearingType`/`caseDetails`) with zero field-mapping divergence and no duplicated schema. It also satisfies the instruction that a dedicated converter config and schema (distinct from `RCJ_EXCEL_CONFIG`) are used: `CHD_KB_EXCEL_CONFIG` is exactly that dedicated config.

The reference modules named in the ticket (`administrative-court-daily-cause-list`, `rcj-standard-daily-cause-list`) use `RCJ_EXCEL_CONFIG` with `hearingType`/`caseDetails`. They are the correct *structural* template (module layout, handler wiring, PDF/notification registration) but their **field config must not be reused** — `chd-kb-common` supplies the correct fields.

### Architecture decisions
- **New thin lib** `libs/list-types/insolvency-and-companies-court-chd-daily-cause-list/` following the `companies-winding-up-chd` layout: list-specific locales (title, venue/address, important-information), a PDF generator, a renderer wrapper, and a converter-registration module. Everything field-shaped is delegated to `@hmcts/chd-kb-common` (DRY).
- **Single-list handler** via `createSimpleListTypeHandler` with a `guardArtefact` that checks `artefact.listTypeName === "INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST"` (name-keyed, never numeric id — per CLAUDE.md List Type rules).
- **Converter registered by name** (`registerConverterByName`) — never by numeric id.
- **PDF generator registered by name** in `PDF_GENERATOR_REGISTRY`.
- **List-type-name-driven everywhere.** No numeric `listTypeId` guards, comments, or fixtures.

### Key technical considerations
- The dynamic validator dispatcher (`libs/list-types/common/src/validation/list-type-validator.ts`) converts the DB list-type name to kebab-case, imports `@hmcts/<kebab-name>`, and calls the first exported `validate*` function. `INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST` → `@hmcts/insolvency-and-companies-court-chd-daily-cause-list` (no `PACKAGE_ALIASES` entry needed). The new lib must therefore re-export a `validate*` function (delegating to `validateChdKbListType`).
- The CI guard test (`libs/list-types/common/src/validation/guard.test.ts`) only fires for packages that **ship their own** `src/schemas/*.json`. Because this lib reuses `chd-kb-common`'s schema and ships none, the guard does not require a local validator/test — matching the `companies-winding-up-chd` precedent.
- Converter side-effect registration happens because `apps/web/src/pages/(admin)/non-strategic-upload/index.ts` does a top-of-file `import "@hmcts/<lib>"`. The new lib's `index.ts` must import its converter-config module for the side effect (as companies-winding-up does).
- Reference data is seeded from `list-type-data.ts` / `location-data.ts` — do NOT hand-write SQL.

## 2. Implementation Details

### TEMPLATE SOURCE (recorded verbatim)
> migrate from pip-frontend insolvency-and-companies-court-chd-daily-cause-list

### List-type identity
- **Name constant (DB `list_type.name`, `@unique`):** `INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST`
- **urlPath / web route / page dir / package suffix:** `insolvency-and-companies-court-chd-daily-cause-list`
- **Package:** `@hmcts/insolvency-and-companies-court-chd-daily-cause-list`

### New lib: `libs/list-types/insolvency-and-companies-court-chd-daily-cause-list/`
```
package.json                 # copy companies-winding-up; deps: @hmcts/chd-kb-common,
                             #   @hmcts/list-types-common, @hmcts/pdf-generation,
                             #   @hmcts/postgres-prisma, nunjucks; build:nunjucks for pdf-template
tsconfig.json                # copy sibling
src/
  config.ts                  # moduleRoot, assets (no schemaPath — schema lives in chd-kb-common)
  index.ts                   # side-effect import of conversion config;
                             #   re-export ChdKb types as InsolvencyCompaniesCourt* aliases;
                             #   re-export validateChdKbListType as
                             #     validateInsolvencyAndCompaniesCourtChdDailyCauseList;
                             #   re-export extractCaseSummary / formatCaseSummaryForEmail /
                             #     SPECIAL_CATEGORY_DATA_WARNING from chd-kb-common;
                             #   export locales (en/cy), pdf generator, renderer
  conversion/
    insolvency-and-companies-court-chd-daily-cause-list-config.ts
                             # export CONFIG = CHD_KB_EXCEL_CONFIG;
                             #   registerConverterByName("INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST", createConverter(CONFIG))
    *.test.ts
  locales/
    en.ts  cy.ts             # pageTitle, fact link, venueName/address, importantInformation*,
                             #   searchCases*, tableHeaders (judge/time/venue/type/caseNumber/
                             #   caseName/additionalInformation), dataSource, listFor, lastUpdated,
                             #   at, cautionNote, cautionReporting, provenanceLabels.
                             #   EN/CY keys MUST be identical sets. Court/venue strings from locale
                             #   files only (never hardcoded in controller).
  rendering/
    renderer.ts              # renderInsolvencyAndCompaniesCourtChdDailyCauseList → delegates to
                             #   renderChdKbHearingList with listTitle from locale
    renderer.test.ts
  pdf/
    pdf-generator.ts         # generateInsolvencyAndCompaniesCourtChdDailyCauseListPdf
                             #   (copy companies-winding-up generator)
    pdf-template.njk         # 7-column PDF table
    pdf-generator.test.ts
```

### New web page: `apps/web/src/pages/(list-types)/insolvency-and-companies-court-chd-daily-cause-list/`
```
index.ts                     # createSimpleListTypeHandler<...HearingList> with SUPPORTED_LIST_TYPE
                             #   guard on artefact.listTypeName; renders the njk with header/hearings/
                             #   dataSource via resolveDataSource
index.njk                    # extends layouts/base-template.njk; page_content block;
                             #   7-column govukTable, search box, govukDetails important info,
                             #   data source + back-to-top (copy companies-winding-up njk)
index.test.ts                # controller tests (GET happy path, missing artefactId, wrong list type)
index.njk.test.ts            # template tests: 7 headers in order, row cells, Welsh headings,
                             #   EN/CY key parity, data-source rendering
```

### Reference-data change (single source of truth — no SQL)
Add one entry to `libs/list-types/common/src/list-type-data.ts`:
```ts
{
  name: "INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST",
  englishFriendlyName: "Insolvency & Companies Court (ChD) Daily Cause List",
  welshFriendlyName: "[WELSH TRANSLATION REQUIRED]",
  shortenedFriendlyName: "Insolvency & Companies Court (ChD) Daily Cause List",
  provenance: "CFT_IDAM",
  urlPath: "insolvency-and-companies-court-chd-daily-cause-list",
  isNonStrategic: true,
  defaultSensitivity: "Public",
  subJurisdictionIds: [10]   // High Court (Civil jurisdiction 1) — same as companies-winding-up
}
```
Then `yarn db:generate` / `yarn db:migrate:dev` and `yarn db:seed` locally.

### Location-data change
**None required.** The court already exists: `locationId 26 "Business and Property Courts Rolls Building"`, `regions: [11]` (Royal Courts of Justice Group), `subJurisdictions: [10]` (High Court under Civil). Subject to confirmation of the canonical court/location the artefact is published against (see clarifications).

### Registration points (wiring)
1. **Root `tsconfig.json`** — add `@hmcts/insolvency-and-companies-court-chd-daily-cause-list` and `/config` paths.
2. **`apps/web/src/app.ts`** — import `moduleRoot` from the lib `/config`; add to `modulePaths` for Nunjucks discovery (PDF template + shared views).
3. **`apps/web/src/pages/(admin)/non-strategic-upload/index.ts`** — add top-of-file `import "@hmcts/insolvency-and-companies-court-chd-daily-cause-list";` to register the converter on load.
4. **`libs/publication/src/processing/service.ts`** — import the PDF generator + hearing-list type; add `INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST:` entry to `PDF_GENERATOR_REGISTRY`. Add lib to `libs/publication/package.json` deps.
5. **`libs/notifications/src/notification/notification-service.ts`** — import `extractCaseSummary`/`formatCaseSummaryForEmail`; add `INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST` to the summary-extractor registry. Add lib to `libs/notifications/package.json` deps (only if subscriptions are in scope — see clarifications).

### API endpoints
No new endpoints. Uses the existing non-strategic Excel upload flow (`/non-strategic-upload`) and the auto-discovered public GET route `/insolvency-and-companies-court-chd-daily-cause-list?artefactId=...`. PDF/flat-file downloads use existing publication download routes.

### DB schema changes
None. `list_type` and `location` tables already exist; only a new reference-data row is added (via `list-type-data.ts`).

## 3. Error Handling & Edge Cases
- **Missing `artefactId`** → 400 `errors/common` (handled by `createSimpleListTypeHandler`).
- **Artefact not found / blob missing** → 404 `errors/common`.
- **Wrong list type on the artefact** → `guardArtefact` returns 400 "Invalid List Type".
- **Access denied** (sensitivity vs. user) → 403 `errors/403` via `canAccessPublicationData`.
- **Invalid JSON (schema fails)** → 400 `errors/common`; errors logged with `logPrefix`.
- **Invalid Excel at upload** — converter throws; upload page re-renders with a field error and preserves form state (existing non-strategic-upload behaviour). Covered cases: missing/renamed headers, missing required cell, HTML tags in a cell (`validateNoHtmlTags`), bad time format (`validateTimeFormatSimple`), zero data rows (`minRows: 1`).
- **Empty list (0 hearings after validation)** — template shows `noHearingsMessage` rather than an empty table.
- **Welsh locale** — `?lng=cy` selects `cy` content; all furniture/headers/court strings come from locale files.
- **PDF generation failure** → `createPdfErrorResult`; processing surfaces the failure without publishing a broken artefact.

## 4. Acceptance Criteria Mapping

| Acceptance criterion | How satisfied | Verification |
|---|---|---|
| Created under Business & Property Courts (Rolls Building), Civil jurisdiction, RCJ Group region | `list-type-data.ts` entry `subJurisdictionIds: [10]` (High Court → Civil); location 26 already maps to region 11 + subJurisdiction 10 | Seed locally; confirm it appears under the correct court/jurisdiction/region in the list selection UI |
| Fields in order: Judge, Time, Venue, Type, Case Number, Case Name, Additional Information | `CHD_KB_EXCEL_CONFIG` field order + `chd-kb-common.json` required array | Converter test asserts header order; njk template test asserts the 7 `<th>` in order |
| Published via Excel upload; converted to renderable JSON | Converter registered by name; non-strategic upload import wires it | Upload a valid `.xlsx`; assert artefact JSON matches the contract; E2E happy path |
| Validation schema + style guide created | Reuse `chd-kb-common` schema/validator; new lib locales + njk implement the style guide | Validator unit coverage in `chd-kb-common`; template test for structure/Welsh |
| PDF + Excel downloadable | New PDF generator in `PDF_GENERATOR_REGISTRY`; original flat file retained by publication download | Generate PDF in processing test; manual download check |
| Style guide matches staging reference | Locales + njk migrated from the pip-frontend page (TEMPLATE SOURCE) | Visual comparison against staging reference URL |
| JSON follows the specified format | Types + schema use `judge/time/venue/type/caseNumber/caseName/additionalInformation` exactly | Schema + converter tests; controller renders those keys |
| Bilingual (Welsh) | EN/CY locale files with identical key sets | `Object.keys(en).sort() === Object.keys(cy).sort()`; `?lng=cy` render test |

## 5. Open Questions

### DECIDED

- **Reuse `@hmcts/chd-kb-common` (confirmed).** The new list type reuses the shared `chd-kb-common` schema, types, validator, converter config (`CHD_KB_EXCEL_CONFIG`), renderer and email-summary machinery. This settles the two previously-blocking questions:
  - **Field names** — `chd-kb-common` already implements the issue's exact keys (`judge, time, venue, type, caseNumber, caseName, additionalInformation`), matching the JSON contract in #808. No RCJ `hearingType`/`caseDetails` divergence. No new schema is authored.
  - **`additionalInformation` required.** The shared `chd-kb-common` schema marks `additionalInformation` **required**, so this list type follows suit. The spec comment's "all required except Additional Information" is overridden by the reuse decision — a divergent schema is explicitly not created.
- **Subscriptions / email summaries in scope (confirmed).** This list type registers a summary extractor in `notifications`, exactly like the sibling ChD lists (`COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST`, and PRs #929 `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` / #931 `CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST`). Step 5 of the registration wiring is included: aliased import + `EMAIL_BUILDER_REGISTRY` entry in `libs/notifications/src/notification/notification-service.ts`, plus the `workspace:*` dependency in `libs/notifications/package.json`. Note: #929, #931 and this ticket all edit the same registry object and `package.json`, so expect trivial merge conflicts on whichever lands after the first — each just adds its own block.

### CLARIFICATIONS NEEDED

1. **Time format.** Example mixes `9am` and `10:30pm`. `chd-kb-common` uses `validateTimeFormatSimple` (pattern `^\d{1,2}([:.]\d{2})?\s*[ap]m\s*$`). Confirm am/pm-only is acceptable (no 24-hour / free text).
2. **Location / court.** Confirm the artefact publishes against `Business and Property Courts Rolls Building` (locationId 26) and that `subJurisdictionIds: [10]` (High Court, Civil) is the intended jurisdiction mapping. Confirm the canonical court name displayed.
3. **Important-information / caution text.** Provide exact EN + CY wording for the "Important information" panel and any caution note. Interim: migrate wording from the staging reference; Welsh marked `[WELSH TRANSLATION REQUIRED]`.
4. **Sensitivity.** Assumed `Public` (`defaultSensitivity: "Public"`). Confirm.
5. **List-type name constant.** Assumed `INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST` (→ package `@hmcts/insolvency-and-companies-court-chd-daily-cause-list`, no alias needed). Confirm it matches the staging reference artefact's list-type name.
