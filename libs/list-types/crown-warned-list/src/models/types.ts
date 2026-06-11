export type { Party } from "@hmcts/list-types-common";

export interface LinkedCase {
  caseReference?: string;
}

export interface CrownWarnedCase {
  caseNumber: string;
  fixedFor?: string;
  prosecutingAuthority?: string;
  listingNotes?: string;
  linkedCases?: LinkedCase[];
  reportingRestrictionDetail?: string[];
  party?: Party[];
}

export interface CrownWarnedHearing {
  hearingDescription?: string;
  hearingType?: string;
  case: CrownWarnedCase[];
}

export interface Sitting {
  sittingStart: string;
  sittingEnd?: string;
  hearing: CrownWarnedHearing[];
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

export interface CrownWarnedListData {
  document: {
    publicationDate: string;
    documentName?: string;
    version?: string;
    weekCommencing?: string;
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
