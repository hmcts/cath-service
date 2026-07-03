export interface SiacPoacPaacHearing {
  date: string;
  time: string;
  appellant: string;
  caseReferenceNumber: string;
  hearingType: string;
  courtroom: string;
  additionalInformation: string;
}

export type SiacPoacPaacHearingList = SiacPoacPaacHearing[];
