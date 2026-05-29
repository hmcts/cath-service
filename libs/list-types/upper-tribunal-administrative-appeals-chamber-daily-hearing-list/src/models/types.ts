export interface UtaacHearing {
  time: string;
  appellant: string;
  caseReferenceNumber: string;
  caseName: string;
  judges: string;
  members: string;
  modeOfHearing: string;
  venue: string;
  additionalInformation?: string;
}

export type UtaacHearingList = UtaacHearing[];
