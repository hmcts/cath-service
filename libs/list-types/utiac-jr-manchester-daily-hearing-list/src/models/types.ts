export interface UtiacJrManchesterHearing {
  hearingTime: string;
  caseTitle: string;
  representative: string;
  caseReferenceNumber: string;
  judges: string;
  hearingType: string;
  location: string;
  additionalInformation: string;
}

export type UtiacJrManchesterHearingList = UtiacJrManchesterHearing[];
