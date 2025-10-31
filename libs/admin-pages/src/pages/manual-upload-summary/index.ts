import { getLocationById } from "@hmcts/location";
import { Language, Sensitivity } from "@hmcts/publication";
import type { DateInput } from "@hmcts/web-core";
import { formatDate, formatDateRange } from "@hmcts/web-core";
import type { Request, Response } from "express";
import { getManualUpload } from "../../manual-upload/storage.js";
import cy from "./cy.js";
import en from "./en.js";

const LIST_TYPE_LABELS: Record<string, string> = {
  CIVIL_DAILY_CAUSE_LIST: "Civil Daily Cause List",
  FAMILY_DAILY_CAUSE_LIST: "Family Daily Cause List",
  CRIMINAL_DAILY_CAUSE_LIST: "Criminal Daily Cause List",
  CIVIL_AND_FAMILY_DAILY_CAUSE_LIST: "Civil and Family Daily Cause List",
  CROWN_DAILY_LIST: "Crown Daily List",
  CROWN_FIRM_LIST: "Crown Firm List",
  CROWN_WARNED_LIST: "Crown Warned List",
  MAGISTRATES_PUBLIC_LIST: "Magistrates Public List",
  MAGISTRATES_STANDARD_LIST: "Magistrates Standard List",
  CARE_STANDARDS_LIST: "Care Standards List",
  EMPLOYMENT_TRIBUNAL_LIST: "Employment Tribunal List",
  IAC_DAILY_LIST: "IAC Daily List",
  IAC_DAILY_LIST_ADDITIONAL_CASES: "IAC Daily List Additional Cases",
  PRIMARY_HEALTH_LIST: "Primary Health List",
  SJP_PUBLIC_LIST: "SJP Public List",
  SJP_DELTA_PUBLIC_LIST: "SJP Delta Public List",
  SSCS_DAILY_LIST: "SSCS Daily List",
  SSCS_DAILY_LIST_ADDITIONAL_HEARINGS: "SSCS Daily List Additional Hearings"
};

const SENSITIVITY_LABELS: Record<string, string> = {
  [Sensitivity.PUBLIC]: "Public",
  [Sensitivity.PRIVATE]: "Private",
  [Sensitivity.CLASSIFIED]: "Classified"
};

const LANGUAGE_LABELS: Record<string, string> = {
  [Language.ENGLISH]: "English",
  [Language.WELSH]: "Welsh",
  [Language.BILINGUAL]: "Bilingual"
};

export const GET = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;
  const uploadId = req.query.uploadId as string;

  if (!uploadId) {
    return res.status(400).send("Missing uploadId");
  }

  const uploadData = await getManualUpload(uploadId);

  if (!uploadData) {
    return res.status(404).send("Upload not found");
  }

  const locale = req.query.lng === "cy" ? "cy" : "en";
  const location = getLocationById(Number.parseInt(uploadData.locationId, 10));
  const courtName = location ? (locale === "cy" ? location.welshName : location.name) : uploadData.locationId;

  res.render("manual-upload-summary/index", {
    pageTitle: lang.pageTitle,
    subHeading: lang.subHeading,
    courtName: lang.courtName,
    file: lang.file,
    listType: lang.listType,
    hearingStartDate: lang.hearingStartDate,
    sensitivity: lang.sensitivity,
    language: lang.language,
    displayFileDates: lang.displayFileDates,
    change: lang.change,
    confirmButton: lang.confirmButton,
    data: {
      courtName,
      file: uploadData.fileName,
      listType: LIST_TYPE_LABELS[uploadData.listType] || uploadData.listType,
      hearingStartDate: formatDate(uploadData.hearingStartDate),
      sensitivity: SENSITIVITY_LABELS[uploadData.sensitivity] || uploadData.sensitivity,
      language: LANGUAGE_LABELS[uploadData.language] || uploadData.language,
      displayFileDates: formatDateRange(uploadData.displayFrom, uploadData.displayTo)
    },
    hideLanguageToggle: true
  });
};

declare module "express-session" {
  interface SessionData {
    manualUploadForm?: {
      locationId?: string;
      locationName?: string;
      listType?: string;
      hearingStartDate?: DateInput;
      sensitivity?: string;
      language?: string;
      displayFrom?: DateInput;
      displayTo?: DateInput;
    };
  }
}

export const POST = async (req: Request, res: Response) => {
  delete req.session.manualUploadForm;
  res.redirect("/manual-upload-confirmation");
};
