# Technical Plan — #801 Chancery Appeals (ChD) Daily Cause List

Non-strategic publication of the Chancery Appeals (ChD) daily cause list via Excel upload in CaTH: create the module, validation schema, converter, renderer, PDF/Excel downloads, page and reference-data registration.

---

## 1. Technical Approach

### 1.1 Which module to model against — corrected conclusion

The earlier planning comment (2026-07-23) concluded the structural analogue was `rcj-standard-daily-cause-list`. That was correct at the time, but the codebase has since moved on. The true analogue is now:

**`libs/list-types/companies-winding-up-chd-daily-cause-list/` built on the shared `@hmcts/chd-kb-common` package.**

Evidence from the codebase:

- **The field set already exists, verbatim.** `libs/list-types/chd-kb-common/src/schemas/chd-kb-common.json` defines an array-of-objects schema with exactly the fields #801 asks for, in order: `judge, time, venue, type, caseNumber, caseName, additionalInformation`. This is the ticket's field list exactly. The RCJ standard schema uses different field names (`caseDetails`, `hearingType`) and a different order, so it is **not** the closest analogue any more.
- **The Excel converter config already exists.** `libs/list-types/chd-kb-common/src/conversion/chd-kb-excel-config.ts` (`CHD_KB_EXCEL_CONFIG`) defines the seven columns with headers `Judge, Time, Venue, Type, Case Number, Case Name, Additional Information` and `minRows: 1`.
- **The validator, renderer, email-summary and type all exist and are shared.** `validateChdKbListType`, `renderChdKbHearingList`, `extractCaseSummary`, and `ChdKbHearing`/`ChdKbHearingList` all live in `@hmcts/chd-kb-common`.
- **A working sibling proves the wiring.** `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` is a live non-strategic ChD list published under Business and Property Courts Rolls Building (`location-data.ts` locationId 26, region 11, subJurisdiction 10). Its module (`libs/list-types/companies-winding-up-chd-daily-cause-list/`) is a thin wrapper over `@hmcts/chd-kb-common`: config, locales, a rendering wrapper that injects its own `pageTitle`, a PDF generator, and re-exports for the registries.

Chancery Appeals (ChD) shares the same court (Rolls Building), the same jurisdiction family (Civil / High Court, ChD), and — per the ticket JSON sample and field list — the **same schema and converter** as Companies Winding Up. So the new list type is another thin wrapper over `@hmcts/chd-kb-common`, structurally identical to `companies-winding-up-chd-daily-cause-list`.

### 1.2 Architecture decisions

1. **Reuse `@hmcts/chd-kb-common` — do not duplicate the schema, converter, validator, renderer or types.** The shared package was explicitly built to be reused by "future list types using the same schema" (see the comments in `companies-winding-up-chd-daily-cause-list/src/index.ts`). Chancery Appeals is exactly that case. Creating a new schema/validator would duplicate logic and risk drift.
2. **Create a new thin wrapper module** `libs/list-types/chancery-appeals-chd-daily-cause-list/` mirroring the companies-winding-up module: `config.ts`, `index.ts`, `locales/{en,cy}.ts`, `rendering/renderer.ts` (wrapper injecting this list's own `pageTitle`), `pdf/{pdf-generator.ts,pdf-template.njk}`, `conversion/…-config.ts` (registers the converter under this list type's DB name).
3. **Register the converter by name** using `registerConverterByName("CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST", createConverter(CHD_KB_EXCEL_CONFIG))` on module load (imported for side effects from `index.ts`), exactly as companies-winding-up does.
4. **Register the PDF generator by name** in `PDF_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts`) keyed on the string `CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST`.
5. **The dynamic JSON validator dispatcher resolves by package name, not id.** `validateListTypeJson` (`libs/list-types/common/src/validation/list-type-validator.ts`) converts the list type name to kebab-case, imports `@hmcts/chancery-appeals-chd-daily-cause-list`, and calls the first exported `validate*` function. So the new module MUST re-export a `validate*` function (`validateChanceryAppealsChdDailyCauseList = validateChdKbListType`). The CI guard test (`libs/list-types/common/src/validation/guard.test.ts`) only fails for packages that ship their *own* `schemas/*.json` without a `validate*` export; this wrapper ships no schema of its own, but MUST still export a `validate*` for the dispatcher to work.
6. **Page controller** in `apps/web/src/pages/(list-types)/chancery-appeals-chd-daily-cause-list/` using `createSimpleListTypeHandler` with a single `SUPPORTED_LIST_TYPE = "CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST"` guard on `artefact.listTypeName` — a direct copy of the companies-winding-up controller.
7. **Reference data via `list-type-data.ts`** — add one entry; no hand-written SQL (see §2.4).
8. **`listTypeName` everywhere; never `listTypeId`.** All guards, registries and converters key on the stable name.

### 1.3 Key technical considerations

- **Time pattern.** `chd-kb-common.json` uses `^\d{1,2}([:.]\d{2})?\s*[ap]m\s*$`, which accepts the ticket's `9am` and `10:30pm` examples. No schema change needed.
- **`additionalInformation` is required in `chd-kb-common`.** The ticket's earlier spec comment (§9) proposed making it *optional*. The shared schema and converter mark it **required** (`minRows: 1`, `required: true`). Reusing the shared package means Chancery Appeals inherits "required". Diverging would force a separate schema and defeat reuse. Flagged as a clarification (see §5, item 7) — recommendation: accept the shared schema's "required" to preserve reuse, or provide an empty-string default in the template if truly optional is mandated.
- **No assets registration needed.** The companies-winding-up module registers no Vite assets (no `assets/` dir; not referenced in `apps/web/vite.build.ts`). Chancery Appeals follows suit — the case-search input and back-to-top link are styled by web-core global assets.
- **Welsh.** Both `en.ts` and `cy.ts` locale files required with identical key structure (enforce with a `Object.keys(en).sort()` parity check in the template test).

---

## 2. Implementation Details

### 2.1 New library module

```
libs/list-types/chancery-appeals-chd-daily-cause-list/
├── package.json          # deps: @hmcts/chd-kb-common, @hmcts/list-types-common,
│                         #       @hmcts/pdf-generation, @hmcts/postgres-prisma,
│                         #       exceljs, luxon, nunjucks
├── tsconfig.json         # extends root; build + build:nunjucks scripts
└── src/
    ├── config.ts         # moduleRoot (assets only if ever needed)
    ├── index.ts          # side-effect import of converter config; re-exports:
    │                     #   - type ChanceryAppealsChdHearing/List (alias of ChdKb*)
    │                     #   - validateChanceryAppealsChdDailyCauseList (= validateChdKbListType)
    │                     #   - extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING
    │                     #   - chanceryAppealsChdDailyCauseListEn / …Cy
    │                     #   - renderChanceryAppealsChdDailyCauseList
    │                     #   - generateChanceryAppealsChdDailyCauseListPdf
    ├── conversion/
    │   └── chancery-appeals-chd-daily-cause-list-config.ts   # registerConverterByName(NAME, createConverter(CHD_KB_EXCEL_CONFIG))
    │   └── chancery-appeals-chd-daily-cause-list-config.test.ts
    ├── locales/
    │   ├── en.ts         # pageTitle, fact link, venue/address, importantInformation, tableHeaders, noHearings, backToTop, dataSource, provenanceLabels, error* keys
    │   └── cy.ts         # identical key structure, Welsh values
    ├── rendering/
    │   ├── renderer.ts   # renderChanceryAppealsChdDailyCauseList → renderChdKbHearingList with this list's pageTitle
    │   └── renderer.test.ts
    └── pdf/
        ├── pdf-generator.ts       # generateChanceryAppealsChdDailyCauseListPdf
        ├── pdf-generator.test.ts
        └── pdf-template.njk       # copy/adapt companies-winding-up pdf-template
```

No `schemas/` or `validation/` directory in this module — the schema and validator are inherited from `@hmcts/chd-kb-common`. (This is exactly what companies-winding-up does.)

### 2.2 Page (in apps/web)

```
apps/web/src/pages/(list-types)/chancery-appeals-chd-daily-cause-list/
├── index.ts                                             # createSimpleListTypeHandler + SUPPORTED_LIST_TYPE guard
├── chancery-appeals-chd-daily-cause-list.njk            # migrated template (see TEMPLATE SOURCE)
├── index.test.ts                                        # controller unit tests
└── chancery-appeals-chd-daily-cause-list.njk.test.ts    # structural template tests (Cheerio) + Welsh + key parity
```

### 2.3 TEMPLATE SOURCE

**migrate from pip-frontend chancery-appeals-chd-daily-cause-list**

(The migration itself is executed by the migrate skill during implementation; this plan only records the source. Reference render for verification: `https://pip-frontend.staging.platform.hmcts.net/chancery-appeals-chd-daily-cause-list?artefactId=9cc94552-ee10-4226-972d-b8d189b01aa3`. The companies-winding-up `.njk` is the closest in-repo structural precedent for the resulting table/details/search layout.)

### 2.4 Reference data / seeding (verified current mechanism)

The CLAUDE.md warning is correct: hand-editing `001_insert_missing_list_types.sql` / `003_upsert_*.sql` is **stale**. Verified current mechanism:

- **Single source of truth:** `libs/list-types/common/src/list-type-data.ts`. Add one entry (see below). Seed SQL is *generated* from this file by `apps/postgres/prisma/generate-seed-sql.ts` at deploy (`apps/postgres/start.sh`), and applied idempotently via `INSERT … ON CONFLICT`. Local `yarn db:seed` reads the same TS data. **Do not write any `.sql` seed file.**
- **Location already exists** — `Business and Property Courts Rolls Building` is `locationId: 26`, `regions: [11]` (Royal Courts of Justice Group), `subJurisdictions: [10]` (High Court) in `libs/location/src/location-data.ts`. No `location-data.ts` change required.

Proposed `list-type-data.ts` entry (mirrors the companies-winding-up sibling):

```typescript
{
  name: "CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST",
  englishFriendlyName: "Chancery Appeals (Chancery Division) Daily Cause List",  // CONFIRM exact friendly name (§5.3)
  welshFriendlyName: "<WELSH TRANSLATION REQUIRED>",                             // CONFIRM (§5.3)
  shortenedFriendlyName: "Chancery Appeals (ChD) Daily Cause List",              // CONFIRM (§5.3)
  provenance: "CFT_IDAM",
  urlPath: "chancery-appeals-chd-daily-cause-list",
  isNonStrategic: true,
  defaultSensitivity: "Public",
  subJurisdictionIds: [10]   // High Court — matches sibling Rolls Building lists (§5.2)
}
```

### 2.5 Registration touch-points

1. `libs/list-types/common/src/list-type-data.ts` — add the entry above.
2. `libs/publication/src/processing/service.ts` — import `generateChanceryAppealsChdDailyCauseListPdf` and add `CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST: (p) => generateChanceryAppealsChdDailyCauseListPdf({ ...p, jsonData: p.jsonData as ChanceryAppealsChdHearingList })` to `PDF_GENERATOR_REGISTRY`.
3. Converter registration is automatic via the side-effect import in the module's `index.ts` (which the PDF/validator imports pull in).
4. `apps/web/src/app.ts` — import `moduleRoot as chanceryAppealsChdModuleRoot` from `@hmcts/chancery-appeals-chd-daily-cause-list/config` and add to the Nunjucks `modulePaths` array.
5. Root `tsconfig.json` — add `@hmcts/chancery-appeals-chd-daily-cause-list` and `…/config` path entries.
6. No `apps/web/vite.build.ts` change (no module assets), matching the sibling.
7. `pnpm/yarn` workspace picks up the new lib automatically; add it as a dependency of `@hmcts/publication` and `apps/web` package.json where those import it (mirror how companies-winding-up is wired).

### 2.6 Schema definition

No new schema file. The schema is `@hmcts/chd-kb-common`'s `chd-kb-common.json`: root `type: "array"`, `items.type: "object"`, all seven fields `required`, each string with the no-HTML-tags pattern except `time` which uses the am/pm pattern. This satisfies the ticket's field list and JSON sample.

---

## 3. Error Handling & Edge Cases

- **Missing `artefactId`** → 400 `errors/common` (handled by `createSimpleListTypeHandler`).
- **Artefact not found** → 404 `errors/common`.
- **Access denied** (sensitivity/user) → 403 `errors/403` (handled by shared handler via `canAccessPublicationData`).
- **Wrong list type on this route** → 400 via the `SUPPORTED_LIST_TYPE` guard on `artefact.listTypeName`.
- **Blob/JSON missing** → 404, logged with `logPrefix`.
- **Invalid JSON (schema)** → 400 `errors/common`; validation runs `validateChdKbListType`.
- **Invalid Excel upload** → converter rejects with per-row, per-field actionable errors (`validateNoHtmlTags`, `validateTimeFormatSimple`) surfaced through the existing manual-upload / non-strategic-upload flow.
- **Empty list** (`minRows: 1`) → upload with zero rows is rejected at conversion; a validly-uploaded-but-later-empty render shows the `noHearingsMessage` branch in the template.
- **Welsh rendering** → `?lng=cy` selects `cy` locale; template reads translated `tableHeaders`, headings and body copy.
- **Unexpected errors** → 500 `errors/common`, logged.

---

## 4. Acceptance Criteria Mapping

| # | Acceptance Criterion | How satisfied | How verified |
|---|----------------------|---------------|--------------|
| 1 | Created under Business & Property Courts Rolls Building, linked to Civil jurisdiction and Royal Courts of Justice Group region | `list-type-data.ts` entry with `subJurisdictionIds:[10]` (High Court, jurisdiction Civil) mapped to location 26 (region 11). **See §5.2 — Civil Court [1] vs High Court [10].** | Unit assertion on the new entry; local `yarn db:seed`; manual check the list appears under the correct court in the publication/search UI |
| 2 | Fields in order: Judge, Time, Venue, Type, Case Number, Case Name, Additional Information | Inherited `chd-kb-common.json` `required` array + `CHD_KB_EXCEL_CONFIG` field order | Validator test (already in chd-kb-common) proves each required field; template/converter tests assert column order |
| 3 | Published via Excel upload converted to JSON | `registerConverterByName("CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST", createConverter(CHD_KB_EXCEL_CONFIG))` | Converter unit test (headers → JSON); E2E non-strategic upload journey |
| 4 | Validation schema and style guide created | Schema inherited from chd-kb-common; template migrated from pip-frontend; `validate*` re-exported so the dispatcher resolves it | Controller test (invalid JSON → 400); dynamic-dispatch path exercised |
| 5 | PDF and Excel downloadable versions | PDF via `generateChanceryAppealsChdDailyCauseListPdf` + `PDF_GENERATOR_REGISTRY`; Excel is the uploaded/regenerated template via existing download route | PDF generator unit test; manual download check |
| 6 | Style guide follows the pip-frontend reference | Template migrated from pip-frontend chancery-appeals-chd-daily-cause-list | Structural njk test (Cheerio) against expected headings/table/columns; visual check against the reference URL |
| 7 | JSON follows the given format | Matches chd-kb-common schema exactly | Validator test with the ticket's sample JSON |
| (implicit) | Welsh support | `en.ts`/`cy.ts` with identical keys | Template test rendered with `cy`; key-parity assertion; E2E `?lng=cy` |

---

## 5. CLARIFICATIONS NEEDED

Carried forward from the earlier planning comment (2026-07-23) and re-verified against the current codebase:

1. **Venue / location record — RESOLVED.** `Business and Property Courts Rolls Building` already exists (`location-data.ts` locationId 26, region 11, subJurisdiction 10). No location change needed. Confirm the Chancery Appeals list should attach to this same location (the sibling Companies Winding Up ChD list does).

2. **Sub-jurisdiction id: Civil Court [1] vs High Court [10] — RE-VERIFIED, recommend [10].** The earlier plan flagged a contradiction. Verified: the closest sibling `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` (also ChD, also Rolls Building) uses `subJurisdictionIds:[10]` (High Court), and location 26's `subJurisdictions` is `[10]`. The RCJ standard *Civil Courts* lists use `[1]` (Civil Court) but they attach to a different court. **Recommendation: use `[10]` High Court to match the Rolls Building sibling.** The ticket text says "linked to the 'Civil' jurisdiction" — note sub-jurisdiction 10 (High Court) *belongs to* jurisdictionId 1 (Civil), so `[10]` is consistent with "Civil jurisdiction". Confirm with the business.

3. **Friendly name + Welsh name + shortenedFriendlyName.** Confirm the exact English `englishFriendlyName` ("Chancery Appeals (Chancery Division) Daily Cause List"?), the `shortenedFriendlyName` ("Chancery Appeals (ChD) Daily Cause List"?), and provide the `welshFriendlyName` translation. Needed for `list-type-data.ts` and locale `pageTitle`.

4. **"Important information" body copy (English + Welsh).** The companies-winding-up template renders an `importantInformation*` details block (e.g. "Company Insolvency Pro Bono Scheme"). Confirm the equivalent Chancery Appeals body copy, or whether the details block should be omitted. Migration from pip-frontend should surface the correct copy — confirm against the reference page.

5. **Excel template column headers — likely RESOLVED.** The shared `CHD_KB_EXCEL_CONFIG` uses headers `Judge, Time, Venue, Type, Case Number, Case Name, Additional Information` (note "Type", not "Hearing Type"; "Case Name", not "Case Details"). This matches the ticket's field list. Confirm the published Chancery Appeals Excel template uses these exact header strings so uploads parse.

6. **Sensitivity / provenance / minRows.** Recommend `defaultSensitivity: "Public"`, `provenance: "CFT_IDAM"`, `isNonStrategic: true` (matches every RCJ/ChD non-strategic sibling). `minRows` is inherited as `1` from `CHD_KB_EXCEL_CONFIG`. Confirm these defaults are correct for Chancery Appeals.

7. **`additionalInformation` required vs optional — RESOLVED (2026-08-10).** Decision confirmed by the assignee: **reuse `@hmcts/chd-kb-common`.** This means the shared schema and `CHD_KB_EXCEL_CONFIG` apply as-is, so `additionalInformation` is **required** (option (a)). No separate schema or converter config will be created — Chancery Appeals is a thin wrapper over the shared package, matching the live `companies-winding-up-chd-daily-cause-list` sibling.
