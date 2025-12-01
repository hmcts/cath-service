# VIBE-166: Technical Implementation Plan

## Overview
This document provides a detailed technical implementation plan for completing the Excel upload journey for the Care Standards Tribunal Weekly Hearing List. The implementation extends the existing admin-pages module with Excel parsing capabilities and creates a new list-type module for display.

## Architecture Summary

**Module Strategy**:
- **Extend**: `libs/admin-pages` - Add Excel parsing and extend manual upload flow
- **New Module**: `libs/list-types/care-standards-tribunal-weekly-hearing-list` - Display page
- **Update**: `libs/list-types/common` - Add new list type definition
- **No Database Changes**: Use existing `artefact` table structure

## 1. Module Structure

### 1.1 Admin Pages Extension
```
libs/admin-pages/
├── src/
│   ├── manual-upload/
│   │   ├── excel-parser.ts              # NEW: Excel to JSON conversion
│   │   ├── excel-parser.test.ts         # NEW: Excel parser tests
│   │   ├── excel-validator.ts           # NEW: Excel-specific validation
│   │   ├── excel-validator.test.ts      # NEW: Excel validator tests
│   │   ├── model.ts                     # EXTEND: Add Excel types
│   │   ├── storage.ts                   # EXTEND: Add Excel file handling
│   │   └── validation.ts                # EXTEND: Add Excel validation
│   └── pages/
│       ├── manual-upload/
│       │   └── index.ts                 # EXTEND: Handle Excel files
│       ├── manual-upload-summary/       # EXISTS: No changes needed
│       └── manual-upload-success/       # EXISTS: No changes needed
```

### 1.2 New List Type Module
```
libs/list-types/care-standards-tribunal-weekly-hearing-list/
├── package.json
├── tsconfig.json
├── src/
│   ├── config.ts                        # Module configuration
│   ├── index.ts                         # Business logic exports
│   ├── models/
│   │   └── types.ts                     # TypeScript types for JSON schema
│   ├── pages/
│   │   ├── index.ts                     # Page controller
│   │   ├── index.njk                    # Nunjucks template
│   │   ├── index.test.ts                # Controller tests
│   │   ├── index.njk.test.ts            # Template rendering tests
│   │   ├── en.ts                        # English content
│   │   └── cy.ts                        # Welsh content
│   ├── rendering/
│   │   ├── renderer.ts                  # JSON to display data transformation
│   │   └── renderer.test.ts             # Renderer tests
│   ├── validation/
│   │   ├── json-validator.ts            # JSON schema validation
│   │   └── json-validator.test.ts       # Validator tests
│   └── assets/
│       ├── css/
│       │   └── hearing-list.scss        # Page-specific styles
│       └── js/
│           └── search.ts                # Client-side search functionality
```

## 2. Excel Parsing Implementation

### 2.1 Dependencies
Add to `libs/admin-pages/package.json`:
```json
{
  "dependencies": {
    "xlsx": "0.18.5"
  },
  "devDependencies": {
    "@types/node": "24.10.1"
  }
}
```

### 2.2 Excel Parser Service
**File**: `libs/admin-pages/src/manual-upload/excel-parser.ts`

**Key Functions**:
```typescript
export interface ExcelParsingResult {
  isValid: boolean;
  errors: string[];
  data?: CareStandardsHearingData;
}

export interface CareStandardsHearingData {
  hearings: HearingRow[];
}

export interface HearingRow {
  date: string;           // ISO 8601 format
  caseName: string;
  hearingLength: string;
  hearingType: string;
  venue: string;
  additionalInformation: string;
}

export async function parseExcelFile(
  filePath: string
): Promise<ExcelParsingResult>;

export function isExcelFile(filename: string): boolean;
```

**Implementation Approach**:
1. Use `xlsx.readFile()` to read Excel file
2. Extract first worksheet
3. Validate header row matches expected columns
4. Iterate through data rows (starting from row 2)
5. Validate each cell value
6. Convert dates from dd/MM/yyyy to ISO 8601
7. Return structured JSON or validation errors

**Error Handling**:
- File read errors: "Unable to read Excel file"
- Invalid worksheet: "Excel file must contain at least one worksheet"
- Missing headers: "Required columns are missing: [column names]"
- Invalid date format: "Row X: Date must be in format dd/MM/yyyy"
- Empty cells: "Row X: All fields are required"
- Invalid data types: "Row X: [field] contains invalid data"

### 2.3 Excel Validator
**File**: `libs/admin-pages/src/manual-upload/excel-validator.ts`

**Validation Rules**:
```typescript
const REQUIRED_COLUMNS = [
  "Date",
  "Case name",
  "Hearing length",
  "Hearing type",
  "Venue",
  "Additional information"
];

const MAX_LENGTHS = {
  caseName: 500,
  hearingLength: 100,
  hearingType: 100,
  venue: 200,
  additionalInformation: 1000
};

export function validateExcelStructure(
  worksheet: WorkSheet
): ValidationResult;

export function validateHearingRow(
  row: number,
  data: ExcelRow
): ValidationError[];

export function validateDate(
  dateString: string,
  rowNumber: number
): ValidationError | null;
```

**Validation Steps**:
1. Check worksheet exists
2. Validate header row has all required columns in correct order
3. Check for empty rows (stop at first empty row)
4. Validate date format using regex: `^\d{2}/\d{2}/\d{4}$`
5. Check date is valid calendar date
6. Validate string lengths against MAX_LENGTHS
7. Check for empty cells in required columns

### 2.4 Type Definitions
**File**: `libs/admin-pages/src/manual-upload/model.ts` (extend existing)

Add Excel-specific types:
```typescript
export interface ManualUploadForm {
  // ... existing fields ...
  fileType?: "json" | "excel";  // NEW: Track file type
}

export interface ExcelUploadMetadata {
  fileName: string;
  rowCount: number;
  parsedAt: Date;
  originalFilePath: string;
  convertedJsonPath: string;
}
```

## 3. Manual Upload Flow Extension

### 3.1 Upload Page Controller
**File**: `libs/admin-pages/src/pages/manual-upload/index.ts` (extend existing POST handler)

**Changes**:
1. Detect file type from extension
2. If Excel file:
   - Save original Excel file to temp storage
   - Parse Excel and validate
   - Convert to JSON format
   - Save JSON file to temp storage
   - Store both file paths in session
3. If validation fails:
   - Display errors on upload page
   - Keep form data for correction
4. If validation succeeds:
   - Store parsed data in session
   - Redirect to summary page

**Code Pattern**:
```typescript
// In POST handler
const fileName = uploadedFile.originalname;
const fileExtension = path.extname(fileName).toLowerCase();

if (fileExtension === ".xlsx" || fileExtension === ".xls") {
  // Excel file handling
  const tempPath = path.join(TEMP_UPLOAD_DIR, `${uploadId}-original${fileExtension}`);
  await fs.promises.writeFile(tempPath, uploadedFile.buffer);

  const parseResult = await parseExcelFile(tempPath);

  if (!parseResult.isValid) {
    return renderUploadPageWithErrors(parseResult.errors);
  }

  // Convert to JSON and save
  const jsonPath = path.join(TEMP_UPLOAD_DIR, `${uploadId}.json`);
  await fs.promises.writeFile(
    jsonPath,
    JSON.stringify(convertToListTypeSchema(parseResult.data))
  );

  // Store metadata in session
  await saveManualUpload(uploadId, {
    ...formData,
    fileType: "excel",
    fileName: fileName,
    file: uploadedFile.buffer
  });
} else {
  // Existing JSON file handling
  // ... existing code ...
}
```

### 3.2 Schema Conversion
**File**: `libs/admin-pages/src/manual-upload/excel-parser.ts`

Convert parsed Excel data to list type JSON schema:
```typescript
export function convertToListTypeSchema(
  data: CareStandardsHearingData
): ListTypeJson {
  return {
    courtHouse: {
      courtHouseName: "Care Standards Tribunal"
    },
    venue: "Care Standards Tribunal",
    listType: "CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST",
    hearings: data.hearings.map(hearing => ({
      date: hearing.date,
      caseName: hearing.caseName,
      hearingLength: hearing.hearingLength,
      hearingType: hearing.hearingType,
      venue: hearing.venue,
      additionalInformation: hearing.additionalInformation
    }))
  };
}
```

## 4. List Type Module Implementation

### 4.1 Package Configuration
**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/package.json`

```json
{
  "name": "@hmcts/care-standards-tribunal-weekly-hearing-list",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "production": "./dist/index.js",
      "default": "./src/index.ts"
    },
    "./config": {
      "production": "./dist/config.js",
      "default": "./src/config.ts"
    }
  },
  "scripts": {
    "build": "tsc && yarn build:nunjucks",
    "build:nunjucks": "mkdir -p dist/pages && cd src/pages && find . -name '*.njk' -exec sh -c 'mkdir -p ../../dist/pages/$(dirname {}) && cp {} ../../dist/pages/{}' \\;",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "format": "biome format --write .",
    "lint": "biome check .",
    "lint:fix": "biome check --write ."
  },
  "dependencies": {
    "@hmcts/location": "workspace:*",
    "@hmcts/postgres": "workspace:*",
    "@hmcts/publication": "workspace:*",
    "@hmcts/web-core": "workspace:*",
    "luxon": "3.7.2"
  },
  "devDependencies": {
    "@types/luxon": "3.7.1",
    "@types/node": "24.10.1",
    "typescript": "5.9.3",
    "vitest": "3.2.4"
  },
  "peerDependencies": {
    "express": "^5.1.0"
  }
}
```

### 4.2 Module Configuration
**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/config.ts`

```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pageRoutes = { path: path.join(__dirname, "pages") };
```

**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/index.ts`

```typescript
// Business logic exports
export * from "./models/types.js";
export { renderHearingListData } from "./rendering/renderer.js";
export { validateCareStandardsHearingList } from "./validation/json-validator.js";
```

### 4.3 TypeScript Configuration
**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/tsconfig.json`

```json
{
  "extends": "../../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["**/*.test.ts", "dist", "node_modules", "src/assets/"]
}
```

### 4.4 Type Definitions
**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/models/types.ts`

```typescript
export interface CareStandardsHearingList {
  courtHouse: {
    courtHouseName: string;
  };
  venue: string;
  listType: string;
  hearings: Hearing[];
}

export interface Hearing {
  date: string;              // ISO 8601
  caseName: string;
  hearingLength: string;
  hearingType: string;
  venue: string;
  additionalInformation: string;
}

export interface DisplayData {
  header: HeaderData;
  importantInfo: ImportantInfoData;
  hearings: DisplayHearing[];
}

export interface HeaderData {
  title: string;
  duration: string;
  lastUpdated: string;
}

export interface ImportantInfoData {
  heading: string;
  content: string;
  govUkLink: string;
}

export interface DisplayHearing {
  date: string;              // Formatted as dd/MM/yyyy
  caseName: string;
  hearingLength: string;
  hearingType: string;
  venue: string;
  additionalInformation: string;
}
```

### 4.5 JSON Validator
**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/validation/json-validator.ts`

```typescript
import Ajv from "ajv";
import type { ValidationResult } from "@hmcts/publication";
import type { CareStandardsHearingList } from "../models/types.js";

const ajv = new Ajv({ allErrors: true });

const schema = {
  type: "object",
  required: ["courtHouse", "venue", "listType", "hearings"],
  properties: {
    courtHouse: {
      type: "object",
      required: ["courtHouseName"],
      properties: {
        courtHouseName: { type: "string" }
      }
    },
    venue: { type: "string" },
    listType: {
      type: "string",
      const: "CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST"
    },
    hearings: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: [
          "date",
          "caseName",
          "hearingLength",
          "hearingType",
          "venue",
          "additionalInformation"
        ],
        properties: {
          date: { type: "string", format: "date" },
          caseName: { type: "string", maxLength: 500 },
          hearingLength: { type: "string", maxLength: 100 },
          hearingType: { type: "string", maxLength: 100 },
          venue: { type: "string", maxLength: 200 },
          additionalInformation: { type: "string", maxLength: 1000 }
        }
      }
    }
  }
};

const validate = ajv.compile(schema);

export function validateCareStandardsHearingList(
  data: unknown
): ValidationResult {
  const isValid = validate(data);

  return {
    isValid,
    errors: validate.errors || []
  };
}
```

### 4.6 Renderer
**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/rendering/renderer.ts`

```typescript
import { DateTime } from "luxon";
import { getLocationById } from "@hmcts/location";
import type { CareStandardsHearingList, DisplayData, DisplayHearing } from "../models/types.js";

export async function renderHearingListData(
  jsonData: CareStandardsHearingList,
  options: {
    locationId: string;
    contentDate: Date;
    locale: string;
  }
): Promise<DisplayData> {
  const location = await getLocationById(Number.parseInt(options.locationId, 10));
  const locationName = location
    ? (options.locale === "cy" ? location.welshName : location.name)
    : "Care Standards Tribunal";

  // Calculate week commencing date (assuming first hearing date)
  const firstHearingDate = jsonData.hearings[0]?.date
    ? DateTime.fromISO(jsonData.hearings[0].date)
    : DateTime.fromJSDate(options.contentDate);

  const weekCommencing = firstHearingDate.startOf("week");

  // Format last updated timestamp
  const lastUpdated = DateTime.fromJSDate(options.contentDate)
    .setLocale(options.locale)
    .toFormat("dd MMMM yyyy 'at' HH:mm");

  // Sort hearings by date ascending
  const sortedHearings = [...jsonData.hearings].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // Convert hearings to display format
  const displayHearings: DisplayHearing[] = sortedHearings.map(hearing => ({
    date: DateTime.fromISO(hearing.date).toFormat("dd/MM/yyyy"),
    caseName: hearing.caseName,
    hearingLength: hearing.hearingLength,
    hearingType: hearing.hearingType,
    venue: hearing.venue,
    additionalInformation: hearing.additionalInformation
  }));

  return {
    header: {
      title: "Care Standards Tribunal Weekly Hearing List",
      duration: `List for week commencing ${weekCommencing.toFormat("dd MMMM yyyy")}`,
      lastUpdated: `Last updated on ${lastUpdated}`
    },
    importantInfo: {
      heading: "Important information",
      content: getImportantInfoContent(options.locale),
      govUkLink: "https://www.gov.uk/courts-tribunals/care-standards-tribunal"
    },
    hearings: displayHearings
  };
}

function getImportantInfoContent(locale: string): string {
  if (locale === "cy") {
    return `
      <p>Cysylltwch â Thribiwnlys Safonau Gofal os oes gennych unrhyw gwestiynau am y rhestr gwrandawiadau hon.</p>
      <p>Gallwch gysylltu â'r tribiwnlys drwy e-bost neu ffôn:</p>
      <ul>
        <li>E-bost: <a href="mailto:CST@justice.gov.uk">CST@justice.gov.uk</a></li>
        <li>Ffôn: 01253 606 300</li>
      </ul>
    `;
  }

  return `
    <p>Contact the Care Standards Tribunal if you have any questions about this hearing list.</p>
    <p>You can contact the tribunal by email or telephone:</p>
    <ul>
      <li>Email: <a href="mailto:CST@justice.gov.uk">CST@justice.gov.uk</a></li>
      <li>Telephone: 01253 606 300</li>
    </ul>
  `;
}
```

### 4.7 Page Controller
**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/index.ts`

```typescript
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "@hmcts/postgres";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import type { Request, Response } from "express";
import { renderHearingListData } from "../rendering/renderer.js";
import { validateCareStandardsHearingList } from "../validation/json-validator.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..", "..");
const TEMP_UPLOAD_DIR = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");

export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const artefactId = req.query.artefactId as string;

  if (!artefactId) {
    return res.status(400).render("errors/common", {
      en,
      cy,
      errorTitle: t.errorTitle,
      errorMessage: t.errorMessage
    });
  }

  try {
    const artefact = await prisma.artefact.findUnique({
      where: { artefactId }
    });

    if (!artefact) {
      return res.status(404).render("errors/common", {
        en,
        cy,
        errorTitle: t.errorTitle,
        errorMessage: t.errorMessage
      });
    }

    const jsonFilePath = path.join(TEMP_UPLOAD_DIR, `${artefactId}.json`);

    let jsonContent: string;
    try {
      jsonContent = await readFile(jsonFilePath, "utf-8");
    } catch (error) {
      console.error(`Error reading JSON file at ${jsonFilePath}:`, error);
      return res.status(404).render("errors/common", {
        en,
        cy,
        errorTitle: t.errorTitle,
        errorMessage: t.errorMessage
      });
    }

    const jsonData = JSON.parse(jsonContent);

    const validationResult = validateCareStandardsHearingList(jsonData);
    if (!validationResult.isValid) {
      console.error("Validation errors:", validationResult.errors);
      return res.status(400).render("errors/common", {
        en,
        cy,
        errorTitle: t.errorTitle,
        errorMessage: t.errorMessage
      });
    }

    const displayData = await renderHearingListData(jsonData, {
      locationId: artefact.locationId,
      contentDate: artefact.contentDate,
      locale
    });

    const dataSource = PROVENANCE_LABELS[artefact.provenance] || artefact.provenance;

    res.render("care-standards-tribunal-weekly-hearing-list/index", {
      en,
      cy,
      ...displayData,
      dataSource,
      t
    });
  } catch (error) {
    console.error("Error rendering hearing list:", error);
    return res.status(500).render("errors/common", {
      en,
      cy,
      errorTitle: t.errorTitle,
      errorMessage: t.errorMessage
    });
  }
};
```

### 4.8 Content Files
**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/en.ts`

```typescript
export const en = {
  pageTitle: "Care Standards Tribunal Weekly Hearing List",
  errorTitle: "Sorry, there is a problem",
  errorMessage: "Unable to display the hearing list. Please try again later.",
  importantInfoHeading: "Important information",
  searchHeading: "Search Cases",
  searchLabel: "Case name or reference",
  searchButton: "Search",
  clearSearch: "Clear search",
  tableHeaders: {
    date: "Date",
    caseName: "Case name",
    hearingLength: "Hearing length",
    hearingType: "Hearing type",
    venue: "Venue",
    additionalInformation: "Additional information"
  },
  resultsCount: (count: number, total: number) =>
    `Showing ${count} of ${total} hearings`,
  noResults: "No hearings found matching your search",
  dataSourceLabel: "Data source:",
  backToTop: "Back to top"
};
```

**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/cy.ts`

```typescript
export const cy = {
  pageTitle: "Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Safonau Gofal",
  errorTitle: "Mae'n ddrwg gennym, mae yna broblem",
  errorMessage: "Methu dangos y rhestr gwrandawiadau. Rhowch gynnig arall arni yn nes ymlaen.",
  importantInfoHeading: "Gwybodaeth bwysig",
  searchHeading: "Chwilio Achosion",
  searchLabel: "Enw'r achos neu gyfeirnod",
  searchButton: "Chwilio",
  clearSearch: "Clirio chwiliad",
  tableHeaders: {
    date: "Dyddiad",
    caseName: "Enw'r achos",
    hearingLength: "Hyd y gwrandawiad",
    hearingType: "Math o wrandawiad",
    venue: "Lleoliad",
    additionalInformation: "Gwybodaeth ychwanegol"
  },
  resultsCount: (count: number, total: number) =>
    `Yn dangos ${count} o ${total} gwrandawiadau`,
  noResults: "Dim gwrandawiadau wedi'u canfod sy'n cydweddu â'ch chwiliad",
  dataSourceLabel: "Ffynhonnell data:",
  backToTop: "Nôl i'r brig"
};
```

### 4.9 Nunjucks Template
**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/index.njk`

```html
{% extends "layouts/default.njk" %}
{% from "govuk/components/details/macro.njk" import govukDetails %}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/table/macro.njk" import govukTable %}

{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-full">

    <h1 class="govuk-heading-xl">{{ header.title }}</h1>

    <p class="govuk-body-l">{{ header.duration }}</p>
    <p class="govuk-body-s govuk-!-margin-bottom-8">{{ header.lastUpdated }}</p>

    {{ govukDetails({
      summaryText: t.importantInfoHeading,
      html: importantInfo.content + '<p><a href="' + importantInfo.govUkLink + '" class="govuk-link">GOV.UK - Care Standards Tribunal</a></p>'
    }) }}

    <div class="cst-search-container" data-module="search-hearings">
      <h2 class="govuk-heading-m">{{ t.searchHeading }}</h2>

      <form class="cst-search-form" role="search">
        <div class="govuk-form-group">
          <label class="govuk-label" for="hearing-search">
            {{ t.searchLabel }}
          </label>
          <input
            class="govuk-input govuk-!-width-two-thirds"
            id="hearing-search"
            name="search"
            type="search"
            autocomplete="off"
          >
        </div>

        <button type="submit" class="govuk-button" data-module="govuk-button">
          {{ t.searchButton }}
        </button>

        <button
          type="button"
          class="govuk-button govuk-button--secondary cst-clear-search"
          data-module="govuk-button"
          hidden
        >
          {{ t.clearSearch }}
        </button>
      </form>

      <p class="cst-results-count govuk-body-s" role="status" aria-live="polite" hidden>
        <span class="cst-results-text"></span>
      </p>

      <p class="cst-no-results govuk-body" role="status" aria-live="polite" hidden>
        {{ t.noResults }}
      </p>
    </div>

    <table class="govuk-table cst-hearings-table" data-total-hearings="{{ hearings.length }}">
      <thead class="govuk-table__head">
        <tr class="govuk-table__row">
          <th scope="col" class="govuk-table__header">{{ t.tableHeaders.date }}</th>
          <th scope="col" class="govuk-table__header">{{ t.tableHeaders.caseName }}</th>
          <th scope="col" class="govuk-table__header">{{ t.tableHeaders.hearingLength }}</th>
          <th scope="col" class="govuk-table__header">{{ t.tableHeaders.hearingType }}</th>
          <th scope="col" class="govuk-table__header">{{ t.tableHeaders.venue }}</th>
          <th scope="col" class="govuk-table__header">{{ t.tableHeaders.additionalInformation }}</th>
        </tr>
      </thead>
      <tbody class="govuk-table__body">
        {% for hearing in hearings %}
        <tr class="govuk-table__row" data-searchable>
          <td class="govuk-table__cell" data-search-field>{{ hearing.date }}</td>
          <td class="govuk-table__cell" data-search-field>{{ hearing.caseName }}</td>
          <td class="govuk-table__cell" data-search-field>{{ hearing.hearingLength }}</td>
          <td class="govuk-table__cell" data-search-field>{{ hearing.hearingType }}</td>
          <td class="govuk-table__cell" data-search-field>{{ hearing.venue }}</td>
          <td class="govuk-table__cell" data-search-field>{{ hearing.additionalInformation }}</td>
        </tr>
        {% endfor %}
      </tbody>
    </table>

    <p class="govuk-body-s govuk-!-margin-top-8">
      <strong>{{ t.dataSourceLabel }}</strong> {{ dataSource }}
    </p>

    <p class="govuk-body-s">
      <a href="#top" class="govuk-link">{{ t.backToTop }}</a>
    </p>

  </div>
</div>
{% endblock %}
```

### 4.10 Client-Side Search JavaScript
**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/assets/js/search.ts`

```typescript
export function initializeSearch() {
  const searchContainer = document.querySelector('[data-module="search-hearings"]');
  if (!searchContainer) return;

  const searchInput = searchContainer.querySelector<HTMLInputElement>('#hearing-search');
  const clearButton = searchContainer.querySelector<HTMLButtonElement>('.cst-clear-search');
  const resultsCount = searchContainer.querySelector<HTMLElement>('.cst-results-count');
  const resultsText = searchContainer.querySelector<HTMLElement>('.cst-results-text');
  const noResults = searchContainer.querySelector<HTMLElement>('.cst-no-results');
  const table = document.querySelector<HTMLTableElement>('.cst-hearings-table');
  const rows = table?.querySelectorAll<HTMLTableRowElement>('[data-searchable]');

  if (!searchInput || !clearButton || !resultsCount || !resultsText || !noResults || !table || !rows) {
    return;
  }

  const totalHearings = Number.parseInt(table.dataset.totalHearings || '0', 10);
  let debounceTimer: number;

  function performSearch(query: string) {
    const searchTerm = query.toLowerCase().trim();
    let visibleCount = 0;

    rows.forEach(row => {
      const searchFields = row.querySelectorAll('[data-search-field]');
      const rowText = Array.from(searchFields)
        .map(cell => cell.textContent?.toLowerCase() || '')
        .join(' ');

      const matches = !searchTerm || rowText.includes(searchTerm);
      row.hidden = !matches;
      if (matches) visibleCount++;
    });

    // Update UI
    if (searchTerm) {
      clearButton.hidden = false;

      if (visibleCount === 0) {
        resultsCount.hidden = true;
        noResults.hidden = false;
      } else {
        resultsCount.hidden = false;
        noResults.hidden = true;
        resultsText.textContent = getResultsCountText(visibleCount, totalHearings);
      }
    } else {
      clearButton.hidden = true;
      resultsCount.hidden = true;
      noResults.hidden = true;
    }
  }

  function getResultsCountText(count: number, total: number): string {
    const locale = document.documentElement.lang || 'en';
    if (locale === 'cy') {
      return `Yn dangos ${count} o ${total} gwrandawiadau`;
    }
    return `Showing ${count} of ${total} hearings`;
  }

  // Event listeners
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      performSearch((e.target as HTMLInputElement).value);
    }, 300);
  });

  searchContainer.querySelector('form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    performSearch(searchInput.value);
  });

  clearButton.addEventListener('click', () => {
    searchInput.value = '';
    performSearch('');
    searchInput.focus();
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSearch);
} else {
  initializeSearch();
}
```

### 4.11 Styles
**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/assets/css/hearing-list.scss`

```scss
@import "node_modules/govuk-frontend/govuk/all";

.cst-search-container {
  @include govuk-responsive-margin(6, "bottom");
  border-top: 1px solid $govuk-border-colour;
  padding-top: govuk-spacing(4);
}

.cst-search-form {
  .govuk-form-group {
    margin-bottom: govuk-spacing(4);
  }

  .cst-clear-search {
    margin-left: govuk-spacing(2);
  }
}

.cst-results-count {
  @include govuk-font($size: 16);
  margin-top: govuk-spacing(2);
  color: $govuk-secondary-text-colour;
}

.cst-no-results {
  @include govuk-font($size: 19);
  @include govuk-responsive-margin(4, "top");
  font-weight: bold;
}

.cst-hearings-table {
  @include govuk-responsive-margin(6, "top");

  .govuk-table__row[hidden] {
    display: none;
  }

  // Responsive table adjustments
  @include govuk-media-query($until: tablet) {
    .govuk-table__header,
    .govuk-table__cell {
      display: block;
      width: 100%;
    }

    .govuk-table__header {
      font-weight: bold;
    }

    .govuk-table__row {
      border-bottom: 3px solid $govuk-border-colour;
      padding-bottom: govuk-spacing(3);
      margin-bottom: govuk-spacing(3);
    }
  }
}
```

## 5. List Type Registration

### 5.1 Add List Type Definition
**File**: `libs/list-types/common/src/mock-list-types.ts` (extend existing array)

```typescript
export const mockListTypes: ListType[] = [
  // ... existing list types ...
  {
    id: 9,
    name: "CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST",
    englishFriendlyName: "Care Standards Tribunal Weekly Hearing List",
    welshFriendlyName: "Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Safonau Gofal",
    provenance: "CFT_IDAM",
    urlPath: "care-standards-tribunal-weekly-hearing-list"
  }
];
```

## 6. Application Registration

### 6.1 Root tsconfig.json Update
**File**: `tsconfig.json`

```json
{
  "compilerOptions": {
    "paths": {
      // ... existing paths ...
      "@hmcts/care-standards-tribunal-weekly-hearing-list": [
        "libs/list-types/care-standards-tribunal-weekly-hearing-list/src"
      ]
    }
  }
}
```

### 6.2 Web App Registration
**File**: `apps/web/src/app.ts`

```typescript
// Add import
import { pageRoutes as careStandardsPages } from "@hmcts/care-standards-tribunal-weekly-hearing-list/config";

// Add to page routes array (where createGovukFrontend and createSimpleRouter are called)
const pageRoutePaths = [
  // ... existing paths ...
  careStandardsPages.path
];
```

### 6.3 Vite Build Configuration
**File**: `apps/web/vite.config.ts`

```typescript
// Add import
import { assets as careStandardsAssets } from "@hmcts/care-standards-tribunal-weekly-hearing-list/config";

// Add to assets array in createBaseViteConfig
const baseConfig = createBaseViteConfig([
  // ... existing paths ...
  careStandardsAssets
]);
```

## 7. Testing Strategy

### 7.1 Unit Tests

**Excel Parser Tests** (`excel-parser.test.ts`):
- Valid Excel file parsing
- Invalid file format handling
- Missing columns detection
- Invalid date format handling
- Empty cell detection
- Row-level validation errors
- JSON schema conversion
- Edge cases (empty file, single row, max columns)

**Excel Validator Tests** (`excel-validator.test.ts`):
- Date format validation (dd/MM/yyyy)
- String length validation
- Required field validation
- Invalid calendar dates
- Empty row detection

**Renderer Tests** (`renderer.test.ts`):
- Week commencing calculation
- Date formatting (ISO to dd/MM/yyyy)
- Hearing sorting by date
- Location name resolution
- Welsh translation handling
- Important info content generation

**JSON Validator Tests** (`json-validator.test.ts`):
- Valid schema validation
- Missing required fields
- Invalid data types
- String length validation
- Hearing array validation

**Page Controller Tests** (`index.test.ts`):
- Valid artefactId handling
- Missing artefactId error
- Artefact not found error
- JSON file not found error
- Validation error handling
- Successful rendering

### 7.2 Integration Tests

**Manual Upload Flow**:
- Upload Excel file and verify parsing
- Submit form and verify JSON conversion
- Navigate to summary page and verify data
- Confirm upload and verify artefact creation
- Access success page and verify links

**Display Page Flow**:
- Access page with valid artefactId
- Verify header, table, and search components render
- Test search functionality
- Test Welsh language toggle
- Test responsive design

### 7.3 E2E Tests

**File**: `e2e-tests/tests/care-standards-excel-upload.spec.ts`

Test scenarios:
1. Complete Excel upload journey (upload → summary → success)
2. Upload Excel with validation errors (verify error display)
3. Change field from summary page and return
4. View published hearing list as public user
5. Search for hearings and verify results
6. Switch to Welsh and verify translations
7. Test accessibility with keyboard navigation
8. Test mobile responsive behavior

### 7.4 Accessibility Tests

Using Playwright + Axe:
- Run axe-core on all pages
- Test keyboard navigation
- Test screen reader announcements (ARIA live regions)
- Test focus management
- Verify color contrast ratios
- Test with assistive technologies

**Coverage Targets**:
- Unit tests: >90% code coverage
- Integration tests: All critical user journeys
- E2E tests: Happy path + key error scenarios
- Accessibility: WCAG 2.2 AA compliance

## 8. File Storage Approach

**Storage Structure**:
```
storage/
└── temp/
    └── uploads/
        ├── {artefactId}.xlsx        # Original Excel file (retained)
        ├── {artefactId}.json        # Converted JSON file
        └── {uploadId}-original.xlsx # Temporary file during upload
```

**Storage Flow**:
1. Admin uploads Excel file
2. Save to temp storage as `{uploadId}-original.xlsx`
3. Parse and validate Excel
4. Convert to JSON and save as `{uploadId}.json`
5. On confirmation, rename files to `{artefactId}.xlsx` and `{artefactId}.json`
6. Delete temporary `{uploadId}-original.xlsx`

**Retention**:
- Keep both Excel and JSON files indefinitely for audit purposes
- Implement cleanup job for temporary files older than 24 hours

## 9. Error Handling Strategy

### 9.1 Upload Page Errors
Display errors using GOV.UK Error Summary component:
```typescript
errors: [
  { text: "The selected file must be an Excel file (.xlsx or .xls)", href: "#file" },
  { text: "Row 5: Date must be in format dd/MM/yyyy", href: "#file" },
  { text: "Row 8: Case name is required", href: "#file" }
]
```

### 9.2 Display Page Errors
Render error page with clear message:
- Artefact not found: "This hearing list could not be found"
- JSON file missing: "The hearing list data is currently unavailable"
- Validation failed: "The hearing list data is invalid"

### 9.3 Logging
Log all errors with context:
```typescript
console.error("Excel parsing error:", {
  uploadId,
  fileName,
  error: error.message,
  row: errorRow,
  timestamp: new Date().toISOString()
});
```

## 10. Performance Considerations

### 10.1 Excel Parsing
- Stream large Excel files instead of loading entire file into memory
- Limit maximum file size to 10MB
- Limit maximum rows to 1000
- Implement timeout for parsing operations (30 seconds)

### 10.2 Display Page
- Implement table pagination for large datasets (if >100 hearings)
- Use client-side search to avoid server round-trips
- Lazy load JavaScript for progressive enhancement
- Optimize CSS delivery (critical CSS inline)

### 10.3 File Storage
- Use efficient file naming strategy (UUID-based)
- Implement file compression for JSON storage
- Monitor storage usage and implement cleanup policies

## 11. Security Considerations

### 11.1 File Upload Security
- Validate file extension (.xlsx, .xls only)
- Scan file MIME type to prevent spoofing
- Limit file size to prevent DoS attacks
- Store files outside web root
- Sanitize all cell values to prevent XSS

### 11.2 Input Validation
- Validate all Excel cell values against expected format
- Escape HTML special characters in all displayed content
- Use parameterized queries for database operations (Prisma)
- Validate artefactId format (UUID) before database lookup

### 11.3 Access Control
- Restrict upload pages to authenticated admin users only
- Use role-based access control (requireRole middleware)
- Display page is public (no authentication required)

## 12. Deployment Checklist

### 12.1 Pre-Deployment
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Accessibility audit complete
- [ ] Code review completed
- [ ] Performance testing completed
- [ ] Security review completed

### 12.2 Deployment Steps
1. Update root tsconfig.json with new module path
2. Build all modules: `yarn build`
3. Run database migrations: `yarn db:migrate` (if needed)
4. Deploy to staging environment
5. Run smoke tests on staging
6. Deploy to production
7. Monitor error logs for 24 hours

### 12.3 Post-Deployment
- [ ] Verify Excel upload works in production
- [ ] Verify display page renders correctly
- [ ] Verify search functionality works
- [ ] Verify Welsh translations display correctly
- [ ] Monitor application logs for errors
- [ ] Monitor performance metrics

## 13. Monitoring and Alerting

### 13.1 Metrics to Track
- Excel upload success rate
- Excel parsing errors (by error type)
- Average parsing time
- Display page load time
- Search performance
- File storage usage

### 13.2 Alerts
- Excel parsing failure rate >5%
- Display page errors >1%
- File storage >80% capacity
- Page load time >3 seconds

## 14. Future Enhancements

### 14.1 Potential Improvements
- Excel template download for users
- Batch upload (multiple Excel files)
- Advanced search with filters
- Export hearing list to PDF
- Email notifications for new hearings
- Calendar integration (iCal export)
- Server-side pagination for large datasets
- Real-time validation feedback during upload

### 14.2 Technical Debt
- Refactor Excel parser to use streaming API
- Implement caching for frequently accessed hearing lists
- Optimize file storage with compression
- Add rate limiting for upload endpoint

## 15. Open Questions & Decisions

1. **Excel Template**: Should we provide a downloadable template?
   - Recommendation: Yes, create template and link from upload page

2. **Table Pagination**: Should we paginate for large datasets?
   - Recommendation: Implement if >100 hearings, otherwise client-side only

3. **Duplicate Detection**: How to handle duplicate case names?
   - Recommendation: Allow duplicates, display all hearings

4. **Week Calculation**: Should week start Monday or first hearing date?
   - Recommendation: Use first hearing date, round to Monday

5. **Search Scope**: Should search be case-sensitive?
   - Recommendation: No, case-insensitive for better UX

6. **File Retention**: How long should files be retained?
   - Recommendation: Indefinitely for audit, implement archive after 1 year

7. **Important Info Content**: What specific contact details?
   - Needs confirmation from stakeholders

## Appendix A: File Size Estimates

**Excel file**: Typical size 50KB-500KB (up to 1000 rows)
**JSON file**: Typical size 100KB-1MB (after conversion)
**Storage per upload**: ~1.5MB average (including both files)
**Monthly storage**: ~1.5GB (assuming 1000 uploads/month)

## Appendix B: Dependencies Summary

**New Dependencies**:
- `xlsx` (0.18.5) - Excel file parsing

**Existing Dependencies**:
- `luxon` - Date formatting
- `ajv` - JSON schema validation
- `express` - Web framework
- `nunjucks` - Templating
- GOV.UK Frontend - UI components

## Appendix C: Example Excel File

| Date | Case name | Hearing length | Hearing type | Venue | Additional information |
|------|-----------|---------------|--------------|-------|----------------------|
| 24/11/2025 | Smith v Care Quality Commission | 2 hours | Final Hearing | Manchester | Case transferred from London |
| 24/11/2025 | Jones v Ofsted | 1 hour 30 minutes | Preliminary Hearing | London | Remote hearing |
| 25/11/2025 | Brown v Care Quality Commission | 3 hours | Final Hearing | Birmingham | In-person hearing |

## Appendix D: JSON Schema Example

```json
{
  "courtHouse": {
    "courtHouseName": "Care Standards Tribunal"
  },
  "venue": "Care Standards Tribunal",
  "listType": "CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST",
  "hearings": [
    {
      "date": "2025-11-24",
      "caseName": "Smith v Care Quality Commission",
      "hearingLength": "2 hours",
      "hearingType": "Final Hearing",
      "venue": "Manchester",
      "additionalInformation": "Case transferred from London"
    },
    {
      "date": "2025-11-24",
      "caseName": "Jones v Ofsted",
      "hearingLength": "1 hour 30 minutes",
      "hearingType": "Preliminary Hearing",
      "venue": "London",
      "additionalInformation": "Remote hearing"
    }
  ]
}
```
