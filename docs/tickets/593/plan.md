# Technical Plan — #593: Employment Tribunal Lists

Implements two list types together:

- `et-daily-list` → `ET_DAILY_LIST`
- `et-fortnightly-list` → `ET_FORTNIGHTLY_PRESS_LIST`

Reference implementation followed throughout: `libs/list-types/civil-and-family-daily-cause-list/`
(which delegates rendering + PDF plumbing to `libs/list-types/daily-cause-list-common/`).

---

## 1. Technical Approach

### 1.1 Two libs, one shared engine

The ticket is explicit: **each list type gets its own lib and its own schema file** (`et-daily-list.json`,
`et-fortnightly-press-list.json`), copied verbatim from pip-data-management. Schemas are NOT shared, because the
`party[].partyRole` enums differ and each schema must independently validate its own uploads (the CI guard test in
`libs/list-types/common/src/validation/guard.test.ts` requires a `validate*` export per package that ships a schema).

However, the two ET schemas are structurally near-identical to each other **and** to
`CIVIL_AND_FAMILY_DAILY_CAUSE_LIST` (same `document` / `venue` / `courtLists[].courtHouse.courtRoom[].session[].sittings[].hearing[].case[].party[]`
shape). The reference module already extracts all rendering/PDF logic into `@hmcts/daily-cause-list-common`:

- `renderCauseListData(jsonData, { locationId, contentDate, locale })` — computes header, address lines,
  `sitting.time`, `sitting.durationAsHours` / `durationAsMinutes`, `sitting.caseHearingChannel` (from `channel[]`),
  and per-case `applicant` / `applicantRepresentative` / `respondent` / `respondentRepresentative`
  (keyed off `partyRole`, covering all four roles the fortnightly list uses).
- `CauseListData` and related types.
- PDF plumbing helpers (`configureNunjucks`, `loadTranslations`, `savePdfToStorage`, `createPdfErrorResult`,
  `BasePdfGenerationOptions`, `PDF_BASE_STYLES`) from `@hmcts/list-types-common`.

**Decision: both ET libs depend on `@hmcts/daily-cause-list-common` and reuse `renderCauseListData` + the shared
types verbatim** — exactly as `civil-and-family-daily-cause-list` does. This is the established, tested reuse point;
duplicating a renderer per list type would violate DRY and diverge from the reference.

The renderer already computes everything the 7 ET columns need:

| ET column | Source on rendered object |
|-----------|---------------------------|
| Start Time | `sitting.time` (formatted from `sittingStart`) |
| Duration | `sitting.durationAsHours` / `durationAsMinutes` (derived `sittingStart`→`sittingEnd`) |
| Case Number | `case.caseNumber` (+ `caseSequenceIndicator` if present) |
| Claimant | `case.applicant` (from `partyRole = APPLICANT_PETITIONER`) [+ `case.applicantRepresentative` for fortnightly] |
| Respondent | `case.respondent` (from `partyRole = RESPONDENT`) [+ `case.respondentRepresentative` for fortnightly] |
| Hearing Type | `hearing.hearingType` |
| Hearing Platform | `sitting.caseHearingChannel` (from `channel[]`) |

"Claimant" / "Respondent" are ET display **labels** bound to the shared `applicant` / `respondent` fields. This is a
label-only difference at template level — no renderer fork required.

### 1.2 Per-lib differences

The two ET libs are near-identical. Real differences:

1. **Schema file** — `et_daily_list.json` vs `et_fortnightly_press_list.json` (different `partyRole` enums).
2. **Locale `title`** — daily vs fortnightly (see upstream-bug notes in §5).
3. **Representative display** — fortnightly renders `rep` / `noRep` (representative parties); daily does not.
   Both use the same shared renderer output; the fortnightly template/PDF additionally surface
   `applicantRepresentative` / `respondentRepresentative` with the `rep` / `noRep` locale strings. Daily simply omits
   the representative markup (its schema enum forbids representative roles anyway, so those fields are always empty).

Everything else (config, index, validator wrapper shape, PDF generator shape, page controller wiring) is
copy-adapt from the reference.

### 1.3 What is NOT needed

- **No Excel converter / `registerConverterByName`.** The reference `civil-and-family-daily-cause-list` does not
  register an Excel converter — it is a strategic JSON list (`isNonStrategic: false`), uploaded as JSON and validated
  against its schema. ET daily/fortnightly are the same. `registerConverterByName` is only for non-strategic Excel
  lists (SIAC/UTIAC-JR). The ticket's "Excel/JSON converters registered by name" checklist item is a generic-checklist
  carry-over and does not apply here (flagged in §5).
- **No `email-summary/summary-builder.ts` yet.** The ticket explicitly defers this to a TODO ("once email summary
  requirements are confirmed"). Do not build it.
- **No new Prisma schema.** List types live in the `list_type` table seeded from `listTypeData`; no model changes.

---

## 2. Implementation Details

### 2.1 Lib file structure (per lib — shown for et-daily-list; et-fortnightly-list identical bar names)

```
libs/list-types/et-daily-list/
├── package.json                         # name @hmcts/et-daily-list; deps: daily-cause-list-common, list-types-common,
│                                        #   pdf-generation, postgres-prisma, luxon, nunjucks (mirror reference)
├── tsconfig.json                        # copy reference verbatim (resolveJsonModule: true)
└── src/
    ├── config.ts                        # moduleRoot, assets ("../assets/"), schemaPath (schemas/et-daily-list.json)
    ├── index.ts                         # re-export types/renderer/pdf + locale + validateEtDailyList
    ├── schemas/
    │   └── et-daily-list.json           # copied verbatim from pip-data-management et_daily_list.json
    ├── models/
    │   └── types.ts                     # re-export CauseListData & friends from @hmcts/daily-cause-list-common
    ├── validation/
    │   ├── json-validator.ts            # validateEtDailyList(jsonData) → validateJson(..., schema, "1.0")
    │   └── json-validator.test.ts       # one `it` per required field at every nesting depth (see §2.6)
    ├── rendering/
    │   ├── renderer.ts                  # re-export renderCauseListData from @hmcts/daily-cause-list-common
    │   └── renderer.test.ts             # thin test asserting re-export identity / smoke render
    ├── locales/
    │   ├── en.ts                        # ET daily EN content (see §2.4)
    │   └── cy.ts                        # ET daily CY content
    └── pdf/
        ├── pdf-generator.ts             # generateEtDailyListPdf (mirror generateCauseListPdf)
        ├── pdf-template.njk             # 7-column ET PDF layout + Open Justice accordion text
        └── pdf-generator.test.ts        # mirror reference pdf-generator.test.ts
```

`et-fortnightly-list` mirrors this with:
- `schemas/et-fortnightly-press-list.json`
- `validation/json-validator.ts` → `validateEtFortnightlyPressList`
- `pdf/pdf-generator.ts` → `generateEtFortnightlyPressListPdf`
- fortnightly locale `title` + `rep` / `noRep` keys; PDF/HTML render representative rows.

> The ticket's module-structure checklist lists `src/pages/…` inside the lib. Per the current project convention
> (CLAUDE.md + the reference module), **page controllers/templates live in `apps/web/src/pages/`, not the lib**. Follow
> the reference module's actual layout (pages in apps/web), not the checklist's older lib-pages wording. Flagged in §5.

### 2.2 config.ts (per lib)

```ts
export const moduleRoot = __dirname;
export const assets = path.join(__dirname, "../assets/");
export const schemaPath = path.join(__dirname, "schemas/et-daily-list.json"); // or et-fortnightly-press-list.json
```

### 2.3 Validator wrapper

Reference uses `validateJson(data, schema, "1.0")` from `@hmcts/publication` with a static
`import schema ... with { type: "json" }`. Follow that exact shape (do NOT hand-roll `createJsonValidator`; keep
parity with the reference which the whole app registry already understands):

```ts
// libs/list-types/et-daily-list/src/validation/json-validator.ts
import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/et-daily-list.json" with { type: "json" };

export function validateEtDailyList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
```

`index.ts` must export it so the guard test and dynamic `validateListTypeJson` (kebab-case package lookup) find it:
```ts
export { validateEtDailyList } from "./validation/json-validator.js";
```
(Kebab package names `et-daily-list` / `et-fortnightly-list` match the `listLookup.json` `url` values and the
`convertListTypeNameToKebabCase` output for `ET_DAILY_LIST` / `ET_FORTNIGHTLY_PRESS_LIST`? — note mismatch: kebab of
`ET_FORTNIGHTLY_PRESS_LIST` is `et-fortnightly-press-list`, but the package/url is `et-fortnightly-list`. See §5 and
the `PACKAGE_ALIASES` note in 2.7.)

### 2.4 Locale files

Both ET libs share the same locale keys (ticket "Page content" tables). Provide EN + CY with identical structure.
Include the keys `renderCauseListData` and both templates consume, plus the Open Justice `openJustice1`–`openJustice6`
strings, `tableHeaders` (7 columns), error keys (`errorTitle`, `errorMessage`, `error403Title`, `error403Message`),
`dataSource`, `venue`, `courtRoom`, `backButton`, duration singular/plural, and — fortnightly only — `rep` / `noRep`.

- Daily `title`: EN "Employment Tribunals Daily List" / CY "Rhestr Ddyddiol y Tribiwnlysoedd Cyflogaeth".
- Fortnightly `title`: EN "Employment Tribunals Fortnightly Press List" / CY "Rhestr y Wasg Pob Pythefnos y
  Tribiwnlysoedd Cyflogaeth" — **use listLookup.json values, not the buggy locale `title`** (§5).
- Open Justice item 4 embeds the venue contact (`venue.venueContact`) — render dynamically from the artefact, not
  hardcoded. Provide `openJustice4` as a function `(email, phone) => ...` or split the static prefix from the injected
  contact, mirroring how the reference `openJusticeContact(venueName, email, phone)` is a function in the locale.
- Column-7 Welsh header must be "Sianel y Gwrandawiad" (verbatim from locale), not "Platfform Gwrandawiad" (§5).

### 2.5 PDF generator (per lib)

Mirror `generateCauseListPdf`. Signature extends `BasePdfGenerationOptions<CauseListData>` with `contentDate: Date`.
Uses `renderCauseListData`, `loadTranslations`, `configureNunjucks(__dirname)`, renders `pdf-template.njk`, then
`savePdfToStorage`. PDF template is a 7-column ET table + Open Justice block (no `caseType`/`location`/judge columns from
the civil-family template). Fortnightly template additionally renders representative parties with `rep` / `noRep`.

### 2.6 Validator test (mandatory — one `it` per required field at every depth)

Read the copied schema first, then build `VALID_DATA` (an object; ET schemas are `type: object`) that satisfies EVERY
`required` array at EVERY nesting level. Deep-clone with `JSON.parse(JSON.stringify(VALID_DATA))` per test. Required
fields to cover (per ticket schema notes) — one `it` each:

- `document`, `document.publicationDate`
- `venue`, `venue.venueName`
- `courtLists`
- `courtLists[0].courtHouse`, `courtHouse.courtHouseName`
- `courtRoom[0].session`, `session[0].sittings`
- `sittings[0].sittingStart`, `sittings[0].sittingEnd`, `sittings[0].hearing`
- `hearing[0].hearingType`, `hearing[0].case`
- `case[0].caseNumber`
- `case[0].party[0].partyRole` (verify against the schema's `required`; add an `it` covering an out-of-enum `partyRole`
  to prove the daily vs fortnightly enum difference is enforced — daily rejects `RESPONDENT_REPRESENTATIVE`, fortnightly
  accepts it)

Verify the precise `required` arrays in the copied JSON before finalising the list — the ticket's structure summary is
indicative, the copied schema is authoritative.

### 2.7 Page controllers, templates, content (apps/web)

Create under the existing route group `apps/web/src/pages/(list-types)/`:

```
apps/web/src/pages/(list-types)/et-daily-list/
├── index.ts                     # GET = createListTypeHandler({... createCauseListRender ...})
├── et-daily-list.njk            # 7-column ET table, Open Justice details, case search, data source
└── index.test.ts                # controller test (mirror civil-and-family index.test.ts)

apps/web/src/pages/(list-types)/et-fortnightly-list/
├── index.ts
├── et-fortnightly-list.njk      # adds rep / noRep representative markup
└── index.test.ts
```

Controller (daily shown):
```ts
import {
  type CauseListData,
  etDailyListCy as cy,
  etDailyListEn as en,
  renderCauseListData,
  validateEtDailyList
} from "@hmcts/et-daily-list";
import { createCauseListRender, createListTypeHandler } from "../list-type-handler.js";

export const GET = createListTypeHandler<CauseListData>({
  en, cy,
  validate: validateEtDailyList,
  logPrefix: "et-daily-list",
  checkAccess: true,
  render: createCauseListRender(renderCauseListData, "et-daily-list", en, cy)
});
```

Routes resolve to `GET /et-daily-list?artefactId=` and `GET /et-fortnightly-list?artefactId=` (route group
`(list-types)` has no URL prefix). `createCauseListRender` renders the template with `header`, `openJustice`,
`listData`, `dataSource`, `t` — the ET templates read exactly those, matching the reference njk (relabel columns and
drop the unused ones).

The templates extend `layouts/base-template.njk`, use `page_content` block, GOV.UK table + details (accordion) + a case
search input, and print the data-source attribution at the bottom — structurally the civil-family template trimmed to
the 7 ET columns.

### 2.8 Registration touch points

1. **Root `tsconfig.json`** — add 4 path entries:
   ```
   "@hmcts/et-daily-list": ["libs/list-types/et-daily-list/src"],
   "@hmcts/et-daily-list/config": ["libs/list-types/et-daily-list/src/config"],
   "@hmcts/et-fortnightly-list": ["libs/list-types/et-fortnightly-list/src"],
   "@hmcts/et-fortnightly-list/config": ["libs/list-types/et-fortnightly-list/src/config"],
   ```
2. **`apps/web/package.json`** — add `"@hmcts/et-daily-list": "workspace:*"` and
   `"@hmcts/et-fortnightly-list": "workspace:*"`.
3. **`apps/web/src/app.ts`** — import `moduleRoot` from each `/config` and add both to the `modulePaths` array
   (Nunjucks template discovery). Pages auto-discover; no router wiring needed.
4. **`libs/publication/src/processing/service.ts`** — import `generateEtDailyListPdf` /
   `generateEtFortnightlyPressListPdf` (+ their `CauseListData` types aliased) and add two `PDF_GENERATOR_REGISTRY`
   entries keyed by `listTypeName`:
   ```ts
   ET_DAILY_LIST: (p) => generateEtDailyListPdf({ ...p, jsonData: p.jsonData as EtDailyCauseListData }),
   ET_FORTNIGHTLY_PRESS_LIST: (p) => generateEtFortnightlyPressListPdf({ ...p, jsonData: p.jsonData as EtFortnightlyCauseListData }),
   ```
5. **`libs/list-types/common/src/list-type-data.ts`** — add two `listTypeData` entries (drives the `list_type` seed and
   catalogue). Employment Tribunal sub-jurisdiction id is `3` (from
   `apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql`). Use `provenance: "CFT_IDAM"`,
   `isNonStrategic: false`, `defaultSensitivity: "Public"`, `subJurisdictionIds: [3]`, `urlPath` = `et-daily-list` /
   `et-fortnightly-list`, friendly names from listLookup.json, `shortenedFriendlyName` = "ET Daily List" / "ET
   Fortnightly List". Add matching unit tests in `list-type-data.test.ts`. **Confirm defaultSensitivity/provenance
   against an existing ET seed row or product owner** (§5).
6. **NOT** `registerConverterByName` (see §1.3).

### 2.9 Package build scripts

Copy the reference `package.json` build scripts verbatim (they copy `*.njk` PDF templates into `dist/pdf`). The
`build` script is `tsc && yarn build:nunjucks && yarn build:pdf-templates`.

---

## 3. Error Handling & Edge Cases

All request-level error handling is inherited from `createListTypeHandler` (the reference handler):

| Case | Behaviour | Where |
|------|-----------|-------|
| Missing `artefactId` | 400 → `errors/common` | handler guard |
| Artefact not found | 404 → `errors/common` | `getArtefactById` null check |
| No access (checkAccess) | 403 → `errors/403` | `canAccessPublicationData` |
| Blob JSON missing | 404 → `errors/common` | `getPublicationJson` null check |
| Schema validation fails | 400 → `errors/common` | `validate()` (our `validateEt*`) |
| Unexpected error | 500 → `errors/common` | try/catch |

Data-level edge cases handled in template/renderer:
- **Empty hearings** — template must render a "No hearings" message when a court room/session has no sittings/hearings
  (add `noListMessage` locale key; guard the table loop). Confirm exact upstream copy for the empty-state string (§5).
- **Missing optional fields** — `caseSequenceIndicator`, `individualDetails`/`organisationDetails`,
  `venueContact.venueTelephone`/`venueEmail`, `courtHouseAddress.*`, `channel[]` are all optional; renderer/template
  already null-guard (`| length`, `?.`, empty-string fallbacks). Duration is `""` when `sittingStart`/`sittingEnd`
  missing.
- **Representative roles on daily** — schema enum forbids them, so `applicantRepresentative`/`respondentRepresentative`
  are always empty for daily; daily template omits the rep markup.

---

## 4. Acceptance Criteria Mapping

| AC (ticket) | Satisfied by | Verified by |
|-------------|--------------|-------------|
| Venue/list name "Employment Tribunals Daily List" / "…Fortnightly Press List" | locale `title` from listLookup.json; rendered via `createCauseListRender` `title` | controller unit test asserts title; E2E page heading |
| 7 data fields (Start time, Duration, Case number, Claimant, Respondent, Hearing Type, Hearing Platform) | ET template columns bound to renderer output (§1.1 table) | renderer.test + template render / E2E table headers |
| Open Justice accordion full `openJustice1`–`openJustice6` (item 4 = venue contact) | locale keys + GOV.UK details block; item 4 injects `venue.venueContact` | template render / E2E accordion text |
| Two libs created (`et-daily-list`, `et-fortnightly-list`) | §2.1 | filesystem / `yarn build` |
| Each lib contains models/validation/schema/rendering/pdf/locales/index/config/package/tsconfig | §2.1 | build + guard test |
| Pages at `GET /et-daily-list?artefactId=` and `/et-fortnightly-list?artefactId=` | apps/web page controllers (§2.7) | controller test / E2E |
| Displays venue name, address, content date, last updated | `renderCauseListData` header + template | renderer.test / E2E |
| Hearings table 7 columns | ET template | template render / E2E |
| Case search input present | template `case-search-input` | E2E |
| Data source attribution | template footer `dataSource` | E2E |
| 400 missing artefactId / 404 not found / 403 no access / 400 schema fail | `createListTypeHandler` (§3) | controller test |
| PDF generated per list type matching HTML structure | `generateEt*Pdf` + pdf-template.njk (§2.5) | pdf-generator.test |
| PDF saved to storage | `savePdfToStorage` | pdf-generator.test |
| Welsh via `?lng=cy` | cy.ts locale + i18n middleware | E2E `?lng=cy` |
| PDF language by locale | `loadTranslations(locale, …)` | pdf-generator.test (cy case) |
| Registered in app.ts / tsconfig / apps/web package.json / PDF_GENERATOR_REGISTRY | §2.8 | `yarn build`, `yarn dev` |
| Converters registered by name | N/A — not applicable (§1.3, §5) | — |
| Unit tests pass incl. json-validator one-`it`-per-field | §2.6 | `yarn test` |
| `yarn test` passes workspace-wide | full run | CI |

---

## 5. CLARIFICATIONS NEEDED

1. **Package/URL name vs kebab of list-type name (validator dynamic lookup).** `convertListTypeNameToKebabCase`
   turns `ET_FORTNIGHTLY_PRESS_LIST` into `et-fortnightly-press-list`, but listLookup.json `url` (and hence the
   requested package name) is `et-fortnightly-list`. The dynamic `validateListTypeJson` resolves
   `@hmcts/et-fortnightly-press-list`, which will NOT exist. **Resolution needed:** either (a) name the package
   `@hmcts/et-fortnightly-list` and add a `PACKAGE_ALIASES` entry `"et-fortnightly-press-list": "et-fortnightly-list"`
   in `list-type-validator.ts`, or (b) name the package `@hmcts/et-fortnightly-press-list` (diverging from the url).
   Recommend (a) to match listLookup.json url. `et-daily-list` has no mismatch. Please confirm.

2. **`registerConverterByName` — believed not required.** The reference (civil-and-family) is a strategic JSON list
   with no Excel converter; ET daily/fortnightly are the same. The ticket's converter-registration checkbox appears to
   be a generic-checklist carry-over. Confirm ET lists are JSON-only (no Excel manual-upload path). If Excel upload IS
   required, an `ExcelConverterConfig` + `registerConverterByName` per list must be added.

3. **Open Justice item 4 venue contact — HTML vs PDF, and format.** Item 4 embeds `venue.venueContact`. Confirm whether
   to show email only, phone only, or both, and the exact "should be made in advance to: …" phrasing (the ticket gives
   the prefix but leaves the injected contact formatting open). Also confirm behaviour when `venueContact` is absent.

4. **Upstream locale `title` bugs (already flagged in ticket).** We will use listLookup.json friendly names for both
   titles (EN fortnightly locale drops "Press"; CY fortnightly locale is a Daily copy-paste). Confirming we deliberately
   override the locale `title` with the listLookup.json value in both EN and CY.

5. **Welsh Open Justice text.** Ticket says CY Open Justice differs from EN only in whitespace and must be copied
   verbatim from the CY locale file. We need the exact CY `openJustice1`–`openJustice6` strings pulled from
   `pip-frontend/locales/cy/et-*.json` at implementation time (not reproduced in the ticket). Also `rep`/`noRep` CY
   ("Cynrychiolydd" / "Dim Cynrychiolydd") confirmed from ticket.

6. **`listTypeData` catalogue attributes.** Ticket does not specify `provenance`, `defaultSensitivity`, or the exact
   Employment Tribunal `subJurisdictionIds`. Plan assumes `CFT_IDAM`, `Public`, `[3]` (from the existing
   sub-jurisdiction seed). Fortnightly Press lists may warrant a different sensitivity. Confirm with product owner /
   an existing STG/prod seed row. Also confirm whether prod seed SQL scripts
   (`apps/postgres/prisma/scripts/001_…`, `003_…`) need corresponding rows/links like the PCOL change (#438) did.

7. **Empty-state copy.** No explicit "No hearings" string in the ticket. Confirm the upstream empty-list message (EN/CY)
   or agree a sensible default.
