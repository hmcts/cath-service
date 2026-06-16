export interface CicWeeklyHearing {
  date: string;
  hearingTime: string;
  caseReferenceNumber: string;
  caseName: string;
  venuePlatform: string;
  judges: string;
  members: string;
  additionalInformation: string;
}

export type CicWeeklyHearingList = CicWeeklyHearing[];
