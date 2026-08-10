# Technical Plan — #791 Style Guide: IAC Daily List

Add two manually-published list types to CaTH:

- `IAC_DAILY_LIST` — Immigration and Asylum Chamber Daily List (`/iac-daily-list`)
- `IAC_DAILY_LIST_ADDITIONAL_CASES` — …Daily List - Additional Cases (`/iac-daily-list-additional-cases`)

> This plan is grounded in the actual repo. The embedded ticket spec (by
> `hmctsclaudecode`) is broadly correct about the helper names and registration
> points — those were verified to exist. Several concrete claims were **wrong or
> imprecise** and are corrected inline (see the "SPEC CORRECTION" callouts and
> §5). The single biggest unknown is that the pip source files (schema, template,
> locales, manipulation service) **cannot be fetched from this environment** — the
> exact field names, columns and grouping must be ported by a human before the
> renderer/schema/template can be finalised. Everything downstream of those field
> names is blocked on that port.

---

## 1. Technical Approach

### 1.1 What was verified in the codebase

| Spec claim | Verified? | Notes |
|---|---|---|
| `list-type-handler.ts` with `createSimpleListTypeHandler` / `createMultiListGuardAndRender` | ✅ Exists | `apps/web/src/pages/(list-types)/list-type-handler.ts`. Handles artefactId check, `getArtefactById`, access control, blob fetch, validation, then `render`. |
| `PDF_GENERATOR_REGISTRY` keyed by `listTypeName` | ✅ Exists | `libs/publication/src/processing/service.ts:139`. Lookup at line 346 uses `listTypeName` string. |
| `list-type-data.ts` seed catalogue | ✅ Exists | `libs/list-types/common/src/list-type-data.ts`. Consumed by `libs/location/src/seed-list-types.ts` → upserts `listType` + `listTypeSubJurisdiction`. |
| Summary-of-publications sorts by `listTypeName.localeCompare(...)` | ✅ Exists | `apps/web/src/pages/(public)/summary-of-publications/index.ts:100-112`. |
| CI guard test forces schema→validate export | ✅ Exists | `libs/list-types/common/src/validation/guard.test.ts` scans every `libs/list-types/*/src/schemas/*.json` for a `validate[A-Z]` export in `index.ts`. |
| Canonical reference lib | ✅ Exists | `libs/list-types/care-standards-tribunal-weekly-hearing-list` (single type) and `apps/web/src/pages/(list-types)/rcj-standard-daily-cause-list` (multi-type, one controller, `ROUTES` array). |
| Multi-URL from one controller via `export const ROUTES = [...]` | ✅ Supported | `simple-router` reads a string `ROUTES` array (see `libs/simple-router/dist/simple-router.js`). RCJ page uses it. |
| Immigration & Asylum Chamber sub-jurisdiction | ✅ Found | `subJurisdictionId: 6` in `libs/location/src/location-data.ts:308-313`. **Not** UTIAC (which uses 27/28). |
| Manual `.json` upload renders as a style-guide page | ✅ Confirmed | `apps/web/src/pages/(admin)/manual-upload-summary/index.ts:94` sets `isFlatFile = !fileName.endsWith(".json")`; `.json` → `isFlatFile=false` → `extractAndStoreArtefactSearch` runs, page rendered from JSON. |

### 1.2 Key architecture decisions

1. **One new lib, one schema, multi-list controller.** The pip source has a single
   `iac_daily_list.json` schema and a single `iac-daily-list.njk`. Both CaTH list
   types almost certainly share one JSON structure, so mirror the **RCJ pattern**:
   one lib `@hmcts/iac-daily-list`, one schema, one validator, and a single
   controller using `createMultiListGuardAndRender` + `export const ROUTES` for the
   two URLs. The two types differ only by page title (and the "Additional Cases"
   heading). **Blocked-confirm** against the pip schema that structures match
   (§5, open question 2). If they differ, add a second schema + validator + template.

2. **Never use numeric `listTypeId`.** Routing/guard keyed on `artefact.listTypeName`
   (the `@unique` string). PDF and email registries keyed by name. Test fixtures use
   an arbitrary `listTypeId` (e.g. `999`).

3. **AC2 ("Daily List always first") solved with an explicit rank, not alphabetical
   luck.** See §2.6 and the SPEC CORRECTION there.

4. **Content co-located per repo rules, but list-type page furniture lives in the
   lib's `locales/{en,cy}.ts`** (mirrors CST/RCJ — the multi-list handler reads
   `t[listTypeName]` and `t.common`), because the same strings feed the public page,
   the PDF generator and the email summary.

### 1.3 Data / control flow (verified)

```
Admin: /manual-upload (strategic form; JSON) → /manual-upload-summary
  → createArtefact(provenance=MANUAL_UPLOAD, isFlatFile=false for .json)
  → extractAndStoreArtefactSearch → processPublication (PDF + notify, background)

Public: /summary-of-publications?locationId=NNN  (IAC Daily List ordered before Additional Cases)
  → click → /iac-daily-list?artefactId=UUID  (or /iac-daily-list-additional-cases)
    → createSimpleListTypeHandler: getArtefactById → access check
      → getPublicationJson → validateIacDailyList → multi-list render → GOV.UK page
```

---

## 2. Implementation Details

All new paths follow the CST/RCJ reference exactly.

### 2.1 New lib: `libs/list-types/iac-daily-list/`

```
libs/list-types/iac-daily-list/
├── package.json          # @hmcts/iac-daily-list; build + build:nunjucks + build:schemas
├── tsconfig.json         # extends ../../../tsconfig.json (note depth: 3 levels under libs)
└── src/
    ├── index.ts          # business-logic + locale + validate* exports
    ├── config.ts         # moduleRoot, assets, schemaPath
    ├── models/types.ts   # IacDailyList / IacHearing (fields BLOCKED on pip port)
    ├── rendering/renderer.ts       # renderIacDailyList(json, {...}) → { header, hearings }
    ├── rendering/renderer.test.ts
    ├── validation/json-validator.ts        # validateIacDailyList (createJsonValidator wrapper)
    ├── validation/json-validator.test.ts   # one it() per required field, every nesting level
    ├── schemas/iac-daily-list.json          # ported from pip-data-management (BLOCKED)
    ├── locales/en.ts, locales/cy.ts         # keyed by IAC_DAILY_LIST / IAC_DAILY_LIST_ADDITIONAL_CASES + common
    ├── pdf/pdf-generator.ts, pdf/pdf-generator.test.ts
    ├── pdf/pdf-template.njk
    └── email-summary/summary-builder.ts, summary-builder.test.ts   # optional (see §2.5)
```

`package.json` mirrors CST (`build:schemas` copies `src/schemas/*.json` → `dist/schemas`,
`build:nunjucks` copies `src/pdf/*.njk`). Deps: `@hmcts/list-types-common`,
`@hmcts/pdf-generation`, `@hmcts/postgres-prisma`, `luxon`, `nunjucks`.

`config.ts`:
```ts
export const moduleRoot = __dirname;
export const assets = path.join(__dirname, "assets/");
export const schemaPath = path.join(__dirname, "schemas/iac-daily-list.json");
```

`validation/json-validator.ts`:
```ts
export function validateIacDailyList(jsonData: unknown): ValidationResult {
  return createJsonValidator(schemaPath)(jsonData);
}
```
Exported from `index.ts` (**required or the CI guard test fails**).

### 2.2 Web pages: `apps/web/src/pages/(list-types)/`

Single controller directory `iac-daily-list/` serving both URLs via `ROUTES`
(RCJ pattern), plus the two templates:

```
apps/web/src/pages/(list-types)/iac-daily-list/
├── index.ts                              # ROUTES + createSimpleListTypeHandler + createMultiListGuardAndRender
├── iac-daily-list.njk
├── iac-daily-list-additional-cases.njk   # (or one shared template parametrised by listTypeName)
├── index.test.ts
├── iac-daily-list.njk.test.ts
└── iac-daily-list-additional-cases.njk.test.ts
```

Controller shape (mirrors `rcj-standard-daily-cause-list/index.ts`):
```ts
export const ROUTES = ["/iac-daily-list", "/iac-daily-list-additional-cases"];
const validate = createJsonValidator(schemaPath);
const LIST_TYPE_CONFIG = {
  IAC_DAILY_LIST: { en: en.IAC_DAILY_LIST.pageTitle, cy: cy.IAC_DAILY_LIST.pageTitle, template: "iac-daily-list" },
  IAC_DAILY_LIST_ADDITIONAL_CASES: { en: en.IAC_DAILY_LIST_ADDITIONAL_CASES.pageTitle, cy: cy...., template: "iac-daily-list-additional-cases" }
};
const { guardArtefact, render } = createMultiListGuardAndRender<IacDailyList>({ en, cy, listTypeConfig, renderFn: renderIacDailyList, resolveTemplate: (c) => c.template });
export const GET = createSimpleListTypeHandler<IacDailyList>({ en, cy, validate, logPrefix: "iac-daily-list", guardArtefact, render });
```

Templates extend `layouts/base-template.njk`, use `page_content`, GOV.UK Table +
Details, "Data source" label, back-to-top, and the Special Category Data caution
notes. **Column set/grouping BLOCKED on pip `iac-daily-list.njk` port.**

### 2.3 Seed catalogue: `libs/list-types/common/src/list-type-data.ts`

Add two entries. **SPEC CORRECTION:** the spec's example set
`provenance: "MANUAL_UPLOAD"`. That is wrong — in `ListTypeData`, `provenance` maps
to `listType.allowedProvenance` (who may *access* the publication), **not** the
artefact upload provenance. `MANUAL_UPLOAD` is the artefact provenance set at upload
time (drives the "Manual Upload" data-source label). Every existing tribunal list
uses `CFT_IDAM`. Use the access-provenance convention, not `MANUAL_UPLOAD`
(confirm — §5 open question 4).

```ts
{
  name: "IAC_DAILY_LIST",
  englishFriendlyName: "Immigration and Asylum Chamber Daily List",
  welshFriendlyName: "Rhestr Ddyddiol y Siambr Mewnfudo a Lloches",
  shortenedFriendlyName: "IAC Daily List",
  provenance: "CFT_IDAM",            // CONFIRM allowedProvenance, NOT MANUAL_UPLOAD
  urlPath: "iac-daily-list",
  isNonStrategic: false,             // matches ticket; routes into strategic JSON manual-upload form
  defaultSensitivity: "Public",      // CONFIRM (ticket left blank)
  subJurisdictionIds: [6]            // Immigration and Asylum Chamber (verified)
},
{
  name: "IAC_DAILY_LIST_ADDITIONAL_CASES",
  englishFriendlyName: "Immigration and Asylum Chamber Daily List - Additional Cases",
  welshFriendlyName: "Rhestr Dyddiol y Siambr Mewnfudo a Lloches – Achosion Ychwanegol", // single space (typo fix)
  shortenedFriendlyName: "IAC Daily List – Additional Cases",
  provenance: "CFT_IDAM",
  urlPath: "iac-daily-list-additional-cases",
  isNonStrategic: false,
  defaultSensitivity: "Public",
  subJurisdictionIds: [6]
}
```

**SPEC CORRECTION on `isNonStrategic`:** the spec worried this routes into the
"strategic" dropdown. Verified: `manual-upload` (JSON, strategic) uses
`findStrategicListTypes()` (`isNonStrategic=false`); `non-strategic-upload` (Excel)
uses `findNonStrategicListTypes()` (`isNonStrategic=true`). Since these are **manual
JSON uploads**, `isNonStrategic: false` is **correct** and they correctly appear in
the `/manual-upload` form. No Excel converter / `registerConverterByName` is needed.

Extend `list-type-data.test.ts` with the two new entries (unique name, unique
urlPath, correct friendly names, subJurisdictionIds `[6]`).

### 2.4 PDF generator: `libs/publication/src/processing/service.ts`

Register both names in `PDF_GENERATOR_REGISTRY`, keyed by `listTypeName` string
(never numeric). The generator takes `listTypeName` to pick the title (SSCS pattern):
```ts
IAC_DAILY_LIST: (p) => generateIacDailyListPdf({ ...p, jsonData: p.jsonData as IacDailyList }),
IAC_DAILY_LIST_ADDITIONAL_CASES: (p) => generateIacDailyListPdf({ ...p, jsonData: p.jsonData as IacDailyList }),
```
Add `@hmcts/iac-daily-list` to `libs/publication/package.json` deps.

### 2.5 Email summary (optional): `libs/notifications/src/notification/notification-service.ts`

`EMAIL_BUILDER_REGISTRY` (line 122) maps `listTypeName → { extract, format }` for
case-level subscription emails. **SPEC CORRECTION:** the spec listed the
email-summary as a required lib file but did not identify this registry as the
consumer. If IAC lists must produce case-reference emails to subscribers, add
`extractCaseSummary` + `formatCaseSummaryForEmail` to the lib and register both
names here. If not required for MVP, omit — the notification service falls back to a
generic email. Treat as **confirm** (§5 open question 7).

### 2.6 Ordering guarantee for AC2

**SPEC CORRECTION / verification.** The spec claimed the current sort would "invert
under Welsh collation because `Dd` sorts after `D`". Verified: the comparator at
`summary-of-publications/index.ts:100` uses `a.listTypeName.localeCompare(b.listTypeName)`
with **no locale argument** (default/ICU collation), and `listTypeName` here is the
**localised** friendly name. In the current Node runtime the default collation
happens to place both the English ("Daily List" is a prefix of "Daily List -
Additional Cases") and the Welsh names in the correct order. So AC2 is
*incidentally* satisfied today — but it is fragile (ICU-version- and
locale-argument-dependent) and not a guarantee.

Robust, minimal fix that does **not** disturb the ordering of any other list type:
1. Expose the **stable** list-type `name` on each mapped publication object
   (currently only the localised `listTypeName` and numeric `listTypeId` are carried;
   `listTypeMap.get(...).name` is available).
2. Add an explicit rank and make it the **first** comparison, but only when *both*
   items are IAC types:
   ```ts
   const IAC_ORDER: Record<string, number> = { IAC_DAILY_LIST: 0, IAC_DAILY_LIST_ADDITIONAL_CASES: 1 };
   // inside the comparator, before the localeCompare:
   if (a.name in IAC_ORDER && b.name in IAC_ORDER) {
     return IAC_ORDER[a.name] - IAC_ORDER[b.name];
   }
   ```
   Because the two IAC types sort adjacently under the existing alphabetical primary
   key (shared long prefix), this tie-break guarantees Daily-List-before-Additional-
   Cases in **both** locales and **regardless of publish order**, without reordering
   any unrelated list type. This is keyed on the stable `name`, never `listTypeId`.

### 2.7 Registration wiring

- `apps/web/src/app.ts`: import `moduleRoot as iacDailyListModuleRoot` from
  `@hmcts/iac-daily-list/config`; add to the `modulePaths` array (Nunjucks + PDF
  template discovery).
- `apps/web/vite.build.ts` (+ `vite.config.ts`): add `assets` only if the lib ships
  frontend assets (the read-only pages need none beyond GOV.UK — likely no vite entry
  needed; CST ships none).
- Root `tsconfig.json` `paths`: add `@hmcts/iac-daily-list` →
  `libs/list-types/iac-daily-list/src` **and** `@hmcts/iac-daily-list/config` →
  `libs/list-types/iac-daily-list/src/config` (mirrors siac/ftt entries).
- `libs/publication/package.json` + `libs/notifications/package.json` (if email
  summary added): add `@hmcts/iac-daily-list` workspace dependency.

---

## 3. Error Handling & Edge Cases

All handled by the shared `createSimpleListTypeHandler` (verified behaviour):

| Condition | HTTP | Rendered |
|---|---|---|
| Missing `artefactId` | 400 | `errors/common` (Bad Request) |
| Artefact not found | 404 | `errors/common` (Not Found) |
| Unauthorised (access check) | 403 | `errors/403`, `Cache-Control: no-store` |
| Wrong list type (multi-list guard) | 400 | `errors/common` (Invalid List Type) |
| Blob missing | 404 | `errors/common` (Not Found) |
| Schema validation fails | 400 | `errors/common` (Invalid Data) |
| Unexpected error | 500 | `errors/common` (server error) |

- **Validation:** JSON schema is mandatory (repo rule + CI guard). Invalid JSON is
  caught by `validate` before render.
- **Access control:** `canAccessPublicationData(req.user, artefact, resolveListType(artefact.listTypeId))`
  runs inside the handler; `defaultSensitivity` and `allowedProvenance` drive it.
- **No user input** on these read-only GET pages (on-page search is client-side PE),
  so no form validation.

---

## 4. Acceptance Criteria Mapping

| AC | How satisfied | How verified |
|---|---|---|
| IAC publishes 2 lists manually in CaTH, created in the front end | Two `listTypeData` entries (`isNonStrategic:false`) appear in `/manual-upload`; JSON uploaded, stored as artefacts (`isFlatFile=false`), rendered by the new controller/templates | `list-type-data.test.ts`; controller `index.test.ts`; template `.njk.test.ts`; E2E `@nightly` upload+view journey |
| IAC Daily List always appears first under the same venue, regardless of publish order | Explicit `IAC_ORDER` tie-break in summary-of-publications comparator (§2.6) | New test in `summary-of-publications` proving order both publish-orders and both locales |
| (Manual list — schema/style guide) | pip references show a real schema + template; CaTH implements them (contradiction resolved — §5 q1). Schema + validator + validator test + style-guide templates added | `json-validator.test.ts` (one it per required field); guard test passes |
| Welsh rendering | `locales/cy.ts` mirrors `en.ts`; templates render `t` by locale; `lang="cy"` | key-parity test; template test rendered with `cy`; E2E Welsh toggle |

---

## 5. CLARIFICATIONS NEEDED

1. **Schema/template/locales must be ported from pip repos (BLOCKING).** The pip
   `iac_daily_list.json`, `iac-daily-list.njk`, `IacDailyListService.ts` and
   `en/cy/iac-daily-list.json` cannot be fetched here. The exact field names,
   required arrays (every nesting level), table columns and grouping, and the real
   English/Welsh strings must be ported by a human. `models/types.ts`, the renderer,
   the schema, the templates and the locale files are all blocked on this. The
   `[WELSH TRANSLATION REQUIRED: ...]` placeholder convention (used elsewhere in the
   catalogue) should be used for any Welsh string not present in the pip `cy` file.
2. **Shared vs separate JSON structure.** Assumed both types share one schema (one
   lib + multi-list controller). Confirm against pip; if the Additional Cases list
   has a distinct structure, add a second schema/validator/template.
3. **Ticket contradiction.** Ticket body says "no validation schema or style guide"
   yet links a pip schema + template. Assumption: CaTH **does** implement both.
   Confirm.
4. **`allowedProvenance` value.** Spec's `MANUAL_UPLOAD` is incorrect for the
   `ListTypeData.provenance` field (that field is the access-provenance). Confirm the
   correct `allowedProvenance` (likely `CFT_IDAM`) so verified users can view.
5. **`defaultSensitivity`.** Ticket leaves it blank; plan assumes `"Public"`. Confirm.
6. **Which upload form.** Confirmed `isNonStrategic:false` → strategic JSON
   `/manual-upload` form (correct for JSON). Confirm no Excel upload is required (if
   it is, add a converter via `registerConverterByName` and set `isNonStrategic:true`).
7. **Email summary.** Confirm whether subscription emails must include IAC case
   references (adds `extract`/`format` + `EMAIL_BUILDER_REGISTRY` entries) or the
   generic fallback email is acceptable for MVP.
8. **Welsh friendly-name typo.** Ticket's Additional-Cases `welshFriendlyName` has a
   double space (`Lloches  – Achosion`). Assumed normalised to a single space.
   Confirm.
9. **Ordering scope.** Confirm the IAC-specific `IAC_ORDER` tie-break is acceptable
   versus a general "list priority" mechanism.
10. **Sub-jurisdiction confirmed** as `6` (Immigration and Asylum Chamber). Note this
    is distinct from UTIAC (JR = 27, Statutory Appeal = 28) — do not reuse those.
