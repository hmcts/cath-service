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

export interface SolicitorParty {
  Person?: CitizenName;
  Organisation?: {
    OrganisationName?: string;
  };
}

export interface PddaCounsel {
  Solicitor?: Array<{
    Party?: SolicitorParty;
  }>;
}

export interface PddaDefendant {
  PersonalDetails: PersonalDetails;
  Counsel?: PddaCounsel[];
  URN?: string;
  PrisonerID?: string;
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
}

export interface CrownFirmListData {
  FirmList: {
    DocumentID: string;
    ListHeader: PddaListHeader;
    CrownCourt: PddaCourtHouse;
    ReserveList?: unknown[];
    CourtLists: Array<{
      SittingDate: string;
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

export interface CrownFirmCaseRendered {
  caseNumber: string;
  prosecutingAuthority: string;
  listingNotes: string;
  defendants: string;
  representative: string;
  formattedReportingRestriction: string;
}

export interface CrownFirmHearingRendered {
  displayHearingType: string;
  case: CrownFirmCaseRendered[];
}

export interface CrownFirmDaySitting {
  courtRoomName: string;
  formattedJudiciaries: string;
  time: string;
  hearing: CrownFirmHearingRendered[];
}

export interface CrownFirmGroupedDay {
  day: string;
  sittings: CrownFirmDaySitting[];
}
