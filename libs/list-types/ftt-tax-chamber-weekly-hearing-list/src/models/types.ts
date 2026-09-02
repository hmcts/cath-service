export interface FttTaxChamberHearing {
  date: string;
  hearingTime: string;
  caseName: string;
  caseReferenceNumber: string;
  judges: string;
  members: string;
  venuePlatform: string;
}

export type FttTaxChamberHearingList = FttTaxChamberHearing[];
