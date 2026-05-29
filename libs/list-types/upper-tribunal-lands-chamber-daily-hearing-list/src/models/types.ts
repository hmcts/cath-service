export interface UtlcHearing {
  time: string;
  caseReference: string;
  caseName: string;
  judges: string;
  members: string;
  hearingType: string;
  venue: string;
  modeOfHearing: string;
  additionalInformation?: string;
}

export type UtlcHearingList = UtlcHearing[];
