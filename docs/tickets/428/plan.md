# Technical Plan: Issue #428 — Non-strategic list types for SIAC, POAC, PAAC, FTT Tax, FTT LRT and FTT RPT

## 1. Technical Approach

All 10 new list types follow the identical pattern established by `libs/list-types/care-standards-tribunal-weekly-hearing-list`. Each list type becomes an independent workspace package under `libs/list-types/`. The page controller and Nunjucks template live in `apps/web/src/pages/(list-types)/`.

### Reference module: `@hmcts/care-standards-tribunal-weekly-hearing-list`

Every new module replicates this exact file structure:

```
libs/list-types/<module-name>/
  package.json
  tsconfig.json
  src/
    config.ts                         # moduleRoot, assets, schemaPath
    index.ts                          # re-exports: locales, model types, renderer, PDF generator, email summary
    conversion/<abbr>-config.ts       # Excel field config, registerConverter(id), registerConverterByName(name)
    email-summary/summary-builder.ts  # extractCaseSummary
    email-summary/summary-builder.test.ts
    locales/en.ts
    locales/cy.ts
    models/types.ts                   # hearing interface + list type alias
    pdf/pdf-generator.ts
    pdf/pdf-generator.test.ts
    pdf/pdf-template.njk
    rendering/renderer.ts
    rendering/renderer.test.ts
    schemas/<module-name>.json        # JSON Schema (draft-07)

apps/web/src/pages/(list-types)/<module-name>/
  index.ts                            # GET controller (mirrors CST controller exactly)
  index.test.ts
  <module-name>.njk                   # HTML template
```

Because all 10 lists share the same pattern, the only differences between modules are:
- Field names and headers (driving the model, schema, converter config, renderer, and template)
- Important-information accordion content (locale strings)
- Converter registration IDs and names
- `courtName` string passed to the renderer
- Email summary fields (always: Date, Time, Case Reference Number)

### SIAC / POAC / PAAC — shared field set

All three share the same 7 fields:

| Excel header | Field name | Required | Validation |
|---|---|---|---|
| Date | `date` | yes | `DD_MM_YYYY_PATTERN` |
| Time | `time` | yes | no-HTML |
| Appellant | `appellant` | yes | no-HTML |
| Case Reference Number | `caseReferenceNumber` | yes | no-HTML |
| Hearing Type | `hearingType` | yes | no-HTML |
| Courtroom | `courtroom` | yes | no-HTML |
| Additional information | `additionalInformation` | yes | no-HTML |

Because the field sets are identical across SIAC, POAC, and PAAC, a single Excel converter config object can be created and reused by all three converters (registered under different IDs and names).

### FTT Tax Chamber — field set

| Excel header | Field name | Required | Validation |
|---|---|---|---|
| Date | `date` | yes | `DD_MM_YYYY_PATTERN` |
| Hearing Time | `hearingTime` | yes | no-HTML |
| Case Name | `caseName` | yes | no-HTML |
| Case Reference Number | `caseReferenceNumber` | yes | no-HTML |
| Judge(s) | `judges` | yes | no-HTML |
| Member(s) | `members` | yes | no-HTML |
| Venue/Platform | `venuePlatform` | yes | no-HTML |

### FTT LRT (Lands Registration Tribunal) — field set

| Excel header | Field name | Required | Validation |
|---|---|---|---|
| Date | `date` | yes | `DD_MM_YYYY_PATTERN` |
| Hearing Time | `hearingTime` | yes | no-HTML |
| Case Name | `caseName` | yes | no-HTML |
| Case Reference Number | `caseReferenceNumber` | yes | no-HTML |
| Judge | `judge` | yes | no-HTML |
| Venue/Platform | `venuePlatform` | yes | no-HTML |

### FTT RPT (Residential and Property Tribunal) — field set

Identical across all 5 regional variants:

| Excel header | Field name | Required | Validation |
|---|---|---|---|
| Date | `date` | yes | `DD_MM_YYYY_PATTERN` |
| Time | `time` | yes | no-HTML |
| Venue | `venue` | yes | no-HTML |
| Case Type | `caseType` | yes | no-HTML |
| Case Reference Number | `caseReferenceNumber` | yes | no-HTML |
| Judge(s) | `judges` | yes | no-HTML |
| Member(s) | `members` | yes | no-HTML |
| Hearing Method | `hearingMethod` | yes | no-HTML |
| Additional Information | `additionalInformation` | yes | no-HTML |

The same Excel converter config can be reused across all 5 RPT regional variants (registered under different IDs and names).

---

## 2. List Type Registry

Ten new entries are appended to `libs/location/src/list-type-data.ts`. The current highest ID in that file is 27 (`SJP_DELTA_PUBLIC_LIST`). The canonical IDs for the new types are 28–37 (the IDs 24–33 in the ticket comment refer to the database auto-increment at seed time; the canonical registry-level IDs assigned here are what matters for `registerConverter`).

**Note:** The ticket's spec comment (which was machine-generated) assigns IDs 24–33, but IDs 24–27 are already taken in `list-type-data.ts` by the SJP list types. The next available IDs in `list-type-data.ts` start at **28**. The `registerConverter(id, ...)` call in each `-config.ts` file must match the `id` field in `list-type-data.ts`.

| id | name | englishFriendlyName | shortenedFriendlyName | urlPath | provenance | isNonStrategic | defaultSensitivity | subJurisdictionIds |
|----|------|---------------------|----------------------|---------|------------|----------------|-------------------|--------------------|
| 28 | `SIAC_WEEKLY_HEARING_LIST` | Special Immigration Appeals Commission Weekly Hearing List | SIAC Weekly Hearing List | `siac-weekly-hearing-list` | `MANUAL_UPLOAD` | true | TBD (see open questions) | [25] |
| 29 | `POAC_WEEKLY_HEARING_LIST` | Proscribed Organisations Appeal Commission Weekly Hearing List | POAC Weekly Hearing List | `poac-weekly-hearing-list` | `MANUAL_UPLOAD` | true | TBD | [23] |
| 30 | `PAAC_WEEKLY_HEARING_LIST` | Pathogens Access Appeal Commission Weekly Hearing List | PACC Weekly Hearing List | `paac-weekly-hearing-list` | `MANUAL_UPLOAD` | true | TBD | [21] |
| 31 | `FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST` | First-tier Tribunal (Tax Chamber) Weekly Hearing List | FFT Tax Weekly Hearing List | `ftt-tax-chamber-weekly-hearing-list` | `MANUAL_UPLOAD` | true | `Public` | [16] |
| 32 | `FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST` | First-tier Tribunal (Lands Registration Tribunal) Weekly Hearing List | FFT (LR) Weekly Hearing List | `ftt-lands-registration-tribunal-weekly-hearing-list` | `MANUAL_UPLOAD` | true | `Public` | [15] |
| 33 | `FTT_RPT_EASTERN_WEEKLY_HEARING_LIST` | First-tier Tribunal (Residential and Property Tribunal) Eastern Region Weekly Hearing List | RPT Eastern Weekly Hearing List | `ftt-rpt-eastern-weekly-hearing-list` | `MANUAL_UPLOAD` | true | `Public` | [24] |
| 34 | `FTT_RPT_LONDON_WEEKLY_HEARING_LIST` | First-tier Tribunal (Residential and Property Tribunal) London Region Weekly Hearing List | RPT London Weekly Hearing List | `ftt-rpt-london-weekly-hearing-list` | `MANUAL_UPLOAD` | true | `Public` | [24] |
| 35 | `FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST` | First-tier Tribunal (Residential and Property Tribunal) Midlands Region Weekly Hearing List | RPT Midlands Weekly Hearing List | `ftt-rpt-midlands-weekly-hearing-list` | `MANUAL_UPLOAD` | true | `Public` | [24] |
| 36 | `FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST` | First-tier Tribunal (Residential and Property Tribunal) Northern Region Weekly Hearing List | RPT Northern Weekly Hearing List | `ftt-rpt-northern-weekly-hearing-list` | `MANUAL_UPLOAD` | true | `Public` | [24] |
| 37 | `FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST` | First-tier Tribunal (Residential and Property Tribunal) Southern Region Weekly Hearing List | RPT Southern Weekly Hearing List | `ftt-rpt-southern-weekly-hearing-list` | `MANUAL_UPLOAD` | true | `Public` | [24] |

SubJurisdiction IDs come from `libs/location/src/location-data.ts`:
- 25 = Special Immigration Appeals Commission
- 23 = Proscribed Organisations Appeal Commission
- 21 = Pathogens Access Appeal Commission
- 16 = First-Tier Tribunal (Tax Chamber)
- 15 = First-Tier Tribunal (Lands Registration Tribunal)
- 24 = Residential Property Tribunal (used for all 5 RPT regional variants)

Welsh friendly names are placeholders (English text) pending translation — see open questions.

---

## 3. New Module Packages

### 3a. `@hmcts/siac-poac-paac-weekly-hearing-list`

Because SIAC, POAC, and PAAC share identical field definitions and page layout, they can share a **single lib package**. The single converter config is registered three times (once per list type ID and name). Three separate page controllers and templates are created in `apps/web/src/pages/(list-types)/` to give each list type its own URL and locale content.

**Module path:** `libs/list-types/siac-poac-paac-weekly-hearing-list/`

Key files:
- `src/models/types.ts` — `SiacPoacPaacHearing` interface (7 fields), `SiacPoacPaacHearingList` type alias
- `src/conversion/siac-poac-paac-config.ts` — single `SIAC_POAC_PAAC_EXCEL_CONFIG`, three `registerConverter` / `registerConverterByName` calls
- `src/rendering/renderer.ts` — `renderSiacPoacPaacData(list, options): RenderedData`
- `src/email-summary/summary-builder.ts` — `extractCaseSummary` returns `[Date, Time, Case Reference Number]`
- `src/pdf/pdf-generator.ts` — `generateSiacPoacPaacWeeklyHearingListPdf(options)`; accepts a `courtName` option so the same generator serves all three courts
- `src/pdf/pdf-template.njk` — shared PDF template (7-column table)
- `src/locales/en.ts` — shared label strings (table headers, search label, common copy)
- `src/locales/cy.ts` — Welsh placeholders (English text until translations are provided)
- `src/schemas/siac-poac-paac-weekly-hearing-list.json` — JSON Schema for the shared field set

Three locale variants for the important-information accordion are stored as named exports within the locales files, keyed by tribunal abbreviation (`siacImportantInfo`, `poacImportantInfo`, `paacImportantInfo`), so each page controller can select the correct text without importing from three separate modules.

**Page controllers and templates in `apps/web/src/pages/(list-types)/`:**
- `siac-weekly-hearing-list/index.ts` + `siac-weekly-hearing-list.njk`
- `poac-weekly-hearing-list/index.ts` + `poac-weekly-hearing-list.njk`
- `paac-weekly-hearing-list/index.ts` + `paac-weekly-hearing-list.njk`

### 3b. `@hmcts/ftt-tax-chamber-weekly-hearing-list`

**Module path:** `libs/list-types/ftt-tax-chamber-weekly-hearing-list/`

Key differences from CST:
- 7-column table (Date, Hearing Time, Case Name, Case Reference Number, Judge(s), Member(s), Venue/Platform)
- Multi-paragraph important-information accordion with external link
- `extractCaseSummary` returns `[Date, Hearing Time, Case Reference Number]`

**Page:** `apps/web/src/pages/(list-types)/ftt-tax-chamber-weekly-hearing-list/`

### 3c. `@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list`

**Module path:** `libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/`

Key differences:
- 6-column table (Date, Hearing Time, Case Name, Case Reference Number, Judge, Venue/Platform)
- Important-information accordion contains a placeholder office email (`[insert office email]`)
- `extractCaseSummary` returns `[Date, Hearing Time, Case Reference Number]`

**Page:** `apps/web/src/pages/(list-types)/ftt-lands-registration-tribunal-weekly-hearing-list/`

### 3d. `@hmcts/ftt-rpt-weekly-hearing-list`

Because all 5 RPT regional variants share the same field definitions, page layout, and important-information text, they share a **single lib package** — the same strategy used for SIAC/POAC/PAAC.

**Module path:** `libs/list-types/ftt-rpt-weekly-hearing-list/`

Key details:
- `src/conversion/ftt-rpt-config.ts` — single `FTT_RPT_EXCEL_CONFIG`, five `registerConverter` / `registerConverterByName` calls
- Important-information accordion is identical across all 5 regions (same placeholder email)
- `extractCaseSummary` returns `[Date, Time, Case Reference Number]`
- 9-column table (Date, Time, Venue, Case Type, Case Reference Number, Judge(s), Member(s), Hearing Method, Additional Information)

**Page controllers and templates in `apps/web/src/pages/(list-types)/`:**
- `ftt-rpt-eastern-weekly-hearing-list/`
- `ftt-rpt-london-weekly-hearing-list/`
- `ftt-rpt-midlands-weekly-hearing-list/`
- `ftt-rpt-northern-weekly-hearing-list/`
- `ftt-rpt-southern-weekly-hearing-list/`

---

## 4. Files to Create Per Module

The table below lists the source files to create. Build output (`dist/`) is generated — not created manually.

### `@hmcts/siac-poac-paac-weekly-hearing-list`

| File | Notes |
|------|-------|
| `libs/list-types/siac-poac-paac-weekly-hearing-list/package.json` | Same scripts as CST; deps: `@hmcts/list-types-common`, `@hmcts/pdf-generation`, `@hmcts/postgres-prisma`, `luxon`, `nunjucks` |
| `libs/list-types/siac-poac-paac-weekly-hearing-list/tsconfig.json` | Extends `../../../tsconfig.json`; `resolveJsonModule: true` |
| `libs/list-types/siac-poac-paac-weekly-hearing-list/src/config.ts` | `moduleRoot`, `assets`, `schemaPath` |
| `libs/list-types/siac-poac-paac-weekly-hearing-list/src/index.ts` | Re-exports from all sub-modules |
| `libs/list-types/siac-poac-paac-weekly-hearing-list/src/conversion/siac-poac-paac-config.ts` | Field config + 3x register calls |
| `libs/list-types/siac-poac-paac-weekly-hearing-list/src/models/types.ts` | 7-field interface + list type |
| `libs/list-types/siac-poac-paac-weekly-hearing-list/src/locales/en.ts` | Shared labels + 3 accordion text variants |
| `libs/list-types/siac-poac-paac-weekly-hearing-list/src/locales/cy.ts` | Welsh placeholders |
| `libs/list-types/siac-poac-paac-weekly-hearing-list/src/rendering/renderer.ts` | `renderSiacPoacPaacData` |
| `libs/list-types/siac-poac-paac-weekly-hearing-list/src/rendering/renderer.test.ts` | |
| `libs/list-types/siac-poac-paac-weekly-hearing-list/src/email-summary/summary-builder.ts` | Date + Time + Case Reference Number |
| `libs/list-types/siac-poac-paac-weekly-hearing-list/src/email-summary/summary-builder.test.ts` | |
| `libs/list-types/siac-poac-paac-weekly-hearing-list/src/pdf/pdf-generator.ts` | Accepts `courtName` param |
| `libs/list-types/siac-poac-paac-weekly-hearing-list/src/pdf/pdf-generator.test.ts` | |
| `libs/list-types/siac-poac-paac-weekly-hearing-list/src/pdf/pdf-template.njk` | 7-column PDF table |
| `libs/list-types/siac-poac-paac-weekly-hearing-list/src/schemas/siac-poac-paac-weekly-hearing-list.json` | JSON Schema |
| `libs/list-types/siac-poac-paac-weekly-hearing-list/src/config.test.ts` | moduleRoot + assets checks |
| `apps/web/src/pages/(list-types)/siac-weekly-hearing-list/index.ts` | |
| `apps/web/src/pages/(list-types)/siac-weekly-hearing-list/index.test.ts` | |
| `apps/web/src/pages/(list-types)/siac-weekly-hearing-list/siac-weekly-hearing-list.njk` | |
| `apps/web/src/pages/(list-types)/poac-weekly-hearing-list/index.ts` | |
| `apps/web/src/pages/(list-types)/poac-weekly-hearing-list/index.test.ts` | |
| `apps/web/src/pages/(list-types)/poac-weekly-hearing-list/poac-weekly-hearing-list.njk` | |
| `apps/web/src/pages/(list-types)/paac-weekly-hearing-list/index.ts` | |
| `apps/web/src/pages/(list-types)/paac-weekly-hearing-list/index.test.ts` | |
| `apps/web/src/pages/(list-types)/paac-weekly-hearing-list/paac-weekly-hearing-list.njk` | |

### `@hmcts/ftt-tax-chamber-weekly-hearing-list`

| File | Notes |
|------|-------|
| `libs/list-types/ftt-tax-chamber-weekly-hearing-list/package.json` | |
| `libs/list-types/ftt-tax-chamber-weekly-hearing-list/tsconfig.json` | |
| `libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/config.ts` | |
| `libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/index.ts` | |
| `libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/conversion/ftt-tax-config.ts` | |
| `libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/models/types.ts` | |
| `libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/locales/en.ts` | Multi-paragraph accordion, external link |
| `libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/locales/cy.ts` | Placeholder |
| `libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/rendering/renderer.ts` | |
| `libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/rendering/renderer.test.ts` | |
| `libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/email-summary/summary-builder.ts` | |
| `libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/email-summary/summary-builder.test.ts` | |
| `libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/pdf/pdf-generator.ts` | |
| `libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/pdf/pdf-generator.test.ts` | |
| `libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/pdf/pdf-template.njk` | |
| `libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/schemas/ftt-tax-chamber-weekly-hearing-list.json` | |
| `libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/config.test.ts` | |
| `apps/web/src/pages/(list-types)/ftt-tax-chamber-weekly-hearing-list/index.ts` | |
| `apps/web/src/pages/(list-types)/ftt-tax-chamber-weekly-hearing-list/index.test.ts` | |
| `apps/web/src/pages/(list-types)/ftt-tax-chamber-weekly-hearing-list/ftt-tax-chamber-weekly-hearing-list.njk` | |

### `@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list`

| File | Notes |
|------|-------|
| `libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/package.json` | |
| `libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/tsconfig.json` | |
| `libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/config.ts` | |
| `libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/index.ts` | |
| `libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/conversion/ftt-lrt-config.ts` | |
| `libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/models/types.ts` | |
| `libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/locales/en.ts` | Placeholder office email in accordion |
| `libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/locales/cy.ts` | Placeholder |
| `libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/rendering/renderer.ts` | |
| `libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/rendering/renderer.test.ts` | |
| `libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/email-summary/summary-builder.ts` | |
| `libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/email-summary/summary-builder.test.ts` | |
| `libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/pdf/pdf-generator.ts` | |
| `libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/pdf/pdf-generator.test.ts` | |
| `libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/pdf/pdf-template.njk` | |
| `libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/schemas/ftt-lands-registration-tribunal-weekly-hearing-list.json` | |
| `libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/config.test.ts` | |
| `apps/web/src/pages/(list-types)/ftt-lands-registration-tribunal-weekly-hearing-list/index.ts` | |
| `apps/web/src/pages/(list-types)/ftt-lands-registration-tribunal-weekly-hearing-list/index.test.ts` | |
| `apps/web/src/pages/(list-types)/ftt-lands-registration-tribunal-weekly-hearing-list/ftt-lands-registration-tribunal-weekly-hearing-list.njk` | |

### `@hmcts/ftt-rpt-weekly-hearing-list`

| File | Notes |
|------|-------|
| `libs/list-types/ftt-rpt-weekly-hearing-list/package.json` | |
| `libs/list-types/ftt-rpt-weekly-hearing-list/tsconfig.json` | |
| `libs/list-types/ftt-rpt-weekly-hearing-list/src/config.ts` | |
| `libs/list-types/ftt-rpt-weekly-hearing-list/src/index.ts` | |
| `libs/list-types/ftt-rpt-weekly-hearing-list/src/conversion/ftt-rpt-config.ts` | 5x register calls |
| `libs/list-types/ftt-rpt-weekly-hearing-list/src/models/types.ts` | |
| `libs/list-types/ftt-rpt-weekly-hearing-list/src/locales/en.ts` | |
| `libs/list-types/ftt-rpt-weekly-hearing-list/src/locales/cy.ts` | Placeholder |
| `libs/list-types/ftt-rpt-weekly-hearing-list/src/rendering/renderer.ts` | |
| `libs/list-types/ftt-rpt-weekly-hearing-list/src/rendering/renderer.test.ts` | |
| `libs/list-types/ftt-rpt-weekly-hearing-list/src/email-summary/summary-builder.ts` | |
| `libs/list-types/ftt-rpt-weekly-hearing-list/src/email-summary/summary-builder.test.ts` | |
| `libs/list-types/ftt-rpt-weekly-hearing-list/src/pdf/pdf-generator.ts` | Accepts `regionName` + `courtName` |
| `libs/list-types/ftt-rpt-weekly-hearing-list/src/pdf/pdf-generator.test.ts` | |
| `libs/list-types/ftt-rpt-weekly-hearing-list/src/pdf/pdf-template.njk` | |
| `libs/list-types/ftt-rpt-weekly-hearing-list/src/schemas/ftt-rpt-weekly-hearing-list.json` | |
| `libs/list-types/ftt-rpt-weekly-hearing-list/src/config.test.ts` | |
| `apps/web/src/pages/(list-types)/ftt-rpt-eastern-weekly-hearing-list/index.ts` | |
| `apps/web/src/pages/(list-types)/ftt-rpt-eastern-weekly-hearing-list/index.test.ts` | |
| `apps/web/src/pages/(list-types)/ftt-rpt-eastern-weekly-hearing-list/ftt-rpt-eastern-weekly-hearing-list.njk` | |
| `apps/web/src/pages/(list-types)/ftt-rpt-london-weekly-hearing-list/index.ts` | |
| `apps/web/src/pages/(list-types)/ftt-rpt-london-weekly-hearing-list/index.test.ts` | |
| `apps/web/src/pages/(list-types)/ftt-rpt-london-weekly-hearing-list/ftt-rpt-london-weekly-hearing-list.njk` | |
| `apps/web/src/pages/(list-types)/ftt-rpt-midlands-weekly-hearing-list/index.ts` | |
| `apps/web/src/pages/(list-types)/ftt-rpt-midlands-weekly-hearing-list/index.test.ts` | |
| `apps/web/src/pages/(list-types)/ftt-rpt-midlands-weekly-hearing-list/ftt-rpt-midlands-weekly-hearing-list.njk` | |
| `apps/web/src/pages/(list-types)/ftt-rpt-northern-weekly-hearing-list/index.ts` | |
| `apps/web/src/pages/(list-types)/ftt-rpt-northern-weekly-hearing-list/index.test.ts` | |
| `apps/web/src/pages/(list-types)/ftt-rpt-northern-weekly-hearing-list/ftt-rpt-northern-weekly-hearing-list.njk` | |
| `apps/web/src/pages/(list-types)/ftt-rpt-southern-weekly-hearing-list/index.ts` | |
| `apps/web/src/pages/(list-types)/ftt-rpt-southern-weekly-hearing-list/index.test.ts` | |
| `apps/web/src/pages/(list-types)/ftt-rpt-southern-weekly-hearing-list/ftt-rpt-southern-weekly-hearing-list.njk` | |

---

## 5. Existing Files to Modify

| File | Change |
|------|--------|
| `libs/location/src/list-type-data.ts` | Add 10 new entries (IDs 28–37) |
| `apps/web/src/app.ts` | Import `moduleRoot` from each of the 4 new packages' `/config` and add to `modulePaths` array |
| `tsconfig.json` (root) | Add `paths` entries for the 4 new packages (and their `/config` sub-paths) |

The `vite.build.ts` in `apps/web` does not need a change — none of the new modules have frontend assets (same as CST). The seed mechanism automatically picks up new `listTypeData` entries via `seedListTypes()` — no seed file change is needed.

---

## 6. Error Handling

All page controllers follow the CST pattern:
- Missing `artefactId` query parameter → 400 with `errors/common` template
- Artefact not found in DB → 404
- JSON file not found on disk → 404
- JSON Schema validation failure → 400
- Any uncaught exception → 500

This is handled by the try/catch structure in each controller's `GET` handler, identical to `apps/web/src/pages/(list-types)/care-standards-tribunal-weekly-hearing-list/index.ts`.

---

## 7. Open Questions / Assumptions

1. **ID collision with existing IDs 24–27.** The ticket comment assigns IDs 24–33 to the new list types, but `list-type-data.ts` already uses IDs 24–27 for the SJP lists. The plan uses IDs 28–37 (next available). If the DB has already had IDs 24–33 created in a non-local environment, the `registerConverter(id, ...)` calls will need to match whatever IDs exist there. Name-based registration (`registerConverterByName`) is the safer fallback and must always be included.

2. **SIAC / POAC / PAAC access classification.** `defaultSensitivity` is marked as TBD. If these lists contain information about persons whose identities need protection (which the accordion text implies), `Classified` or `Private` may be more appropriate than `Public`. Awaiting confirmation.

3. **Welsh translations.** No Welsh strings were supplied for any of the 10 new list types. All `cy.ts` files will use English text as placeholders, matching the same value as `en.ts`, until translations are provided.

4. **FTT LRT and FTT RPT office email.** The accordion text contains `[insert office email]`. The placeholder string `[insert office email]` will be used verbatim in `en.ts` until real addresses are confirmed.

5. **PAAC upload label — double-C.** The ticket specifies "PACC Weekly Hearing List" (double-C) as the upload form label. This is used as-is in `shortenedFriendlyName`. If this is a typo for "PAAC" it should be raised with the product owner before implementation.

6. **PDF generation scope.** The CST reference implementation includes a fully working PDF generator. This plan includes PDF generators for all 10 new list types following the same pattern. If PDF generation is intended to be deferred, the `pdf-generator.ts` and `pdf-template.njk` files can be stubbed.

7. **FTT RPT `caseType`.** The ticket does not specify whether `caseType` is free text or an enumerated value. The schema and converter will treat it as free text with no-HTML validation. If an enum is required, the schema and validator will need updating.

8. **Shared lib packaging.** This plan groups SIAC/POAC/PAAC into one package and all 5 RPT variants into one package, following the principle of sharing code when field definitions are identical. If the product owner requires strict per-list isolation, each list type can instead be given its own package — at the cost of significant code duplication.
