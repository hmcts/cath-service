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

export type UtiacJrHearing = UtiacJrLeedsHearing;
export type UtiacJrHearingList = UtiacJrLeedsHearingList;
export type UtiacJrBirminghamHearingList = UtiacJrHearingList;
export type UtiacJrCardiffHearingList = UtiacJrHearingList;
export type UtiacJrManchesterHearingList = UtiacJrHearingList;

export interface UtiacJrLondonHearing {
  hearingTime: string;
  caseTitle: string;
  representative: string;
  caseReferenceNumber: string;
  judges: string;
  hearingType: string;
  location: string;
  additionalInformation: string;
}

export type UtiacJrLondonHearingList = UtiacJrLondonHearing[];
