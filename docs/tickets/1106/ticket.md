---
# #1106: 'Traffic Virtual Courts List' to be created in CaTH

**State:** OPEN
**Assignees:** KianKwa
**Author:** OgechiOkelu
**Labels:** priority:2-high, type:story
**Created:** 2026-09-30T11:41:34Z
**Updated:** 2026-10-08T13:52:33Z

## Description

**PROBLEM STATEMENT**
A new Crime list type (Traffic Virtual Courts List) needs to be created in CaTH. This list will be piloted by the Poole Magistrates' Court (already available in CaTH) and will be published twice a week (Wednesdays and Fridays) until 26 October 2026. From that point onwards, it will be published three times a week (Mondays, Wednesdays and Fridays).
**Publishing route:** manual upload
**File type:** flat file
**List name:** Traffic Virtual Courts List
**Jurisdiction(s):** Crime
**Sub-jurisdiction:** Magistrates Court

 

 

**AS A** Crime Service Manager
**I WANT** to create the 'Traffic Virtual Courts List’ 
**SO THAT** this hearing list can be published in CaTH

 

 

**ACCEPTANCE CRITERIA**
- The Traffic Virtual Courts List is created in CaTH
- The list name is added to the drop-down options in the manual upload form
- Courtel is enabled to receive the list


**Welsh translation:** 

Traffic Virtual Courts List - Rhestr y Llys ar gyfer Achosion Traffig sydd i’w cynnal yn rhithiol

## Comments

### Comment by OgechiOkelu on 2026-09-30T11:42:27Z
@spec 

### Comment by hmctsclaudecode on 2026-09-30T11:51:04Z
# Technical Specification — Issue #1106: 'Traffic Virtual Courts List' to be created in CaTH

## 1. User Story

**As a** Crime Service Manager
**I want to** create the 'Traffic Virtual Courts List' as a new Crime (Magistrates Court) list type in CaTH
**So that** Poole Magistrates' Court can manually upload the list as a flat file, it is discoverable and viewable by the correct audiences, and Courtel can be subscribed to receive it

## 2. Background

A new Crime list type is being piloted at Poole Magistrates' Court. Because the publishing route is **manual upload** and the file type is **flat file**, this is a reference-data change, not a new rendered list-type page.

**Key characteristics from the issue**

| Attribute | Value |
|---|---|
| List name (English) | Traffic Virtual Courts List |
| List name (Welsh) | Rhestr y Llys ar gyfer Achosion Traffig sydd i'w cynnal yn rhithiol |
| Jurisdiction | Crime (`jurisdictionId: 3`) |
| Sub-jurisdiction | Magistrates Court (`subJurisdictionId: 7`) |
| Publishing route | Manual upload (`/manual-upload`) |
| File type | Flat file (PDF / DOC / DOCX / HTM / HTML / CSV) |
| Pilot location | Poole Magistrates' Court |
| Publication cadence | Wednesdays and Fridays until 26 October 2026; Mondays, Wednesdays and Fridays thereafter |
| Third party | Courtel must be able to receive the list |

**Why this is a data change, not a new page**

Flat-file publications are not rendered by a list-type-specific Nunjucks template. `apps/web/src/pages/(public)/summary-of-publications/index.njk:34` branches on `publication.isFlatFile` and links to the generic flat-file viewer at `/hearing-lists/{locationId}/{artefactId}`, bypassing the `urlPath` route entirely. `isFlatFile` is a per-artefact property set at upload time from the uploaded file, not a property of the list type (`libs/publication/src/repository/model.ts:13`).

Consequently this ticket does **not** require:

* a new `libs/list-types/*` package
* a JSON schema (`src/schemas/*.json`) or a `validate*` wrapper — so the CI guard at `libs/list-types/common/src/validation/guard.test.ts` is unaffected
* a PDF generator registration in `PDF_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts`)
* an Excel converter registration (`registerConverterByName`)
* a `urlPath` value or a page under `apps/web/src/pages/(list-types)/`

**Single source of truth**

Per `CLAUDE.md`, `libs/list-types/common/src/list-type-data.ts` is the single source of truth for list types. Adding one entry there propagates to:

* **Local** — `yarn db:seed` → `apps/postgres/prisma/seed.ts` → `seedListTypes()` (`libs/location/src/seed-list-types.ts`)
* **Deployed (STG)** — `apps/postgres/start.sh` → `apps/postgres/prisma/generate-seed-sql.ts` emits idempotent `INSERT ... ON CONFLICT` SQL for `list_types` and `list_types_sub_jurisdictions`

No hand-written `.sql` file is permitted. There is currently no prod deployment.

**Downstream consumers that pick the list type up automatically**

| Consumer | Mechanism | Code reference |
|---|---|---|
| Manual upload list-type dropdown | `findStrategicListTypes()` — all rows with `isNonStrategic: false`, `deletedAt: null`, ordered by `shortenedFriendlyName` | `libs/system-admin-pages/src/list-type/queries.ts:241` |
| Courtel third-party subscriptions | `findAllListTypes()` renders a checkbox per list type | `apps/web/src/pages/(system-admin)/manage-third-party-subscriptions/index.ts:41` |
| Courtel push on publish | `findSubscribersByListType(listTypeId)`; flat file pushed via `flatFilePath` | `libs/legacy-third-party-fulfilment/src/service.ts:66` |
| Verified user email subscriptions | `prisma.listType.findMany` filtered by the subscribed court's `subJurisdictionId` | `apps/web/src/pages/(verified)/subscription-configure-list/index.ts:34` |
| Summary of publications | `findAllListTypes()` + `filterPublicationsForSummary` | `apps/web/src/pages/(public)/summary-of-publications/index.ts:52` |
| Publication access control | `allowedProvenance` split on `,` for `CLASSIFIED` artefacts | `libs/publication/src/authorisation/service.ts:34` |

## 3. Acceptance Criteria

* **Scenario:** Traffic Virtual Courts List exists as a Crime / Magistrates Court list type
    * **Given** `TRAFFIC_VIRTUAL_COURTS_LIST` has been added to `libs/list-types/common/src/list-type-data.ts` with `subJurisdictionIds: [7]`
    * **When** the seed runs (`yarn db:seed` locally, or the generated seed SQL on deploy)
    * **Then** a row exists in `list_types` with `name = 'TRAFFIC_VIRTUAL_COURTS_LIST'`, `friendly_name = 'Traffic Virtual Courts List'`, `welsh_friendly_name` set to the supplied Welsh name, `deleted_at IS NULL`, and a corresponding row in `list_types_sub_jurisdictions` linking it to `sub_jurisdiction_id = 7` (Magistrates Court, Crime)

* **Scenario:** The list name appears in the manual upload dropdown
    * **Given** a user signed in as System Admin, Internal Admin (CTSC) or Internal Admin (Local)
    * **When** they open `/manual-upload`
    * **Then** the "List type" `<select>` contains an option with the text "Traffic Virtual Courts List", positioned alphabetically by shortened friendly name, and its `value` is the database-assigned `list_types.id`

* **Scenario:** Selecting the list type pre-fills the default sensitivity
    * **Given** the user is on `/manual-upload`
    * **When** they select "Traffic Virtual Courts List" from the list type dropdown
    * **Then** the Sensitivity dropdown is pre-selected to the configured default (`PUBLIC`), driven by the existing `listTypeSensitivityMap` client-side behaviour, and the user can still override it

* **Scenario:** A flat file is uploaded for Poole Magistrates' Court and published
    * **Given** the user is on `/manual-upload` and Poole Magistrates' Court exists as a location with the Magistrates Court sub-jurisdiction
    * **When** they select Poole Magistrates' Court, choose "Traffic Virtual Courts List", attach a PDF under 2MB, set hearing start date, sensitivity, language and display from/to dates, and confirm on `/manual-upload-summary`
    * **Then** the artefact is stored with `isFlatFile = true` and `listTypeId` resolved to the Traffic Virtual Courts List row, and the user reaches `/manual-upload-success`

* **Scenario:** The published flat file is viewable from the court's publication list
    * **Given** a published, in-date Traffic Virtual Courts List artefact for Poole Magistrates' Court
    * **When** any user with access rights for the artefact's sensitivity opens `/summary-of-publications?locationId={pooleId}`
    * **Then** the entry is listed as "Traffic Virtual Courts List {content date} - English", linking to `/hearing-lists/{locationId}/{artefactId}` in a new window, and the flat file renders in the generic flat-file viewer

* **Scenario:** Courtel can be enabled to receive the list
    * **Given** a System Admin on `/manage-third-party-subscriptions?id={courtelUserId}`
    * **When** they view the list-type checkboxes
    * **Then** "Traffic Virtual Courts List" is present as a selectable checkbox; ticking it and submitting persists a `third_party_subscription` row for that `listTypeId`, records an `UPDATE_THIRD_PARTY_SUBSCRIPTIONS` audit entry, and redirects to `/third-party-subscriptions-updated`

* **Scenario:** Courtel receives the flat file on publication
    * **Given** Courtel is subscribed to Traffic Virtual Courts List and `COURTEL_API_URL` / `COURTEL_CERTIFICATE` are configured
    * **When** a Traffic Virtual Courts List flat file is published
    * **Then** `sendThirdPartyPublications` pushes the artefact with its `flatFilePath` and writes a `third_party_push_log` row with type `CREATE` (or `UPDATE` on re-publish)

* **Scenario:** Verified users can subscribe to the list by court
    * **Given** a verified user with an existing court subscription to Poole Magistrates' Court
    * **When** they open `/subscription-configure-list`
    * **Then** "Traffic Virtual Courts List" appears under the "T" group, and under the "R" group with the Welsh friendly name when viewed with `?lng=cy`

* **Scenario:** Welsh friendly name is used throughout when the locale is Welsh
    * **Given** any page that renders a list type name from the database
    * **When** the page is requested with `?lng=cy`
    * **Then** the Welsh friendly name "Rhestr y Llys ar gyfer Achosion Traffig sydd i'w cynnal yn rhithiol" is displayed instead of the English name

* **Scenario:** A JSON upload is rejected for this flat-file-only list type
    * **Given** the user is on `/manual-upload` with "Traffic Virtual Courts List" selected
    * **When** they attach a `.json` file and submit
    * **Then** an error summary is shown containing "Invalid JSON file format. No JSON schema available for Traffic Virtual Courts List. This list type does not support JSON uploads.", the form retains the user's other answers, and nothing is stored

## 4. User Journey Flow

Three distinct journeys are affected. None of them are new — this ticket makes an existing journey work for a new list type.

### 4.1 Journey A — Admin uploads the list (primary)

```
┌──────────────────────┐
│ Sign in (SSO)        │
│ System Admin /       │
│ Internal Admin       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ /admin-dashboard     │
│ "Upload a file"      │
└──────────┬───────────┘
           │
           ▼
┌────────────────────────────────────────────┐
│ /manual-upload                             │
│  • Choose file  (flat file: .pdf/.doc/…)   │
│  • Court: Poole Magistrates' Court         │
│  • List type: Traffic Virtual Courts List  │◄── NEW OPTION
│  • Hearing start date                      │
│  • Sensitivity  (pre-filled: Public)       │◄── from defaultSensitivity
│  • Language: English                       │
│  • Display from / Display to               │
└──────────┬─────────────────────────────────┘
           │ POST (validation)
           │
     ┌─────┴──────┐
     │ errors?    │
     ├── yes ─────┼──► redirect back to /manual-upload
     │            │    with govukErrorSummary + retained answers
     └── no ──────┘
           │
           ▼
┌────────────────────────────────────────────┐
│ /manual-upload-summary?uploadId=…          │
│  Summary list of all answers               │
│  "Confirm" / "Cancel"                      │
└──────────┬─────────────────────────────────┘
           │ Confirm
           ▼
┌────────────────────────────────────────────┐
│ /manual-upload-success                     │
│  govukPanel "Success"                      │
└──────────┬─────────────────────────────────┘
           │ (async)
           ▼
┌────────────────────────────────────────────┐
│ Artefact stored (isFlatFile = true)        │
│ ─► Courtel push if subscribed              │
└────────────────────────────────────────────┘
```

### 4.2 Journey B — System Admin enables Courtel

```
Sign in (System Admin)
        │
        ▼
/system-admin-dashboard
        │  "Manage third party users"
        ▼
/manage-third-party-users ──► select Courtel
        │
        ▼
/manage-third-party-user?id=…
        │  "Manage subscriptions"
        ▼
/manage-third-party-subscriptions?id=…
   ┌──────────────────────────────────────────┐
   │ [ ] Crown Daily List                     │
   │ [ ] Magistrates Public List              │
   │ [x] Traffic Virtual Courts List   ◄── NEW│
   │ …                                        │
   └──────────────────────────────────────────┘
        │  POST → updateThirdPartySubscriptions
        │         + audit log entry
        ▼
/third-party-subscriptions-updated
```

### 4.3 Journey C — Public / verified user views the list

```
/ (landing)
   │  "Find a court or tribunal listing"
   ▼
/search  or  /courts-tribunals-list
   │  Poole Magistrates' Court
   ▼
/summary-of-publications?locationId={pooleId}
   ┌───────────────────────────────────────────────────────────┐
   │ • Traffic Virtual Courts List 15 October 2026 - English   │
   │   (opens in a new window)                                 │
   └───────────────────────────────────────────────────────────┘
   │  isFlatFile = true  →  generic flat-file viewer
   ▼
/hearing-lists/{locationId}/{artefactId}   (target="_blank")
   │
   ▼
Flat file rendered / downloaded
```

Access at each step is gated by `canAccessPublicationMetadata` / `canAccessPublication`:

```
sensitivity = PUBLIC      ──► everyone (no sign-in required)
sensitivity = PRIVATE     ──► verified users only
sensitivity = CLASSIFIED  ──► verified users whose provenance ∈ allowedProvenance
SYSTEM_ADMIN              ──► always
INTERNAL_ADMIN_CTSC/LOCAL ──► metadata only, and only when PUBLIC
```

## 5. Low Fidelity Wireframe

No new page is designed. The wireframes below show the **existing** pages with the new option in place, so the change can be verified visually.

### 5.1 `/manual-upload` — list type dropdown (English only; page has `hideLanguageToggle: true`)

```
┌──────────────────────────────────────────────────────────────────────┐
│ GOV.UK  Court and tribunal hearings                      [Sign out] │
├──────────────────────────────────────────────────────────────────────┤
│ BETA  This is a new service – your feedback will help us improve it. │
├──────────────────────────────────────────────────────────────────────┤
│ ‹ Back                                                               │
│                                                                      │
│  Manual upload                                                       │
│  ═══════════════                                                     │
│                                                                      │
│  Upload a file                                                       │
│  Select a file to upload (max 2MB)                                   │
│  ┌────────────────────────────────┐                                  │
│  │ Choose file │ poole-traffic.pdf│                                  │
│  └────────────────────────────────┘                                  │
│                                                                      │
│  Court name or tribunal name                                         │
│  ┌──────────────────────────────────────────────┐                    │
│  │ Poole Magistrates' Court                   ▾ │                    │
│  └──────────────────────────────────────────────┘                    │
│                                                                      │
│  List type                                                           │
│  ┌──────────────────────────────────────────────┐                    │
│  │ Traffic Virtual Courts List                ▾ │  ◄── NEW OPTION    │
│  └──────────────────────────────────────────────┘                    │
│    ┌──────────────────────────────────────────────┐                  │
│    │ <Please choose a list type>                  │  (expanded)      │
│    │ …                                            │                  │
│    │ SSCS Daily Hearing List                      │                  │
│    │ Traffic Virtual Courts List             ◄────┼── inserted       │
│    │ UT (T and CC) Daily Hearing List             │   alphabetically │
│    │ …                                            │                  │
│    └──────────────────────────────────────────────┘                  │
│                                                                      │
│  Hearing start date                                                  │
│   Day      Month     Year                                            │
│  ┌────┐   ┌────┐   ┌──────┐                                          │
│  │ 15 │   │ 10 │   │ 2026 │                                          │
│  └────┘   └────┘   └──────┘                                          │
│                                                                      │
│  Sensitivity                                                         │
│  ┌──────────────────────────────────────────────┐                    │
│  │ Public                                     ▾ │  ◄── auto-selected │
│  └──────────────────────────────────────────────┘      from default  │
│                                                                      │
│  Language                                                            │
│  ┌──────────────────────────────────────────────┐                    │
│  │ English                                    ▾ │                    │
│  └──────────────────────────────────────────────┘                    │
│                                                                      │
│  Display file from                     Display file to               │
│  ┌────┐ ┌────┐ ┌──────┐                ┌────┐ ┌────┐ ┌──────┐        │
│  │ 15 │ │ 10 │ │ 2026 │                │ 16 │ │ 10 │ │ 2026 │        │
│  └────┘ └────┘ └──────┘                └────┘ └────┘ └──────┘        │
│                                                                      │
│  ┌────────────┐                                                      │
│  │  Continue  │                                                      │
│  └────────────┘                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.2 `/manual-upload` — error state (JSON file chosen for a flat-file list type)

```
┌──────────────────────────────────────────────────────────────────────┐
│ ‹ Back                                                               │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ ██ There is a problem                                          │  │
│  │                                                                │  │
│  │  • Invalid JSON file format. No JSON schema available for      │  │
│  │    Traffic Virtual Courts List. This list type does not        │  │
│  │    support JSON uploads.                            → #file    │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Manual upload                                                       │
│  ═══════════════                                                     │
│                                                                      │
│  Upload a file                                                       │
│  ██ Error: Invalid JSON file format…                                 │
│  ┌────────────────────────────────┐                                  │
│  │ Choose file │ No file chosen   │  (red left border)               │
│  └────────────────────────────────┘                                  │
│  … (all other answers retained)                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.3 `/manage-third-party-subscriptions?id={courtelUserId}`

```
┌──────────────────────────────────────────────────────────────────────┐
│ ‹ Back                                                               │
│                                                                      │
│  Manage third party subscriptions                                    │
│  ════════════════════════════════                                    │
│                                                                      │
│  Select the list types Courtel should receive.                       │
│                                                                      │
│   ┌─┐                                                                │
│   │ │  Crown Daily List                                              │
│   └─┘                                                                │
│   ┌─┐                                                                │
│   │✓│  Magistrates Public List                                       │
│   └─┘                                                                │
│   ┌─┐                                                                │
│   │✓│  Traffic Virtual Courts List             ◄── NEW CHECKBOX      │
│   └─┘                                                                │
│   ┌─┐                                                                │
│   │ │  …                                                             │
│   └─┘                                                                │
│                                                                      │
│  ┌──────────────────┐                                                │
│  │  Save changes    │                                                │
│  └──────────────────┘                                                │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.4 `/summary-of-publications?locationId={pooleId}` — English and Welsh

```
ENGLISH                                    WELSH (?lng=cy)
┌────────────────────────────────┐        ┌────────────────────────────────┐
│ Poole Magistrates' Court       │        │ Llys Ynadon Poole              │
│ ══════════════════════════     │        │ ═══════════════════            │
│                                │        │                                │
│ Select a hearing list.         │        │ [Welsh equivalent]             │
│                                │        │                                │
│ • Traffic Virtual Courts List  │        │ • Rhestr y Llys ar gyfer       │
│   15 October 2026 - English    │        │   Achosion Traffig sydd i'w    │
│   (opens in a new window)      │        │   cynnal yn rhithiol           │
│                                │        │   15 Hydref 2026 - Saesneg     │
│ • Magistrates Public List      │        │   (yn agor mewn ffenestr newydd)│
│   15 October 2026 - English    │        │                                │
│   (opens in a new window)      │        │ • Rhestr Gyhoeddus y Llys …    │
└────────────────────────────────┘        └────────────────────────────────┘
```

### 5.5 `/subscription-configure-list` — verified user, grouped alphabetically

```
ENGLISH — grouped under "T"          WELSH — grouped under "R"
┌──────────────────────────────┐    ┌──────────────────────────────────┐
│ T                            │    │ R                                │
│  ┌─┐                         │    │  ┌─┐                             │
│  │✓│ Traffic Virtual Courts  │    │  │✓│ Rhestr y Llys ar gyfer      │
│  └─┘ List                    │    │  └─┘ Achosion Traffig sydd i'w   │
│                              │    │      cynnal yn rhithiol          │
└──────────────────────────────┘    └──────────────────────────────────┘
```

Note the group letter differs between locales because `buildListTypeGroups` keys on the first character of the **localised** name (`apps/web/src/pages/(verified)/subscription-configure-list/index.ts:9`). This is existing behaviour and is correct.

## 6. Page Specifications

### 6.1 Reference data change (the whole of the code change)

**File:** `libs/list-types/common/src/list-type-data.ts`

Add one entry to the `listTypeData` array. Place it adjacent to the other Crime / Magistrates Court entries for readability — array order does not affect behaviour, as every consumer orders by friendly name.

```typescript
{
  name: "TRAFFIC_VIRTUAL_COURTS_LIST",
  englishFriendlyName: "Traffic Virtual Courts List",
  welshFriendlyName: "Rhestr y Llys ar gyfer Achosion Traffig sydd i'w cynnal yn rhithiol",
  provenance: "CRIME_IDAM,PI_AAD",
  isNonStrategic: false,
  defaultSensitivity: "Public",
  subJurisdictionIds: [7]
}
```

Field-by-field rationale:

| Field | Value | Rationale |
|---|---|---|
| `name` | `TRAFFIC_VIRTUAL_COURTS_LIST` | SCREAMING_SNAKE_CASE, `@unique`, stable across environments. This is the only identifier any code may reference. |
| `englishFriendlyName` | `Traffic Virtual Courts List` | Exactly as supplied in the issue. Drives the dropdown label, summary-of-publications label and third-party checkbox label. |
| `welshFriendlyName` | `Rhestr y Llys ar gyfer Achosion Traffig sydd i'w cynnal yn rhithiol` | Supplied in the issue. Note the apostrophe in `i'w` is escaped by `sqlStr()` in the seed generator (`''`), so no manual escaping is needed. |
| `provenance` | `CRIME_IDAM,PI_AAD` | Matches `MAGISTRATES_PUBLIC_LIST` and `MAGISTRATES_STANDARD_LIST`. Only consulted when an artefact is `CLASSIFIED`; including `PI_AAD` keeps legacy media accounts able to see a classified upload. |
| `urlPath` | **omitted** | Flat-file artefacts route via `/hearing-lists/{locationId}/{artefactId}`, not `urlPath`. `seed-list-types.ts:46` and `generate-seed-sql.ts:132` both coerce an absent `urlPath` to `""`. |
| `isNonStrategic` | `false` | Required for the list type to appear in `findStrategicListTypes()` and therefore in the `/manual-upload` dropdown. `true` would route it to `/non-strategic-upload`, which only accepts `.xlsx`. |
| `defaultSensitivity` | `"Public"` | Pre-fills the Sensitivity dropdown only; the uploader can override. See §14 — needs confirmation from the Crime Service Manager. |
| `shortenedFriendlyName` | **omitted** | Defaults to `englishFriendlyName` in both seed paths. "Traffic Virtual Courts List" is 27 characters, short enough for the dropdown. |
| `subJurisdictionIds` | `[7]` | Magistrates Court, under `jurisdictionId: 3` (Crime) — `libs/location/src/location-data.ts:330`. |

### 6.2 Location prerequisite — Poole Magistrates' Court

`libs/location/src/location-data.ts` currently contains 27 locations (a development subset) and does **not** include Poole Magistrates' Court. Two paths exist, and which one applies depends on how STG locations are populated:

* **If STG locations come from `location-data.ts`** — add an entry:

```typescript
{
  locationId: <next free id>,
  name: "Poole Magistrates' Court",
  welshName: "[TRANSLATE: \"Poole Magistrates' Court\"]",
  regions: [3],              // South West — confirm
  subJurisdictions: [7]      // Magistrates Court
}
```

* **If STG locations come from the reference-data CSV upload** (`/reference-data-upload`, System Admin) — no code change; Poole must simply be present in the uploaded CSV with the Magistrates Court sub-jurisdiction.

Either way the hard requirement is the same: **Poole Magistrates' Court must carry `subJurisdictionId: 7`**, otherwise it will not surface the list type on `/subscription-configure-list` even though manual upload will still work (manual upload does not cross-check location sub-jurisdiction against list type).

### 6.3 Pages touched — behaviour, not markup

| Page | Change | Notes |
|---|---|---|
| `/manual-upload` | New `<option>` in the existing `govukSelect` | Zero code change; `getListTypes()` reads from the DB |
| `/manual-upload-summary` | Displays "Traffic Virtual Courts List" in the summary list | Zero code change |
| `/manual-upload-success` | No change | — |
| `/manage-third-party-subscriptions` | New `govukCheckboxes` item | Zero code change |
| `/summary-of-publications` | New list entry, flat-file branch | Zero code change |
| `/hearing-lists/{locationId}/{artefactId}` | Renders the uploaded flat file | Zero code change |
| `/subscription-configure-list` | New checkbox in alphabetical group | Zero code change |
| `/publication/{id}` | Not reached | Flat files never hit the `501 publication-not-implemented` path |

### 6.4 Explicitly out of scope

* No `libs/list-types/traffic-virtual-courts-list` package
* No `src/schemas/*.json`, no `validate*` wrapper, no validator test
* No `.njk` template, no `apps/web/src/pages/(list-types)/…` directory
* No `PDF_GENERATOR_REGISTRY` entry
* No `registerConverterByName` call
* No `libs/*/src/locales/{en,cy}.ts` entries — the list name comes from `list_types.friendly_name` / `welsh_friendly_name`, not locale files
* No Prisma schema change or migration — `list_types` and `list_types_sub_jurisdictions` already exist
* No hand-written `.sql` file
* Automated publishing on a Wed/Fri (later Mon/Wed/Fri) schedule — publishing is manual by design for this pilot

## 7. Content

All new user-facing content is the list type name itself, stored in the database rather than in `en.ts` / `cy.ts` files. No locale file changes are required for this ticket.

### 7.1 List type name

| Field | Value |
|---|---|
| `friendly_name` (English) | Traffic Virtual Courts List |
| `welsh_friendly_name` (Welsh) | Rhestr y Llys ar gyfer Achosion Traffig sydd i'w cynnal yn rhithiol |
| `shortened_friendly_name` | Traffic Virtual Courts List (defaulted from `friendly_name`) |

The Welsh name was supplied verbatim in the issue and must be used exactly as given — it has been signed off by the requester. Do not substitute a machine translation.

For reference, if the Welsh name had not been supplied it would be requested as: [WELSH TRANSLATION REQUIRED: "Traffic Virtual Courts List"]

### 7.2 Where the name appears, and in which locale

| Surface | English source | Welsh source |
|---|---|---|
| `/manual-upload` list type dropdown | `shortenedFriendlyName` | English only — the controller hardcodes `locale = "en"` and sets `hideLanguageToggle: true` (`apps/web/src/pages/(admin)/manual-upload/index.ts:32,84`) |
| `/manual-upload-summary` | `shortenedFriendlyName` | English only, same reason |
| `/manage-third-party-subscriptions` checkbox | `friendlyName` | `friendlyName` — the checkbox labels come from `findAllListTypes()` and are not localised. Acceptable: System Admin only. |
| Third-party subscription audit log | `friendlyName` | English only (audit records are English by design) |
| `/summary-of-publications` | `friendlyName` | `welshFriendlyName` (`index.ts:69`) |
| `/subscription-configure-list` | `friendlyName` | `welshFriendlyName` (`index.ts:47`) |
| Subscription email notifications | `friendlyName` | `welshFriendlyName` per the subscriber's language preference |

### 7.3 Surrounding content that is reused unchanged

These strings already exist in both languages and need no edits; they are listed so QA knows what to expect around the new option.

| Key | English | Welsh |
|---|---|---|
| Manual upload list type placeholder | `<Please choose a list type>` | [WELSH TRANSLATION REQUIRED: "<Please choose a list type>"] — not required; page is English-only |
| Manual upload sensitivity placeholder | `<Please choose a sensitivity>` | [WELSH TRANSLATION REQUIRED: "<Please choose a sensitivity>"] — not required; page is English-only |
| Summary of publications flat-file suffix | `(opens in a new window)` | [WELSH TRANSLATION REQUIRED: "(opens in a new window)"] |
| Summary of publications language label | `English` | [WELSH TRANSLATION REQUIRED: "English"] |
| Error summary title | `There is a problem` | Mae problem |

### 7.4 Content design notes

* The list name is a proper noun (the official name of the hearing list) and must not be reworded, sentence-cased or abbreviated. "Traffic Virtual Courts List", not "Traffic virtual courts list".
* No hint text, no guidance copy and no phase-banner changes are needed — this option sits in an existing dropdown alongside 40+ peers and needs no special explanation.
* The publication cadence (Wednesdays and Fridays, moving to Mondays, Wednesdays and Fridays from 26 October 2026) is an operational fact for the uploading court. It must **not** be surfaced as on-page content: CaTH shows what has actually been published, and promising a schedule the service cannot enforce would mislead users when an upload is missed.

## 8. URL

**No new routes.** `urlPath` is deliberately omitted from the `listTypeData` entry, so no route is generated and no page directory is created.

The existing routes exercised by this list type:

| Route | Method | Role required | Purpose |
|---|---|---|---|
| `/manual-upload` | GET, POST | `SYSTEM_ADMIN`, `INTERNAL_ADMIN_CTSC`, `INTERNAL_ADMIN_LOCAL` | Upload form (new dropdown option) |
| `/manual-upload-summary?uploadId={id}` | GET, POST | as above | Check answers before publishing |
| `/manual-upload-success` | GET | as above | Confirmation panel |
| `/manage-third-party-subscriptions?id={userId}` | GET, POST | `SYSTEM_ADMIN` | Enable Courtel (new checkbox) |
| `/third-party-subscriptions-updated` | GET | `SYSTEM_ADMIN` | Confirmation |
| `/summary-of-publications?locationId={id}` | GET | Public (filtered by sensitivity) | Court's publication list |
| `/hearing-lists/{locationId}/{artefactId}` | GET | Public (filtered by sensitivity) | Generic flat-file viewer |
| `/subscription-configure-list` | GET, POST | `VERIFIED` | Choose list types to be emailed about |

**Why there is no `/traffic-virtual-courts-list` route:** `summary-of-publications/index.njk:34` tests `publication.isFlatFile` *before* `publication.urlPath`, so even if a `urlPath` were set it would never be used for a flat-file artefact. Adding one would create a dead route and an unreachable 501 page.

Welsh variants of the public routes are reached with `?lng=cy` (or `&lng=cy` where a query string already exists), e.g. `/summary-of-publications?locationId=123&lng=cy`.

## 9. Validation

No new validation logic. `validateManualUploadForm` (`libs/admin-pages/src/manual-upload/validation.ts:193`) applies unchanged. Recorded here so QA can confirm the new list type behaves identically to its peers.

### 9.1 Field rules on `/manual-upload`

| Field | Rule | Source |
|---|---|---|
| `file` | Required | `validateFileUpload` |
| `file` | Max 2 MB (`MAX_FILE_SIZE = 2 * 1024 * 1024`); also enforced by multer, which sets `req.fileUploadError.code = "LIMIT_FILE_SIZE"` | `validation.ts:30,41`; `manual-upload/index.ts:99` |
| `file` | Extension must match `/\.(csv\|doc\|docx\|htm\|html\|json\|pdf)$/i` | `validation.ts:194` |
| `file` | If extension is `.json`, the content is parsed and validated against the list type's schema | `validateJsonFileSchema` |
| `locationId` | Required; must be numeric. If absent but `locationName` is ≥ 3 characters, `courtRequired` is raised; if shorter, `courtTooShort` | `validateLocation` |
| `listType` | Required; non-empty | `validateRequiredFields` |
| `sensitivity` | Required; non-empty | `validateRequiredFields` |
| `language` | Required; non-empty (defaults to `ENGLISH` on first render) | `validateRequiredFields` |
| `hearingStartDate` | Required; day and month must be exactly 2 characters; must parse to a real date | `validateDate` |
| `displayFrom` | Required; same day/month/parse rules | `validateDate` |
| `displayTo` | Required; same day/month/parse rules | `validateDate` |
| `displayTo` vs `displayFrom` | `displayTo` must not be before `displayFrom` | `validateDateRange` |

### 9.2 Flat-file-specific validation behaviour

For this list type the practical file types are `.pdf`, `.doc`, `.docx`, `.htm`, `.html` and `.csv`. All pass straight through with no schema check, because `validateJsonFileSchema` short-circuits on a non-`.json` filename (`validation.ts:53`).

`.json` is accepted by the extension regex but will always fail schema validation for this list type, because no `@hmcts/traffic-virtual-courts-list` package exists. `validateListTypeJson` catches the failed dynamic import and returns a clean, user-facing message rather than a 500 (`libs/list-types/common/src/validation/list-type-validator.ts:97`). This is the intended behaviour for a flat-file-only list type and must be asserted by a test so it does not silently regress into a stack trace.

### 9.3 Data integrity constraints

| Constraint | Enforcement |
|---|---|
| `list_types.name` is unique | Prisma `@unique`; the seed uses `ON CONFLICT (name) DO UPDATE`, so re-running is idempotent and concurrent pods cannot race |
| `list_types_sub_jurisdictions` is unique on `(list_type_id, sub_jurisdiction_id)` | `ON CONFLICT … DO NOTHING`; `list_type_id` is resolved by a `WHERE name = …` subquery, never a literal id |
| Sub-jurisdiction 7 must exist before the link row is inserted | `seedListTypes` throws `No sub-jurisdictions resolved for list type "TRAFFIC_VIRTUAL_COURTS_LIST"` if the filter yields nothing; the generated SQL orders sub-jurisdiction inserts before list-type links |
| Entry must not be soft-deleted | `generateSoftDeleteReconciliationSql` soft-deletes any active row whose name is absent from `listTypeData` — so the entry must remain in the file for as long as the list type is live |

### 9.4 Validation that is *not* required

* No JSON schema validation — there is no schema.
* No numeric `listTypeId` guard in a controller — there is no controller. Per `CLAUDE.md`, `ListType.id` must never be hardcoded anywhere.
* No Excel column validation — `.xlsx` is only accepted on the non-strategic upload route, and `isNonStrategic: false` keeps this list off that route.

## 10. Error Messages

No new error strings. The existing manual upload messages apply. Listed for QA reference with their anchors.

| Trigger | Message (English) | Anchor |
|---|---|---|
| No file attached | Existing `errorMessages.fileRequired` | `#file` |
| File over 2 MB | Existing `errorMessages.fileSize` | `#file` |
| Disallowed extension | Existing `errorMessages.fileType` | `#file` |
| `.json` uploaded for this list type | `Invalid JSON file format. No JSON schema available for Traffic Virtual Courts List. This list type does not support JSON uploads.` | `#file` |
| Malformed `.json` uploaded | `Invalid JSON file format. Please ensure the file contains valid JSON.` | `#file` |
| No court selected | Existing `errorMessages.courtRequired` | `#court` |
| Court name typed but under 3 characters | Existing `errorMessages.courtTooShort` | `#court` |
| No list type selected | Existing `errorMessages.listTypeRequired` | `#listType` |
| No sensitivity selected | Existing `errorMessages.sensitivityRequired` | `#sensitivity` |
| No language selected | Existing `errorMessages.languageRequired` | `#language` |
| Hearing start date missing | Existing `errorMessages.hearingStartDateRequired` | `#hearingStartDate` |
| Hearing start date invalid | Existing `errorMessages.hearingStartDateInvalid` | `#hearingStartDate` |
| Display from missing / invalid | Existing `errorMessages.displayFromRequired` / `…Invalid` | `#displayFrom` |
| Display to missing / invalid | Existing `errorMessages.displayToRequired` / `…Invalid` | `#displayTo` |
| Display to before display from | Existing `errorMessages.displayToBeforeFrom` | `#displayTo` |

Two messages produced by `validateJsonFileSchema` are hardcoded English in `libs/admin-pages/src/manual-upload/validation.ts:72,78`. That is a pre-existing gap and is acceptable here because `/manual-upload` is English-only by design (`hideLanguageToggle: true`). **Do not "fix" it as part of this ticket** — it would widen the change for no user benefit. Raise it separately if the manual upload journey is ever made bilingual.

Error display follows the standard GOV.UK pattern already implemented on the page:

* `govukErrorSummary` with title "There is a problem", rendered above the `h1`
* Each entry links to its field via `href`
* Field-level `errorMessage` rendered by the GOV.UK macro with `aria-describedby` and `aria-invalid="true"`
* All answers other than the file are retained via `req.session.manualUploadForm`

### 10.1 Operational failure modes (no user-facing message)

| Failure | Behaviour | Where |
|---|---|---|
| `COURTEL_API_URL` or `COURTEL_CERTIFICATE` unset | Push skipped; `console.error` "Third-party push skipped" | `legacy-third-party-fulfilment/src/service.ts:31-41` |
| Courtel not subscribed to this list type | Push skipped; `console.info` "no subscribers for listTypeId" | `service.ts:66` |
| Courtel push fails after retries | `third_party_push_log` row written with `status = 'FAILED'` and the HTTP status code; the publication itself still succeeds | `service.ts:76` |

The upload journey must not fail because Courtel is unreachable — the publication is the primary outcome and third-party distribution is fire-and-forget. This is existing behaviour and should be confirmed, not changed.

## 11. Navigation

No navigation changes. No new entries in the admin dashboard, the system-admin dashboard, the primary header or the footer.

### 11.1 Redirect logic already in play

| From | Condition | To |
|---|---|---|
| `POST /manual-upload` | Validation errors | `302 → /manual-upload` (errors + answers in session) |
| `POST /manual-upload` | Valid | `302 → /manual-upload-summary?uploadId={id}` |
| `POST /manual-upload-summary` | Confirmed | `302 → /manual-upload-success` |
| `GET /manual-upload` | Any admin role | Renders; clears `uploadConfirmed`, `successPageViewed`, `viewedLanguage` |
| `GET /manual-upload` | Wrong role | Blocked by `requireRole([SYSTEM_ADMIN, INTERNAL_ADMIN_CTSC, INTERNAL_ADMIN_LOCAL])` |
| `GET /manage-third-party-subscriptions` | No `id` query param | `302 → /manage-third-party-users` |
| `POST /manage-third-party-subscriptions` | Saved | `302 → /third-party-subscriptions-updated` |
| `GET /publication/{id}` | Reached for a list type without a page | `501` + `publication-not-implemented` — **not reachable for flat files** |

### 11.2 Links into the flat-file viewer

From `/summary-of-publications`, the flat-file branch renders:

```njk
<a href="/hearing-lists/{{ publication.locationId }}/{{ publication.id }}"
   class="govuk-link" target="_blank" rel="noopener noreferrer">
  {{ publication.displayName }} - {{ publication.languageLabel }}
</a>
<span> (opens in a new window)</span>
```

`target="_blank"` with `rel="noopener noreferrer"` and a visible "(opens in a new window)" warning is the established pattern for flat files in this service. It is retained unchanged.

### 11.3 Deduplication and ordering

`summary-of-publications` deduplicates on `listTypeId-contentDate-language` and keeps the most recent artefact, then sorts by localised list name, then content date descending, then language. A Wednesday and a Friday publication have different content dates, so both appear. Re-uploading for the same date replaces the earlier entry in the displayed list. No `IAC_ORDER`-style special-casing is needed for this list type.

## 12. Accessibility

WCAG 2.2 AA applies. No new markup is introduced, so the accessibility surface is confined to the new option text and — importantly — the **content of the uploaded flat file**, which CaTH cannot remediate.

### 12.1 New option — nothing extra required

| Surface | Component | Accessibility position |
|---|---|---|
| `/manual-upload` list type | `govukSelect` | Native `<option>` inside a labelled `<select>`; announced by screen readers as part of the existing listbox. No ARIA needed. |
| `/manage-third-party-subscriptions` | `govukCheckboxes` | Native `<input type="checkbox">` with an associated `<label>`; keyboard-operable with Space. No ARIA needed. |
| `/subscription-configure-list` | `govukCheckboxes` grouped by letter | Group headings are real headings, so the new entry inherits correct document structure. |
| `/summary-of-publications` | `govuk-link` in a `govuk-list` | Link text is the full publication name, unique per row, and meaningful out of context. |

No `aria-label`, `aria-describedby` or `role` attribute should be added. Overriding accessible names on native controls is a regression, not an improvement.

### 12.2 Specific criteria to verify

| Criterion | How it is met |
|---|---|
| 1.3.1 Info and Relationships | List type `<option>` sits within the labelled `<select>`; checkbox labels are `for`-associated |
| 2.1.1 Keyboard | Dropdown selectable with arrow keys and type-ahead; checkboxes with Tab + Space |
| 2.4.4 Link Purpose (In Context) | Link text is "Traffic Virtual Courts List {date} - English" — self-describing |
| 2.4.6 Headings and Labels | Existing "List type" label unchanged |
| 2.4.7 Focus Visible | GOV.UK yellow focus state, inherited |
| 2.5.8 Target Size (Minimum) | GOV.UK checkbox and select targets already exceed 24×24 CSS px |
| 3.2.2 On Input | Selecting the list type changes only the Sensitivity dropdown value — a same-page value change, not a context change. It does not move focus or submit the form. |
| 3.3.1 Error Identification | `govukErrorSummary` with field links; `aria-invalid` on the field |
| 3.3.2 Labels or Instructions | Existing labels; no new hint text needed |
| 4.1.2 Name, Role, Value | Native elements throughout |
| 1.4.3 Contrast | No new colours |

### 12.3 Progressive enhancement

The sensitivity pre-fill is JavaScript-driven via `listTypeSensitivityMap`. With JavaScript disabled the Sensitivity dropdown simply stays on `<Please choose a sensitivity>` and the user selects it manually; validation still catches an empty value server-side. Core functionality is unaffected — no change needed, but do not make the pre-fill a hard dependency.

### 12.4 The real accessibility risk: the uploaded file

This is the one accessibility issue worth escalating, and it is not fixable in code.

Flat-file publications are served to the user as-is. A scanned or image-only PDF, a PDF without tagged structure, or an HTML file with presentational tables will be inaccessible to screen reader users, and CaTH will not detect it. The flat-file viewer cannot remediate the document.

Actions:

* The pilot court at Poole must be told, before go-live, that the uploaded file must itself meet WCAG 2.2 AA — tagged PDF with a correct reading order and real table headers, or accessible HTML. A scanned image of a printed list is not acceptable.
* This constraint is identical for every existing flat-file list type in CaTH, so it is a pilot onboarding action, not a new defect. It should be recorded against the pilot rather than this ticket.
* Do not add an on-page accessibility disclaimer as part of this ticket — that would be a service-wide content decision affecting all flat-file list types and belongs in its own ticket.

### 12.5 Automated checks

Axe checks run inline within the existing Playwright journeys (`e2e-tests/tests/admin/manual-upload.spec.ts` already calls `axeCheck`). Adding this list type must not introduce new violations. Note that `target-size` and `link-name` are currently disabled in the manual upload spec for pre-existing site-wide footer issues; do not widen those exclusions.

## 13. Test Scenarios

Scale the testing to the change. This is a one-entry reference-data addition — a handful of targeted assertions plus manual verification is proportionate. Do not add a validator test file, a template test file, or a new E2E spec; per the E2E guidance, journeys already covered must not be duplicated per list type.

### 13.1 Unit tests (Vitest)

**`libs/list-types/common/src/list-type-data.test.ts`** — add if a suitable file exists, otherwise add these assertions to the nearest existing data test rather than creating a file for one entry.

* Should include a `TRAFFIC_VIRTUAL_COURTS_LIST` entry whose `englishFriendlyName` is exactly "Traffic Virtual Courts List" and whose `welshFriendlyName` is exactly the supplied Welsh string
* Should mark `TRAFFIC_VIRTUAL_COURTS_LIST` as strategic (`isNonStrategic: false`) so it reaches the manual upload dropdown rather than the non-strategic `.xlsx` route
* Should link `TRAFFIC_VIRTUAL_COURTS_LIST` to sub-jurisdiction 7 only, confirming Crime / Magistrates Court placement
* Should omit `urlPath` for `TRAFFIC_VIRTUAL_COURTS_LIST`, since flat-file artefacts route through the generic viewer
* Should keep every `listTypeData` `name` unique — a guard that would catch a copy-paste duplicate of an existing entry

**`apps/postgres/prisma/generate-seed-sql.test.ts`** (if present; otherwise verify manually per §13.4)

* Should emit an `INSERT ... ON CONFLICT (name) DO UPDATE` row for `TRAFFIC_VIRTUAL_COURTS_LIST` with `deleted_at = NULL`
* Should escape the apostrophe in the Welsh name to `''` so the generated SQL parses
* Should emit a `list_types_sub_jurisdictions` insert that resolves `list_type_id` by a `WHERE name = 'TRAFFIC_VIRTUAL_COURTS_LIST'` subquery rather than a literal id
* Should not soft-delete `TRAFFIC_VIRTUAL_COURTS_LIST`, since its name is present in `listTypeData`

**`libs/admin-pages/src/manual-upload/validation.test.ts`** — extend the existing suite

* Should accept a `.pdf` upload for a flat-file-only list type without attempting schema validation
* Should return the "No JSON schema available for …" error, not throw, when a `.json` file is uploaded for a list type that has no validator package

### 13.2 Controller tests (Vitest)

**`apps/web/src/pages/(admin)/manual-upload/index.test.ts`** — the existing suite already mocks `findStrategicListTypes`. Confirm rather than duplicate:

* Should render every strategic list type returned by the query as a dropdown option, using `shortenedFriendlyName` in preference to `friendlyName` and `name`
* Should include the list type's `defaultSensitivity`, uppercased, in `listTypeSensitivityMap` so the client-side pre-fill works for a newly added list type

These are list-type-agnostic assertions. If they already exist, no change is needed — say so in the PR rather than adding near-identical tests keyed to this list type's name.

### 13.3 E2E (Playwright) — extend, do not add

No new spec file. `e2e-tests/tests/admin/manual-upload.spec.ts` already covers the full upload journey with validation, summary, success and inline Axe checks, and `e2e-tests/tests/flat-file-viewing.spec.ts` covers the flat-file viewer. The only justified addition is a single assertion inside the existing manual upload journey:

* Should offer "Traffic Virtual Courts List" as an option in the list type dropdown

Note that `manual-upload.spec.ts` is currently `test.describe.skip`. Re-enabling it is out of scope for this ticket; flag the skip in the PR so the team knows the assertion is not yet running in CI, and verify the behaviour manually per §13.4.

If an E2E test does exercise the new list type end to end, it must use a dynamically created test location (`createUniqueTestLocation`) rather than the real Poole record, and must resolve the list type by visible name — never by a numeric id.

### 13.4 Manual verification (required — this is where the real confidence comes from)

Because most of the behaviour is data-driven and the E2E suite for manual upload is skipped, these steps are the primary evidence for the ACs.

**Local**

1. Run `yarn db:seed`, then confirm via `yarn db:studio` that `list_types` has a `TRAFFIC_VIRTUAL_COURTS_LIST` row with both friendly names, `is_non_strategic = false`, `default_sensitivity = 'Public'`, `url = ''`, `deleted_at IS NULL`, and one `list_types_sub_jurisdictions` row for sub-jurisdiction 7
2. Run `yarn db:seed` a second time and confirm no error and no duplicate row — proves idempotency
3. Run `tsx apps/postgres/prisma/generate-seed-sql.ts` and inspect the output for the new list type, the escaped apostrophe, and the absence of the new name from the soft-delete `NOT IN` exclusion
4. Open `/manual-upload` as System Admin and confirm the option is present and alphabetically placed
5. Select the option and confirm Sensitivity pre-fills to Public
6. Upload a small PDF against Poole (or a test location), complete the journey, and confirm `/manual-upload-success`
7. Open `/summary-of-publications?locationId={id}` and confirm the entry links to `/hearing-lists/{locationId}/{artefactId}` and the PDF renders
8. Repeat step 7 with `?lng=cy` and confirm the Welsh friendly name is shown
9. Attempt a `.json` upload for the list type and confirm the "No JSON schema available…" error summary rather than a 500
10. Open `/manage-third-party-subscriptions?id={courtelUserId}`, tick the new list type, save, and confirm the redirect and the persisted subscription
11. As a verified user subscribed to Poole, open `/subscription-configure-list` and confirm the list type appears; repeat with `?lng=cy`

**STG (post-deploy)**

12. Confirm the postgres deploy pod ran the generated seed SQL cleanly with no `P2002` unique-constraint errors
13. Confirm Poole Magistrates' Court exists with the Magistrates Court sub-jurisdiction — if it does not, the location prerequisite in §6.2 has not been met
14. Confirm the list type appears in the `/manual-upload` dropdown and in the Courtel subscription checkboxes on STG
15. With Courtel subscribed, publish a test flat file and confirm a `third_party_push_log` row with `type = 'CREATE'` and `status = 'SUCCESS'`; on failure capture the `status_code` for the Courtel team

### 13.5 Regression checks

* Run `yarn test` from the root — the `libs/list-types/common` validator guard test must still pass (it will, since no schema directory is added)
* Confirm the total option count in the `/manual-upload` dropdown increases by exactly one and no existing option is displaced or renamed
* Confirm no existing list type gets soft-deleted by the reconciliation SQL as a side effect of editing `list-type-data.ts`
* Run `yarn lint:fix` and `yarn format`

## 14. Assumptions & Open Questions

### 14.1 Blocking — answer before merging

* **`defaultSensitivity` is unspecified in the issue.** This spec assumes `"Public"`. The two existing magistrates list types disagree: `MAGISTRATES_PUBLIC_LIST` is `Public` and `MAGISTRATES_STANDARD_LIST` is `Classified`. This is not a cosmetic choice — it sets the default sensitivity the uploading court will accept without thinking, and sensitivity directly controls who can read the list (`canAccessPublication`). If the flat file contains defendant addresses or dates of birth, `Public` would expose them to the open internet. **Confirm with the Crime Service Manager what the Traffic Virtual Courts List flat file actually contains before this ships.** If it carries personal data beyond name and case reference, change the value to `"Classified"`.

* **Poole Magistrates' Court is asserted to be "already available in CaTH", but it is not in `libs/location/src/location-data.ts`** (which holds 27 locations — clearly a development subset). Either it is present on STG via the reference-data CSV upload, or the claim is wrong. Two things need confirming: (a) that the location exists on STG, and (b) that it carries `subJurisdictionId: 7` (Magistrates Court). Without (b) the list type will not appear on `/subscription-configure-list` for Poole subscribers, even though manual upload will still work — manual upload does not cross-check the location's sub-jurisdiction against the chosen list type. If the location is missing, §6.2 gives the code change.

### 14.2 Non-blocking — proceed on these assumptions, correct if wrong

* **The flat file is the only delivery format.** The issue states "flat file", so no JSON schema, PDF generator, Excel converter or rendered `.njk` view is built. If the pilot later moves to JSON publishing, that is a substantially larger ticket: a new `libs/list-types/traffic-virtual-courts-list` package with a schema, a `validate*` wrapper, a validator test file, a template, locale files, a PDF generator registration and an Excel converter registration.
* **`provenance` is `"CRIME_IDAM,PI_AAD"`**, matching the other magistrates list types. This only matters for `Classified` artefacts. If `defaultSensitivity` is confirmed as `Public`, the value is effectively inert — but it should still be correct for the case where an uploader selects `Classified` manually.
* **`shortenedFriendlyName` is omitted** and therefore defaults to the full English name. At 27 characters it fits the dropdown comfortably.
* **The Welsh name is used verbatim as supplied.** It has been provided by the requester and is treated as signed off. No `[WELSH TRANSLATION REQUIRED]` placeholder is used.
* **English-only manual upload is accepted.** `/manual-upload` hardcodes `locale = "en"` and `hideLanguageToggle: true`. The Welsh name will not appear there. This is pre-existing and correct for an internal admin tool.
* **Courtel enablement is a runtime configuration action, not code.** Once the list type row exists it appears automatically in the `/manage-third-party-subscriptions` checkbox list. AC3 ("Courtel is enabled to receive the list") therefore requires a System Admin to tick the box on each environment after deploy. **This step must be in the release notes or it will be missed** — the code change alone does not satisfy AC3.
* **Courtel needs advance notice.** They should be told the new list type is coming and confirm they can ingest it, before the box is ticked. A push to an unprepared recipient produces `FAILED` rows in `third_party_push_log` with no user-visible symptom.
* **No prod deployment exists.** Per `CLAUDE.md`, the seed covers local and STG only. Do not add prod-specific branching to `generate-seed-sql.ts` pre-emptively.
* **The publication cadence is operational, not enforced.** CaTH has no scheduling or "expected publication" feature for manual uploads. The Wednesday/Friday (later Monday/Wednesday/Friday) rhythm is entirely dependent on the court uploading. Nothing in CaTH will detect or alert on a missed upload, and no such feature is in scope.
* **The 26 October 2026 cadence change requires no code.** It is purely a change in how often the court uploads. No ticket, migration or configuration change is needed on that date.

### 14.3 Concerns worth raising with the requester

* **"The list is created in CaTH" is a weaker guarantee than it sounds.** Creating the list type makes it *uploadable and distributable*. It does not make the published content accessible, correctly redacted, or reliably published. Those depend on the court's file and process. The pilot should be onboarded with explicit guidance on both the accessibility of the uploaded document (§12.4) and the sensitivity to select.
* **No E2E coverage will actually run.** `e2e-tests/tests/admin/manual-upload.spec.ts` is currently `test.describe.skip`, so the one E2E assertion this ticket would add is dead code until that skip is lifted. Manual verification (§13.4) is doing the real work. This is a pre-existing gap, not caused by this ticket, but it means "tests pass" is not evidence that the upload journey works — say so honestly in the PR.
* **Ambiguity in the list name is a real risk for users.** "Traffic Virtual Courts List" does not say which court or which days it covers. Someone browsing Poole's publications sees the list name and a date only. If the pilot later runs at more than one court, or alongside a non-virtual traffic list, the name will not distinguish them. Worth confirming the name is final before it is baked into a `@unique` database column, because renaming later means either a new `name` (leaving the old row to be soft-deleted, orphaning its artefacts' `listTypeId`) or a data migration.



### Comment by OgechiOkelu on 2026-09-30T11:54:28Z
@plan 

### Comment by hmctsclaudecode on 2026-09-30T11:59:50Z
## Plan ready — 4 questions before this can be implemented

Technical plan committed to `docs/tickets/1106/` on branch [`feature/1106-traffic-virtual-courts-list`](https://github.com/hmcts/cath-service/tree/feature/1106-traffic-virtual-courts-list/docs/tickets/1106).

**Scope:** this is a one-entry reference-data addition to `libs/list-types/common/src/list-type-data.ts`. Because the route is manual upload and the file type is flat file, there is no new lib package, no JSON schema, no validator, no PDF generator, no Excel converter and no rendered view. The `/manual-upload` dropdown, the Courtel subscription checkboxes, summary-of-publications, the flat-file viewer and verified-user subscriptions all read list types from the database, so they pick the new entry up with zero code change.

### Blocking questions

**1. What sensitivity should this list default to?**

The issue does not say, and the two existing magistrates list types disagree — `MAGISTRATES_PUBLIC_LIST` is `Public`, `MAGISTRATES_STANDARD_LIST` is `Classified`. The plan currently assumes `Public`.

This is not cosmetic. Sensitivity controls who can read the list, and the default is what the uploading court will accept without thinking about it. **What does the Traffic Virtual Courts List flat file actually contain?** If it carries personal data beyond name and case reference — defendant addresses, dates of birth — then `Public` publishes that to the open internet and the value must be `Classified` instead.

**2. Does Poole Magistrates' Court exist on STG with the Magistrates Court sub-jurisdiction?**

The issue says Poole is "already available in CaTH", but it is not in `libs/location/src/location-data.ts` (which holds a 27-location development subset). So either it is present on STG via the reference-data CSV upload, or the claim is wrong.

Two things need confirming: (a) the location exists on STG, and (b) it carries `subJurisdictionId: 7` (Magistrates Court). Without (b), Poole subscribers will never see this list type on `/subscription-configure-list` — and the failure is silent, because manual upload does not cross-check the location's sub-jurisdiction against the chosen list type. Manual upload would appear to work fine while subscriptions quietly did not.

**3. Has Courtel been given advance notice, and can they ingest this list?**

AC3 ("Courtel is enabled to receive the list") **cannot be satisfied by code**. The checkbox appears automatically once the list type row exists, but a System Admin has to tick it on each environment after deploy. That step needs to be in the release notes or it will be missed and the ticket will close with Courtel receiving nothing.

Separately, pushing to an unprepared recipient produces `FAILED` rows in `third_party_push_log` with no user-visible symptom — nobody would notice for weeks. Courtel should confirm readiness before the box is ticked.

**4. Is "Traffic Virtual Courts List" the final name?**

The name goes into a `@unique` database column. Renaming it later means either a new row (leaving the old one to be soft-deleted, orphaning its artefacts' `listTypeId`) or a data migration.

Worth a sanity check on the name itself: it does not identify the court or the days it covers. Someone browsing Poole's publications sees the list name and a date only. If the pilot extends beyond Poole, or ever runs alongside a non-virtual traffic list, the name will not distinguish them.

### Assumptions we will proceed on unless corrected

- The Welsh name is used **verbatim** as supplied in the issue and treated as signed off.
- `urlPath` is deliberately **omitted** — flat-file artefacts route via `/hearing-lists/{locationId}/{artefactId}`, so a `urlPath` would be a dead route.
- `provenance` is `CRIME_IDAM,PI_AAD`, matching both existing magistrates list types.
- `/manual-upload` is English-only by design (`hideLanguageToggle: true`), so the Welsh name will not appear there. Pre-existing and correct for an internal admin tool.
- The publication cadence is **operational and unenforced**. CaTH has no scheduling or expected-publication feature, so nothing will detect or alert on a missed Wednesday or Friday upload. The 26 October 2026 move to Mondays, Wednesdays and Fridays needs no code change at all.

### Two things worth flagging honestly

- **The E2E coverage will not run.** `e2e-tests/tests/admin/manual-upload.spec.ts` is currently `test.describe.skip(...)`, so a dropdown assertion added there is dead code until that skip is lifted. Re-enabling it is out of scope here, which means manual verification is doing the real work — "tests pass" will not be evidence that the upload journey works.
- **"The list is created in CaTH" is a weaker guarantee than it sounds.** Creating the list type makes it uploadable and distributable. It does not make the published content accessible or correctly redacted — flat files are served as-is, and a scanned or untagged PDF will be unusable for screen reader users with CaTH unable to detect it. Poole should be onboarded with explicit guidance on both document accessibility and which sensitivity to select. That is a pilot action, not a defect in this ticket.


---
