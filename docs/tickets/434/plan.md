# Technical Plan: Issue #434 — SEND, CIC, and AST Hearing Lists

## Overview

Three new non-strategic tribunal hearing list types must be added to CaTH:

| List | Name (upload form) | Name (front-end) | Frequency | Region |
|---|---|---|---|---|
| SEND | SEND Daily Hearing List | First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List | Daily | National (new, regionId: 7) |
| CIC | CIC Weekly Hearing List | Criminal Injuries Compensation Weekly Hearing List | Weekly | National |
| AST | AST Daily Hearing List | Asylum Support Tribunal Daily Hearing List | Daily | London (regionId: 1) |

All three follow the same pattern as the existing `care-standards-tribunal-weekly-hearing-list` module. This plan documents every file to create and modify, in implementation order.

---

## Architecture

Each list type is a self-contained library under `libs/list-types/`. Pages (controller + template) live in `apps/web/src/pages/(list-types)/`. Registration points in shared services are updated manually.

The key structural difference from CST is that these modules do not export locale content to libs — content is co-located with the page controllers in `apps/web/src/pages/` per the default pattern.

---

## 1. Location Data Changes

### File: `libs/location/src/location-data.ts`

**New region** (append to `regions` array):
```typescript
{
  regionId: 7,
  name: "National",
  welshName: "Cenedlaethol"
}
```

**New sub-jurisdictions** (append to `subJurisdictions` array):
```typescript
{
  subJurisdictionId: 10,
  name: "Special Educational Needs and Disability",
  welshName: "Anghenion Addysgol Arbennig ac Anabledd",
  jurisdictionId: 4
},
{
  subJurisdictionId: 11,
  name: "Criminal Injuries Compensation",
  welshName: "Iawndal am Anafiadau Troseddol",
  jurisdictionId: 4
},
{
  subJurisdictionId: 12,
  name: "Asylum Support",
  welshName: "Cymorth Lloches",
  jurisdictionId: 4
}
```

**New virtual locations** (append to `locations` array):
```typescript
{
  locationId: 13,
  name: "First-tier Tribunal (Special Educational Needs and Disability)",
  welshName: "Tribiwnlys Haen Gyntaf (Anghenion Addysgol Arbennig ac Anabledd)",
  regions: [7],
  subJurisdictions: [10]
},
{
  locationId: 14,
  name: "Criminal Injuries Compensation Tribunal",
  welshName: "Tribiwnlys Iawndal am Anafiadau Troseddol",
  regions: [7],
  subJurisdictions: [11]
},
{
  locationId: 15,
  name: "East London Tribunal Service",
  welshName: "Gwasanaeth Tribiwnlys Dwyrain Llundain",
  regions: [1],
  subJurisdictions: [12]
}
```

---

## 2. List Type Data Changes

### File: `libs/location/src/list-type-data.ts`

Append three entries to `listTypeData`:

```typescript
{
  id: 28,
  name: "SEND_DAILY_HEARING_LIST",
  englishFriendlyName: "First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List",
  welshFriendlyName: "Rhestr Gwrandawiadau Dyddiol y Tribiwnlys Haen Gyntaf (Anghenion Addysgol Arbennig ac Anabledd)",
  provenance: "MANUAL_UPLOAD",
  urlPath: "send-daily-hearing-list",
  isNonStrategic: true,
  defaultSensitivity: "Private",
  shortenedFriendlyName: "SEND Daily Hearing List",
  subJurisdictionIds: [10]
},
{
  id: 29,
  name: "CIC_WEEKLY_HEARING_LIST",
  englishFriendlyName: "Criminal Injuries Compensation Weekly Hearing List",
  welshFriendlyName: "Rhestr Gwrandawiadau Wythnosol yr Iawndal am Anafiadau Troseddol",
  provenance: "MANUAL_UPLOAD",
  urlPath: "cic-weekly-hearing-list",
  isNonStrategic: true,
  defaultSensitivity: "Public",
  shortenedFriendlyName: "CIC Weekly Hearing List",
  subJurisdictionIds: [11]
},
{
  id: 30,
  name: "AST_DAILY_HEARING_LIST",
  englishFriendlyName: "Asylum Support Tribunal Daily Hearing List",
  welshFriendlyName: "Rhestr Gwrandawiadau Dyddiol y Tribiwnlys Cymorth Lloches",
  provenance: "MANUAL_UPLOAD",
  urlPath: "ast-daily-hearing-list",
  isNonStrategic: true,
  defaultSensitivity: "Public",
  shortenedFriendlyName: "AST Daily Hearing List",
  subJurisdictionIds: [12]
}
```

**Note on SEND sensitivity**: SEND hearings are held in private by default; `defaultSensitivity: "Private"` reflects this.

---

## 3. Module: `send-daily-hearing-list`

### Path: `libs/list-types/send-daily-hearing-list/`

#### 3.1 `package.json`

```json
{
  "name": "@hmcts/send-daily-hearing-list",
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
    "build": "tsc && yarn build:nunjucks && yarn build:schemas",
    "build:nunjucks": "mkdir -p dist/pdf && cd src/pdf && find . -name '*.njk' -exec sh -c 'mkdir -p ../../dist/pdf/$(dirname {}) && cp {} ../../dist/pdf/{}' \\;",
    "build:schemas": "mkdir -p dist/schemas && cp src/schemas/*.json dist/schemas/",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "format": "biome format --write .",
    "lint": "biome check .",
    "lint:fix": "biome check --write --unsafe ."
  },
  "dependencies": {
    "@hmcts/list-types-common": "workspace:*",
    "@hmcts/pdf-generation": "workspace:*",
    "@hmcts/postgres-prisma": "workspace:*",
    "luxon": "3.7.2",
    "nunjucks": "3.2.4"
  },
  "devDependencies": {
    "@types/luxon": "3.7.1",
    "@types/node": "24.10.4",
    "typescript": "6.0.3",
    "vitest": "4.1.8"
  },
  "peerDependencies": {
    "express": "^5.1.0"
  }
}
```

#### 3.2 `tsconfig.json`

```json
{
  "extends": "../../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts", "dist", "node_modules", "src/assets/"]
}
```

#### 3.3 `src/config.ts`

```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const moduleRoot = __dirname;
export const assets = path.join(__dirname, "assets/");
export const schemaPath = path.join(__dirname, "schemas/send-daily-hearing-list.json");
```

#### 3.4 `src/index.ts`

```typescript
import "./conversion/send-config.js"; // Register converter on module load

export type { ValidationResult } from "@hmcts/publication";
export * from "./email-summary/summary-builder.js";
export * from "./models/types.js";
export * from "./pdf/pdf-generator.js";
export * from "./rendering/renderer.js";
```

#### 3.5 `src/models/types.ts`

```typescript
export interface SendDailyHearing {
  time: string;
  caseReferenceNumber: string;
  respondent: string;
  hearingType: string;
  venue: string;
  timeEstimate: string;
}

export type SendDailyHearingList = SendDailyHearing[];
```

#### 3.6 `src/schemas/send-daily-hearing-list.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SEND Daily Hearing List",
  "description": "Schema for First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["time", "caseReferenceNumber", "respondent", "hearingType", "venue", "timeEstimate"],
    "properties": {
      "time": {
        "title": "Time of hearing",
        "type": "string",
        "pattern": "^\\d{1,2}([:.]\\d{2})?[ap]m\\s*$",
        "examples": ["10am", "2:30pm"]
      },
      "caseReferenceNumber": {
        "title": "Case reference number",
        "type": "string",
        "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$",
        "examples": ["SEND/2025/001"]
      },
      "respondent": {
        "title": "Respondent",
        "type": "string",
        "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$",
        "examples": ["Local Authority"]
      },
      "hearingType": {
        "title": "Type of hearing",
        "type": "string",
        "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$",
        "examples": ["Final"]
      },
      "venue": {
        "title": "Venue",
        "type": "string",
        "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$",
        "examples": ["Remote"]
      },
      "timeEstimate": {
        "title": "Time estimate",
        "type": "string",
        "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$",
        "examples": ["2 hours"]
      }
    }
  }
}
```

#### 3.7 `src/conversion/send-config.ts`

```typescript
import {
  createConverter,
  type ExcelConverterConfig,
  registerConverter,
  registerConverterByName,
  TIME_PATTERN,
  validateTimeFormat,
  validateNoHtmlTags
} from "@hmcts/list-types-common";

// SEND Daily Hearing List (listTypeId: 28)
export const SEND_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    {
      header: "Time",
      fieldName: "time",
      required: true,
      validators: [validateTimeFormat(TIME_PATTERN, "hh:mma or hha (e.g., 10:30am or 2pm)")]
    },
    {
      header: "Case reference number",
      fieldName: "caseReferenceNumber",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case reference number", rowNumber)]
    },
    {
      header: "Respondent",
      fieldName: "respondent",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Respondent", rowNumber)]
    },
    {
      header: "Hearing type",
      fieldName: "hearingType",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Hearing type", rowNumber)]
    },
    {
      header: "Venue",
      fieldName: "venue",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Venue", rowNumber)]
    },
    {
      header: "Time estimate",
      fieldName: "timeEstimate",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Time estimate", rowNumber)]
    }
  ],
  minRows: 1
};

const sendConverter = createConverter(SEND_EXCEL_CONFIG);
registerConverter(28, sendConverter);
registerConverterByName("SEND_DAILY_HEARING_LIST", sendConverter);
```

**Note on time validation**: Check whether `TIME_PATTERN` and `validateTimeFormat` exist in `@hmcts/list-types-common`. The time field pattern `^\d{1,2}([:.]\\d{2})?[ap]m\s*$` is distinct from the `DD_MM_YYYY_PATTERN` used by CST. If a time-specific validator does not yet exist in the common module, the validator can be implemented inline using `validateDateFormat` with the correct pattern, or a new `validateTimeFormat` helper can be added to `@hmcts/list-types-common`. Verify before implementing.

#### 3.8 `src/rendering/renderer.ts`

```typescript
import { formatLastUpdatedDateTime } from "@hmcts/list-types-common";
import type { SendDailyHearing, SendDailyHearingList } from "../models/types.js";

export interface RenderOptions {
  locale: string;
  lastReceivedDate: string;
  listTitle: string;
}

export interface RenderedData {
  header: {
    listTitle: string;
    lastUpdatedDate: string;
    lastUpdatedTime: string;
  };
  hearings: SendDailyHearing[];
}

export function renderSendDailyHearingListData(hearingList: SendDailyHearingList, options: RenderOptions): RenderedData {
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);

  return {
    header: {
      listTitle: options.listTitle,
      lastUpdatedDate,
      lastUpdatedTime
    },
    hearings: hearingList.map((hearing) => ({ ...hearing }))
  };
}
```

Note: SEND is a daily list so there is no "week commencing" date. The time field is already a formatted string from the JSON so no date-parsing transformation is required.

#### 3.9 `src/email-summary/summary-builder.ts`

Email summary fields: time, caseReferenceNumber, venue.

```typescript
import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { SendDailyHearingList } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

export function extractCaseSummary(jsonData: SendDailyHearingList): CaseSummary[] {
  return jsonData.map((hearing) => [
    { label: "Time", value: hearing.time || "" },
    { label: "Case reference number", value: hearing.caseReferenceNumber || "" },
    { label: "Venue", value: hearing.venue || "" }
  ]);
}
```

#### 3.10 `src/pdf/pdf-generator.ts`

```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  type BasePdfGenerationOptions,
  configureNunjucks,
  createPdfErrorResult,
  loadTranslations,
  PDF_BASE_STYLES,
  type PdfGenerationResult,
  savePdfToStorage
} from "@hmcts/list-types-common";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import type { SendDailyHearingList } from "../models/types.js";
import { renderSendDailyHearingListData } from "../rendering/renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SEND is a daily list — no contentDate needed for rendering
type PdfGenerationOptions = BasePdfGenerationOptions<SendDailyHearingList>;

export async function generateSendDailyHearingListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  try {
    const renderedData = renderSendDailyHearingListData(options.jsonData, {
      locale: options.locale,
      lastReceivedDate: new Date().toISOString(),
      listTitle: "First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List"
    });

    const translations = await loadTranslations(
      options.locale,
      () => import("../locales/en.js"),
      () => import("../locales/cy.js")
    );

    const provenanceLabel = options.provenance
      ? PROVENANCE_LABELS[options.provenance as keyof typeof PROVENANCE_LABELS] || options.provenance
      : "";

    const env = configureNunjucks(__dirname);
    const html = env.render("pdf-template.njk", {
      header: renderedData.header,
      hearings: renderedData.hearings,
      dataSource: provenanceLabel,
      t: translations,
      pdfStyles: PDF_BASE_STYLES
    });

    const pdfResult = await generatePdfFromHtml(html);

    if (!pdfResult.success || !pdfResult.pdfBuffer) {
      return { success: false, error: pdfResult.error || "PDF generation failed" };
    }

    return await savePdfToStorage(options.artefactId, pdfResult.pdfBuffer, pdfResult.sizeBytes!);
  } catch (error) {
    return createPdfErrorResult(error);
  }
}
```

#### 3.11 `src/pdf/pdf-template.njk`

Table columns: Time, Case reference number, Respondent, Hearing type, Venue, Time estimate. The important information section renders the five SEND-specific paragraphs from locale.

#### 3.12 `src/locales/en.ts`

SEND is a daily list so uses `listForDate` rather than `listForWeekCommencing`.

```typescript
import { provenanceLabelsEn as provenanceLabels } from "@hmcts/list-types-common";

export const en = {
  pageTitle: "First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List",
  listForDate: "List for",
  lastUpdated: "Last updated",
  at: "at",
  factLinkText: "Find contact details and other information about courts and tribunals",
  factLinkUrl: "https://www.find-court-tribunal.service.gov.uk/",
  factAdditionalText: "in England and Wales, and some non-devolved tribunals in Scotland.",
  importantInformationTitle: "Important information",
  importantInformationParagraphs: [
    "Special Educational Needs and Disability (SEND) Tribunal hearings are held in private and unless a request from the parties for the hearing to be heard in public has been approved, you will not be able to observe.",
    "Private hearings do not allow anyone to observe remotely or in person. This includes members of the press.",
    "Open justice is a fundamental principle of our justice system. To attend a public hearing using a remote link you must apply for permission to observe.",
    "Requests to observe a public hearing that is taking place should be made in good time direct to: send@justice.gov.uk. You may be asked to provide further details.",
    "The judge hearing the case will decide if it is appropriate for you to observe remotely. They will have regard to the interests of justice, the technical capacity for remote observation and what is necessary to secure the proper administration of justice."
  ],
  importantInformationLinkText: "Observe a court or tribunal hearing as a journalist, researcher or member of the public",
  importantInformationLinkUrl: "https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing",
  searchCasesTitle: "Search Cases",
  searchCasesLabel: "Search by case reference, respondent, venue, or other details",
  tableHeaders: {
    time: "Time",
    caseReferenceNumber: "Case reference number",
    respondent: "Respondent",
    hearingType: "Hearing type",
    venue: "Venue",
    timeEstimate: "Time estimate"
  },
  dataSource: "Data source",
  backToTop: "Back to top",
  provenanceLabels
};
```

#### 3.13 `src/locales/cy.ts`

```typescript
import { provenanceLabelsCy as provenanceLabels } from "@hmcts/list-types-common";

export const cy = {
  pageTitle: "Rhestr Gwrandawiadau Dyddiol y Tribiwnlys Haen Gyntaf (Anghenion Addysgol Arbennig ac Anabledd)",
  listForDate: "Rhestr ar gyfer",
  lastUpdated: "Diweddarwyd ddiwethaf",
  at: "am",
  factLinkText: "Dod o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd yng Nghymru a Lloegr",
  factLinkUrl: "https://www.find-court-tribunal.service.gov.uk/",
  factAdditionalText: "a rhai tribiwnlysoedd heb eu datganoli yn yr Alban.",
  importantInformationTitle: "Gwybodaeth bwysig",
  importantInformationParagraphs: [
    "Mae gwrandawiadau Tribiwnlys Anghenion Addysgol Arbennig ac Anabledd (SEND) yn cael eu cynnal yn breifat ac oni bai bod cais gan y partïon i'r gwrandawiad gael ei gynnal yn gyhoeddus wedi'i gymeradwyo, ni fyddwch yn gallu arsylwi.",
    "Nid yw gwrandawiadau preifat yn caniatáu i unrhyw un arsylwi o bell nac yn bersonol. Mae hyn yn cynnwys aelodau o'r wasg.",
    "Mae cyfiawnder agored yn egwyddor sylfaenol ein system gyfiawnder. I fynychu gwrandawiad cyhoeddus gan ddefnyddio dolen bell, rhaid i chi wneud cais am ganiatâd i arsylwi.",
    "Dylid gwneud ceisiadau i arsylwi gwrandawiad cyhoeddus sy'n digwydd mewn da bryd yn uniongyrchol i: send@justice.gov.uk. Efallai y gofynnir i chi ddarparu rhagor o fanylion.",
    "Bydd y barnwr sy'n clywed yr achos yn penderfynu a yw'n briodol i chi arsylwi o bell. Byddant yn ystyried buddiannau cyfiawnder, y gallu technegol i arsylwi o bell a'r hyn sydd ei angen i sicrhau gweinyddiaeth gyfiawnder briodol."
  ],
  importantInformationLinkText: "Arsylwi gwrandawiad llys neu dribiwnlys fel newyddiadurwr, ymchwilydd neu aelod o'r cyhoedd",
  importantInformationLinkUrl: "https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing",
  searchCasesTitle: "Chwilio Achosion",
  searchCasesLabel: "Chwilio yn ôl cyfeirnod achos, atebydd, lleoliad, neu fanylion eraill",
  tableHeaders: {
    time: "Amser",
    caseReferenceNumber: "Cyfeirnod yr achos",
    respondent: "Atebydd",
    hearingType: "Math o wrandawiad",
    venue: "Lleoliad",
    timeEstimate: "Amcangyfrif o amser"
  },
  dataSource: "Ffynhonnell data",
  backToTop: "Yn ôl i frig y dudalen",
  provenanceLabels
};
```

---

## 4. Module: `cic-weekly-hearing-list`

### Path: `libs/list-types/cic-weekly-hearing-list/`

Package structure, tsconfig, and `config.ts`/`index.ts` follow identical patterns to SEND. Key differences:

#### 4.1 `src/models/types.ts`

The JSON field `venue/platform` contains a forward slash. The TypeScript model uses the bracket-notation-safe key name; the schema and converter must map to the raw string `"venue/platform"`.

```typescript
export interface CicWeeklyHearing {
  date: string;
  hearingTime: string;
  caseReferenceNumber: string;
  caseName: string;
  "venue/platform": string;
  judges: string;
  members: string;
  additionalInformation: string;
}

export type CicWeeklyHearingList = CicWeeklyHearing[];
```

#### 4.2 `src/schemas/cic-weekly-hearing-list.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CIC Weekly Hearing List",
  "description": "Schema for Criminal Injuries Compensation Weekly Hearing List",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["date", "hearingTime", "caseReferenceNumber", "caseName", "venue/platform", "judges", "members", "additionalInformation"],
    "properties": {
      "date": {
        "title": "Date",
        "type": "string",
        "pattern": "^\\d{2}/\\d{2}/\\d{4}$",
        "examples": ["02/01/2025"]
      },
      "hearingTime": {
        "title": "Hearing time",
        "type": "string",
        "pattern": "^\\d{1,2}([:.]\\d{2})?[ap]m\\s*$",
        "examples": ["10am", "2:30pm"]
      },
      "caseReferenceNumber": {
        "title": "Case reference number",
        "type": "string",
        "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$"
      },
      "caseName": {
        "title": "Case name",
        "type": "string",
        "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$"
      },
      "venue/platform": {
        "title": "Venue or platform",
        "type": "string",
        "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$"
      },
      "judges": {
        "title": "Judge(s)",
        "type": "string",
        "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$"
      },
      "members": {
        "title": "Member(s)",
        "type": "string",
        "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$"
      },
      "additionalInformation": {
        "title": "Additional information",
        "type": "string",
        "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$"
      }
    }
  }
}
```

#### 4.3 `src/conversion/cic-config.ts`

The Excel column header for the venue/platform field must be `"Venue/platform"` so it maps to `fieldName: "venue/platform"`.

```typescript
import {
  createConverter,
  DD_MM_YYYY_PATTERN,
  type ExcelConverterConfig,
  registerConverter,
  registerConverterByName,
  validateDateFormat,
  validateNoHtmlTags
} from "@hmcts/list-types-common";

export const CIC_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    {
      header: "Date",
      fieldName: "date",
      required: true,
      validators: [validateDateFormat(DD_MM_YYYY_PATTERN, "dd/MM/yyyy (e.g., 02/01/2025)")]
    },
    {
      header: "Hearing time",
      fieldName: "hearingTime",
      required: true,
      validators: [/* time format validator */]
    },
    {
      header: "Case reference number",
      fieldName: "caseReferenceNumber",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case reference number", rowNumber)]
    },
    {
      header: "Case name",
      fieldName: "caseName",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case name", rowNumber)]
    },
    {
      header: "Venue/platform",
      fieldName: "venue/platform",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Venue/platform", rowNumber)]
    },
    {
      header: "Judge(s)",
      fieldName: "judges",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Judge(s)", rowNumber)]
    },
    {
      header: "Member(s)",
      fieldName: "members",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Member(s)", rowNumber)]
    },
    {
      header: "Additional information",
      fieldName: "additionalInformation",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Additional information", rowNumber)]
    }
  ],
  minRows: 1
};

const cicConverter = createConverter(CIC_EXCEL_CONFIG);
registerConverter(29, cicConverter);
registerConverterByName("CIC_WEEKLY_HEARING_LIST", cicConverter);
```

#### 4.4 `src/rendering/renderer.ts`

CIC is weekly, so the renderer includes `weekCommencingDate` in the header (same pattern as CST). The `date` field is formatted with `formatDdMmYyyyDate`. `venue/platform` must be accessed via bracket notation: `hearing["venue/platform"]`.

#### 4.5 `src/email-summary/summary-builder.ts`

Email summary fields: hearingTime, caseReferenceNumber, venue/platform.

```typescript
export function extractCaseSummary(jsonData: CicWeeklyHearingList): CaseSummary[] {
  return jsonData.map((hearing) => [
    { label: "Hearing time", value: hearing.hearingTime || "" },
    { label: "Case reference number", value: hearing.caseReferenceNumber || "" },
    { label: "Venue/platform", value: hearing["venue/platform"] || "" }
  ]);
}
```

#### 4.6 `src/locales/en.ts` (key values)

```typescript
export const en = {
  pageTitle: "Criminal Injuries Compensation Weekly Hearing List",
  listForWeekCommencing: "List for week commencing",
  // ...
  importantInformationParagraphs: [
    "Open justice is a fundamental principle of our justice system.",
    "When considering the use of telephone and video technology, the judiciary will have regard to the principles of open justice. Judges may determine that a hearing should be held in private if this is necessary to secure the proper administration of justice.",
    "Criminal Injuries Compensation Tribunal parties and representatives will be informed directly as to the arrangements for hearing cases remotely. Any other person interested in joining the hearing remotely should contact the Criminal Injuries Compensation Tribunal Office direct, in advance of the hearing date, by emailing CIC.enquiries@Justice.gov.uk so that arrangements can be made. The following details should be included in the subject line of the email [OBSERVER/MEDIA] REQUEST – [AN Other v CICA] – [hearing date]. If the case is to be heard in private or is subject to a reporting restriction, this will be notified."
  ],
  restrictedReportingOrdersTitle: "Restricted Reporting Orders",
  restrictedReportingOrdersText: "The inclusion of a case in the Press List is no guarantee that it is not subject to a restricted reporting order. Members of the press should ensure that no order exists on an individual case before submitting material for publication.",
  importantInformationLinkText: "Observe a court or tribunal hearing as a journalist, researcher or member of the public",
  importantInformationLinkUrl: "https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing",
  tableHeaders: {
    date: "Date",
    hearingTime: "Hearing time",
    caseReferenceNumber: "Case reference number",
    caseName: "Case name",
    venuePlatform: "Venue/platform",
    judges: "Judge(s)",
    members: "Member(s)",
    additionalInformation: "Additional information"
  },
  // ...
};
```

Note: The template must access `hearing["venue/platform"]` not `hearing.venuePlatform` since the data key contains a slash. The `tableHeaders.venuePlatform` locale key is only used for the column header label.

---

## 5. Module: `ast-daily-hearing-list`

### Path: `libs/list-types/ast-daily-hearing-list/`

#### 5.1 `src/models/types.ts`

```typescript
export interface AstDailyHearing {
  appellant: string;
  appealReferenceNumber: string;
  caseType: string;
  hearingType: string;
  hearingTime: string;
  additionalInformation: string;
}

export type AstDailyHearingList = AstDailyHearing[];
```

#### 5.2 `src/schemas/ast-daily-hearing-list.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AST Daily Hearing List",
  "description": "Schema for Asylum Support Tribunal Daily Hearing List",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["appellant", "appealReferenceNumber", "caseType", "hearingType", "hearingTime", "additionalInformation"],
    "properties": {
      "appellant": {
        "title": "Appellant",
        "type": "string",
        "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$"
      },
      "appealReferenceNumber": {
        "title": "Appeal reference number",
        "type": "string",
        "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$"
      },
      "caseType": {
        "title": "Case type",
        "type": "string",
        "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$"
      },
      "hearingType": {
        "title": "Hearing type",
        "type": "string",
        "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$"
      },
      "hearingTime": {
        "title": "Hearing time",
        "type": "string",
        "pattern": "^\\d{1,2}([:.]\\d{2})?[ap]m\\s*$",
        "examples": ["10am", "2:30pm"]
      },
      "additionalInformation": {
        "title": "Additional information",
        "type": "string",
        "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$"
      }
    }
  }
}
```

#### 5.3 `src/conversion/ast-config.ts`

```typescript
registerConverter(30, astConverter);
registerConverterByName("AST_DAILY_HEARING_LIST", astConverter);
```

Fields: appellant, appealReferenceNumber, caseType, hearingType, hearingTime (time validator), additionalInformation.

#### 5.4 `src/rendering/renderer.ts`

AST is daily, same structure as SEND renderer. No date formatting needed for hearingTime (already a string).

#### 5.5 `src/email-summary/summary-builder.ts`

Email summary fields: appellant, appealReferenceNumber, hearingTime.

```typescript
export function extractCaseSummary(jsonData: AstDailyHearingList): CaseSummary[] {
  return jsonData.map((hearing) => [
    { label: "Appellant", value: hearing.appellant || "" },
    { label: "Appeal reference number", value: hearing.appealReferenceNumber || "" },
    { label: "Hearing time", value: hearing.hearingTime || "" }
  ]);
}
```

#### 5.6 Fixed venue address

The AST page must display a fixed venue address in the important information section:

`East London Tribunal Service, HMCTS, 2nd Floor, Import Building, 2 Clove Crescent London E14 2BE`

This is stored as a locale string `venueAddress` in both `en.ts` and `cy.ts`, rendered in the Nunjucks template and PDF template.

#### 5.7 `src/locales/en.ts` (key values)

```typescript
export const en = {
  pageTitle: "Asylum Support Tribunal Daily Hearing List",
  // ...
  venueAddress: "East London Tribunal Service, HMCTS, 2nd Floor, Import Building, 2 Clove Crescent London E14 2BE",
  importantInformationParagraphs: [
    "Open justice is a fundamental principle of our justice system. When considering the use of telephone and video technology, the judiciary will have regard to the principles of open justice. Judges may determine that a hearing should be held in private if this is necessary to secure the proper administration of justice.",
    "Asylum Support Tribunal parties and representatives will be informed directly as to the arrangements for hearing cases remotely. Any other person interested in joining the hearing remotely should contact the Asylum Support Tribunal Office direct, in advance of the hearing date, by emailing asylumsupporttribunals@justice.gov.uk so that arrangements can be made. The following details should be included in the subject line of the email [OBSERVER/MEDIA] REQUEST – [case reference] – [hearing date]. If the case is to be heard in private or is subject to a reporting restriction, this will be notified."
  ],
  importantInformationLinkText: "Observe a court or tribunal hearing as a journalist, researcher or member of the public",
  importantInformationLinkUrl: "https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing",
  tableHeaders: {
    appellant: "Appellant",
    appealReferenceNumber: "Appeal reference number",
    caseType: "Case type",
    hearingType: "Hearing type",
    hearingTime: "Hearing time",
    additionalInformation: "Additional information"
  },
  // ...
};
```

---

## 6. Page Controllers and Templates

### Pattern for each list type

Each list type gets a page directory at:
`apps/web/src/pages/(list-types)/[url-path]/`

Containing:
- `index.ts` — controller (GET handler, imports from lib and config)
- `[url-path].njk` — Nunjucks template
- `en.ts` — English page content (co-located)
- `cy.ts` — Welsh page content (co-located)

The controller follows the CST pattern exactly: reads `artefactId` query param, loads JSON from storage, validates against schema, calls renderer, passes data to template. SEND and AST do not pass a `contentDate` to the renderer (daily lists). CIC does (weekly list).

**Example: `send-daily-hearing-list/index.ts` (abbreviated)**

```typescript
import {
  type SendDailyHearingList,
  renderSendDailyHearingListData
} from "@hmcts/send-daily-hearing-list";
import { schemaPath } from "@hmcts/send-daily-hearing-list/config";
import { createJsonValidator } from "@hmcts/list-types-common";
import { getArtefactById } from "@hmcts/publication";
// ...

const validate = createJsonValidator(schemaPath);

export const GET = async (req: Request, res: Response) => {
  // ... standard artefactId lookup and error handling ...

  const { header, hearings } = renderSendDailyHearingListData(jsonData, {
    locale,
    lastReceivedDate: artefact.lastReceivedDate.toISOString(),
    listTitle: t.pageTitle
  });

  res.render("send-daily-hearing-list", { en, cy, t, title: header.listTitle, header, hearings, dataSource });
};
```

### Template notes

- SEND template: renders `importantInformationParagraphs` as a `{% for %}` loop over `<p>` tags.
- CIC template: same paragraphs loop plus a separate `restrictedReportingOrders` subsection heading and paragraph. The table cell for venue/platform uses `hearing["venue/platform"]` via Nunjucks bracket notation or a helper variable set in the controller.
- AST template: renders `venueAddress` as a prominent block above the table. Also uses `importantInformationParagraphs` loop.

For Nunjucks, accessing a key with a slash requires: `{{ hearing["venue/platform"] }}` — confirm this syntax works in the Nunjucks version in use (3.2.4). If bracket notation is not supported, the controller should remap the field to `venuePlatform` before passing to the template.

---

## 7. Registration in Shared Services

### 7.1 `libs/publication/src/processing/service.ts`

Add imports at the top:
```typescript
import { type SendDailyHearingList, generateSendDailyHearingListPdf } from "@hmcts/send-daily-hearing-list";
import { type CicWeeklyHearingList, generateCicWeeklyHearingListPdf } from "@hmcts/cic-weekly-hearing-list";
import { type AstDailyHearingList, generateAstDailyHearingListPdf } from "@hmcts/ast-daily-hearing-list";
```

Add to `PDF_GENERATOR_REGISTRY`:
```typescript
SEND_DAILY_HEARING_LIST: (p) =>
  generateSendDailyHearingListPdf({ ...p, jsonData: p.jsonData as SendDailyHearingList }),
CIC_WEEKLY_HEARING_LIST: (p) =>
  generateCicWeeklyHearingListPdf({ ...p, jsonData: p.jsonData as CicWeeklyHearingList }),
AST_DAILY_HEARING_LIST: (p) =>
  generateAstDailyHearingListPdf({ ...p, jsonData: p.jsonData as AstDailyHearingList }),
```

### 7.2 `libs/notifications/src/notification/notification-service.ts`

Add imports:
```typescript
import {
  extractCaseSummary as extractSendSummary,
  formatCaseSummaryForEmail as formatSendSummaryForEmail
} from "@hmcts/send-daily-hearing-list";
import {
  extractCaseSummary as extractCicSummary,
  formatCaseSummaryForEmail as formatCicSummaryForEmail
} from "@hmcts/cic-weekly-hearing-list";
import {
  extractCaseSummary as extractAstSummary,
  formatCaseSummaryForEmail as formatAstSummaryForEmail
} from "@hmcts/ast-daily-hearing-list";
```

Add to `EMAIL_BUILDER_REGISTRY`:
```typescript
SEND_DAILY_HEARING_LIST: {
  extract: extractSendSummary as SummaryExtractor,
  format: formatSendSummaryForEmail
},
CIC_WEEKLY_HEARING_LIST: {
  extract: extractCicSummary as SummaryExtractor,
  format: formatCicSummaryForEmail
},
AST_DAILY_HEARING_LIST: {
  extract: extractAstSummary as SummaryExtractor,
  format: formatAstSummaryForEmail
},
```

### 7.3 `apps/web/src/app.ts`

Add imports:
```typescript
import { moduleRoot as sendDailyHearingListModuleRoot } from "@hmcts/send-daily-hearing-list/config";
import { moduleRoot as cicWeeklyHearingListModuleRoot } from "@hmcts/cic-weekly-hearing-list/config";
import { moduleRoot as astDailyHearingListModuleRoot } from "@hmcts/ast-daily-hearing-list/config";
```

Add to `modulePaths` array:
```typescript
sendDailyHearingListModuleRoot,
cicWeeklyHearingListModuleRoot,
astDailyHearingListModuleRoot,
```

### 7.4 `apps/web/src/pages/(admin)/non-strategic-upload/index.ts`

Add at the top of the file (side-effect imports to register converters):
```typescript
import "@hmcts/send-daily-hearing-list"; // Register SEND converter
import "@hmcts/cic-weekly-hearing-list"; // Register CIC converter
import "@hmcts/ast-daily-hearing-list"; // Register AST converter
```

---

## 8. Root Configuration

### 8.1 Root `tsconfig.json`

Add path aliases to `compilerOptions.paths`:
```json
"@hmcts/send-daily-hearing-list": ["libs/list-types/send-daily-hearing-list/src"],
"@hmcts/send-daily-hearing-list/config": ["libs/list-types/send-daily-hearing-list/src/config"],
"@hmcts/cic-weekly-hearing-list": ["libs/list-types/cic-weekly-hearing-list/src"],
"@hmcts/cic-weekly-hearing-list/config": ["libs/list-types/cic-weekly-hearing-list/src/config"],
"@hmcts/ast-daily-hearing-list": ["libs/list-types/ast-daily-hearing-list/src"],
"@hmcts/ast-daily-hearing-list/config": ["libs/list-types/ast-daily-hearing-list/src/config"]
```

### 8.2 Root `package.json`

The root `package.json` already has `"libs/list-types/*"` in the workspaces array, so no change is needed there.

### 8.3 `apps/web/package.json`

Add three workspace dependencies:
```json
"@hmcts/send-daily-hearing-list": "workspace:*",
"@hmcts/cic-weekly-hearing-list": "workspace:*",
"@hmcts/ast-daily-hearing-list": "workspace:*",
```

---

## 9. Dependency Graph

```
apps/web
  -> @hmcts/send-daily-hearing-list
  -> @hmcts/cic-weekly-hearing-list
  -> @hmcts/ast-daily-hearing-list
  -> @hmcts/list-types-common (existing)

libs/publication
  -> @hmcts/send-daily-hearing-list
  -> @hmcts/cic-weekly-hearing-list
  -> @hmcts/ast-daily-hearing-list

libs/notifications
  -> @hmcts/send-daily-hearing-list
  -> @hmcts/cic-weekly-hearing-list
  -> @hmcts/ast-daily-hearing-list

libs/location (data only, no new code deps)

Each new lib -> @hmcts/list-types-common, @hmcts/pdf-generation, @hmcts/postgres-prisma
```

No circular dependencies are introduced. Each new lib is a leaf node in the dependency graph.

---

## 10. Testing

### Unit tests

Each module needs at minimum:
- `src/rendering/renderer.test.ts` — verify output shape, field mapping, handling of empty lists
- `src/email-summary/summary-builder.test.ts` — verify summary fields are extracted correctly
- `src/conversion/[name]-config.test.ts` — verify converters register and validate valid/invalid Excel input
- `src/config.test.ts` — verify exported paths resolve to real files (matching CST's `config.test.ts`)

### Page controller tests

- `apps/web/src/pages/(list-types)/[url-path]/index.test.ts` for each list type
- Test: missing artefactId returns 400
- Test: artefact not found returns 404
- Test: valid data renders template with correct props
- Test: invalid JSON returns 400

### Existing tests

No existing tests should break since this is purely additive. The shared service registries (`PDF_GENERATOR_REGISTRY`, `EMAIL_BUILDER_REGISTRY`) are `Partial<Record<string, ...>>` so missing keys return `undefined` gracefully.

---

## 11. Acceptance Criteria Mapping

| Acceptance Criterion | Implementation |
|---|---|
| Validation schemas created | `src/schemas/*.json` in each module, validated via `createJsonValidator` in page controller |
| Error handling for schemas | Controller renders `errors/common` with 400/404/500 as appropriate |
| Valid publications saved | Existing publication flow handles storage; no changes needed |
| List classification (Public/Private) | `defaultSensitivity` in list-type-data.ts: SEND=Private, CIC=Public, AST=Public |
| PDF templates created | `src/pdf/pdf-template.njk` + `pdf-generator.ts` in each module |
| Unified email summary format | `extractCaseSummary` + `formatCaseSummaryForEmail` from `@hmcts/list-types-common` |
| Style guides / page templates | `[url-path].njk` in apps/web/src/pages/(list-types) |
| Full names displayed on front-end | `pageTitle` in `en.ts`/`cy.ts` per module |
| Short names on upload form | `shortenedFriendlyName` in list-type-data.ts |
| SEND + CIC linked to Tribunal + National | subJurisdictions [10,11], region [7] |
| AST linked to Tribunal + London | subJurisdiction [12], region [1] |
| SEND + AST daily, CIC weekly | `urlPath` names reflect this; PDF header shows date vs week commencing accordingly |
| SEND fields | time, caseReferenceNumber, respondent, hearingType, venue, timeEstimate |
| CIC fields | date, hearingTime, caseReferenceNumber, caseName, venue/platform, judges, members, additionalInformation |
| AST fields | appellant, appealReferenceNumber, caseType, hearingType, hearingTime, additionalInformation |
| AST fixed venue address | `venueAddress` locale key; rendered as a static block in template and PDF |
| SEND email summary | time, caseReferenceNumber, venue |
| CIC email summary | hearingTime, caseReferenceNumber, venue/platform |
| AST email summary | appellant, appealReferenceNumber, hearingTime |
| Important information content | `importantInformationParagraphs` array in locales; looped in template |
| Welsh translations | `cy.ts` for all modules and page controllers |
| WCAG 2.2 AA | GOV.UK Design System components; semantic HTML; no custom interactive elements |
