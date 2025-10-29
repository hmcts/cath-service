import { getAllLocations } from "@hmcts/location";
import { Language, Sensitivity } from "@hmcts/publication";
import type { DateInput } from "@hmcts/web-core";
import type { Request, Response } from "express";
import { storeManualUpload } from "../../manual-upload/storage.js";
import { validateForm } from "../../manual-upload/validation.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

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
  const t = getTranslations(locale);

  res.render("manual-upload/index", {
    ...t,
    data,
    locations: getAllLocations(locale),
    listTypes: LIST_TYPES.map((item) => ({ ...item, selected: item.value === data.listType })),
    sensitivityOptions: SENSITIVITY_OPTIONS.map((item) => ({ ...item, selected: item.value === data.sensitivity })),
    languageOptions: LANGUAGE_OPTIONS.map((item) => ({ ...item, selected: item.value === data.language })),
    locale
  });
};

export const POST = async (req: Request, res: Response) => {
  const locale = "en";
  const t = getTranslations(locale);

  const errors = validateForm(req.body, req.file, t);

  if (errors.length > 0) {
    req.session.manualUploadForm = req.body;

    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return res.render("manual-upload/index", {
      ...t,
      errors,
      data: req.body,
      locations: getAllLocations(locale),
      listTypes: LIST_TYPES.map((item) => ({ ...item, selected: item.value === req.body.listType })),
      sensitivityOptions: SENSITIVITY_OPTIONS.map((item) => ({ ...item, selected: item.value === req.body.sensitivity })),
      languageOptions: LANGUAGE_OPTIONS.map((item) => ({ ...item, selected: item.value === req.body.language })),
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
      ...t,
      errors: [{ text: t.errorMessages.fileRequired, href: "#file" }],
      data: req.body,
      locations: getAllLocations(locale),
      listTypes: LIST_TYPES.map((item) => ({ ...item, selected: item.value === req.body.listType })),
      sensitivityOptions: SENSITIVITY_OPTIONS.map((item) => ({ ...item, selected: item.value === req.body.sensitivity })),
      languageOptions: LANGUAGE_OPTIONS.map((item) => ({ ...item, selected: item.value === req.body.language })),
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
