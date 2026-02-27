# Technical Plan: #425 — Tribunal Non-Strategic Publishing (UTCC, UTLC & UTAAC)

## 1. Technical Approach

Three new non-strategic list type modules will be created under `libs/list-types/`, each following the same structure as the reference module `libs/list-types/care-standards-tribunal-weekly-hearing-list/`. Each module is self-contained and registered explicitly in `apps/web/src/app.ts`.

The Excel converter for each module is registered as a side-effect import in `src/index.ts`, which ensures the converter is available as soon as the module is loaded by the web app. This is the same pattern used by the reference module.

The three list types share common infrastructure (validators, PDF utilities, email formatters, JSON validator) from `@hmcts/list-types-common`. No changes to that shared library are needed.

All three are `provenance=MANUAL_UPLOAD`, `isNonStrategic=true`, and `sensitivity=Public`.

### Key architectural decisions

- The `time` field is a plain string passthrough — no date formatting is applied, unlike the CST `date` field. The `normalizeTime` helper from `@hmcts/list-types-common` (replaces `.` with `:`) should be applied in the renderer to normalise uploaded values before display.
- The opening statements differ significantly between the three list types. All three include the standard "Observe a court..." hyperlink (`https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing`). UTAAC's opening statement has three distinct sections (Details, England and Wales, Scotland) and requires a more structured Nunjucks template.
- The email summary extracts Date, Time, and Case Reference Number for all three list types, per the acceptance criteria. For UTAAC, the relevant field is named `caseReferenceNumber` to match the ticket spec; for UTTC and UTLC the field is `caseReference`.
- Welsh translations are placeholder text throughout. All `cy.ts` files must mirror the `en.ts` structure exactly. Official Welsh translation is required before go-live (flagged below).

---

## 2. Module Structure

Three new modules are created at:

```
libs/list-types/upper-tribunal-tax-chancery-chamber-daily-hearing-list/
libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/
libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/
```

Each module follows this internal structure (identical to reference module):

```
<module-dir>/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts
    ├── index.ts
    ├── models/
    │   └── types.ts
    ├── schemas/
    │   └── <list-type-name>.json
    ├── conversion/
    │   └── <abbrev>-config.ts
    ├── rendering/
    │   └── renderer.ts
    ├── pages/
    │   ├── index.ts
    │   ├── en.ts
    │   ├── cy.ts
    │   └── <list-type-name>.njk
    ├── pdf/
    │   ├── pdf-generator.ts
    │   └── pdf-template.njk
    └── email-summary/
        └── summary-builder.ts
```

---

## 3. Schema Definitions

All three schemas use JSON Schema draft-07. All string fields use the HTML-tag-blocking pattern `^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$`. The `time` field uses pattern `^(\\d{1,2})([:.}]\\d{2})?\\s*[ap]m\\s*$` (case-insensitive, matches `9:30am`, `2pm`, `10.15am`).

### 3a. UT (T and CC) — `upper-tribunal-tax-chancery-chamber-daily-hearing-list.json`

Required fields: `time`, `caseReference`, `caseName`, `judges`, `members`, `hearingType`, `venue`, `additionalInformation`

| Field | Type | Required | Notes |
|---|---|---|---|
| `time` | string | Yes | Time pattern |
| `caseReference` | string | Yes | No-HTML pattern |
| `caseName` | string | Yes | No-HTML pattern |
| `judges` | string | Yes | No-HTML pattern |
| `members` | string | No | No-HTML pattern |
| `hearingType` | string | Yes | No-HTML pattern |
| `venue` | string | Yes | No-HTML pattern |
| `additionalInformation` | string | No | No-HTML pattern |

### 3b. UT (LC) — `upper-tribunal-lands-chamber-daily-hearing-list.json`

Required fields: `time`, `caseReference`, `caseName`, `judges`, `members`, `hearingType`, `venue`, `modeOfHearing`, `additionalInformation`

| Field | Type | Required | Notes |
|---|---|---|---|
| `time` | string | Yes | Time pattern |
| `caseReference` | string | Yes | No-HTML pattern |
| `caseName` | string | Yes | No-HTML pattern |
| `judges` | string | Yes | No-HTML pattern |
| `members` | string | No | No-HTML pattern |
| `hearingType` | string | Yes | No-HTML pattern |
| `venue` | string | Yes | No-HTML pattern |
| `modeOfHearing` | string | Yes | No-HTML pattern |
| `additionalInformation` | string | No | No-HTML pattern |

### 3c. UT (AAC) — `upper-tribunal-administrative-appeals-chamber-daily-hearing-list.json`

Required fields: `time`, `appellant`, `caseReferenceNumber`, `caseName`, `judges`, `members`, `modeOfHearing`, `venue`, `additionalInformation`

| Field | Type | Required | Notes |
|---|---|---|---|
| `time` | string | Yes | Time pattern |
| `appellant` | string | Yes | No-HTML pattern |
| `caseReferenceNumber` | string | Yes | No-HTML pattern |
| `caseName` | string | Yes | No-HTML pattern |
| `judges` | string | Yes | No-HTML pattern |
| `members` | string | No | No-HTML pattern |
| `modeOfHearing` | string | Yes | No-HTML pattern |
| `venue` | string | Yes | No-HTML pattern |
| `additionalInformation` | string | No | No-HTML pattern |

---

## 4. Conversion Config

Each module defines its own Excel converter config in `src/conversion/<abbrev>-config.ts` and registers it with the appropriate `listTypeId`. All use `validateTimeFormat` from `@hmcts/list-types-common` for the Time field and `validateNoHtmlTags` for all text fields. Optional fields (`members`, `additionalInformation`) set `required: false`.

### 4a. UTTC — `uttc-config.ts` — listTypeId: 24

Columns (in order): Time, Case Reference, Case Name, Judge(s), Member(s), Hearing Type, Venue, Additional Information

```typescript
registerConverter(24, createConverter(UTTC_EXCEL_CONFIG));
```

### 4b. UTLC — `utlc-config.ts` — listTypeId: 25

Columns (in order): Time, Case Reference, Case Name, Judge(s), Member(s), Hearing Type, Venue, Mode of Hearing, Additional Information

```typescript
registerConverter(25, createConverter(UTLC_EXCEL_CONFIG));
```

### 4c. UTAAC — `utaac-config.ts` — listTypeId: 26

Columns (in order): Time, Appellant, Case Reference Number, Case Name, Judge(s), Member(s), Mode of Hearing, Venue, Additional Information

```typescript
registerConverter(26, createConverter(UTAAC_EXCEL_CONFIG));
```

---

## 5. Content Specification

### 5a. UT (T and CC) Daily Hearing List

**Page title:** `Upper Tribunal Tax and Chancery Chamber Daily Hearing List`

**Upload form display name:** `UT (T and CC) Daily Hearing List`

**Front-end summary display name:** `Upper Tribunal Tax and Chancery Chamber Daily Hearing list - <date>`

**Opening statement:**

> A representative of the media, or any other person, wishing to attend a remote hearing should contact [uttc@justice.gov.uk](mailto:uttc@justice.gov.uk) and we will arrange for your attendance.
> [Observe a court or tribunal hearing as a journalist, researcher or member of the public](https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing)

**Table headers:** Time, Case Reference, Case Name, Judge(s), Member(s), Hearing Type, Venue, Additional Information

**en.ts key fields:**
```typescript
pageTitle: "Upper Tribunal Tax and Chancery Chamber Daily Hearing List",
openingStatementText: "A representative of the media, or any other person, wishing to attend a remote hearing should contact uttc@justice.gov.uk and we will arrange for your attendance.",
openingStatementEmail: "uttc@justice.gov.uk",
openingStatementEmailHref: "mailto:uttc@justice.gov.uk",
observeLinkText: "Observe a court or tribunal hearing as a journalist, researcher or member of the public",
observeLinkUrl: "https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing",
tableHeaders: {
  time: "Time",
  caseReference: "Case Reference",
  caseName: "Case Name",
  judges: "Judge(s)",
  members: "Member(s)",
  hearingType: "Hearing Type",
  venue: "Venue",
  additionalInformation: "Additional Information"
}
```

---

### 5b. UT (LC) Daily Hearing List

**Page title:** `Upper Tribunal (Lands Chamber) Daily Hearing List`

**Upload form display name:** `UT (LC) Daily Hearing List`

**Front-end summary display name:** `Upper Tribunal (Lands Chamber) Daily Hearing list – <date>`

**Opening statement:**

> If a representative of the media or a member of the public wishes to attend a Cloud Video Platform (CVP) hearing they should contact the Lands Chamber listing section [Lands@justice.gov.uk](mailto:Lands@justice.gov.uk) who will provide further information.
> [Observe a court or tribunal hearing as a journalist, researcher or member of the public](https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing)

**Table headers:** Time, Case Reference, Case Name, Judge(s), Member(s), Hearing Type, Venue, Mode of Hearing, Additional Information

**en.ts key fields:**
```typescript
pageTitle: "Upper Tribunal (Lands Chamber) Daily Hearing List",
openingStatementText: "If a representative of the media or a member of the public wishes to attend a Cloud Video Platform (CVP) hearing they should contact the Lands Chamber listing section Lands@justice.gov.uk who will provide further information.",
openingStatementEmail: "Lands@justice.gov.uk",
openingStatementEmailHref: "mailto:Lands@justice.gov.uk",
observeLinkText: "Observe a court or tribunal hearing as a journalist, researcher or member of the public",
observeLinkUrl: "https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing",
tableHeaders: {
  time: "Time",
  caseReference: "Case Reference",
  caseName: "Case Name",
  judges: "Judge(s)",
  members: "Member(s)",
  hearingType: "Hearing Type",
  venue: "Venue",
  modeOfHearing: "Mode of Hearing",
  additionalInformation: "Additional Information"
}
```

---

### 5c. UT (AAC) Daily Hearing List

**Page title:** `Upper Tribunal (Administrative Appeals Chamber) Daily Hearing List`

**Upload form display name:** `UT (AAC) Daily Hearing List`

**Front-end summary display name:** `Upper Tribunal (Administrative Appeals Chamber) Daily Hearing list - <date>`

**Opening statement (multi-section):**

**Details**
> Lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives.

**England and Wales**
> Remote hearings via CVP and BT Meet Me
> Hearings will be available to representatives of the media or any other member of the public, on their request, and therefore will be a hearing conducted in public in accordance with Rule 37 of the Tribunal Procedure (Upper Tribunal) Rules 2008.
> Any media representative or any other member of the public wishing to witness the hearing will need to do so over the internet and provide an email address at which to be sent an appropriate link for access.
> Please contact [adminappeals@justice.gov.uk](mailto:adminappeals@justice.gov.uk).

**Scotland**
> Remote hearings
> When hearings are listed for Scotland the hearing will be available to representatives of the media or any other member of the public, on their request, and therefore will be a hearing conducted in public in accordance with Rule 37 of the Tribunal Procedure (Upper Tribunal) Rules 2008. It will be organised and conducted using Cloud Video Platform (CVP). Any media representative or any other member of the public wishing to witness the hearing will need to do so over the internet and provide an email address at which to be sent an appropriate link for access. Please contact [UTAACMailbox@justice.gov.uk](mailto:UTAACMailbox@justice.gov.uk).

Note: UTAAC does not include the "Observe a court..." hyperlink — the ticket only specifies it for UTTC and UTLC.

**Table headers:** Time, Appellant, Case Reference Number, Case Name, Judge(s), Member(s), Mode of Hearing, Venue, Additional Information

**en.ts key fields:**
```typescript
pageTitle: "Upper Tribunal (Administrative Appeals Chamber) Daily Hearing List",
openingStatement: {
  detailsTitle: "Details",
  detailsText: "Lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives.",
  englandWalesTitle: "England and Wales",
  englandWalesSubtitle: "Remote hearings via CVP and BT Meet Me",
  englandWalesText: "Hearings will be available to representatives of the media or any other member of the public, on their request, and therefore will be a hearing conducted in public in accordance with Rule 37 of the Tribunal Procedure (Upper Tribunal) Rules 2008.",
  englandWalesText2: "Any media representative or any other member of the public wishing to witness the hearing will need to do so over the internet and provide an email address at which to be sent an appropriate link for access.",
  englandWalesContactText: "Please contact",
  englandWalesEmail: "adminappeals@justice.gov.uk",
  englandWalesEmailHref: "mailto:adminappeals@justice.gov.uk",
  scotlandTitle: "Scotland",
  scotlandSubtitle: "Remote hearings",
  scotlandText: "When hearings are listed for Scotland the hearing will be available to representatives of the media or any other member of the public, on their request, and therefore will be a hearing conducted in public in accordance with Rule 37 of the Tribunal Procedure (Upper Tribunal) Rules 2008. It will be organised and conducted using Cloud Video Platform (CVP). Any media representative or any other member of the public wishing to witness the hearing will need to do so over the internet and provide an email address at which to be sent an appropriate link for access. Please contact",
  scotlandEmail: "UTAACMailbox@justice.gov.uk",
  scotlandEmailHref: "mailto:UTAACMailbox@justice.gov.uk"
},
tableHeaders: {
  time: "Time",
  appellant: "Appellant",
  caseReferenceNumber: "Case Reference Number",
  caseName: "Case Name",
  judges: "Judge(s)",
  members: "Member(s)",
  modeOfHearing: "Mode of Hearing",
  venue: "Venue",
  additionalInformation: "Additional Information"
}
```

---

## 6. Welsh Content Notes

All `cy.ts` files must mirror the `en.ts` structure exactly (same keys, same nesting). The current pattern in the codebase is to use Welsh placeholders for new non-strategic list types (e.g., `"Welsh placeholder"` in `mock-list-types.ts`).

**Fields requiring official Welsh translation before go-live:**
- `pageTitle`
- All `tableHeaders` values
- `openingStatement*` fields (all text, including contact instructions)
- `observeLinkText`
- `importantInformationTitle` (or equivalent section heading)
- `lastUpdated`, `at`, `dataSource`, `backToTop`
- `searchCasesTitle`, `searchCasesLabel`
- `cautionNote`, `cautionReporting`
- `provenanceLabels.MANUAL_UPLOAD`

Until official translations are provided, `cy.ts` should duplicate the English strings. Do not use machine translation.

---

## 7. Error Handling and Edge Cases

- **Missing `artefactId` query param:** Return 400 with `errors/common` template — consistent with CST pattern.
- **Artefact not found in database:** Return 404 with `errors/common` template.
- **JSON file not found on disk:** Return 404 with `errors/common` template. Log the error with path for debugging.
- **JSON fails schema validation:** Return 400 with `errors/common` template. Log validation errors at `console.error`.
- **Unexpected runtime error:** Return 500 with `errors/common` template. Log the full error.
- **Optional fields (`members`, `additionalInformation`):** JSON schema marks these as not required. The renderer must handle `undefined`/empty string safely — pass through as-is; Nunjucks will render an empty cell without error.
- **`time` normalisation:** Apply `normalizeTime` (replaces `.` with `:`) in the renderer before passing to the template, to handle both `9.30am` and `9:30am` from the Excel upload.
- **Empty hearing list:** Schema `minRows: 1` enforces at least one row at conversion time. However, if an empty array reaches the renderer or PDF generator, it should not crash — Nunjucks `{% for %}` handles empty arrays gracefully.

---

## 8. Acceptance Criteria Mapping

| Acceptance Criterion | Implementation |
|---|---|
| Validation schemas created for each list | Three JSON schemas in `src/schemas/` for each module |
| Error handling for validation schema | `createJsonValidator` from common lib + 400/404/500 error responses in `pages/index.ts` |
| Valid publications saved via current method | Converter registered via `registerConverter` — existing upload infrastructure handles storage |
| List types classified (Public, Private, etc.) | `isNonStrategic: true`, provenance `MANUAL_UPLOAD` in `mock-list-types.ts`; sensitivity Public |
| New PDF template for each list | `src/pdf/pdf-template.njk` and `src/pdf/pdf-generator.ts` per module |
| Unified email summary format | `src/email-summary/summary-builder.ts` using `formatCaseSummaryForEmail` from common |
| Email summary fields: Date, Time, Case Reference | `extractCaseSummary` returns `[{ label: "Date" }, { label: "Time" }, { label: "Case Reference" (or Number) }]` |
| New style guide (Nunjucks template) for each list | `src/pages/<list-type-name>.njk` per module |
| List manipulation for style guide | `src/rendering/renderer.ts` per module (field pass-through + time normalisation) |
| Front-end summary display names | `englishFriendlyName` in `mock-list-types.ts` |
| Upload form display names | `name` field (short name) in `mock-list-types.ts` |
| Region: National for UTTC & UTLC, London for UTAAC | Recorded in `mock-list-types.ts` comment; region assignment handled by the admin upload form, not the list type module itself |
| Opening statements per tribunal | Content in `en.ts` / `cy.ts`, rendered in `index.njk` |
| "Observe a court..." link masked | `<a href="{{ t.observeLinkUrl }}">{{ t.observeLinkText }}</a>` in template |
| Fields per list type | Schema properties + table headers in template |

---

## 9. Changes to Existing Files

### `libs/list-types/common/src/mock-list-types.ts`
Add three new entries at the end of the `mockListTypes` array:

```typescript
{
  id: 24,
  name: "UT_TAX_CHANCERY_DAILY_HEARING_LIST",
  englishFriendlyName: "Upper Tribunal Tax and Chancery Chamber Daily Hearing List",
  welshFriendlyName: "Welsh placeholder",
  provenance: "MANUAL_UPLOAD",
  urlPath: "upper-tribunal-tax-chancery-chamber-daily-hearing-list",
  isNonStrategic: true
},
{
  id: 25,
  name: "UT_LANDS_CHAMBER_DAILY_HEARING_LIST",
  englishFriendlyName: "Upper Tribunal (Lands Chamber) Daily Hearing List",
  welshFriendlyName: "Welsh placeholder",
  provenance: "MANUAL_UPLOAD",
  urlPath: "upper-tribunal-lands-chamber-daily-hearing-list",
  isNonStrategic: true
},
{
  id: 26,
  name: "UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST",
  englishFriendlyName: "Upper Tribunal (Administrative Appeals Chamber) Daily Hearing List",
  welshFriendlyName: "Welsh placeholder",
  provenance: "MANUAL_UPLOAD",
  urlPath: "upper-tribunal-administrative-appeals-chamber-daily-hearing-list",
  isNonStrategic: true
}
```

### `tsconfig.json`
Add three path mappings under `compilerOptions.paths`:
```json
"@hmcts/upper-tribunal-tax-chancery-chamber-daily-hearing-list": ["libs/list-types/upper-tribunal-tax-chancery-chamber-daily-hearing-list/src"],
"@hmcts/upper-tribunal-lands-chamber-daily-hearing-list": ["libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src"],
"@hmcts/upper-tribunal-administrative-appeals-chamber-daily-hearing-list": ["libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src"]
```

### `apps/web/src/app.ts`
For each module, add an import at the top:
```typescript
import { moduleRoot as uttcModuleRoot, pageRoutes as uttcRoutes } from "@hmcts/upper-tribunal-tax-chancery-chamber-daily-hearing-list/config";
import { moduleRoot as utlcModuleRoot, pageRoutes as utlcRoutes } from "@hmcts/upper-tribunal-lands-chamber-daily-hearing-list/config";
import { moduleRoot as utaacModuleRoot, pageRoutes as utaacRoutes } from "@hmcts/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/config";
```

Add module roots to `modulePaths` array and register routes with `createSimpleRouter` in the list type routes block.

---

## 10. Open Questions / Clarifications Needed

1. **Welsh translations:** The ticket does not provide Welsh text for any of the three new list types. This plan uses English placeholders throughout `cy.ts`. Official Welsh translations must be provided by the content team and applied before the service can go live.

2. **"Observe a court..." link for UTAAC:** The ticket specifies this hyperlink for UTTC and UTLC opening statements. The UTAAC opening statement (as written in the ticket) does not include this link. This plan does not add it to UTAAC. If it should be included, the template and `en.ts`/`cy.ts` for UTAAC need updating.

3. **`members` field — required or optional?** The ticket lists Member(s) as a display field but does not specify whether it is mandatory. This plan marks it `required: false` in the schema (same approach as `additionalInformation`), since a hearing may not always have members. If it is always present, change to `required: true` in the JSON schema and set `required: true` in the converter config.

4. **`additionalInformation` field — required?** The ticket lists it as a display field without specifying mandatory status. This plan marks it optional (consistent with the RCJ pattern). Confirm whether it should always be present.

5. **Region assignment:** The ticket states UTTC and UTLC are "National" region and UTAAC is "London". The `mock-list-types.ts` `ListType` interface does not currently have a `region` field. If the region needs to be stored in the list type metadata, the interface and all existing entries will need updating. This plan does not add a `region` field — clarify whether region is metadata on the list type or is set per-publication during the upload workflow.

6. **Short names in upload form:** The ticket specifies upload form display names as "UT (T and CC) Daily Hearing List", "UT (LC) Daily Hearing List", "UT (AAC) Daily Hearing List". The `name` field in `mock-list-types.ts` is a machine-readable identifier (e.g., `CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST`). Clarify whether a separate human-readable `shortName` field is needed on the `ListType` interface, or whether the admin upload form derives the short name from the `englishFriendlyName`.
