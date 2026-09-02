import { formatDisplayDate } from "@hmcts/list-types-common";
import { getLocationById } from "@hmcts/location";
import { buildPartyName } from "./party-name.js";

export interface RenderOptions {
  locationId: string;
  contentDate: Date;
  locale: string;
}

interface AddressData {
  line?: string[];
  town?: string;
  county?: string;
  postCode?: string;
}

interface PartyData {
  partyRole?: string;
  subject?: boolean;
  individualDetails?: { individualForenames?: string; individualSurname?: string };
  organisationDetails?: { organisationName?: string };
  offence?: { offenceTitle?: string }[];
}

interface CaseData {
  caseUrn?: string;
  reportingRestriction?: boolean;
  party?: PartyData[];
  // computed fields added by renderer
  defendant?: string;
  prosecutingAuthority?: string;
  offences?: string[];
}

interface ApplicationData {
  applicationReference?: string;
  applicationType?: string;
  party?: PartyData[];
  // computed fields added by renderer
  defendant?: string;
  prosecutingAuthority?: string;
  offences?: string[];
}

interface HearingData {
  hearingType?: string;
  channel?: string[];
  case?: CaseData[];
  application?: ApplicationData[];
}

interface SittingData {
  sittingStart?: string;
  hearing: HearingData[];
  // computed field added by renderer
  time?: string;
}

interface SessionData {
  judiciary?: { johKnownAs?: string; isPresiding?: boolean }[];
  sittings: SittingData[];
  // computed field added by renderer
  formattedJudiciaries?: string;
}

interface CourtRoomData {
  courtRoomName: string;
  session: SessionData[];
}

export interface MagistratesPublicListData {
  document: { publicationDate: string };
  venue?: { venueAddress?: AddressData };
  courtLists: { courtHouse: { courtRoom: CourtRoomData[] } }[];
}

export async function renderMagistratesPublicListData(jsonData: MagistratesPublicListData, options: RenderOptions) {
  const header = await buildHeader(jsonData, options);
  processCourtLists(jsonData);
  return { header, openJustice: null, listData: jsonData };
}

async function buildHeader(jsonData: MagistratesPublicListData, options: RenderOptions) {
  const pubDateTime = jsonData.document.publicationDate;
  const location = await getLocationById(Number.parseInt(options.locationId, 10));
  const locationName = options.locale === "cy" && location?.welshName ? location.welshName : (location?.name ?? "");

  return {
    locationName,
    contentDate: formatDisplayDate(options.contentDate, options.locale),
    publishedDate: formatPublicationDate(pubDateTime, options.locale),
    publishedTime: formatPublicationTime(pubDateTime),
    venueAddress: formatAddressLines(jsonData.venue?.venueAddress)
  };
}

function processCourtLists(jsonData: MagistratesPublicListData): void {
  for (const courtList of jsonData.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        session.formattedJudiciaries = formatJudiciaries(session.judiciary ?? []);
        for (const sitting of session.sittings) {
          sitting.time = formatSittingTime(sitting.sittingStart);
          for (const hearing of sitting.hearing) {
            for (const caseItem of hearing.case ?? []) {
              const defendant = (caseItem.party ?? []).find((p) => p.partyRole === "DEFENDANT");
              caseItem.defendant = buildPartyName(defendant);
              caseItem.prosecutingAuthority = findProsecutingAuthority(caseItem.party ?? []);
              caseItem.offences = extractOffenceTitles(defendant);
            }
            for (const application of hearing.application ?? []) {
              const subject = (application.party ?? []).find((p) => p.subject === true);
              application.defendant = buildPartyName(subject);
              application.prosecutingAuthority = findProsecutingAuthority(application.party ?? []);
              application.offences = extractOffenceTitles(subject);
            }
          }
        }
      }
    }
  }
}

function findProsecutingAuthority(parties: PartyData[]): string {
  const authority = parties.find((p) => p.partyRole === "PROSECUTING_AUTHORITY");
  if (!authority) return "";
  if (authority.organisationDetails?.organisationName) return authority.organisationDetails.organisationName;
  if (authority.individualDetails) {
    const { individualForenames, individualSurname } = authority.individualDetails;
    if (individualSurname && individualForenames) return `${individualSurname}, ${individualForenames}`;
    return individualSurname ?? individualForenames ?? "";
  }
  return "";
}

function extractOffenceTitles(party: PartyData | undefined): string[] {
  return (party?.offence ?? []).map((o) => o.offenceTitle ?? "").filter((t) => t.length > 0);
}

function formatJudiciaries(judiciary: { johKnownAs?: string }[]): string {
  return judiciary
    .map((j) => j.johKnownAs ?? "")
    .filter((n) => n.length > 0)
    .join(", ");
}

function formatAddressLines(address: AddressData | undefined): string[] {
  if (!address) return [];
  return [...(address.line ?? []), address.town, address.county, address.postCode].filter((p): p is string => Boolean(p));
}

function formatPublicationDate(isoDateTime: string, locale: string): string {
  const date = new Date(isoDateTime);
  return date.toLocaleDateString(locale === "cy" ? "cy-GB" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London"
  });
}

function formatPublicationTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  const raw = date.toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Europe/London"
  });
  return raw.replace(/:00\s*(am|pm)$/i, (_, suffix: string) => suffix.toLowerCase()).replace(/\s+(am|pm)$/i, (_, suffix: string) => suffix.toLowerCase());
}

function formatSittingTime(sittingStart: string | undefined): string {
  if (!sittingStart) return "";
  return formatPublicationTime(sittingStart);
}
