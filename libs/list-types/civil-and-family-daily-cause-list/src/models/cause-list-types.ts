export interface Party {
  partyRole: string;
  individualDetails?: {
    title?: string;
    individualForenames?: string;
    individualMiddleName?: string;
    individualSurname?: string;
  };
  organisationDetails?: {
    organisationName?: string;
  };
}

export interface CauseListCase {
  caseName: string;
  caseNumber: string;
  caseType?: string;
  caseSequenceIndicator?: string;
  reportingRestrictionDetail?: string[];
  party?: Party[];
}

export interface Hearing {
  hearingType?: string;
  case: CauseListCase[];
}

export interface Sitting {
  sittingStart: string;
  sittingEnd?: string;
  channel?: string[];
  hearing: Hearing[];
}

export interface Session {
  judiciary?: Array<{
    johKnownAs: string;
    isPresiding?: boolean;
  }>;
  sessionChannel?: string[];
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

export interface CauseListData {
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
