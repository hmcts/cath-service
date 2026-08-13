# #809: Revenue List (ChD) daily cause list

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** enhancement, type:story, epic:public-journey
**Created:** 2026-07-01T18:16:25Z
**Updated:** 2026-08-13T10:12:42Z

## Description

PROBLEM STATEMENT

This ticket covers the non-strategic publishing of The Revenue List (ChD) daily cause list (through the upload of excel files in CaTH) which would require the creation of validation schema and style guides.

AS A Service

I WANT to create the validation schema and style guides for Revenue List (ChD) daily cause list

SO THAT the Revenue List (ChD) daily cause list can be published in CaTH

ACCEPTANCE CRITERIA

The Revenue List (ChD) daily cause list is created under the Business and Property Courts Rolls Building in CaTH
The following data fields are created in the listed order in the validation schema for the Revenue List (ChD) daily cause list (Judge, Time, Venue Type, Case Number, Case Name and Additional Information)
The Revenue List (ChD) daily cause list is published through the Excel upload route in CaTH. It is uploaded as an excel template
The validation schema and style guide for the Revenue List (ChD) daily cause list is created.
A PDF downloadable version of the hearing list is created.

## Comments

### Comment by OgechiOkelu on 2026-08-12T15:33:41Z

@spec

### Comment by hmctsclaudecode on 2026-08-12T15:43:59Z

# Technical Specification: Revenue List (ChD) Daily Cause List (#809)

## 1. User Story

**As a** CTSC administrator publishing Chancery Division hearing lists
**I want to** upload the Revenue List (ChD) daily cause list as an Excel file in CaTH, and have it validated, published, viewable and downloadable as PDF and Excel
**So that** members of the public, media and legal professionals can find Revenue List (ChD) hearings listed at the Business and Property Courts Rolls Building in English or Welsh

## 2. Background

This is a **non-strategic** list type: there is no upstream system integration. A CTSC admin uploads a `.xlsx` file on `/non-strategic-upload`, the converter turns each spreadsheet row into a JSON object, the JSON is validated against a schema, stored as an artefact, rendered as an HTML page, and rendered to PDF and Excel for download.

The Revenue List (ChD) is the **second** list type to use the shared Chancery Division / King's Bench "flat hearing row" shape. The first, `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` (#803), was deliberately refactored so that its schema, model type, renderer, Excel field config and email-summary builder live in `libs/list-types/chd-kb-common/` — the package's own source comments state it is "shared with future list types using the same schema". The Revenue List is exactly that list type, so the work here is a **thin wrapper package plus registrations**, not a new schema.

Existing code this builds on:

| Concern | Existing asset to reuse |
|---|---|
| JSON schema (7 fields) | `libs/list-types/chd-kb-common/src/schemas/chd-kb-common.json` |
| Validator | `validateChdKbListType` (`chd-kb-common/src/validation/json-validator.ts`) |
| Model type | `ChdKbHearing` / `ChdKbHearingList` (`chd-kb-common/src/models/types.ts`) |
| Excel column definitions | `CHD_KB_EXCEL_CONFIG` (`chd-kb-common/src/conversion/chd-kb-excel-config.ts`) |
| Renderer | `renderChdKbHearingList` (`chd-kb-common/src/rendering/renderer.ts`) |
| Email summary | `extractCaseSummary` / `formatCaseSummaryForEmail` (`chd-kb-common/src/email-summary/summary-builder.ts`) |
| Page handler | `createSimpleListTypeHandler` (`apps/web/src/pages/(list-types)/list-type-handler.ts`) |
| PDF plumbing | `savePdfToStorage`, `configureNunjucks`, `PDF_BASE_STYLES`, `loadTranslations` (`@hmcts/list-types-common`) |
| Download route helpers | `handleBlobDownload`, `getAvailableFiles` (`apps/web/src/pages/(list-types)/sjp-download-shared.ts`) |
| Reference-data source of truth | `libs/list-types/common/src/list-type-data.ts`, `libs/location/src/location-data.ts` |

The venue ("Business and Property Courts Rolls Building", `locationId: 26`, `regions: [11]` Royal Courts of Justice Group, `subJurisdictions: [10]` High Court) **already exists** in `libs/location/src/location-data.ts` — it was added by #803. No new location is needed.

Reference for copy and layout: the legacy `hmcts/pip-frontend` service's Revenue (ChD) daily cause list view and its `src/main/resources/locales/{en,cy}/revenue-chd-daily-cause-list.json`. The Welsh page title is already catalogued: "Revenue (Chancery Division) Daily Cause List" → "Rhestr Achosion Dyddiol Refeniw (Adran Siawnsri)".

## 3. Acceptance Criteria

* **Scenario:** List type is available for upload under the Rolls Building
    * **Given** I am signed in as a CTSC admin on `/non-strategic-upload`
    * **When** I enter "Business and Property Courts Rolls Building" in the court field and open the "List type" select
    * **Then** "Revenue List (ChD) Daily Cause List" appears in the list, and its sensitivity defaults to "Public"

* **Scenario:** Valid Excel file is accepted and published
    * **Given** I have an `.xlsx` file whose first sheet has a header row `Judge | Time | Venue | Type | Case Number | Case Name | Additional Information` and at least one data row
    * **When** I upload it against the Revenue List (ChD) Daily Cause List with a hearing start date, sensitivity "Public", language "English", and display-from/display-to dates, and confirm on the summary page
    * **Then** the rows are converted to a JSON array of objects with keys `judge, time, venue, type, caseNumber, caseName, additionalInformation` in that order, the artefact is stored, and I see the upload confirmation

* **Scenario:** Published list is viewable by the public
    * **Given** a published Revenue List (ChD) artefact for the Rolls Building whose display window includes today
    * **When** I open the Rolls Building's summary of publications and select the Revenue List (ChD) entry
    * **Then** I am taken to `/revenue-chd-daily-cause-list?artefactId=<uuid>` and see the list title, venue name and address, "List for <date>", "Last updated <date> at <time>", the important-information details section, a case search box, and one table row per hearing with the seven columns in the specified order

* **Scenario:** Welsh version renders fully
    * **Given** I am viewing a published Revenue List (ChD)
    * **When** I switch the language to Welsh (`?lng=cy`)
    * **Then** the page title, venue label, table headers, important information, data source and back-to-top link are all in Welsh, with no English fallback text

* **Scenario:** PDF and Excel downloads are available
    * **Given** a published Revenue List (ChD) artefact
    * **When** the publication is processed
    * **Then** a PDF (`<artefactId>.pdf`) and an Excel workbook (`<artefactId>.xlsx`) are generated into the publications blob container, and the list page shows a download link for each with its file size

* **Scenario:** Invalid Excel file is rejected with a specific message
    * **Given** an `.xlsx` file that is missing the `Case Number` column, or has an empty `Judge` cell, or has `Time` = "quarter past nine", or contains `<b>` in a cell
    * **When** I upload it against the Revenue List (ChD) Daily Cause List
    * **Then** the upload fails with an error naming the offending column and, where applicable, the row number, and nothing is published

* **Scenario:** Wrong list type cannot be rendered by this page
    * **Given** an artefact whose `listTypeName` is not `REVENUE_CHD_DAILY_CAUSE_LIST`
    * **When** its `artefactId` is passed to `/revenue-chd-daily-cause-list`
    * **Then** the response is HTTP 400 with the common error page, and no list data is rendered

## 4. User Journey Flow

**Publishing journey (CTSC admin)**

```
        ┌──────────────────────┐
        │   /admin-dashboard   │
        └──────────┬───────────┘
                   │ "Manually upload an Excel file"
                   ▼
        ┌────────────────────────────────────────┐
        │  /non-strategic-upload                 │
        │  • choose .xlsx (max 2MB)              │
        │  • court: Business and Property Courts │
        │           Rolls Building               │
        │  • list type: Revenue List (ChD) …     │
        │  • hearing start date                  │
        │  • sensitivity (defaults Public)       │
        │  • language, display from / to         │
        └──────────┬─────────────────────────────┘
                   │ Continue
                   ▼
        ┌────────────────────────────────────────┐
        │  /non-strategic-upload-summary         │
        │  • check answers, Confirm               │
        └──────────┬─────────────────────────────┘
                   │ Excel → JSON (converter registered
                   │ under REVENUE_CHD_DAILY_CAUSE_LIST)
                   │ → schema validation → artefact stored
                   │ → PDF generated → Excel generated
                   │ → subscription emails sent
                   ▼
        ┌────────────────────────────────────────┐
        │  upload confirmation                   │
        └────────────────────────────────────────┘
                   │
        (validation failure at any step returns to
         the upload page with an error summary)
```

**Viewing journey (public / media / legal professional)**

```
  /  →  find a court or tribunal  →  Business and Property Courts Rolls Building
                                              │
                                              ▼
                              /summary-of-publications?locationId=26
                                              │ "Revenue (Chancery Division)
                                              │  Daily Cause List <date>"
                                              ▼
                     /revenue-chd-daily-cause-list?artefactId=<uuid>
                          │                    │                  │
                   search cases          download PDF       download Excel
                   (client-side          /revenue-chd-…/download?artefactId=…&type=pdf
                    table filter)        /revenue-chd-…/download?artefactId=…&type=xlsx
```

## 5. Low Fidelity Wireframe

**Public list page — `/revenue-chd-daily-cause-list?artefactId=<uuid>`**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK  Court and tribunal hearings                        English | Cymraeg │
├──────────────────────────────────────────────────────────────────────────────┤
│ BETA  This is a new service – your feedback will help us improve it          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Revenue (Chancery Division) Daily Cause List            <h1 govuk-heading-l>│
│                                                                              │
│  Find contact details and other information about courts and tribunals       │
│  in England and Wales, and some non-devolved tribunals in Scotland.          │
│                                                                              │
│  Rolls Building                                                     (bold)   │
│  Fetter Lane, London                                                         │
│  EC4A 1NL                                                                    │
│                                                                              │
│  List for 12 August 2026                                            (bold)   │
│  Last updated 12 August 2026 at 9:30am                                       │
│                                                                              │
│  ▼ Important information                          <govukDetails open="true"> │
│    Remote hearings before a Judge of the Chancery Division                    │
│    If a representative of the media or member of the public wishes to        │
│    attend the hearing they should contact the listing office                 │
│    chanceryjudgeslisting@justice.gov.uk who will put them in touch with      │
│    the relevant person.                                                      │
│                                                                              │
│  Save this list                                              <h2 heading-s>  │
│  Download a PDF version of this list (48.2KB) to your device                  │
│                                                                              │
│  Search Cases                                                <h2 heading-s>  │
│  ┌────────────────────────────────────────────┐   (visually hidden label:    │
│  │                                            │    "Search by case number,   │
│  └────────────────────────────────────────────┘    name, venue, judge,       │
│                                                    type, or other            │
│                                                    information")             │
│                                                                              │
│  ┌────────┬───────┬────────────┬─────────┬────────────┬──────────┬─────────┐│
│  │ Judge  │ Time  │ Venue      │ Type    │ Case number│ Case name│ Addit.  ││
│  │        │       │            │         │            │          │ inform. ││
│  ├────────┼───────┼────────────┼─────────┼────────────┼──────────┼─────────┤│
│  │ Mr     │ 10:30am│ Rolls     │ Hearing │ CH-2026-   │ HMRC v   │ Time    ││
│  │ Justice│       │ Building,  │         │ 000123     │ Example  │ estimate││
│  │ Smith  │       │ Court 12   │         │            │ Ltd      │ 2 hours ││
│  ├────────┼───────┼────────────┼─────────┼────────────┼──────────┼─────────┤│
│  │ …      │ …     │ …          │ …       │ …          │ …        │ …       ││
│  └────────┴───────┴────────────┴─────────┴────────────┴──────────┴─────────┘│
│                                                                              │
│  Data source: Court and Tribunal Hearings Service               (govuk-body-s)│
│                                                                              │
│  Back to top                                                                 │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ Footer: Accessibility statement · Cookies · Privacy policy · Terms           │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Empty list state** (published but no rows — replaces the table):

```
│  No hearings scheduled for this section                                      │
```

**Excel upload template** (the file admins fill in — first sheet, row 1 is the header):

```
┌───┬─────────────────┬─────────┬─────────────────────┬─────────┬──────────────┬────────────────┬────────────────────────┐
│   │ A               │ B       │ C                   │ D       │ E            │ F              │ G                      │
├───┼─────────────────┼─────────┼─────────────────────┼─────────┼──────────────┼────────────────┼────────────────────────┤
│ 1 │ Judge           │ Time    │ Venue               │ Type    │ Case Number  │ Case Name      │ Additional Information │
│ 2 │ Mr Justice Smith│ 10:30am │ Rolls Building, C12 │ Hearing │ CH-2026-000123│ HMRC v Example │ Time estimate 2 hours  │
│ 3 │ Master Jones    │ 2pm     │ Remote (MS Teams)   │ Judgment│ CH-2026-000456│ Example v HMRC │                        │
└───┴─────────────────┴─────────┴─────────────────────┴─────────┴──────────────┴────────────────┴────────────────────────┘
```

## 6. Page Specifications

### 6.1 New package: `libs/list-types/revenue-chd-daily-cause-list/`

Thin wrapper over `@hmcts/chd-kb-common`, mirroring `libs/list-types/companies-winding-up-chd-daily-cause-list/` exactly.

```
libs/list-types/revenue-chd-daily-cause-list/
├── package.json          # @hmcts/revenue-chd-daily-cause-list; deps: @hmcts/chd-kb-common,
│                         #   @hmcts/list-types-common, @hmcts/pdf-generation, exceljs, nunjucks
│                         # build: tsc && build:nunjucks (copies src/pdf/*.njk to dist/pdf)
├── tsconfig.json
└── src/
    ├── config.ts                     # moduleRoot, assets
    ├── index.ts                      # re-exports + side-effect converter import
    ├── conversion/
    │   ├── revenue-chd-daily-cause-list-config.ts       # registerConverterByName(...)
    │   └── revenue-chd-daily-cause-list-config.test.ts
    ├── rendering/
    │   ├── renderer.ts               # delegates to renderChdKbHearingList with own listTitle
    │   └── renderer.test.ts
    ├── pdf/
    │   ├── pdf-generator.ts
    │   ├── pdf-generator.test.ts
    │   └── pdf-template.njk
    └── locales/
        ├── en.ts
        └── cy.ts
```

**No `src/schemas/` directory and no local validator** — the schema and validator live in `chd-kb-common`. `index.ts` re-exports `validateChdKbListType` under a list-type-specific alias so the dynamic validator dispatcher (which imports the package by name and looks for a `validate*` export) resolves it, and so the CI guard in `libs/list-types/common/src/validation/guard.test.ts` stays green (that guard only fires for packages that ship their own schema files). This is the established precedent from `companies-winding-up-chd-daily-cause-list/src/index.ts`.

`src/index.ts`:

```typescript
import "./conversion/revenue-chd-daily-cause-list-config.js"; // Register converter on module load

// Re-exported under this list type's own name so libs/publication's PDF registry and the web
// controller resolve it. The hearing shape and schema live in @hmcts/chd-kb-common and are
// shared with the other Chancery Division / King's Bench list types.
export type { ChdKbHearing as RevenueChdHearing, ChdKbHearingList as RevenueChdHearingList } from "@hmcts/chd-kb-common";
export {
  extractCaseSummary,
  formatCaseSummaryForEmail,
  SPECIAL_CATEGORY_DATA_WARNING,
  validateChdKbListType as validateRevenueChdDailyCauseList
} from "@hmcts/chd-kb-common";
export type { ValidationResult } from "@hmcts/publication";
export * from "./excel/excel-generator.js";
export { cy as revenueChdDailyCauseListCy } from "./locales/cy.js";
export { en as revenueChdDailyCauseListEn } from "./locales/en.js";
export * from "./pdf/pdf-generator.js";
export * from "./rendering/renderer.js";
```

`src/conversion/revenue-chd-daily-cause-list-config.ts`:

```typescript
import { CHD_KB_EXCEL_CONFIG } from "@hmcts/chd-kb-common";
import { createConverter, registerConverterByName } from "@hmcts/list-types-common";

// Field definitions are shared with the other Chancery Division / King's Bench list types.
// Registration must live here because the converter registry is keyed on this list type's
// own stable name.
export const REVENUE_CHD_EXCEL_CONFIG = CHD_KB_EXCEL_CONFIG;

registerConverterByName("REVENUE_CHD_DAILY_CAUSE_LIST", createConverter(REVENUE_CHD_EXCEL_CONFIG));
```

`src/rendering/renderer.ts` — same three-line delegation as the Companies Winding Up renderer, passing `t.pageTitle` as `listTitle` so the header title is locale-correct.

`src/pdf/pdf-generator.ts` + `pdf-template.njk` — copy of the Companies Winding Up pair with the Revenue locales and important-information block. Writes to `<artefactId>.pdf` in `CONTAINER.PUBLICATIONS` via `savePdfToStorage`.

### 6.2 New page: `apps/web/src/pages/(list-types)/revenue-chd-daily-cause-list/`

```
├── index.ts                                # GET via createSimpleListTypeHandler
├── download.ts                             # GET → handleBlobDownload (pdf | xlsx)
├── revenue-chd-daily-cause-list.njk
├── index.test.ts
├── download.test.ts
└── revenue-chd-daily-cause-list.njk.test.ts
```

`index.ts` follows `companies-winding-up-chd-daily-cause-list/index.ts`, with the download files added:

```typescript
import { validateChdKbListType } from "@hmcts/chd-kb-common";
import {
  type RevenueChdHearingList,
  renderRevenueChdDailyCauseList,
  revenueChdDailyCauseListCy as cy,
  revenueChdDailyCauseListEn as en
} from "@hmcts/revenue-chd-daily-cause-list";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";
import { getAvailableFiles } from "../sjp-download-shared.js";

const SUPPORTED_LIST_TYPE = "REVENUE_CHD_DAILY_CAUSE_LIST";

export const GET = createSimpleListTypeHandler<RevenueChdHearingList>({
  en,
  cy,
  validate: validateChdKbListType,
  logPrefix: "revenue-chd-daily-cause-list",
  guardArtefact: (artefact, res) => { /* 400 + errors/common when listTypeName mismatches */ },
  render: async ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, hearings } = renderRevenueChdDailyCauseList(jsonData, {
      locale,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString()
    });
    const files = await getAvailableFiles(artefact.artefactId, "/revenue-chd-daily-cause-list");
    res.render("revenue-chd-daily-cause-list", {
      en, cy, t,
      title: header.listTitle,
      header,
      hearings,
      files,
      dataSource: resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> })
    });
  }
});
```

`download.ts` is a two-line delegation to the existing `handleBlobDownload`, which already validates the `artefactId` UUID and restricts `type` to `pdf | xlsx`.

Template structure (copy of the Companies Winding Up `.njk` plus a downloads block):

| Region | Markup |
|---|---|
| Heading | `<h1 class="govuk-heading-l" id="top">{{ header.listTitle }}</h1>` |
| FaCT link | `govuk-body` paragraph with `govuk-link` to find-court-tribunal.service.gov.uk |
| Venue block | three `govuk-body` paragraphs (bold venue name, address lines) |
| Dates | bold "List for …" then "Last updated … at …" |
| Important information | `govukDetails` with `open: true` |
| Downloads | `<h2 class="govuk-heading-s">` + one `govuk-body` paragraph per entry in `files` with a `govuk-link` |
| Search | `<h2 class="govuk-heading-s">` + `#case-search-input` with a `govuk-visually-hidden` label |
| Table | `<table class="govuk-table hearings-table">`, `<th scope="col">` ×7, one `<tr>` per hearing |
| Empty state | `{% else %}` branch rendering `t.noHearingsMessage` |
| Footer | data source (`govuk-body-s`), `Back to top` anchor to `#top` |

The search box needs **no bespoke JavaScript**: the global `apps/web/src/assets/js/table-search.ts` auto-wires any page containing `#case-search-input` and `.hearings-table`. It is a progressive enhancement — without JS the full table is still rendered and readable.

### 6.3 Registration touch-points (existing files to edit)

1. **`libs/list-types/common/src/list-type-data.ts`** — one new `ListTypeData` entry:
   ```typescript
   {
     name: "REVENUE_CHD_DAILY_CAUSE_LIST",
     englishFriendlyName: "Revenue (Chancery Division) Daily Cause List",
     welshFriendlyName: "[TRANSLATE: \"Revenue (Chancery Division) Daily Cause List\"]",
     shortenedFriendlyName: "Revenue List (ChD) Daily Cause List",
     provenance: "CFT_IDAM",
     urlPath: "revenue-chd-daily-cause-list",
     isNonStrategic: true,
     defaultSensitivity: "Public",
     subJurisdictionIds: [10]   // High Court (jurisdictionId 1 = Civil)
   }
   ```
   This single entry is all that is required for every environment — the deploy seed SQL is generated from this file by `apps/postgres/prisma/generate-seed-sql.ts`. **Do not hand-write any `.sql` file.**
2. **`libs/location/src/location-data.ts`** — **no change.** `locationId: 26` "Business and Property Courts Rolls Building" already exists with `regions: [11]` and `subJurisdictions: [10]`, which is what makes the new list type appear under that venue.
3. **`libs/publication/src/processing/service.ts`** — add to `PDF_GENERATOR_REGISTRY`:
   ```typescript
   REVENUE_CHD_DAILY_CAUSE_LIST: (p) => generateRevenueChdDailyCauseListPdf({ ...p, jsonData: p.jsonData as RevenueChdHearingList }),
   ```
   and to `EXCEL_GENERATOR_REGISTRY`:
   ```typescript
   REVENUE_CHD_DAILY_CAUSE_LIST: (p) => generateRevenueChdDailyCauseListExcel({ ...p, jsonData: p.jsonData as RevenueChdHearingList }),
   ```
   plus the two imports. Both registries are keyed on the string `listTypeName`.
4. **`libs/notifications/src/notification/notification-service.ts`** — add to `EMAIL_BUILDER_REGISTRY` using the shared ChD/KB extractor and formatter, so case-subscription digests work for this list type.
5. **`apps/web/src/pages/(admin)/non-strategic-upload/index.ts`** and **`.../non-strategic-upload-summary/index.ts`** — add `import "@hmcts/revenue-chd-daily-cause-list"; // Register Revenue List (ChD) converter` so the converter is registered in those requests' module graphs.
6. **`apps/web/src/app.ts`** — import `moduleRoot` from `@hmcts/revenue-chd-daily-cause-list/config` and push it into the `modulePaths` array passed to `configureGovuk`, so Nunjucks can resolve the page template.
7. **`apps/web/package.json`** — add `"@hmcts/revenue-chd-daily-cause-list": "workspace:*"`.
8. **Root `tsconfig.json`** — add `paths` entries for `@hmcts/revenue-chd-daily-cause-list` and `@hmcts/revenue-chd-daily-cause-list/config`.

No Prisma schema change and no migration: `list_type`, `location`, `region` and the link tables already exist.

## 7. Content

Page-specific content lives in `libs/list-types/revenue-chd-daily-cause-list/src/locales/{en,cy}.ts`, exported as `revenueChdDailyCauseListEn` / `revenueChdDailyCauseListCy`. The `cy` object must mirror the `en` object key-for-key (asserted by a template test). Shared provenance labels come from `provenanceLabelsEn` / `provenanceLabelsCy` in `@hmcts/list-types-common`.

### English (`en.ts`)

| Key | Value |
|---|---|
| `pageTitle` | Revenue (Chancery Division) Daily Cause List |
| `factLinkText` | Find contact details and other information about courts and tribunals |
| `factLinkUrl` | https://www.find-court-tribunal.service.gov.uk/ |
| `factAdditionalText` | in England and Wales, and some non-devolved tribunals in Scotland. |
| `venueName` | Rolls Building |
| `addressLine1` | Fetter Lane, London |
| `addressLine2` | EC4A 1NL |
| `importantInformationHeading` | Important information |
| `importantInformationHeading1` | Remote hearings before a Judge of the Chancery Division |
| `importantInformationLine1` | If a representative of the media or member of the public wishes to attend the hearing they should contact the listing office chanceryjudgeslisting@justice.gov.uk who will put them in touch with the relevant person. |
| `saveListTitle` | Save this list |
| `downloadPdfLink` | Download a PDF version of this list |
| `toDevice` | to your device |
| `searchCasesTitle` | Search Cases |
| `searchCasesLabel` | Search by case number, name, venue, judge, type, or other information |
| `tableHeaders.judge` | Judge |
| `tableHeaders.time` | Time |
| `tableHeaders.venue` | Venue |
| `tableHeaders.type` | Type |
| `tableHeaders.caseNumber` | Case number |
| `tableHeaders.caseName` | Case name |
| `tableHeaders.additionalInformation` | Additional information |
| `noHearingsMessage` | No hearings scheduled for this section |
| `dataSource` | Data source |
| `backToTop` | Back to top |
| `listFor` | List for |
| `lastUpdated` | Last updated |
| `at` | at |
| `cautionNote` | Note this document contains Special Category Data as defined by Data Protection Act 2018, formally known as Sensitive Personal Data, and should be handled appropriately. |
| `cautionReporting` | This document contains information intended to assist the accurate reporting of court proceedings. It is vital you ensure that you safeguard the Special Category Data included and abide by reporting restrictions (for example on victims and children). HMCTS will stop sending the data if there is concern about how it will be used. |

`cautionNote` and `cautionReporting` appear in the PDF footer only, matching the sibling PDF template.

### Welsh (`cy.ts`)

| Key | Value |
|---|---|
| `pageTitle` | Rhestr Achosion Dyddiol Refeniw (Adran Siawnsri) |
| `factLinkText` | [WELSH TRANSLATION REQUIRED: "Find contact details and other information about courts and tribunals"] |
| `factLinkUrl` | https://www.find-court-tribunal.service.gov.uk/ |
| `factAdditionalText` | [WELSH TRANSLATION REQUIRED: "in England and Wales, and some non-devolved tribunals in Scotland."] |
| `venueName` | Rolls Building |
| `addressLine1` | Fetter Lane, London |
| `addressLine2` | EC4A 1NL |
| `importantInformationHeading` | [WELSH TRANSLATION REQUIRED: "Important information"] |
| `importantInformationHeading1` | Gwrandawiadau o bell gerbron Barnwr yr Adran Siawnsri |
| `importantInformationLine1` | Os yw cynrychiolydd o'r cyfryngau neu aelod o'r cyhoedd yn dymuno mynychu'r gwrandawiad, dylent gysylltu 'r swyddfa restru yn chanceryjudgeslisting@justice.gov.uk a fydd yn eu rhoi mewn cysylltiad 'r unigolyn perthnasol. |
| `saveListTitle` | [WELSH TRANSLATION REQUIRED: "Save this list"] |
| `downloadPdfLink` | [WELSH TRANSLATION REQUIRED: "Download a PDF version of this list"] |
| `toDevice` | [WELSH TRANSLATION REQUIRED: "to your device"] |
| `searchCasesTitle` | chwilio achosion |
| `searchCasesLabel` | [WELSH TRANSLATION REQUIRED: "Search by case number, name, venue, judge, type, or other information"] |
| `tableHeaders.judge` | [WELSH TRANSLATION REQUIRED: "Judge"] |
| `tableHeaders.time` | Amser |
| `tableHeaders.venue` | Lleoliad |
| `tableHeaders.type` | [WELSH TRANSLATION REQUIRED: "Type"] |
| `tableHeaders.caseNumber` | [WELSH TRANSLATION REQUIRED: "Case number"] |
| `tableHeaders.caseName` | Enw'r Achos |
| `tableHeaders.additionalInformation` | Gwybodaeth ychwanegol |
| `noHearingsMessage` | [WELSH TRANSLATION REQUIRED: "No hearings scheduled for this section"] |
| `dataSource` | [WELSH TRANSLATION REQUIRED: "Data source"] |
| `backToTop` | Yn 'l i frig y dudalen |
| `listFor` | Rhestr ar gyfer |
| `lastUpdated` | [WELSH TRANSLATION REQUIRED: "Last updated"] |
| `at` | am |
| `cautionNote` | Noder bod y ddogfen hon yn cynnwys Data Categori Arbennig fel y'i diffinnir yn Neddf Gwarchod Data 2018, a elwid gynt yn Ddata Personol Sensitif, a dylid ei drin yn y ffordd briodol. |
| `cautionReporting` | Mae'r ddogfen hon yn cynnwys gwybodaeth a fwriedir i gynorthwyo i roi adroddiad manwl-gywir am achosion llys. Mae'n hanfodol eich bod yn sicrhau eich bod yn gwarchod y Data Categori Arbennig sydd ynddi ac yn cadw at gyfyngiadau adrodd (er enghraifft yn achos dioddefwyr a phlant). Bydd GLlTEM yn rhoi'r gorau i anfon y data os cyfyd pryder ynghylch sut y'i defnyddir. |

Reference-data friendly names (shown on admin upload screens and the summary of publications), added to `list-type-data.ts`:

| Field | Value |
|---|---|
| `englishFriendlyName` | Revenue (Chancery Division) Daily Cause List |
| `welshFriendlyName` | Rhestr Achosion Dyddiol Refeniw (Adran Siawnsri) |
| `shortenedFriendlyName` | Revenue List (ChD) Daily Cause List |

Dates and times are formatted by the shared `formatDisplayDate` / `formatLastUpdatedDateTime` helpers, which are already locale-aware — no per-list date strings are needed.

## 8. URL

| Purpose | Method | Path |
|---|---|---|
| Public list page | GET | `/revenue-chd-daily-cause-list?artefactId=<uuid>` |
| PDF download | GET | `/revenue-chd-daily-cause-list/download?artefactId=<uuid>&type=pdf` |
| Entry point (existing) | GET | `/summary-of-publications?locationId=26` |
| Admin upload (existing) | GET/POST | `/non-strategic-upload`, `/non-strategic-upload-summary` |

`urlPath` in `list-type-data.ts` must be exactly `revenue-chd-daily-cause-list` — the summary-of-publications page builds its links from that value, and the page directory name must match it for auto-discovery.

Blob keys: `<artefactId>.pdf` in `CONTAINER.PUBLICATIONS`. The converted JSON artefact is stored under `<artefactId>` in `CONTAINER.ARTEFACT`.

## 9. Validation

Validation happens in two layers. Both must pass before an artefact is published.

### Layer 1 — Excel → JSON conversion (`CHD_KB_EXCEL_CONFIG`, `minRows: 1`)

| Column header (exact, row 1) | JSON field | Required | Rule |
|---|---|---|---|
| Judge | `judge` | Yes | non-empty; no HTML tags |
| Time | `time` | Yes | matches `/^(\d{1,2})([:.]\d{2})?\s*[ap]m\s*$/i` — e.g. `9am`, `10:30am`, `2.15pm` |
| Venue | `venue` | Yes | non-empty; no HTML tags |
| Type | `type` | Yes | non-empty; no HTML tags |
| Case Number | `caseNumber` | Yes | non-empty; no HTML tags |
| Case Name | `caseName` | Yes | non-empty; no HTML tags |
| Additional Information | `additionalInformation` | Yes | non-empty; no HTML tags |

Also enforced by the shared converter: the workbook must contain at least one worksheet; the header row must contain every column above; there must be at least one data row.

### Layer 2 — JSON schema (`chd-kb-common.json`, draft-07)

Root is `type: "array"`; each item is an object with `required: ["judge", "time", "venue", "type", "caseNumber", "caseName", "additionalInformation"]`. Every string property carries the no-HTML pattern `^(?!(.|\r|\n)*<[^>]+>)(.|\r|\n)*$`; `time` carries `^\d{1,2}([:.]\d{2})?\s*[ap]m\s*$`. The same schema is re-validated on every page render by `createSimpleListTypeHandler`, so a corrupted or hand-edited artefact renders the error page rather than partial data.

### Field order

The order in the AC is authoritative and is enforced in three places that must stay in step: the `required` array and `properties` order in the schema, the `fields` array in `CHD_KB_EXCEL_CONFIG`, and the `<th>` order in the page and PDF templates. See §14 for the "Venue Type" naming question.

### Upload form validation (existing, unchanged)

File present, `.xlsx` type, ≤2MB, valid court, list type selected, valid hearing start date, sensitivity, language, display-from and display-to dates, display-to not before display-from.

### Access control

Sensitivity defaults to `Public`, so the page is available to unauthenticated users. If an admin publishes at a higher sensitivity, access is enforced by the existing publication authorisation middleware and `filterPublicationsForSummary`; nothing list-type-specific is needed.

## 10. Error Messages

### Upload / conversion errors (surfaced on `/non-strategic-upload` in a `govukErrorSummary`)

These come from the shared converter, so the wording is fixed:

| Condition | Message |
|---|---|
| Missing column(s) in header row | `Excel file must contain columns: Judge, Time, Venue, Type, Case Number, Case Name, Additional Information. Missing: Case Number` |
| Empty required cell | `Missing required field 'Case Number' in row 4` |
| HTML tags in a cell | `Invalid content in 'Case Name' in row 4: HTML tags are not allowed` |
| Bad time value | `Invalid time format 'quarter past nine' in row 4. Expected format: h:mma (e.g., 9:30am) or ha (e.g., 2pm)` |
| No data rows | `Excel file must contain at least 1 data row` |
| Empty workbook | `Excel file must contain at least one worksheet` |

### Upload form errors (existing content, listed for completeness)

`Please provide a file` · `The selected file type is not supported` · `The selected file must be smaller than 2MB` · `Please enter and select a valid court` · `Please select a list type` · `Please enter a valid hearing start date` · `Please select a sensitivity` · `Select a language option` · `Please enter a valid display file from date` · `Please enter a valid display file to date` · `'Display to' date must be the same as or later than 'Display from' date`

### Page errors (rendered via `errors/common`)

| Condition | Status | Title / message |
|---|---|---|
| `artefactId` query param missing | 400 | Bad Request / Missing artefactId parameter |
| `listTypeName` is not `REVENUE_CHD_DAILY_CAUSE_LIST` | 400 | Invalid List Type / This list type is not supported by this module |
| Artefact not found | 404 | Not Found / The requested list could not be found |
| Stored JSON fails schema validation | 400 | Invalid Data / The list data is invalid |
| Unexpected error | 500 | Error / An error occurred while displaying the list |

### Download errors (JSON responses from `handleBlobDownload`)

| Condition | Status | Body |
|---|---|---|
| Missing/malformed `artefactId`, or `type` not `pdf`/`xlsx` | 400 | `{ "error": "Invalid request" }` |
| Blob not present | 404 | `{ "error": "File not found" }` |

Download link is only rendered for file that actually exist, because `getAvailableFiles` probes blob properties first — so a 404 is not reachable through normal navigation.

## 11. Navigation

- **In:** `/summary-of-publications?locationId=26` links to `/revenue-chd-daily-cause-list?artefactId=<uuid>` using `listType.url`. Nothing else needs to link to the page.
- **No back link:** consistent with every other list-type page in the service — these are content pages reached from a list, not steps in a question flow.
- **Within page:** "Back to top" anchors to `#top` on the `<h1>`. Download links navigate to the download route, which responds with `Content-Disposition: attachment`, so the user stays on the list page.
- **Language toggle:** the existing service-navigation English/Cymraeg links re-render the same URL with the other locale; no per-page work.
- **Out on error:** all error paths render an error template in place (no redirects), preserving the URL so a refresh retries.
- **Publishing flow:** unchanged — upload → summary → confirmation, with failures returning to the upload page with the form data preserved.

## 12. Accessibility

WCAG 2.2 AA is mandatory. Requirements specific to this page:

- **Page title / heading:** `<title>` set from `header.listTitle`, matching the `<h1>`. Heading order is `h1` (list title) → `h2` ("Save this list", "Search Cases"); no levels skipped. The `govukDetails` summary is a native `<summary>` element, not a heading.
- **Table semantics:** a single `<table class="govuk-table">` with `<thead>`, `<th scope="col">` on all seven headers, and `aria-label="{{ t.pageTitle }}"`. No layout tables, no merged cells, no empty header cells. Cells that have no data render as empty cells, not as "-" or placeholder text.
- **Search input:** `<label for="case-search-input">` is present and `govuk-visually-hidden`, giving screen-reader users the full "Search by case number, name, venue, judge, type, or other information" description while keeping the visual design clean. Filtering is progressive enhancement; the unfiltered table is fully usable without JavaScript.
- **Download link:** link text states the format and file size and ends with "to your device" — e.g. "Download a PDF version of this list (48.2KB) to your device" — so the link makes sense out of context. Format is conveyed in text, never by icon or colour alone.
- **Colour and contrast:** GOV.UK Frontend classes only, no inline styles, no custom colours. No information is conveyed by colour alone.
- **Keyboard:** the only interactive elements are links, the details disclosure and the search input, all natively focusable in reading order with default GOV.UK focus styles. No keyboard traps; no custom `tabindex`.
- **Zoom / reflow:** the seven-column table must remain usable at 320px width and 400% zoom. Verify horizontal scrolling is contained to the table region rather than the whole page, matching the sibling ChD list.
- **Welsh:** `<html lang>` is set by the existing i18n middleware; every visible string comes from the locale object so the announced language matches the rendered text.
- **Automated checks:** axe-core scan (English and Welsh) inline in the E2E journey test, expecting zero violations.

## 13. Test Scenarios

**Unit — `libs/list-types/revenue-chd-daily-cause-list`**

* Converter config registers a converter under the exact name `REVENUE_CHD_DAILY_CAUSE_LIST` and produces objects whose keys are in schema order from a header row plus data rows
* Converter rejects a sheet missing a required column, an empty required cell, an HTML-bearing cell, an unparseable time, and a sheet with no data rows
* Renderer returns the localised list title as `header.listTitle` for `en` and for `cy`, formats `listDate` and `lastUpdated*` per locale, and passes hearings through unchanged including an empty array
* PDF generator renders the template, uploads to `<artefactId>.pdf`, and returns a failure result (without throwing) when HTML-to-PDF generation fails
* Locale key parity: `Object.keys(en).sort()` equals `Object.keys(cy).sort()`, recursively for `tableHeaders`
* Re-exported `validateRevenueChdDailyCauseList` accepts a fully populated fixture and rejects a fixture with each required field removed in turn (real schema, no mocks)

**Unit — page controller**

* Renders the template with `header`, `hearings`, `files` and `dataSource` for a matching artefact
* Selects Welsh content when `res.locals.locale` is `cy`
* Returns 400 with `errors/common` when `listTypeName` is a different list type — with the fixture using an arbitrary `listTypeId` (e.g. `999`) to prove routing is name-driven, not id-driven
* Returns 400 when `artefactId` is absent, 404 when the artefact or its JSON blob is missing, 400 when the stored JSON fails validation, 500 on an unexpected error
* Download route rejects a non-UUID `artefactId` and a `type` other than `pdf`/`xlsx`, and streams the blob with the correct content type and `Content-Disposition` otherwise

**Template — `revenue-chd-daily-cause-list.njk.test.ts`**

* Renders the list title, venue name and both address lines, and the "List for"/"Last updated" lines
* Renders exactly seven column headers in the specified order, and one row per hearing with cells in that order
* Renders the empty-state message and no table when `hearings` is empty
* Renders one download link per entry in `files` with the correct href, format wording and size label; renders no downloads block when `files` is empty
* Renders Welsh headings, table headers and download wording when passed the `cy` locale object
* Renders the search input with an associated visually hidden label, and the important-information details section

**Unit — registries**

* `PDF_GENERATOR_REGISTRY` resolve generator for `REVENUE_CHD_DAILY_CAUSE_LIST` is true
* `EMAIL_BUILDER_REGISTRY` resolves an extractor and formatter for the list type
* `listTypeData` contains exactly one entry named `REVENUE_CHD_DAILY_CAUSE_LIST`, marked non-strategic, with `urlPath` matching the page directory

**E2E — one journey test (`@nightly`), covering publish → view → validate → Welsh → accessibility → download**

* Sign in as a CTSC admin, attempt an upload with a deliberately invalid file and assert the specific converter error, then upload a valid Revenue List (ChD) Excel file against the Business and Property Courts Rolls Building, confirm on the summary page, then as a public user navigate from the venue's summary of publications to the list page; assert the seven columns and the uploaded rows; use the search box to filter; switch to Welsh and assert the translated title and headers; run an axe-core scan on both locales expecting zero violations; tab to and follow the PDF and Excel download links asserting a successful response and the expected content type

## 14. Assumptions & Open Questions

* **"Venue Type" in the acceptance criteria is two columns, `Venue` and `Type` — needs confirmation.** The AC lists six field names, but the shared ChD/KB schema and the legacy pip-frontend Revenue view both use seven: `Judge, Time, Venue, Type, Case Number, Case Name, Additional Information`. This spec assumes "Venue Type" is a transcription of the two adjacent columns, which is what lets the entire schema, validator, converter config and model be reused unchanged. **If it is genuinely a single combined column**, `chd-kb-common` cannot be reused: the Revenue package would need its own schema, converter config, model type and renderer, adding roughly a day of work and a second near-identical schema to maintain. Confirm before starting.
* **List type name and URL slug.** This spec uses `REVENUE_CHD_DAILY_CAUSE_LIST` / `revenue-chd-daily-cause-list`, following the `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` precedent. If the legacy service uses `REVENUE_LIST_CHD_DAILY_CAUSE_LIST`, align with it before merge — both values are baked into seeded reference data and are awkward to change afterwards.
* **Page title wording.** The Welsh translation catalogue records the canonical English title as "Revenue (Chancery Division) Daily Cause List", while the ticket says "Revenue List (ChD) daily cause list". This spec uses the catalogue form for `pageTitle` and `englishFriendlyName`, and the ticket's abbreviated form for `shortenedFriendlyName` (the admin dropdown label). Confirm with content design.
* **"Important information" copy is unconfirmed.** The proposed content ("Remote hearings before a Judge of the Chancery Division" plus the `chanceryjudgeslisting@justice.gov.uk` paragraph) is drawn from the Welsh translations catalogue's Chancery Division block, not from a Revenue-specific source. The authoritative source is pip-frontend's `locales/{en,cy}/revenue-chd-daily-cause-list.json`. If the Revenue list has multiple important-information sections (several of the ChD lists do), the locale objects and both templates need to iterate an array rather than render single heading/line keys — a small change, but worth settling before the templates are written.
* **Excel download is not in scope here, just like #803.** #803 explicitly descoped it. it is out of scope for this ticket.
* **The venue already exists.** `locationId: 26` "Business and Property Courts Rolls Building" was added by #803, so this ticket adds no location reference data. Verify after deploy that the new list type appears under that venue on the upload screen — a wrong `subJurisdictionIds` value is the most likely cause if it does not.
* **`additionalInformation` is required by the shared schema.** In `chd-kb-common` it is in the `required` array and the converter marks it `required: true`, so an empty cell in that column fails the upload. If Revenue lists routinely leave it blank, this becomes a data-entry burden; relaxing it means either changing the shared schema (affecting Companies Winding Up too) or forking the schema. Confirm the expected data before assuming the shared behaviour is acceptable.
* **No design artefacts supplied.** The wireframe in §5 is derived from the sibling Companies Winding Up page rather than from a design for this list. If a designed layout exists, it takes precedence over §5 and §6.3.
* **Excel upload template distribution is out of scope.** The AC says the list "is uploaded as an excel template", which this spec reads as "the admin fills in a spreadsheet matching the column headers in §9". Producing and hosting a downloadable blank template for admins is not implemented anywhere in the service today; if that is wanted, it needs its own ticket.

### Comment by OgechiOkelu on 2026-08-13T10:12:41Z

@plan
