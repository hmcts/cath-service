import { getAllLocations, getLocationById } from "@hmcts/location";
import { Language, Sensitivity } from "@hmcts/publication";
import type { DateInput } from "@hmcts/web-core";
import type { Request, Response } from "express";
import { storeManualUpload } from "../../manual-upload/storage.js";
import { validateForm } from "../../manual-upload/validation.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const LIST_TYPES = [
  { value: "", text: "<Please choose a list type>" },
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
  { value: "", text: "<Please choose a sensitivity>" },
  { value: Sensitivity.PUBLIC, text: "Public" },
  { value: Sensitivity.PRIVATE, text: "Private" },
  { value: Sensitivity.CLASSIFIED, text: "Classified" }
];

const LANGUAGE_OPTIONS = [
  { value: "", text: "" },
  { value: Language.ENGLISH, text: "English" },
  { value: Language.WELSH, text: "Welsh" },
  { value: Language.BILINGUAL, text: "Bilingual" }
];

const getTranslations = (locale: string) => (locale === "cy" ? cy : en);

function transformDateFields(body: any): ManualUploadFormData {
  const hasValue = (val: any) => val !== undefined && val !== null && val !== "" && val.toString().trim() !== "";

  return {
    locationId: body.locationId,
    locationName: body["court-display"], // Capture the display value from autocomplete
    listType: body.listType,
    hearingStartDate:
      hasValue(body["hearingStartDate-day"]) || hasValue(body["hearingStartDate-month"]) || hasValue(body["hearingStartDate-year"])
        ? {
            day: body["hearingStartDate-day"] || "",
            month: body["hearingStartDate-month"] || "",
            year: body["hearingStartDate-year"] || ""
          }
        : undefined,
    sensitivity: body.sensitivity,
    language: body.language,
    displayFrom:
      hasValue(body["displayFrom-day"]) || hasValue(body["displayFrom-month"]) || hasValue(body["displayFrom-year"])
        ? {
            day: body["displayFrom-day"] || "",
            month: body["displayFrom-month"] || "",
            year: body["displayFrom-year"] || ""
          }
        : undefined,
    displayTo:
      hasValue(body["displayTo-day"]) || hasValue(body["displayTo-month"]) || hasValue(body["displayTo-year"])
        ? {
            day: body["displayTo-day"] || "",
            month: body["displayTo-month"] || "",
            year: body["displayTo-year"] || ""
          }
        : undefined
  };
}

interface ManualUploadFormData {
  locationId?: string;
  locationName?: string;
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
  // Clear session data on GET request to show clean form
  delete req.session.manualUploadForm;

  const data = {};
  const locale = "en";
  const t = getTranslations(locale);

  res.render("manual-upload/index", {
    ...t,
    data,
    locations: getAllLocations(locale),
    listTypes: LIST_TYPES,
    sensitivityOptions: SENSITIVITY_OPTIONS,
    languageOptions: LANGUAGE_OPTIONS.map((item) => ({ ...item, selected: item.value === Language.ENGLISH })),
    locale,
    hideLanguageToggle: true
  });
};

export const POST = async (req: Request, res: Response) => {
  const locale = "en" as "en" | "cy";
  const t = getTranslations(locale);

  const formData = transformDateFields(req.body);

  // Check for multer errors (e.g., file too large)
  const fileUploadError = (req as any).fileUploadError;
  let errors = validateForm(formData, req.file, t);

  // If multer threw a file size error, replace the "fileRequired" error with the file size error
  if (fileUploadError && fileUploadError.code === "LIMIT_FILE_SIZE") {
    errors = errors.filter((e) => e.text !== t.errorMessages.fileRequired);
    errors = [{ text: t.errorMessages.fileSize, href: "#file" }, ...errors];
  }

  if (errors.length > 0) {
    req.session.manualUploadForm = formData;

    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // If locationId is a valid number, show the location name; otherwise show the invalid text entered
    let locationName = "";
    if (formData.locationId && !Number.isNaN(Number(formData.locationId))) {
      const location = getLocationById(Number.parseInt(formData.locationId, 10));
      locationName = location ? (locale === "cy" ? location.welshName : location.name) : "";
    } else {
      // Keep the invalid text that was entered (from the display field)
      locationName = formData.locationName || "";
    }

    return res.render("manual-upload/index", {
      ...t,
      errors,
      data: { ...formData, locationId: formData.locationId || "", locationName },
      locations: getAllLocations(locale),
      listTypes: LIST_TYPES.map((item) => ({ ...item, selected: item.value === formData.listType })),
      sensitivityOptions: SENSITIVITY_OPTIONS.map((item) => ({ ...item, selected: item.value === formData.sensitivity })),
      languageOptions: LANGUAGE_OPTIONS.map((item) => ({ ...item, selected: item.value === (formData.language || Language.ENGLISH) })),
      locale,
      hideLanguageToggle: true
    });
  }

  await storeManualUpload({
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

  delete req.session.manualUploadForm;

  res.redirect("/manual-upload-summary");
};
