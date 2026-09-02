export interface FttRptHearing {
  date: string;
  time: string;
  venue: string;
  caseType: string;
  caseReferenceNumber: string;
  judges: string;
  members: string;
  hearingMethod: string;
  additionalInformation: string;
}

export type FttRptHearingList = FttRptHearing[];
