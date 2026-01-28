export interface AdministrativeCourtHearing {
  venue: string;
  judge: string;
  time: string;
  caseNumber: string;
  caseDetails: string;
  hearingType: string;
  additionalInformation: string;
}

export type AdministrativeCourtHearingList = AdministrativeCourtHearing[];
