# Technical Plan — Issue #1135: Confirm all lists are in the List Search Config

## 0. Scope note

The issue body is two sentences. A long technical specification was posted as a comment by
`hmctsclaudecode` before planning. That spec is a useful starting point, but **several of its
load-bearing claims are wrong or incomplete**. This plan supersedes it. The corrections are
recorded in §7 so the discrepancies are not silently lost.

The acceptance criterion is: *all list types available in CaTH are looked up in the List Search
Config and if any are not available, these list types are added.* That is fundamentally a
**reference-data completeness** task, not a UI task. The UI half (a page that lets an admin
*confirm* coverage) is the smaller, lower-risk part.

---

## 1. Verified current state

Everything in this section was read from the working tree, not assumed.

### 1.1 The data path

| Concern | Location | Notes |
|---|---|---|
| Table | `libs/postgres-prisma/prisma/schema/list-search-config.prisma` | `listTypeId Int` + `@@unique([listTypeId])`; both field names `VarChar(100)`, `NOT NULL` |
| Queries | `libs/list-search-config/src/repository/queries.ts` | `findByListTypeId`, `create`, `update`, `upsert` |
| Service | `libs/list-search-config/src/repository/service.ts` | `getConfigForListType`, `validateFieldName`, `saveConfig` |
| Write on publish | `libs/publication/src/artefact-search-extractor.ts` | `extractAndStoreArtefactSearch` → `getConfigForListType`; **if the config row is absent, the whole body is skipped and no `artefact_search` rows are written** |
| Read on search | `libs/subscriptions/src/repository/queries.ts:9` | `searchByCaseName` selects `listTypeId` from `listSearchConfig where caseNameFieldName != ""`, then filters artefacts to those ids. **A list type with no row is invisible to case-name search** |

### 1.2 The gap is real and total

`list_search_config` has **no seed path whatsoever**. Confirmed by inspection:

- `apps/postgres/prisma/generate-seed-sql.ts` — `generateSeedSql` emits region, jurisdiction,
  sub-jurisdiction, location, location-reference, location-region, location-sub-jurisdiction,
  `list_types`, `list_types_sub_jurisdictions`, and soft-delete reconciliation. **No
  `list_search_config`.**
- `apps/postgres/prisma/seed.ts` — calls `seedLocationData()` only.

Rows therefore exist only where a System Admin manually visited `/list-search-config/:listTypeId`
and saved, or where a test-support route created one. Coverage is arbitrary and differs per
environment. This is the defect.

`libs/list-types/common/src/list-type-data.ts` holds **77** list types (verified by parsing the
file, not by counting `name:` occurrences — a naive grep returns 78 because of the interface
declaration).

### 1.3 Routing — open question #6 from the spec comment is resolved

`node_modules/@hmcts-cft/simple-router/dist/route-discovery.js` maps file paths to URLs and sorts
routes with `sortRoutes`: fewer `:param` segments first, then fewer segments. So:

- `index.ts` → `/list-search-config`
- `[listTypeId].ts` → `/list-search-config/:listTypeId`

Different segment counts, static sorted first. **`index.ts` and `[listTypeId].ts` coexist safely in
one directory; there is no shadowing.** No fallback directory is needed.

### 1.4 Routing — but there IS a template-name collision the spec missed

`libs/web-core/src/middleware/govuk-frontend/configure-govuk.ts` → `collectViewPaths` adds every
route-group directory to the Nunjucks search path, so `res.render("list-search-config/index")`
resolves `apps/web/src/pages/(system-admin)/list-search-config/index.njk`.

That file **already exists and belongs to the edit page**. The directory today is:

```
(system-admin)/list-search-config/
├── [listTypeId].ts        # the edit page controller
├── index.njk              # the EDIT page template  ← name already taken
├── index.njk.test.ts      # edit page template test
├── index.test.ts          # edit page controller test
├── en.ts
└── cy.ts
```

A new index page cannot also render `list-search-config/index`. **Resolution: rename the edit
page's template and tests first**, so the conventional `index.*` names are free for the new index
page:

| From | To |
|---|---|
| `index.njk` | `edit.njk` (rendered as `list-search-config/edit`) |
| `index.njk.test.ts` | `edit.njk.test.ts` (update its `TEMPLATE` const) |
| `index.test.ts` | `[listTypeId].test.ts` |

Then add `index.ts`, `index.njk`, `index.test.ts`, `index.njk.test.ts` for the coverage page.
`[listTypeId].ts` changes its two `res.render("list-search-config/index", …)` calls to
`"list-search-config/edit"`.

### 1.5 Field names cannot be derived from JSON schemas alone

The spec comment supplied a hand-written table of field names "derived from the list type JSON
schemas". That derivation only works for a minority of list types.

`libs/list-types/common/src/validation/list-type-validator.ts` is the authoritative name→package
mapping: `convertListTypeNameToKebabCase(name)` then `PACKAGE_ALIASES`. Running that mapping over
all 77 list types shows **37 have no package of their own**, and therefore no schema file:

```
PCOL_DAILY_CAUSE_LIST, MENTAL_HEALTH_TRIBUNAL_HEARING_LIST,
CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST, COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST,
COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST, FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST,
KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST, KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST,
MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST, SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST,
BIRMINGHAM_/LEEDS_/BRISTOL_CARDIFF_/MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST,
SIAC_/POAC_/PAAC_WEEKLY_HEARING_LIST, FTT_RPT_* (6 regions), SSCS_* (7 regions),
UT_TAX_AND_CHANCERY_CHAMBER_/UT_LANDS_CHAMBER_/UT_ADMINISTRATIVE_APPEALS_CHAMBER_*,
BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST, CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST,
HIGH_COURT_CIVIL_DAILY_CAUSE_LIST, HIGH_COURT_FAMILY_DAILY_CAUSE_LIST
```

**50 of the 77 are `isNonStrategic: true`** (Excel upload, converted to JSON before storage). For
those, the stored JSON key names come from the Excel converter, not a schema. The authoritative
source is `ExcelConverterConfig.fields[].fieldName`, registered by stable name via
`registerConverterByName` (`libs/list-types/common/src/conversion/non-strategic-list-registry.ts`,
an exact-match `Map`).

Worked example — the eight RCJ variants share `RCJ_EXCEL_CONFIG`
(`libs/list-types/common/src/conversion/rcj-field-configs.ts`), whose `fieldName`s are
`venue, judge, time, caseNumber, caseDetails, hearingType, additionalInformation`. So
`caseNumberFieldName = "caseNumber"`. There is **no `caseName`** — the nearest field is
`caseDetails`, which holds party detail. Whether `caseDetails` should serve as the case-name field
is a product decision, not a derivation (see §6 Q3).

**Therefore the derivation rule is per-type, by provenance:**

| List type kind | Source of truth for field names |
|---|---|
| Strategic (`isNonStrategic: false`, 27 types) | the JSON schema at `libs/list-types/<pkg>/src/schemas/*.json` |
| Non-strategic (`isNonStrategic: true`, 50 types) | the registered `ExcelConverterConfig.fields[].fieldName` |
| No schema and no converter (`PCOL_DAILY_CAUSE_LIST`, `MENTAL_HEALTH_TRIBUNAL_HEARING_LIST`) | unknown — see §6 Q4 |

### 1.6 Pre-existing defects found while verifying (NOT in scope, flagged)

1. **`list_types` carries dead duplicate columns.** `ListType` in
   `libs/postgres-prisma/prisma/schema/location.prisma:57-58` has
   `caseNumberJsonFieldName` / `caseNameJsonFieldName` — the same concept as
   `list_search_config`. A repo-wide search finds references **only** in
   `libs/postgres-prisma/generated/prisma/index.d.ts` (generated types). No application code
   reads or writes them. They are vestigial. `list_search_config` is the live mechanism.
   Dropping them is a separate ticket.
2. **A converter is registered under a name that does not exist.**
   `libs/list-types/court-of-appeal-civil-daily-cause-list/src/conversion/court-of-appeal-civil-daily-cause-list-config.ts:82`
   registers `COURT_OF_APPEAL_CIVIL_DIVISION_DAILY_CAUSE_LIST`, but `listTypeData` has
   `COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST` (no `DIVISION`). The registry is an exact-match `Map`,
   so that converter is unreachable. A one-word fix, but it changes Excel-upload behaviour for a
   live list type — raise separately rather than bundling it here.
3. **The spec's claimed `manage-list-types` bug is not a bug.**
   `manage-list-types/index.ts:15` builds `configureUrl` as `/manage-list-type?id=${id}`, and
   `(system-admin)/manage-list-type/index.ts` exists and reads `req.query.id`. The link works.
   The spec's assertion that there is "no navigable route to the List Search Config edit page" is
   correct, but its diagnosis (a broken `configureUrl`) is not. `manage-list-types/index.njk.test.ts`
   uses a self-supplied fixture with `configureUrl: "/list-search-config/1"`; that fixture is stale
   relative to the controller but the test is fixture-driven, so it passes and asserts nothing
   about the real URL. **Leave `manage-list-types` alone.** Fixing the misleading fixture is
   optional tidy-up; changing the controller would break working navigation.

### 1.7 Existing validation, as implemented

`validateFieldName` in `service.ts`:
- blank/whitespace → valid (field is optional)
- else must match `FIELD_NAME_PATTERN = /^[a-zA-Z0-9_]+$/`
- else must be ≤ 100 chars

`saveConfig` additionally rejects both-fields-blank with `{ field: "", message: "Enter at least one field name" }`.

Note the consequence for seeding: **`saveConfig` cannot produce a row with two blank fields, but
the seed can.** That asymmetry is deliberate and needs to stay — see §6 Q2.

Also note the messages are built by English string concatenation inside the service
(`` `${fieldLabel} must be 100 characters or less` ``) and the controller renders
`error.message` directly, so **length and pattern errors do not translate** even though
`errorCaseNumberInvalid` / `errorCaseNameInvalid` keys already exist in `en.ts`/`cy.ts`. Fixing
this is small and squarely in the files being touched — included (§3.6).

---

## 2. Technical approach

Two independent workstreams. The first satisfies the acceptance criterion; the second makes it
confirmable by a human.

**A — Close the gap permanently (the actual AC).** Add a committed source-of-truth file listing a
search config for every list type, seed it on deploy via generated idempotent SQL, seed it locally
via the Prisma path, and add a CI guard test that fails the build the moment a new list type is
added without a search config entry. After this, "a list type missing from the List Search Config"
becomes unrepresentable rather than merely fixed-once.

**B — Make coverage visible.** Add `GET /list-search-config`, a System-Admin-only table of every
active list type with its configured fields and a status tag, linking to the existing edit page.

Workstream A alone satisfies the written AC. B satisfies "confirm". Do A first; it is the part
with downstream effect on case search.

### 2.1 Key architectural decision — where the data file lives

Put it in **`libs/list-types/common/src/list-search-config-data.ts`**, exported via a dedicated
`./list-search-config-data` package subpath, mirroring `list-type-data.ts` exactly.

Rationale, and why *not* `libs/list-search-config`:

- `generate-seed-sql.ts` opens with an explicit comment that it imports from dedicated subpaths
  because the barrels pull in nunjucks/exceljs and the Prisma repository layer, "neither of which
  is needed to emit SQL and the former is not installed in the focused postgres deploy image".
  A data file with zero imports, behind its own subpath, respects that constraint.
- `@hmcts/list-types-common` is **already** a dependency of `apps/postgres`. Putting the data in
  `libs/list-search-config` would require adding a new workspace dependency to the deploy image
  for one array of string literals.
- The guard test asserting 1:1 parity with `listTypeData` becomes a same-package test with no
  cross-package dependency.
- Dependency direction stays clean: `@hmcts/list-search-config` → `@hmcts/list-types-common` is
  fine (the reverse would risk a cycle, since list-types-common is depended on broadly).

### 2.2 Why `INSERT … SELECT … ON CONFLICT`, not Prisma upsert, on deploy

Per CLAUDE.md: Prisma's `upsert` is a non-atomic SELECT-then-INSERT in application code, so
concurrent seeders race to `P2002`. `ON CONFLICT` is arbitrated inside Postgres. `list_type_id`
must come from a name subquery (the autoincrement id is unknown to TypeScript), so the statement
form is `INSERT … SELECT … FROM list_types WHERE name = '…' ON CONFLICT (list_type_id) DO UPDATE`.
This is the same shape already used by `generateListTypeSubJurisdictionsSql`.

A useful property: if the named list type is absent, the `SELECT` yields zero rows and the
statement is a safe no-op that does not abort the surrounding transaction.

---

## 3. Implementation details

**TEMPLATE SOURCE: write fresh**

(The new page is an internal System Admin coverage table with no counterpart in
hmcts/pip-frontend — it is not a list-type view or a public page, so there is nothing to migrate.
The `migrate-pip-pages` skill does not apply.)

### 3.1 New source-of-truth data file

`libs/list-types/common/src/list-search-config-data.ts`

```typescript
export interface ListSearchConfigData {
  listTypeName: string;
  caseNumberFieldName: string;
  caseNameFieldName: string;
}

export const listSearchConfigData: ListSearchConfigData[] = [ /* 77 entries */ ];
```

Rules:
- Keyed on `listTypeName` only. **No numeric id anywhere, including comments** (CLAUDE.md rule 5).
- `""` is a legitimate value meaning "this list type has no field of that kind". It is not a
  placeholder for "to be decided".
- Zero imports, so the subpath stays safe for the focused deploy image.

Add the subpath to `libs/list-types/common/package.json`:

```json
"./list-search-config-data": {
  "production": "./dist/list-search-config-data.js",
  "default": "./src/list-search-config-data.ts"
}
```

### 3.2 Populating the 77 entries

Do **not** hand-type from the spec comment's table. Write a throwaway derivation script (keep it
out of the repo — put it in `/tmp`, per CLAUDE.md "no speculative functionality"), which for each
`listTypeData` entry:

1. resolves the package via `convertListTypeNameToKebabCase` + `PACKAGE_ALIASES`;
2. if `isNonStrategic: false` and a schema exists, reports which case-identifier-shaped keys the
   schema contains;
3. if `isNonStrategic: true`, reports the `fieldName`s from the registered `ExcelConverterConfig`;
4. flags anything with neither.

Review the output, then commit the reviewed values. The derivation already run during planning
gives these confirmed anchors (spot-check them, do not trust them blindly):

| List type(s) | caseNumber field | caseName field |
|---|---|---|
| `CIVIL_`/`FAMILY_`/`CIVIL_AND_FAMILY_`/`COP_DAILY_CAUSE_LIST` | `caseNumber` | `caseName` |
| `ET_DAILY_LIST`, `ET_FORTNIGHTLY_PRESS_LIST` | `caseNumber` | `""` |
| `CROWN_DAILY_`/`FIRM_`/`WARNED_PDDA_LIST` | `CaseNumber` (**PascalCase**) | `""` |
| `MAGISTRATES_PUBLIC_LIST`, `MAGISTRATES_STANDARD_LIST`, `SJP_PRESS_LIST`, `SJP_DELTA_PRESS_LIST` | `caseUrn` | `""` |
| `MAGISTRATES_(PUBLIC_)ADULT_COURT_LIST_DAILY/FUTURE` | `caseno` (**lowercase**) | `""` |
| `SJP_PUBLIC_LIST`, `SJP_DELTA_PUBLIC_LIST` | `""` | `""` |
| `IAC_DAILY_LIST`, `IAC_DAILY_LIST_ADDITIONAL_CASES` | `caseNumber` | `""` |
| `AST_DAILY_HEARING_LIST`, `UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST` | `appealReferenceNumber` | `""` |
| `UTIAC_JR_*` (5 regions) | `caseReferenceNumber` | `caseTitle` |
| `CIC_`/`GRC_`/`WPAFCC_`/`FTT_TAX_CHAMBER_`/`FTT_LANDS_REGISTRATION_*` | `caseReferenceNumber` | `caseName` |
| `SEND_DAILY_HEARING_LIST` | `caseReferenceNumber` | `""` |
| `CARE_STANDARDS_TRIBUNAL_*`, `PHT_WEEKLY_HEARING_LIST` | `""` | `caseName` |
| RCJ / administrative-court family (via `RCJ_EXCEL_CONFIG`) | `caseNumber` | `""` pending Q3 |
| `BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_*`, `INTERIM_APPLICATIONS_*` | `caseNumber` | `caseName` |
| `PCOL_DAILY_CAUSE_LIST`, `MENTAL_HEALTH_TRIBUNAL_HEARING_LIST` | unknown — Q4 | unknown — Q4 |

The casing variants (`CaseNumber`, `caseno`, `caseUrn`) matter: `extractAndStoreArtefactSearch`
does an exact `fieldName in obj` key match, so a casing error silently yields zero search rows.

### 3.3 Deploy seed — `apps/postgres/prisma/generate-seed-sql.ts`

Add `generateListSearchConfigSql(listSearchConfigData)` to the array in `generateSeedSql`,
positioned **after `generateListTypesSql`** (the name subquery needs the rows to exist) and
**before `generateSoftDeleteReconciliationSql`**.

```typescript
function generateListSearchConfigSql(entries: ListSearchConfigData[]): string {
  // list_search_config.id is Prisma @default(uuid()) — application-level only, with no database
  // default — so a raw INSERT must supply it. A deterministic value keeps re-runs stable.
  // list_type_id references the autoincrement list_types.id, which the TypeScript source does not
  // know — resolve it by name via a subquery so the link is stable across environments.
  return entries
    .map(
      (e) =>
        `INSERT INTO list_search_config (id, list_type_id, case_number_field_name, case_name_field_name, created_at, updated_at)\n` +
        `SELECT ${sqlStr(`seedlsc_${e.listTypeName.toLowerCase()}`)}, id, ${sqlStr(e.caseNumberFieldName)}, ${sqlStr(e.caseNameFieldName)}, NOW(), NOW()\n` +
        `FROM list_types WHERE name = ${sqlStr(e.listTypeName)}\n` +
        `ON CONFLICT (list_type_id) DO UPDATE SET\n` +
        `  case_number_field_name = EXCLUDED.case_number_field_name,\n` +
        `  case_name_field_name = EXCLUDED.case_name_field_name,\n` +
        `  updated_at = NOW();`
    )
    .join("\n\n");
}
```

Points to get right:
- Import via `import { type ListSearchConfigData, listSearchConfigData } from "@hmcts/list-types-common/list-search-config-data";` — the subpath, never the barrel.
- `ON CONFLICT (list_type_id)` targets the existing `@@unique([listTypeId])` index.
- Longest `listTypeName` is 62 chars (`BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST`), so the `seedlsc_` id fits the `TEXT` column with no truncation risk.
- Values pass through the existing `sqlStr`, which doubles `'`.
- The whole seed is already wrapped in one `BEGIN;`/`COMMIT;`.
- **No schema migration.** The table and its unique index already exist. Do not hand-write a `.sql` data migration (CLAUDE.md item 7).

### 3.4 Local seed

`libs/list-search-config/src/data/seed-list-search-config.ts`

```typescript
export async function seedListSearchConfig(): Promise<void>
```

- Resolve the id with `prisma.listType.findUnique({ where: { name }, select: { id: true } })`, then `prisma.listSearchConfig.upsert({ where: { listTypeId }, … })`.
- `console.warn` and skip (do not throw) when the name is absent, so a partially seeded local database does not fail the seed.
- Export from `libs/list-search-config/src/index.ts`.
- Add `@hmcts/list-types-common` to `libs/list-search-config/package.json` dependencies.
- Call it from `apps/postgres/prisma/seed.ts` **after** `seedLocationData()` (which chains to `seedListTypes()`), since the name→id lookup depends on `list_types` being populated.

Prisma `upsert` is acceptable here and only here: `yarn db:seed` is single-process, so there is no
race. The deploy path uses generated `ON CONFLICT` SQL for exactly that reason.

### 3.5 Coverage query, service and index page

**`libs/list-search-config/src/repository/queries.ts`** — add two queries:

```typescript
export async function findActiveListTypes() {
  return await prisma.listType.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, friendlyName: true, welshFriendlyName: true },
    orderBy: { friendlyName: "asc" }
  });
}

export async function findAllConfigs() {
  return await prisma.listSearchConfig.findMany({
    select: { listTypeId: true, caseNumberFieldName: true, caseNameFieldName: true }
  });
}
```

`ListType` has no Prisma relation to `ListSearchConfig` (the FK is unmodelled), so a nested
`select` is unavailable. Join the two result sets in memory by `listTypeId`. Both are bounded at
~77 rows — two queries total, not an N+1, and no pagination is warranted.

Note `friendlyName` and `welshFriendlyName` are **nullable** on the model
(`String?`), so fall back to `name` when null — the same `listType.friendlyName || listType.name`
pattern `manage-list-types/index.ts` already uses.

**`libs/list-search-config/src/repository/service.ts`** — add:

```typescript
export type ConfigStatus = "CONFIGURED" | "NOT_SEARCHABLE" | "MISSING";

export interface ListTypeCoverage {
  listTypeId: number;
  listTypeName: string;
  friendlyName: string;
  welshFriendlyName: string;
  caseNumberFieldName: string;
  caseNameFieldName: string;
  status: ConfigStatus;
}

export async function getConfigCoverage(): Promise<ListTypeCoverage[]>
```

Status derivation (pure, no I/O):

| Condition | Status |
|---|---|
| no row for the list type | `MISSING` |
| row exists, both field names blank after trim | `NOT_SEARCHABLE` |
| row exists, at least one field name populated | `CONFIGURED` |

**`apps/web/src/pages/(system-admin)/list-search-config/index.ts`** — new controller:

```typescript
export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
```

`getHandler`: pick the locale with `req.query.lng === "cy"` (matching the sibling pages in this
group, which use the query param rather than `res.locals.locale`); call `getConfigCoverage()`;
map to view rows `{ name, caseNumberFieldName, caseNameFieldName, statusText, statusClasses,
actionText, changeUrl }` sorted by displayed name via `localeCompare`; render
`list-search-config/index` with `rows`, `configuredCount`, `missingCount`, `totalCount`.

No business logic in the controller — status derivation and the DB join live in the service.

**`index.njk`** — new template (after the §1.4 rename frees the name):
`{% extends "layouts/base-template.njk" %}`, content in `{% block page_content %}`,
`govuk-grid-column-full`, `govukBackLink` to `/system-admin-dashboard`, one `<h1 class="govuk-heading-l">`,
`govukInsetText` coverage summary, and a `govuk-table`. Accessibility requirements are not
optional here — 77 repeated action links is the single most likely audit finding:

- visually hidden `<caption>`;
- `scope="col"` on all five headers; the action header carries visually hidden text rather than being empty;
- the list type cell is `<th scope="row">` so each row has a programmatic row header;
- every action link gets a visually hidden suffix naming its list type, so accessible names are unique (WCAG 2.4.4);
- `govukTag` renders the status **as text** (`govuk-tag--green` / `--grey` / `--red` are decoration only, WCAG 1.4.1) — do not override tag colours;
- blank field names render a translated "Not set" label, never an empty cell.

No inline styles, no custom CSS, no JavaScript.

**Dashboard** — add a "List search configuration" tile to the `tiles` array in both
`(system-admin)/system-admin-dashboard/en.ts` and `cy.ts`, `href: "/list-search-config"`. This is
the only new navigation affordance; the page is otherwise reachable only by typing the URL.

**Success page** — retarget the continue link in `(system-admin)/list-search-config-success/` to
`/list-search-config` so the admin lands back on the coverage table and sees the updated status.

### 3.6 Edit page changes

In `[listTypeId].ts`:

1. Change both `res.render("list-search-config/index", …)` calls to `"list-search-config/edit"` (§1.4).
2. Show which list type is being edited: fetch the list type and pass its friendly name
   (`welshFriendlyName` when `lng=cy`, falling back to `name`), rendered as
   `<span class="govuk-caption-l">` immediately before the `<h1>` so it is announced as heading
   context. Today the page shows a generic heading and the id appears only in the URL.
3. Replace `res.status(400).send("Invalid list type ID")` (unstyled plain text, both handlers)
   with `res.status(400).render("errors/common", { status: 400 })`, and return
   `res.status(404).render("errors/common", { status: 404 })` when the id is numeric but matches no
   active list type. Use the `errors/common` + `status` shape that
   `(system-admin)/manage-list-type/index.ts` already uses, for consistency.
4. Add a `govukBackLink` to `/list-search-config`.
5. Translate the validation messages. Have the service return a stable error **key** and map it to
   locale copy in the controller, replacing today's rendering of the English `error.message`.
   Add `errorCaseNumberTooLong` / `errorCaseNameTooLong` to `en.ts` and `cy.ts`, and wire the
   already-present `errorCaseNumberInvalid` / `errorCaseNameInvalid` keys through. Keep the
   cross-field `errorAtLeastOneFieldRequired` entry **unlinked** in the summary (`field: ""` →
   `href: undefined`): a cross-field error has no single input to focus, and pointing it at an
   arbitrary field would be worse.

Welsh additions follow the house convention of `"[WELSH TRANSLATION REQUIRED: '…']"` placeholders
where no translation is available, with `Object.keys(en)` and `Object.keys(cy)` kept in parity.

### 3.7 CI guard test

`libs/list-types/common/src/list-search-config-data.test.ts` — real imports of both
`listTypeData` and `listSearchConfigData`, no mocks (a mocked guard proves nothing):

- every `listTypeData[].name` appears exactly once in `listSearchConfigData`;
- every `listSearchConfigData[].listTypeName` exists in `listTypeData`;
- no duplicate `listTypeName`;
- every field name is `""` or matches `/^[a-zA-Z0-9_]+$/` and is ≤ 100 chars — the same rules
  `validateFieldName` enforces, so seeded data can never be something the admin UI would reject.

Failure messages must **name** the offending list types, not report a count. This test is what
turns "fixed once" into "cannot regress": adding a list type without a search config entry fails
`yarn test`.

Deliberately **not** asserted: that each field name exists in the corresponding schema or
converter config. The converter registry stores converter *functions*, not their configs
(`non-strategic-list-registry.ts`), so the config is not reachable by list type name without
exporting ~20 config objects and hand-building a map — more new surface than the check is worth.
Value-level correctness is instead handled at authoring time by the §3.2 derivation and at runtime
by the publish-path tests in §5. See §6 Q5 if a stronger automated check is wanted.

---

## 4. Error handling and edge cases

| Scenario | Handling |
|---|---|
| Seeded list type name absent from `list_types` | `INSERT … SELECT` affects zero rows; no error, transaction intact. The guard test is what makes this visible rather than silent |
| Deploy seed re-run | `ON CONFLICT (list_type_id) DO UPDATE` — idempotent, never `P2002` |
| Admin edit overwritten by next deploy | **Intended.** The TypeScript file is the source of truth. Called out as Q1 because it needs product sign-off |
| Both field names blank | Valid end state (`NOT_SEARCHABLE`) for list types with no case identifier, e.g. `SJP_PUBLIC_LIST`. `extractCases` already short-circuits to `[]`, so nothing is written and nothing throws. Note `saveConfig` **cannot** create this state via the UI — only the seed can (Q2) |
| `listTypeId` not an integer | `400` + `errors/common` (was unstyled `res.send`) |
| `listTypeId` integer, no active list type | `404` + `errors/common`. Today a config row can be created for a non-existent list type |
| `friendlyName` / `welshFriendlyName` null | Fall back to `name` — both columns are `String?` |
| Non-System-Admin requests the index | `requireRole([USER_ROLES.SYSTEM_ADMIN])` as the first middleware element, same as the edit page |
| Database unavailable on the index page | Existing error middleware → `500` |
| `TEST_` / `E2E_` list types | Out of scope. They live outside `listTypeData`, are exempt from soft-delete reconciliation, and `libs/test-support/src/routes/test-support/artefacts.ts` already creates rows for them on demand. `extractAndStoreArtefactSearch`'s existing null-config no-op remains their safety net |
| Field-name casing wrong | Silent zero-results failure — exact `in` key match. Mitigated by §3.2 derivation and the PascalCase publish test in §5 |
| Empty `rows` on the index page | Table renders headers with no body rows; must not throw |

Security: all writes go via Prisma or generated SQL built exclusively from compile-time literals
passed through `sqlStr`; no request data reaches the generation path. The index page performs no
writes, so no CSRF surface is added. Field names are not sensitive, so logging is unchanged.

---

## 5. Acceptance criteria mapping

| AC | Satisfied by | Verification |
|---|---|---|
| All list types looked up in the List Search Config | `listSearchConfigData` with one entry per `listTypeData` entry (§3.1–3.2) | Guard test (§3.7) asserts exact 1:1 parity by name |
| Missing list types are added | `generateListSearchConfigSql` on deploy (§3.3); `seedListSearchConfig` locally (§3.4) | `generate-seed-sql.test.ts`: one `INSERT INTO list_search_config` per entry, each resolving `list_type_id` by name subquery with no numeric literal, each carrying `ON CONFLICT (list_type_id) DO UPDATE`, ordered after `list_types` and before soft-delete reconciliation, `'` escaped to `''`, whole output inside one `BEGIN;`/`COMMIT;`, and a both-blank entry still emitting a row |
| Database is up to date / stays up to date | Guard test fails the build on a new list type without an entry | `yarn test` |
| "Confirm" — a human can see coverage | `GET /list-search-config` (§3.5) | Controller test (rows, counts, sort order, Welsh via `lng=cy`, `changeUrl` built from the DB id using an arbitrary fixture id such as `999` to prove ID-independence, `GET[GET.length - 1]` handler, status→tag/action mapping); template test with Cheerio (five `th[scope="col"]`, one `tbody tr` per row, `th[scope="row"]` first cell, "Not set" for blanks, unique accessible link names, tag text present as readable text, Welsh render, `Object.keys(en).sort()` equals `Object.keys(cy).sort()`, empty-state render) |
| Downstream: case search works for a backfilled list type | `extractAndStoreArtefactSearch` now always finds a config | `artefact-search-extractor.test.ts` additions: PascalCase `CaseNumber` extracts from a Crown-shaped payload; both-blank config writes nothing and does not throw; existing null-config no-op retained |
| Welsh | Co-located `en.ts`/`cy.ts`, `welshFriendlyName` for names | Template test renders the `cy` object; key parity asserted |

Test placement follows the repo conventions: Vitest co-located `*.test.ts`; template tests via
`createTestEnvironment` from `@hmcts/test-support` asserting structure with Cheerio (no raw-HTML
string matching, no AAA comments, `toHaveLength` for counts); layered fixture builders.

**E2E** — one `@nightly` test in `e2e-tests/tests/list-search-config.spec.ts` covering the whole
System Admin journey, with validation, Welsh, keyboard and Axe checks **inline** rather than as
separate tests: dashboard → `/list-search-config` → assert rows and status tags → Axe scan →
Welsh toggle → Tab to the first action link and press Enter → edit page shows the list type name →
submit both fields blank → "Enter at least one field name" → Axe scan of the error state → enter a
valid field name → confirm → success page → continue back to the table → status now "Configured".
A second `@nightly` test is justified only for the genuinely distinct journey of a
non-System-Admin being refused.

**Manual verification before merge**
1. `yarn db:drop && yarn db:migrate:dev && yarn db:seed`, then confirm
   `SELECT COUNT(*) FROM list_search_config;` equals `listSearchConfigData.length`.
2. `tsx apps/postgres/prisma/generate-seed-sql.ts > /tmp/seed.sql` and apply it **twice** against a
   seeded database; the second run must succeed with no unique violation and no duplicate rows.
3. Confirm `/list-search-config/1` still resolves to the edit page after adding `index.ts`
   (expected per §1.3, but cheap to check).
4. Publish a fixture for at least one non-strategic list type (e.g. an `FTT_RPT_*`) and confirm
   `artefact_search` rows appear — this is the live check on the §1.5 converter-derived values.
5. On STG after deploy, confirm zero uncovered list types:
   ```sql
   SELECT lt.name FROM list_types lt
   LEFT JOIN list_search_config lsc ON lsc.list_type_id = lt.id
   WHERE lt.deleted_at IS NULL AND lsc.id IS NULL
     AND lt.name NOT LIKE 'TEST_%' AND lt.name NOT LIKE 'E2E_%';
   ```

---

## 6. CLARIFICATIONS NEEDED

1. **Is overwrite-on-deploy the behaviour the service wants?** `ON CONFLICT … DO UPDATE` makes the
   TypeScript file authoritative and guarantees environments converge, but it reverts any admin fix
   made through the UI at the next deploy. The alternative, `DO NOTHING`, satisfies the literal AC
   ("if any list types are not available, these list types are added") and preserves admin edits,
   at the cost of letting environments drift once a seeded value is corrected.
   **Recommendation: `DO UPDATE`**, consistent with how `list_types` already behaves, with
   corrections made in the TypeScript file. It is a one-line change now and a data migration later,
   so it needs deciding before implementation.

2. **Should the edit page be able to create a "deliberately not searchable" row?** `saveConfig`
   rejects both-fields-blank, but the seed will create exactly that for `SJP_PUBLIC_LIST`. So an
   admin can see a `NOT_SEARCHABLE` row but cannot *produce* or *restore* one — if they clear both
   fields they get a validation error. Is that intended, or should the edit page allow clearing
   both to mark a list type deliberately unsearchable? **Recommendation: leave the validation as
   is** (it prevents accidental de-indexing) and treat the seed as the only way to express it.

3. **For the RCJ / administrative-court family (14 list types sharing `RCJ_EXCEL_CONFIG`), should
   `caseDetails` be the case-name field?** The config's `fieldName`s are
   `venue, judge, time, caseNumber, caseDetails, hearingType, additionalInformation` — there is no
   `caseName`. `caseDetails` holds party detail, so mapping it to `caseNameFieldName` would make
   these lists findable by party name on `/case-name-search`. Leaving it `""` means they are
   reference-searchable only. This is a product call about what case-name search should match, and
   it affects a seventh of all list types.

4. **`PCOL_DAILY_CAUSE_LIST` and `MENTAL_HEALTH_TRIBUNAL_HEARING_LIST` have neither a schema package
   nor a registered converter.** Their stored payload shape cannot be determined from this repo.
   Either the publishing team supplies the shape, or both are seeded with `""`/`""`
   (`NOT_SEARCHABLE`) and a follow-up ticket is raised. **Recommendation: seed blank and follow
   up**, so this ticket is not blocked on an external dependency.

5. **Should existing `list_search_config` rows on STG be captured before the first seeded deploy?**
   There may be hand-entered values that are more correct than the derived ones. Dumping the table
   and folding any disagreements into `listSearchConfigData` **before** deploying would preserve
   that knowledge; otherwise `DO UPDATE` discards it. This needs someone to actually run the dump —
   please confirm who.

6. **Out-of-scope defects found during analysis — raise as separate tickets?**
   (a) `list_types.case_number_json_field_name` / `case_name_json_field_name` are dead duplicate
   columns with no application reader (§1.6.1) — drop them?
   (b) `COURT_OF_APPEAL_CIVIL_DIVISION_DAILY_CAUSE_LIST` is registered as a converter name that
   does not exist in `listTypeData`, so that converter is unreachable (§1.6.2) — a one-word fix,
   but it changes live Excel-upload behaviour, so it should not ride along on this ticket.

7. **Note on the pre-planning spec comment:** its §6.6 instruction to "fix the broken
   `configureUrl`" in `manage-list-types` is based on a misreading — `/manage-list-type?id=` is a
   real, working route (§1.6.3). This plan leaves `manage-list-types` untouched. Flagging in case
   that change was actually wanted for a different reason.
