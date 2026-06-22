export interface UtiacJrLeedsHearing {
  venue: string;
  judges: string;
  hearingTime: string;
  caseReferenceNumber: string;
  caseTitle: string;
  hearingType: string;
  additionalInformation: string;
}

export type UtiacJrLeedsHearingList = UtiacJrLeedsHearing[];

// Shared aliases used by Manchester, Birmingham, and Cardiff variants
export type UtiacJrHearing = UtiacJrLeedsHearing;
export type UtiacJrHearingList = UtiacJrLeedsHearingList;
