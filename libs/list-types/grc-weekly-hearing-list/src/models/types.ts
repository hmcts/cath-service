export interface GrcWeeklyHearing {
  date: string;
  hearingTime: string;
  caseReferenceNumber: string;
  caseName: string;
  judges: string;
  members: string;
  modeOfHearing: string;
  venue: string;
  additionalInformation: string;
}

export type GrcWeeklyHearingList = GrcWeeklyHearing[];
