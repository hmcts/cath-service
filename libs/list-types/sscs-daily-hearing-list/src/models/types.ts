export interface SscsDailyHearing {
  venue: string;
  appealReferenceNumber: string;
  hearingType: string;
  appellant: string;
  courtroom: string;
  hearingTime: string;
  tribunal: string;
  respondent: string;
  additionalInformation: string;
}

export type SscsDailyHearingList = SscsDailyHearing[];
