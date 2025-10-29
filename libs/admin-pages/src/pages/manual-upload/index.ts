import { getAllLocations } from "@hmcts/location";
import type { Request, Response } from "express";
import { en } from "./en.js";
import { storeManualUpload } from "../../manual-upload/manual-upload-storage.js";

const LIST_TYPES = [
  { value: "", text: "Please choose a list type" },
  { value: "CIVIL_DAILY_CAUSE_LIST", text: "Civil Daily Cause List" },
  { value: "FAMILY_DAILY_CAUSE_LIST", text: "Family Daily Cause List" },
  { value: "CRIMINAL_DAILY_CAUSE_LIST", text: "Criminal Daily Cause List" },
  { value: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST", text: "Civil and Family Daily Cause List" },
  { value: "CROWN_DAILY_LIST", text: "Crown Daily List" },
  { value: "CROWN_FIRM_LIST", text: "Crown Firm List" },
  { value: "CROWN_WARNED_LIST", text: "Crown Warned List" },
  { value: "MAGISTRATES_PUBLIC_LIST", text: "Magistrates Public List" },
  { value: "MAGISTRATES_STANDARD_LIST", text: "Magistrates Standard List" },
  { value: "CARE_STANDARDS_LIST", text: "Care Standards List" },
  { value: "EMPLOYMENT_TRIBUNAL_LIST", text: "Employment Tribunal List" },
  { value: "IAC_DAILY_LIST", text: "IAC Daily List" },
  { value: "IAC_DAILY_LIST_ADDITIONAL_CASES", text: "IAC Daily List Additional Cases" },
  { value: "PRIMARY_HEALTH_LIST", text: "Primary Health List" },
  { value: "SJP_PUBLIC_LIST", text: "SJP Public List" },
  { value: "SJP_DELTA_PUBLIC_LIST", text: "SJP Delta Public List" },
  { value: "SSCS_DAILY_LIST", text: "SSCS Daily List" },
  { value: "SSCS_DAILY_LIST_ADDITIONAL_HEARINGS", text: "SSCS Daily List Additional Hearings" }
];

const SENSITIVITY_OPTIONS = [
  { value: "", text: "" },
  { value: "PUBLIC", text: "Public" },
  { value: "PRIVATE", text: "Private" },
  { value: "CLASSIFIED", text: "Classified" }
];

const LANGUAGE_OPTIONS = [
  { value: "", text: "" },
  { value: "ENGLISH", text: "English" },
  { value: "WELSH", text: "Welsh" },
  { value: "BILINGUAL", text: "Bilingual" }
];

interface ValidationError {
  text: string;
  href: string;
}

interface DateInput {
  day: string;
  month: string;
  year: string;
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

declare module "express-session" {
  interface SessionData {
    manualUploadForm?: ManualUploadFormData;
  }
}

export const GET = async (req: Request, res: Response) => {
  const data = req.session.manualUploadForm || {};
  const locale = "en";

  res.render("manual-upload/index", {
    ...en,
    data,
    locations: getAllLocations(locale),
    listTypes: LIST_TYPES.map(item => ({ ...item, selected: item.value === data.listType })),
    sensitivityOptions: SENSITIVITY_OPTIONS.map(item => ({ ...item, selected: item.value === data.sensitivity })),
    languageOptions: LANGUAGE_OPTIONS.map(item => ({ ...item, selected: item.value === data.language })),
    locale
  });
};

export const POST = async (req: Request, res: Response) => {
  const locale = "en";

  const errors = validateForm(req.body, req.file, en);

  if (errors.length > 0) {
    req.session.manualUploadForm = req.body;

    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return res.render("manual-upload/index", {
      ...en,
      errors,
      data: req.body,
      locations: getAllLocations(locale),
      listTypes: LIST_TYPES.map(item => ({ ...item, selected: item.value === req.body.listType })),
      sensitivityOptions: SENSITIVITY_OPTIONS.map(item => ({ ...item, selected: item.value === req.body.sensitivity })),
      languageOptions: LANGUAGE_OPTIONS.map(item => ({ ...item, selected: item.value === req.body.language })),
      locale
    });
  }

  if (!req.file) {
    req.session.manualUploadForm = req.body;

    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return res.status(400).render("manual-upload/index", {
      ...en,
      errors: [{ text: en.fileRequired, href: "#file" }],
      data: req.body,
      locations: getAllLocations(locale),
      listTypes: LIST_TYPES.map(item => ({ ...item, selected: item.value === req.body.listType })),
      sensitivityOptions: SENSITIVITY_OPTIONS.map(item => ({ ...item, selected: item.value === req.body.sensitivity })),
      languageOptions: LANGUAGE_OPTIONS.map(item => ({ ...item, selected: item.value === req.body.language })),
      locale
    });
  }

  await storeManualUpload({
    file: req.file.buffer,
    fileName: req.file.originalname,
    fileType: req.file.mimetype,
    locationId: req.body.locationId,
    listType: req.body.listType,
    hearingStartDate: req.body.hearingStartDate,
    sensitivity: req.body.sensitivity,
    language: req.body.language,
    displayFrom: req.body.displayFrom,
    displayTo: req.body.displayTo
  });

  delete req.session.manualUploadForm;

  res.redirect("/manual-upload/confirm");
};

function validateForm(body: ManualUploadFormData, file: Express.Multer.File | undefined, t: typeof en): ValidationError[] {
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

function validateDate(dateInput: DateInput | undefined, fieldName: string, requiredMessage: string, invalidMessage: string): ValidationError | null {
  if (!dateInput || !dateInput.day || !dateInput.month || !dateInput.year) {
    return { text: requiredMessage, href: `#${fieldName}` };
  }

  const parsedDate = parseDate(dateInput);
  if (!parsedDate) {
    return { text: invalidMessage, href: `#${fieldName}` };
  }

  return null;
}

function parseDate(dateInput: DateInput): Date | null {
  const day = Number.parseInt(dateInput.day, 10);
  const month = Number.parseInt(dateInput.month, 10);
  const year = Number.parseInt(dateInput.year, 10);

  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}
