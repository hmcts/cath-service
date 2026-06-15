export interface CitizenName {
  CitizenNameTitle?: string;
  CitizenNameForename?: string;
  CitizenNameSurname?: string;
  CitizenNameRequestedName?: string;
}

export interface PddaPersonalDetails {
  Name: CitizenName;
  MaskedName?: string;
  IsMasked: "yes" | "no";
  CustodyStatus?: string;
  DateOfBirth?: string;
  Age?: number;
  Sex?: string;
}

export interface PddaDefendant {
  PersonalDetails: PddaPersonalDetails;
  URN?: string;
}

export interface PddaCase {
  CaseNumber?: string;
  Hearing?: Array<{
    ListNote?: string;
  }>;
  Prosecution?: {
    ProsecutingAuthority?: string;
  };
  Defendants?: PddaDefendant[];
  LinkedCases?: Array<{
    CaseNumber?: string;
  }>;
}

export interface PddaFixture {
  FixedDate?: string;
  Cases?: PddaCase[];
}

export interface PddaCourtListEntry {
  Fixture?: PddaFixture[];
  Cases?: PddaCase[];
}

export interface PddaCourtHouseAddress {
  CourtHouseAddressLine?: string[];
  CourtHouseAddressTown?: string;
  CourtHouseAddressCounty?: string;
  CourtHouseAddressPostCode?: string;
  CourtHouseAddressPhone?: string;
  CourtHouseAddressEmail?: string;
}

export interface PddaCourtHouse {
  CourtHouseName: string;
  CourtHouseCode?: string;
  CourtHouseAddress?: PddaCourtHouseAddress;
}

export interface CrownWarnedListData {
  WarnedList: {
    DocumentID: string;
    ListHeader: {
      StartDate?: string;
      LastPublicationDate?: string;
      PublishedTime?: string;
      Version?: string;
    };
    CrownCourt: PddaCourtHouse;
    CourtLists: Array<{
      CourtHouse?: PddaCourtHouse;
      WithFixedDate?: PddaCourtListEntry[];
      WithoutFixedDate?: PddaCourtListEntry[];
    }>;
  };
}

export interface GroupedHearingCategory {
  category: string;
  cases: CrownWarnedCaseRow[];
}

export interface CrownWarnedCaseRow {
  fixedFor: string;
  caseNumber: string;
  defendants: string;
  prosecutingAuthority: string;
  linkedCases: string;
  listingNotes: string;
  isInCustody: boolean;
}

export interface RenderOptions {
  locationId: string;
  contentDate: Date;
  locale: string;
}
