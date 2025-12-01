import { Language, Sensitivity } from "@hmcts/publication";
import type { DateInput } from "@hmcts/web-core";

export interface UploadFormData {
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
  [Sensitivity.PRIVATE]: "Private – all verified users",
  [Sensitivity.CLASSIFIED]: "Classified"
};

export const LANGUAGE_LABELS: Record<string, string> = {
  [Language.ENGLISH]: "English",
  [Language.WELSH]: "Welsh",
  [Language.BILINGUAL]: "Bilingual English/Welsh"
};

declare module "express-session" {
  interface SessionData {
    manualUploadForm?: UploadFormData;
    manualUploadErrors?: ValidationError[];
    manualUploadSubmitted?: boolean;
    uploadConfirmed?: boolean;
    successPageViewed?: boolean;
    viewedLanguage?: "en" | "cy";
    nonStrategicUploadForm?: UploadFormData;
    nonStrategicUploadErrors?: ValidationError[];
    nonStrategicUploadSubmitted?: boolean;
    nonStrategicUploadConfirmed?: boolean;
    nonStrategicSuccessPageViewed?: boolean;
  }
}
