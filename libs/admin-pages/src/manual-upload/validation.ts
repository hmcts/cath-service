import { mockListTypes, validateListTypeJson } from "@hmcts/list-types-common";
import { type DateInput, parseDate } from "@hmcts/web-core";
import type { en as manualUploadEn } from "../pages/manual-upload/en.js";
import type { en as nonStrategicUploadEn } from "../pages/non-strategic-upload/en.js";
import type { UploadFormData, ValidationError } from "./model.js";

export type { ValidationError };

type ErrorMessages = typeof manualUploadEn.errorMessages | typeof nonStrategicUploadEn.errorMessages;

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MIN_LOCATION_NAME_LENGTH = 3;

async function validateFileUpload(file: Express.Multer.File | undefined, errorMessages: ErrorMessages, allowedExtensions: RegExp): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  if (!file) {
    errors.push({ text: errorMessages.fileRequired, href: "#file" });
    return errors;
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push({ text: errorMessages.fileSize, href: "#file" });
  }

  if (!allowedExtensions.test(file.originalname)) {
    errors.push({ text: errorMessages.fileType, href: "#file" });
  }

  return errors;
}

async function validateJsonFileSchema(file: Express.Multer.File, listType: string): Promise<ValidationError | null> {
  const isJsonFile = /\.json$/i.test(file.originalname);
  if (!isJsonFile || !listType) {
    return null;
  }

  try {
    const fileContent = file.buffer.toString("utf-8");
    const jsonData = JSON.parse(fileContent);
    const validationResult = await validateListTypeJson(listType, jsonData, mockListTypes);

    if (!validationResult.isValid) {
      const firstError = validationResult.errors[0] as { message?: string } | undefined;
      return {
        text: `Invalid JSON file format. ${firstError?.message || "Please check the JSON structure."}`,
        href: "#file"
      };
    }
  } catch {
    return {
      text: "Invalid JSON file format. Please ensure the file contains valid JSON.",
      href: "#file"
    };
  }

  return null;
}

function validateLocation(body: UploadFormData, errorMessages: ErrorMessages): ValidationError | null {
  const hasLocationId = body.locationId && body.locationId.trim() !== "";

  if (!hasLocationId) {
    const hasValidLocationName = body.locationName && body.locationName.trim().length >= MIN_LOCATION_NAME_LENGTH;
    return hasValidLocationName ? { text: errorMessages.courtRequired, href: "#court" } : { text: errorMessages.courtTooShort, href: "#court" };
  }

  if (Number.isNaN(Number(body.locationId))) {
    return { text: errorMessages.courtRequired, href: "#court" };
  }

  return null;
}

function validateRequiredFields(body: UploadFormData, errorMessages: ErrorMessages): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!body.listType || body.listType === "") {
    errors.push({ text: errorMessages.listTypeRequired, href: "#listType" });
  }

  if (!body.sensitivity || body.sensitivity === "") {
    errors.push({ text: errorMessages.sensitivityRequired, href: "#sensitivity" });
  }

  if (!body.language || body.language === "") {
    errors.push({ text: errorMessages.languageRequired, href: "#language" });
  }

  return errors;
}

function validateDateRange(
  body: UploadFormData,
  errorMessages: ErrorMessages,
  displayFromError: ValidationError | null,
  displayToError: ValidationError | null
): ValidationError | null {
  if (displayFromError || displayToError || !body.displayFrom || !body.displayTo) {
    return null;
  }

  const fromDate = parseDate(body.displayFrom);
  const toDate = parseDate(body.displayTo);

  if (fromDate && toDate && toDate < fromDate) {
    return { text: errorMessages.displayToBeforeFrom, href: "#displayTo" };
  }

  return null;
}

async function validateUploadForm(
  body: UploadFormData,
  file: Express.Multer.File | undefined,
  errorMessages: ErrorMessages,
  allowedExtensions: RegExp,
  validateJson: boolean
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  const fileErrors = await validateFileUpload(file, errorMessages, allowedExtensions);
  errors.push(...fileErrors);

  if (validateJson && file && body.listType) {
    const jsonError = await validateJsonFileSchema(file, body.listType);
    if (jsonError) {
      errors.push(jsonError);
    }
  }

  const locationError = validateLocation(body, errorMessages);
  if (locationError) {
    errors.push(locationError);
  }

  errors.push(...validateRequiredFields(body, errorMessages));

  const hearingStartDateError = validateDate(
    body.hearingStartDate,
    "hearingStartDate",
    errorMessages.hearingStartDateRequired,
    errorMessages.hearingStartDateInvalid
  );
  if (hearingStartDateError) {
    errors.push(hearingStartDateError);
  }

  const displayFromError = validateDate(body.displayFrom, "displayFrom", errorMessages.displayFromRequired, errorMessages.displayFromInvalid);
  if (displayFromError) {
    errors.push(displayFromError);
  }

  const displayToError = validateDate(body.displayTo, "displayTo", errorMessages.displayToRequired, errorMessages.displayToInvalid);
  if (displayToError) {
    errors.push(displayToError);
  }

  const dateRangeError = validateDateRange(body, errorMessages, displayFromError, displayToError);
  if (dateRangeError) {
    errors.push(dateRangeError);
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
