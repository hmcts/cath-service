export interface SendDailyHearing {
  time: string;
  caseReferenceNumber: string;
  respondent: string;
  hearingType: string;
  venue: string;
  timeEstimate: string;
}

export type SendDailyHearingList = SendDailyHearing[];
