const GOVUK_NOTIFY_API_KEY = process.env.GOVUK_NOTIFY_API_KEY || "";
const GOVUK_NOTIFY_TEMPLATE_ID_SJP_EXCEL_ONLY = process.env.GOVUK_NOTIFY_TEMPLATE_ID_SJP_EXCEL_ONLY || "";
const GOVUK_NOTIFY_TEMPLATE_ID_NO_LINKS = process.env.GOVUK_NOTIFY_TEMPLATE_ID_NO_LINKS || process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION || "";
const GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF =
  process.env.GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF || process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_ONLY || "";
const GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL = process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL || "";
const GOVUK_NOTIFY_TEMPLATE_ID_SYSTEM_ADMIN = process.env.GOVUK_NOTIFY_TEMPLATE_ID_SYSTEM_ADMIN || "";
const CATH_SERVICE_URL = process.env.CATH_SERVICE_URL || "https://www.court-tribunal-hearings.service.gov.uk";

export function getSubscriptionTemplateId(params: { hasPdf: boolean; hasExcel: boolean; filesUnder2MB: boolean }): string {
  const { hasPdf, hasExcel, filesUnder2MB } = params;

  // Each template must only reference personalisation that is actually set:
  // pdf_link_*/excel_link_* are only populated when the matching buffer exists.
  // No attachments (e.g. flat-file lists) or files too large to link: no-links template.
  if (!filesUnder2MB || (!hasPdf && !hasExcel)) {
    if (!GOVUK_NOTIFY_TEMPLATE_ID_NO_LINKS) {
      throw new Error("GOVUK_NOTIFY_TEMPLATE_ID_NO_LINKS environment variable is not set");
    }
    return GOVUK_NOTIFY_TEMPLATE_ID_NO_LINKS;
  }

  // Excel without PDF happens for any list type whose payload exceeds the PDF gate but not the Excel gate
  if (hasExcel && !hasPdf) {
    if (!GOVUK_NOTIFY_TEMPLATE_ID_SJP_EXCEL_ONLY) {
      throw new Error("GOVUK_NOTIFY_TEMPLATE_ID_SJP_EXCEL_ONLY environment variable is not set");
    }
    return GOVUK_NOTIFY_TEMPLATE_ID_SJP_EXCEL_ONLY;
  }

  if (hasPdf && hasExcel) {
    if (!GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL) {
      throw new Error("GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL environment variable is not set");
    }
    return GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL;
  }

  if (!GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF) {
    throw new Error("GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF environment variable is not set");
  }
  return GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF;
}

export function getSystemAdminTemplateId(): string {
  return GOVUK_NOTIFY_TEMPLATE_ID_SYSTEM_ADMIN;
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
