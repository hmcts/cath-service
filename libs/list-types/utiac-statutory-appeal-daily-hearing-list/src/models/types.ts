export interface UtiacStatutoryAppealHearing {
  hearingTime: string;
  appellant: string;
  representative: string;
  appealReferenceNumber: string;
  judges: string;
  hearingType: string;
  location: string;
  additionalInformation: string;
}

export type UtiacStatutoryAppealHearingList = UtiacStatutoryAppealHearing[];
