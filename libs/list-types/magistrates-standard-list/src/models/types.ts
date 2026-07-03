export interface MagistratesStandardList {
  document: {
    publicationDate: string;
  };
  venue: {
    venueAddress?: Address;
  };
  courtLists: CourtList[];
}

export interface CourtList {
  courtHouse: {
    courtHouseName?: string;
    lja?: string;
    courtRoom: CourtRoom[];
  };
}

export interface CourtRoom {
  courtRoomName: string;
  session: Session[];
}

export interface Session {
  judiciary?: Judiciary[];
  sittings: Sitting[];
}

export interface Judiciary {
  johKnownAs?: string;
  isPresiding?: boolean;
}

export interface Sitting {
  sittingStart: string;
  hearing: Hearing[];
}

export interface Hearing {
  hearingType?: string;
  panel?: string;
  channel?: string[];
  case?: Case[];
  application?: Application[];
}

export interface Case {
  caseUrn: string;
  reportingRestriction?: boolean;
  reportingRestrictionDetails?: string[];
  caseSequenceIndicator?: string;
  party?: Party[];
}

export interface Application {
  applicationReference: string;
  applicationType?: string;
  applicationParticulars?: string;
  reportingRestriction?: boolean;
  reportingRestrictionDetails?: string[];
  party?: Party[];
}

export interface Party {
  partyRole?: string;
  subject?: boolean;
  individualDetails?: IndividualDetails;
  organisationDetails?: OrganisationDetails;
  offence?: Offence[];
}

export interface IndividualDetails {
  individualForenames?: string;
  individualMiddleName?: string;
  individualSurname?: string;
  dateOfBirth?: string;
  age?: number;
  address?: Address;
  inCustody?: boolean;
  gender?: string;
  asn?: string;
  pncId?: string;
}

export interface OrganisationDetails {
  organisationName: string;
  organisationAddress?: Address;
}

export interface Offence {
  offenceCode?: string;
  offenceTitle?: string;
  offenceWording?: string;
  offenceMaxPen?: string;
  reportingRestriction?: boolean;
  reportingRestrictionDetails?: string[];
  convictionDate?: string;
  adjournedDate?: string;
  plea?: string;
  pleaDate?: string;
  offenceLegislation?: string;
}

export interface Address {
  line?: string[];
  town?: string;
  county?: string;
  postCode?: string;
}

export interface RenderedMagistratesStandardListHeader {
  locationName: string;
  contentDate: string;
  publishedDate: string;
  publishedTime: string;
  venueAddress: string[];
}

export interface RenderedCourtRoom {
  courtHouseName: string;
  courtRoomName: string;
  lja: string;
  sittings: RenderedSitting[];
}

export interface RenderedSitting {
  sittingHeading: string;
  hearings: RenderedHearing[];
}

export interface RenderedHearing {
  partyInfo: RenderedPartyInfo;
  sittingStartTime: string;
  prosecutingAuthority: string;
  attendanceMethod: string;
  reference: string;
  applicationType: string;
  caseSequenceIndicator: string;
  hearingType: string;
  panel: string;
  applicationParticulars: string;
  reportingRestriction: boolean;
  reportingRestrictionDetails: string;
  offences: RenderedOffence[];
}

export interface RenderedPartyInfo {
  name: string;
  dob: string;
  age: string;
  address: string;
  asn: string;
  pncId: string;
}

export interface RenderedOffence {
  offenceCode: string;
  offenceTitle: string;
  offenceWording: string;
  plea: string;
  pleaDate: string;
  convictionDate: string;
  adjournedDate: string;
  offenceLegislation: string;
  offenceMaxPenalty: string;
  reportingRestriction: boolean;
  reportingRestrictionDetails: string;
}
