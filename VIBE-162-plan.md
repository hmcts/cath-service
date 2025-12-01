# VIBE-162: Excel Upload – Implementation Plan

## Overview

This plan details the technical implementation for adding an Excel upload form to the `@hmcts/admin-pages` module. The implementation follows established patterns from the existing `manual-upload` feature.

## Architecture Decisions

### Module Location

**Decision**: Extend `libs/admin-pages` rather than create new module

**Rationale**:
- Excel upload is admin functionality (requires admin roles)
- Follows same patterns as existing `manual-upload`
- Shares authentication, validation, and storage patterns
- Keeps related admin features together

### Structure

```
libs/admin-pages/
├── src/
│   ├── excel-upload/              # NEW: Business logic
│   │   ├── model.ts               # Types and interfaces
│   │   ├── validation.ts          # Form validation logic
│   │   ├── validation.test.ts     # Validation tests
│   │   ├── storage.ts             # Session storage helpers
│   │   └── storage.test.ts        # Storage tests
│   └── pages/
│       └── excel-upload/          # NEW: Page controller and template
│           ├── index.ts           # GET/POST handlers
│           ├── index.test.ts      # Controller tests
│           ├── index.njk          # Nunjucks template
│           ├── index.njk.test.ts  # Template tests
│           ├── en.ts              # English translations
│           └── cy.ts              # Welsh translations
```

### File Upload Registration

**Location**: `apps/web/src/app.ts`

Add multer middleware registration for `/excel-upload` POST route:

```typescript
// Register file upload middleware for excel upload
app.post("/excel-upload", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      req.fileUploadError = err;
    }
    next();
  });
});
```

**Note**: This must be registered BEFORE the simple-router for admin pages.

## Implementation Details

### 1. Data Models (`libs/admin-pages/src/excel-upload/model.ts`)

```typescript
import { Language, Sensitivity } from "@hmcts/publication";
import type { DateInput } from "@hmcts/web-core";

export interface ExcelUploadFormData {
  locationId?: string;
  locationName?: string;
  listType?: string;
  hearingStartDate?: DateInput;
  sensitivity?: string;
  language?: string;
  displayFrom?: DateInput;
  displayTo?: DateInput;
}

export interface ValidationError {
  text: string;
  href: string;
}

export const SENSITIVITY_LABELS: Record<string, string> = {
  [Sensitivity.PUBLIC]: "Public",
  [Sensitivity.PRIVATE]: "Private",
  [Sensitivity.CLASSIFIED]: "Classified"
};

export const LANGUAGE_LABELS: Record<string, string> = {
  [Language.ENGLISH]: "English",
  [Language.WELSH]: "Welsh",
  [Language.BILINGUAL]: "Bilingual"
};

declare module "express-session" {
  interface SessionData {
    excelUploadForm?: ExcelUploadFormData;
    excelUploadErrors?: ValidationError[];
    excelUploadSubmitted?: boolean;
  }
}
```

**Key Points**:
- Reuses `Sensitivity` and `Language` enums from `@hmcts/publication`
- Uses `DateInput` type from `@hmcts/web-core` (consistent with manual-upload)
- Session data typed via module augmentation
- Simpler than manual-upload (no `uploadConfirmed`, `successPageViewed`, `viewedLanguage`)

### 2. Validation Logic (`libs/admin-pages/src/excel-upload/validation.ts`)

```typescript
import { mockListTypes } from "@hmcts/list-types-common";
import { type DateInput, parseDate } from "@hmcts/web-core";
import type { en } from "../pages/excel-upload/en.js";
import type { ExcelUploadFormData, ValidationError } from "./model.js";

export type { ValidationError };

export async function validateForm(
  body: ExcelUploadFormData,
  file: Express.Multer.File | undefined,
  t: typeof en
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // File validation
  if (!file) {
    errors.push({ text: t.errorMessages.fileRequired, href: "#file" });
  } else {
    if (file.size > 2 * 1024 * 1024) {
      errors.push({ text: t.errorMessages.fileSize, href: "#file" });
    }
    const allowedExtensions = /\.(csv|doc|docx|htm|html|json|pdf)$/i;
    if (!allowedExtensions.test(file.originalname)) {
      errors.push({ text: t.errorMessages.fileType, href: "#file" });
    }
  }

  // Location validation
  if (!body.locationId || body.locationId.trim() === "") {
    if (body.locationName && body.locationName.trim().length >= 3) {
      errors.push({ text: t.errorMessages.courtRequired, href: "#court" });
    } else {
      errors.push({ text: t.errorMessages.courtTooShort, href: "#court" });
    }
  } else if (Number.isNaN(Number(body.locationId))) {
    errors.push({ text: t.errorMessages.courtRequired, href: "#court" });
  }

  // List type validation
  if (!body.listType || body.listType === "") {
    errors.push({ text: t.errorMessages.listTypeRequired, href: "#listType" });
  }

  // Date validations
  const hearingStartDateError = validateDate(
    body.hearingStartDate,
    "hearingStartDate",
    t.errorMessages.hearingStartDateRequired,
    t.errorMessages.hearingStartDateInvalid
  );
  if (hearingStartDateError) {
    errors.push(hearingStartDateError);
  }

  // Sensitivity validation
  if (!body.sensitivity || body.sensitivity === "") {
    errors.push({ text: t.errorMessages.sensitivityRequired, href: "#sensitivity" });
  }

  // Language validation
  if (!body.language || body.language === "") {
    errors.push({ text: t.errorMessages.languageRequired, href: "#language" });
  }

  // Display from validation
  const displayFromError = validateDate(
    body.displayFrom,
    "displayFrom",
    t.errorMessages.displayFromRequired,
    t.errorMessages.displayFromInvalid
  );
  if (displayFromError) {
    errors.push(displayFromError);
  }

  // Display to validation
  const displayToError = validateDate(
    body.displayTo,
    "displayTo",
    t.errorMessages.displayToRequired,
    t.errorMessages.displayToInvalid
  );
  if (displayToError) {
    errors.push(displayToError);
  }

  // Date comparison validation
  if (!displayFromError && !displayToError && body.displayFrom && body.displayTo) {
    const fromDate = parseDate(body.displayFrom);
    const toDate = parseDate(body.displayTo);

    if (fromDate && toDate && toDate < fromDate) {
      errors.push({ text: t.errorMessages.displayToBeforeFrom, href: "#displayTo" });
    }
  }

  return errors;
}

export function validateDate(
  dateInput: DateInput | undefined,
  fieldName: string,
  requiredMessage: string,
  invalidMessage: string
): ValidationError | null {
  if (!dateInput || !dateInput.day || !dateInput.month || !dateInput.year) {
    return { text: requiredMessage, href: `#${fieldName}` };
  }

  // Validate day and month are exactly 2 characters
  if (dateInput.day.length !== 2 || dateInput.month.length !== 2) {
    return { text: invalidMessage, href: `#${fieldName}` };
  }

  const parsedDate = parseDate(dateInput);
  if (!parsedDate) {
    return { text: invalidMessage, href: `#${fieldName}` };
  }

  return null;
}
```

**Key Points**:
- Nearly identical to manual-upload validation
- No JSON schema validation (unlike manual-upload)
- Uses `parseDate()` from `@hmcts/web-core`
- Returns array of `ValidationError` objects for display

### 3. Storage Logic (`libs/admin-pages/src/excel-upload/storage.ts`)

```typescript
import type { DateInput } from "@hmcts/web-core";

export interface ExcelUploadData {
  file: Buffer;
  fileName: string;
  fileType: string;
  locationId: string;
  listType: string;
  hearingStartDate: DateInput;
  sensitivity: string;
  language: string;
  displayFrom: DateInput;
  displayTo: DateInput;
}

export async function storeExcelUpload(data: ExcelUploadData): Promise<string> {
  // Generate upload ID for session tracking
  const uploadId = crypto.randomUUID();

  // TODO: Store in session or temporary storage
  // For now, just return the ID for summary page

  return uploadId;
}
```

**Key Points**:
- Placeholder for session storage logic
- Returns upload ID for summary page
- Will be enhanced in VIBE-166 for actual publication

### 4. Page Controller (`libs/admin-pages/src/pages/excel-upload/index.ts`)

```typescript
import { requireRole, USER_ROLES } from "@hmcts/auth";
import "@hmcts/web-core"; // Import for Express type augmentation
import { getAllLocations, getLocationById } from "@hmcts/location";
import { Language, mockListTypes } from "@hmcts/publication";
import type { Request, RequestHandler, Response } from "express";
import "../../excel-upload/model.js";
import { LANGUAGE_LABELS, type ExcelUploadFormData, SENSITIVITY_LABELS } from "../../excel-upload/model.js";
import { storeExcelUpload } from "../../excel-upload/storage.js";
import { validateForm } from "../../excel-upload/validation.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const LIST_TYPES = [
  { value: "", text: "<Please choose a list type>" },
  ...mockListTypes.map((listType) => ({ value: listType.id.toString(), text: listType.englishFriendlyName }))
];

const SENSITIVITY_OPTIONS = [
  { value: "", text: "<Please choose a sensitivity>" },
  ...Object.entries(SENSITIVITY_LABELS).map(([value, text]) => ({ value, text }))
];

const LANGUAGE_OPTIONS = [
  { value: "", text: "" },
  ...Object.entries(LANGUAGE_LABELS).map(([value, text]) => ({ value, text }))
];

const getTranslations = (locale: string) => (locale === "cy" ? cy : en);

const hasValue = (val: any) => val !== undefined && val !== null && val !== "" && val.toString().trim() !== "";

function parseDateInput(body: any, prefix: string) {
  const day = body[`${prefix}-day`];
  const month = body[`${prefix}-month`];
  const year = body[`${prefix}-year`];

  return hasValue(day) || hasValue(month) || hasValue(year)
    ? { day: day || "", month: month || "", year: year || "" }
    : undefined;
}

function transformDateFields(body: any): ExcelUploadFormData {
  return {
    locationId: body.locationId,
    locationName: body["court-display"],
    listType: body.listType,
    hearingStartDate: parseDateInput(body, "hearingStartDate"),
    sensitivity: body.sensitivity,
    language: body.language,
    displayFrom: parseDateInput(body, "displayFrom"),
    displayTo: parseDateInput(body, "displayTo")
  };
}

function saveSession(session: any): Promise<void> {
  return new Promise((resolve, reject) => {
    session.save((err: any) => (err ? reject(err) : resolve()));
  });
}

function selectOption(options: any[], selectedValue: string | undefined) {
  return options.map((item) => ({ ...item, selected: item.value === selectedValue }));
}

const getHandler = async (req: Request, res: Response) => {
  const locale = "en";
  const t = getTranslations(locale);

  const wasSubmitted = req.session.excelUploadSubmitted || false;
  let formData = req.session.excelUploadForm || {};
  const errors = req.session.excelUploadErrors || [];

  delete req.session.excelUploadErrors;

  // Clear form data on refresh if not successfully submitted
  if (!wasSubmitted) {
    delete req.session.excelUploadForm;
  }

  // Support pre-filling from query parameter
  if (req.query.locationId && !formData.locationId) {
    formData = { ...formData, locationId: req.query.locationId as string };
  }

  // Resolve location name from ID or use stored name
  const locationId = formData.locationId ? Number.parseInt(formData.locationId, 10) : null;
  const location = locationId && !Number.isNaN(locationId) ? await getLocationById(locationId) : null;
  const locationName = location?.name || formData.locationName || "";

  res.render("excel-upload/index", {
    ...t,
    errors: errors.length > 0 ? errors : undefined,
    data: { ...formData, locationName },
    locations: await getAllLocations(locale),
    listTypes: selectOption(LIST_TYPES, formData.listType),
    sensitivityOptions: selectOption(SENSITIVITY_OPTIONS, formData.sensitivity),
    languageOptions: selectOption(LANGUAGE_OPTIONS, formData.language || Language.ENGLISH),
    locale,
    hideLanguageToggle: true
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = "en" as "en" | "cy";
  const t = getTranslations(locale);

  const formData = transformDateFields(req.body);

  // Check for multer errors (e.g., file too large)
  const fileUploadError = req.fileUploadError;
  let errors = await validateForm(formData, req.file, t);

  // If multer threw a file size error, replace the "fileRequired" error with the file size error
  if (fileUploadError && fileUploadError.code === "LIMIT_FILE_SIZE") {
    errors = errors.filter((e) => e.text !== t.errorMessages.fileRequired);
    errors = [{ text: t.errorMessages.fileSize, href: "#file" }, ...errors];
  }

  if (errors.length > 0) {
    req.session.excelUploadErrors = errors;
    req.session.excelUploadForm = formData;
    await saveSession(req.session);
    return res.redirect("/excel-upload");
  }

  const uploadId = await storeExcelUpload({
    file: req.file!.buffer,
    fileName: req.file!.originalname,
    fileType: req.file!.mimetype,
    locationId: formData.locationId!,
    listType: formData.listType!,
    hearingStartDate: formData.hearingStartDate!,
    sensitivity: formData.sensitivity!,
    language: formData.language!,
    displayFrom: formData.displayFrom!,
    displayTo: formData.displayTo!
  });

  req.session.excelUploadForm = formData;
  req.session.excelUploadSubmitted = true;
  await saveSession(req.session);

  res.redirect(`/excel-upload-summary?uploadId=${uploadId}`);
};

export const GET: RequestHandler[] = [
  requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]),
  getHandler
];
export const POST: RequestHandler[] = [
  requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]),
  postHandler
];
```

**Key Points**:
- Nearly identical structure to manual-upload controller
- Uses POST-Redirect-GET pattern for error handling
- Preserves form data in session on validation errors
- Redirects to `excel-upload-summary` on success (VIBE-166)
- English-only for now (can add Welsh later)

### 5. Nunjucks Template (`libs/admin-pages/src/pages/excel-upload/index.njk`)

```html
{% extends "layouts/base-template.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/file-upload/macro.njk" import govukFileUpload %}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/select/macro.njk" import govukSelect %}
{% from "govuk/components/date-input/macro.njk" import govukDateInput %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}

{% block pageTitle %}
  {{ pageTitle }} - {{ serviceName }} - {{ govUk }}
{% endblock %}

{% macro getError(errors, fieldId) -%}
  {%- if errors -%}
    {%- for error in errors -%}
      {%- if error.href == fieldId -%}{{ error.text }}{%- endif -%}
    {%- endfor -%}
  {%- endif -%}
{%- endmacro %}

{% block page_content %}
{% if errors %}
  {{ govukErrorSummary({
    titleText: errorSummaryTitle,
    errorList: errors
  }) }}
{% endif %}

<div class="manual-upload-warning">
  <h2 class="govuk-heading-m">{{ warningTitle }}</h2>
  <div class="manual-upload-warning__content">
    <span class="govuk-warning-text__icon manual-upload-warning__icon" aria-hidden="true">!</span>
    <p class="govuk-body manual-upload-warning__text">
      <strong>{{ warningMessage }}</strong>
    </p>
  </div>
</div>

<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">

    <h1 class="govuk-heading-xl">{{ title }}</h1>

    <form method="post" enctype="multipart/form-data" novalidate>

      {% set fileErrorText = getError(errors, "#file") %}
      <div class="govuk-inset-text">
        <div class="govuk-form-group{% if (fileErrorText and fileErrorText | length > 0) %} govuk-form-group--error{% endif %}">
          <label class="govuk-label" for="file">
            {{ fileUploadLabel }}
          </label>
          {% if (fileErrorText and fileErrorText | length > 0) %}
            <p class="govuk-error-message">
              <span class="govuk-visually-hidden">Error:</span> {{ fileErrorText }}
            </p>
          {% endif %}
          <input class="govuk-file-upload{% if (fileErrorText and fileErrorText | length > 0) %} govuk-file-upload--error{% endif %}" id="file" name="file" type="file" />
        </div>
      </div>

      {% set courtErrorText = getError(errors, "#court") %}
      {{ govukInput({
        id: "court",
        name: "locationId",
        type: "text",
        classes: "autocomplete__wrapper",
        label: {
          text: courtLabel
        },
        value: data.locationName if data else "",
        errorMessage: { text: courtErrorText } if (courtErrorText and courtErrorText | length > 0) else undefined,
        attributes: {
          "data-autocomplete": "true",
          "data-locale": locale,
          "data-search-label": courtLabel,
          "data-location-id": data.locationId if data else ""
        }
      }) }}

      {% set listTypeErrorText = getError(errors, "#listType") %}
      {% set hearingStartDateErrorText = getError(errors, "#hearingStartDate") %}
      <div class="govuk-inset-text">
        <div class="govuk-form-group">
          {{ govukSelect({
            id: "listType",
            name: "listType",
            classes: "govuk-!-width-two-thirds",
            label: {
              text: listTypeLabel
            },
            items: listTypes,
            errorMessage: { text: listTypeErrorText } if (listTypeErrorText and listTypeErrorText | length > 0) else undefined
          }) }}

          {{ govukDateInput({
            id: "hearingStartDate",
            namePrefix: "hearingStartDate",
            fieldset: {
              legend: {
                text: hearingStartDateLabel
              }
            },
            hint: {
              text: hearingStartDateHint
            },
            items: [
              {
                name: "day",
                classes: "govuk-input--width-2" + (" govuk-input--error" if (hearingStartDateErrorText and hearingStartDateErrorText | length > 0) else ""),
                label: dayLabel,
                value: (data.hearingStartDate and data.hearingStartDate.day) or ""
              },
              {
                name: "month",
                classes: "govuk-input--width-2" + (" govuk-input--error" if (hearingStartDateErrorText and hearingStartDateErrorText | length > 0) else ""),
                label: monthLabel,
                value: (data.hearingStartDate and data.hearingStartDate.month) or ""
              },
              {
                name: "year",
                classes: "govuk-input--width-4" + (" govuk-input--error" if (hearingStartDateErrorText and hearingStartDateErrorError | length > 0) else ""),
                label: yearLabel,
                value: (data.hearingStartDate and data.hearingStartDate.year) or ""
              }
            ],
            errorMessage: { text: hearingStartDateErrorText } if (hearingStartDateErrorText and hearingStartDateErrorText | length > 0) else undefined
          }) }}
        </div>
      </div>

      {% set sensitivityErrorText = getError(errors, "#sensitivity") %}
      {{ govukSelect({
        id: "sensitivity",
        name: "sensitivity",
        classes: "govuk-!-width-two-thirds",
        label: {
          text: sensitivityLabel
        },
        items: sensitivityOptions,
        errorMessage: { text: sensitivityErrorText } if (sensitivityErrorText and sensitivityErrorText | length > 0) else undefined
      }) }}

      {% set languageErrorText = getError(errors, "#language") %}
      {{ govukSelect({
        id: "language",
        name: "language",
        classes: "govuk-!-width-two-thirds",
        label: {
          text: languageLabel
        },
        items: languageOptions,
        errorMessage: { text: languageErrorText } if (languageErrorText and languageErrorText | length > 0) else undefined
      }) }}

      {% set displayFromErrorText = getError(errors, "#displayFrom") %}
      {{ govukDateInput({
        id: "displayFrom",
        namePrefix: "displayFrom",
        fieldset: {
          legend: {
            text: displayFromLabel
          }
        },
        hint: {
          text: displayFromHint
        },
        items: [
          {
            name: "day",
            classes: "govuk-input--width-2" + (" govuk-input--error" if (displayFromErrorText and displayFromErrorText | length > 0) else ""),
            label: dayLabel,
            value: (data.displayFrom and data.displayFrom.day) or ""
          },
          {
            name: "month",
            classes: "govuk-input--width-2" + (" govuk-input--error" if (displayFromErrorText and displayFromErrorText | length > 0) else ""),
            label: monthLabel,
            value: (data.displayFrom and data.displayFrom.month) or ""
          },
          {
            name: "year",
            classes: "govuk-input--width-4" + (" govuk-input--error" if (displayFromErrorText and displayFromErrorText | length > 0) else ""),
            label: yearLabel,
            value: (data.displayFrom and data.displayFrom.year) or ""
          }
        ],
        errorMessage: { text: displayFromErrorText } if (displayFromErrorText and displayFromErrorText | length > 0) else undefined
      }) }}

      {% set displayToErrorText = getError(errors, "#displayTo") %}
      {{ govukDateInput({
        id: "displayTo",
        namePrefix: "displayTo",
        fieldset: {
          legend: {
            text: displayToLabel
          }
        },
        hint: {
          text: displayToHint
        },
        items: [
          {
            name: "day",
            classes: "govuk-input--width-2" + (" govuk-input--error" if (displayToErrorText and displayToErrorText | length > 0) else ""),
            label: dayLabel,
            value: (data.displayTo and data.displayTo.day) or ""
          },
          {
            name: "month",
            classes: "govuk-input--width-2" + (" govuk-input--error" if (displayToErrorText and displayToErrorText | length > 0) else ""),
            label: monthLabel,
            value: (data.displayTo and data.displayTo.month) or ""
          },
          {
            name: "year",
            classes: "govuk-input--width-4" + (" govuk-input--error" if (displayToErrorText and displayToErrorText | length > 0) else ""),
            label: yearLabel,
            value: (data.displayTo and data.displayTo.year) or ""
          }
        ],
        errorMessage: { text: displayToErrorText } if (displayToErrorText and displayToErrorText | length > 0) else undefined
      }) }}

      {{ govukButton({
        text: continueButton,
        classes: "govuk-!-margin-top-6"
      }) }}

    </form>

  </div>

  <div class="govuk-grid-column-one-third">
    <aside class="app-related-items">
      <h2 class="govuk-heading-l">{{ pageHelpTitle }}</h2>

      <h3 class="govuk-heading-s">{{ pageHelpLists }}</h3>
      <p class="govuk-body">{{ pageHelpListsText }}</p>

      <h3 class="govuk-heading-s">{{ pageHelpSensitivity }}</h3>
      <p class="govuk-body">{{ pageHelpSensitivityText }}</p>

      <p class="govuk-body">
        <strong>{{ pageHelpSensitivityPublic }}</strong><br>
        {{ pageHelpSensitivityPublicText }}
      </p>

      <p class="govuk-body">
        <strong>{{ pageHelpSensitivityPrivate }}</strong><br>
        {{ pageHelpSensitivityPrivateText }}
      </p>

      <p class="govuk-body">
        <strong>{{ pageHelpSensitivityClassified }}</strong><br>
        {{ pageHelpSensitivityClassifiedText }}
      </p>

      <h3 class="govuk-heading-s">{{ pageHelpDisplayFrom }}</h3>
      <p class="govuk-body">{{ pageHelpDisplayFromText }}</p>

      <h3 class="govuk-heading-s">{{ pageHelpDisplayTo }}</h3>
      <p class="govuk-body">{{ pageHelpDisplayToText }}</p>
    </aside>
  </div>
</div>

<div class="govuk-grid-row">
  <div class="govuk-grid-column-full">
    <a href="#" class="govuk-link back-to-top-link"><span aria-hidden="true">▴ </span>{{ backToTop }}</a>
  </div>
</div>
{% endblock %}
```

**Key Points**:
- Nearly identical to manual-upload template
- Uses GOV.UK Design System components
- Implements custom warning banner styling (reuses manual-upload styles)
- Supports error display with error summary and inline errors
- Preserves form values on validation failure

### 6. Translation Files

**English** (`libs/admin-pages/src/pages/excel-upload/en.ts`):
- See specification.md for full content

**Welsh** (`libs/admin-pages/src/pages/excel-upload/cy.ts`):
- See specification.md for full content

### 7. Application Registration

**File**: `apps/web/src/app.ts`

Add file upload middleware registration BEFORE admin routes:

```typescript
// Register file upload middleware for excel upload
app.post("/excel-upload", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      req.fileUploadError = err;
    }
    next();
  });
});
app.use(await createSimpleRouter(adminRoutes, pageRoutes));
```

**Note**: No changes needed to module registration - pages are auto-discovered.

## Testing Strategy

### Unit Tests

#### Validation Tests (`libs/admin-pages/src/excel-upload/validation.test.ts`)

```typescript
import { describe, it, expect, vi } from "vitest";
import { validateForm, validateDate } from "./validation.js";
import { en } from "../pages/excel-upload/en.js";

describe("validateForm", () => {
  it("should return error when file is missing", async () => {
    const errors = await validateForm({}, undefined, en);
    expect(errors).toContainEqual({ text: en.errorMessages.fileRequired, href: "#file" });
  });

  it("should return error when file is too large", async () => {
    const file = { size: 3 * 1024 * 1024, originalname: "test.pdf" } as Express.Multer.File;
    const errors = await validateForm({}, file, en);
    expect(errors).toContainEqual({ text: en.errorMessages.fileSize, href: "#file" });
  });

  it("should return error when file type is invalid", async () => {
    const file = { size: 1024, originalname: "test.exe" } as Express.Multer.File;
    const errors = await validateForm({}, file, en);
    expect(errors).toContainEqual({ text: en.errorMessages.fileType, href: "#file" });
  });

  it("should return error when location is missing", async () => {
    const file = { size: 1024, originalname: "test.pdf" } as Express.Multer.File;
    const errors = await validateForm({}, file, en);
    expect(errors).toContainEqual({ text: en.errorMessages.courtTooShort, href: "#court" });
  });

  it("should validate display to is after display from", async () => {
    const file = { size: 1024, originalname: "test.pdf" } as Express.Multer.File;
    const errors = await validateForm({
      locationId: "123",
      listType: "1",
      hearingStartDate: { day: "01", month: "01", year: "2025" },
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom: { day: "10", month: "01", year: "2025" },
      displayTo: { day: "05", month: "01", year: "2025" }
    }, file, en);
    expect(errors).toContainEqual({ text: en.errorMessages.displayToBeforeFrom, href: "#displayTo" });
  });
});

describe("validateDate", () => {
  it("should return error when date parts are missing", () => {
    const error = validateDate(undefined, "testDate", "Required", "Invalid");
    expect(error).toEqual({ text: "Required", href: "#testDate" });
  });

  it("should return error when day is not 2 digits", () => {
    const error = validateDate({ day: "1", month: "01", year: "2025" }, "testDate", "Required", "Invalid");
    expect(error).toEqual({ text: "Invalid", href: "#testDate" });
  });

  it("should return null for valid date", () => {
    const error = validateDate({ day: "15", month: "01", year: "2025" }, "testDate", "Required", "Invalid");
    expect(error).toBeNull();
  });
});
```

#### Controller Tests (`libs/admin-pages/src/pages/excel-upload/index.test.ts`)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { GET, POST } from "./index.js";

describe("Excel Upload Controller", () => {
  describe("GET handler", () => {
    it("should render form with empty data on first visit", async () => {
      const req = { session: {}, query: {} } as unknown as Request;
      const res = { render: vi.fn() } as unknown as Response;

      await GET[1](req, res, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "excel-upload/index",
        expect.objectContaining({
          title: "Excel upload",
          errors: undefined
        })
      );
    });

    it("should display errors from session", async () => {
      const errors = [{ text: "File required", href: "#file" }];
      const req = {
        session: { excelUploadErrors: errors },
        query: {}
      } as unknown as Request;
      const res = { render: vi.fn() } as unknown as Response;

      await GET[1](req, res, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "excel-upload/index",
        expect.objectContaining({
          errors
        })
      );
      expect(req.session.excelUploadErrors).toBeUndefined();
    });
  });

  describe("POST handler", () => {
    it("should redirect on validation error", async () => {
      const req = {
        session: { save: vi.fn((cb) => cb()) },
        body: {},
        file: undefined
      } as unknown as Request;
      const res = { redirect: vi.fn() } as unknown as Response;

      await POST[1](req, res, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/excel-upload");
      expect(req.session.excelUploadErrors).toBeDefined();
    });
  });
});
```

### Integration Tests

Test the complete flow from form submission to summary page redirect:

```typescript
// To be added in future PR
```

### E2E Tests

Test the user journey using Playwright:

```typescript
// e2e-tests/specs/excel-upload.spec.ts
import { test, expect } from "@playwright/test";

test("admin can access excel upload form", async ({ page }) => {
  // TODO: Add authentication
  await page.goto("/excel-upload");
  await expect(page.locator("h1")).toContainText("Excel upload");
  await expect(page.locator(".manual-upload-warning")).toBeVisible();
});

test("form shows validation errors", async ({ page }) => {
  await page.goto("/excel-upload");
  await page.click("button:has-text('Continue')");
  await expect(page.locator(".govuk-error-summary")).toBeVisible();
});

test("form is accessible", async ({ page }) => {
  await page.goto("/excel-upload");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

## Deployment Steps

1. **Database Migration**: None required for this ticket
2. **Environment Variables**: None required
3. **Feature Flags**: None required
4. **Rollback Plan**: Remove multer middleware registration and route registration

## Success Criteria

- [ ] User can access `/excel-upload` with appropriate role
- [ ] Form displays all required fields
- [ ] File upload accepts valid file types and rejects invalid
- [ ] Court autocomplete works with minimum 2 characters
- [ ] All validation rules enforce correctly
- [ ] Error messages display in error summary and inline
- [ ] Form data persists in session on validation error
- [ ] Successful submission redirects to summary page
- [ ] Welsh translations available for all content
- [ ] WCAG 2.2 AA compliant (axe-core passes)
- [ ] All unit tests pass
- [ ] E2E tests pass

## Follow-up Work

- **VIBE-166**: Excel Upload Summary/Confirmation page
- Future: Excel file parsing and publication to database
- Future: Comprehensive E2E test coverage

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| File upload middleware conflicts with manual-upload | High | Register middleware specifically for `/excel-upload` route |
| Validation logic diverges from manual-upload | Medium | Reuse validation patterns, keep in sync |
| Session storage grows too large | Low | Clear session after successful submission |
| Autocomplete API performance | Low | Already implemented and tested in manual-upload |

## Dependencies on Other Tickets

- None - this is a standalone feature
- **VIBE-166** depends on this ticket (requires form data in session)
