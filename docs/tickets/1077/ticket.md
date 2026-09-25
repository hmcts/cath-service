# #1077: List reconciliation

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** type:story
**Created:** 2026-09-25T14:34:46Z
**Updated:** 2026-09-25T15:56:15Z

## Description

**PROBLEM STATEMENT**
This ticket is an implementation ticket following the investigation in https://github.com/hmcts/cath-service/issues/698 


**AS A** Service
**I WANT** to resolve the issues highlighted in https://github.com/hmcts/cath-service/issues/698 
**SO THAT** there is uniformity across both systems 


**ACCEPTANCE CRITERIA**
The following highlighted issues are resolved

- The identified Four list types that are missing were implemented in https://github.com/hmcts/cath-service/issues/514 and https://github.com/hmcts/cath-service/issues/790 and https://github.com/hmcts/cath-service/issues/596 and https://github.com/hmcts/cath-service/issues/771 

- The reason why the identified list type has an entirely different provenance is investigated and resolved 

- 'provenance is typed as a bare string, so the delimiter is invisible to the type system' is investigated and resolved 

- The 19 list types which exist in both system but under different names are unified. The list names in this system are renamed to match the list names in the 'shared model'. Note that All 19 pairs agree on provenance (CFT_IDAM), so no provenance change is needed for them. 

- Of the 24 list types which are reported as genuinely absent from this project, some lists are out of scope. The lists to be removed from shared system (not in this ticket) due to the implementation of https://github.com/hmcts/cath-service/issues/659 in the shared system are as follows. These lists will not need to be added to this system and are therefore out of scope for this ticket and should be ignored. 
Admiralty Court (KB) daily cause list
Business list (ChD) daily cause list
Chancery Appeals (ChD) daily cause list
Commercial Court (KB) daily cause list
Companies Winding Up (ChD) daily cause list
Competition List (ChD) daily cause list
Financial List (ChD/KB) daily cause list
Insolvency & Companies Court (ChD) daily cause list
Intellectual Property and Enterprise Court (ChD) daily cause list
Intellectual Property List (ChD) daily cause list
London Circuit Commercial Court (KB) daily cause list
Patents Court (ChD) daily cause list
Pensions List (ChD) daily cause list
Property, Trusts and Probate list (ChD) daily cause list
Revenue List (ChD) daily cause list
Technology and Construction Court (KB) daily cause list

- The number of list types in this system must match that of the shared model except in cases above where it is agreed that those list types are in the process of being removed from the shared model. The following lists already exist in this system and so the naming only needs to be reconciled
CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST is same as CARE_STANDARDS_LIST and was implemented in https://github.com/hmcts/cath-service/issues/305 
PRIMARY_HEALTH_LIST is same as PHT Weekly Hearing List and was implemented in https://github.com/hmcts/cath-service/issues/645 
CROWN_DAILY_PDDA_LIST implemented in https://github.com/hmcts/cath-service/issues/436 
CROWN_FIRM_PDDA_LIST implemented in https://github.com/hmcts/cath-service/issues/436 
CROWN_WARNED_PDDA_LIST implemented in https://github.com/hmcts/cath-service/issues/436 
INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST (name changed to INTERIM_APPLICATIONS_DAILY_CAUSE_LIST) is implemented in https://github.com/hmcts/cath-service/issues/798
SSCS_DAILY_LIST implemented in https://github.com/hmcts/cath-service/issues/431 

- Confirm if the following list types are genuinely missing in this system and if yes, then tickets will need to be raised to create them in this system
SJP_PRESS_REGISTER
SSCS_DAILY_LIST_ADDITIONAL_HEARINGS
CIC_DAILY_HEARING_LIST (only the CIC weekly hearing list was implemented in https://github.com/hmcts/cath-service/issues/434) 

- CROWN_WARNED_PDDA_LIST vs #957
The CROWN_ADVANCED_PDDA_LIST name change is currently being implemented in the shared model (from CROWN_WARNED_PDDA_LIST to CROWN_ADVANCED_PDDA_LIST) so the naming in this system is current. 



## Comments

### Comment by OgechiOkelu on 2026-09-25T15:43:37Z

@spec 

### Comment by hmctsclaudecode on 2026-09-25T15:52:06Z

# Technical Specification — Issue #1077: List reconciliation

## 1. User Story

**As a** CaTH service (and the publishing/subscription systems that integrate with it)
**I want to** reconcile my `list_type` reference data with the shared model — identical names, one agreed provenance vocabulary, and a matching set of list types
**So that** a publication routed by list type name behaves identically in both systems, and no publication, subscription or MI report is silently lost because the two systems disagree about what a list type is called

## 2. Background

This is the implementation ticket for the reconciliation investigation in [#698](https://github.com/hmcts/cath-service/issues/698). That investigation compared this service's list types against the shared model and found four classes of divergence: list types missing here, one list type with an entirely different provenance, provenance typed as a bare delimited string, and 19 list types that exist in both systems under different names.

### Current state in this repository (verified on `master`)

| Fact | Location |
|---|---|
| 77 list types are defined in TypeScript, the single source of truth | `libs/list-types/common/src/list-type-data.ts` |
| `ListType.name` is `@unique VarChar(1000)`; `id` is autoincrement and differs per environment | `libs/postgres-prisma/prisma/schema/location.prisma:46` |
| `allowedProvenance` is `VarChar(50)` holding a **comma-delimited** list (e.g. `"CRIME_IDAM,PI_AAD"`) | `libs/postgres-prisma/prisma/schema/location.prisma:54` |
| Deploy seed emits `INSERT … ON CONFLICT (name) DO UPDATE` and then soft-deletes any active row whose name is absent from `listTypeData` | `apps/postgres/prisma/generate-seed-sql.ts` (`generateListTypesSql`, `generateSoftDeleteReconciliationSql`) |
| Local seed does the same via Prisma `upsert({ where: { name } })` + `updateMany` soft-delete | `libs/location/src/seed-list-types.ts` |
| `artefact.listTypeId` is an FK to `list_types.id`; `subscription_list_type.list_type_ids` is an `Int[]` with **no** FK | `libs/postgres-prisma/prisma/schema/subscription.prisma:20` |
| Name-keyed runtime registries: PDF generators, email summary extractors, Excel converters (75 `registerConverterByName` call sites), per-page `LIST_TYPE_CONFIG` guards | `libs/publication/src/processing/service.ts`, `libs/notifications/src/notification/notification-service.ts`, `libs/list-types/*/src/conversion/*-config.ts`, `apps/web/src/pages/(list-types)/*/index.ts` |
| MI report CSV exports the raw `list_types.name` | `libs/system-admin-pages/src/mi-report/queries.ts:90` |

### Why a rename is not a one-line data edit

Because the seed arbitrates on `name`, editing a name in `listTypeData` today produces **two** rows: a new row with a new autoincrement `id`, and the old row soft-deleted by the reconciliation step. Everything that points at the list type is `id`-keyed:

* every existing `artefact` row still references the old, now soft-deleted `list_type_id`;
* every `subscription_list_type.list_type_ids` entry still holds the old `id`, and because there is no FK the breakage is silent — affected users simply stop receiving emails for that list type.

So the deliverable is a **rename-aware seed**: the name change must be applied as an in-place `UPDATE list_types SET name = …` before the upsert, preserving `id`, and the renamed old names must be excluded from soft-delete reconciliation.

### The two provenance vocabularies

There are two unrelated sets of values both called "provenance" in this codebase:

* **Identity-provider provenance** — `CFT_IDAM`, `CRIME_IDAM`, `PI_AAD` (plus `SSO`, `B2C_IDAM` for users). This is what `list_types.allowed_provenance` means: `canAccessPublication` gates CLASSIFIED publications with `listType.provenance.split(",").includes(user.provenance)` (`libs/publication/src/authorisation/service.ts:33`).
* **Source-system provenance** — `MANUAL_UPLOAD`, `SNL`, `COMMON_PLATFORM`, `CP_CATH`, `PDDA`. This is the `Provenance` enum in `libs/publication/src/provenance.ts`, used for `artefact.provenance` and blob ingestion.

`PHT_WEEKLY_HEARING_LIST` is the single list type whose `provenance` is set to `"MANUAL_UPLOAD"` (`list-type-data.ts:702`) — a value from the *source-system* vocabulary in a column that means *identity provider*. This is the "entirely different provenance" finding from #698, and it has two live consequences:

1. `PROVENANCE_OPTIONS = ["CFT_IDAM", "PI_AAD", "CRIME_IDAM"]` (`libs/system-admin-pages/src/list-type/validation.ts:2`) does not include `MANUAL_UPLOAD`, and the edit page's checkbox map only covers those three (`apps/web/src/pages/(system-admin)/edit-list-type/index.ts:48-50`). A system admin opening PHT sees no provenance checked; saving either fails validation or silently replaces `MANUAL_UPLOAD`.
2. If a PHT artefact is ever published as CLASSIFIED, no user can ever pass the access gate, because no user's provenance is `MANUAL_UPLOAD`.

### Scope taken from the ticket

**In scope**

1. Rename this system's list type names to match the shared model (19 pairs), with `id` preservation.
2. Investigate and resolve the outlier provenance (`PHT_WEEKLY_HEARING_LIST`).
3. Make the `allowed_provenance` delimiter visible to the type system.
4. Confirm whether `SJP_PRESS_REGISTER`, `SSCS_DAILY_LIST_ADDITIONAL_HEARINGS` and `CIC_DAILY_HEARING_LIST` are genuinely absent here, and raise implementation tickets if so (implementation of those list types is **not** in this ticket).
5. Produce a reconciliation count that matches the shared model, excluding the agreed removals.

**Out of scope — no work in this repository**

The four previously-missing list types are already delivered by [#514](https://github.com/hmcts/cath-service/issues/514), [#790](https://github.com/hmcts/cath-service/issues/790), [#596](https://github.com/hmcts/cath-service/issues/596) and [#771](https://github.com/hmcts/cath-service/issues/771).

These 16 lists are being withdrawn from the shared model by its implementation of [#659](https://github.com/hmcts/cath-service/issues/659) and must **not** be added here:

Admiralty Court (KB), Business list (ChD), Chancery Appeals (ChD), Commercial Court (KB), Companies Winding Up (ChD), Competition List (ChD), Financial List (ChD/KB), Insolvency & Companies Court (ChD), Intellectual Property and Enterprise Court (ChD), Intellectual Property List (ChD), London Circuit Commercial Court (KB), Patents Court (ChD), Pensions List (ChD), Property Trusts and Probate list (ChD), Revenue List (ChD), Technology and Construction Court (KB) — all "daily cause list".

> **Conflict to resolve before implementation.** Two of those 16 are already implemented *here*: `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` and `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` each have a lib (`libs/list-types/…`), a page (`apps/web/src/pages/(list-types)/…`) and a `listTypeData` entry. If the shared model removes them, a strict count match requires soft-deleting them here too — which is a user-visible removal, not a reconciliation. See §14.

### Rename mapping

The ticket states the intent ("the list names in this system are renamed to match the list names in the shared model") but does **not** contain the 19-pair table. The authoritative table must be lifted from the #698 investigation output before implementation starts. The rows below are what the ticket itself asserts, plus candidates inferred from this repo's own `shortenedFriendlyName` values, which already use the shared model's abbreviations.

| This system (`name`) | Shared model (`name`) | Source of mapping |
|---|---|---|
| `CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST` | `CARE_STANDARDS_LIST` | Stated in ticket |
| `PHT_WEEKLY_HEARING_LIST` | `PRIMARY_HEALTH_LIST` | Stated in ticket |
| `CROWN_DAILY_LIST` | `CROWN_DAILY_PDDA_LIST` | Stated in ticket (#436) — **direction to confirm** |
| `CROWN_FIRM_LIST` | `CROWN_FIRM_PDDA_LIST` | Stated in ticket (#436) — **direction to confirm** |
| `CROWN_WARNED_LIST` | `CROWN_ADVANCED_PDDA_LIST` | Ticket: shared model is renaming `CROWN_WARNED_PDDA_LIST` → `CROWN_ADVANCED_PDDA_LIST` (#957) |
| `SSCS_*_DAILY_HEARING_LIST` (7 regional rows) | `SSCS_DAILY_LIST` | Stated in ticket (#431) — **7→1, cannot be a rename**, see §14 |
| `FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST` | `FTT_TAX_WEEKLY_HEARING_LIST` | Candidate — `shortenedFriendlyName: "FFT Tax Weekly Hearing List"` |
| `FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST` | `FTT_LR_WEEKLY_HEARING_LIST` | Candidate — `shortenedFriendlyName: "FFT (LR) Weekly Hearing List"` |
| `FTT_RPT_EASTERN_WEEKLY_HEARING_LIST` … `FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST` (6 rows) | `RPT_*_WEEKLY_HEARING_LIST` | Candidate — confirm against shared model |
| `UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST` | `UT_T_AND_CC_DAILY_HEARING_LIST` | Candidate — `shortenedFriendlyName: "UT (T and CC) Daily Hearing List"` |
| `UT_LANDS_CHAMBER_DAILY_HEARING_LIST` | `UT_LC_DAILY_HEARING_LIST` | Candidate — `shortenedFriendlyName: "UT (LC) Daily Hearing List"` |
| `UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST` | `UT_AAC_DAILY_HEARING_LIST` | Candidate — `shortenedFriendlyName: "UT (AAC) Daily Hearing List"` |
| `MENTAL_HEALTH_TRIBUNAL_HEARING_LIST` | (shared model name TBC) | Candidate — name here omits the cadence its friendly name carries |

Every candidate row must be confirmed against the shared model's list-type enum before any code changes. An unconfirmed rename is worse than no rename: it breaks routing on both sides.

## 3. Acceptance Criteria

* **Scenario:** Renaming a list type preserves its database identity
    * **Given** an environment where `list_types` holds a row named `CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST` with `id = 12`, and `artefact` rows and `subscription_list_type.list_type_ids` entries referencing `12`
    * **When** the rename is added to `LIST_TYPE_RENAMES` and the deploy seed runs
    * **Then** the row is named `CARE_STANDARDS_LIST`, still has `id = 12`, has `deleted_at IS NULL`, and no second row exists for either name
    * **And** the referencing artefacts and subscriptions resolve to the renamed list type unchanged

* **Scenario:** The seed is idempotent across repeated deploys
    * **Given** the rename has already been applied on a previous deploy
    * **When** the generated seed SQL is applied again
    * **Then** the `UPDATE … SET name` matches zero rows, the upsert updates the existing row in place, the soft-delete reconciliation soft-deletes nothing, and `id` is unchanged

* **Scenario:** A renamed list type is not soft-deleted by reconciliation
    * **Given** `listTypeData` contains only the new name and `LIST_TYPE_RENAMES` maps the old name to it
    * **When** `generateSoftDeleteReconciliationSql` runs
    * **Then** no row is soft-deleted as a result of the rename, because the rename executes before the upsert and the old name no longer exists in the table

* **Scenario:** Local seeding produces the same result as deploy seeding
    * **Given** a developer database seeded before the rename
    * **When** `yarn db:seed` runs
    * **Then** `seedListTypes()` applies the same rename map in the same order and the resulting rows are identical to the deploy path

* **Scenario:** The provenance delimiter is enforced by the type system
    * **Given** `ListTypeData.provenance` is typed as `UserProvenance[]`
    * **When** a developer writes `provenance: "CRIME_IDAM,PI_AAD"` as a bare string, or `provenance: ["CRIME-IDAM"]`
    * **Then** the TypeScript build fails
    * **And** the delimited string is produced only by `serialiseAllowedProvenances()` at the persistence boundary, and parsed only by `parseAllowedProvenances()` at the read boundary

* **Scenario:** The outlier provenance is corrected
    * **Given** `PHT_WEEKLY_HEARING_LIST` currently has `allowed_provenance = "MANUAL_UPLOAD"`
    * **When** the reconciliation ships
    * **Then** its `allowed_provenance` holds only identity-provider values agreed with the shared model (`CFT_IDAM` unless #698 says otherwise)
    * **And** no list type in `listTypeData` holds a value outside `UserProvenance`, proven by a test that asserts it over every entry

* **Scenario:** A system admin can edit a previously-outlier list type without data loss
    * **Given** a system admin opens the renamed Primary Health list type in **Edit list type**
    * **When** the page renders
    * **Then** its current allowed provenance is shown as checked
    * **And** saving with no changes leaves `allowed_provenance` byte-identical

* **Scenario:** Name-keyed registries follow the rename
    * **Given** a list type has been renamed
    * **When** a publication of that list type is processed
    * **Then** its PDF generator, Excel converter, email summary extractor and page guard all resolve under the new name
    * **And** a guard test fails if any name in `listTypeData` has no entry in a registry that previously had one under its old name

* **Scenario:** Reconciliation count matches the shared model
    * **Given** the agreed shared-model inventory, minus the 16 lists being withdrawn by #659
    * **When** the reconciliation check runs
    * **Then** the set of active `listTypeData` names equals the shared-model set, and any residual difference is limited to list types with an open implementation ticket

* **Scenario:** Genuinely absent list types are confirmed and ticketed
    * **Given** `SJP_PRESS_REGISTER`, `SSCS_DAILY_LIST_ADDITIONAL_HEARINGS` and `CIC_DAILY_HEARING_LIST` are each absent from `listTypeData`
    * **When** the confirmation is completed
    * **Then** each is confirmed absent (`SJP_PRESS_REGISTER` appears only in a unit-test fixture, `libs/subscriptions/src/repository/subscription-list-type-service.test.ts:140`; `CIC_WEEKLY_HEARING_LIST` exists but no daily variant does)
    * **And** one implementation ticket per list type is raised and linked from this ticket
    * **And** no partial implementation of them is merged under this ticket

* **Scenario:** No user-facing text changes as a result of a rename
    * **Given** a citizen viewing a list, a subscription list-type selection page, or a publication email
    * **When** a list type has been renamed
    * **Then** the English and Welsh friendly names they see are unchanged, because only the internal `name` column changes

## 4. User Journey Flow

This is a reference-data change. There is no new citizen journey; the journeys below are the existing ones that must survive the rename unchanged.

### Deploy-time data flow (the primary flow being changed)

```
apps/postgres/start.sh
        │
        ├─ prisma migrate deploy
        ├─ prisma generate
        │
        └─ tsx prisma/generate-seed-sql.ts  >  /tmp/seed.sql
                 │
                 │  reads listTypeData (source of truth) + LIST_TYPE_RENAMES (new)
                 ▼
           BEGIN;
             1. realign region/jurisdiction/sub_jurisdiction/location names   (existing)
             2. UPDATE list_types SET name = <new> WHERE name = <old>;        (NEW — one per rename)
             3. INSERT INTO list_types … ON CONFLICT (name) DO UPDATE …       (existing)
             4. INSERT INTO list_types_sub_jurisdictions … ON CONFLICT DO NOTHING
             5. UPDATE list_types SET deleted_at = NOW() WHERE name NOT IN (…) (existing)
           COMMIT;
                 │
                 ▼
        prisma db execute --file /tmp/seed.sql

Step 2 MUST precede step 3. Reversed, step 3 inserts a new id and step 5
soft-deletes the old row, orphaning artefacts and subscriptions.
Single-replica postgres deploy pod only — apps/web never seeds.
```

### Publication routing journey (must be unaffected)

```
JSON/Excel upload ──> artefact created with listTypeId (FK, id-keyed)
                              │
        getArtefactById ──────┴──> ArtefactWithListType.listTypeName  (new name)
                                            │
        ┌───────────────────────────────────┼────────────────────────────────┐
        ▼                                   ▼                                ▼
 PDF_GENERATOR_REGISTRY[name]   getConverterForListTypeName(name)   LIST_TYPE_CONFIG[name]
 (publication/processing)       (list-types-common registry)        (page guard + template)
        │                                   │                                │
        └───────────── all three keyed on the *string name* ─────────────────┘
                  → every rename must land in all three, atomically
```

### Subscriber notification journey (silent-failure risk)

```
artefact published
   └─> subscription_list_type.list_type_ids  (Int[], NO foreign key)
            │
            ├─ rename preserves id  ──> match ──> email sent ✅
            └─ rename creates new id ─> no match ─> no email, no error, no log ❌
```

### System admin journey (visible surface)

```
/system-admin-dashboard
   └─> List types
         ├─> Edit list type  ──> name (read-only display), friendly names,
         │                       URL, default sensitivity, allowed provenance
         │                       └─ must round-trip the corrected PHT provenance
         └─> Delete list type (soft delete) — unchanged

/system-admin-dashboard
   └─> MI reporting  ──> CSV column `list_type` emits list_types.name
                         └─ downstream consumers see the NEW names after deploy
```

## 5. Low Fidelity Wireframe

No new pages. One existing page changes: **Edit list type** (`apps/web/src/pages/(system-admin)/edit-list-type/`), so that a list type carrying a non-identity provenance can be viewed and saved without data loss.

### Edit list type — before (defect)

Loading `PRIMARY_HEALTH_LIST` (`allowed_provenance = "MANUAL_UPLOAD"`):

```
┌──────────────────────────────────────────────────────────────┐
│ GOV.UK    Court and tribunal hearings                        │
├──────────────────────────────────────────────────────────────┤
│ < Back                                                       │
│                                                              │
│ Edit list type                                               │
│                                                              │
│ Name                                                         │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ PHT_WEEKLY_HEARING_LIST                                  │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ...                                                          │
│ Allowed provenance                                           │
│ Select all that apply                                        │
│   [ ] CFT_IDAM                                               │
│   [ ] PI_AAD          <-- MANUAL_UPLOAD is not rendered at   │
│   [ ] CRIME_IDAM          all; the stored value is invisible │
│                           and saving destroys it             │
│ Is non-strategic?   ( ) Yes  ( ) No                          │
│                                                              │
│ [ Continue ]                                                 │
└──────────────────────────────────────────────────────────────┘
```

### Edit list type — after

```
┌──────────────────────────────────────────────────────────────┐
│ < Back                                                       │
│                                                              │
│ Edit list type                                               │
│                                                              │
│ Name                                                         │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ PRIMARY_HEALTH_LIST                                      │ │
│ └──────────────────────────────────────────────────────────┘ │
│ Changes to the name are overwritten on the next deploy.      │
│ Rename list types in list-type-data.ts.                      │
│ ...                                                          │
│ Allowed provenance                                           │
│ Select all that apply                                        │
│   [x] CFT_IDAM        <-- reconciled value, checked          │
│   [ ] PI_AAD                                                 │
│   [ ] CRIME_IDAM                                             │
│                                                              │
│ Is non-strategic?   (•) Yes  ( ) No                          │
│                                                              │
│ [ Continue ]                                                 │
└──────────────────────────────────────────────────────────────┘
```

### Validation error state (unknown provenance submitted)

```
┌──────────────────────────────────────────────────────────────┐
│ ┌────────────────────────────────────────────────────────┐   │
│ │ There is a problem                                     │   │
│ │  • Select valid provenance options                     │   │
│ └────────────────────────────────────────────────────────┘   │
│ Edit list type                                               │
│ ...                                                          │
│ Allowed provenance                                           │
│ │ Error: Select valid provenance options                     │
│ │  [ ] CFT_IDAM   [ ] PI_AAD   [ ] CRIME_IDAM               │
└──────────────────────────────────────────────────────────────┘
```

## 6. Page Specifications

### 6.1 `apps/web/src/pages/(system-admin)/edit-list-type/` — changed

| Item | Specification |
|---|---|
| Layout | Unchanged: `layouts/base-template.njk`, single `govuk-grid-column-two-thirds` column, error summary above `h1`. |
| Provenance checkboxes | Build items from the shared `USER_PROVENANCE_OPTIONS` constant instead of the three hardcoded literals at `index.ts:48-50` and the three hardcoded `items` in `index.njk`. Checked state comes from `parseAllowedProvenances(existingListType.allowedProvenance)`, replacing the inline `.split(",")` at `index.ts:39`. |
| Unknown stored value | If the stored value contains a token outside `USER_PROVENANCE_OPTIONS` (should be impossible after this ticket, but the column is free text and admins can edit it), render it as an additional checked, disabled checkbox rather than dropping it silently, and block submit with the existing validation error. |
| Name field | Remains editable (existing behaviour, out of scope to change), but gains hint text stating that `listTypeData` is the source of truth and a manual rename is overwritten by the next deploy. |
| Data loss guarantee | GET → POST with no user edits must produce a byte-identical `allowed_provenance`. This is the acceptance test for the round-trip defect. |

### 6.2 `apps/web/src/pages/(system-admin)/add-list-type/` — changed

Same substitution of the hardcoded provenance triple (`index.ts:81-83`) for the shared constant. No visual change.

### 6.3 `apps/postgres/prisma/generate-seed-sql.ts` — changed

| Item | Specification |
|---|---|
| New input | `LIST_TYPE_RENAMES: ReadonlyArray<{ from: string; to: string }>`, exported from `libs/list-types/common/src/list-type-renames.ts` and imported via the dedicated subpath `@hmcts/list-types-common/list-type-renames` (the barrel pulls in nunjucks/exceljs, which are absent from the focused postgres deploy image — same constraint as the existing `list-type-data` import). |
| New emitter | `generateListTypeRenameSql(renames)` emits, per rename, `UPDATE list_types SET name = '<to>', updated_at = NOW() WHERE name = '<from>';`. Values go through the existing `sqlStr()` escaper. |
| Ordering | Inserted into the `generateSeedSql` array **immediately before** `generateListTypesSql`, inside the existing single transaction. |
| Idempotency | A second run matches zero rows. No `ON CONFLICT` needed because `to` cannot already exist: if it did, the rename was already applied and `from` is gone. A pre-flight assertion guards the pathological case where both names exist (see §9). |
| Unchanged | Region/jurisdiction realignment, the list-type upsert, sub-jurisdiction links, and the `TEST_%`/`E2E_%`-exempt soft-delete reconciliation all keep their current behaviour. |

### 6.4 `libs/location/src/seed-list-types.ts` — changed

Apply the same renames before the upsert loop, as a single `updateMany` per rename (or one `update` guarded by `findUnique`), so the local `yarn db:seed` path converges on the same rows as deploy. Single-process, so no race.

### 6.5 `libs/list-types/common/src/list-type-data.ts` — changed

* `provenance: string` becomes `provenance: UserProvenance[]`; all 77 entries updated (`"CRIME_IDAM,PI_AAD"` becomes `["CRIME_IDAM", "PI_AAD"]`).
* `PHT_WEEKLY_HEARING_LIST` → `PRIMARY_HEALTH_LIST`, with `provenance: ["CFT_IDAM"]`.
* All confirmed renames applied to `name`. `urlPath`, `englishFriendlyName`, `welshFriendlyName`, `shortenedFriendlyName`, `defaultSensitivity`, `isNonStrategic` and `subJurisdictionIds` are untouched.

### 6.6 New `libs/list-types/common/src/allowed-provenance.ts`

```typescript
export const ALLOWED_PROVENANCE_DELIMITER = ",";
export const USER_PROVENANCE_OPTIONS = ["CFT_IDAM", "PI_AAD", "CRIME_IDAM"] as const;
export type UserProvenance = (typeof USER_PROVENANCE_OPTIONS)[number];

export function serialiseAllowedProvenances(provenances: readonly UserProvenance[]): string;
export function parseAllowedProvenances(value: string): UserProvenance[];
export function isUserProvenance(value: string): value is UserProvenance;
```

Every `.split(",")` and `.join(",")` on `allowedProvenance` is replaced by these functions: `libs/publication/src/authorisation/service.ts:33`, `libs/publication/src/authorisation/middleware.ts:93`, `libs/system-admin-pages/src/list-type/queries.ts:119,142,170`, `apps/web/src/pages/(list-types)/sjp-press-list/require-verified-with-provenance.ts:30`, `apps/web/src/pages/(system-admin)/edit-list-type/index.ts:39`. `libs/system-admin-pages/src/list-type/validation.ts:2` re-exports `USER_PROVENANCE_OPTIONS` instead of redeclaring it.

The database column stays `VarChar(50)` — the longest possible serialised value is 27 characters — so **no Prisma migration is required**.

### 6.7 Name-keyed registries — changed

Every renamed name updated in place, in the same commit:

| Registry | File |
|---|---|
| `PDF_GENERATOR_REGISTRY` | `libs/publication/src/processing/service.ts` |
| Email summary extractor/formatter map | `libs/notifications/src/notification/notification-service.ts` |
| `registerConverterByName(...)` | `libs/list-types/*/src/conversion/*-config.ts` |
| `LIST_TYPE_CONFIG` / single-name guards | `apps/web/src/pages/(list-types)/*/index.ts` |
| E2E seed fixtures | `e2e-tests/utils/seed-list-types.ts`, `e2e-tests/tests/*.spec.ts` |
| Test-support seeding route | `libs/test-support/src/routes/test-support/list-types.ts` |

Package directory names, lib package names (`@hmcts/pht-weekly-hearing-list`), page directory names and `urlPath` values are **not** renamed. That keeps the diff to reference data and registry keys; renaming directories would change public URLs and break bookmarks for no reconciliation benefit.

## 7. Content

### 7.1 Citizen-facing content — no change

`list_types.name` is never rendered to citizens. Every public surface uses `friendly_name` / `welsh_friendly_name` / `shortened_friendly_name`, and this ticket does not change any of them. Specifically unchanged: the list pages under `apps/web/src/pages/(list-types)/`, the summary-of-publications page, subscription list-type selection, and publication emails. No new Welsh translation is required for the renames themselves.

### 7.2 New content — Edit list type name hint

`apps/web/src/pages/(system-admin)/edit-list-type/en.ts`:

```typescript
nameHint: "This is the system name used to route publications. Changes here are overwritten on the next deployment — rename list types in list-type-data.ts."
```

`apps/web/src/pages/(system-admin)/edit-list-type/cy.ts`:

```typescript
nameHint: [WELSH TRANSLATION REQUIRED: "This is the system name used to route publications. Changes here are overwritten on the next deployment — rename list types in list-type-data.ts."]
```

### 7.3 Existing content reused, not duplicated

`allowedProvenanceLabel` ("Allowed provenance") and `allowedProvenanceHint` ("Select all that apply") already exist in both `en.ts` and `cy.ts` for `edit-list-type` and `add-list-type`. The `cy.ts` entries currently hold `[WELSH TRANSLATION REQUIRED: …]` placeholders; replace them as part of this ticket since the page is being touched:

```typescript
// apps/web/src/pages/(system-admin)/edit-list-type/cy.ts
allowedProvenanceLabel: [WELSH TRANSLATION REQUIRED: "Allowed provenance"],
allowedProvenanceHint: [WELSH TRANSLATION REQUIRED: "Select all that apply"],
```

Provenance values themselves (`CFT_IDAM`, `PI_AAD`, `CRIME_IDAM`) are system identifiers shown verbatim to system admins in both locales — they are not translated, matching current behaviour.

### 7.4 Welsh friendly name gaps noticed during reconciliation — not fixed here

`list-type-data.ts` contains five `[WELSH TRANSLATION REQUIRED: …]` placeholders, all on the UTIAC JR entries (lines 525, 536, 547, 558, 569). They are pre-existing and unrelated to reconciliation. Raise a separate content ticket; changing them here would mix a translation change into a data-integrity change and widen the regression surface.

### 7.5 Locale key parity

`Object.keys(en).sort()` must equal `Object.keys(cy).sort()` for both admin pages after the `nameHint` addition, asserted by the existing template-test pattern.

## 8. URL

No routing changes. For completeness, the URLs involved:

| URL | Method | Change |
|---|---|---|
| `/edit-list-type?id=<listTypeId>` | GET, POST | Provenance checkbox source and parse helper change; route, query parameter and redirect target unchanged |
| `/add-list-type` | GET, POST | Provenance checkbox source changes; route unchanged |
| `/list-types` (system admin list) | GET | Displays the new names after deploy; no code change |
| `/mi-reporting` (CSV download) | GET | `list_type` column emits the new names after deploy; no code change |
| `/<urlPath>?artefactId=<id>` for every list type page | GET | **Unchanged.** `urlPath` is not part of the rename, so e.g. `/pht-weekly-hearing-list` keeps working after `PHT_WEEKLY_HEARING_LIST` becomes `PRIMARY_HEALTH_LIST` |
| `/summary-of-publications?locationId=<id>` | GET | Unchanged |

Note the deliberate asymmetry: the internal `name` matches the shared model, the public `urlPath` does not have to. Only `name` crosses the system boundary.

## 9. Validation

### 9.1 Rename map validation (build-time, unit-tested)

A test over `LIST_TYPE_RENAMES` asserts:

| Rule | Rationale |
|---|---|
| No `from` value appears as a `name` in `listTypeData` | A name cannot be both retired and active |
| Every `to` value appears as a `name` in `listTypeData` | A rename with no destination row would soft-delete the data |
| `from` values are unique; `to` values are unique | Two renames into one name would collide on `list_types.name` UNIQUE |
| No `to` value also appears as a `from` value | Forbids chained renames (`A→B`, `B→C`), whose result depends on statement order |
| Every `from` and `to` matches `/^[A-Z][A-Z0-9_]*$/` | Matches the existing naming convention for list type names |

### 9.2 Seed-time validation (SQL)

Before the rename statements, emit one assertion per rename that fails the transaction if both the old and new names exist as active rows — the only state where an in-place rename would violate the UNIQUE constraint, and a signal that a previous deploy created a duplicate:

```sql
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM list_types WHERE name = '<from>')
     AND EXISTS (SELECT 1 FROM list_types WHERE name = '<to>') THEN
    RAISE EXCEPTION 'list type rename conflict: both % and % exist', '<from>', '<to>';
  END IF;
END $$;
```

The whole seed already runs in one transaction, so a raised exception rolls back cleanly and the deploy fails loudly rather than half-applying.

### 9.3 Provenance validation

| Rule | Where |
|---|---|
| `provenance` array is non-empty for every entry | `list-type-data.test.ts` |
| Every token is a member of `USER_PROVENANCE_OPTIONS` | `list-type-data.test.ts` — this is the test that locks out a future `MANUAL_UPLOAD` |
| Serialised value is ≤ 50 characters (the column width) | `list-type-data.test.ts` |
| No token contains the delimiter | `parseAllowedProvenances` unit test |
| Admin form: at least one provenance selected, all values known | Existing `validateProvenance` in `libs/system-admin-pages/src/list-type/validation.ts`, now reading the shared constant |
| `parseAllowedProvenances` ignores empty segments and trims whitespace | Defensive: the column is free text and pre-existing rows may hold `"CFT_IDAM, PI_AAD"` |

### 9.4 Reconciliation validation

A single test asserts the active name set in `listTypeData` equals the agreed shared-model inventory, held as an explicit array in the test with a comment linking #698 and #659. It must fail if a list type is added here without being added to the shared model, or vice versa — this is the guard that stops the two systems drifting again. The three confirmed-missing list types are listed as documented exclusions with their new ticket numbers.

### 9.5 Registry coverage validation

Extend the existing guard pattern (`libs/list-types/common/src/validation/guard.test.ts`) so that, for every name in `listTypeData` that had a PDF generator, converter or summary extractor before the rename, one still resolves under the new name. This is what catches a rename applied in `list-type-data.ts` but missed in `service.ts`.

## 10. Error Messages

### 10.1 Citizen-facing

None added. Existing list-page errors (`errors/common`, `errors/403`) are unchanged in wording and behaviour.

### 10.2 System admin — Edit list type / Add list type

All reuse the existing GOV.UK error summary titled "There is a problem", with each message linked to its field.

| Condition | Error summary + inline message |
|---|---|
| No provenance selected | "Select at least one allowed provenance" *(existing)* |
| Submitted provenance not in `USER_PROVENANCE_OPTIONS` | "Select valid provenance options" *(existing)* |
| Name left blank | "Enter a value for name" *(existing)* |
| Name already used by another list type | "A list type with this name already exists" *(existing `duplicateNameError`)* |

Welsh equivalents for the two provenance messages (these messages are currently generated in English in `validation.ts` and surfaced untranslated — this ticket adds the Welsh keys to `cy.ts` for the two messages it touches):

```typescript
provenanceRequiredError: [WELSH TRANSLATION REQUIRED: "Select at least one allowed provenance"],
provenanceInvalidError: [WELSH TRANSLATION REQUIRED: "Select valid provenance options"],
```

### 10.3 Deploy / seed failures (operator-facing, logged not rendered)

| Condition | Message | Outcome |
|---|---|---|
| Rename source and target both exist as rows | `list type rename conflict: both <from> and <to> exist` | Transaction rolls back; postgres deploy pod fails; no partial rename |
| `to` value missing from `listTypeData` | `Rename target <to> is not present in listTypeData` | Build-time unit test failure, never reaches deploy |
| Local seed rename failure | `Failed to rename list type "<from>" to "<to>": <error>` | Thrown, matching the existing `Failed to seed list type "<name>"` style in `seed-list-types.ts:80` |
| Sub-jurisdictions not yet seeded | `No sub-jurisdictions found. Please ensure sub-jurisdictions are seeded first.` *(existing)* | Unchanged |

### 10.4 Runtime failures if a rename is applied inconsistently

These are the messages that will appear if a registry is missed — they are the detection mechanism, so they must stay specific:

| Source | Message |
|---|---|
| `convertExcelForListTypeName` | `No converter found for list type name: <name>` *(existing)* |
| PDF registry miss | Publication processing logs the unhandled list type name and leaves the artefact without a generated PDF |
| Page guard miss | 400 with `errors/common` — the `artefact.listTypeName` did not match the page's `LIST_TYPE_CONFIG` |

## 11. Navigation

No navigation changes.

| From | Action | To |
|---|---|---|
| `/list-types` | Select a list type to edit | `/edit-list-type?id=<listTypeId>` |
| `/edit-list-type` | Valid submit | Existing success/confirmation redirect (unchanged) |
| `/edit-list-type` | Invalid submit | Re-render in place, HTTP 200, error summary focused, submitted values preserved |
| `/add-list-type` | Valid submit | Existing success redirect (unchanged) |
| Any list type page `/<urlPath>?artefactId=…` | — | Unchanged; `urlPath` is not renamed |

Back links: the existing `< Back` on both admin pages is unchanged.

Redirect semantics worth stating explicitly: because `urlPath` does not change, **no redirects are needed** for renamed list types. Any bookmarked or emailed publication URL continues to resolve, and `artefactId` lookups are `id`-based throughout.

## 12. Accessibility

WCAG 2.2 AA applies to the one changed page. Nothing here relaxes an existing guarantee.

| Requirement | How it is met |
|---|---|
| Checkbox group semantics | Provenance options stay in a `govukCheckboxes` with a `fieldset` and `legend` ("Allowed provenance"); generating items from a constant does not change the rendered markup structure |
| Hint association | `allowedProvenanceHint` and the new `nameHint` are rendered by the GOV.UK macros, which wire `aria-describedby` from the input/fieldset to the hint id |
| Error identification (1.3.1, 3.3.1) | Error summary with `role="alert"`, `titleText: "There is a problem"`, rendered above the `h1`, receiving focus on page load; each entry links by `href: "#allowedProvenance"` to the field, which also carries an inline `govuk-error-message` |
| Disabled unknown-value checkbox | If an unknown stored provenance is rendered as a checked+disabled checkbox, it must be accompanied by visible text explaining why it cannot be changed — a disabled control alone is not a sufficient explanation for screen reader or cognitive-load users. Contrast of disabled text must still meet 4.5:1 |
| Heading hierarchy | Single `h1` ("Edit list type"); no new headings introduced |
| Keyboard operation | All checkboxes reachable and togglable by Tab/Space; visible focus indicators from GOV.UK Frontend; logical tab order preserved because item order is unchanged |
| Target size (2.5.8) | GOV.UK checkbox targets (44×44px) unchanged |
| Language of parts (3.1.2) | Welsh page content served with `lang="cy"`; provenance identifiers remain untranslated system values, consistent with existing behaviour |
| No colour-only meaning | Checked state conveyed by the native control and its label, error state by text as well as the red border |
| Axe scan | Inline axe check on the Edit list type page within the existing system-admin E2E journey; zero violations required |

## 13. Test Scenarios

### Unit — seed SQL generation (`apps/postgres/prisma/generate-seed-sql.test.ts`)

* Generated SQL emits one `UPDATE list_types SET name` statement per rename, positioned after the location realignment and before the `INSERT INTO list_types`.
* Generated SQL contains no rename statement when the rename map is empty.
* Rename statements are inside the single `BEGIN;`/`COMMIT;` block.
* Rename values with an apostrophe are escaped by `sqlStr` (defensive — list type names are uppercase snake case, but the emitter must not be the weak link).
* A conflict assertion is emitted for each rename and raises when both names exist.
* The soft-delete reconciliation still exempts `TEST_%` and `E2E_%` names after the rename block is added.

### Unit — rename map integrity (`libs/list-types/common/src/list-type-renames.test.ts`)

* Every rename target exists in `listTypeData`; no rename source does.
* Rename sources and targets are each unique, and no target is also a source.
* All names match the uppercase-snake-case convention.

### Unit — list type data integrity (`libs/list-types/common/src/list-type-data.test.ts`)

* Every entry's `provenance` array is non-empty and contains only `USER_PROVENANCE_OPTIONS` members — this is the test that would have caught `MANUAL_UPLOAD`.
* Serialised provenance for every entry fits the 50-character column.
* Entry names are unique.
* The active name set equals the agreed shared-model inventory, with documented exclusions for the 16 withdrawn lists and the three ticketed absences.

### Unit — provenance helpers (`libs/list-types/common/src/allowed-provenance.test.ts`)

* `serialiseAllowedProvenances` joins with a comma and no spaces; round-trips through `parseAllowedProvenances`.
* `parseAllowedProvenances` handles a single value, multiple values, surrounding whitespace, a trailing delimiter, and an empty string (returns `[]`).
* `isUserProvenance` rejects `MANUAL_UPLOAD`, `PDDA`, `SSO` and lowercase variants.

### Unit — local seeding (`libs/location/src/seed-list-types.test.ts`)

* Renames are applied before the upsert loop.
* A rename whose source row is absent is a no-op, not an error (second run on an already-renamed database).
* The renamed list type retains its `id`, and its sub-jurisdiction links are upserted against that same `id`.
* A rename failure throws with the list type names in the message and aborts the seed.

### Unit — authorisation with reconciled provenance (`libs/publication/src/authorisation/service.test.ts`)

* A CLASSIFIED artefact on the renamed Primary Health list type is accessible to a verified `CFT_IDAM` user and denied to a verified `PI_AAD` user — proving the outlier fix restored a working access gate where `MANUAL_UPLOAD` previously denied everyone.
* Multi-provenance list types (`["CRIME_IDAM", "PI_AAD"]`) admit both provenances, via the shared parse helper rather than an inline split.

### Unit — admin page controllers (`edit-list-type/index.test.ts`, `add-list-type/index.test.ts`)

* GET renders checked state derived from the stored value for single and multi-value provenance.
* GET then POST with unmodified form data persists a byte-identical `allowed_provenance` (the round-trip regression).
* POST with an unknown provenance value re-renders with the error summary and preserves the submitted values.
* GET renders the new `nameHint` in English and in Welsh.

### Unit — registry coverage (`libs/list-types/common/src/validation/guard.test.ts`)

* Each renamed list type resolves a PDF generator, an Excel converter and an email summary extractor under its new name.
* No registry retains a key that is absent from `listTypeData` (catches a half-applied rename that leaves the old key behind).

### Integration — publication processing (`libs/publication/src/processing/service.test.ts`)

* An artefact whose `listTypeName` is a renamed value generates the expected PDF.
* Test fixtures use an arbitrary `listTypeId` (e.g. `999`) with the real `listTypeName`, proving routing is id-independent.

### E2E (Playwright) — extend existing journeys rather than adding new ones

* **System admin edits a list type** (extend the existing system-admin journey): navigate to the reconciled Primary Health list type, confirm its provenance renders checked, save without changes, confirm success, re-open and confirm the value is unchanged; include the Welsh switch and an inline axe scan at the form step.
* **Citizen views a renamed list** (extend the existing summary-of-publications journey): seed an artefact for a renamed list type, open it from the summary page via its unchanged `urlPath`, confirm the friendly name and list content render, switch to Welsh, run an inline axe scan.
* No separate specs for validation, Welsh or accessibility — they are asserted inside these two journeys.

### Manual / deploy verification (STG)

* Record `id`, `name` and `deleted_at` for every affected list type before deploy; after deploy confirm the `id` is identical, the name is the new one, `deleted_at` is null, and no duplicate row exists.
* Confirm a pre-existing subscription to a renamed list type still produces an email.
* Confirm the MI report CSV shows the new names and that downstream consumers have been told the column values changed.
* Re-run the deploy on an unchanged repository and confirm zero rows change.

## 14. Assumptions & Open Questions

**Blocking — must be answered before implementation starts**

* **The 19-pair mapping table is not in this ticket.** The mapping in §2 is partly asserted by the ticket and partly inferred from `shortenedFriendlyName` values. The authoritative table has to come from the #698 investigation or the shared model's list-type enum. Implementing an inferred rename would break routing in both systems, so no rename lands until each pair is confirmed.
* **`SSCS_DAILY_LIST` is 7→1, so it cannot be a rename.** This system holds seven regional rows (`SSCS_MIDLANDS_…`, `SSCS_LONDON_…`, and five more), each with its own `id`, sub-jurisdiction links, artefacts and subscriptions. The shared model appears to hold a single `SSCS_DAILY_LIST`. Renaming all seven to one name violates `list_types.name` UNIQUE. Either the shared model also holds seven regional names (in which case the ticket's line is shorthand and the real mapping is regional), or reconciliation here means collapsing seven list types into one — a destructive data change well beyond a rename, needing its own ticket. **Assumption pending confirmation: the regional names are correct and no SSCS rename is in scope.**
* **CROWN PDDA rename direction is contradictory.** The ticket says `CROWN_DAILY_PDDA_LIST` / `CROWN_FIRM_PDDA_LIST` / `CROWN_WARNED_PDDA_LIST` "already exist in this system and so the naming only needs to be reconciled", but this repository has `CROWN_DAILY_LIST`, `CROWN_FIRM_LIST` and `CROWN_WARNED_LIST` with `provenance: ["CRIME_IDAM"]` — no `_PDDA_` name exists anywhere in `libs/` or `apps/`. It then says, for #957, that "the naming in this system is current" for the `CROWN_WARNED_PDDA_LIST` → `CROWN_ADVANCED_PDDA_LIST` change, which reads as if this system already used a PDDA name. Which of `CROWN_DAILY_LIST` and `CROWN_DAILY_PDDA_LIST` is the target? Note also that `apps/web/src/pages/(list-types)/crown-daily-cause-list/index.test.ts:33` uses `allowedProvenance: ["PDDA"]` — a source-system value in an identity-provider field, the same defect class as PHT, in a test fixture.
* **Two lists the ticket puts out of scope are already implemented here.** `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` and `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` each have a lib, a page, a `listTypeData` entry and an Excel converter. If #659 removes them from the shared model and the count must match, they have to be soft-deleted here — which withdraws a working published list from citizens. That is a product decision, not a reconciliation task. **Recommendation: keep them, and record them as a known, agreed count difference.**
* **`INTERIM_APPLICATIONS_DAILY_CAUSE_LIST` does not exist in this repository.** The ticket says it was implemented in #798, but there is no match for `INTERIM_APPLICATIONS` or `interim-applications` in `libs/`, `apps/` or `e2e-tests/` on `master` — only in `requirements/migrations/*.sql` board-sync files. Either #798 is unmerged or the name differs. Confirm before treating it as "only needs renaming".

**Non-blocking assumptions, stated so they can be corrected**

* Renaming is done by preserving the row (`UPDATE … SET name`), not by insert-and-migrate. This keeps `artefact.listTypeId` and `subscription_list_type.list_type_ids` valid with no data migration.
* `urlPath`, package directory names and page directory names are *not* renamed. Only the `name` column crosses the system boundary.
* Friendly names stay as they are. The shared model may also differ on friendly names; reconciling display text is not in this ticket.
* The corrected provenance for the Primary Health list type is `CFT_IDAM`. It is currently `MANUAL_UPLOAD`, its `default_sensitivity` is `null`, and it is flagged non-strategic — so today no access decision depends on the value. Confirm against the shared model.
* `MANUAL_UPLOAD` is *not* added to `USER_PROVENANCE_OPTIONS`. It belongs to the source-system vocabulary (`libs/publication/src/provenance.ts`) and admitting it to the identity-provider column would re-create the ambiguity this ticket removes.
* The `allowed_provenance` column stays a delimited `VarChar(50)` string. Normalising it into a join table would make the delimiter structurally impossible, but needs a migration and touches authorisation; the type-level fix satisfies the acceptance criterion. Flagging it as the better long-term shape.
* No prod environment exists yet, so no prod-specific rename guard is added — consistent with the existing note in `CLAUDE.md` about `generate-seed-sql.ts`.
* MI report consumers are notified out-of-band that `list_type` values change. Nothing in this repository versions that CSV contract.

**Arithmetic that does not add up in the ticket**

* The ticket says 24 list types are "genuinely absent", then accounts for 16 out-of-scope + 7 already-present-needing-rename + 3 to-confirm = 26. Two rows are double-counted or mislabelled. The reconciliation test in §9.4 must be built from an explicit agreed inventory, not from these counts.

**Sequencing**

* The shared model's `CROWN_WARNED_PDDA_LIST` → `CROWN_ADVANCED_PDDA_LIST` rename (#957) is in flight. Any rename here that touches the Crown warned list must land *after* #957 is confirmed deployed in the shared model, or the two systems will disagree in the opposite direction.
* The three implementation tickets for `SJP_PRESS_REGISTER`, `SSCS_DAILY_LIST_ADDITIONAL_HEARINGS` and `CIC_DAILY_HEARING_LIST` are raised by this ticket but delivered separately; the reconciliation test lists them as documented exclusions until they land.


### Comment by OgechiOkelu on 2026-09-25T15:56:15Z

@plan
