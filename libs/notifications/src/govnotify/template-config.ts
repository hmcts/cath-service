const GOVNOTIFY_API_KEY = process.env.GOVNOTIFY_API_KEY || "";
const GOVNOTIFY_TEMPLATE_ID = process.env.GOVNOTIFY_TEMPLATE_ID || "";
const CATH_SERVICE_URL = process.env.CATH_SERVICE_URL || "https://www.court-tribunal-hearings.service.gov.uk";

export function getTemplateId(): string {
  if (!GOVNOTIFY_TEMPLATE_ID) {
    throw new Error("GOVNOTIFY_TEMPLATE_ID environment variable is not set");
  }
  return GOVNOTIFY_TEMPLATE_ID;
}

export function getApiKey(): string {
  if (!GOVNOTIFY_API_KEY) {
    throw new Error("GOVNOTIFY_API_KEY environment variable is not set");
  }
  return GOVNOTIFY_API_KEY;
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
  user_name: string;
  hearing_list_name: string;
  publication_date: string;
  location_name: string;
  manage_link: string;
  [key: string]: string;
}

export function buildTemplateParameters(params: {
  userName: string;
  hearingListName: string;
  publicationDate: Date;
  locationName: string;
}): TemplateParameters {
  return {
    user_name: params.userName,
    hearing_list_name: params.hearingListName,
    publication_date: formatPublicationDate(params.publicationDate),
    location_name: params.locationName,
    manage_link: getServiceUrl()
  };
}
