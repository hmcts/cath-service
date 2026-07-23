export interface IacJudiciary {
  johTitle?: string;
  johNameSurname?: string;
  isPresiding?: boolean;
}

export interface IacIndividualDetails {
  title?: string;
  individualForenames?: string;
  individualMiddleName?: string;
  individualSurname?: string;
}

export interface IacOrganisationDetails {
  organisationName?: string;
}

export interface IacParty {
  partyRole?: string;
  individualDetails?: IacIndividualDetails;
  organisationDetails?: IacOrganisationDetails;
}

export interface IacCase {
  caseNumber: string;
  caseSequenceIndicator?: string;
  caseType?: string;
  language?: string;
  party?: IacParty[];
}

export interface IacHearing {
  hearingType?: string;
  case: IacCase[];
}

export interface IacSitting {
  sittingStart: string;
  sittingEnd: string;
  hearing: IacHearing[];
  channel?: string[];
}

export interface IacSession {
  sessionChannel: string[];
  judiciary?: IacJudiciary[];
  sittings: IacSitting[];
}

export interface IacCourtRoom {
  courtRoomName: string;
  session: IacSession[];
}

export interface IacCourtHouse {
  courtRoom: IacCourtRoom[];
}

export interface IacCourtList {
  courtListName: string;
  courtHouse: IacCourtHouse;
}

export interface IacDailyList {
  document: {
    publicationDate: string;
  };
  venue: {
    venueName: string;
  };
  courtLists: IacCourtList[];
}

export interface IacRenderedCase {
  caseRef: string;
  appellant: string;
  appellantRepresentative: string;
  prosecutingAuthority: string;
  language: string;
}

export interface IacRenderedHearing {
  hearingType: string;
  case: IacRenderedCase[];
}

export interface IacRenderedSitting {
  startTime: string;
  caseHearingChannel: string;
  hearing: IacRenderedHearing[];
}

export interface IacRenderedSession {
  courtRoomName: string;
  formattedJudiciary: string;
  isBailList: boolean;
  sittings: IacRenderedSitting[];
}

export interface IacRenderedCourtList {
  courtListName: string;
  session: IacRenderedSession[];
}

export interface IacRenderedHeader {
  listTitle: string;
  venueName: string;
  contentDate: string;
  lastUpdatedDate: string;
  lastUpdatedTime: string;
}

export interface IacRenderedData {
  header: IacRenderedHeader;
  hearings: {
    courtLists: IacRenderedCourtList[];
  };
}

export interface IacRenderOptions {
  locale: string;
  listTypeName: string;
  listTitle: string;
  contentDate: Date;
  lastReceivedDate: string;
}
