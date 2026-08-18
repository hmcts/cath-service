# #957: Changes to Crown warned list (Go-Live 1st Oct 2026)

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** None
**Created:** 2026-08-18T12:01:16Z
**Updated:** 2026-08-18T12:34:37Z

## Description

PROBLEM STATEMENT

The Crime service has communicated that the Crown Warned list created in #436  is going to become obsolete. The Crown Advance list will replace the Crown Warned list. This will require some changes and adaptation of the current style guide and validation schema of the existing Warned list.

 

**AS A** service
**I WANT** to make changes to the Crown Warned list
**SO THAT** it can be adapted to the Crown Advance list

 

 

**ACCEPTANCE CRITERIA**
- The list name is changed from Crown Warned List to Crown Advance List, both at the front end, in the manual upload drop down options and also an internal list type name change in the database to Crown Advance List
- List name in the database should be Crown Advanced PDDA list so it matches other Crown list nomenclature. 
- The fist sentence on the opening statement of the current Warned list (The undermentioned cases are warned for the hearing period of week commencing 07 September 2026) is removed such that it now reads as follows;

Any representation about the listing of a case should be made to the Listing Officer immediately

The prosecuting authority is the Crown Prosecution Service unless otherwise stated

*denotes a defendant in custody

- The same data fields are retained; however some changes will be made to the Hearing types from Xhibit.
- Changes should be implemented as cosmetic changes such that existing subscriptions to the Crown warned list are not lost/removed but retained as Crown Advance list
- These changes are merged just before go-live on 1st October


**Welsh translation:**
Crown Advance List - Rhestr Ymlaen Llaw Llys y Goron

## Comments

### Comment by OgechiOkelu on 2026-08-18T12:27:19Z

@spec

### Comment by hmctsclaudecode on 2026-08-18T12:33:49Z

# Technical Specification — Issue #957: Changes to Crown Warned List (Go-Live 1st Oct 2026)

## 1. User Story

**As a** service (CaTH)
**I want to** rename the Crown Warned List to the Crown Advance List and remove the "week commencing" sentence from its opening statement
**So that** the publication matches the Crown Advance List that replaces the obsolete Crown Warned List from 1 October 2026, without breaking existing subscriptions, artefacts or third-party feeds

---

## 2. Background

The Crime service is retiring the Crown Warned List (delivered under issue #436) and replacing it with the **Crown Advance List**. The underlying PDDA/Xhibit payload, data fields and page layout are unchanged — only the list's name, the opening statement, and the set of `HearingDescription` values arriving from Xhibit change.

The change must be **identity-preserving**. Every subscription and downstream reference to this list is keyed on the **autoincrement `list_types.id`**, not on the name:

| Table | Column | Purpose |
|---|---|---|
| `subscription_list_type` | `list_type_ids Int[]` | Citizen/professional list-type subscriptions |
| `artefact` | `list_type_id Int` | All previously published Crown Warned artefacts |
| `third_party_user_list_type` | `list_type_id Int` | Third-party API subscriptions |
| `list_search_config` | `list_type_id Int` | Search configuration |
| `list_types_sub_jurisdictions` | `list_type_id Int` | Sub-jurisdiction mapping |

Therefore the DB change **must be an in-place `UPDATE` of the existing row**, never a delete-and-insert. The deploy seeder (`apps/postgres/prisma/generate-seed-sql.ts`) upserts `list_types` with `ON CONFLICT (name)` and soft-deletes any active row whose name is absent from `listTypeData`. If we simply swapped the entry in `listTypeData`, the seeder would **insert a new row with a new `id` and soft-delete the old one** — silently orphaning every subscription and artefact. A Prisma migration that renames the row in place must therefore land alongside the `listTypeData` change; `apps/postgres/start.sh` runs `prisma migrate deploy` **before** the generated seed, so the ordering is safe.

Current implementation:

| Concern | Location |
|---|---|
| Lib package | `libs/list-types/crown-warned-list/` (`@hmcts/crown-warned-list`) |
| Page controller / template | `apps/web/src/pages/(list-types)/crown-warned-list/` |
| Reference data | `libs/list-types/common/src/list-type-data.ts:45` |
| PDF generator registry | `libs/publication/src/processing/service.ts:203` (keyed by `listTypeName`) |
| Subscription email summary registry | `libs/notifications/src/notification/notification-service.ts:214` (keyed by `listTypeName`) |
| JSON schema validator resolution | `libs/list-types/common/src/validation/list-type-validator.ts` — imports `@hmcts/${kebab(list_types.name)}` |
| E2E reference data | `e2e-tests/utils/seed-list-types.ts:32` |

Two constraints follow from `list-type-validator.ts`: the **package name must equal `kebab-case(list_types.name)`** (or be registered in `PACKAGE_ALIASES`), and the **page URL must equal `list_types.url`**, because `getRenderedTemplateUrl` (`libs/publication/src/repository/service.ts:70`) builds `/${listType.url}?artefactId=...` for every search result and subscription email link.

Related: #436 (original Crown Warned List build).

---

## 3. Acceptance Criteria

* **Scenario:** DB list type is renamed in place and subscriptions survive
    * **Given** a user has an active list-type subscription to the Crown Warned List (its `list_types.id` is present in their `subscription_list_type.list_type_ids`)
    * **When** the release is deployed and `prisma migrate deploy` followed by the generated seed runs
    * **Then** the `list_types` row keeps its original `id`, its `name` is `CROWN_ADVANCED_PDDA_LIST`, `friendly_name` is `Crown Advance List`, `welsh_friendly_name` is the Welsh name, `url` is `crown-advance-list`, `deleted_at` is `NULL`, and no new `list_types` row is created

* **Scenario:** Admin sees the new name in the manual upload dropdown
    * **Given** a CTSC admin is on `/manual-upload`
    * **When** they open the list type dropdown
    * **Then** the option reads "Crown Advance List" and no option reads "Crown Warned List"

* **Scenario:** Published list renders under the new name
    * **Given** a published Crown Advance List artefact
    * **When** a user opens it from the court's publications page
    * **Then** they are taken to `/crown-advance-list?artefactId=...` and the `<h1>` reads "Crown Advance List for {court name}"

* **Scenario:** Opening statement no longer contains the week-commencing sentence
    * **Given** a published Crown Advance List artefact
    * **When** a user views the page (or its generated PDF)
    * **Then** the three statements below are shown in order and the sentence "The undermentioned cases are warned for the hearing period of week commencing …" is absent:
        1. "Any representation about the listing of a case should be made to the Listing Officer immediately"
        2. "The prosecuting authority is the Crown Prosecution Service unless otherwise stated"
        3. "*denotes a defendant in custody"

* **Scenario:** Statements render regardless of content date
    * **Given** an artefact whose `contentDate` produces no week-commencing value
    * **When** the page renders
    * **Then** all three statements are still displayed (the current `{% if header.weekCommencing %}` guard no longer suppresses them)

* **Scenario:** Existing links and bookmarks still work
    * **Given** a subscription email or bookmark pointing at `/crown-warned-list?artefactId=abc`
    * **When** the user follows it
    * **Then** they receive a `301` redirect to `/crown-advance-list?artefactId=abc` and the list renders

* **Scenario:** Welsh journey
    * **Given** a user on `/crown-advance-list?artefactId=...`
    * **When** they switch to Welsh (`?lng=cy`)
    * **Then** the page title, the three statements, all table headings and the reporting-restrictions block are shown in Welsh

* **Scenario:** JSON upload validation still resolves
    * **Given** a CTSC admin uploads a Crown Advance List JSON file via manual upload
    * **When** validation runs
    * **Then** `validateListTypeJson` resolves the renamed package from the new `list_types.name` and the file passes with the same schema as before (same data fields retained)

* **Scenario:** New Xhibit hearing types render without code change
    * **Given** a payload containing hearing descriptions that did not exist before (e.g. a newly introduced Xhibit hearing type)
    * **When** the page renders
    * **Then** each distinct `HearingDescription` becomes its own accordion section headed by that value, and cases with no fixed date remain grouped under "To be allocated"

* **Scenario:** Data pipeline continuity
    * **Given** a Crown Advance List JSON blob is ingested
    * **When** post-processing runs
    * **Then** the PDF generator and the subscription-email summary builder are both resolved from `CROWN_ADVANCED_PDDA_LIST` and produce output as before

---

## 4. User Journey Flow

```
                     ┌──────────────────────────────────────┐
 CTSC Admin ────────►│ /manual-upload                       │
                     │ list type dropdown:                  │
                     │   "Crown Advance List"  (renamed)    │
                     └───────────────┬──────────────────────┘
                                     │ JSON file
                                     ▼
                     ┌──────────────────────────────────────┐
                     │ validateListTypeJson()               │
                     │ list_types.name                      │
                     │   CROWN_ADVANCED_PDDA_LIST           │
                     │   → @hmcts/crown-advanced-pdda-list  │
                     └───────────────┬──────────────────────┘
                                     ▼
                     ┌──────────────────────────────────────┐
                     │ artefact created (list_type_id       │
                     │ UNCHANGED → existing subscriptions   │
                     │ still match)                         │
                     └───────┬───────────────────┬──────────┘
                             │                   │
              PDF generation │                   │ subscription email
                             ▼                   ▼
              ┌────────────────────┐   ┌──────────────────────────────┐
              │ PDF titled         │   │ email links to               │
              │ "Crown Advance     │   │ /crown-advance-list?artefact │
              │  List"             │   │  Id=...                      │
              └────────────────────┘   └──────────────┬───────────────┘
                                                      │
 Citizen / Media ─── court page / search ─────────────┤
                                                      ▼
                     ┌──────────────────────────────────────┐
                     │ GET /crown-advance-list?artefactId=  │
                     │  h1 "Crown Advance List for {court}" │
                     │  3 statements (no week-commencing)   │
                     │  accordion by hearing type           │
                     └──────────────────────────────────────┘
                                     ▲
                     ┌───────────────┴──────────────────────┐
 old bookmark /      │ GET /crown-warned-list  → 301        │
 old email link ────►│ preserves ?artefactId                │
                     └──────────────────────────────────────┘
```

---

## 5. Low Fidelity Wireframe

Page after the change (`/crown-advance-list?artefactId=…`). The struck-through line marks the sentence being **removed**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK   Court and tribunal hearings                          [Cymraeg]      │
├──────────────────────────────────────────────────────────────────────────────┤
│ BETA  This is a new service – your feedback will help us improve it           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Crown Advance List for Crown Court at Birmingham            <h1, was        │
│  ─────────────────────────────────────────────────            "Crown Warned  │
│                                                                List for …">  │
│  Find contact details and other information about courts and                 │
│  tribunals in England and Wales, and some non-devolved tribunals             │
│  in Scotland.                                                                │
│                                                                              │
│  **10 November 2025 to 11 November 2025**            (date range: unchanged) │
│  Last updated 12 November 2025 at 9am                                        │
│  Version 1.0                                                                 │
│  Newton Street                                                               │
│  B4 7NA                                                                      │
│                                                                              │
│  ~~The undermentioned cases are warned for the hearing period of~~   REMOVED  │
│  ~~week commencing 07 September 2026~~                                       │
│                                                                              │
│  Any representation about the listing of a case should be made to            │
│  the Listing Officer immediately                                             │
│                                                                              │
│  The prosecuting authority is the Crown Prosecution Service unless           │
│  otherwise stated                                                            │
│                                                                              │
│  *denotes a defendant in custody                                             │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Restrictions on publishing or writing about these cases                │  │
│  │ You must check if any reporting restrictions apply …                    │  │
│  │  ⚠  Warning You'll be in contempt of court if you publish …            │  │
│  │ • the court directly                                                   │  │
│  │ • HM Courts and Tribunals Service on 0330 808 4407                     │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Search Cases                                                                │
│  [_________________________________]                                         │
│                                                                              │
│  ▼ Trial                                        (accordion: hearing type)    │
│  ┌───────────┬────────────┬───────────┬────────────┬────────┬─────────────┐  │
│  │ Fixed For │ Case Ref   │ Defendant │ Prosecuting│ Linked │ Listing     │  │
│  │     ⇅     │      ⇅     │ Name(s) ⇅ │ Authority ⇅│ Cases ⇅│ Notes ⇅     │  │
│  ├───────────┼────────────┼───────────┼────────────┼────────┼─────────────┤  │
│  │ 10/11/25  │ C12345678  │ *John Doe │ CPS        │ T87654 │ Part heard  │  │
│  └───────────┴────────────┴───────────┴────────────┴────────┴─────────────┘  │
│                                                                              │
│  ▼ Plea and Trial Preparation Hearing            (new Xhibit hearing types    │
│  ┌ … ┐                                            appear automatically)      │
│                                                                              │
│  ▼ To be allocated                               (WithoutFixedDate cases)    │
│  ┌ … ┐                                                                       │
│                                                                              │
│  Data Source: PDDA                                                           │
│  Back to top                                                                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

Manual upload dropdown:

```
  What is the list type?
  ┌───────────────────────────────────────────┐
  │ <Please choose a list type>            ▼  │
  │  …                                        │
  │  Crown Daily List                         │
  │  Crown Firm List                          │
  │  Crown Advance List        ← renamed      │
  │  …                                        │
  └───────────────────────────────────────────┘
```

---

## 6. Page Specifications

The page layout, components and data fields are unchanged. Only names, one removed paragraph and its conditional wrapper change.

### 6.1 Reference data (single source of truth)

`libs/list-types/common/src/list-type-data.ts` — edit the existing entry in place (do **not** delete and re-add):

```ts
{
  name: "CROWN_ADVANCED_PDDA_LIST",
  englishFriendlyName: "Crown Advance List",
  welshFriendlyName: "Rhestr Ymlaen Llaw Llys y Goron",
  provenance: "CRIME_IDAM",
  urlPath: "crown-advance-list",
  isNonStrategic: false,
  defaultSensitivity: "Classified",
  subJurisdictionIds: [4]
}
```

`defaultSensitivity`, `provenance` and `subJurisdictionIds` are unchanged.

### 6.2 Database migration (mandatory, ordering-critical)

New migration directory `apps/postgres/prisma/migrations/<timestamp>_rename_crown_warned_list_to_crown_advance/migration.sql`:

```sql
-- Rename in place so list_types.id is preserved. Every subscription
-- (subscription_list_type.list_type_ids), artefact, third-party subscription and
-- search config references this row by id, so a delete-and-insert would orphan them.
UPDATE list_types
SET name                = 'CROWN_ADVANCED_PDDA_LIST',
    friendly_name       = 'Crown Advance List',
    welsh_friendly_name = 'Rhestr Ymlaen Llaw Llys y Goron',
    url                 = 'crown-advance-list',
    deleted_at          = NULL,
    updated_at          = NOW()
WHERE name = 'CROWN_WARNED_LIST'
  AND NOT EXISTS (SELECT 1 FROM list_types WHERE name = 'CROWN_ADVANCED_PDDA_LIST');
```

Notes:
* Idempotent — a re-run is a no-op once the rename has happened.
* `list_types.name` and `list_types.url` are unique; the `NOT EXISTS` guard avoids a constraint violation if the row already exists on an environment.
* No Prisma schema change is required — no columns are added or removed.
* No `shortened_friendly_name` change is needed (the list has none; the dropdown falls back to `friendly_name`).

### 6.3 Package rename

Rename `libs/list-types/crown-warned-list` → `libs/list-types/crown-advanced-pdda-list`, package `@hmcts/crown-warned-list` → `@hmcts/crown-advanced-pdda-list`.

The package name **must** equal `kebab-case(list_types.name)` because `validateListTypeJson` resolves the validator via `await import("@hmcts/" + kebab(name))`. Renaming keeps that derivation implicit and avoids growing `PACKAGE_ALIASES`.

*Lower-churn fallback, if the rename is judged too broad for a go-live-window merge:* keep the directory/package as-is and add `"crown-advanced-pdda-list": "crown-warned-list"` to `PACKAGE_ALIASES` in `libs/list-types/common/src/validation/list-type-validator.ts`. This works but leaves the obsolete name in the codebase; prefer the rename.

Exported symbols to rename (mechanical):

| Current | New |
|---|---|
| `CrownWarnedListData` | `CrownAdvanceListData` |
| `crownWarnedListEn` / `crownWarnedListCy` | `crownAdvanceListEn` / `crownAdvanceListCy` |
| `renderCrownWarnedListData` | `renderCrownAdvanceListData` |
| `validateCrownWarnedList` | `validateCrownAdvanceList` |
| `generateCrownWarnedListPdf` | `generateCrownAdvanceListPdf` |
| `src/schemas/crown-warned-list.json` | `src/schemas/crown-advanced-pdda-list.json` |

The JSON root key stays `WarnedList` (see §14 — the payload contract is unchanged), so `CrownAdvanceListData.WarnedList` is intentionally retained. Add a one-line comment on the type explaining why.

### 6.4 Files to update

| File | Change |
|---|---|
| `libs/list-types/common/src/list-type-data.ts:45` | Entry edited in place (§6.1) |
| `apps/postgres/prisma/migrations/<new>/migration.sql` | New rename migration (§6.2) |
| `libs/list-types/crown-advanced-pdda-list/package.json` | `name` → `@hmcts/crown-advanced-pdda-list` |
| `libs/list-types/crown-advanced-pdda-list/src/index.ts` | Renamed exports |
| `libs/list-types/crown-advanced-pdda-list/src/locales/en.ts`, `cy.ts` | `title`, `pageTitle` renamed; `preStatementPrefix` **deleted** |
| `libs/list-types/crown-advanced-pdda-list/src/rendering/renderer.ts` | Drop `header.weekCommencing`, `toStartOfWeek()` and the now-unused `formatContentDate` import |
| `libs/list-types/crown-advanced-pdda-list/src/pdf/pdf-template.njk:49-54` | Remove the `{% if header.weekCommencing %}` wrapper and the prefix line; render the three statements unconditionally |
| `libs/list-types/crown-advanced-pdda-list/src/pdf/pdf-generator.ts` | Function rename only |
| `libs/list-types/crown-advanced-pdda-list/src/validation/json-validator.ts` | Function + schema import rename |
| `libs/list-types/crown-advanced-pdda-list/src/email-summary/summary-builder.ts` | Type rename only (email field labels unchanged) |
| `apps/web/src/pages/(list-types)/crown-warned-list/` | Rename dir + `crown-warned-list.njk` → `crown-advance-list/crown-advance-list.njk`; update `res.render("crown-advance-list", …)`; remove the `{% if header.weekCommencing %}` wrapper (template lines 51-56) |
| `apps/web/src/pages/(list-types)/crown-warned-list/index.ts` (new legacy stub) | New `apps/web/src/pages/(list-types)/crown-warned-list/index.ts` containing only a `301` redirect (§11) |
| `apps/web/src/app.ts:16,153` | Import + `modulePaths` entry renamed |
| `libs/publication/src/processing/service.ts:12,203` | Import renamed; `PDF_GENERATOR_REGISTRY` key → `CROWN_ADVANCED_PDDA_LIST` |
| `libs/publication/package.json:35`, `libs/notifications/package.json:33` | Workspace dependency renamed |
| `libs/notifications/src/notification/notification-service.ts:28,214` | Import renamed; summary registry key → `CROWN_ADVANCED_PDDA_LIST` |
| `tsconfig.json:81,84` | Path aliases `@hmcts/crown-advanced-pdda-list` and `/config` |
| `e2e-tests/utils/seed-list-types.ts:32-38` | `name`, `friendlyName`, `welshFriendlyName`, `url` updated |
| All co-located `*.test.ts` for the above | Renamed imports/keys; assertions for the removed sentence |

No change is needed to `apps/web/vite.config.ts` (this lib contributes no bundled assets), `apps/api/src/app.ts` (no API routes), or the Prisma schema files.

### 6.5 Hearing types

`HearingDescription` is a free-text `"type": "string"` in the schema (`crown-advanced-pdda-list.json`, both the `WithFixedDate` and `WithoutFixedDate` branches) and is used verbatim as the accordion section heading in `renderer.ts`. Xhibit changing its set of hearing types therefore requires **no schema or code change** — new values render as new accordion sections automatically. Two consequences to note:

* Hearing type headings are **not translated** — Welsh users see the English Xhibit value. This is existing behaviour and is out of scope unless Crime supplies a mapping (see §14).
* Accordion section order follows first-encountered order in the payload; only `To be allocated` has an explicit label. No fixed ordering is introduced.

---

## 7. Content

### 7.1 Renamed keys — `libs/list-types/crown-advanced-pdda-list/src/locales/`

| Key | English | Welsh |
|---|---|---|
| `title` | Crown Advance List | [WELSH TRANSLATION REQUIRED: "Crown Advance List"] |
| `pageTitle` | Crown Advance List for | [WELSH TRANSLATION REQUIRED: "Crown Advance List for"] |

The ticket supplies the authoritative Welsh list name: **Rhestr Ymlaen Llaw Llys y Goron**. This same string is used for `welshFriendlyName` in `list-type-data.ts` and for `welsh_friendly_name` in the migration, so that Welsh users of the flat-file viewer and publication summaries (`libs/public-pages/src/flat-file/flat-file-service.ts:43`) see the Welsh name.

### 7.2 Removed keys

| Key | Removed English text | Removed Welsh text |
|---|---|---|
| `preStatementPrefix` | The undermentioned cases are warned for the hearing period of week commencing | Mae'r achosion a grybwyllir isod wedi'u rhybuddio ar gyfer cyfnod gwrandawiad yr wythnos sy'n cychwyn |

Delete the key from both `en.ts` and `cy.ts` (locale-key parity is asserted by the template tests) and remove `header.weekCommencing` from the renderer.

### 7.3 Retained opening statement (order preserved)

| Key | English | Welsh |
|---|---|---|
| `preStatementSuffix2` | Any representation about the listing of a case should be made to the Listing Officer immediately | [WELSH TRANSLATION REQUIRED: "Any representation about the listing of a case should be made to the Listing Officer immediately"] |
| `preStatementSuffix3` | The prosecuting authority is the Crown Prosecution Service unless otherwise stated | Yr awdurdod erlyn yw Gwasanaeth Erlyn y Goron oni nodir yn wahanol. |
| `preStatementSuffix4` | *denotes a defendant in custody | Mae (*) yn dynodi diffynnydd a gedwir yn y ddalfa |

The existing Welsh for these three is already in `cy.ts` and is correct; the markers above exist so the translation script can confirm/refresh them. The keys keep their current `Suffix2/3/4` names — renumbering them to `1/2/3` adds churn with no user-visible benefit, though it is a reasonable tidy-up if the reviewer prefers it.

### 7.4 Unchanged content

All other locale keys are untouched: `factLinkText`, `factAdditionalText`, `lastUpdated`, `version`, table headings (`fixedFor`, `caseRef`, `defendant`, `prosecutingAuthority`, `linkedCases`, `listingNotes`), `toBeAllocated`, `searchCases`, the whole reporting-restrictions block, `courtHouseDetails`, `backToTop`, `dataSource` and the error strings. Email summary field labels in `summary-builder.ts` ("Fixed for", "Case Reference", "Defendant Name(s)", "Prosecuting Authority") are unchanged.

---

## 8. URL

| Route | Method | Behaviour |
|---|---|---|
| `/crown-advance-list?artefactId={uuid}` | GET | Renders the Crown Advance List. Must match `list_types.url` exactly — `getRenderedTemplateUrl` builds this path for every search result, publications-page link and subscription email. |
| `/crown-warned-list?artefactId={uuid}` | GET | `301` redirect to `/crown-advance-list`, preserving `artefactId`. |

Page directory: `apps/web/src/pages/(list-types)/crown-advance-list/` (auto-discovered; `(list-types)` is a route group and adds no prefix).

Existing artefacts are unaffected — they keep the same `list_type_id`, so after the migration their generated links point at the new URL automatically.

---

## 9. Validation

No change to validation rules. The same JSON schema, root key (`WarnedList`) and required fields apply — the ticket states the same data fields are retained.

| Check | Behaviour |
|---|---|
| Package resolution | `validateListTypeJson` derives `@hmcts/crown-advanced-pdda-list` from `list_types.name`. If the package rename and the DB rename land out of step, uploads fail with "No JSON schema available for Crown Advance List" — both must ship in the same release. |
| Schema | Unchanged. `HearingDescription` remains a required free-text string on each `Hearing` entry; `ProsecutingAuthority` keeps its existing enum; `CustodyStatus` keeps `On bail / On remand / In care / In custody / Not applicable`. |
| Guard test | `libs/list-types/common/src/validation/guard.test.ts` requires every package shipping `src/schemas/*.json` to export a `validate*` function — satisfied by the renamed `validateCrownAdvanceList`. |
| Missing `artefactId` | 400, unchanged (`createListTypeHandler`). |
| Artefact not found / blob missing | 404, unchanged. |
| Sensitivity | `checkAccess: true` with `defaultSensitivity: "Classified"` — unchanged; only verified users see the list. |
| Empty `weekCommencing` | No longer relevant — the statements render unconditionally. |

---

## 10. Error Messages

Unchanged; only the list name inside them changes where it is derived from reference data.

| Condition | English | Welsh |
|---|---|---|
| Publication unavailable (400/404/500) | Publication not available — This publication cannot be viewed at the moment. Please check again later. If the problem persists, contact the court directly for assistance. | [WELSH TRANSLATION REQUIRED: "Publication not available"] / [WELSH TRANSLATION REQUIRED: "This publication cannot be viewed at the moment. Please check again later. If the problem persists, contact the court directly for assistance."] |
| Insufficient permission (403) | Access Denied — You do not have permission to view this publication. | [WELSH TRANSLATION REQUIRED: "Access Denied"] / [WELSH TRANSLATION REQUIRED: "You do not have permission to view this publication."] |
| Upload of JSON that fails the schema | There is a problem — The JSON file is not valid for the selected list type (existing manual-upload validation message) | [WELSH TRANSLATION REQUIRED: "The JSON file is not valid for the selected list type"] |

---

## 11. Navigation

* **Entry points:** court publications page (`summary-of-publications`), search results, subscription emails and the admin upload-summary page — all resolve the URL from `list_types.url`, so no hardcoded links need changing.
* **Legacy redirect:** keep the directory `apps/web/src/pages/(list-types)/crown-warned-list/` with only a redirect controller, following the existing precedent in `apps/web/src/pages/(core)/cookies/index.ts`:

```ts
// apps/web/src/pages/(list-types)/crown-warned-list/index.ts
import type { Request, Response } from "express";

export const GET = (req: Request, res: Response) => {
  const artefactId = typeof req.query.artefactId === "string" ? req.query.artefactId : "";
  const suffix = artefactId ? `?artefactId=${encodeURIComponent(artefactId)}` : "";
  res.redirect(301, `/crown-advance-list${suffix}`);
};
```

* Delete this stub in a follow-up ticket once emails referencing the old path have aged out (suggest 3 months after go-live).
* No breadcrumb, back-link or service-navigation change: the list page has none today.

---

## 12. Accessibility

No new components; WCAG 2.2 AA behaviour must be preserved through the rename.

* `<h1 id="page-heading">` remains the single `h1` and matches the `<title>`; both must read "Crown Advance List for {court}".
* Removing one `<p>` from the opening statement does not change heading order — `h1` → `h2` (Search Cases / accordion sections) → `h3` (reporting restrictions) is unchanged.
* The three retained statements remain plain `<p class="govuk-body">` in reading order immediately before the reporting-restrictions region.
* The custody indicator keeps `<span aria-hidden="true">*</span>` with the "*denotes a defendant in custody" statement as its textual explanation — because the explanatory sentence was previously inside the `{% if header.weekCommencing %}` block, removing that guard **fixes** an existing defect where the `*` could appear with no explanation.
* Sortable table headers keep `scope="col"` and `aria-sort="none"`; the accordion keeps `data-module="govuk-accordion"` and unique section IDs.
* The case-search input keeps its associated label/heading; verify the accordion still announces the renamed sections.
* Axe scan on `/crown-advance-list` (English and Welsh) must return zero violations, run inline in the E2E journey.
* The `301` redirect target must be reachable by keyboard with no interstitial.

---

## 13. Test Scenarios

Unit / integration (Vitest, co-located):

* Renderer no longer returns a `weekCommencing` header property, and the previous Monday-rounding tests are deleted rather than adapted.
* Renderer still groups cases by `HearingDescription`, still buckets `WithoutFixedDate` cases under `TO_BE_ALLOCATED`, and still sorts by fixed date — proving the removal touched only the header.
* Renderer creates a new accordion group for a hearing description not previously seen (guards the Xhibit hearing-type change).
* Controller renders the `crown-advance-list` template with `pageTitle` from the renamed locale key, in English and in Welsh.
* Template test: the three statements are present in document order and the removed prefix string appears nowhere in the rendered HTML.
* Template test: the statements still render when the header carries no week-commencing value (regression guard for the removed `{% if %}`).
* Template test: locale-key parity between `en.ts` and `cy.ts`, and Welsh render shows the Welsh heading and statements.
* Legacy route test: `GET /crown-warned-list?artefactId=X` responds `301` to `/crown-advance-list?artefactId=X`, and responds `301` to `/crown-advance-list` when `artefactId` is absent.
* JSON validator test: renamed `validateCrownAdvanceList` still passes the fully-hydrated valid fixture and still fails for each individually removed required field (existing suite, renamed import).
* `PDF_GENERATOR_REGISTRY` resolves `CROWN_ADVANCED_PDDA_LIST` to the Crown Advance PDF generator, and the PDF template omits the removed sentence.
* Notification summary registry resolves `CROWN_ADVANCED_PDDA_LIST` to the Crown Advance summary extractor/formatter.
* Seed-SQL generator test: `listTypeData` containing `CROWN_ADVANCED_PDDA_LIST` produces no soft-delete statement for it, and the emitted upsert sets the new friendly names and URL.
* Guard test in `libs/list-types/common` continues to pass for the renamed package.

Migration / data (verified against a seeded local DB, plus a manual STG check before merge):

* Applying the migration to a DB holding `CROWN_WARNED_LIST` leaves `list_types.id` unchanged and updates `name`, `friendly_name`, `welsh_friendly_name`, `url`.
* Re-applying `migrate deploy` + generated seed is a no-op: still exactly one row, same `id`, `deleted_at` still `NULL`.
* A `subscription_list_type` row whose `list_type_ids` contains that `id` still matches the renamed list type after migrate + seed.
* Artefacts published before the rename still resolve to `/crown-advance-list?artefactId=…` via `getRenderedTemplateUrl`.

E2E (Playwright — extend the existing Crown list journey rather than adding new specs):

* Single `@nightly` journey: admin signs in → `/manual-upload` → asserts the dropdown reads "Crown Advance List" → uploads a Crown Advance JSON fixture → confirms → signs in as a verified user → opens the published list from the court page → asserts the `h1`, the three statements and the absence of the removed sentence → switches to Welsh and asserts the Welsh heading and statements → runs an inline Axe scan → checks keyboard navigation of one accordion section → follows the legacy `/crown-warned-list?artefactId=…` URL and asserts it lands on the renamed page.

---

## 14. Assumptions & Open Questions

**Assumptions**

* The PDDA/Xhibit payload contract is unchanged: the JSON root key stays `WarnedList` and `DocumentType` stays `crown_warned_pdda_list`. The ticket says the same data fields are retained, so the schema is untouched and only TypeScript symbol names change. If Crime is in fact renaming the payload root, the schema, `models/types.ts`, renderer, summary builder and every fixture change too — that is a materially larger piece of work.
* `list_types.name` becomes `CROWN_ADVANCED_PDDA_LIST` (from the AC "Crown Advanced PDDA list"), with front-end/`friendly_name` "Crown Advance List".
* `url` becomes `crown-advance-list`; leaving `crown-warned-list` in user-visible URLs after a public rename is not acceptable, and the `301` covers existing links.
* Sensitivity stays `Classified`, provenance stays `CRIME_IDAM`, sub-jurisdiction stays Crown (4).
* Changed Xhibit hearing types need no code change because `HearingDescription` is free text and rendered verbatim.
* There is no production deployment yet, so this must be verified on STG; the migration is nonetheless written to be production-safe and idempotent.

**Open questions**

* **Hearing types:** can Crime supply the actual before/after list of Xhibit hearing types? Needed to confirm nothing relies on a fixed set, and to answer whether the new types require a defined display order or Welsh display names. Today they are rendered untranslated in both locales.
* **Go-live mechanics:** the AC says merge just before 1 October 2026. Recommendation is a scheduled merge in the go-live window, not a feature flag — flagging would mean maintaining two locale sets, two URLs and two registry keys, which is more risk than the merge timing it avoids. Confirm the release window and who owns the STG verification on the day.
* **Already-generated PDFs:** PDFs generated before the rename keep the old title and the removed sentence. Do we regenerate PDFs for in-window artefacts at go-live, or accept that pre-1-October publications keep the old wording?
* **Historic artefacts:** published Crown Warned artefacts with content dates before go-live will render under the new name and without the week-commencing sentence, because rendering is not versioned. Confirm this is acceptable to Crime (assumed yes, as the change is described as cosmetic).
* **Package rename vs alias:** confirm the reviewer prefers the full package rename to `@hmcts/crown-advanced-pdda-list` over adding a `PACKAGE_ALIASES` entry.
* **Third-party subscribers:** third-party API subscriptions are keyed on `list_type_id` and survive, but any external consumer matching on the `CROWN_WARNED_LIST` name string will break. Does anything outside this repo consume that name, and do third parties need notifying before 1 October?
* **Legacy redirect lifetime:** confirm a follow-up ticket to delete the `/crown-warned-list` stub, and the agreed retention period (suggest 3 months).

### Comment by OgechiOkelu on 2026-08-18T12:34:37Z

@plan

