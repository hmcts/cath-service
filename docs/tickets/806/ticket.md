# #806: Intellectual Property List (ChD) daily cause list

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** enhancement, type:story, epic:public-journey
**Created:** 2026-07-01T18:09:39Z
**Updated:** 2026-08-12T16:46:14Z

## Description

PROBLEM STATEMENT

This ticket covers the non-strategic publishing of The Intellectual Property List (ChD) daily cause list (through the upload of excel files in CaTH) which would require the creation of validation schema and style guides.


**AS A** Service

**I WANT** to create the validation schema and style guides for Intellectual Property List (ChD) daily cause list

**SO THAT** the Intellectual Property List (ChD) daily cause list can be published in CaTH


**ACCEPTANCE CRITERIA**
- The Intellectual Property List (ChD) daily cause list is created under the Business and Property Courts Rolls Building in CaTH and is linked to the 'Civil' jurisdiction and 'Royal Courts of Justice Group' region
- The following data fields are created in the listed order in the validation schema for the Intellectual Property List (ChD) daily cause list (Judge, Time, Venue, Type, Case Number, Case Name and Additional Information)
- The the Intellectual Property List (ChD) daily cause list is published through the Excel upload route in CaTH. It is uploaded as an excel template and converted to the Json file format suitable for rendering
- The validation schema and style guide for the Intellectual Property List (ChD) daily cause list is created.
- A PDF and Excel downloadable version of each hearing list is created.
- The style guide should follow the structure in https://pip-frontend.staging.platform.hmcts.net/intellectual-property-list-chd-daily-cause-list?artefactId=1259e7ea-52be-4b52-9f03-a6337033526a
- The Json file should follow the below format
[
{
"judge":"Judge A",
"time":"9am",
"venue":"Venue A",
"type":"Type A",
"caseNumber":"12345",
"caseName":"Case name A",
"additionalInformation":"This is additional information"
},
{
"judge":"Judge B",
"time":"10:30pm",
"venue":"Venue B",
"type":"Type B",
"caseNumber":"12346",
"caseName":"Case name B",
"additionalInformation":"This is another additional information"
}
]

## Comments

### Comment by OgechiOkelu on 2026-07-22T14:49:28Z

@spec

### Comment by hmctsclaudecode on 2026-07-22T14:55:50Z

# Technical Specification: Intellectual Property List (ChD) Daily Cause List

_Issue #806 — Non-strategic publishing of the Intellectual Property List (ChD) daily cause list via Excel upload in CaTH._

## 1. User Story
**As a** Court and Tribunal Hearings (CaTH) service
**I want to** create the validation schema, Excel-to-JSON conversion, style guide and downloadable versions for the Intellectual Property List (ChD) daily cause list
**So that** the Intellectual Property List (ChD) daily cause list can be published in CaTH through the non-strategic Excel upload route and rendered for public users.

## 2. Background
This list is one of the Business and Property Courts lists heard at the Rolls Building, Royal Courts of Justice. It is published non-strategically: an internal user uploads an Excel template through CaTH, which is converted to JSON, validated against a schema, and rendered as an HTML page with downloadable PDF and Excel versions.

The list belongs under the **Business and Property Courts Rolls Building**, is linked to the **Civil** jurisdiction and the **Royal Courts of Justice Group** region.

Existing RCJ / Royal Courts of Justice group list types provide the pattern to follow:
- `libs/list-types/rcj-standard-daily-cause-list/` — the closest analogue (flat array of hearings, one page per court variant).
- `libs/list-types/london-administrative-court-daily-cause-list/` — reference for a bespoke schema + converter config.
- List type metadata: `libs/list-types/common/src/list-type-data.ts`.
- Converter registration: `libs/list-types/common/src/conversion/non-strategic-list-registry.ts` (`registerConverterByName`).
- PDF generator registry: `libs/publication/src/processing/service.ts` (`PDF_GENERATOR_REGISTRY`).
- Page controller pattern: `apps/web/src/pages/(list-types)/rcj-standard-daily-cause-list/index.ts`.
- Handler helpers: `apps/web/src/pages/(list-types)/list-type-handler.ts`.
- Excel upload route: `apps/web/src/pages/(admin)/non-strategic-upload/index.ts`.

**Important — field differences from RCJ standard:** the RCJ standard shape is `venue, judge, time, caseNumber, caseDetails, hearingType, additionalInformation`. The IP List JSON in this issue uses **`judge, time, venue, type, caseNumber, caseName, additionalInformation`** (note `type` not `hearingType`, `caseName` not `caseDetails`, and column ordering differs). Because the shape differs, this list type needs its **own** schema, type interface, converter config and renderer — it must **not** reuse `StandardHearing`/`RCJ_EXCEL_CONFIG` directly.

Reference style guide (staging):
`https://pip-frontend.staging.platform.hmcts.net/intellectual-property-list-chd-daily-cause-list?artefactId=1259e7ea-52be-4b52-9f03-a6337033526a`

**JSON format (per the issue):**
```json
[
  {
    "judge": "Judge A",
    "time": "9am",
    "venue": "Venue A",
    "type": "Type A",
    "caseNumber": "12345",
    "caseName": "Case name A",
    "additionalInformation": "This is additional information"
  }
]
```

## 3. Acceptance Criteria

* **Scenario:** List type registered under the correct court, jurisdiction and region
    * **Given** the reference data / seed scripts are applied
    * **When** the list type `INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST` is registered
    * **Then** it is created under the Business and Property Courts Rolls Building, linked to the **Civil** jurisdiction (`jurisdiction_id = 1`, sub-jurisdiction "Civil Court" `= 1`) and the **Royal Courts of Justice Group** region (`region_id = 11`).

* **Scenario:** Validation schema defines the seven fields in the listed order
    * **Given** an uploaded/converted JSON payload
    * **When** it is validated
    * **Then** the schema defines the fields in this order: **Judge, Time, Venue, Type, Case Number, Case Name, Additional Information**, and rejects payloads missing required fields or containing HTML markup.

* **Scenario:** Publishing via the Excel upload route
    * **Given** an admin uploads the Intellectual Property List (ChD) Excel template
    * **When** the file is processed through the non-strategic upload route
    * **Then** it is converted to the JSON format above and stored as an artefact suitable for rendering.

* **Scenario:** Rendering the published list
    * **Given** a published Intellectual Property List (ChD) artefact
    * **When** a user opens the list page
    * **Then** the hearings are rendered in a table matching the reference style guide, with header metadata (list date, last updated), important-information details, and a case search box.

* **Scenario:** Downloadable PDF and Excel versions
    * **Given** a published artefact
    * **When** the user requests a download
    * **Then** a PDF and an Excel version of the hearing list are available.

* **Scenario:** Welsh language support
    * **Given** a user selects Welsh
    * **When** the list page renders
    * **Then** all static content (headings, labels, table headers, important information) displays in Welsh.

## 4. User Journey Flow

Two journeys are involved: (a) an admin publishing, and (b) a public user viewing.

```
(A) ADMIN PUBLISH  (/non-strategic-upload)
+------------------+     +---------------------+     +------------------------+
| Admin dashboard  | --> | Choose court/       | --> | Select list type:      |
| (upload file)    |     | location + list type|     | Intellectual Property  |
|                  |     |                     |     | List (ChD) DCL         |
+------------------+     +---------------------+     +-----------+------------+
                                                                 |
                                                                 v
+------------------------+     +----------------------+     +--------------------+
| Confirmation /         | <-- | Server: convert xlsx |     | Upload .xlsx       |
| summary page           |     | -> JSON, validate    | <-- | + content date     |
| (or errors)            |     | schema, store artefact|     | + sensitivity      |
+------------------------+     +----------------------+     +--------------------+

(B) PUBLIC VIEW
+------------------+     +---------------------+     +-----------------------------+
| Search / A-Z of  | --> | Business & Property | --> | /intellectual-property-     |
| courts, location |     | Courts Rolls Bldg   |     | list-chd-daily-cause-list   |
+------------------+     +---------------------+     +--------------+--------------+
                                                                    |
                                       +----------------------------+-----------+
                                       v                v                       v
                                Download PDF     Download Excel        View HTML table
```

## 5. Low Fidelity Wireframe

Public rendered list page (`intellectual-property-list-chd-daily-cause-list`):

```
+--------------------------------------------------------------------------+
| GOV.UK  Court and Tribunal Hearings                    [ Cymraeg ]       |
+--------------------------------------------------------------------------+
| Intellectual Property List (ChD) Daily Cause List           (h1)         |
|                                                                          |
| Find contact details and other information about courts and tribunals    |
| in England and Wales, and some non-devolved tribunals in Scotland.       |
|                                                                          |
| The Rolls Building                                                       |
| 7 Rolls Buildings, Fetter Lane                                           |
| London, EC4A 1NL                                                         |
|                                                                          |
| List for 22 July 2026                                                    |
| Last updated 22 July 2026 at 9:30am                                      |
|                                                                          |
| > Important information                                          [open]  |
|   Hearings take place in public unless otherwise indicated ...           |
|                                                                          |
|  Search Cases                                                            |
|  [ ____________________________________ ]  (filter table client-side)    |
|                                                                          |
| +----------+--------+---------+-------+-----------+-----------+---------+ |
| | Judge    | Time   | Venue   | Type  | Case No.  | Case Name | Add.Inf | |
| +----------+--------+---------+-------+-----------+-----------+---------+ |
| | Judge A  | 9am    | Venue A | Type A| 12345     | Case A    | ...     | |
| | Judge B  |10:30pm | Venue B | Type B| 12346     | Case B    | ...     | |
| +----------+--------+---------+-------+-----------+-----------+---------+ |
|                                                                          |
| Data source: [provenance]                                                |
| [ Back to top ]                                                          |
+--------------------------------------------------------------------------+
```

## 6. Page Specifications

### 6.1 New module: `libs/list-types/intellectual-property-list-chd-daily-cause-list/`

Follow the structure of `libs/list-types/rcj-standard-daily-cause-list/`:

```
libs/list-types/intellectual-property-list-chd-daily-cause-list/
├── package.json                # name: @hmcts/intellectual-property-list-chd-daily-cause-list
├── tsconfig.json
└── src/
    ├── config.ts               # moduleRoot, schemaPath
    ├── index.ts                # exports + side-effect import of conversion config for registration
    ├── models/types.ts         # IpChdHearing interface + IpChdHearingList
    ├── schemas/intellectual-property-list-chd-daily-cause-list.json
    ├── validation/json-validator.ts        # validateIpChdDailyCauseList
    ├── validation/json-validator.test.ts   # one it() per required field (MANDATORY)
    ├── conversion/intellectual-property-list-chd-daily-cause-list-config.ts
    ├── rendering/renderer.ts               # renderIpChdDailyCauseList
    ├── pdf/pdf-generator.ts + pdf-template.njk
    └── locales/en.ts, cy.ts
```

`src/models/types.ts`:
```typescript
export interface IpChdHearing {
  judge: string;
  time: string;
  venue: string;
  type: string;
  caseNumber: string;
  caseName: string;
  additionalInformation: string;
}

export type IpChdHearingList = IpChdHearing[];
```

`src/config.ts` mirrors the RCJ config, pointing `schemaPath` at the new JSON schema. `src/index.ts` must begin with a side-effect import of the conversion config (`import "./conversion/intellectual-property-list-chd-daily-cause-list-config.js";`) so `registerConverterByName` runs on module load, exactly as `rcj-standard-daily-cause-list/src/index.ts` does.

### 6.2 Page controller: `apps/web/src/pages/(list-types)/intellectual-property-list-chd-daily-cause-list/index.ts`

Single list type. Use `createSimpleListTypeHandler` (from `apps/web/src/pages/(list-types)/list-type-handler.ts`) together with a guard built via `createMultiListGuardAndRender` configured with a **single** `LIST_TYPE_CONFIG` entry — there is **no** `createSingleListGuardAndRender` helper in this codebase. Pattern mirrors `rcj-standard-daily-cause-list/index.ts` but with one route and one template.

```typescript
import { createJsonValidator } from "@hmcts/list-types-common";
import {
  ipChdDailyCauseListCy as cy,
  ipChdDailyCauseListEn as en,
  renderIpChdDailyCauseList,
  type IpChdHearingList
} from "@hmcts/intellectual-property-list-chd-daily-cause-list";
import { schemaPath } from "@hmcts/intellectual-property-list-chd-daily-cause-list/config";
import { createMultiListGuardAndRender, createSimpleListTypeHandler } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

const LIST_TYPE_CONFIG = {
  INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST: {
    en: en.INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST.pageTitle,
    template: "intellectual-property-list-chd-daily-cause-list"
  }
};

const { guardArtefact, render } = createMultiListGuardAndRender<IpChdHearingList>({
  en, cy, listTypeConfig: LIST_TYPE_CONFIG,
  renderFn: renderIpChdDailyCauseList,
  resolveTemplate: (listConfig) => listConfig.template
});

export const GET = createSimpleListTypeHandler<IpChdHearingList>({
  en, cy, validate,
  logPrefix: "intellectual-property-list-chd-daily-cause-list",
  guardArtefact, render
});
```

The template file `intellectual-property-list-chd-daily-cause-list.njk` follows the RCJ table template (`civil-courts-rcj-daily-cause-list.njk`): extends `layouts/base-template.njk`, uses `govukDetails` for important information, renders a `govuk-table` with the seven IP-specific columns in order, a case search input, a data-source footer and a back-to-top link.

### 6.3 Registration points (all keyed by the string list type name, never a numeric id)

1. **List type metadata** — add to `libs/list-types/common/src/list-type-data.ts`:
```typescript
{
  name: "INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST",
  englishFriendlyName: "Intellectual Property List (ChD) Daily Cause List",
  welshFriendlyName: "[TRANSLATE: \"Intellectual Property List (ChD) Daily Cause List\"]",
  provenance: "CFT_IDAM",
  urlPath: "intellectual-property-list-chd-daily-cause-list",
  isNonStrategic: true,
  defaultSensitivity: "Public",
  subJurisdictionIds: [1]   // Civil Court
}
```
2. **Excel converter** — register by name in the module's conversion config via `registerConverterByName`:
```typescript
registerConverterByName("INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST", converter);
```
   The converter maps the seven Excel columns (Judge, Time, Venue, Type, Case Number, Case Name, Additional Information) to the JSON keys. A **bespoke** column config is required because the field set differs from `RCJ_EXCEL_CONFIG`.
3. **PDF generator** — add to `PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts`:
```typescript
INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST: (p) =>
  generateIpChdDailyCauseListPdf({ ...p, jsonData: p.jsonData as IpChdHearingList }),
```
4. **Seed / SQL scripts** — add corresponding rows to `apps/postgres/prisma/seed.ts` (via `listTypeData`) and the idempotent SQL scripts `apps/postgres/prisma/scripts/001_insert_missing_list_types.sql` and `003_upsert_sub_jurisdictions_and_list_type_links.sql`.
5. **Location / region link** — the "Business and Property Courts Rolls Building" location does **not** currently exist in `libs/location/src/location-data.ts`. If the list must hang off a dedicated Rolls Building location, add it and link it to the Royal Courts of Justice Group region (`regionId 11`) and the Civil jurisdiction; otherwise confirm which existing location (e.g. Royal Courts of Justice, `locationId 4`) it should attach to. See Open Questions.
6. **Module import on the upload path** — ensure the new package is imported somewhere reachable from `non-strategic-upload/index.ts` so its `registerConverterByName` side-effect runs.

## 7. Content

Static page content lives in the module's `locales/en.ts` and `locales/cy.ts`. Follow the RCJ `en.ts` shape (a per-list-type object keyed by the list type name + a `common` block with table headers).

English (`en.ts`):
```typescript
export const en = {
  INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST: {
    pageTitle: "Intellectual Property List (ChD) Daily Cause List",
    locationLine1: "The Rolls Building",
    locationLine2: "7 Rolls Buildings, Fetter Lane",
    locationLine3: "London, EC4A 1NL",
    importantInfoText:
      "Hearings take place in public unless otherwise indicated. When considering the use of telephone and video technology the judiciary will have regard to the principles of open justice. The court may exclude observers where necessary to secure the proper administration of justice."
  },
  common: {
    factLinkText: "Find contact details and other information about courts and tribunals",
    factLinkUrl: "https://www.find-court-tribunal.service.gov.uk/",
    factAdditionalText: "in England and Wales, and some non-devolved tribunals in Scotland.",
    importantInfoTitle: "Important information",
    searchCasesTitle: "Search Cases",
    searchCasesLabel: "Search by case number, case name, venue, judge, type or other information",
    tableHeaders: {
      judge: "Judge",
      time: "Time",
      venue: "Venue",
      type: "Type",
      caseNumber: "Case number",
      caseName: "Case name",
      additionalInformation: "Additional information"
    },
    dataSource: "Data source",
    backToTop: "Back to top",
    listFor: "List for",
    lastUpdated: "Last updated",
    at: "at"
  }
};
```

Welsh (`cy.ts`) — mirror the exact key structure of `en.ts`:
```typescript
export const cy = {
  INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST: {
    pageTitle: "[TRANSLATE: \"Intellectual Property List (ChD) Daily Cause List\"]",
    locationLine1: "[TRANSLATE: \"The Rolls Building\"]",
    locationLine2: "[TRANSLATE: \"7 Rolls Buildings, Fetter Lane\"]",
    locationLine3: "[TRANSLATE: \"London, EC4A 1NL\"]",
    importantInfoText: "[TRANSLATE: \"Hearings take place in public unless otherwise indicated. When considering the use of telephone and video technology the judiciary will have regard to the principles of open justice. The court may exclude observers where necessary to secure the proper administration of justice.\"]"
  },
  common: {
    factLinkText: "[TRANSLATE: \"Find contact details and other information about courts and tribunals\"]",
    factLinkUrl: "https://www.find-court-tribunal.service.gov.uk/",
    factAdditionalText: "[TRANSLATE: \"in England and Wales, and some non-devolved tribunals in Scotland.\"]",
    importantInfoTitle: "[TRANSLATE: \"Important information\"]",
    searchCasesTitle: "[TRANSLATE: \"Search Cases\"]",
    searchCasesLabel: "[TRANSLATE: \"Search by case number, case name, venue, judge, type or other information\"]",
    tableHeaders: {
      judge: "[TRANSLATE: \"Judge\"]",
      time: "[TRANSLATE: \"Time\"]",
      venue: "[TRANSLATE: \"Venue\"]",
      type: "[TRANSLATE: \"Type\"]",
      caseNumber: "[TRANSLATE: \"Case number\"]",
      caseName: "[TRANSLATE: \"Case name\"]",
      additionalInformation: "[TRANSLATE: \"Additional information\"]"
    },
    dataSource: "[TRANSLATE: \"Data source\"]",
    backToTop: "[TRANSLATE: \"Back to top\"]",
    listFor: "[TRANSLATE: \"List for\"]",
    lastUpdated: "[TRANSLATE: \"Last updated\"]",
    at: "[TRANSLATE: \"at\"]"
  }
};
```

> Note: the exact court address and any bespoke "important information" wording must be confirmed against the reference style guide page — the Rolls Building address above is a placeholder (see Open Questions).

## 8. URL

- **Public list page:** `/intellectual-property-list-chd-daily-cause-list`
  (auto-discovered from `apps/web/src/pages/(list-types)/intellectual-property-list-chd-daily-cause-list/`)
- **List type name (stable key):** `INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST`
- **`urlPath` in list-type-data:** `intellectual-property-list-chd-daily-cause-list` (keep identical to the page route)
- Published artefacts are reached with `?artefactId=<uuid>` as with existing list types.

## 9. Validation

JSON schema at `src/schemas/intellectual-property-list-chd-daily-cause-list.json`. Root is a **`type: "array"`** of hearing objects (mirroring the RCJ standard schema). Fields defined in the acceptance-criteria order:

| Order | Field | Type | Required | Pattern / rule |
|-------|-------|------|----------|----------------|
| 1 | `judge` | string | Yes | no HTML markup |
| 2 | `time` | string | Yes | `^\d{1,2}([:.]\d{2})?[ap]m\s*$` (e.g. `9am`, `10:30pm`) |
| 3 | `venue` | string | Yes | no HTML markup |
| 4 | `type` | string | Yes | no HTML markup |
| 5 | `caseNumber` | string | Yes | no HTML markup |
| 6 | `caseName` | string | Yes | no HTML markup |
| 7 | `additionalInformation` | string | No | no HTML markup |

"No HTML markup" pattern (as used by existing schemas): `^(?!(.|\r|\n)*<[^>]+>)(.|\r|\n)*$`.

Schema skeleton:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Intellectual Property List (ChD) Daily Cause List",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["judge", "time", "venue", "type", "caseNumber", "caseName"],
    "properties": {
      "judge": { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "time":  { "type": "string", "pattern": "^\\d{1,2}([:.]\\d{2})?[ap]m\\s*$" },
      "venue": { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "type":  { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "caseNumber": { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "caseName":   { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "additionalInformation": { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" }
    }
  }
}
```

Validator wrapper (`src/validation/json-validator.ts`), exported from `index.ts`:
```typescript
import { createJsonValidator, type ValidationResult } from "@hmcts/list-types-common";
import { schemaPath } from "../config.js";

export function validateIpChdDailyCauseList(jsonData: unknown): ValidationResult {
  return createJsonValidator(schemaPath)(jsonData);
}
```

> The CI guard test in `libs/list-types/common/src/validation/guard.test.ts` will fail if the schema ships without a `validate*` export — the wrapper and its test are mandatory.

## 10. Error Messages

Upload / publishing errors surface through the existing non-strategic upload flow and the shared `errors/common` render path. Validation failures should report which fields failed. Representative messages:

- **Missing required field:** "The uploaded file is invalid: `judge` is required for every hearing."
- **Invalid time format:** "The uploaded file is invalid: `time` must be in a format like 9am or 10:30pm."
- **Contains markup:** "The uploaded file is invalid: `caseName` must not contain HTML."
- **Wrong list type for this page (guard):** the controller renders `errors/common` with a 400 when `artefact.listTypeName !== "INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST"`.
- **Artefact not found / expired:** existing not-found handling for published lists.

Public rendering has no user input beyond the client-side case search, which requires no error messaging.

## 11. Navigation

- The list is reached from the Business and Property Courts Rolls Building location under the Civil jurisdiction / Royal Courts of Justice Group region, via the standard court search / A-Z navigation.
- The rendered page provides:
  - FaCT link out to `find-court-tribunal.service.gov.uk`.
  - "Back to top" anchor link.
  - PDF and Excel download links (served by the existing artefact download route).
- Admin publishing uses the existing `/non-strategic-upload` journey; on success the admin is taken to the upload summary, on validation failure back to the upload page with errors.

## 12. Accessibility

Target WCAG 2.2 AA (mandatory).

- **Semantic table:** `<table class="govuk-table">` with `<thead>`, `scope="col"` headers, and an `aria-label` naming the list. Seven columns in the AC-defined order.
- **Page title = h1:** the `<h1>` matches the document `<title>` ("Intellectual Property List (ChD) Daily Cause List").
- **Heading hierarchy:** h1 for the list title, h2 for "Search Cases".
- **Search input:** associated `<label>` (visually hidden) plus `aria-label`; keyboard operable.
- **Details component:** GOV.UK `govukDetails` for "Important information", keyboard toggleable.
- **Colour not sole carrier:** status/type conveyed as text only.
- **Bilingual:** language toggle present; `lang` attribute set correctly; all static strings translated (no hardcoded English).
- **Focus states & keyboard:** all links (FaCT link, back-to-top, downloads) reachable and operable by keyboard with visible focus.
- **Download links:** clearly labelled with format and, where available, file type/size.

## 13. Test Scenarios

* Validator returns valid for a fully-populated hearing array; returns invalid when each individual required field (`judge`, `time`, `venue`, `type`, `caseNumber`, `caseName`) is removed — one assertion per field, real schema, no mocks, deep-cloned fixture per test.
* Validator rejects a `time` value that does not match the time pattern, and rejects any field containing HTML markup.
* Excel-to-JSON converter maps all seven columns from the template to the correct JSON keys and preserves the field order.
* Page controller renders the template with `en`, `cy`, and `t` for a valid artefact of the correct list type.
* Page controller returns a 400 / `errors/common` when the artefact's `listTypeName` is not `INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST` (proves id-independence using an arbitrary `listTypeId` such as `999`).
* Template test (Cheerio): renders seven column headers in order, one row per hearing, correct cell values, and the FaCT link and back-to-top link present.
* Template test: renders Welsh headings/labels when the `cy` locale object is used; `Object.keys(en).sort()` equals `Object.keys(cy).sort()`.
* PDF generator produces a PDF for a valid artefact and is invoked via `PDF_GENERATOR_REGISTRY` keyed by the list type name.
* E2E journey (`@nightly`): a user navigates to the published Intellectual Property List (ChD) page, sees the hearings table, exercises the case search, switches to Welsh, passes an inline axe accessibility scan, and downloads the PDF and Excel versions.

## 14. Assumptions & Open Questions

* **Court address / location wording:** the Rolls Building address and any bespoke "Important information" text must be confirmed against the reference style guide page (`.../intellectual-property-list-chd-daily-cause-list?artefactId=...`). The address in this spec is a placeholder.
* **Rolls Building location does not exist yet:** there is no "Business and Property Courts Rolls Building" (or "Rolls Building") location in `libs/location/src/location-data.ts`. Confirm whether a new location must be created and linked to region `11` (Royal Courts of Justice Group), or whether the list attaches to an existing location such as Royal Courts of Justice (`locationId 4`).
* **Sub-jurisdiction choice:** this spec uses `subJurisdictionIds: [1]` (Civil Court) to match the sibling RCJ civil lists. As a Chancery Division / Business & Property Courts list, "High Court" (`subJurisdictionId 10`) may be more accurate — confirm with the business.
* **`additionalInformation` optionality:** the issue's sample always populates it, but existing RCJ schemas treat it as optional. This spec assumes it is optional (not in `required`). Confirm.
* **`type` field semantics:** assumed to be the hearing type (free text). Confirm whether a controlled vocabulary applies.
* **Excel template shape:** assumes a single worksheet with the seven columns in the AC order and a header row. Confirm the exact template (sheet name, header labels) with the business before building the converter config.
* **Welsh translations:** all `[TRANSLATE: ...]` markers must be resolved by the translation post-processing step before release; the Welsh friendly name in `list-type-data.ts` is currently a marker.
* **Numeric IDs:** per project rules, no `listTypeId` numeric values are used anywhere in code — all registration and guards key off the stable `INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST` name.


### Comment by OgechiOkelu on 2026-07-23T15:06:57Z

@plan

### Comment by OgechiOkelu on 2026-08-12T16:46:14Z

@plan 
