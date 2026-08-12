# Technical Plan: #804 Competition List (ChD) Daily Cause List

**List type name (stable, `@unique`):** `COMPETITION_LIST_CHD_DAILY_CAUSE_LIST`
**URL path:** `/competition-list-chd-daily-cause-list`
**Branch:** `feature/804-competition-list-chd-daily-cause-list`

---

## 1. Technical Approach

### High-level strategy

The Competition List (ChD) is a **non-strategic** list published via the existing Excel-upload
route: publisher uploads an Excel template → converted to JSON → validated against a JSON schema →
stored as an `Artefact` → rendered to HTML with downloadable PDF (and the stored Excel served back).

The JSON contract from the issue is a flat array of hearing objects with **exactly** the fields
`judge, time, venue, type, caseNumber, caseName, additionalInformation` — in that order.

### Architecture decision: reuse `@hmcts/chd-kb-common`, clone `companies-winding-up`

The spec (written 2026-07-22) proposed a bespoke module with its own schema, validator, converter
config, renderer and PDF generator, modelled on the RCJ family. **That is now out of date.** Since
the spec was written, `libs/list-types/companies-winding-up-chd-daily-cause-list` was merged (PR
#913, on this branch's parent). It is a ChD single-list that delegates all shared logic to a new
`@hmcts/chd-kb-common` package.

Critically, `@hmcts/chd-kb-common` already defines the **exact** 7-field ChD/KB shape this ticket
needs — verified in `libs/list-types/chd-kb-common/src/models/types.ts` and
`chd-kb-common/src/conversion/chd-kb-excel-config.ts` (`CHD_KB_EXCEL_CONFIG.fields` =
`["judge","time","venue","type","caseNumber","caseName","additionalInformation"]`, `minRows: 1`).
The field names and column order in the issue match `chd-kb-common` verbatim — there are **no**
renames (the spec's `hearingType`/`caseDetails` mapping table was based on the RCJ config, which
`chd-kb-common` has already superseded for ChD lists).

**Decision: the Competition List module is a thin wrapper over `@hmcts/chd-kb-common`, cloned
structurally from `companies-winding-up-chd-daily-cause-list`.** It does NOT ship its own JSON
schema, validator, converter config, renderer core, or email-summary logic — it re-exports those
from `@hmcts/chd-kb-common` under its own list-type name. This keeps a single source of truth for
the ChD/KB schema and matches the pattern the reviewers just merged.

This supersedes spec §6's dedicated-module file tree and §9's bespoke schema. The spec's own
"New module vs. extend" open question (§14) is resolved in favour of a shared-schema wrapper.

### Key technical considerations

- **Never use numeric `listTypeId`.** All guards/routing/registration key on the stable
  `listTypeName` string `COMPETITION_LIST_CHD_DAILY_CAUSE_LIST` (CLAUDE.md list-type rules).
- **Converter self-registration.** The converter registers by name as a side effect of importing
  the module; the upload entry points must side-effect-import the module or `hasConverterForListTypeName`
  returns false and uploads silently fail.
- **PDF generator registration.** `libs/publication/src/processing/service.ts` must register a
  generator under the list-type name, or `generatePublicationPdf` produces no PDF.
- **Reference data is TypeScript, not SQL.** Per CLAUDE.md, `list-type-data.ts` + `location-data.ts`
  are the single sources of truth; deploy SQL is *generated* from them. The spec's references to
  `apps/postgres/prisma/scripts/00x_*.sql` are **stale — those files do not exist in the repo.** Do
  not hand-write SQL.

---

## 2. Implementation Details

### TEMPLATE SOURCE

TEMPLATE SOURCE: migrate from pip-frontend competition-list-chd-daily-cause-list

(The `.njk` view and the `en`/`cy` locale content it consumes are produced by the migrate-pip-pages
skill during the implement step — do not hand-write the markup. The skill's fetch/adapt/verify steps
are intentionally not reproduced here.)

### New module: `libs/list-types/competition-list-chd-daily-cause-list/`

Cloned from `companies-winding-up-chd-daily-cause-list`, delegating to `@hmcts/chd-kb-common`:

```
libs/list-types/competition-list-chd-daily-cause-list/
├── package.json          # @hmcts/competition-list-chd-daily-cause-list; "." + "./config" exports
├── tsconfig.json
└── src/
    ├── config.ts         # moduleRoot, assets (mirror companies-winding-up config.ts)
    ├── index.ts          # side-effect converter import; re-exports from @hmcts/chd-kb-common
    │                     #   under this list type's own names; locale + renderer + pdf exports
    ├── conversion/
    │   ├── competition-list-chd-daily-cause-list-config.ts       # createConverter(CHD_KB_EXCEL_CONFIG)
    │   │                                                         #   + registerConverterByName(NAME, conv)
    │   └── competition-list-chd-daily-cause-list-config.test.ts
    ├── rendering/
    │   ├── renderer.ts        # renderCompetitionListChdDailyCauseList → delegates to renderChdKbHearingList
    │   └── renderer.test.ts
    ├── pdf/
    │   ├── pdf-generator.ts   # generateCompetitionListChdDailyCauseListPdf (clone of companies-winding-up)
    │   ├── pdf-generator.test.ts
    │   └── pdf-template.njk   # migrated PDF template
    └── locales/
        ├── en.ts             # page content (see §Content below)
        └── cy.ts             # mirror of en.ts (Welsh — see Open Questions)
```

`index.ts` pattern (mirror companies-winding-up):
- `import "./conversion/competition-list-chd-daily-cause-list-config.js";` at top (side-effect register)
- `export type { ChdKbHearing as CompetitionListChdHearing, ChdKbHearingList as CompetitionListChdHearingList } from "@hmcts/chd-kb-common";`
- `export { validateChdKbListType as validateCompetitionListChdDailyCauseList, extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/chd-kb-common";`
- `export { cy as competitionListChdDailyCauseListCy } from "./locales/cy.js";`
- `export { en as competitionListChdDailyCauseListEn } from "./locales/en.js";`
- `export * from "./rendering/renderer.js";`
- `export * from "./pdf/pdf-generator.js";`

**No `schemas/` or `validation/` directory** — the schema and validator live in `@hmcts/chd-kb-common`
and are re-exported by name. Because this package does not ship a `src/schemas/*.json`, the CI guard
test at `libs/list-types/common/src/validation/guard.test.ts` does not require a local `validate*`
(same as companies-winding-up). The re-exported `validateCompetitionListChdDailyCauseList` still
satisfies the dynamic list-type validator dispatcher that imports by package name.

### New page: `apps/web/src/pages/(list-types)/competition-list-chd-daily-cause-list/`

Cloned from the companies-winding-up page (`(list-types)/companies-winding-up-chd-daily-cause-list/`):

- `index.ts` — `createSimpleListTypeHandler<CompetitionListChdHearingList>` with
  `validate = validateCompetitionListChdDailyCauseList`,
  `SUPPORTED_LIST_TYPE = "COMPETITION_LIST_CHD_DAILY_CAUSE_LIST"`, a `guardArtefact` that renders
  `errors/common` with status 400 on mismatch, and a `render` fn calling
  `renderCompetitionListChdDailyCauseList` + `resolveDataSource`.
- `competition-list-chd-daily-cause-list.njk` — migrated from pip-frontend (see TEMPLATE SOURCE).
- `index.test.ts` — controller tests (GET renders with en/cy/t; guard rejects wrong `listTypeName`).
- `competition-list-chd-daily-cause-list.njk.test.ts` — template tests via `@hmcts/test-support`
  (`createTestEnvironment`/`render`): seven column headers in order, one `<tr>` per hearing, Welsh
  headings, en/cy key parity.

### API endpoints

None new. Publishing uses the existing generic non-strategic Excel-upload endpoints. Public viewing
is the auto-discovered `GET /competition-list-chd-daily-cause-list?artefactId=<uuid>` (the
`(list-types)` route group adds no URL prefix).

### Database / reference-data changes

No new Prisma model — uses existing `Artefact` / `ListType` tables. Reference data via the
TypeScript single-source-of-truth files (generated seed SQL, per CLAUDE.md):

1. **`libs/list-types/common/src/list-type-data.ts`** — add a `ListTypeData` entry immediately
   modelled on the `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` entry (line ~791):
   ```typescript
   {
     name: "COMPETITION_LIST_CHD_DAILY_CAUSE_LIST",
     englishFriendlyName: "Competition List (ChD) Daily Cause List",
     welshFriendlyName: "[WELSH TRANSLATION REQUIRED: \"Competition List (ChD) Daily Cause List\"]",
     shortenedFriendlyName: "Competition List (ChD) Daily Cause List",
     provenance: "CFT_IDAM",          // matches companies-winding-up — see Open Questions
     urlPath: "competition-list-chd-daily-cause-list",
     isNonStrategic: true,
     defaultSensitivity: "Public",
     subJurisdictionIds: [10]          // High Court (jurisdiction 1 = Civil) — see Open Questions
   }
   ```
2. **`libs/location/src/location-data.ts`** — **no change needed.** Contrary to spec §14, the
   "Business and Property Courts Rolls Building" location **already exists** (line ~189, `regions: [11]`
   = Royal Courts of Justice Group). Verify at implement time it is linked to sub-jurisdiction 10 so
   the new list type surfaces under it; only touch this file if the link is missing.
3. **No SQL scripts.** The spec's `001_insert_missing_list_types.sql` /
   `003_upsert_sub_jurisdictions_and_list_type_links.sql` **do not exist** — reference data is seeded
   from the two TypeScript files above via `apps/postgres/prisma/generate-seed-sql.ts`. Ignore spec §6 items 2–3.

### Registration touch-points (existing shared files to edit)

1. **`libs/publication/src/processing/service.ts`** — add top-of-file
   `import { type CompetitionListChdHearingList, generateCompetitionListChdDailyCauseListPdf } from "@hmcts/competition-list-chd-daily-cause-list";`
   and register in `PDF_GENERATOR_REGISTRY` under key `COMPETITION_LIST_CHD_DAILY_CAUSE_LIST`
   (mirror the companies-winding-up entry at ~line 187).
2. **`apps/web/src/pages/(admin)/non-strategic-upload/index.ts`** — add side-effect import
   `import "@hmcts/competition-list-chd-daily-cause-list";` alongside the existing converter
   registrations (the companies-winding-up import is the last one, line 9).
   *(Note: `manual-upload/index.ts` does not currently import companies-winding-up; only add there if
   verification shows manual JSON upload must resolve this converter.)*
3. **`apps/web/src/app.ts`** — add
   `import { moduleRoot as competitionListChdModuleRoot } from "@hmcts/competition-list-chd-daily-cause-list/config";`
   and add `competitionListChdModuleRoot` to the `modulePaths` array (mirror line 143) for Nunjucks
   template discovery of the page.
4. **`tsconfig.json` (root)** — add the two `paths` entries
   (`@hmcts/competition-list-chd-daily-cause-list` and `.../config`), mirroring the companies-winding-up
   entries (lines 69–70).
5. **`e2e-tests/utils/seed-list-types.ts`** — the spec says add to `BASE_LIST_TYPES`. Note
   `BASE_LIST_TYPES` currently does **not** include companies-winding-up, so this is only required if
   the E2E viewing journey needs the list type seeded; add it if writing the E2E test.
6. **`apps/web/vite.config.ts`** — only if the module ships app-discoverable assets. companies-winding-up
   registers no vite assets, so likely **no change**.
7. **`package.json` build steps** — the module needs `build:nunjucks` (copy `pdf/*.njk` into `dist`)
   in its `package.json` build script (mirror companies-winding-up). No `build:schemas` step needed
   since no schema ships in this package.

---

## 3. Error Handling & Edge Cases

### Validation (two mandatory layers, both provided by `@hmcts/chd-kb-common`)

- **Excel → JSON converter** (`CHD_KB_EXCEL_CONFIG` via `createConverter`, registered by name):
  validates on upload. Required columns Judge, Time, Venue, Type, Case Number, Case Name (Additional
  Information required per the existing chd-kb config — confirm whether it should be optional for
  Competition List; the issue payload always includes it). `validateNoHtmlTags` on text fields,
  `validateTimeFormat` on `time`, `minRows: 1`.
- **JSON schema** (`chd-kb-common/src/schemas/chd-kb-common.json` via
  `validateCompetitionListChdDailyCauseList`): draft-07 array; rejects embedded HTML tags and
  malformed time. The `chd-kb-common` validator + its `json-validator.test.ts` already exist and are
  covered by the CI guard — no new schema/tests required in this package for the schema itself.

### Error scenarios

- Missing required column value → converter error identifying the field (e.g. `Missing required field 'Judge'`).
- HTML tag in a cell → `HTML tags are not allowed`.
- Invalid `time` → `Invalid time format`.
- Empty file / no data rows → converter rejects (`minRows: 1`).
- Wrong `listTypeName` at the render route → `400` + `errors/common` (handled by `guardArtefact`).
- Missing/invalid `artefactId` → standard not-found handling in `createSimpleListTypeHandler`.
- No PDF generator registered → PDF silently absent (mitigated by registry entry above).
- Converter not side-effect-imported → upload fails silently (mitigated by the upload-page import).

### Edge cases

- Empty hearings array renders the "no hearings" message (locale key `noHearingsMessage`).
- Welsh rendering (`?lng=cy`) keeps identical structure; hearing data rendered as supplied.
- `additionalInformation` blank cell handling — confirm required vs optional (see Open Questions).

---

## 4. Acceptance Criteria Mapping

| Acceptance criterion | How satisfied | Verification |
|---|---|---|
| List created under Business and Property Courts Rolls Building, linked to Civil jurisdiction + RCJ Group region (11) | `list-type-data.ts` entry with `subJurisdictionIds: [10]` (High Court, jurisdiction 1 = Civil); Rolls Building location already in region 11 | Seed locally (`yarn db:seed`), browse list types under the location; confirm region/jurisdiction linkage |
| Fields in order: Judge, Time, Venue, Type, Case Number, Case Name, Additional Information | `CHD_KB_EXCEL_CONFIG.fields` are exactly these in this order | Converter config test asserts field order |
| Published via Excel upload → converted to JSON | Converter registered by name; side-effect import on upload page | Converter test converts sample workbook to expected JSON array; manual upload smoke test |
| Validation schema + style guide created | Schema/validator re-used from `@hmcts/chd-kb-common`; style-guide page migrated from pip-frontend | Validator unit tests (in chd-kb-common) + template tests |
| PDF + Excel downloadable | PDF generator registered in `PDF_GENERATOR_REGISTRY`; Excel = originally uploaded file served back (standard non-strategic behaviour) | PDF generation test; manual download check (Excel behaviour — see Open Questions) |
| Style guide follows the staging reference | Template migrated from pip-frontend `competition-list-chd-daily-cause-list` | Visual comparison to staging reference; template tests |
| JSON format matches the issue payload | `ChdKbHearing` shape is identical to the issue payload | Converter + renderer tests |
| Welsh language support | `en.ts`/`cy.ts` locale files with identical key structure; i18n middleware selects on `res.locals.locale` | Template test rendering with `cy`; en/cy key-parity assertion; E2E `?lng=cy` |

---

## 5. CLARIFICATIONS NEEDED

Carried forward from the ticket comments (still unresolved), updated against current repo state:

1. **Location record.** Resolved in part: the "Business and Property Courts Rolls Building" location
   **already exists** in region 11 (RCJ Group) — contrary to the spec's assumption that it was
   missing. Confirm it is linked to the correct sub-jurisdiction so the Competition List surfaces
   under it, and that region 11 is the intended region (the standalone "Royal Courts of Justice"
   location sits in region 1).

2. **Sub-jurisdiction.** companies-winding-up (the closest sibling) uses `subJurisdictionIds: [10]`
   = "High Court" (jurisdiction 1 = Civil), **not** `[1]` "Civil Court" as the spec assumed. Confirm
   Competition List should also attach to sub-jurisdiction 10, or whether a Chancery / Business &
   Property / Competition sub-jurisdiction is required.

3. **Provenance.** companies-winding-up uses `CFT_IDAM` despite being non-strategic; the spec assumed
   `MANUAL_UPLOAD`. Confirm which provenance Competition List should use (plan currently assumes
   `CFT_IDAM` for consistency with the sibling).

4. **Excel download behaviour.** Is the "Excel downloadable version" AC satisfied by serving the
   originally uploaded Excel file (standard non-strategic behaviour), or must an Excel be regenerated
   from JSON (as SJP lists do via `EXCEL_GENERATOR_REGISTRY`)? Plan assumes serve-uploaded.

5. **Exact static page copy.** The "Important information" text and location address lines must be
   confirmed against the staging reference
   (`.../competition-list-chd-daily-cause-list?artefactId=504b46d6-f6b4-4d13-a145-6bbe3b35f1aa`).
   Note companies-winding-up carries a scheme-specific "Company Insolvency Pro Bono Scheme" notice —
   the Competition List will have different (or no) court-specific notices; use the migrated
   pip-frontend copy, not the companies-winding-up copy.

6. **Welsh translations.** All Welsh strings (including `welshFriendlyName` in reference data) are
   placeholders (`[WELSH TRANSLATION REQUIRED: ...]`) and need confirmed translations.

7. **Blank Excel template.** Does a downloadable blank Excel template need to be provided to
   publishers, or is that out of scope?

8. **Email summary builder.** companies-winding-up re-exports the chd-kb-common summary builder.
   Confirm whether Competition List needs a subscription email-summary (assumed yes, re-exported from
   `@hmcts/chd-kb-common` for consistency — low cost since it is shared).

9. **`additionalInformation` required vs optional.** `CHD_KB_EXCEL_CONFIG` currently treats
   Additional Information as a required column (its test asserts `Missing required field 'Additional
   Information'`); the issue schema lists it last and the spec called it optional. Confirm — this
   affects whether the shared config can be reused unchanged.
