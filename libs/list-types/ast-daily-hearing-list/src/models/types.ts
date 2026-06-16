export interface AstDailyHearingListItem {
  appellant: string;
  appealReferenceNumber: string;
  caseType: string;
  hearingType: string;
  hearingTime: string;
  additionalInformation: string;
}

export type AstDailyHearingList = AstDailyHearingListItem[];
