export interface UtccHearing {
  time: string;
  caseReferenceNumber: string;
  caseName: string;
  judges: string;
  members: string;
  hearingType: string;
  venue: string;
  additionalInformation: string;
}

export type UtccHearingList = UtccHearing[];
