# VIBE-317: Technical Implementation Plan - Royal Courts of Justice Hearing Lists

## Overview

Implement 14 hearing list types for Royal Courts of Justice and Administrative Courts through the non-strategic publishing route. This includes creating validation schemas, Excel templates, bilingual templates, PDF generation, and a unified RCJ landing page.

## Scope Summary

- **8 Standard Format Lists** (RCJ venue): 7-column table layout
- **1 Special Format (London Administrative Court)**: Two-tab Excel support (Main hearings + Planning Court)
- **1 Special Format (Court of Appeal Civil)**: Two-tab Excel support (Daily hearings + Future judgments)
- **4 Administrative Court Lists**: Standard 7-column format (different venues, outside RCJ)
- **1 RCJ Landing Page**: Hub for all RCJ hearing lists
- **Full bilingual support** (English/Welsh)
- **PDF generation** for all lists
- **Search functionality** for all lists

---

## Current State Analysis

### Existing Infrastructure

The system already has comprehensive infrastructure for hearing lists:

1. **List Type System** (`/libs/list-types/common/`):
   - List type registry with 9 existing types
   - Excel-to-JSON converter with validator framework
   - Field validation utilities (dates, HTML sanitization)
   - Non-strategic upload workflow

2. **Reference Implementation** (`/libs/list-types/care-standards-tribunal-weekly-hearing-list/`):
   - Complete module structure (6 fields)
   - Excel converter configuration
   - JSON schema validation
   - Nunjucks template with GOV.UK components
   - Bilingual content (en.ts / cy.ts)
   - Rendering layer for data transformation

3. **Location/Venue System** (`/libs/location/`):
   - Royal Courts of Justice location already exists (locationId: 4)
   - Region and jurisdiction linkage support
   - Seed data for database population

4. **Template Infrastructure**:
   - GOV.UK Design System components (tables, accordions, buttons)
   - Base templates with i18n support
   - Accessibility-compliant patterns

### Gap Analysis

**What needs to be created:**
- ❌ 13 new list type definitions (IDs 10-22)
- ❌ Royal Courts of Justice landing page
- ❌ 13 Excel converter configurations
- ❌ 13 JSON validation schemas
- ❌ 13 rendering implementations
- ❌ 13 Nunjucks templates (3 unique layouts: standard, London Admin Court with Planning Court tab, Court of Appeal Civil)
- ❌ PDF generation system
- ❌ 4 Administrative Court venue configurations
- ❌ Welsh translations for all content
- ❌ Search JavaScript for client-side filtering

**What can be reused:**
- ✅ Converter framework and validation utilities
- ✅ Base template layouts
- ✅ GOV.UK component macros
- ✅ i18n middleware
- ✅ Artefact upload workflow
- ✅ Database schema (no changes needed)

---

## Technical Architecture

### High-Level Strategy

**Modular Approach**: Create separate modules for each distinct template layout to maximize code reuse:

1. **Module 1: `rcj-standard-daily-cause-list`** (8 lists)
   - Shared 7-column table template
   - Parameterized by list type ID
   - Reusable renderer and validator

2. **Module 2: `london-administrative-court-daily-cause-list`** (1 list)
   - Two-tab Excel support (Main hearings + Planning Court)
   - Dual sub-sections in display
   - Planning Court section with header
   - 7 columns for both tabs

3. **Module 3: `rcj-court-of-appeal-civil`** (1 list)
   - Two-tab Excel support
   - Dual sub-sections in display
   - 8 columns (Date column in Tab 2)

4. **Module 4: `administrative-court-daily-cause-list`** (4 lists)
   - Same as Module 1 (7-column table)
   - Different venues/regions (outside RCJ)

5. **Module 5: `rcj-landing-page`**
   - Venue hub page
   - Lists all RCJ hearing lists alphabetically
   - FaCT link and caution message

**Alternative Approach**: Create 13 separate modules (one per list type) for maximum flexibility but more code duplication.

**Recommendation**: Use modular approach (Modules 1-5) to minimize duplication while maintaining clarity.

---

### Module Structure

#### Module 1: RCJ Standard Daily Cause List

**Location**: `libs/list-types/rcj-standard-daily-cause-list/`

**Supports 8 List Types:**
1. Civil Courts at the RCJ Daily Cause List (ID 10)
2. County Court at Central London Civil Daily Cause List (ID 11)
3. Court of Appeal (Criminal Division) Daily Cause List (ID 12)
4. Family Division of the High Court Daily Cause List (ID 13)
5. King's Bench Division Daily Cause List (ID 14)
6. King's Bench Masters Daily Cause List (ID 15)
7. Mayor & City Civil Daily Cause List (ID 16)
8. Senior Courts Costs Office Daily Cause List (ID 17)

**File Structure:**
```
rcj-standard-daily-cause-list/
├── package.json
├── tsconfig.json
├── src/
│   ├── config.ts                        # Module exports
│   ├── index.ts                         # Business logic exports
│   ├── pages/
│   │   ├── index.ts                     # GET handler (detects list type)
│   │   ├── standard-daily-cause-list.njk  # Shared template
│   │   ├── en.ts                        # English content (all lists)
│   │   └── cy.ts                        # Welsh content (all lists)
│   ├── models/
│   │   └── types.ts                     # StandardHearing interface
│   ├── conversion/
│   │   └── standard-config.ts           # Registers 8 converters
│   ├── validation/
│   │   └── json-validator.ts            # Single validator for all 8
│   ├── rendering/
│   │   └── renderer.ts                  # Formats data for template
│   └── schemas/
│       └── standard-daily-cause-list.json  # JSON Schema (7 fields)
```

**Key Implementation Details:**

**7 Fields (Standard):**
1. Venue (string)
2. Judge (string)
3. Time (string, HH:MM format)
4. Case Number (string)
5. Case Details (string, multi-line)
6. Hearing Type (string)
7. Additional Information (string, multi-line)

**Excel Converter Configuration:**
```typescript
// src/conversion/standard-config.ts
const STANDARD_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    { header: "Venue", fieldName: "venue", required: true, validators: [validateNoHtmlTags] },
    { header: "Judge", fieldName: "judge", required: true, validators: [validateNoHtmlTags] },
    { header: "Time", fieldName: "time", required: true, validators: [validateTimeFormat] },
    { header: "Case Number", fieldName: "caseNumber", required: true, validators: [validateNoHtmlTags] },
    { header: "Case Details", fieldName: "caseDetails", required: true, validators: [validateNoHtmlTags] },
    { header: "Hearing Type", fieldName: "hearingType", required: true, validators: [validateNoHtmlTags] },
    { header: "Additional Information", fieldName: "additionalInformation", required: false, validators: [validateNoHtmlTags] }
  ],
  minRows: 1
};

// Register all 8 converters with same config
for (const listTypeId of [10, 11, 12, 13, 14, 15, 16, 17]) {
  registerConverter(listTypeId, createConverter(STANDARD_EXCEL_CONFIG));
}
```

**Page Handler:**
```typescript
// src/pages/index.ts
export const GET = async (req: Request, res: Response) => {
  const artefactId = req.query.artefactId as string;
  const locale = res.locals.locale || "en";

  // Load artefact metadata to get listTypeId
  const artefact = await loadArtefact(artefactId);
  const listTypeId = artefact.listTypeId;

  // Load JSON data
  const jsonData = await loadJsonData(artefactId);

  // Validate
  const validationResult = validateStandardDailyCauseList(jsonData);
  if (!validationResult.isValid) {
    return res.status(400).render("error", { errors: validationResult.errors });
  }

  // Render data
  const renderedData = renderStandardDailyCauseList(jsonData, listTypeId, locale);

  // Get content based on list type and locale
  const content = getContentForListType(listTypeId, locale);

  res.render("rcj-standard-daily-cause-list/standard-daily-cause-list", {
    content,
    header: renderedData.header,
    data: renderedData.hearings,
    artefactId,
    listTypeId
  });
};
```

**Template Structure:**
```html
<!-- src/pages/standard-daily-cause-list.njk -->
{% extends "layouts/base-template.njk" %}
{% from "govuk/components/table/macro.njk" import govukTable %}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-full">

    <h1 class="govuk-heading-xl">{{ content.pageTitle }}</h1>

    <!-- Special content for Court of Appeal (Criminal Division) -->
    {% if listTypeId == 12 %}
      <p class="govuk-body">
        For further information about our hearings, please see
        <a href="{{ content.quickGuideUrl }}" class="govuk-link">{{ content.quickGuideText }}</a>
      </p>
    {% endif %}

    <!-- Search input -->
    {{ govukInput({
      id: "search-cases",
      name: "searchCases",
      label: { text: content.search.label, classes: "govuk-label--m" }
    }) }}

    <!-- Hearings table -->
    {{ govukTable({
      head: [
        { text: content.tableHeaders.venue },
        { text: content.tableHeaders.judge },
        { text: content.tableHeaders.time },
        { text: content.tableHeaders.caseNumber },
        { text: content.tableHeaders.caseDetails },
        { text: content.tableHeaders.hearingType },
        { text: content.tableHeaders.additionalInformation }
      ],
      rows: data
    }) }}

    <!-- Download PDF -->
    {{ govukButton({
      text: content.downloadPdf,
      classes: "govuk-button--secondary",
      href: "/rcj-standard-daily-cause-list/pdf?artefactId=" + artefactId
    }) }}

    <p class="govuk-body">
      <a href="/royal-courts-of-justice" class="govuk-link">{{ content.back }}</a>
    </p>

  </div>
</div>
{% endblock %}
```

**Content Structure (en.ts):**
```typescript
export const en = {
  10: {  // Civil Courts at the RCJ
    pageTitle: "Civil Courts at the RCJ Daily Cause List",
    // ... rest of content
  },
  11: {  // County Court at Central London Civil
    pageTitle: "County Court at Central London Civil Daily Cause List",
    // ... rest of content
  },
  12: {  // Court of Appeal (Criminal Division)
    pageTitle: "Court of Appeal (Criminal Division) Daily Cause List",
    quickGuideText: "this quick guide",
    quickGuideUrl: "https://www.judiciary.uk/wp-content/uploads/2025/07/A-QUICK-GUIDE-TO-HEARINGS-IN-THE-CACD.docx",
    // ... rest of content
  },
  // ... entries for IDs 13-17
  common: {
    tableHeaders: {
      venue: "Venue",
      judge: "Judge",
      time: "Time",
      caseNumber: "Case Number",
      caseDetails: "Case Details",
      hearingType: "Hearing Type",
      additionalInformation: "Additional Information"
    },
    search: { label: "Search cases" },
    downloadPdf: "Download PDF",
    back: "Back",
    errors: { /* ... */ }
  }
};
```

---

#### Module 2: London Administrative Court Daily Cause List

**Location**: `libs/list-types/london-administrative-court-daily-cause-list/`

**Supports 1 List Type:**
- London Administrative Court Daily Cause List (ID 18)

**File Structure:**
```
london-administrative-court-daily-cause-list/
├── package.json
├── tsconfig.json
├── src/
│   ├── config.ts
│   ├── index.ts
│   ├── pages/
│   │   ├── index.ts                     # GET handler
│   │   ├── london-admin-court.njk       # Two-section template
│   │   ├── en.ts                        # English content
│   │   └── cy.ts                        # Welsh content
│   ├── models/
│   │   └── types.ts                     # StandardHearing interface
│   ├── conversion/
│   │   └── london-admin-config.ts       # Two-tab converter
│   ├── validation/
│   │   └── json-validator.ts
│   ├── rendering/
│   │   └── renderer.ts                  # Formats both sections
│   └── schemas/
│       └── london-admin-court.json
```

**Special Requirements:**
- Excel template with 2 tabs
- **Tab 1 (Main hearings):** 7 fields (Venue, Judge, Time, Case Number, Case Details, Hearing Type, Additional Information)
- **Tab 2 (Planning Court):** Header "Planning Court" + 7 fields (same as Tab 1)
- Display as two sub-sections on single page

**Excel Converter Configuration:**
```typescript
// src/conversion/london-admin-config.ts
const LONDON_ADMIN_CONFIG: ExcelConverterConfig = {
  sheets: [
    {
      name: "Main hearings",
      fields: [
        { header: "Venue", fieldName: "venue", required: true },
        { header: "Judge", fieldName: "judge", required: true },
        { header: "Time", fieldName: "time", required: true },
        { header: "Case Number", fieldName: "caseNumber", required: true },
        { header: "Case Details", fieldName: "caseDetails", required: true },
        { header: "Hearing Type", fieldName: "hearingType", required: true },
        { header: "Additional Information", fieldName: "additionalInformation", required: false }
      ],
      minRows: 0  // Optional tab
    },
    {
      name: "Planning Court",
      fields: [
        { header: "Venue", fieldName: "venue", required: true },
        { header: "Judge", fieldName: "judge", required: true },
        { header: "Time", fieldName: "time", required: true },
        { header: "Case Number", fieldName: "caseNumber", required: true },
        { header: "Case Details", fieldName: "caseDetails", required: true },
        { header: "Hearing Type", fieldName: "hearingType", required: true },
        { header: "Additional Information", fieldName: "additionalInformation", required: false }
      ],
      minRows: 0  // Optional tab
    }
  ]
};
```

**Data Structure:**
```typescript
interface LondonAdminCourtData {
  mainHearings: StandardHearing[];
  planningCourt: StandardHearing[];
}
```

**Template:**
```html
<h1>{{ content.pageTitle }}</h1>

<!-- Sub-section 1: Main hearings -->
{% if mainHearings.length > 0 %}
<h2 class="govuk-heading-l">{{ content.mainHearings }}</h2>
{{ govukTable({ /* ... main hearings data ... */ }) }}
{% endif %}

<!-- Sub-section 2: Planning Court -->
{% if planningCourt.length > 0 %}
<h2 class="govuk-heading-l">{{ content.planningCourt }}</h2>
{{ govukTable({ /* ... planning court data ... */ }) }}
{% endif %}
```

---

#### Module 3: Court of Appeal (Civil Division)

**Location**: `libs/list-types/rcj-court-of-appeal-civil/`

**Supports 1 List Type:**
- Court of Appeal (Civil Division) Daily Cause List (ID 19)

**Special Requirements:**
- Excel template with 2 tabs
- **Tab 1 (Daily hearings):** 7 fields (standard)
- **Tab 2 (Notice for future judgments):** 8 fields (adds "Date" field)
- Display as two sub-sections on single page

**Excel Converter Configuration:**
```typescript
// src/conversion/civil-appeal-config.ts
const CIVIL_APPEAL_CONFIG: ExcelConverterConfig = {
  sheets: [
    {
      name: "Daily hearings",
      fields: [
        { header: "Venue", fieldName: "venue", required: true },
        { header: "Judge", fieldName: "judge", required: true },
        { header: "Time", fieldName: "time", required: true },
        { header: "Case Number", fieldName: "caseNumber", required: true },
        { header: "Case Details", fieldName: "caseDetails", required: true },
        { header: "Hearing Type", fieldName: "hearingType", required: true },
        { header: "Additional Information", fieldName: "additionalInformation", required: false }
      ],
      minRows: 0  // Optional tab
    },
    {
      name: "Notice for future judgments",
      fields: [
        { header: "Date", fieldName: "date", required: true, validators: [validateDateFormat] },
        { header: "Venue", fieldName: "venue", required: true },
        { header: "Judge", fieldName: "judge", required: true },
        { header: "Time", fieldName: "time", required: true },
        { header: "Case Number", fieldName: "caseNumber", required: true },
        { header: "Case Details", fieldName: "caseDetails", required: true },
        { header: "Hearing Type", fieldName: "hearingType", required: true },
        { header: "Additional Information", fieldName: "additionalInformation", required: false }
      ],
      minRows: 0  // Optional tab
    }
  ]
};
```

**Data Structure:**
```typescript
interface CourtOfAppealCivilData {
  dailyHearings: StandardHearing[];
  futureJudgments: FutureJudgment[];  // FutureJudgment extends StandardHearing { date: string }
}
```

**Template:**
```html
<h1>{{ content.pageTitle }}</h1>

<!-- Sub-section 1: Daily hearings -->
<h2 class="govuk-heading-l">{{ content.dailyHearings }}</h2>
{{ govukTable({ /* ... daily hearings data ... */ }) }}

<!-- Sub-section 2: Notice for future judgments -->
<h2 class="govuk-heading-l">{{ content.futureJudgments }}</h2>
{{ govukTable({ /* ... future judgments data with Date column ... */ }) }}
```

---

#### Module 4: Administrative Court Daily Cause List

**Location**: `libs/list-types/administrative-court-daily-cause-list/`

**Supports 4 List Types:**
1. Birmingham Administrative Court Daily Cause List (ID 20)
2. Leeds Administrative Court Daily Cause List (ID 21)
3. Bristol and Cardiff Administrative Court Daily Cause List (ID 22)
4. Manchester Administrative Court Daily Cause List (ID 23)

**Implementation:** Same as Module 1 (standard 7-column layout), but different venues/regions.

**Venue Configuration Required:**
- Birmingham Administrative Court (locationId: TBD, region: Midlands)
- Leeds Administrative Court (locationId: TBD, region: Yorkshire)
- Bristol and Cardiff Administrative Court (locationId: TBD, region: Wales and South West)
- Manchester Administrative Court (locationId: TBD, region: North West)

**Note:** Can reuse Module 1's code entirely. Only difference is list type IDs, venue names, and content strings.

---

#### Module 5: RCJ Landing Page

**Location**: `libs/public-pages/src/pages/royal-courts-of-justice/`

**Purpose:** Central hub listing all RCJ hearing lists alphabetically

**File Structure:**
```
royal-courts-of-justice/
├── index.ts                  # GET handler
├── royal-courts-of-justice.njk  # Template
├── en.ts                     # English content
└── cy.ts                     # Welsh content
```

**Page Handler:**
```typescript
// index.ts
export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";

  // Get all RCJ list types (IDs 10-18, including London Admin Court)
  const rcjListTypes = mockListTypes.filter(lt =>
    [10, 11, 12, 13, 14, 15, 16, 17, 18].includes(lt.id)
  );

  // Sort alphabetically
  const sortedLists = rcjListTypes
    .map(lt => ({
      id: lt.id,
      name: locale === "cy" ? lt.welshFriendlyName : lt.englishFriendlyName,
      urlPath: lt.urlPath
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const content = locale === "cy" ? cy : en;

  res.render("royal-courts-of-justice/royal-courts-of-justice", {
    content,
    hearingLists: sortedLists
  });
};
```

**Template:**
```html
<h1>{{ content.pageTitle }}</h1>

<p class="govuk-body">
  <a href="{{ content.factLink.url }}" class="govuk-link">{{ content.factLink.text }}</a>
</p>

<div class="govuk-warning-text">
  <span class="govuk-warning-text__icon" aria-hidden="true">!</span>
  <strong class="govuk-warning-text__text">
    <span class="govuk-visually-hidden">Warning</span>
    {{ content.cautionMessage }}
  </strong>
</div>

<h2 class="govuk-heading-l">{{ content.hearingListsHeading }}</h2>

<ul class="govuk-list">
  {% for list in hearingLists %}
  <li>
    <a href="/{{ list.urlPath }}" class="govuk-link">{{ list.name }}</a>
  </li>
  {% endfor %}
</ul>
```

**Content (en.ts):**
```typescript
export const en = {
  pageTitle: "What do you want to view from Royal Courts of Justice?",
  factLink: {
    text: "Find contact details and other information about courts and tribunals in England and Wales, and some non-devolved tribunals in Scotland.",
    url: "https://www.find-court-tribunal.service.gov.uk/"
  },
  cautionMessage: "These lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives. If you do not see a list published for the court you are looking for, it means there are no hearings scheduled.",
  hearingListsHeading: "Hearing lists"
};
```

---

### List Type Registration

**File**: `/libs/list-types/common/src/mock-list-types.ts`

Add 13 new list type definitions:

```typescript
export const mockListTypes: ListType[] = [
  // ... existing IDs 1-9 ...

  // RCJ Standard Format (Module 1)
  {
    id: 10,
    name: "CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST",
    englishFriendlyName: "Civil Courts at the RCJ Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol y Llysoedd Sifil yn y Llys Barn Brenhinol",
    provenance: "MANUAL_UPLOAD",
    urlPath: "civil-courts-rcj-daily-cause-list",
    isNonStrategic: true
  },
  {
    id: 11,
    name: "COUNTY_COURT_CENTRAL_LONDON_CIVIL_DAILY_CAUSE_LIST",
    englishFriendlyName: "County Court at Central London Civil Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Sifil Llys Sirol Canolog Llundain",
    provenance: "MANUAL_UPLOAD",
    urlPath: "county-court-central-london-civil-daily-cause-list",
    isNonStrategic: true
  },
  {
    id: 12,
    name: "COURT_OF_APPEAL_CRIMINAL_DIVISION_DAILY_CAUSE_LIST",
    englishFriendlyName: "Court of Appeal (Criminal Division) Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol y Llys Apêl (Adran Droseddol)",
    provenance: "MANUAL_UPLOAD",
    urlPath: "court-of-appeal-criminal-division-daily-cause-list",
    isNonStrategic: true
  },
  {
    id: 13,
    name: "FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST",
    englishFriendlyName: "Family Division of the High Court Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Adran Deulu'r Uchel Lys",
    provenance: "MANUAL_UPLOAD",
    urlPath: "family-division-high-court-daily-cause-list",
    isNonStrategic: true
  },
  {
    id: 14,
    name: "KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST",
    englishFriendlyName: "King's Bench Division Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Adran Mainc y Brenin",
    provenance: "MANUAL_UPLOAD",
    urlPath: "kings-bench-division-daily-cause-list",
    isNonStrategic: true
  },
  {
    id: 15,
    name: "KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST",
    englishFriendlyName: "King's Bench Masters Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Meistri Mainc y Brenin",
    provenance: "MANUAL_UPLOAD",
    urlPath: "kings-bench-masters-daily-cause-list",
    isNonStrategic: true
  },
  {
    id: 16,
    name: "LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
    englishFriendlyName: "London Administrative Court Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol y Llys Gweinyddol Llundain",
    provenance: "MANUAL_UPLOAD",
    urlPath: "london-administrative-court-daily-cause-list",
    isNonStrategic: true
  },
  {
    id: 17,
    name: "MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST",
    englishFriendlyName: "Mayor & City Civil Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Sifil Dyddiol y Maer a'r Ddinas",
    provenance: "MANUAL_UPLOAD",
    urlPath: "mayor-city-civil-daily-cause-list",
    isNonStrategic: true
  },
  {
    id: 18,
    name: "SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST",
    englishFriendlyName: "Senior Courts Costs Office Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Swyddfa Costau'r Uchel Lysoedd",
    provenance: "MANUAL_UPLOAD",
    urlPath: "senior-courts-costs-office-daily-cause-list",
    isNonStrategic: true
  },

  // RCJ Special Format - Family (Module 2)
  {
    id: 19,
    name: "FAMILY_DAILY_CAUSE_LIST_RCJ",
    englishFriendlyName: "Family Daily Cause List for Royal Courts of Justice",
    welshFriendlyName: "Rhestr Achosion Dyddiol y Llys Teulu ar Llys Barn Brenhinol",
    provenance: "MANUAL_UPLOAD",
    urlPath: "family-daily-cause-list-rcj",
    isNonStrategic: true
  },

  // RCJ Special Format - Civil Appeal (Module 3)
  {
    id: 20,
    name: "COURT_OF_APPEAL_CIVIL_DIVISION_DAILY_CAUSE_LIST",
    englishFriendlyName: "Court of Appeal (Civil Division) Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol y Llys Apêl (Adran Sifil)",
    provenance: "MANUAL_UPLOAD",
    urlPath: "court-of-appeal-civil-division-daily-cause-list",
    isNonStrategic: true
  },

  // Administrative Courts (Module 4)
  {
    id: 21,
    name: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
    englishFriendlyName: "Birmingham Administrative Court Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol y Llys Gweinyddol Birmingham",
    provenance: "MANUAL_UPLOAD",
    urlPath: "birmingham-administrative-court-daily-cause-list",
    isNonStrategic: true
  },
  {
    id: 22,
    name: "LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
    englishFriendlyName: "Leeds Administrative Court Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol y Llys Gweinyddol Leeds",
    provenance: "MANUAL_UPLOAD",
    urlPath: "leeds-administrative-court-daily-cause-list",
    isNonStrategic: true
  },
  {
    id: 23,
    name: "BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
    englishFriendlyName: "Bristol and Cardiff Administrative Court Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol y Llys Gweinyddol Bryste a Chaerdydd",
    provenance: "MANUAL_UPLOAD",
    urlPath: "bristol-cardiff-administrative-court-daily-cause-list",
    isNonStrategic: true
  },
  {
    id: 24,
    name: "MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
    englishFriendlyName: "Manchester Administrative Court Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol y Llys Gweinyddol Manceinion",
    provenance: "MANUAL_UPLOAD",
    urlPath: "manchester-administrative-court-daily-cause-list",
    isNonStrategic: true
  }
];
```

---

### Venue Configuration

**File**: `/libs/location/src/location-data.ts`

Ensure Royal Courts of Justice and Administrative Court venues exist:

```typescript
export const locations: Location[] = [
  // ... existing locations ...

  {
    id: 4,
    name: "Royal Courts of Justice",
    welshName: "Llysoedd Barn Brenhinol",
    regions: [1],  // London
    subJurisdictions: [1, 2, 3]  // Civil, Family, Criminal
  },

  // Add new Administrative Court locations if not present
  {
    id: 101,  // TBD - check next available ID
    name: "Birmingham Administrative Court",
    welshName: "Llys Gweinyddol Birmingham",
    regions: [3],  // Midlands
    subJurisdictions: [1]  // Civil
  },
  {
    id: 102,
    name: "Leeds Administrative Court",
    welshName: "Llys Gweinyddol Leeds",
    regions: [6],  // Yorkshire
    subJurisdictions: [1]  // Civil
  },
  {
    id: 103,
    name: "Bristol and Cardiff Administrative Court",
    welshName: "Llys Gweinyddol Bryste a Chaerdydd",
    regions: [7],  // Wales and South West
    subJurisdictions: [1]  // Civil
  },
  {
    id: 104,
    name: "Manchester Administrative Court",
    welshName: "Llys Gweinyddol Manceinion",
    regions: [4],  // North West
    subJurisdictions: [1]  // Civil
  }
];
```

---

### PDF Generation

**Approach**: Use Puppeteer to render HTML pages as PDFs

**Implementation**:

1. Create PDF generation utility in `@hmcts/publication`:

```typescript
// libs/publication/src/pdf/pdf-generator.ts
import puppeteer from "puppeteer";

export async function generatePdfFromHtml(
  html: string,
  options: { format?: "A4" | "Letter", orientation?: "portrait" | "landscape" } = {}
): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: options.format || "A4",
    landscape: options.orientation === "landscape",
    printBackground: true
  });

  await browser.close();
  return pdfBuffer;
}
```

2. Add PDF route handler to each module:

```typescript
// libs/list-types/rcj-standard-daily-cause-list/src/pages/pdf.ts
export const GET = async (req: Request, res: Response) => {
  const artefactId = req.query.artefactId as string;
  const locale = res.locals.locale || "en";

  // Load and render data (same as main handler)
  const jsonData = await loadJsonData(artefactId);
  const renderedData = renderStandardDailyCauseList(jsonData, listTypeId, locale);

  // Render HTML for PDF (use same template but with print styles)
  const html = await renderTemplate("rcj-standard-daily-cause-list/pdf-template", {
    content,
    header: renderedData.header,
    data: renderedData.hearings
  });

  // Generate PDF
  const pdfBuffer = await generatePdfFromHtml(html, { format: "A4", orientation: "landscape" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${listTypeName}-${locale}.pdf"`);
  res.send(pdfBuffer);
};
```

3. Add print-specific CSS:

```scss
// src/assets/css/print.scss
@media print {
  .govuk-header, .govuk-footer, .govuk-phase-banner {
    display: none;
  }

  table {
    page-break-inside: avoid;
  }

  h1, h2 {
    page-break-after: avoid;
  }
}
```

---

### Search Functionality

**Implementation**: Client-side JavaScript for filtering table rows

```typescript
// libs/list-types/rcj-standard-daily-cause-list/src/assets/js/search.ts
export function initSearch() {
  const searchInput = document.getElementById("search-cases") as HTMLInputElement;
  const tableRows = document.querySelectorAll("table tbody tr");

  if (!searchInput || !tableRows.length) return;

  searchInput.addEventListener("input", (e) => {
    const query = (e.target as HTMLInputElement).value.toLowerCase().trim();

    tableRows.forEach(row => {
      const text = row.textContent?.toLowerCase() || "";
      const matches = !query || text.includes(query);
      row.style.display = matches ? "" : "none";
    });
  });
}

// Initialize on page load
if (typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", initSearch);
}
```

**CSS:**
```scss
// src/assets/css/search.scss
.hidden {
  display: none;
}
```

---

### Testing Strategy

#### Unit Tests

For each module:
- Test Excel converter with valid data
- Test Excel converter with invalid data (missing fields, wrong formats)
- Test JSON validator
- Test renderer formatting logic
- Test date/time formatting
- Test Welsh locale handling

Example:
```typescript
// libs/list-types/rcj-standard-daily-cause-list/src/conversion/standard-config.test.ts
describe("Standard Daily Cause List Converter", () => {
  it("should convert valid Excel to JSON", async () => {
    const buffer = fs.readFileSync("test-data/valid-list.xlsx");
    const result = await convertExcelForListType(10, buffer);

    expect(result).toHaveLength(5);
    expect(result[0]).toMatchObject({
      venue: "Court 1",
      judge: "Judge Smith",
      time: "10:00",
      caseNumber: "T20257890",
      caseDetails: "Case details",
      hearingType: "Hearing",
      additionalInformation: "Additional info"
    });
  });

  it("should reject Excel with missing required field", async () => {
    const buffer = fs.readFileSync("test-data/missing-field.xlsx");

    await expect(convertExcelForListType(10, buffer)).rejects.toThrow(/required field/i);
  });
});
```

#### E2E Tests

Create comprehensive E2E tests covering all journeys:

```typescript
// e2e-tests/tests/rcj-hearing-lists.spec.ts
test.describe("RCJ Hearing Lists @nightly", () => {
  test("should display RCJ landing page with all lists", async ({ page }) => {
    await page.goto("/royal-courts-of-justice");

    await expect(page.locator("h1")).toHaveText("What do you want to view from Royal Courts of Justice?");

    // Verify FaCT link
    await expect(page.locator("a[href*='find-court-tribunal']")).toBeVisible();

    // Verify caution message
    await expect(page.getByText(/subject to change until 4:30pm/i)).toBeVisible();

    // Verify at least 9 hearing list links (RCJ lists)
    const listLinks = page.locator("ul.govuk-list a");
    await expect(listLinks).toHaveCount(9);

    // Test accessibility
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should upload and display standard daily cause list", async ({ page }) => {
    // Login as admin
    await page.goto("/manual-upload");

    // Select list type
    await page.selectOption("#listType", "10");  // County Court Central London

    // Upload file
    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles("test-data/county-court-valid.xlsx");

    // Submit
    await page.getByRole("button", { name: "Upload" }).click();

    // Verify success
    await expect(page.getByText(/successfully uploaded/i)).toBeVisible();

    // Navigate to published list
    const artefactId = await page.locator("[data-artefact-id]").getAttribute("data-artefact-id");
    await page.goto(`/county-court-central-london-civil-daily-cause-list?artefactId=${artefactId}`);

    // Verify page title
    await expect(page.locator("h1")).toHaveText("County Court at Central London Civil Daily Cause List");

    // Verify table headers
    await expect(page.locator("th").first()).toHaveText("Venue");

    // Test search
    await page.getByLabel("Search cases").fill("T20257890");
    await page.waitForTimeout(500);  // Debounce
    const visibleRows = await page.locator("table tbody tr:visible").count();
    expect(visibleRows).toBeLessThan(await page.locator("table tbody tr").count());

    // Test PDF download
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download PDF" }).click()
    ]);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test("should display Family Daily Cause List with accordions", async ({ page }) => {
    await page.goto("/family-daily-cause-list-rcj?artefactId=test-family-list");

    // Verify title
    await expect(page.locator("h1")).toHaveText("Family Daily Cause List for Royal Courts of Justice");

    // Verify "Hide all sections" button
    await expect(page.getByRole("button", { name: /hide all sections/i })).toBeVisible();

    // Verify at least one accordion section
    const sections = page.locator(".govuk-accordion__section");
    await expect(sections.first()).toBeVisible();

    // Test expand/collapse
    const firstSection = sections.first();
    const toggleButton = firstSection.locator(".govuk-accordion__section-button");
    await toggleButton.click();
    await expect(firstSection.locator(".govuk-accordion__section-content")).toBeVisible();

    // Test "Hide all"
    await page.getByRole("button", { name: /hide all sections/i }).click();
    await expect(firstSection.locator(".govuk-accordion__section-content")).toBeHidden();
  });

  test("should display Welsh content correctly", async ({ page }) => {
    await page.goto("/royal-courts-of-justice?lng=cy");

    await expect(page.locator("h1")).toHaveText("Beth hoffech chi ei weld o Lys Barn Brenhinol?");

    // Verify Welsh list names
    const firstLink = page.locator("ul.govuk-list a").first();
    const linkText = await firstLink.textContent();
    expect(linkText).toMatch(/Rhestr/);  // Welsh list names contain "Rhestr"
  });
});
```

#### Accessibility Tests

```typescript
test("should meet WCAG 2.2 AA standards", async ({ page }) => {
  await page.goto("/kings-bench-division-daily-cause-list?artefactId=test");

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Update list type registry with 14 new entries (IDs 10-24)
- [ ] Add Administrative Court venues to location data
- [ ] Create RCJ landing page module (Module 5)
- [ ] Create empty module structures for Modules 1-4
- [ ] Register all modules in web app
- [ ] Update TypeScript path aliases

### Phase 2: Module 1 - Standard Format (Week 1-2)
- [ ] Create Excel converter configuration (7 fields)
- [ ] Create JSON schema for validation
- [ ] Implement renderer for standard format
- [ ] Create Nunjucks template
- [ ] Create English content (en.ts) for all 9 lists
- [ ] Create Welsh content (cy.ts) for all 9 lists
- [ ] Register 9 converters (IDs 10-18)
- [ ] Add special content for Court of Appeal (Criminal) quick guide link
- [ ] Implement search JavaScript
- [ ] Add unit tests

### Phase 3: Module 2 - Family Format (Week 2)
- [ ] Create Excel converter configuration (9 fields)
- [ ] Create JSON schema
- [ ] Implement grouping renderer (by Courtroom & Recorder)
- [ ] Create accordion template
- [ ] Create English content
- [ ] Create Welsh content
- [ ] Implement Hide/Show all sections JavaScript
- [ ] Add unit tests

### Phase 4: Module 3 - Civil Appeal Format (Week 2-3)
- [ ] Create two-tab Excel converter configuration
- [ ] Create JSON schema for both tabs
- [ ] Implement dual-section renderer
- [ ] Create template with two sub-sections
- [ ] Create English content
- [ ] Create Welsh content
- [ ] Add unit tests

### Phase 5: Module 4 - Administrative Courts (Week 3)
- [ ] Reuse Module 1 code for 4 lists (IDs 21-24)
- [ ] Create venue-specific content
- [ ] Register 4 converters
- [ ] Add unit tests

### Phase 6: PDF Generation (Week 3-4)
- [ ] Implement PDF generation utility with Puppeteer
- [ ] Create PDF templates for each layout type
- [ ] Add PDF routes to all modules
- [ ] Add print-specific CSS
- [ ] Test PDF downloads in both languages

### Phase 7: Testing & QA (Week 4)
- [ ] Write E2E tests for all list types
- [ ] Test Excel upload flow for all 14 types
- [ ] Test search functionality
- [ ] Test accordion functionality (Family list)
- [ ] Run accessibility tests (Axe)
- [ ] Manual screen reader testing
- [ ] Cross-browser testing
- [ ] Welsh translation verification

### Phase 8: Documentation (Week 4)
- [ ] Create Confluence pages for each list type
- [ ] Document Excel template requirements
- [ ] Document field validation rules
- [ ] Add README to each module
- [ ] Update architecture documentation

---

## Open Questions & Risks

### Questions to Resolve

1. **PDF Caching**:
   - Should PDFs be pre-generated and cached, or generated on-demand?
   - **Recommendation**: On-demand generation with short-term caching (1 hour)

2. **Excel Template Distribution**:
   - How should admin users obtain blank Excel templates?
   - **Recommendation**: Add download links on manual upload page

3. **Venue IDs**:
   - What location IDs should be used for Administrative Courts?
   - **Action Required**: Check `location-data.ts` for next available IDs (suggest 101-104)

4. **List Type ID Range**:
   - Are IDs 10-24 available?
   - **Action Required**: Verify no conflicts with planned future list types

5. **Court of Appeal (Criminal) Quick Guide**:
   - Is the URL in the specification correct and stable?
   - **Action Required**: Verify URL with stakeholders

6. **Family List Accordion Behavior**:
   - Should accordion state persist across page reloads?
   - **Recommendation**: No persistence (default closed on load)

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Welsh translations not approved on time | High | Use specification translations as baseline, implement translation update process |
| PDF generation performance issues | Medium | Implement caching, optimize Puppeteer config, consider serverless functions |
| Excel schema validation complexity | Medium | Reuse existing validator framework, add comprehensive unit tests |
| Search performance with large lists | Low | Client-side filtering is fast for <1000 rows, consider pagination if needed |
| Accessibility violations | High | Run automated tests early, manual testing throughout development |
| Module code duplication | Low | Modular approach minimizes duplication, regular code reviews |
| Venue configuration errors | Medium | Validate venue linkages in seed data tests |

---

## Success Criteria

1. **Functional Requirements**
   - ✅ All 14 list types can be uploaded via Excel
   - ✅ All lists display correctly with proper formatting
   - ✅ RCJ landing page shows all RCJ lists alphabetically
   - ✅ Family list accordion grouping works correctly
   - ✅ Court of Appeal (Civil) two-tab support works
   - ✅ Search filters cases on all lists
   - ✅ PDF downloads work for all lists in both languages
   - ✅ Back navigation returns to RCJ landing page

2. **Data Validation**
   - ✅ Excel files validated against correct schema
   - ✅ Invalid uploads rejected with clear errors
   - ✅ All required fields enforced
   - ✅ Date and time formats validated
   - ✅ HTML tags sanitized from input

3. **Bilingual Support**
   - ✅ All pages support English and Welsh via ?lng parameter
   - ✅ Welsh translations accurate and approved
   - ✅ Language toggle preserves artefactId

4. **Accessibility**
   - ✅ WCAG 2.2 AA compliance verified
   - ✅ Keyboard navigation fully functional
   - ✅ Screen readers announce content correctly
   - ✅ Accordions accessible
   - ✅ Tables have proper semantic markup

5. **Testing**
   - ✅ Unit tests pass for all modules
   - ✅ E2E tests cover all list types
   - ✅ Accessibility tests pass with zero violations
   - ✅ Cross-browser compatibility verified

---

## Timeline Estimate

- **Phase 1 (Foundation)**: 3 days
- **Phase 2 (Standard Format)**: 5 days
- **Phase 3 (Family Format)**: 4 days
- **Phase 4 (Civil Appeal)**: 3 days
- **Phase 5 (Admin Courts)**: 2 days
- **Phase 6 (PDF Generation)**: 4 days
- **Phase 7 (Testing & QA)**: 5 days
- **Phase 8 (Documentation)**: 2 days

**Total Estimate**: 28 days (~6 weeks)

Note: Assumes one developer working full-time. Multiple developers can work on Phases 2-5 in parallel.

---

## References

- **Specification**: `/home/runner/work/cath-service/cath-service/docs/tickets/VIBE-317/specification.md`
- **Attachments**: `/home/runner/work/cath-service/cath-service/docs/tickets/VIBE-317/`
- **Reference Implementation**: `/home/runner/work/cath-service/cath-service/libs/list-types/care-standards-tribunal-weekly-hearing-list/`
- **List Type Registry**: `/home/runner/work/cath-service/cath-service/libs/list-types/common/src/mock-list-types.ts`
- **Location Data**: `/home/runner/work/cath-service/cath-service/libs/location/src/location-data.ts`
- **GOV.UK Design System**: https://design-system.service.gov.uk/
- **WCAG 2.2 Guidelines**: https://www.w3.org/WAI/WCAG22/quickref/
