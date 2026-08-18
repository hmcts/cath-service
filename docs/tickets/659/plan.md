# Technical Plan — Issue #659

**Business and Property Division Rolls Building venue and hearing lists**

Branch: `feature/659-business-property-rolls-building-venue`

---

## 1. Technical Approach

This ticket is three loosely-coupled pieces of work. None of it is a greenfield venue creation.

### (a) Venue rename — not a create

`libs/location/src/location-data.ts:187-193` already holds:

```typescript
{
  locationId: 26,
  name: "Business and Property Courts Rolls Building",
  welshName: "Llysoedd Busnes ac Eiddo - Adeilad Rolls",
  regions: [11],
  subJurisdictions: [10]
}
```

The AC asks for "Business and Property **Division** Rolls Building". Rename `name` (and probably
`welshName` — see CQ-1) **in place**, keeping `locationId: 26`. A new `locationId` would orphan every
artefact and subscription already keyed on 26.

The seed generator handles the rename safely without any extra work:
- `generateRealignSql("location", ...)` (`apps/postgres/prisma/generate-seed-sql.ts:45-50, 70-74`)
  parks any row already holding the new `name`/`welsh_name` at a placeholder before the upsert, so the
  `UNIQUE(name)` / `UNIQUE(welsh_name)` constraints cannot trip.
- `generateLocationsSql` (`:91-95`) then upserts `ON CONFLICT (location_id) DO UPDATE SET name, welsh_name`.

**AC2, AC3 and the alphabetical ordering AC need no code change.** `apps/web/src/pages/(public)/summary-of-publications/index.ts:39`
builds the `h1` as `` `${t.titlePrefix} ${locationName}${t.titleSuffix}` `` from `en.ts:2-3`
("What do you want to view from" / "?"). The FaCT link is already `en.ts:9-11` and rendered by
`index.njk`. Ordering is already `localeCompare` on the localised friendly name (`index.ts:114-116`).
These are regression-coverage-only.

**The caution message is data, not code.** It is read from `location_metadata.caution_message` /
`welsh_caution_message` (`index.ts:127-131`; model at `libs/postgres-prisma/prisma/schema/location.prisma:120-133`)
and is managed only by system admins via `/location-metadata-manage`. `generate-seed-sql.ts` does not
touch `location_metadata`. See CQ-2.

### (b) Two new non-strategic (Excel) list types

Both are multi-sheet Excel uploads, so both follow the
`libs/list-types/london-administrative-court-daily-cause-list/` shape end to end
(converter → schema → validator → renderer → PDF → email summary → page).

**Package names are constrained, not a free choice.** `validateListTypeJson`
(`libs/list-types/common/src/validation/list-type-validator.ts:17, 63-70`) resolves the validator
package by `@hmcts/${kebabCase(listTypeName)}`. So the list type names fix the package directories:

| List type name | Package / directory |
|---|---|
| `BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST` | `libs/list-types/business-and-property-division-rolls-building-daily-cause-list` |
| `INTERIM_APPLICATIONS_DAILY_CAUSE_LIST` | `libs/list-types/interim-applications-daily-cause-list` |

Separately, `urlPath` in `listTypeData` must equal the page directory under
`apps/web/src/pages/(list-types)/`, because the venue landing page builds links as
`/{listType.url}?artefactId=...`.

**Column layout: reuse the ChD/KB 7-column set, not the RCJ one.** The Rolls Building lists this
consolidates already use `CHD_KB_EXCEL_CONFIG`
(`libs/list-types/chd-kb-common/src/conversion/chd-kb-excel-config.ts:3-19`):
*Judge, Time, Venue, Type, Case Number, Case Name, Additional Information*. Using the RCJ set
(*Venue, Judge, Time, Case Number, Case Details, Hearing Type, Additional Information*) would silently
change the published shape for Companies Winding Up / Financial List content moving into the new
consolidated list. `CHD_KB_EXCEL_CONFIG` has `minRows: 1`; the 16 optional tabs need `minRows: 0`, so
add a `CHD_KB_EXCEL_CONFIG_OPTIONAL` export to `chd-kb-common` rather than redefining the fields.
(Flagged as CQ-3 — it is a business-visible decision.)

**Section ordering is data, declared once.** A `SECTIONS` array in the Rolls Building package is the
single source of truth for worksheet name → data key → locale key → anchor id, and drives the converter
sheet list, the model type, the renderer output and the template loop. Sixteen hand-maintained
parallel lists is the main maintainability risk here.

**Judge details tab.** The Interim Applications template's second tab carries a judge name and email
interpolated into the open-justice wording. `createMultiSheetConverter` always returns arrays, so this
arrives as a 0- or 1-element array which the renderer flattens. No existing list type reads non-hearing
config from a spreadsheet tab, so this is genuinely new.

### (c) Soft-delete of superseded list types

The issue's "removed but retained in the code for MI Reporting from the database" maps exactly onto the
existing seed reconciliation. Deleting an entry from `listTypeData` causes
`generateSoftDeleteReconciliationSql` (`apps/postgres/prisma/generate-seed-sql.ts:151-156`) to emit:

```sql
UPDATE list_types SET deleted_at = NOW()
WHERE deleted_at IS NULL
  AND name NOT IN (<active names>)
  AND name NOT LIKE 'TEST_%' AND name NOT LIKE 'E2E_%';
```

The local path (`libs/location/src/seed-list-types.ts:87-98`) does the same. Re-adding a name clears
`deleted_at` (`generateListTypesSql` sets `deleted_at = NULL` on conflict, `:136`).

Of the 16 names in the issue's removal list, only these exist:

| Name | Line | `isNonStrategic` | Notes |
|---|---|---|---|
| `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` | `list-type-data.ts:751` | `false` (flat-file, `/manual-upload`) | remove |
| `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` | `:791` | `true` (Excel) | remove |
| `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` | `:802` | `true` (Excel) | remove |
| `CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST` | `:761` | `false` (flat-file) | **see CQ-4** |

The other 12 were never created — no work. Note the prior spec described all four as Excel uploads;
two of them are flat-file `isNonStrategic: false` entries and appear in `/manual-upload`, not
`/non-strategic-upload`.

Nothing outside `list-type-data.ts` references these names (verified by repo-wide grep), so removal is a
clean data edit. **Keep the packages, pages, converters, PDF generators and notification registry
entries** for `COMPANIES_WINDING_UP_CHD_...` and `FINANCIAL_LIST_CHD_KB_...` so historic artefacts keep
rendering and MI reporting keeps resolving the name.

---

## 2. Implementation Details

> **TEMPLATE SOURCE:**
> - Interim Applications Daily Cause List — migrate from pip-frontend `src/main/views/style-guide/interim-applications-chd-daily-cause-list.njk` (plus its en/cy locale content and `src/test/unit/views/style-guide/interim-applications-chd-daily-cause-list.test.ts`).
> - Business and Property Division Rolls Building Daily Cause List — no single pip-frontend equivalent exists (the 16-section consolidated list is new). Migrate the per-section table markup from pip-frontend's per-court style-guide templates (e.g. `src/main/views/style-guide/business-list-chd-daily-cause-list.njk`, `commercial-court-kb-daily-cause-list.njk`) and take the multi-section wrapper/contents-links structure from this repo's `london-administrative-court-daily-cause-list` page.

### 2.1 Reference data

`libs/location/src/location-data.ts:187-193` — rename `name` in place, keep `locationId: 26`,
`regions: [11]`, `subJurisdictions: [10]`.

`libs/list-types/common/src/list-type-data.ts` — add two entries with `isNonStrategic: true`
(this is what `findNonStrategicListTypes` at `libs/system-admin-pages/src/list-type/queries.ts:227`
filters on to populate the Excel-upload dropdown), `provenance: "CFT_IDAM"`,
`defaultSensitivity: "Public"`, `subJurisdictionIds: [10]`:

- `BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST`,
  `urlPath: "business-and-property-division-rolls-building-daily-cause-list"`,
  `welshFriendlyName: "Rhestr Achosion Dyddiol Adran Busnes ac Eiddo - Adeilad Rolls"` (given in the issue).
- `INTERIM_APPLICATIONS_DAILY_CAUSE_LIST`,
  `urlPath: "interim-applications-daily-cause-list"`,
  Welsh friendly name marked `[WELSH TRANSLATION REQUIRED: ...]`.

Then delete the three (or four, per CQ-4) superseded entries.

**No new Prisma schema and no migration.** `list_types`, `location` and `location_metadata` already
carry everything needed.

### 2.2 New package — Rolls Building (16 sections)

Mirrors `london-administrative-court-daily-cause-list` exactly (`package.json` with
`build` = `tsc && build:nunjucks && build:schemas`, `tsconfig.json`, `src/config.ts` exporting
`moduleRoot` + `schemaPath`, `src/index.ts` side-effect-importing the conversion config).

```
libs/list-types/business-and-property-division-rolls-building-daily-cause-list/src/
├── config.ts                     # moduleRoot, schemaPath
├── index.ts                      # import "./conversion/...-config.js" + exports
├── sections.ts                   # SECTIONS — single source of truth
├── models/types.ts               # RollsBuildingData, RollsBuildingSection
├── conversion/business-and-property-division-rolls-building-daily-cause-list-config.ts
├── schemas/business-and-property-division-rolls-building-daily-cause-list.json
├── validation/json-validator.ts  # validateBusinessAndPropertyDivisionRollsBuildingDailyCauseList
├── rendering/renderer.ts
├── email-summary/summary-builder.ts
├── pdf/{pdf-generator.ts,pdf-template.njk}
└── locales/{en.ts,cy.ts}
```

**`sections.ts`** — 16 entries of `{ dataKey, worksheetName, localeKey, anchorId }` in the issue's
order: Appeal List, Business List, Commercial Court, Financial List, Insolvency & Companies Court,
Intellectual Property and Enterprise Court, Intellectual Property List, London Circuit Commercial
Court, Patents Court, Property Trusts and Probate List, Technology and Construction Court, Admiralty
Court, Companies Winding Up, Competition List, Pensions List, Revenue List. `anchorId` is stored
literally (kebab-case, `&`/`,` stripped) rather than derived at render time, so anchor ids are stable
and testable.

**Converter** — build the `SheetConfig[]` by mapping `SECTIONS`; register with
`registerConverterByName` (`libs/list-types/common/src/conversion/non-strategic-list-registry.ts:20`).
`createMultiSheetConverter` (`multi-sheet-converter.ts:54-72`) resolves each sheet by name with a
positional-index fallback and yields `[]` for a sheet that resolves to neither.

**Renderer** — return `{ header, sections: [...] }`, an ordered array of
`{ id, heading, hearings }`, not 16 named variables. The template is then one loop and the
ordering AC is a one-line assertion.

**Schema** — root `type: "object"`, `required` listing all 16 keys, each `{ type: "array", items: { $ref: "#/$defs/hearing" } }`
with the hearing shape defined once under `$defs`. **Verified**: Ajv 8.20.0 as configured in
`libs/list-types/common/src/validation/json-validator.ts:4` (`new Ajv({ allErrors: true })`) resolves
`$defs`/`$ref` correctly against a `draft-07` `$schema` — no need to repeat 16 identical blocks.
Field patterns copy `london-administrative-court-daily-cause-list.json`
(no-HTML `^(?!(.|\r|\n)*<[^>]+>)(.|\r|\n)*$`, time `^\d{1,2}([:.]\d{2})?[ap]m\s*$`).

**Locales** — Welsh section headings, "Remote Hearings"/"Remote Judgments" copy and the five
listing-office contact lines are all supplied verbatim in the issue. Address strings copy the existing
Rolls Building values from `libs/list-types/companies-winding-up-chd-daily-cause-list/src/locales/en.ts:8-10`
("Rolls Building" / "Fetter Lane, London" / "EC4A 1NL") so the two pages agree. Contact details are a
`{ role, email }[]` array so the template can render `mailto:` anchors without string-splitting.

### 2.3 New package — Interim Applications (2 tabs)

Same structure, minus `sections.ts`. Differences:

- Model: `{ hearings: ChdKbHearing[]; judgeDetails: { judgeName: string; judgeEmail: string }[] }`.
- A local `JUDGE_DETAILS_CONFIG` (`minRows: 0`, fields `Judge Name` / `Judge Email`) for tab 2.
- Renderer interpolates `{judgeName}` / `{judgeEmail}` tokens into `t.judgeContactIntro`, falling back
  to a placeholder-free `t.judgeContactIntroNoJudge` when the tab is empty. The issue's copy contains a
  literal `[name, email address]`; shipping that bracketed placeholder to the public would be a defect.
- Schema: root object, `required: ["hearings", "judgeDetails"]`, `judgeDetails` `maxItems: 1` with an
  email `pattern`.

### 2.4 Shared common-lib changes

| File | Change |
|---|---|
| `libs/list-types/chd-kb-common/src/conversion/chd-kb-excel-config.ts` | Add `CHD_KB_EXCEL_CONFIG_OPTIONAL` = same fields, `minRows: 0`; export from `index.ts` |
| `libs/list-types/common/src/conversion/validators.ts` | Add `validateEmailFormat(value, rowNumber)` — currently only `validateTimeFormat` / `validateTimeFormatSimple` exist; export from `common/src/index.ts` |
| `libs/list-types/common/src/conversion/multi-sheet-converter.ts:66-69` | Wrap the per-sheet `convertSheetToJson` in try/catch and rethrow as `` `${sheet.worksheetName}: ${message}` `` — see §3 |

Also add `libs/list-types/common/src/conversion/multi-sheet-converter.test.ts` (none exists today).

### 2.5 Web pages

```
apps/web/src/pages/(list-types)/business-and-property-division-rolls-building-daily-cause-list/
├── index.ts   ├── ...njk   ├── index.test.ts   └── ...njk.test.ts
apps/web/src/pages/(list-types)/interim-applications-daily-cause-list/
├── index.ts   ├── ...njk   ├── index.test.ts   └── ...njk.test.ts
```

Both use `createSimpleListTypeHandler` (`apps/web/src/pages/(list-types)/list-type-handler.ts:107`)
with `export const ROUTES = ["/<urlPath>"]`, `createJsonValidator(schemaPath)`, and a `guardArtefact`
comparing `artefact.listTypeName !== SUPPORTED_LIST_TYPE` — **never `listTypeId`**. Copy
`london-administrative-court-daily-cause-list/index.ts:23-34` verbatim for the guard.

Template structure for the Rolls Building page (single loop, not 16 blocks):

- `h1#top`, FaCT paragraph, address lines, "List for"/"Last updated".
- `govukDetails({ open: true })` for the open-justice block: change-until-4:30pm paragraph, `h3` Remote
  Hearings + text, "Contact details:" list of `mailto:` anchors, listing-office line, `h3` Remote
  Judgments + text.
- Search input `#case-search-input`. **No JS change needed** —
  `apps/web/src/assets/js/table-search.ts:11-19` already falls back to the `.hearings-table` class
  selector, so it filters rows across all 16 tables and highlights in each.
- "Sections on this page" `<ul class="govuk-list govuk-list--spaced">` of in-page links to
  `#{{ section.id }}`.
- `{% for section in sections %}`: `h2` with `id="{{ section.id }}"`, then either a 7-column table with
  `aria-labelledby="{{ section.id }}"` (distinct accessible name per table — better than the repeated
  `aria-label` used at `london-administrative-court-daily-cause-list.njk:40`) or a `<p>` with
  `t.noHearingsMessage`.
- Data source line, "Back to top" → `#top`.

### 2.6 Registration checklist

| Where | Change |
|---|---|
| `tsconfig.json` (root) | `paths` entries for both packages **and** their `/config` subpaths (mirror `:67-70`) |
| `apps/web/package.json` | both as `workspace:*` |
| `libs/publication/package.json`, `libs/notifications/package.json` | both as `workspace:*` |
| `apps/web/src/app.ts:118-162` | add both `moduleRoot`s to `modulePaths` |
| `apps/web/src/pages/(admin)/non-strategic-upload/index.ts:1-10` | side-effect `import "@hmcts/..."` for both, so pre-flight conversion validation actually runs |
| `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts:1-17` | side-effect import for both |
| `libs/publication/src/processing/service.ts:148+` (`PDF_GENERATOR_REGISTRY`) | entries keyed on list-type **name** |
| `libs/notifications/src/notification/notification-service.ts:190+` | `{ extract, format }` entries keyed on name |

`apps/api/package.json` needs no change (existing list-type packages are not listed there).

**Pre-existing gap worth fixing while here:** `non-strategic-upload/index.ts` does *not* side-effect
import `@hmcts/london-administrative-court-daily-cause-list`, so `hasConverterForListTypeName` returns
false at `:149` and Excel validation is silently skipped on the upload page; the admin only discovers a
bad file at the summary step. Register the two new converters on **both** pages so validation happens
before the check-answers screen.

**Post-deploy data steps (not code):** a system admin must set the caution message on
`/location-metadata-manage` for location 26 (CQ-2) and add `/list-search-config` entries for both new
list types (`caseNumberFieldName: "caseNumber"`, `caseNameFieldName: "caseName"`) — otherwise
`extractAndStoreArtefactSearch` (`libs/publication/src/artefact-search-extractor.ts:146-148`) finds no
config and cross-artefact case search will not index the new lists.

---

## 3. Error Handling & Edge Cases

### 3.1 Conversion-time (Excel upload)

Errors thrown by field validators surface as a `govukErrorSummary` on `/non-strategic-upload`
(`index.ts:153-158` catches, stores in `req.session.nonStrategicUploadErrors`, redirects).

| Condition | Message source |
|---|---|
| Missing required cell | `excel-to-json.ts:152` — `Missing required field '<header>' in row N` |
| Malformed time | `validators.ts:33-35` — `Invalid time format '<v>' in row N. Expected format: h:mma...` |
| HTML in a cell | `excel-to-json.ts:36` — `Invalid content in '<field>' in row N: HTML tags are not allowed` |
| Wrong/missing header row on a tab | `excel-to-json.ts:122` — `Excel file must contain columns: ...` |
| Workbook with no sheets | `multi-sheet-converter.ts:61` — `Excel file must contain at least one worksheet` |
| Bad judge email | new `validateEmailFormat` — `Invalid email address in 'Judge Email' in row N` |

**Per-worksheet error ambiguity across 16 tabs (must fix).** Every message above is row-scoped only.
"Missing required field 'Case Number' in row 4" is unactionable in a 16-tab workbook — the admin cannot
tell which tab. `createMultiSheetConverter` currently propagates the raw error
(`multi-sheet-converter.ts:68`). Wrap it:

```typescript
try {
  result[sheet.dataKey] = worksheet ? await convertSheetToJson(worksheet, sheet.config) : [];
} catch (error) {
  throw new Error(`${sheet.worksheetName}: ${error instanceof Error ? error.message : String(error)}`);
}
```

Existing consumers (London Admin, Court of Appeal Civil) assert on error *fragments* via regex against
`convertExcelToJson` directly, not on the multi-sheet wrapper, so this is safe. Add tests for the
prefix.

**Missing or renamed Excel tab.** `createMultiSheetConverter` looks up by `worksheetName` then falls
back to `worksheets[worksheetIndex]`. Consequences to test and document:
- Tab absent *and* index out of range → `[]` → the section renders its empty message. Correct behaviour,
  and what makes the empty-section AC work without a special case.
- Tab **renamed but still in position** → still resolves by index. Silent but harmless.
- Tab **renamed and reordered** → resolves to the wrong section's data. Silent data corruption. There is
  no cheap guard inside the generic converter; mitigate by making the 16 tab names authoritative in the
  distributed template and stating in the upload guidance that tab names must not be edited. Raise as a
  known limitation rather than special-casing.

**Empty section (the normal case).** All 16 tabs use `minRows: 0`, so an empty tab is *not* an upload
error (`excel-to-json.ts:85-87` only throws below `minRows`). The renderer always emits all 16 sections
from `SECTIONS`, using `data[dataKey] ?? []`, so a section key missing from the blob entirely still
renders its heading plus "No hearings scheduled for this day". An empty section renders a `<p>`, never a
table with an empty `<tbody>`.

**Judge details tab.** `minRows: 0` — publishing without judge details must not hard-fail over a
cosmetic field; the wording falls back. Only the first data row is read; extra rows are ignored (state
this in the template guidance rather than erroring). If a row *is* present, both fields are required.

### 3.2 Render-time (JSON schema)

Mandatory per CLAUDE.md item 6 — the CI guard at
`libs/list-types/common/src/validation/guard.test.ts:11-45` fails any package that ships
`src/schemas/*.json` without a `validate*` export from `src/index.ts` (regex `export\s+.*validate[A-Z]`).

Each package gets `src/validation/json-validator.ts` wrapping `createJsonValidator(schemaPath)`,
exported from `index.ts`, plus `src/validation/json-validator.test.ts` running the **real** schema (no
mocks), with a fully-hydrated `VALID_DATA` fixture and **one `it` per required field at every nesting
level**, each deep-cloning via `JSON.parse(JSON.stringify(VALID_DATA))`.

For the Rolls Building list that is 16 sections × 6 required hearing fields. Generate them with
`describe.each(SECTIONS)` / `it.each(REQUIRED_FIELDS)` so each field is still asserted individually
without 96 hand-written blocks. Also assert: each missing top-level section key fails; a hearing with
HTML in `caseName` fails; a malformed `time` fails.

### 3.3 Page-level

`createSimpleListTypeHandler` covers all of these already: 400 missing `artefactId` (`:114-116`), 404
artefact not found (`:121-123`), 403 via `canAccessPublicationData` (`:125-137`), guard mismatch → 400
`Invalid List Type`, 404 blob missing (`:145-148`), 400 schema invalid (`:150-154`), 500 unexpected
(`:157-160`). No new error templates.

### 3.4 Untrusted judge name and email

`judgeName` / `judgeEmail` come from an uploaded spreadsheet and are rendered into prose and into a
`mailto:` href. Defence in depth:

1. `validateNoHtmlTags` on `Judge Name` at conversion time.
2. `validateEmailFormat` on `Judge Email` at conversion time.
3. JSON schema repeats both (`pattern` no-HTML, `pattern` email) at render time.
4. Nunjucks autoescaping — **do not** build the open-justice block as a concatenated `html:` string
   passed to `govukDetails` the way `london-administrative-court-daily-cause-list.njk:22-26` does, because
   that path concatenates raw locale strings and would need `| escape` on the interpolated values.
   Use `{% call govukDetails(...) %}` (or a plain `<details>` with GOV.UK classes) so `{{ judgeName }}`
   and `{{ judgeEmail }}` are escaped by default.
5. `mailto:` href built with `| urlencode` so a malformed address cannot break out of the attribute.
6. Template test asserting a `judgeName` of `<script>alert(1)</script>` renders escaped.

The five fixed listing-office addresses in the Rolls Building open-justice block are static locale
content and are safe as literal anchors.

### 3.5 Other edge cases

- **Volume.** 16 sections is the largest page in the service; the previous maximum is 2. A worst case of
  ~40 rows per section is ~640 rows / ~4,500 cells in one response, plus a PDF that may hit the existing
  max-size check. Measure once with a realistic fixture (CQ-5).
- **Client-side search filters rows, not sections.** A section whose rows are all filtered out keeps its
  heading and shows an empty table. That is existing behaviour of `table-search.ts` across every
  multi-table page; do not diverge here.
- **Welsh render with English-only data.** Hearing cell values come from the spreadsheet and are not
  translated; only chrome is localised. Same as every other list type.
- **Removed list types.** Their `/…-daily-cause-list` routes stay registered so historic artefact links
  keep working; every list-type query filters `deletedAt: null`, so they vanish from
  `/non-strategic-upload`, `/manual-upload`, `/view-list-types` and venue landing pages.

---

## 4. Acceptance Criteria Mapping

| # | Acceptance criterion | How satisfied | Verified by |
|---|---|---|---|
| 1 | Venue 'Business and Property Division Rolls Building' exists | Rename `locationId: 26` in `location-data.ts:187-193`; seed realign + `ON CONFLICT (location_id)` upsert applies it | `libs/location/src/location-data.test.ts` (name/welshName, region 11, subJurisdiction 10 unchanged); `apps/postgres/prisma/generate-seed-sql.test.ts` (rename emitted, idempotent) |
| 2 | Header reads "What do you want to view from Business and Property Division Rolls Building?" | No code change — `summary-of-publications/index.ts:39` composes it from `t.titlePrefix` + location name | `apps/web/src/pages/(public)/summary-of-publications/index.test.ts` (regression, both locales); E2E public journey |
| 3 | FaCT link rendered after the header, only the leading phrase anchored | No code change — `en.ts:9-11` + `index.njk` | `summary-of-publications/index.njk.test.ts` (regression: anchor `href`, anchor text, trailing text outside anchor) |
| 4 | Caution message displayed under the FaCT link | Rendering exists (`index.ts:127-131`); the English/Welsh text is entered as `location_metadata` for location 26 — **operational step, CQ-2** | `summary-of-publications/index.njk.test.ts` (regression: renders below FaCT, above the list links); manual/ops verification of the data on each environment |
| 5 | Only 2 list types publishable for this venue | Add both with `isNonStrategic: true`; delete the superseded entries so `findNonStrategicListTypes` no longer returns them | `libs/list-types/common/src/list-type-data.test.ts` (both present, superseded absent, `urlPath` matches page dir); E2E admin journey asserts dropdown contents |
| 6 | Other list types removed but retained in DB for MI reporting | Delete from `listTypeData` → `generateSoftDeleteReconciliationSql` sets `deleted_at` (`generate-seed-sql.ts:151-156`); packages/pages/registries retained | `apps/postgres/prisma/generate-seed-sql.test.ts` (soft-delete not hard-delete, `TEST_`/`E2E_` exempt, re-add clears `deleted_at`); `apps/postgres/prisma/seed.test.ts` |
| 7 | Rolls Building list renders 16 sections in the given order | `SECTIONS` drives converter, renderer and template loop | `sections.test.ts` (order, unique anchor ids); `rendering/renderer.test.ts` (16 sections, order, localised headings en+cy); `...njk.test.ts` (16 `h2` in order via Cheerio) |
| 8 | Empty section shows "No hearings scheduled for this day" | `minRows: 0` on every tab; renderer emits all 16 from `SECTIONS` with `?? []`; template branches on `section.hearings.length` | `conversion/...-config.test.ts` (empty tab → `[]`, missing tab → `[]`); `...njk.test.ts` (heading + `<p>` and **no** table when empty; table and **no** `<p>` when populated; Welsh message) |
| 9 | Updated Rolls Building open-justice wording | Locale keys for 4:30pm text, Remote Hearings, 5 contact emails, listing-office line, Remote Judgments | `...njk.test.ts` (all 5 `mailto:` anchors with the address as link text; `h3` headings; Welsh copy); `locales` key-parity test |
| 10 | Interim Applications judge name/email drive the wording | Tab 2 → `judgeDetails[0]`; renderer interpolates `{judgeName}`/`{judgeEmail}`; fallback copy when absent | `rendering/renderer.test.ts` (interpolated; fallback contains no `[name, email address]`); `...njk.test.ts` (escaped output, encoded `mailto:` href, XSS fixture) |
| 11 | Rolls Building lists ordered alphabetically under the caution message | No code change — `localeCompare` sort at `summary-of-publications/index.ts:114-116` | `summary-of-publications/index.test.ts` (regression: "Business and Property…" sorts above "Interim Applications…") |
| 12 | Excel multi-tab template supports the multi-section list | `createMultiSheetConverter` over 16 `SheetConfig`s built from `SECTIONS`; registered via `registerConverterByName` | `conversion/...-config.test.ts` (16-tab workbook → all keys populated; tabs matched by name so reordering is stable); `libs/list-types/common/src/conversion/multi-sheet-converter.test.ts` |
| 13 | Interim Applications published via Excel with a 2-tab template | `createMultiSheetConverter` over `Hearings` + `Judge details` | `conversion/...-config.test.ts` (both tabs; invalid email rejected; blank judge tab → `[]`; extra judge rows ignored) |
| 14 | Welsh translations throughout | Welsh strings from the issue used verbatim; the rest marked `[WELSH TRANSLATION REQUIRED: ...]` | `locales` parity test (`Object.keys(en).sort()` === `Object.keys(cy).sort()`, incl. nested `sectionHeadings`/`tableHeaders`); `...njk.test.ts` rendered with `cy`; E2E `?lng=cy` |
| — | Downstream parity (PDF, subscription email) | `PDF_GENERATOR_REGISTRY` + notification registry entries keyed on name | `pdf/pdf-generator.test.ts` (all 16 sections incl. empty; failure returns an error result, does not throw); `email-summary/summary-builder.test.ts` (one summary per hearing across all sections); `libs/publication/src/processing/service.test.ts` and `notification-service.test.ts` resolve both by name |
| — | Accessibility (WCAG 2.2 AA) | `aria-labelledby` per table, one `h1`, `h2` per section, `h3` only inside the details block, visually-hidden search label, spaced jump links | `...njk.test.ts` (unique table accessible names, jump-link hrefs match heading ids 1:1); Axe scan inline in the Playwright journey tests |

---

## 5. CLARIFICATIONS NEEDED

**CQ-1 — Does the venue's Welsh name change?** The issue gives a Welsh *list type* name
("Rhestr Achosion Dyddiol Adran Busnes ac Eiddo - Adeilad Rolls") but no Welsh *venue* name. The
existing value is "Llysoedd Busnes ac Eiddo - Adeilad Rolls" — "Llysoedd" is "Courts", not "Division".
**Recommendation:** change it to "Adran Busnes ac Eiddo - Adeilad Rolls" for consistency with the new
English name and with the supplied list-type translation, but get it confirmed by the Welsh language
team before merge. `location.welsh_name` is `UNIQUE`; the seed's realign step handles the change safely.

**CQ-2 — Who enters the caution message, and where?** `location_metadata` is admin-managed via
`/location-metadata-manage` and is not covered by any seed. Options: (a) a system admin enters the
English and Welsh caution text on each environment — no code, but manual and easy to miss on STG;
(b) extend `generate-seed-sql.ts` to seed `location_metadata`, which is deterministic but would
overwrite admin edits on every deploy. **Recommendation: (a)**, with the exact English and Welsh copy
handed to ops in the release notes and a post-deploy verification step. AC4 cannot be signed off on an
environment until this is done. Also confirm the Welsh translation of the second sentence ("If you do
not see a list published for the court you are looking for…") — the issue supplies only the first.

**CQ-3 — Which 7 columns does each section table use?** The issue never specifies. Two precedents
exist: the ChD/KB set already used by the Rolls Building lists being consolidated
(`chd-kb-excel-config.ts:3-19` — Judge, Time, Venue, Type, Case Number, Case **Name**, Additional
Information) and the RCJ set (`rcj-field-configs.ts:63` — Venue, Judge, Time, Case Number, Case
**Details**, Hearing Type, Additional Information). **Recommendation: the ChD/KB set**, so content
migrating from Companies Winding Up / Financial List keeps the same shape and publishers keep the same
spreadsheet columns. Needs sign-off because it determines the distributed Excel template.

**CQ-4 — Is `CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST` in scope?** The issue names "London Circuit
Commercial Court (KB) daily cause list"; the existing entry (`list-type-data.ts:761`) is "Circuit
Commercial Court Daily Cause List", not London-scoped, and may serve other venues. Soft-deleting it
would remove it service-wide. **Recommendation: leave it in place** and treat it as out of scope until
the business confirms it is London-only.

**CQ-5 — Is the 16-section order literal or should it be alphabetical?** Items 1–11 are alphabetical,
then items 12–16 restart alphabetically (Admiralty Court … Revenue List). That reads like two lists
concatenated. **Recommendation: implement the issue's literal order**, since `SECTIONS` makes reordering
a one-line change if the business corrects it. Confirm before UAT, not before build.

**CQ-6 — How do the 16 removed list names map to the 16 new section headings?** They are not 1:1:
"Chancery Appeals (ChD)" is removed but the section is "Appeal List"; "Financial List (ChD/KB)" is
removed but the section is "Financial List". MI reporting needs an explicit old-name → new-section
mapping to reconcile pre- and post-change data. **Recommendation:** ask the MI/reporting owner for the
mapping and record it in this ticket; no code depends on it, but reporting continuity does.

**CQ-7 — What happens to existing subscriptions on the removed list types?** Subscribers will silently
stop receiving emails rather than being migrated to the consolidated list or notified.
**Recommendation:** confirm whether a one-off migration (repoint subscriptions to the new list type) or
a notification email is required. Currently out of scope; if in scope it is a separate ticket with its
own data migration.

**CQ-8 — Are the two Excel templates a deliverable of this ticket?** The repo holds no downloadable
templates. The 16-tab and 2-tab workbooks need to exist somewhere for publishers to use, and their tab
names are load-bearing (a renamed-and-reordered tab silently lands data in the wrong section).
**Recommendation:** the workbooks are a business deliverable owned outside the repo, but this ticket
should produce the authoritative tab-name and column-header list and commit a fixture workbook under
`e2e-tests/fixtures/` for the admin journey test.

**CQ-9 — Confirm the displayed address.** The existing Rolls Building pages show "Rolls Building /
Fetter Lane, London / EC4A 1NL" (`companies-winding-up-chd-daily-cause-list/src/locales/en.ts:8-10`).
The prior spec proposed "7 Rolls Buildings, Fetter Lane, London". **Recommendation: reuse the existing
values verbatim** so the Rolls Building pages agree with each other; flag to content design if the
street number should be added, in which case update both packages together.

**CQ-10 — Who owns the `/list-search-config` entries?** Without a row for each new list type,
`extractAndStoreArtefactSearch` finds no config and the new lists are not indexed for cross-artefact
case search. **Recommendation:** treat it as a post-deploy admin step alongside CQ-2, with
`caseNumberFieldName: "caseNumber"` and `caseNameFieldName: "caseName"` (matching the ChD/KB field
names per CQ-3), and add it to the release checklist.
