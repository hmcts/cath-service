import {
  GOVUK_NOTIFY_TEMPLATE_ID_LOCATION_SUBSCRIPTION_DELETION,
  GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_EXCEL_ONLY,
  GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_FLAT_FILE,
  GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_NO_LINKS,
  GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL,
  GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_ONLY,
  GOVUK_NOTIFY_TEMPLATE_ID_SYSTEM_ADMIN
} from "@hmcts/govuk-notify";

const GOVUK_NOTIFY_API_KEY = process.env.GOVUK_NOTIFY_API_KEY || "";
const CATH_SERVICE_URL = process.env.CATH_SERVICE_URL || "https://www.court-tribunal-hearings.service.gov.uk";

// Only files strictly smaller than 2 MB are linked; a file of exactly 2 MB is withheld
export const MAX_NOTIFY_ATTACHMENT_SIZE_BYTES = 2 * 1024 * 1024;

export function isWithinNotifyAttachmentLimit(file: Buffer): boolean {
  return file.length < MAX_NOTIFY_ATTACHMENT_SIZE_BYTES;
}

// hasPdf / hasExcel mean the file was generated AND is small enough to link (under 2MB), i.e. it will
// be attached to the email. Each file is judged on its own: an oversized or missing file only drops
// that file's link, never the other's. The PDF/Excel templates require pdf_link_*/excel_link_*
// personalisation that is only set when a buffer is attached, so the template must match what is attached.
export function getSubscriptionTemplateId(params: { hasPdf: boolean; hasExcel: boolean }): string {
  const { hasPdf, hasExcel } = params;

  if (hasPdf && hasExcel) {
    return GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL;
  }

  if (hasPdf) {
    return GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_ONLY;
  }

  if (hasExcel) {
    return GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_EXCEL_ONLY;
  }

  return GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_NO_LINKS;
}

export function getFlatFileSubscriptionTemplateId(): string {
  return GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_FLAT_FILE;
}

export function getSystemAdminTemplateId(): string {
  return GOVUK_NOTIFY_TEMPLATE_ID_SYSTEM_ADMIN;
}

export function getLocationSubscriptionDeletionTemplateId(): string {
  return GOVUK_NOTIFY_TEMPLATE_ID_LOCATION_SUBSCRIPTION_DELETION;
}

export function getEnvName(): string {
  return process.env.ENV_NAME || "Local";
}

export function getApiKey(): string {
  if (!GOVUK_NOTIFY_API_KEY) {
    throw new Error("GOVUK_NOTIFY_API_KEY environment variable is not set");
  }
  return GOVUK_NOTIFY_API_KEY;
}

export function getServiceUrl(): string {
  return CATH_SERVICE_URL;
}

export function formatPublicationDate(date: Date): string {
  const day = date.getDate();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

export interface TemplateParameters {
  locations: string;
  ListType: string;
  content_date: string;
  start_page_link: string;
  subscription_page_link: string;
  display_locations: string;
  display_case: string;
  case: string;
  display_case_num: string;
  case_num: string;
  display_case_urn: string;
  case_urn: string;
  display_summary: string;
  summary_of_cases: string;
  [key: string]: string | unknown | undefined;
}

export function buildTemplateParameters(params: {
  userName: string;
  hearingListName: string;
  publicationDate: Date;
  locationName: string;
  caseValue?: string;
}): TemplateParameters {
  const showLocation = !!params.locationName;
  const hasCase = !!params.caseValue;
  return {
    locations: showLocation ? params.locationName : "",
    ListType: params.hearingListName,
    content_date: formatPublicationDate(params.publicationDate),
    start_page_link: getServiceUrl(),
    subscription_page_link: getServiceUrl(),
    display_locations: showLocation ? "yes" : "no",
    display_case: hasCase ? "yes" : "no",
    case: params.caseValue ?? "",
    display_case_num: hasCase ? "yes" : "no",
    case_num: params.caseValue ?? "",
    display_case_urn: "no",
    case_urn: "",
    display_summary: "no",
    summary_of_cases: ""
  };
}

export function buildEnhancedTemplateParameters(params: {
  userName: string;
  hearingListName: string;
  publicationDate: Date;
  locationName: string;
  caseSummary: string;
  caseValue?: string;
}): TemplateParameters {
  const baseParams = buildTemplateParameters({
    userName: params.userName,
    hearingListName: params.hearingListName,
    publicationDate: params.publicationDate,
    locationName: params.locationName,
    caseValue: params.caseValue
  });

  return {
    ...baseParams,
    display_summary: "yes",
    summary_of_cases: params.caseSummary
  };
}
