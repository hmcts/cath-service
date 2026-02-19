const GOVUK_NOTIFY_API_KEY = process.env.GOVUK_NOTIFY_API_KEY || "";
const GOVUK_NOTIFY_TEMPLATE_ID = process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION || "";
const CATH_SERVICE_URL = process.env.CATH_SERVICE_URL || "https://www.court-tribunal-hearings.service.gov.uk";

export function getTemplateId(): string {
  if (!GOVUK_NOTIFY_TEMPLATE_ID) {
    throw new Error("GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION environment variable is not set");
  }
  return GOVUK_NOTIFY_TEMPLATE_ID;
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
  case: string;
  display_locations: string;
  display_case: string;
  ListType: string;
  content_date: string;
  start_page_link: string;
  subscription_page_link: string;
  [key: string]: string;
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
