export interface MagistratesOffence {
  offenceCode?: string;
  offenceTitle?: string;
  offenceWording?: string;
}

export interface MagistratesParty {
  partyRole: string;
  individualDetails?: {
    title?: string;
    individualForenames?: string;
    individualMiddleName?: string;
    individualSurname?: string;
    dateOfBirth?: string;
    age?: number;
    individualAddress?: {
      line?: string[];
      town?: string;
      county?: string;
      postCode?: string;
    };
  };
  organisationDetails?: {
    organisationName?: string;
  };
  offence?: MagistratesOffence[];
}

export interface MagistratesCase {
  caseNumber: string;
  caseName?: string;
  reportingRestrictionDetail?: string[];
  party?: MagistratesParty[];
}

export interface MagistratesHearing {
  hearingType?: string;
  case: MagistratesCase[];
}

export interface MagistratesSitting {
  sittingStart: string;
  sittingEnd?: string;
  channel?: string[];
  hearing: MagistratesHearing[];
}

export interface MagistratesSession {
  judiciary?: Array<{
    johKnownAs: string;
    isPresiding?: boolean;
  }>;
  sessionChannel?: string[];
  sittings: MagistratesSitting[];
}

export interface MagistratesCourtRoom {
  courtRoomName: string;
  session: MagistratesSession[];
}

export interface MagistratesCourtHouse {
  courtHouseName: string;
  courtHouseAddress?: {
    line?: string[];
    town?: string;
    county?: string;
    postCode?: string;
  };
  courtRoom: MagistratesCourtRoom[];
}

export interface MagistratesAdultListData {
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
    courtHouse: MagistratesCourtHouse;
  }>;
}
