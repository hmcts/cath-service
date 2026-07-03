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

export interface SolicitorParty {
  Person?: {
    PersonalDetails?: {
      Name: CitizenName;
      MaskedName?: string;
      IsMasked?: "YES" | "NO";
    };
  };
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
  HearingSequenceNumber?: number;
  HearingDetails: PddaHearingDetails;
  CaseNumber: string;
  CaseNumberCaTH?: string;
  TimeMarkingNote?: string;
  ListNote?: string;
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

export interface CrownFirmListData {
  FirmList: {
    DocumentID: { UniqueID: string; DocumentType: string };
    ListHeader: PddaListHeader;
    CrownCourt: PddaCourtHouse;
    ReserveList?: unknown[];
    CourtLists: Array<{
      SittingDate: string;
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

export interface CrownFirmCaseRendered {
  caseNumber: string;
  timeMarkingNote: string;
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

export interface CrownFirmCourtHouseInfo {
  name: string;
  addressLines: string[];
  phone: string;
}

export interface CrownFirmGroupedDay {
  day: string;
  courtHouseInfo: CrownFirmCourtHouseInfo;
  sittings: CrownFirmDaySitting[];
}
