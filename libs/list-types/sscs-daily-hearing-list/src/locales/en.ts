import { provenanceLabelsEn as provenanceLabels } from "@hmcts/list-types-common";

const OPEN_JUSTICE_PREAMBLE =
  "Open justice is a fundamental principle of our justice system. When considering the use of telephone and video technology, the judiciary will have regard to the principles of open justice. Judges may determine that a hearing should be held in private if this is necessary to secure the proper administration of justice.";

const OBSERVER_INSTRUCTIONS = (email: string) =>
  `Social Security and Child Support Tribunal parties and representatives will be informed directly as to the arrangements for hearing cases remotely. Any other person interested in joining the hearing remotely should contact the Social Security and Child Support Tribunal Office direct, in advance of the hearing date, by emailing ${email} so that arrangements can be made. The following details should be included in the subject line of the email [OBSERVER/MEDIA] REQUEST – [case reference] – [hearing date]. If the case is to be heard in private or is subject to a reporting restriction, this will be notified.`;

const OBSERVE_LINK = "For more information, please visit https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing";

export const importantInformationByListType: Record<string, string> = {
  SSCS_LONDON_DAILY_HEARING_LIST: `${OPEN_JUSTICE_PREAMBLE}\n${OBSERVER_INSTRUCTIONS("sscsa-sutton@justice.gov.uk")}\n${OBSERVE_LINK}`,
  SSCS_MIDLANDS_DAILY_HEARING_LIST: `${OPEN_JUSTICE_PREAMBLE}\n${OBSERVER_INSTRUCTIONS("ascbirmingham@justice.gov.uk")}\n${OBSERVE_LINK}`,
  SSCS_NORTH_EAST_DAILY_HEARING_LIST: `${OPEN_JUSTICE_PREAMBLE}\n${OBSERVER_INSTRUCTIONS("sscsa-leeds@Justice.gov.uk")}\n${OBSERVE_LINK}`,
  SSCS_NORTH_WEST_DAILY_HEARING_LIST: `${OPEN_JUSTICE_PREAMBLE}\n${OBSERVER_INSTRUCTIONS("sscsa-liverpool@justice.gov.uk")}\n${OBSERVE_LINK}`,
  SSCS_LIVERPOOL_DAILY_HEARING_LIST: `${OPEN_JUSTICE_PREAMBLE}\n${OBSERVER_INSTRUCTIONS("sscsa-liverpool@justice.gov.uk")}\n${OBSERVE_LINK}`,
  SSCS_SCOTLAND_DAILY_HEARING_LIST: `${OPEN_JUSTICE_PREAMBLE}\n${OBSERVER_INSTRUCTIONS("sscsa-glasgow@justice.gov.uk")}\n${OBSERVE_LINK}`,
  SSCS_SOUTH_EAST_DAILY_HEARING_LIST: `${OPEN_JUSTICE_PREAMBLE}\n${OBSERVER_INSTRUCTIONS("sscs_bradford@justice.gov.uk")}\n${OBSERVE_LINK}`,
  SSCS_WALES_AND_SOUTH_WEST_DAILY_HEARING_LIST: `${OPEN_JUSTICE_PREAMBLE}\n${OBSERVER_INSTRUCTIONS("sscsa-cardiff@justice.gov.uk")}\n${OBSERVE_LINK}`
};

export const en = {
  listForDate: "List for",
  lastUpdated: "Last updated",
  at: "at",
  factLinkText: "Find contact details and other information about courts and tribunals",
  factLinkUrl: "https://www.find-court-tribunal.service.gov.uk/",
  factAdditionalText: "in England and Wales, and some non-devolved tribunals in Scotland.",
  importantInformationTitle: "Important information",
  importantInformationLinkText: "Observe a court or tribunal hearing as a journalist, researcher or member of the public",
  importantInformationLinkUrl: "https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing",
  searchCasesTitle: "Search Cases",
  searchCasesLabel: "Search by appeal reference, hearing type, appellant, or other details",
  tableHeaders: {
    venue: "Venue",
    appealReferenceNumber: "Appeal Reference Number",
    hearingType: "Hearing Type",
    appellant: "Appellant",
    courtroom: "Courtroom",
    hearingTime: "Hearing Time",
    tribunal: "Tribunal",
    respondent: "FTA/Respondent",
    additionalInformation: "Additional Information"
  },
  dataSource: "Data source",
  backToTop: "Back to top",
  provenanceLabels
};
