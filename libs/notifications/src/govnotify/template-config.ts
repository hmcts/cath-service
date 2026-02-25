// Read environment variables at runtime instead of module load time
// This prevents issues where env vars are set after module initialization
function getEnvVar(key: string, defaultValue = ""): string {
  return process.env[key] || defaultValue;
}

const CATH_SERVICE_URL = process.env.CATH_SERVICE_URL || "https://www.court-tribunal-hearings.service.gov.uk";

export function getTemplateId(): string {
  const templateId = getEnvVar("GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION");
  if (!templateId) {
    throw new Error("GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION environment variable is not set");
  }
  return templateId;
}

export function getSubscriptionTemplateIdForListType(_listTypeId: number, hasPdf: boolean, pdfUnder2MB: boolean): string {
  if (hasPdf && pdfUnder2MB) {
    const templateId = getEnvVar("GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_AND_SUMMARY");
    if (!templateId) {
      console.warn("GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_AND_SUMMARY not set, falling back to base template");
      return getTemplateId();
    }
    return templateId;
  }

  const templateId = getEnvVar("GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_SUMMARY_ONLY");
  if (!templateId) {
    console.warn("GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_SUMMARY_ONLY not set, falling back to base template");
    return getTemplateId();
  }
  return templateId;
}

export function getApiKey(): string {
  const apiKey = getEnvVar("GOVUK_NOTIFY_TEST_API_KEY");
  if (!apiKey) {
    throw new Error("GOVUK_NOTIFY_TEST_API_KEY environment variable is not set");
  }
  return apiKey;
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
  case: string;
  display_locations: string;
  display_case: string;
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
  caseInfo?: string;
  hasLocationSubscription?: boolean;
}): TemplateParameters {
  const templateParams: TemplateParameters = {
    ListType: params.hearingListName,
    content_date: formatPublicationDate(params.publicationDate),
    start_page_link: getServiceUrl(),
    subscription_page_link: getServiceUrl(),
    locations: params.hasLocationSubscription ? params.locationName : "",
    case: "",
    display_locations: params.hasLocationSubscription ? "yes" : "",
    display_case: "",
    link_to_file: getServiceUrl(),
    display_summary: "",
    summary_of_cases: ""
  };

  // Add case information if present
  if (params.caseInfo) {
    templateParams.case = params.caseInfo;
    templateParams.display_case = "yes";
  }

  return templateParams;
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
    locationName: params.locationName,
    hasLocationSubscription: true
  });

  return {
    ...baseParams,
    display_summary: "yes",
    summary_of_cases: params.caseSummary
    // link_to_file is added by govnotify-client when PDF buffer is provided
  };
}
