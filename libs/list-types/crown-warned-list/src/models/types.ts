export interface CitizenName {
  CitizenNameTitle?: string;
  CitizenNameForename?: string[];
  CitizenNameSurname?: string;
  CitizenNameRequestedName?: string;
}

export interface PddaPersonalDetails {
  Name: CitizenName;
  MaskedName?: string;
  IsMasked: "YES" | "NO";
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
  CaseNumberCaTH?: string;
  Hearing?: Array<{
    HearingDescription?: string;
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
}

export interface PddaAddress {
  Line?: string[];
  PostCode?: string;
}

export interface PddaCourtHouse {
  CourtHouseName: string;
  CourtHouseType?: string;
  CourtHouseCode?: number;
  CourtHouseAddress?: PddaAddress;
  CourtHouseTelephone?: string;
}

export interface CrownWarnedListData {
  WarnedList: {
    DocumentID: { UniqueID: string; DocumentType: string };
    ListHeader: {
      StartDate?: string;
      EndDate?: string;
      Version?: string;
      PublishedTime?: string;
    };
    CrownCourt: PddaCourtHouse;
    CourtLists: Array<{
      CourtHouse: PddaCourtHouse;
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
