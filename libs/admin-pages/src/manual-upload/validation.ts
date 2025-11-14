import { validateCivilFamilyCauseList } from "@hmcts/civil-and-family-daily-cause-list";
import { type DateInput, parseDate } from "@hmcts/web-core";
import type { en } from "../pages/manual-upload/en.js";
import type { ManualUploadFormData, ValidationError } from "./model.js";

export type { ValidationError };

const CIVIL_AND_FAMILY_LIST_TYPE_ID = 8;

export function validateForm(body: ManualUploadFormData, file: Express.Multer.File | undefined, t: typeof en): ValidationError[] {
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

    // Special validation for Civil & Family Daily Cause List (must be JSON and valid schema)
    if (body.listType === CIVIL_AND_FAMILY_LIST_TYPE_ID.toString()) {
      const isJsonFile = /\.json$/i.test(file.originalname);

      if (!isJsonFile) {
        errors.push({
          text: "Civil and Family Daily Cause List must be a JSON file",
          href: "#file"
        });
      } else {
        // Validate JSON schema
        try {
          const fileContent = file.buffer.toString("utf-8");
          const jsonData = JSON.parse(fileContent);
          const validationResult = validateCivilFamilyCauseList(jsonData);

          if (!validationResult.isValid) {
            const firstError = validationResult.errors[0] as { message?: string } | undefined;
            errors.push({
              text: `Invalid Civil and Family Daily Cause List format. ${firstError?.message || "Please check the JSON structure."}`,
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
  // Check if locationId exists and is a valid number (autocomplete submits numeric IDs)
  if (!body.locationId || body.locationId.trim() === "") {
    // Check if user entered text that's 3+ characters (invalid selection)
    if (body.locationName && body.locationName.trim().length >= 3) {
      errors.push({ text: t.errorMessages.courtRequired, href: "#court" });
    } else {
      // Empty or less than 3 characters
      errors.push({ text: t.errorMessages.courtTooShort, href: "#court" });
    }
  } else if (Number.isNaN(Number(body.locationId))) {
    // locationId exists but is not a valid number (invalid selection)
    errors.push({ text: t.errorMessages.courtRequired, href: "#court" });
  }

  if (!body.listType || body.listType === "") {
    errors.push({ text: t.errorMessages.listTypeRequired, href: "#listType" });
  }

  // Date validation
  const hearingStartDateError = validateDate(
    body.hearingStartDate,
    "hearingStartDate",
    t.errorMessages.hearingStartDateRequired,
    t.errorMessages.hearingStartDateInvalid
  );
  if (hearingStartDateError) {
    errors.push(hearingStartDateError);
  }

  if (!body.sensitivity || body.sensitivity === "") {
    errors.push({ text: t.errorMessages.sensitivityRequired, href: "#sensitivity" });
  }

  if (!body.language || body.language === "") {
    errors.push({ text: t.errorMessages.languageRequired, href: "#language" });
  }

  const displayFromError = validateDate(body.displayFrom, "displayFrom", t.errorMessages.displayFromRequired, t.errorMessages.displayFromInvalid);
  if (displayFromError) {
    errors.push(displayFromError);
  }

  const displayToError = validateDate(body.displayTo, "displayTo", t.errorMessages.displayToRequired, t.errorMessages.displayToInvalid);
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
