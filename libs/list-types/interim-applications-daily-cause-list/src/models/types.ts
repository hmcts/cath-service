export interface InterimApplicationHearing {
  judge: string;
  time: string;
  venue: string;
  type: string;
  caseNumber: string;
  caseName: string;
  additionalInformation: string;
}

export interface OpenJusticeStatementDetail {
  nameToBeDisplayed: string;
  email: string;
}

export interface InterimApplicationsData {
  hearingList: InterimApplicationHearing[];
  openJusticeStatementDetails: OpenJusticeStatementDetail[];
}
