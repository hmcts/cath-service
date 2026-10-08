# #1135: Confirm all lists are in the List Search Config

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** None
**Created:** 2026-10-08T10:12:20Z
**Updated:** 2026-10-08T10:22:12Z

## Description

**PROBLEM STATEMENT**
All the list types available in CaTH need to be available in the List Search Config. 


**AS A** Service
**I WANT** to confirm that all the list types in CaTH are available in the List Search Config
**SO THAT** the data base is up to date


**ACCEPTANCE CRITERIA**
All list types available in CaTH are looked up in the List Search Config and if any list types are not available, these list types are added.

## Comments

### Comment by OgechiOkelu on 2026-10-08T10:14:02Z

@spec

### Comment by hmctsclaudecode on 2026-10-08T10:21:31Z

# Technical Specification — Issue #1135: Confirm all lists are in the List Search Config

## 1. User Story

**As a** System Admin responsible for CaTH reference data
**I want to** see every list type that exists in CaTH alongside its List Search Config entry, and have any missing entries created automatically
**So that** case name and case reference search works for every published list type, and the database is complete and up to date

Secondary beneficiary:

**As a** verified user subscribing to a case
**I want to** find my case by name or reference regardless of which court or tribunal published it
**So that** I am not silently excluded from subscribing because a list type was never configured

---

## 2. Background

`list_search_config` tells CaTH which JSON field names hold the case number and case name for a given list type. It is the only mechanism by which published JSON becomes searchable.

**Current state:**

* Schema: `libs/postgres-prisma/prisma/schema/list-search-config.prisma` — one row per `list_type_id`, with `case_number_field_name` and `case_name_field_name` (both `VARCHAR(100)`, `NOT NULL`, blank permitted).
* Repository/service: `libs/list-search-config/src/repository/queries.ts`, `service.ts`.
* Admin edit page: `apps/web/src/pages/(system-admin)/list-search-config/[listTypeId].ts` → `/list-search-config/:listTypeId`.
* Consumer on publish: `libs/publication/src/artefact-search-extractor.ts` calls `getConfigForListType(listTypeId)`. **If no row exists, the function silently returns and no `artefact_search` rows are written.**
* Consumer on search: `libs/subscriptions/src/repository/queries.ts` (`searchByCaseName`, `searchByCaseNumber`) filters artefacts to `listTypeId IN (SELECT list_type_id FROM list_search_config WHERE ...)`. A list type with no row is invisible to case search.
* Consumed by pages `apps/web/src/pages/(verified)/case-name-search/` and `apps/web/src/pages/(verified)/case-reference-search/`.

**The gap:**

`libs/list-types/common/src/list-type-data.ts` is the source of truth for list types and currently holds **77** entries. `list_search_config` has **no seed path at all** — it is not referenced in `apps/postgres/prisma/generate-seed-sql.ts`, `libs/location/src/seed-list-types.ts` or `apps/postgres/prisma/seed.ts`. Rows exist only where a System Admin has manually visited `/list-search-config/:listTypeId` and saved, or where `libs/test-support/src/routes/test-support/artefacts.ts` created one as a test side effect. Coverage is therefore arbitrary and differs between local, STG and future prod.

**Secondary defect found during analysis:**

`apps/web/src/pages/(system-admin)/manage-list-types/index.ts:15` builds `configureUrl` as `/manage-list-type?id=${listType.id}`, but `manage-list-types/index.njk.test.ts` asserts `/list-search-config/1`. There is currently **no navigable route from any admin page to the List Search Config edit page** — it is reachable only by typing the URL. This blocks the "confirm" half of the acceptance criteria and must be fixed as part of this work.

**Constraint — never key on `listTypeId`:**

`list_types.id` is `autoincrement` and differs per environment (see `CLAUDE.md` → List Type Implementation). The existing `list_search_config.list_type_id` column is an integer FK and stays as-is in the database, but **all seed data, source-of-truth files and tests must key on the stable `list_types.name`**, resolving to `id` via subquery at SQL execution time — the pattern already used by `generateListTypeSubJurisdictionsSql` in `generate-seed-sql.ts:140`.

---

## 3. Acceptance Criteria

* **Scenario:** Deploy-time backfill creates missing config rows
    * **Given** `listTypeData` contains 77 list types and `list_search_config` holds rows for only a subset
    * **When** the postgres deploy pod runs `generate-seed-sql.ts` and applies the generated SQL
    * **Then** every list type named in `listSearchConfigData` has exactly one `list_search_config` row, with `list_type_id` resolved from `list_types.name`
    * **And** the statement is `INSERT ... ON CONFLICT (list_type_id) DO UPDATE`, so re-running the deploy is idempotent and never raises `UniqueConstraintViolation` (P2002)

* **Scenario:** A manually edited config is not clobbered by redeploy
    * **Given** a System Admin has changed `case_name_field_name` for `CIVIL_DAILY_CAUSE_LIST` via `/list-search-config/1`
    * **When** the deploy seed runs again
    * **Then** the row's field names are reset to the seeded source-of-truth values and `updated_at` is refreshed
    * **And** this is the intended behaviour: `list-search-config-data.ts` is the single source of truth, exactly as `list-type-data.ts` is for list types

* **Scenario:** CI guard fails when a list type has no search config entry
    * **Given** a developer adds a new entry to `listTypeData` without adding a matching entry to `listSearchConfigData`
    * **When** `yarn test` runs
    * **Then** the guard test in `libs/list-search-config/src/data/list-search-config-data.test.ts` fails, naming the missing list type
    * **And** the reverse is also enforced: an entry in `listSearchConfigData` whose name is absent from `listTypeData` fails the same test

* **Scenario:** System Admin confirms coverage from the admin UI
    * **Given** I am signed in with the `SYSTEM_ADMIN` role
    * **When** I go to `/list-search-config`
    * **Then** I see a table of all active list types sorted alphabetically by friendly name, each row showing the configured case number field, case name field, a status tag, and a "Change" link
    * **And** list types with a row where both field names are blank show a `NOT SEARCHABLE` tag
    * **And** list types with no row at all show a `MISSING` tag

* **Scenario:** Navigation to the edit page is reachable
    * **Given** I am on `/list-search-config`
    * **When** I activate the "Change" link for Civil Daily Cause List
    * **Then** I am taken to `/list-search-config/<id>` with the current field names pre-populated

* **Scenario:** Non-System-Admin is denied
    * **Given** I am signed in as a verified user (not `SYSTEM_ADMIN`)
    * **When** I request `/list-search-config`
    * **Then** I am refused by `requireRole([USER_ROLES.SYSTEM_ADMIN])`, consistent with `/list-search-config/:listTypeId`

* **Scenario:** Case search returns results for a newly backfilled list type
    * **Given** `SEND_DAILY_HEARING_LIST` previously had no `list_search_config` row and its artefacts produced no `artefact_search` rows
    * **When** the backfill runs and a new SEND artefact is published
    * **Then** `extractAndStoreArtefactSearch` writes `artefact_search` rows using `caseReferenceNumber`
    * **And** a verified user searching that reference on `/case-reference-search` sees the hearing

* **Scenario:** Welsh language
    * **Given** I am a System Admin on `/list-search-config?lng=cy`
    * **When** the page renders
    * **Then** all headings, column headers, status tags and link text are in Welsh
    * **And** the list type name shown is `welsh_friendly_name`

---

## 4. User Journey Flow

### 4.1 System Admin confirmation journey (interactive)

```
┌──────────────────────────┐
│  System Admin Dashboard  │
│   /system-admin-dashboard│
└────────────┬─────────────┘
             │ "List search config"
             ▼
┌──────────────────────────────────────────────┐
│  /list-search-config                         │
│  Table: all active list types                │
│  Columns: List type | Case number field |    │
│           Case name field | Status | Change  │
│  Status: CONFIGURED / NOT SEARCHABLE / MISSING│
└────────────┬─────────────────────────────────┘
             │ "Change" (row)
             ▼
┌──────────────────────────────────────────────┐
│  /list-search-config/:listTypeId             │
│  (existing page, unchanged behaviour)        │
│  Two text inputs + Confirm                   │
└────────────┬─────────────────────────────────┘
             │ POST valid
             ▼
┌──────────────────────────────────────────────┐
│  /list-search-config-success                 │
│  Panel + "Back to list search config" link   │
└────────────┬─────────────────────────────────┘
             │
             ▼  back to /list-search-config (status now CONFIGURED)
```

### 4.2 Reconciliation flow (automated, no UI)

```
 libs/list-types/common/src/list-type-data.ts       (77 list types, source of truth)
 libs/list-search-config/src/data/
   list-search-config-data.ts                       (NEW: 77 entries, keyed by name)
                    │
                    │  guard test asserts 1:1 name parity
                    ▼
 apps/postgres/prisma/generate-seed-sql.ts
   generateListSearchConfigSql(listSearchConfigData)
                    │
                    ▼
   INSERT INTO list_search_config (...)
   SELECT id, 'caseNumber', 'caseName' FROM list_types WHERE name = '...'
   ON CONFLICT (list_type_id) DO UPDATE SET ...
                    │
                    ▼
 apps/postgres/start.sh  →  prisma db execute --file /tmp/seed.sql
   (single-replica deploy pod; autoscaling disabled — no concurrent seeders)
                    │
                    ├── local:  yarn db:seed → apps/postgres/prisma/seed.ts
                    │            → seedListSearchConfig() (Prisma upsert, single process)
                    ▼
 Every environment converges on identical coverage
```

### 4.3 Downstream effect on publish

```
 POST /api/v1/publication (JSON)
        │
        ▼
 libs/publication/src/processing/service.ts
        │
        ▼
 extractAndStoreArtefactSearch(artefactId, listTypeId, jsonPayload)
        │
        ├─ getConfigForListType(listTypeId)
        │     BEFORE: null for ~unknown number of list types → silent no-op
        │     AFTER:  always a row → fields extracted
        ▼
 artefact_search rows written
        │
        ▼
 /case-name-search and /case-reference-search return the hearing
```

---

## 5. Low Fidelity Wireframe

### 5.1 `/list-search-config` — new index page

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK  Court and Tribunal Hearings                        [Sign out]          │
├────────────────────────────────────────────────────────────────────────────────┤
│ BETA   This is a new service – your feedback will help us improve it.          │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  < Back                                                                        │
│                                                                                │
│  List search configuration                                                     │
│  ═════════════════════════                                                     │
│                                                                                │
│  Case name and case reference search only works for list types that have       │
│  search fields configured. Check the list below and add any that are missing.  │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  74 of 77 list types are searchable.                                     │  │
│  │  3 list types have no search fields configured.                          │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│   (govukInsetText)                                                             │
│                                                                                │
│  ┌─────────────────────────────┬──────────────┬─────────────┬────────┬──────┐  │
│  │ List type                   │ Case number  │ Case name   │ Status │      │  │
│  │                             │ field        │ field       │        │      │  │
│  ├─────────────────────────────┼──────────────┼─────────────┼────────┼──────┤  │
│  │ Administrative Court Daily  │ caseNumber   │ —           │[GREEN  │Change│  │
│  │ Cause List (Birmingham)     │              │             │ CONFIG-│      │  │
│  │                             │              │             │ URED]  │      │  │
│  ├─────────────────────────────┼──────────────┼─────────────┼────────┼──────┤  │
│  │ AST Daily Hearing List      │ appealRefer- │ appellant   │[GREEN  │Change│  │
│  │                             │ enceNumber   │             │ CONFIG-│      │  │
│  │                             │              │             │ URED]  │      │  │
│  ├─────────────────────────────┼──────────────┼─────────────┼────────┼──────┤  │
│  │ SJP Public List             │ —            │ —           │[GREY   │Change│  │
│  │                             │              │             │ NOT    │      │  │
│  │                             │              │             │ SEARCH-│      │  │
│  │                             │              │             │ ABLE]  │      │  │
│  ├─────────────────────────────┼──────────────┼─────────────┼────────┼──────┤  │
│  │ Some New List Type          │ —            │ —           │[RED    │Add   │  │
│  │                             │              │             │MISSING]│      │  │
│  └─────────────────────────────┴──────────────┴──────────────┴────────┴──────┘  │
│                                                                                │
├────────────────────────────────────────────────────────────────────────────────┤
│ Footer: Accessibility statement | Cookies | Privacy policy | Terms             │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 `/list-search-config/:listTypeId` — existing edit page (list type name added)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  < Back  (to /list-search-config)                                              │
│                                                                                │
│  Configure list type search fields                                             │
│  ════════════════════════════════                                              │
│                                                                                │
│  Civil Daily Cause List            ← NEW: caption identifies the list type      │
│                                                                                │
│  Enter the JSON field names used to extract case details for this list type.   │
│                                                                                │
│  Case number JSON field name                                                   │
│  ┌──────────────────────────────────┐                                          │
│  │ caseNumber                       │                                          │
│  └──────────────────────────────────┘                                          │
│                                                                                │
│  Case name JSON field name                                                     │
│  ┌──────────────────────────────────┐                                          │
│  │ caseName                         │                                          │
│  └──────────────────────────────────┘                                          │
│                                                                                │
│  ┌──────────┐                                                                  │
│  │ Confirm  │                                                                  │
│  └──────────┘                                                                  │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Error state on the edit page (unchanged, shown for completeness)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  ╔══════════════════════════════════════════════════════════════════════════╗  │
│  ║ There is a problem                                                       ║  │
│  ║                                                                          ║  │
│  ║ • Enter at least one field name                                          ║  │
│  ╚══════════════════════════════════════════════════════════════════════════╝  │
│                                                                                │
│  Configure list type search fields                                             │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Page Specifications

### 6.1 New source-of-truth file

**`libs/list-search-config/src/data/list-search-config-data.ts`**

```typescript
export interface ListSearchConfigEntry {
  listTypeName: string;
  caseNumberFieldName: string;
  caseNameFieldName: string;
}

export const listSearchConfigData: ListSearchConfigEntry[] = [ /* 77 entries */ ];
```

* Keyed on `listTypeName` (the stable `list_types.name`). **No numeric `id` anywhere in this file, including comments.**
* Blank string (`""`) is a legitimate value and means "this list type has no field of that kind". It is not a placeholder for "to be decided".
* Exported from `libs/list-search-config/src/index.ts`, and additionally via a dedicated `./list-search-config-data` package subpath so `generate-seed-sql.ts` can import it without pulling in `@hmcts/postgres-prisma` — mirroring the `@hmcts/list-types-common/list-type-data` subpath and the comment at the head of `generate-seed-sql.ts`.

**Field values derived from the list type JSON schemas** (`libs/list-types/*/src/schemas/*.json`). Representative groups:

| List type group | Case number field | Case name field | Schema evidence |
|---|---|---|---|
| `CIVIL_DAILY_CAUSE_LIST`, `FAMILY_DAILY_CAUSE_LIST`, `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST`, `COP_DAILY_CAUSE_LIST`, `PCOL_DAILY_CAUSE_LIST` | `caseNumber` | `caseName` | `civil-daily-cause-list.json` etc. |
| `ET_DAILY_LIST`, `ET_FORTNIGHTLY_PRESS_LIST` | `caseNumber` | `""` | `et-daily-list.json` has no `caseName` |
| `CROWN_DAILY_PDDA_LIST`, `CROWN_FIRM_PDDA_LIST`, `CROWN_WARNED_PDDA_LIST` | `CaseNumber` | `""` | `crown-daily-list.json` — **PascalCase keys** |
| `MAGISTRATES_PUBLIC_LIST`, `MAGISTRATES_STANDARD_LIST`, `SJP_PRESS_LIST`, `SJP_DELTA_PRESS_LIST` | `caseUrn` | `""` | `magistrates-public-list.json`, `sjp-press-list.json` |
| `MAGISTRATES_ADULT_COURT_LIST_*`, `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_*` | `caseno` | `""` | `magistrates-adult-court-list.json` — lowercase `caseno` |
| `SJP_PUBLIC_LIST`, `SJP_DELTA_PUBLIC_LIST` | `""` | `""` | `sjp-public-list.json` exposes only party/offence data — no case identifier |
| `SSCS_*_DAILY_HEARING_LIST`, `UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST` | `appealReferenceNumber` | `""` | `sscs-daily-hearing-list.json` |
| `AST_DAILY_HEARING_LIST` | `appealReferenceNumber` | `""` | `ast-daily-hearing-list.json` |
| `UTIAC_JR_*_DAILY_HEARING_LIST` | `caseReferenceNumber` | `caseTitle` | `utiac-jr-daily-hearing-list.json` |
| `CIC_WEEKLY_HEARING_LIST`, `GRC_*`, `WPAFCC_*`, `FTT_TAX_CHAMBER_*`, `FTT_LANDS_REGISTRATION_*`, `UT_LANDS_CHAMBER_*`, `UT_TAX_AND_CHANCERY_*` | `caseReferenceNumber` | `caseName` | respective `*-weekly-hearing-list.json` |
| `FTT_RPT_*_WEEKLY_HEARING_LIST` (6 regions) | `caseReferenceNumber` | `""` | `ftt-rpt-weekly-hearing-list.json` |
| `SEND_DAILY_HEARING_LIST`, `SIAC_/POAC_/PAAC_WEEKLY_HEARING_LIST`, `UT_ADMINISTRATIVE_APPEALS_CHAMBER_*` | `caseReferenceNumber` | `""` | respective schemas |
| `CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST`, `PHT_WEEKLY_HEARING_LIST`, `MENTAL_HEALTH_TRIBUNAL_HEARING_LIST` | `""` | `caseName` | `care-standards-...json`, `pht-...json` |
| RCJ family: `CIVIL_COURTS_RCJ_*`, `COUNTY_COURT_LONDON_*`, `COURT_OF_APPEAL_CRIMINAL_*`, `COURT_OF_APPEAL_CIVIL_*`, `FAMILY_DIVISION_HIGH_COURT_*`, `KINGS_BENCH_*`, `MAYOR_CITY_*`, `SENIOR_COURTS_COSTS_OFFICE_*`, `*_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` (6), `HIGH_COURT_CIVIL_*`, `HIGH_COURT_FAMILY_*`, `CIRCUIT_COMMERCIAL_COURT_*`, `BUSINESS_AND_PROPERTY_*` | `caseNumber` | `""` | `rcj-standard-daily-cause-list.json`, `administrative-court-daily-cause-list.json` |
| `BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST`, `INTERIM_APPLICATIONS_DAILY_CAUSE_LIST` | `caseNumber` | `caseName` | respective schemas |
| `IAC_DAILY_LIST`, `IAC_DAILY_LIST_ADDITIONAL_CASES` | `caseNumber` | `""` | `iac-daily-list.json` |

The implementer **must** re-read each schema before committing the value — the table above is the analysis output, not a substitute for verification. Where a schema offers no case identifier, use `""`; do not invent a field name.

### 6.2 Seed generation — `apps/postgres/prisma/generate-seed-sql.ts`

Add `generateListSearchConfigSql(listSearchConfigData)` to the statement array in `generateSeedSql`, positioned **after** `generateListTypesSql` (the `list_types` rows must exist for the name→id subquery to resolve) and **before** `generateSoftDeleteReconciliationSql`.

```typescript
function generateListSearchConfigSql(entries: ListSearchConfigEntry[]): string {
  // list_search_config.id has no database default (Prisma's uuid() is application-level
  // only), so a raw INSERT must supply it. A deterministic id keeps re-runs stable.
  // list_type_id references the autoincrement list_types.id, which the TypeScript source
  // does not know — resolve it by name via a subquery so the link is stable across environments.
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

Notes:

* `INSERT ... SELECT` is used rather than `VALUES`, because `list_type_id` must come from a subquery. If the named list type is absent, `SELECT` yields zero rows and the statement is a safe no-op — it does not abort the surrounding transaction.
* `ON CONFLICT (list_type_id)` targets the existing `list_search_config_list_type_id_key` unique index.
* Deterministic `id` of `seedlsc_<lowercased name>` — max name length in `listTypeData` is well inside the `TEXT` column, so no truncation risk.
* The whole seed already runs inside a single `BEGIN; ... COMMIT;`, so partial application is impossible.
* **Do not** write a hand-authored `.sql` migration for the data. Per `CLAUDE.md`, data seeding is generated from TypeScript; only schema changes go in `apps/postgres/prisma/migrations/`. This ticket requires **no schema migration** — the table and unique index already exist.

### 6.3 Local seed path — `libs/list-search-config/src/data/seed-list-search-config.ts`

```typescript
export async function seedListSearchConfig(): Promise<void>
```

* Resolves `listTypeId` by `prisma.listType.findUnique({ where: { name }, select: { id: true } })`, then `prisma.listSearchConfig.upsert({ where: { listTypeId }, ... })`.
* Skips (with a `console.warn` naming the list type) when the list type is not found, so the local seed does not fail on a partially seeded database.
* Called from `apps/postgres/prisma/seed.ts` **after** `seedLocationData()`/`seedListTypes()`, matching the existing ordering dependency.
* Prisma `upsert` is non-atomic, which is acceptable here and only here: `yarn db:seed` is single-process. The deploy path uses the generated `ON CONFLICT` SQL for exactly this reason.

### 6.4 New index page — `apps/web/src/pages/(system-admin)/list-search-config/index.ts`

Co-exists with `[listTypeId].ts` in the same directory; auto-discovery maps `index.ts` → `/list-search-config` and `[listTypeId].ts` → `/list-search-config/:listTypeId`.

```typescript
export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
```

`getHandler` responsibilities (no business logic — delegate):

1. `const language = req.query.lng === "cy" ? "cy" : "en";` (matches `manage-list-types/index.ts`).
2. Call a new service function `getConfigCoverage()` from `@hmcts/list-search-config`.
3. Map to view rows: `{ name, caseNumberFieldName, caseNameFieldName, status, changeUrl }`, sorted by `name.localeCompare(name)`.
4. `res.render("list-search-config/index", { ...content, rows, configuredCount, totalCount, missingCount })`.

**New service function — `libs/list-search-config/src/repository/service.ts`:**

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

**New query — `libs/list-search-config/src/repository/queries.ts`:**

```typescript
export async function findAllListTypesWithConfig() {
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

Two queries joined in memory by `listTypeId` — there is no Prisma relation between `ListType` and `ListSearchConfig` (the FK is unmodelled), so a single nested `select` is not available. Both result sets are bounded at ~77 rows, so this is not an N+1 and does not warrant adding pagination. Filtering and ordering stay at the database level.

Status derivation (pure function, no I/O):

| Condition | Status |
|---|---|
| No `list_search_config` row for the list type | `MISSING` |
| Row exists, both field names blank/whitespace | `NOT_SEARCHABLE` |
| Row exists, at least one field name populated | `CONFIGURED` |

### 6.5 New template — `apps/web/src/pages/(system-admin)/list-search-config/index.njk`

* `{% extends "layouts/base-template.njk" %}`, content in `{% block page_content %}`.
* `govuk-grid-column-full` (five-column table).
* `govukBackLink` to `/system-admin-dashboard`.
* `<h1 class="govuk-heading-l">{{ heading }}</h1>`.
* `govukInsetText` with the coverage summary.
* `govuk-table` with a visually hidden `<caption>`, `<th scope="col">` headers, and `<td>` cells. Column-index constants are used in the template test, not the template.
* `govukTag` per row: `govuk-tag--green` (CONFIGURED), `govuk-tag--grey` (NOT_SEARCHABLE), `govuk-tag--red` (MISSING).
* Blank field names render as `{{ row.caseNumberFieldName or notSetText }}` where `notSetText` is a translated en-dash label — **not** an empty cell, so screen readers announce something.
* Action link text is `changeLink` for existing rows and `addLink` for `MISSING` rows, each with a visually hidden suffix naming the list type (see §12).
* No inline styles, no custom CSS, no JavaScript.

### 6.6 Changes to the existing edit page

**`apps/web/src/pages/(system-admin)/list-search-config/[listTypeId].ts`:**

1. Fetch the list type's friendly name and pass it to the template so the admin can see which list type they are editing. Currently the page shows only a generic heading and the ID is visible only in the URL. Use `welshFriendlyName` when `lng=cy`.
2. Return `404` (not `400`) via the standard error view when the `listTypeId` does not resolve to an active list type. The current behaviour — `res.status(400).send("Invalid list type ID")` — returns unstyled plain text; replace with `res.status(400).render("errors/common", ...)` for a non-numeric param and `res.status(404).render("errors/404")` for a numeric param with no matching list type.
3. On successful POST, redirect to `/list-search-config-success` (unchanged).

**`apps/web/src/pages/(system-admin)/manage-list-types/index.ts:15`** — fix the broken `configureUrl`. Decision: `manage-list-types` is about list type metadata, not search config, so its "Configure" link should keep pointing at `/manage-list-type?id=`. The stale assertion in `manage-list-types/index.njk.test.ts` (which expects `/list-search-config/1`) must be updated to match, since that fixture no longer reflects the real controller output. Search-config navigation is served by the new `/list-search-config` index page instead.

**`apps/web/src/pages/(system-admin)/system-admin-dashboard/`** — add a "List search configuration" card/link to `/list-search-config`, with co-located `en.ts`/`cy.ts` entries.

**`apps/web/src/pages/(system-admin)/list-search-config-success/`** — change the continue link to point at `/list-search-config` so the admin returns to the coverage table and sees the updated status.

### 6.7 CI guard test

**`libs/list-search-config/src/data/list-search-config-data.test.ts`** — imports the real `listTypeData` and the real `listSearchConfigData` (no mocks) and asserts:

* Every `listTypeData[].name` appears exactly once in `listSearchConfigData`.
* Every `listSearchConfigData[].listTypeName` appears in `listTypeData`.
* No duplicate `listTypeName` values.
* Every field name is either `""` or matches `/^[a-zA-Z0-9_]+$/` and is ≤ 100 characters — the same `FIELD_NAME_PATTERN` and length limit enforced by `validateFieldName` in `service.ts`, so seeded data can never be something the admin UI would reject.

Failure messages must name the offending list type(s), not just report a count.

---

## 7. Content

All user-facing strings are co-located with the controller per the default pattern.

### 7.1 `apps/web/src/pages/(system-admin)/list-search-config/en.ts` (additions)

```typescript
export const en = {
  // ...existing edit-page keys unchanged...
  indexPageTitle: "List search configuration",
  indexHeading: "List search configuration",
  indexBody:
    "Case name and case reference search only works for list types that have search fields configured. Check the list below and add any that are missing.",
  coverageSummary: (configured: number, total: number) =>
    `${configured} of ${total} list types are searchable.`,
  coverageMissing: (missing: number) =>
    missing === 1
      ? "1 list type has no search fields configured."
      : `${missing} list types have no search fields configured.`,
  tableCaption: "List types and their configured search fields",
  listTypeColumnHeading: "List type",
  caseNumberColumnHeading: "Case number field",
  caseNameColumnHeading: "Case name field",
  statusColumnHeading: "Status",
  actionColumnHeading: "Action",
  notSetText: "Not set",
  statusConfigured: "Configured",
  statusNotSearchable: "Not searchable",
  statusMissing: "Missing",
  changeLink: "Change",
  addLink: "Add",
  changeLinkHiddenSuffix: (listTypeName: string) => `search fields for ${listTypeName}`,
  backLinkText: "Back",
  // Edit page addition
  listTypeCaption: (listTypeName: string) => listTypeName
};
```

### 7.2 `apps/web/src/pages/(system-admin)/list-search-config/cy.ts` (additions)

```typescript
export const cy = {
  // ...existing edit-page keys unchanged...
  indexPageTitle: "[TRANSLATE: \"List search configuration\"]",
  indexHeading: "[TRANSLATE: \"List search configuration\"]",
  indexBody:
    "[TRANSLATE: \"Case name and case reference search only works for list types that have search fields configured. Check the list below and add any that are missing.\"]",
  coverageSummary: (configured: number, total: number) =>
    `[WELSH TRANSLATION REQUIRED: "${configured} of ${total} list types are searchable."]`,
  coverageMissing: (missing: number) =>
    missing === 1
      ? "[TRANSLATE: \"1 list type has no search fields configured.\"]"
      : `[WELSH TRANSLATION REQUIRED: "${missing} list types have no search fields configured."]`,
  tableCaption: "[TRANSLATE: \"List types and their configured search fields\"]",
  listTypeColumnHeading: "[TRANSLATE: \"List type\"]",
  caseNumberColumnHeading: "[TRANSLATE: \"Case number field\"]",
  caseNameColumnHeading: "[TRANSLATE: \"Case name field\"]",
  statusColumnHeading: "[TRANSLATE: \"Status\"]",
  actionColumnHeading: "[TRANSLATE: \"Action\"]",
  notSetText: "[TRANSLATE: \"Not set\"]",
  statusConfigured: "[TRANSLATE: \"Configured\"]",
  statusNotSearchable: "[TRANSLATE: \"Not searchable\"]",
  statusMissing: "[TRANSLATE: \"Missing\"]",
  changeLink: "[TRANSLATE: \"Change\"]",
  addLink: "[TRANSLATE: \"Add\"]",
  changeLinkHiddenSuffix: (listTypeName: string) =>
    `[WELSH TRANSLATION REQUIRED: "search fields for ${listTypeName}"]`,
  backLinkText: "[TRANSLATE: \"Back\"]",
  listTypeCaption: (listTypeName: string) => listTypeName
};
```

### 7.3 System admin dashboard additions

```typescript
// en.ts
listSearchConfigCardTitle: "List search configuration",
listSearchConfigCardDescription: "Check and set the JSON field names used for case search."

// cy.ts
listSearchConfigCardTitle: "[TRANSLATE: \"List search configuration\"]",
listSearchConfigCardDescription:
  "[TRANSLATE: \"Check and set the JSON field names used for case search.\"]"
```

### 7.4 Content rules

* List type names in the table come from the database (`friendlyName` / `welshFriendlyName`), never hardcoded in the controller or template — hardcoded English court names would not switch with the locale.
* `Object.keys(en).sort()` must equal `Object.keys(cy).sort()` — asserted in the template test.
* Reading age: the inset-text summary and body copy avoid "config", "JSON schema" and "backfill" in the index page prose. "JSON field name" is retained on the edit page because the audience is System Admins who work directly with upload payloads, and it already ships in production copy.

---

## 8. URL

| Method | Path | Handler | Auth | Status |
|---|---|---|---|---|
| `GET` | `/list-search-config` | `apps/web/src/pages/(system-admin)/list-search-config/index.ts` | `SYSTEM_ADMIN` | **New** |
| `GET` | `/list-search-config/:listTypeId` | `.../list-search-config/[listTypeId].ts` | `SYSTEM_ADMIN` | Existing — amended (§6.6) |
| `POST` | `/list-search-config/:listTypeId` | `.../list-search-config/[listTypeId].ts` | `SYSTEM_ADMIN` | Existing — unchanged |
| `GET` | `/list-search-config-success` | `.../list-search-config-success/index.ts` | `SYSTEM_ADMIN` | Existing — continue link retargeted |

Welsh is selected by the `?lng=cy` query parameter, consistent with the rest of `(system-admin)`: `/list-search-config?lng=cy`.

`(system-admin)` is a route group — the parentheses organise the code and contribute **no** URL prefix. Auto-discovery registers both `index.ts` and `[listTypeId].ts` from the same directory; `index.ts` must not shadow the dynamic route, so confirm after implementation that `/list-search-config/1` still resolves to the edit page.

No new API endpoints. The coverage data is read server-side by the page controller; exposing it over `/api` would add an endpoint with no consumer (YAGNI).

---

## 9. Validation

### 9.1 `/list-search-config` (index page)

Read-only, no form, no user input. The only inputs are:

| Input | Rule | Behaviour on failure |
|---|---|---|
| `lng` query parameter | Treated as `cy` only on exact match; anything else falls back to `en` | Silent fallback to English (existing pattern) |
| Session role | Must include `SYSTEM_ADMIN` | `requireRole` middleware handles; see §11 |

### 9.2 `/list-search-config/:listTypeId` (edit page) — existing rules retained

Enforced by `validateFieldName` and `saveConfig` in `libs/list-search-config/src/repository/service.ts`:

| Field | Rule | Notes |
|---|---|---|
| `caseNumberFieldName` | Optional. If present, must match `/^[a-zA-Z0-9_]+$/` | `FIELD_NAME_PATTERN` |
| `caseNumberFieldName` | Max 100 characters | Matches `VARCHAR(100)` column |
| `caseNameFieldName` | Same two rules as above | |
| Both together | At least one must be non-blank after trimming | Cross-field rule |
| Both | Trimmed before persistence; blank/whitespace normalised to `""` | |

| Path parameter | Rule | Behaviour on failure |
|---|---|---|
| `listTypeId` | Must parse as an integer via `getParamAsNumber` | `400` + rendered `errors/common` (was unstyled `res.send`) |
| `listTypeId` | Must match an active (`deletedAt: null`) `list_types` row | `404` + rendered `errors/404` (**new** — currently a config row can be created for a non-existent list type) |

Validation is server-side only. The form carries `novalidate`, there is no client-side validation, and the page works with JavaScript disabled.

### 9.3 Seed data validation (build/CI time)

| Rule | Enforced by |
|---|---|
| 1:1 name parity between `listTypeData` and `listSearchConfigData` | `list-search-config-data.test.ts` |
| No duplicate `listTypeName` | `list-search-config-data.test.ts` |
| Field names are `""` or match `FIELD_NAME_PATTERN` | `list-search-config-data.test.ts` |
| Field names ≤ 100 characters | `list-search-config-data.test.ts` |
| Generated SQL string-escapes every value | `sqlStr` in `generate-seed-sql.ts` (`'` → `''`) |

### 9.4 Security

* All writes go through Prisma (`upsert`) or the generated seed SQL. The seed SQL is built exclusively from compile-time TypeScript literals passed through `sqlStr`, which doubles single quotes — no user input reaches it, and there is no interpolation of request data anywhere in the generation path.
* The index page performs no writes, so no CSRF surface is added.
* Field names are not secrets; no change to logging. The existing `console.error` in `artefact-search-extractor.ts` logs an artefact ID only, no case data.
* `requireRole([USER_ROLES.SYSTEM_ADMIN])` is applied as the first element of the `GET` middleware array on every new handler.

---

## 10. Error Messages

### 10.1 Edit page validation errors (existing — no new copy required)

| Trigger | Error summary and inline message (en) | Key |
|---|---|---|
| Both fields blank | "Enter at least one field name" | `errorAtLeastOneFieldRequired` |
| Case number field has invalid characters | "Case number field name must contain only letters, numbers and underscores" | `errorCaseNumberInvalid` |
| Case name field has invalid characters | "Case name field name must contain only letters, numbers and underscores" | `errorCaseNameInvalid` |
| Either field over 100 characters | "Case number field name must be 100 characters or less" / "Case name field name must be 100 characters or less" | generated in `validateFieldName` |
| Error summary title | "There is a problem" | `errorSummaryTitle` |

Note on an existing defect to fix while in this code: the length error messages are built by string concatenation inside `validateFieldName` (`` `${fieldLabel} must be 100 characters or less` ``) using an English label passed from the controller. These messages therefore **do not translate**. Move them into `en.ts`/`cy.ts` as keyed entries and have the service return a stable error key that the controller maps to translated copy:

```typescript
// en.ts
errorCaseNumberTooLong: "Case number field name must be 100 characters or less",
errorCaseNameTooLong: "Case name field name must be 100 characters or less"

// cy.ts
errorCaseNumberTooLong: "[TRANSLATE: \"Case number field name must be 100 characters or less\"]",
errorCaseNameTooLong: "[TRANSLATE: \"Case name field name must be 100 characters or less\"]"
```

The same applies to the existing `errorCaseNumberInvalid`/`errorCaseNameInvalid` pair: the keys are already present in both locale files but the controller currently renders the English string returned by the service instead of looking the key up. Wire the controller to the locale keys.

### 10.2 New error pages

| Condition | HTTP | Page | Copy source |
|---|---|---|---|
| `listTypeId` is not an integer | `400` | `errors/common` | existing shared error content |
| `listTypeId` is an integer with no active list type | `404` | `errors/404` | existing shared error content |
| Not signed in | handled by `requireRole` | sign-in redirect | existing |
| Signed in without `SYSTEM_ADMIN` | handled by `requireRole` | `403`/unauthorised view | existing |
| Database unavailable on the index page | `500` | `errors/500` ("Sorry, there is a problem with the service") | existing |

### 10.3 Non-error status labels (not error messages)

The `MISSING` and `NOT SEARCHABLE` tags are **status**, not validation failures. They must not use `govuk-error-message`, must not trigger an error summary, and must not be the only carrier of the information — the status word is rendered as text inside the tag, and the field columns independently show "Not set".

### 10.4 Seed failure messages (developer-facing)

| Condition | Message |
|---|---|
| Guard test: list type with no search config entry | `` `Missing list search config entry for list type(s): ${names.join(", ")}` `` |
| Guard test: orphan search config entry | `` `List search config entry references unknown list type(s): ${names.join(", ")}` `` |
| Local seed: list type name not found in database | `` console.warn(`Skipping list search config for unknown list type "${name}" — run the list type seed first`) `` |

The deploy seed produces no message for a missing list type: the `INSERT ... SELECT` simply affects zero rows. The guard test is the mechanism that prevents this from going unnoticed, which is why it is mandatory rather than optional.

---

## 11. Navigation

### 11.1 Entry points to `/list-search-config`

* **System Admin Dashboard** → new "List search configuration" link. This is the only new navigation affordance for end users.
* Direct URL (System Admins who bookmark it).

### 11.2 Links out of `/list-search-config`

| Element | Target | Notes |
|---|---|---|
| Back link | `/system-admin-dashboard` | `govukBackLink`; required on this page because it is a sub-page of the dashboard |
| Row action (`CONFIGURED` / `NOT_SEARCHABLE`) | `/list-search-config/<id>` | Link text "Change" |
| Row action (`MISSING`) | `/list-search-config/<id>` | Link text "Add" — same destination; the edit page handles a non-existent row by rendering empty inputs via `existingConfig?.caseNumberFieldName \|\| ""` |
| Welsh toggle | `?lng=cy` | Provided by the shared layout |

The `lng` parameter is **not** propagated onto the row action links in this spec, matching the existing `manage-list-types` behaviour where `configureUrl` carries no `lng`. If the implementer finds the language is lost on navigation during Welsh testing, append `lng` to `changeUrl` in the controller — but do that as a deliberate change with a test, not incidentally.

### 11.3 Links into and out of the edit page

| From | Element | Target |
|---|---|---|
| `/list-search-config/:id` | Back link (**new**) | `/list-search-config` |
| `/list-search-config/:id` | `POST` success | `302` → `/list-search-config-success` (preserving `?lng=cy`) |
| `/list-search-config/:id` | `POST` validation failure | Re-render in place (`200`), no redirect, user input preserved via `data` |
| `/list-search-config-success` | Continue link (**retargeted**) | `/list-search-config` (was the dashboard) |

### 11.4 Redirect rules

* Successful `POST` always redirects (`303`-equivalent Express `res.redirect`) to prevent duplicate submission on refresh — already implemented.
* The success page is reachable directly; it carries no state, so no guard is added. Adding one would be speculative.
* No change to `manage-list-types` navigation targets (§6.6).

### 11.5 Flow summary

```
system-admin-dashboard
      │
      ▼
/list-search-config ◄──────────────────────────┐
      │  Change / Add                          │
      ▼                                        │
/list-search-config/:listTypeId                │
      │              └── Back ─────────────────┤
      │ POST valid                             │
      ▼                                        │
/list-search-config-success ───── Continue ────┘
```

---

## 12. Accessibility

WCAG 2.2 AA is mandatory. The index page is a data table with repeated action links — the two patterns that most commonly fail.

### 12.1 Page structure

* `<title>` is `indexPageTitle` and matches the `<h1>` text exactly.
* One `<h1 class="govuk-heading-l">` per page. No heading levels skipped; the page has no `<h2>`.
* `govukSkipLink` and the phase banner come from `layouts/base-template.njk` — do not re-declare them.
* `lang` attribute on `<html>` is set by the i18n middleware; verify it is `cy` when `?lng=cy`.

### 12.2 Table semantics

```njk
<table class="govuk-table">
  <caption class="govuk-table__caption govuk-visually-hidden">{{ tableCaption }}</caption>
  <thead class="govuk-table__head">
    <tr class="govuk-table__row">
      <th scope="col" class="govuk-table__header">{{ listTypeColumnHeading }}</th>
      <th scope="col" class="govuk-table__header">{{ caseNumberColumnHeading }}</th>
      <th scope="col" class="govuk-table__header">{{ caseNameColumnHeading }}</th>
      <th scope="col" class="govuk-table__header">{{ statusColumnHeading }}</th>
      <th scope="col" class="govuk-table__header">
        <span class="govuk-visually-hidden">{{ actionColumnHeading }}</span>
      </th>
    </tr>
  </thead>
  <tbody class="govuk-table__body">
    {% for row in rows %}
      <tr class="govuk-table__row">
        <th scope="row" class="govuk-table__header">{{ row.name }}</th>
        <td class="govuk-table__cell">{{ row.caseNumberFieldName or notSetText }}</td>
        <td class="govuk-table__cell">{{ row.caseNameFieldName or notSetText }}</td>
        <td class="govuk-table__cell">{{ govukTag({ text: row.statusText, classes: row.statusClasses }) }}</td>
        <td class="govuk-table__cell govuk-table__cell--numeric">
          <a class="govuk-link" href="{{ row.changeUrl }}">
            {{ row.actionText }}<span class="govuk-visually-hidden"> {{ changeLinkHiddenSuffix(row.name) }}</span>
          </a>
        </td>
      </tr>
    {% endfor %}
  </tbody>
</table>
```

Requirements this encodes:

* `<caption>` present (visually hidden) so screen reader users get the table's purpose — matching the existing `manage-list-types/index.njk`.
* `scope="col"` on every column header; `scope="row"` with `<th>` on the list type name so each row has a programmatic row header. Without it, a screen reader reading "caseNumber, Configured, Change" gives no indication which list type it belongs to.
* The empty action header carries visually hidden text rather than being genuinely empty — an empty `<th>` is announced as nothing and breaks the header/cell association.
* Every "Change"/"Add" link has a visually hidden suffix naming the list type, so the accessible name is unique (WCAG 2.4.4 Link Purpose, and 2.4.9 at AAA). Seventy-seven links all named "Change" is the single most likely audit finding on this page.
* Blank field values render as "Not set", never an empty cell.

### 12.3 Status not conveyed by colour alone (WCAG 1.4.1)

`govukTag` renders the status word as text inside the tag. The green/grey/red variants are decoration. A user who cannot perceive colour reads "Configured", "Not searchable", "Missing". Additionally the field columns show "Not set", giving a second, colour-independent signal.

Contrast: the GOV.UK Design System tag colour pairs (`govuk-tag--green`, `--grey`, `--red`) already meet 4.5:1 against their backgrounds. Do not override tag colours with custom CSS.

### 12.4 Keyboard and focus

* The page is links-and-text only — no custom widgets, no JavaScript, no focus management required.
* Tab order follows DOM order: skip link → header → back link → row links top-to-bottom → footer. This matches the visual reading order.
* Focus indicators are the GOV.UK Frontend defaults (yellow `:focus` box). No `outline: none` anywhere.
* Link targets are full-width table cells with default GOV.UK link padding; row height exceeds the 24×24 CSS pixel minimum for WCAG 2.2 SC 2.5.8 Target Size (Minimum). Do not reduce row padding.
* No keyboard traps, no time limits.

### 12.5 Edit page

* The new list type caption is rendered as `<span class="govuk-caption-l">` **immediately before** the `<h1>` so it is announced as part of the heading context, not as a stray paragraph.
* Existing accessibility behaviour is retained and must not regress: `govukErrorSummary` renders before the `<h1>`, each entry's `href` targets the field `id`, and `govukInput` supplies `aria-describedby` wiring for its error message.
* Current gap to fix: when validation fails the error summary is rendered but the page does not move focus to it. `govukErrorSummary` is focusable by default in GOV.UK Frontend when its JavaScript initialises; confirm the summary receives focus on re-render, and that the behaviour degrades to "summary is the first thing after the skip link" with JavaScript off.
* The `errorAtLeastOneFieldRequired` error has `field: ""` in the service, so the controller sets `href: undefined` and the summary entry is **not** a link. This is correct — a cross-field error has no single field to focus. Keep it unlinked rather than arbitrarily pointing it at the first input.

### 12.6 Testing obligations

* Axe-core scan inline in the E2E journey (see §13), asserting `violations` is empty.
* Keyboard traversal of the index page to the first row's action link, activated with Enter.
* Welsh render asserted at the DOM level, not by string matching.

---

## 13. Test Scenarios

### 13.1 Seed data guard — `libs/list-search-config/src/data/list-search-config-data.test.ts`

* Every list type in `listTypeData` has exactly one entry in `listSearchConfigData`; the failure message names the missing list types.
* Every entry in `listSearchConfigData` references a list type that exists in `listTypeData`.
* No duplicate `listTypeName` values in `listSearchConfigData`.
* Every `caseNumberFieldName` and `caseNameFieldName` is either empty or matches the service's `FIELD_NAME_PATTERN`, and is 100 characters or fewer.
* No entry has both field names populated with the same value.
* Real imports only — `listTypeData` and `listSearchConfigData` must not be mocked, or the guard proves nothing.

### 13.2 Seed SQL generation — `apps/postgres/prisma/generate-seed-sql.test.ts`

* The generated SQL contains one `INSERT INTO list_search_config` statement per entry.
* Each statement resolves `list_type_id` via `SELECT id FROM list_types WHERE name = '<NAME>'` and contains no numeric list type ID literal.
* Each statement carries `ON CONFLICT (list_type_id) DO UPDATE SET`, so a second deploy is idempotent.
* The `list_search_config` statements appear after the `list_types` insert and before the soft-delete reconciliation statement.
* A field name containing an apostrophe is escaped to `''` (guards the `sqlStr` path even though no current value needs it).
* The whole output remains wrapped in a single `BEGIN;`/`COMMIT;`.
* An entry whose field names are both empty still emits a statement with two empty string literals — the row must exist so the status is `NOT_SEARCHABLE` rather than `MISSING`.

### 13.3 Local seed — `libs/list-search-config/src/data/seed-list-search-config.test.ts`

* Upserts one config row per entry, resolving `listTypeId` by name from the mocked Prisma client.
* Warns and skips, without throwing, when a list type name is not found.
* Running twice produces no error and no duplicate rows (verified via `upsert` call assertions).

### 13.4 Coverage service — `libs/list-search-config/src/repository/service.test.ts` (additions)

* `getConfigCoverage` returns `CONFIGURED` for a list type whose row has a populated case number field and a blank case name field.
* Returns `NOT_SEARCHABLE` for a list type whose row has both field names blank or whitespace-only.
* Returns `MISSING` for an active list type with no row.
* Excludes soft-deleted list types (`deletedAt` set).
* Returns a row for every active list type even when the config table is empty.
* Does not issue one query per list type — asserts exactly two Prisma calls regardless of list type count.

### 13.5 Index page controller — `apps/web/src/pages/(system-admin)/list-search-config/index.test.ts`

* Renders `list-search-config/index` with `rows`, `configuredCount`, `missingCount` and `totalCount`.
* Rows are sorted alphabetically by the displayed list type name.
* Uses `welshFriendlyName` and Welsh content when `req.query.lng === "cy"`.
* Builds `changeUrl` as `/list-search-config/<id>` from the database `id`, never from a hardcoded constant — fixtures use arbitrary ids such as `999` to prove ID-independence.
* `GET` is a middleware array whose first element is `requireRole([USER_ROLES.SYSTEM_ADMIN])`; the handler under test is `GET[GET.length - 1]`.
* Status-to-tag mapping: `CONFIGURED` → green, `NOT_SEARCHABLE` → grey, `MISSING` → red; and `MISSING` rows get "Add" rather than "Change" as the action text.

### 13.6 Index page template — `apps/web/src/pages/(system-admin)/list-search-config/index.njk.test.ts`

Rendered with `createTestEnvironment` from `@hmcts/test-support` and asserted structurally with Cheerio (no raw-HTML string matching, no AAA comments, `toHaveLength` for counts).

* `h1` contains `en.indexHeading`; the table has exactly five `th[scope="col"]` headers in the documented order.
* One `tbody tr` per supplied row; each row's first cell is a `th[scope="row"]` carrying the list type name.
* Blank field names render the "Not set" label, not an empty cell.
* Each action link's accessible name includes a visually hidden suffix naming its list type, and the set of accessible names has no duplicates.
* Tag classes follow the status; the tag text is present as readable text (proves status is not colour-only).
* Rendering with the `cy` locale produces the Welsh headings, column headers and tag text.
* `Object.keys(en).sort()` equals `Object.keys(cy).sort()`.
* The empty-state render (`rows: []`) produces a table with a header row and no body rows, and does not throw.
* Layered fixture builders (`buildRow()`, `baseData()`, `renderPage()`) keep per-test setup to the one field each test varies.

### 13.7 Edit page controller — `.../list-search-config/index.test.ts` (existing file, additions)

* Passes the list type's friendly name to the template, and the Welsh friendly name when `lng=cy`.
* Returns `400` and renders `errors/common` (not plain text) for a non-numeric `listTypeId`.
* Returns `404` and renders `errors/404` for a numeric `listTypeId` with no active list type.
* Length and pattern validation errors render translated copy from the locale files when `lng=cy` — this is the regression test for the hardcoded-English defect in §10.1.
* Existing behaviour unchanged: valid `POST` redirects to `/list-search-config-success`, preserving `?lng=cy`; invalid `POST` re-renders with `errors`, `fieldErrors` and the submitted `data`.

### 13.8 Publish pipeline — `libs/publication/src/artefact-search-extractor.test.ts` (additions)

* With a config row whose `caseNumberFieldName` is `CaseNumber` (PascalCase), case numbers are extracted from a Crown-shaped payload — covers the mixed-casing risk in §6.1.
* With a config row whose field names are both empty, no `artefact_search` rows are written and no error is thrown.
* Existing silent-no-op-when-config-is-null behaviour is retained as a safety net for `TEST_`/`E2E_` list types that live outside `listTypeData`.

### 13.9 E2E — `e2e-tests/tests/list-search-config.spec.ts`

One test covering the complete System Admin journey, tagged `@nightly`. Validations, Welsh and accessibility are checked **inside** the journey, not as separate tests.

* Sign in as System Admin → open the dashboard → follow "List search configuration" to `/list-search-config`.
* Assert the table renders with at least one row and that every row shows a status tag.
* Run an Axe-core scan on the index page and assert no violations.
* Switch to Welsh via the language link and assert the Welsh heading is present.
* Switch back, Tab to the first row's action link and activate it with Enter; assert arrival on the edit page with the list type name shown.
* Submit with both fields blank; assert the error summary shows "Enter at least one field name".
* Run an Axe-core scan on the error state.
* Enter a valid case number field name and confirm; assert the success page, follow the continue link back to `/list-search-config`, and assert that list type's status is now "Configured".

A second, separate `@nightly` test is justified only for the distinct journey of a non-System-Admin being refused access to `/list-search-config`.

### 13.10 Manual verification before merge

* Run `yarn db:drop && yarn db:migrate:dev && yarn db:seed`, then confirm `SELECT COUNT(*) FROM list_search_config;` equals the `listSearchConfigData` length.
* Run `tsx apps/postgres/prisma/generate-seed-sql.ts > /tmp/seed.sql` and apply it twice against a seeded database; confirm the second run succeeds with no `P2002`/unique violation and no duplicate rows.
* On STG after deploy, run the coverage query and confirm zero `MISSING` rows:
  ```sql
  SELECT lt.name FROM list_types lt
  LEFT JOIN list_search_config lsc ON lsc.list_type_id = lt.id
  WHERE lt.deleted_at IS NULL AND lsc.id IS NULL
    AND lt.name NOT LIKE 'TEST_%' AND lt.name NOT LIKE 'E2E_%';
  ```

---

## 14. Assumptions & Open Questions

### Assumptions

* **`list-search-config-data.ts` becomes the single source of truth, and the deploy seed overwrites manual admin edits.** This mirrors how `list-type-data.ts` already works and is the only way to guarantee convergence across environments. The cost is real: a System Admin fix applied through the UI is reverted at the next deploy unless it is also committed to the TypeScript file. This is called out explicitly in AC scenario 2 and needs a product sign-off — see the first open question.
* **No database migration is required.** `list_search_config` and its unique index on `list_type_id` already exist (`20260119150000_add_list_search_config`). This ticket adds data and UI only.
* **Blank field names are a valid, intentional end state** for list types with no case identifier in their schema — `SJP_PUBLIC_LIST` and `SJP_DELTA_PUBLIC_LIST` expose only party and offence data. A row with two blank fields is "deliberately not searchable", which is materially different from "never configured". Both the status model and the seed reflect that distinction.
* **Field names are read from the stored JSON payload, which for non-strategic list types is the Excel-to-JSON conversion output.** The spec derives field names from the upload schemas on the assumption that the converters preserve those key names. The implementer must verify this for at least one non-strategic list type (e.g. an `FTT_RPT_*` list) by publishing a fixture and checking that `artefact_search` rows appear; if the converted shape differs, the `listSearchConfigData` values for non-strategic types must come from the converter config, not the schema.
* **Crown lists use PascalCase keys** (`CaseNumber`, `URN`) while most others use camelCase. `extractAndStoreArtefactSearch` does an exact key match, so casing must be exact. Covered by test 13.8.
* **77 list types is the current count**, read from `libs/list-types/common/src/list-type-data.ts` at the time of writing. The guard test — not this number — is what keeps the two files in step.
* **`TEST_`/`E2E_` list types are out of scope.** They live outside `listTypeData` and are exempt from soft-delete reconciliation, so they are also exempt from search config seeding. `libs/test-support/src/routes/test-support/artefacts.ts` already creates rows for them on demand.
* **There is no prod environment yet.** Per `CLAUDE.md`, this seeds local and STG only; no prod guarding is added to `generate-seed-sql.ts` pre-emptively.
* **The index page needs no pagination.** Seventy-seven rows in a single sorted table is within the GOV.UK table pattern and is easier to scan for gaps than a paginated view, which is the whole point of the page.

### Open questions

1. **Is overwrite-on-deploy the behaviour the service wants?** The alternative is `ON CONFLICT (list_type_id) DO NOTHING`, which seeds missing rows but never touches existing ones — this satisfies the literal acceptance criteria ("if any list types are not available, these list types are added") and preserves admin edits, at the cost of letting environments drift when a seeded value is later corrected. **Recommendation: `DO UPDATE`**, consistent with `list_types`, with the understanding that the TypeScript file is where corrections are made. Needs a decision before implementation, because it is a one-line change now and a data-migration later.
2. **Should existing rows whose field names disagree with the schema-derived values be reported before being overwritten?** On STG there may be hand-entered values that are more correct than the spec's derivation. Running the coverage query (§13.10) and capturing the current `list_search_config` contents **before** the first seeded deploy would let those values be folded into `listSearchConfigData` rather than lost. Suggested as a pre-deploy step; needs confirmation that someone will do it.
3. **Do `SJP_PUBLIC_LIST` and `SJP_DELTA_PUBLIC_LIST` genuinely have no searchable case identifier,** or is case search for those lists expected to work off a field not present in the current schema? If verified users are expected to find SJP public cases, the gap is in the schema or the publisher payload, not in this config — and that is a separate ticket.
4. **Are `MENTAL_HEALTH_TRIBUNAL_HEARING_LIST` and `PCOL_DAILY_CAUSE_LIST` field names confirmed?** Neither has a dedicated package under `libs/list-types/`, so their field names cannot be derived from a schema file in this repo. The implementer needs the payload shape from the publishing team, or these two entries must be seeded blank with a follow-up ticket.
5. **Should the index page expose a bulk "add all missing" action?** Deliberately excluded as speculative — the deploy seed makes the missing state unreachable, so a bulk button would have nothing to act on. Revisit only if operational experience shows rows going missing between deploys.
6. **Does the `(system-admin)` auto-discovery handle `index.ts` and `[listTypeId].ts` in the same directory** without the static route shadowing the dynamic one? No existing page directory in the repo combines both, so this is unverified. If registration order causes a conflict, the fallback is to put the index page in its own directory (`list-search-config-overview/`) at the cost of a less tidy URL. Confirm early — it affects §8.

### Comment by OgechiOkelu on 2026-10-08T10:22:12Z

@plan
