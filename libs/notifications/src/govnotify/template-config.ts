const GOVUK_NOTIFY_API_KEY = process.env.GOVUK_NOTIFY_API_KEY || "";
const GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION = process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION || "";
const GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_AND_SUMMARY = process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_AND_SUMMARY || "";
const GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_SUMMARY_ONLY = process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_SUMMARY_ONLY || "";
const CATH_SERVICE_URL = process.env.CATH_SERVICE_URL || "https://www.court-tribunal-hearings.service.gov.uk";

export function getTemplateId(): string {
  if (!GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION) {
    throw new Error("GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION environment variable is not set");
  }
  return GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION;
}

export function getSubscriptionTemplateIdForListType(_listTypeId: number, hasPdf: boolean, pdfUnder2MB: boolean): string {
  if (hasPdf && pdfUnder2MB) {
    if (!GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_AND_SUMMARY) {
      throw new Error("GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_AND_SUMMARY environment variable is not set");
    }
    return GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_AND_SUMMARY;
  }

  if (!GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_SUMMARY_ONLY) {
    throw new Error("GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_SUMMARY_ONLY environment variable is not set");
  }
  return GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_SUMMARY_ONLY;
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
  // Enhanced template fields for Civil and Family Daily Cause List
  display_summary?: string;
  summary_of_cases?: string;
  // link_to_file is added by govnotify-client when PDF buffer is provided
  [key: string]: string | unknown | undefined;
}

export function buildTemplateParameters(params: {
  userName: string;
  hearingListName: string;
  publicationDate: Date;
  locationName: string;
}): TemplateParameters {
  return {
    locations: params.locationName,
    ListType: params.hearingListName,
    content_date: formatPublicationDate(params.publicationDate),
    start_page_link: getServiceUrl(),
    subscription_page_link: getServiceUrl()
  };
}

export function buildEnhancedTemplateParameters(params: {
  userName: string;
  hearingListName: string;
  publicationDate: Date;
  locationName: string;
  caseSummary: string;
}): TemplateParameters {
  const baseParams = buildTemplateParameters({
    userName: params.userName,
    hearingListName: params.hearingListName,
    publicationDate: params.publicationDate,
    locationName: params.locationName
  });

  return {
    ...baseParams,
    display_summary: "yes",
    summary_of_cases: params.caseSummary
    // link_to_file is added by govnotify-client when PDF buffer is provided
  };
}
