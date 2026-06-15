export interface CitizenName {
  CitizenNameTitle?: string;
  CitizenNameForename?: string;
  CitizenNameSurname?: string;
  CitizenNameRequestedName?: string;
}

export interface PersonalDetails {
  Name: CitizenName;
  MaskedName?: string;
  IsMasked: "yes" | "no";
  DateOfBirth?: string;
  Age?: number;
  Sex?: string;
}

export interface PddaDefendant {
  PersonalDetails: PersonalDetails;
  URN?: string;
  PrisonerID?: string;
  PrisonLocation?: string;
}

export interface PddaHearingDetails {
  HearingDescription?: string;
  HearingType?: string;
}

export interface PddaHearing {
  HearingSequenceNumber?: string;
  HearingDetails: PddaHearingDetails;
  CaseNumber: string;
  CaseNumberCaTH?: string;
  CommittingCourt?: string;
  ListNote?: string;
  Prosecution?: {
    ProsecutingReference?: string;
    ProsecutingOrganisation?: string;
    ProsecutingAuthority?: string;
  };
  Defendants?: PddaDefendant[];
}

export interface PddaJudiciary {
  Judge: CitizenName;
  Justice?: CitizenName[];
}

export interface PddaSitting {
  CourtRoomNumber: string;
  SittingAt?: string;
  Judiciary: PddaJudiciary;
  Hearings?: PddaHearing[];
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

export interface PddaListHeader {
  ListDate?: string;
  LastPublicationDate?: string;
  PublishedTime?: string;
  Version?: string;
  StartDate?: string;
}

export interface CrownDailyListData {
  DailyList: {
    DocumentID: string;
    ListHeader: PddaListHeader;
    CrownCourt: PddaCourtHouse;
    CourtLists: Array<{
      CourtHouse?: PddaCourtHouse;
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
      courtRoom: CrownDailyCourtRoomRendered[];
    };
  }>;
}
