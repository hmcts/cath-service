export interface CitizenName {
  CitizenNameTitle?: string;
  CitizenNameForename?: string[];
  CitizenNameSurname?: string;
  CitizenNameRequestedName?: string;
  CitizenNameSuffix?: string;
}

export interface PersonalDetails {
  Name: CitizenName;
  MaskedName?: string;
  IsMasked: "YES" | "NO";
  DateOfBirth?: string;
  Age?: number;
  Sex?: string;
}

export interface PddaDefendant {
  PersonalDetails: PersonalDetails;
  URN?: string;
  PrisonerID?: string;
}

export interface PddaHearingDetails {
  HearingDescription?: string;
  HearingType?: string;
}

export interface PddaHearing {
  HearingSequenceNumber?: number;
  HearingDetails: PddaHearingDetails;
  CaseNumber: string;
  CaseNumberCaTH?: string;
  ListNote?: string;
  TimeMarkingNote?: string;
  Prosecution?: {
    ProsecutingReference?: string;
    ProsecutingOrganisation?: { OrganisationName?: string };
    ProsecutingAuthority?: string;
  };
  Defendants?: PddaDefendant[];
}

export interface PddaJudiciary {
  Judge: CitizenName;
  Justice?: CitizenName[];
}

export interface PddaSitting {
  CourtRoomNumber: number;
  SittingAt?: string;
  Judiciary: PddaJudiciary;
  Hearings?: PddaHearing[];
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

export interface PddaListHeader {
  StartDate?: string;
  EndDate?: string;
  Version?: string;
  PublishedTime?: string;
}

export interface CrownDailyListData {
  DailyList: {
    DocumentID: { UniqueID: string; DocumentType: string };
    ListHeader: PddaListHeader;
    CrownCourt: PddaCourtHouse;
    CourtLists: Array<{
      CourtHouse: PddaCourtHouse;
      Sittings: PddaSitting[];
    }>;
  };
}

export interface RenderOptions {
  locationId: string;
  contentDate: Date;
  locale: string;
}

export interface CrownDailyCaseRendered {
  caseNumber: string;
  prosecutingAuthority: string;
  listingNotes: string;
  timeMarkingNote: string;
  defendants: string;
  representative: string;
  formattedReportingRestriction: string;
}

export interface CrownDailyHearingRendered {
  displayHearingType: string;
  case: CrownDailyCaseRendered[];
}

export interface CrownDailySittingRendered {
  time: string;
  hearing: CrownDailyHearingRendered[];
}

export interface CrownDailySessionRendered {
  formattedJudiciaries: string;
  hasListingNotes: boolean;
  sittings: CrownDailySittingRendered[];
}

export interface CrownDailyCourtRoomRendered {
  courtRoomName: string;
  session: CrownDailySessionRendered[];
}

export interface CrownDailyListRendered {
  courtLists: Array<{
    courtHouse: {
      courtHouseName: string;
      courtHouseAddressLines: string[];
      courtHousePhone: string;
      courtRoom: CrownDailyCourtRoomRendered[];
    };
  }>;
}
