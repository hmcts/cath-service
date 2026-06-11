export type { Party } from "@hmcts/list-types-common";

export interface CrownDailyCase {
  caseNumber: string;
  prosecutingAuthority?: string;
  listingNotes?: string;
  reportingRestrictionDetail?: string[];
  party?: Party[];
}

export interface CrownDailyHearing {
  hearingDescription?: string;
  hearingType?: string;
  case: CrownDailyCase[];
}

export interface Sitting {
  sittingStart: string;
  sittingEnd?: string;
  hearing: CrownDailyHearing[];
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

export interface CrownDailyListData {
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
      courtHouseAddress?: CourtHouse["courtHouseAddress"];
      courtRoom: CrownDailyCourtRoomRendered[];
    };
  }>;
}
