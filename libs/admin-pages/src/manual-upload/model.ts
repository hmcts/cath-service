import { Language, Sensitivity } from "@hmcts/publication";
import type { DateInput } from "@hmcts/web-core";

export interface ManualUploadFormData {
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

export const LIST_TYPE_LABELS: Record<string, string> = {
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
    manualUploadForm?: ManualUploadFormData;
    manualUploadErrors?: ValidationError[];
    manualUploadSubmitted?: boolean;
  }
}
