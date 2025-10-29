import { type DateInput, parseDate } from "@hmcts/web-core";
import type { en } from "../pages/manual-upload/en.js";

export interface ValidationError {
  text: string;
  href: string;
}

interface ManualUploadFormData {
  locationId?: string;
  listType?: string;
  hearingStartDate?: DateInput;
  sensitivity?: string;
  language?: string;
  displayFrom?: DateInput;
  displayTo?: DateInput;
}

export function validateForm(body: ManualUploadFormData, file: Express.Multer.File | undefined, t: typeof en): ValidationError[] {
  const errors: ValidationError[] = [];

  // File validation
  if (!file) {
    errors.push({ text: t.fileRequired, href: "#file" });
  } else {
    const allowedExtensions = /\.(csv|doc|docx|htm|html|json|pdf)$/i;
    if (!allowedExtensions.test(file.originalname)) {
      errors.push({ text: t.fileType, href: "#file" });
    }
    if (file.size > 2 * 1024 * 1024) {
      errors.push({ text: t.fileSize, href: "#file" });
    }
  }

  // Required field validation
  if (!body.locationId || body.locationId.trim() === "" || body.locationId.trim().length < 3) {
    errors.push({ text: t.courtRequired, href: "#court" });
  }

  if (!body.listType || body.listType === "") {
    errors.push({ text: t.listTypeRequired, href: "#listType" });
  }

  if (!body.sensitivity || body.sensitivity === "") {
    errors.push({ text: t.sensitivityRequired, href: "#sensitivity" });
  }

  if (!body.language || body.language === "") {
    errors.push({ text: t.languageRequired, href: "#language" });
  }

  // Date validation
  const hearingStartDateError = validateDate(body.hearingStartDate, "hearingStartDate", t.hearingStartDateRequired, t.hearingStartDateInvalid);
  if (hearingStartDateError) {
    errors.push(hearingStartDateError);
  }

  const displayFromError = validateDate(body.displayFrom, "displayFrom", t.displayFromRequired, t.displayFromInvalid);
  if (displayFromError) {
    errors.push(displayFromError);
  }

  const displayToError = validateDate(body.displayTo, "displayTo", t.displayToRequired, t.displayToInvalid);
  if (displayToError) {
    errors.push(displayToError);
  }

  // Date comparison validation
  if (!displayFromError && !displayToError && body.displayFrom && body.displayTo) {
    const fromDate = parseDate(body.displayFrom);
    const toDate = parseDate(body.displayTo);

    if (fromDate && toDate && toDate < fromDate) {
      errors.push({ text: t.displayToBeforeFrom, href: "#displayTo" });
    }
  }

  return errors;
}

export function validateDate(dateInput: DateInput | undefined, fieldName: string, requiredMessage: string, invalidMessage: string): ValidationError | null {
  if (!dateInput || !dateInput.day || !dateInput.month || !dateInput.year) {
    return { text: requiredMessage, href: `#${fieldName}` };
  }

  const parsedDate = parseDate(dateInput);
  if (!parsedDate) {
    return { text: invalidMessage, href: `#${fieldName}` };
  }

  return null;
}
