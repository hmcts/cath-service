# Technical Plan — #806 Intellectual Property List (ChD) daily cause list

## 1. Technical Approach

### Summary

This is a **non-strategic** list type published via the CaTH Excel upload route. The JSON
shape required by the ticket is:

```json
{ "judge", "time", "venue", "type", "caseNumber", "caseName", "additionalInformation" }
```

That is **byte-for-byte the shape already implemented** by
`libs/list-types/chd-kb-common` (`ChdKbHearing`), which was extracted when
`COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` was built precisely so that further
Chancery Division / King's Bench lists could reuse it.

So this ticket is **not** a new schema/converter/renderer. It is:

- a new **thin wrapper package** that supplies list-type-specific locale content
  (page title, venue block, important-information text) and its own PDF template, and
- **registration** of that package under the new list type name in every registry.

The `@hmcts/companies-winding-up-chd-daily-cause-list` package is the exact template
to copy. Do not author a new JSON schema, a new `ExcelConverterConfig`, a new hearing
interface, or new rendering/summary logic — all four already exist in
`@hmcts/chd-kb-common` and reusing them is the established pattern (see the explanatory
comments in `libs/list-types/companies-winding-up-chd-daily-cause-list/src/index.ts`).

### Architecture decisions

| Decision | Rationale |
|---|---|
| Reuse `@hmcts/chd-kb-common` for schema, types, Excel field config, renderer core and email summary | Identical 7-field shape and column order. Duplicating would violate DRY and create two schemas to keep in sync. |
| New package `@hmcts/intellectual-property-list-chd-daily-cause-list`, **not** a `PACKAGE_ALIASES` entry | The dynamic validator dispatcher (`libs/list-types/common/src/validation/list-type-validator.ts`) resolves `@hmcts/<kebab-case-list-type-name>`. A real package is needed anyway to hold the IP-specific locales and PDF template. |
| No new `.prisma` model, no migration | List types are reference data rows in the existing `list_type` table. |
| No change to `libs/location/src/location-data.ts` | Location 26 "Business and Property Courts Rolls Building" already exists with `regions: [11]` (Royal Courts of Justice Group) and `subJurisdictions: [10]` (High Court → jurisdiction 1 "Civil"). AC 1 is satisfied purely by giving the new list type `subJurisdictionIds: [10]`. |
| Keyed on the string `name` everywhere | `ListType.id` is autoincrement and environment-specific (CLAUDE.md, List Type Implementation). |

### Reference data — the exact wiring for AC 1

Already present, **no edits needed**:

```
location 26  "Business and Property Courts Rolls Building"  regions: [11]  subJurisdictions: [10]
region   11  "Royal Courts of Justice Group"
subJur   10  "High Court"  → jurisdictionId 1
jurisd    1  "Civil"
```

Adding `subJurisdictionIds: [10]` to the new list type is therefore the whole of AC 1.

## 2. Implementation Details

### TEMPLATE SOURCE

**migrate from pip-frontend `intellectual-property-list-chd-daily-cause-list`**

Use the `migrate-pip-pages` skill during implementation to fetch and adapt the legacy
`.njk` and its `en`/`cy` locale content from `hmcts/pip-frontend`. This matters
specifically for the **important-information / guidance text**, which is IP-List-specific
and differs from the Companies Winding Up copy (whose important information is the
"Company Insolvency Pro Bono Scheme" block — that must **not** be carried over).

The reference styling in the AC is:
`https://pip-frontend.staging.platform.hmcts.net/intellectual-property-list-chd-daily-cause-list?artefactId=1259e7ea-52be-4b52-9f03-a6337033526a`

Structurally the in-repo `companies-winding-up-chd-daily-cause-list.njk` is already the
correct shape (same 7 columns, same header/venue/details/search/table/back-to-top
layout), so the migrated pip markup should be reconciled against it and the in-repo
version preferred wherever they differ on GOV.UK component usage.

### New package: `libs/list-types/intellectual-property-list-chd-daily-cause-list/`

```
package.json                    # copy of companies-winding-up's; name + deps identical
tsconfig.json                   # copy verbatim
src/
  config.ts                     # moduleRoot + assets (copy verbatim)
  index.ts                      # re-exports from @hmcts/chd-kb-common under IP names
  locales/en.ts                 # NEW content — from pip-frontend
  locales/cy.ts                 # NEW content — from pip-frontend (or flagged placeholders)
  conversion/intellectual-property-list-chd-daily-cause-list-config.ts
  rendering/renderer.ts         # thin wrapper over renderChdKbHearingList
  pdf/pdf-generator.ts          # thin wrapper, own pdf-template.njk
  pdf/pdf-template.njk          # copy of companies-winding-up's, info box adapted
```

Note there is **no `src/schemas/`** and **no `src/validation/`** directory — the schema
and validator live in `@hmcts/chd-kb-common`. The CI guard test
(`libs/list-types/common/src/validation/guard.test.ts`) only fires for packages that
*ship* a `src/schemas/*.json`, so this is compliant and matches the precedent.

`src/index.ts` (mirroring the precedent, including the comments that explain *why* the
re-exports exist):

```typescript
import "./conversion/intellectual-property-list-chd-daily-cause-list-config.js"; // Register converter on module load

export type {
  ChdKbHearing as IntellectualPropertyListChdHearing,
  ChdKbHearingList as IntellectualPropertyListChdHearingList
} from "@hmcts/chd-kb-common";
export {
  extractCaseSummary,
  formatCaseSummaryForEmail,
  SPECIAL_CATEGORY_DATA_WARNING,
  validateChdKbListType as validateIntellectualPropertyListChdDailyCauseList
} from "@hmcts/chd-kb-common";
export type { ValidationResult } from "@hmcts/publication";
export { cy as intellectualPropertyListChdDailyCauseListCy } from "./locales/cy.js";
export { en as intellectualPropertyListChdDailyCauseListEn } from "./locales/en.js";
export * from "./pdf/pdf-generator.js";
export * from "./rendering/renderer.js";
```

`src/conversion/...-config.ts`:

```typescript
import { CHD_KB_EXCEL_CONFIG } from "@hmcts/chd-kb-common";
import { createConverter, registerConverterByName } from "@hmcts/list-types-common";

export const INTELLECTUAL_PROPERTY_LIST_CHD_EXCEL_CONFIG = CHD_KB_EXCEL_CONFIG;

registerConverterByName(
  "INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST",
  createConverter(INTELLECTUAL_PROPERTY_LIST_CHD_EXCEL_CONFIG)
);
```

This gives AC 2 (field order) and AC 3 (Excel → JSON) for free — `CHD_KB_EXCEL_CONFIG`
already declares the Excel headers in exactly the ticket's order:
`Judge, Time, Venue, Type, Case Number, Case Name, Additional Information`.

### Reference data

`libs/list-types/common/src/list-type-data.ts` — add next to the Companies Winding Up entry:

```typescript
{
  name: "INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST",
  englishFriendlyName: "Intellectual Property List (Chancery Division) Daily Cause List",
  welshFriendlyName: "<Welsh>",
  shortenedFriendlyName: "Intellectual Property List (ChD) Daily Cause List",
  provenance: "CFT_IDAM",
  urlPath: "intellectual-property-list-chd-daily-cause-list",
  isNonStrategic: true,
  defaultSensitivity: "Public",
  subJurisdictionIds: [10]
}
```

No hand-written `.sql`. `apps/postgres/prisma/generate-seed-sql.ts` generates the
idempotent `INSERT ... ON CONFLICT` on deploy; `yarn db:seed` covers local.

### Registration points (all follow the Companies Winding Up precedent exactly)

| File | Change |
|---|---|
| `tsconfig.json` (root) | add `@hmcts/intellectual-property-list-chd-daily-cause-list` and `/config` paths |
| `apps/web/package.json` | add `workspace:*` dep |
| `libs/publication/package.json` | add `workspace:*` dep |
| `libs/notifications/package.json` | add `workspace:*` dep |
| `apps/web/src/app.ts` | import `moduleRoot as intellectualPropertyChdModuleRoot` from `/config`; add to `modulePaths` |
| `apps/web/src/pages/(admin)/non-strategic-upload/index.ts` | side-effect `import "@hmcts/intellectual-property-list-chd-daily-cause-list";` to register the converter |
| `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts` | same side-effect import |
| `libs/publication/src/processing/service.ts` | add `INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST` to `PDF_GENERATOR_REGISTRY` (keyed by name, `~line 187`) |
| `libs/notifications/src/notification/notification-service.ts` | add aliased `extractCaseSummary`/`formatCaseSummaryForEmail` imports and a registry entry (`~line 194`) |

The list type appears in the non-strategic upload dropdown automatically —
`findNonStrategicListTypes()` reads `isNonStrategic: true` from the DB.

### Web page: `apps/web/src/pages/(list-types)/intellectual-property-list-chd-daily-cause-list/`

```
index.ts                                                     # controller
intellectual-property-list-chd-daily-cause-list.njk           # template
index.test.ts                                                # controller tests
intellectual-property-list-chd-daily-cause-list.njk.test.ts   # template tests
```

Controller uses `createSimpleListTypeHandler` from `../list-type-handler.js` with a
`guardArtefact` that checks `artefact.listTypeName !== "INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST"`
— never a numeric id — and `resolveDataSource(artefact.provenance, t)`.

### No API endpoints, no schema changes

PDF download is served by the existing `/api/pdf/:artefactId/download` route; the
publication pipeline stores the PDF at publish time via `generatePublicationPdf`.

## 3. Error Handling & Edge Cases

| Case | Handling |
|---|---|
| Wrong list type for this page | `guardArtefact` → HTTP 400 `errors/common` |
| Empty hearings array | `{% else %}` branch renders `t.noHearingsMessage`. `CHD_KB_EXCEL_CONFIG.minRows: 1` rejects a header-only upload at conversion time. |
| Missing required field in Excel | `required: true` on all 7 fields → converter error naming the row |
| Bad `time` value | `validateTimeFormatSimple` in the converter and the schema pattern `^\d{1,2}([:.]\d{2})?\s*[ap]m\s*$`. Confirmed both ticket examples pass: `9am` ✓, `10:30pm` ✓. Note this rejects 24-hour times and ranges like `10:30am - 12pm`. |
| HTML injection in any text field | `validateNoHtmlTags` per field plus the negative-lookahead schema pattern |
| Welsh locale | `en`/`cy` key parity asserted in the template test; Welsh strings must be present or explicitly marked `[WELSH TRANSLATION REQUIRED: '...']` |
| Non-JSON/non-Excel upload | Existing non-strategic upload validation, unchanged |

### Pre-existing wart to fix while here

`libs/list-types/chd-kb-common/src/schemas/chd-kb-common.json` has
`"title": "Companies Winding Up (Chancery Division) Daily Cause List"`. Once a second
list type shares it, that title is wrong. Change it to a shape-describing title, e.g.
`"Chancery Division / King's Bench shared daily cause list"`. `title` is not used for
validation, so this is safe.

## 4. Acceptance Criteria Mapping

| AC | How satisfied | Verification |
|---|---|---|
| Created under Business and Property Courts Rolls Building, Civil jurisdiction, Royal Courts of Justice Group region | `subJurisdictionIds: [10]` in `list-type-data.ts`; location 26 already carries region 11 + subJurisdiction 10 | `yarn db:seed`, then confirm the list type is offered for location 26 in the non-strategic upload journey |
| Fields in order: Judge, Time, Venue, Type, Case Number, Case Name, Additional Information | `CHD_KB_EXCEL_CONFIG.fields` already in that order; schema `required` array in that order | Existing `chd-kb-excel-config.test.ts` + `json-validator.test.ts`; new converter-config test asserts registration and field order |
| Published through the Excel upload route, converted to JSON | `registerConverterByName("INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST", ...)` + side-effect imports in both non-strategic upload pages | Converter-config unit test; manual upload of the Excel template |
| Validation schema and style guide created | Schema reused from `chd-kb-common` and re-exported as `validateIntellectualPropertyListChdDailyCauseList` so the dynamic dispatcher resolves it; style guide = the new `.njk` + locales | Guard test; controller + template tests; `?lng=cy` check |
| PDF **and Excel** downloadable version | PDF: `generateIntellectualPropertyListChdDailyCauseListPdf` registered in `PDF_GENERATOR_REGISTRY`. **Excel: gap — see Open Questions Q1.** | PDF generator unit test; download the PDF from a published artefact |
| Style guide follows the pip-frontend structure | `migrate-pip-pages` skill against `intellectual-property-list-chd-daily-cause-list`, reconciled with the in-repo Companies Winding Up template | Visual comparison against the staging URL; axe check in E2E |
| JSON format as specified | `ChdKbHearing` is exactly those 7 fields | `validateChdKbListType` against the ticket's exact JSON as a fixture |

## 5. Testing

Follow `.claude/rules/testing.md`. New tests:

- `src/conversion/...-config.test.ts` — converter registered under the correct name; field order and headers.
- `src/rendering/renderer.test.ts` — header uses `t.pageTitle` for `en` and `cy`; hearings passed through.
- `src/pdf/pdf-generator.test.ts` — success path, storage call, error path (copy the precedent's).
- `apps/web/.../index.test.ts` — renders for the supported list type; 400 for a mismatched `listTypeName` (fixture uses `listTypeId: 999` to prove ID-independence); `en`/`cy` selection.
- `apps/web/.../*.njk.test.ts` — Cheerio structural assertions: 7 `th` in order, one row per hearing, `noHearingsMessage` when empty, Welsh headings with the `cy` locale, `Object.keys(en).sort()` equals `Object.keys(cy).sort()`.

E2E: extend the existing non-strategic upload admin journey rather than adding a new
spec file, per the minimise-test-count rule. One journey: upload the IP Excel template →
publish → view the page → axe check → Welsh toggle → PDF download.

## 6. CLARIFICATIONS NEEDED

**Q1 — Excel download (blocking for one AC).** The AC asks for "a PDF **and Excel**
downloadable version of each hearing list". There is currently **no** Excel download for
any non-strategic list type: `EXCEL_GENERATOR_REGISTRY` in
`libs/publication/src/processing/service.ts` contains only the Magistrates and SJP lists,
and the direct precedent (`COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST`, already merged)
ships **PDF only**. The uploaded source `.xlsx` is not retained as a downloadable
artefact either — `storeNonStrategicUpload` keeps it in Redis with a 1-hour TTL purely
for the upload journey. So satisfying this AC means new work: either a
`generateIntellectualPropertyListChdExcel` generator registered in
`EXCEL_GENERATOR_REGISTRY` plus a download link on the page, or persisting the source
upload to blob storage. Which do you want — and should it be done for this list type
alone, or raised as a separate ticket covering all CHD/KB non-strategic lists so this one
matches the Companies Winding Up precedent?

**Q2 — Welsh translations.** Are approved Welsh strings available for the page title,
venue block and important-information text? If not, implementation will use
`[WELSH TRANSLATION REQUIRED: '...']` placeholders (CLAUDE.md pattern) and a follow-up
ticket is needed. The `tableHeaders` and boilerplate can be reused verbatim from
`companies-winding-up-chd-daily-cause-list/src/locales/cy.ts`.

**Q3 — Important information content.** Companies Winding Up shows a "Company Insolvency
Pro Bono Scheme" details block. Does the IP List have its own important-information
text, and if so is the pip-frontend staging page the authoritative source, or is there a
separate content sign-off? If there is no such content, the `govukDetails` block should
be omitted rather than left empty.

**Q4 — `time` format.** The schema pattern only accepts 12-hour times with an am/pm
suffix (`9am`, `10:30pm`). Is that sufficient for IP List data, or do real uploads
contain 24-hour times, ranges (`10:30am - 12pm`), or values like `Not before 2pm`? If so
the shared `chd-kb-common` schema and `validateTimeFormatSimple` need relaxing — which
would also affect Companies Winding Up.

**Q5 — Venue/address block.** Confirm the header should show "Rolls Building, Fetter
Lane, London, EC4A 1NL" (same as Companies Winding Up), given the list is filed under
"Business and Property Courts Rolls Building".

**Q6 — `shortenedFriendlyName`.** Proposed
`"Intellectual Property List (ChD) Daily Cause List"` — this is the label shown in the
non-strategic upload dropdown. Confirm the exact wording, and the full
`englishFriendlyName` (`"Intellectual Property List (Chancery Division) Daily Cause
List"`).
