export interface WpafccWeeklyHearing {
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

export type WpafccWeeklyHearingList = WpafccWeeklyHearing[];
