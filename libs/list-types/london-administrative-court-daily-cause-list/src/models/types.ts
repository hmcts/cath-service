export interface StandardHearing {
  venue: string;
  judge: string;
  time: string;
  caseNumber: string;
  caseDetails: string;
  hearingType: string;
  additionalInformation: string;
}

export interface LondonAdminCourtData {
  mainHearings: StandardHearing[];
  planningCourt: StandardHearing[];
}
