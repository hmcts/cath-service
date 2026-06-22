export interface WpafccWeeklyHearing {
  date: string;
  hearingTime: string;
  caseReferenceNumber: string;
  caseName: string;
  panel: string;
  modeOfHearing: string;
  venue: string;
  additionalInformation: string;
}

export type WpafccWeeklyHearingList = WpafccWeeklyHearing[];
