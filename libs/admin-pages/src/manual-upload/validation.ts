import { mockListTypes, validateListTypeJson } from "@hmcts/list-types-common";
import { type DateInput, parseDate } from "@hmcts/web-core";
import type { en as manualUploadEn } from "../pages/manual-upload/en.js";
import type { en as nonStrategicUploadEn } from "../pages/non-strategic-upload/en.js";
import type { UploadFormData, ValidationError } from "./model.js";

export type { ValidationError };

type ErrorMessages = typeof manualUploadEn.errorMessages | typeof nonStrategicUploadEn.errorMessages;

async function validateUploadForm(
  body: UploadFormData,
  file: Express.Multer.File | undefined,
  errorMessages: ErrorMessages,
  allowedExtensions: RegExp,
  validateJson: boolean
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // File validation
  if (!file) {
    errors.push({ text: errorMessages.fileRequired, href: "#file" });
  } else {
    if (file.size > 2 * 1024 * 1024) {
      errors.push({ text: errorMessages.fileSize, href: "#file" });
    }
    if (!allowedExtensions.test(file.originalname)) {
      errors.push({ text: errorMessages.fileType, href: "#file" });
    }

    // Validate JSON files against their schema (only for manual upload)
    if (validateJson) {
      const isJsonFile = /\.json$/i.test(file.originalname);
      if (isJsonFile && body.listType) {
        try {
          const fileContent = file.buffer.toString("utf-8");
          const jsonData = JSON.parse(fileContent);

          const validationResult = await validateListTypeJson(body.listType, jsonData, mockListTypes);

          if (!validationResult.isValid) {
            const firstError = validationResult.errors[0] as { message?: string } | undefined;
            errors.push({
              text: `Invalid JSON file format. ${firstError?.message || "Please check the JSON structure."}`,
              href: "#file"
            });
          }
        } catch {
          errors.push({
            text: "Invalid JSON file format. Please ensure the file contains valid JSON.",
            href: "#file"
          });
        }
      }
    }
  }

  // Required field validation
  if (!body.locationId || body.locationId.trim() === "") {
    if (body.locationName && body.locationName.trim().length >= 3) {
      errors.push({ text: errorMessages.courtRequired, href: "#court" });
    } else {
      errors.push({ text: errorMessages.courtTooShort, href: "#court" });
    }
  } else if (Number.isNaN(Number(body.locationId))) {
    errors.push({ text: errorMessages.courtRequired, href: "#court" });
  }

  if (!body.listType || body.listType === "") {
    errors.push({ text: errorMessages.listTypeRequired, href: "#listType" });
  }

  // Date validation
  const hearingStartDateError = validateDate(
    body.hearingStartDate,
    "hearingStartDate",
    errorMessages.hearingStartDateRequired,
    errorMessages.hearingStartDateInvalid
  );
  if (hearingStartDateError) {
    errors.push(hearingStartDateError);
  }

  if (!body.sensitivity || body.sensitivity === "") {
    errors.push({ text: errorMessages.sensitivityRequired, href: "#sensitivity" });
  }

  if (!body.language || body.language === "") {
    errors.push({ text: errorMessages.languageRequired, href: "#language" });
  }

  const displayFromError = validateDate(body.displayFrom, "displayFrom", errorMessages.displayFromRequired, errorMessages.displayFromInvalid);
  if (displayFromError) {
    errors.push(displayFromError);
  }

  const displayToError = validateDate(body.displayTo, "displayTo", errorMessages.displayToRequired, errorMessages.displayToInvalid);
  if (displayToError) {
    errors.push(displayToError);
  }

  // Date comparison validation
  if (!displayFromError && !displayToError && body.displayFrom && body.displayTo) {
    const fromDate = parseDate(body.displayFrom);
    const toDate = parseDate(body.displayTo);

    if (fromDate && toDate && toDate < fromDate) {
      errors.push({ text: errorMessages.displayToBeforeFrom, href: "#displayTo" });
    }
  }

  return errors;
}

export async function validateManualUploadForm(
  body: UploadFormData,
  file: Express.Multer.File | undefined,
  t: typeof manualUploadEn
): Promise<ValidationError[]> {
  return validateUploadForm(body, file, t.errorMessages, /\.(csv|doc|docx|htm|html|json|pdf)$/i, true);
}

export async function validateNonStrategicUploadForm(
  body: UploadFormData,
  file: Express.Multer.File | undefined,
  t: typeof nonStrategicUploadEn
): Promise<ValidationError[]> {
  return validateUploadForm(body, file, t.errorMessages, /\.xlsx$/i, false);
}

export function validateDate(dateInput: DateInput | undefined, fieldName: string, requiredMessage: string, invalidMessage: string): ValidationError | null {
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
