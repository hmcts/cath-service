export type { Party } from "@hmcts/list-types-common";

export interface CrownFirmCase {
  caseNumber: string;
  prosecutingAuthority?: string;
  listingNotes?: string;
  reportingRestrictionDetail?: string[];
  party?: Party[];
}

export interface CrownFirmHearing {
  hearingDescription?: string;
  hearingType?: string;
  case: CrownFirmCase[];
}

export interface Sitting {
  sittingStart: string;
  sittingEnd?: string;
  hearing: CrownFirmHearing[];
}

export interface Session {
  judiciary?: Array<{
    johKnownAs: string;
    isPresiding?: boolean;
  }>;
  sittings: Sitting[];
}

export interface CourtRoom {
  courtRoomName: string;
  session: Session[];
}

export interface CourtHouse {
  courtHouseName: string;
  courtHouseAddress?: {
    line?: string[];
    town?: string;
    county?: string;
    postCode?: string;
  };
  courtRoom: CourtRoom[];
}

export interface CrownFirmListData {
  document: {
    publicationDate: string;
    documentName?: string;
    version?: string;
  };
  venue: {
    venueName: string;
    venueAddress: {
      line: string[];
      town?: string;
      county?: string;
      postCode: string;
    };
    venueContact?: {
      venueTelephone?: string;
      venueEmail?: string;
    };
  };
  courtLists: Array<{
    courtHouse: CourtHouse;
  }>;
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

export interface CrownFirmSittingRendered {
  time: string;
  sittingDay: string;
  hearing: CrownFirmHearingRendered[];
}

export interface CrownFirmSessionRendered {
  formattedJudiciaries: string;
  sittings: CrownFirmSittingRendered[];
}

export interface CrownFirmCourtRoomRendered {
  courtRoomName: string;
  session: CrownFirmSessionRendered[];
}

export interface CrownFirmListRendered {
  courtLists: Array<{
    courtHouse: {
      courtHouseName: string;
      courtHouseAddress?: CourtHouse["courtHouseAddress"];
      courtRoom: CrownFirmCourtRoomRendered[];
    };
  }>;
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
