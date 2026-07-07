import { formatDisplayDate } from "@hmcts/list-types-common";
import { getLocationById } from "@hmcts/location";

export interface RenderOptions {
  locationId: string;
  contentDate: Date;
  locale: string;
}

interface VenueAddress {
  line?: string[];
  town?: string;
  county?: string;
  postCode?: string;
}

interface Judiciary {
  johKnownAs?: string;
}

interface IndividualDetails {
  individualForenames?: string;
  individualSurname?: string;
  dateOfBirth?: string;
  age?: string;
  address?: VenueAddress;
}

interface OrganisationDetails {
  organisationName?: string;
}

interface Offence {
  offenceTitle?: string;
  offenceCode?: string;
  offenceSummary?: string;
}

interface Party {
  partyRole?: string;
  individualDetails?: IndividualDetails;
  organisationDetails?: OrganisationDetails;
  offence?: Offence[];
  subject?: boolean;
}

interface Case {
  caseUrn?: string;
  party?: Party[];
  reportingRestriction?: boolean;
}

interface Hearing {
  hearingType?: string;
  case?: Case[];
}

interface Sitting {
  sittingStart?: string;
  hearing?: Hearing[];
}

interface Session {
  judiciary?: Judiciary[];
  sittings?: Sitting[];
}

interface CourtRoom {
  courtRoomName?: string;
  session?: Session[];
}

interface CourtHouse {
  courtHouseName?: string;
  courtRoom?: CourtRoom[];
}

interface CourtList {
  courtHouse: CourtHouse;
}

interface VenueDetails {
  venueAddress?: VenueAddress;
}

export interface MagistratesAdultCourtListData {
  document: {
    publicationDate?: string;
  };
  venue?: VenueDetails;
  courtLists?: CourtList[];
}

export async function renderMagistratesAdultCourtList(jsonData: MagistratesAdultCourtListData, options: RenderOptions) {
  const header = await buildHeader(jsonData, options);
  const listData = transformToListData(jsonData, options.locale);
  return { header, openJustice: null, listData };
}

async function buildHeader(jsonData: MagistratesAdultCourtListData, options: RenderOptions) {
  const location = await getLocationById(Number.parseInt(options.locationId, 10));
  const locationName = options.locale === "cy" && location?.welshName ? location.welshName : (location?.name ?? "");
  const pubDateTime = jsonData.document.publicationDate;
  const { publishedDate, publishedTime } = formatPublicationDateTime(pubDateTime, options.locale);
  const venueAddress = formatVenueAddress(jsonData.venue?.venueAddress);

  return {
    locationName,
    contentDate: formatDisplayDate(options.contentDate, options.locale),
    publishedDate,
    publishedTime,
    venueAddress
  };
}

function formatPublicationDateTime(pubDateTime: string | undefined, locale: string): { publishedDate: string; publishedTime: string } {
  if (!pubDateTime) return { publishedDate: "", publishedTime: "" };
  const date = new Date(pubDateTime);
  if (Number.isNaN(date.getTime())) return { publishedDate: "", publishedTime: "" };
  const publishedDate = date.toLocaleDateString(locale === "cy" ? "cy-GB" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const publishedTime = `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
  return { publishedDate, publishedTime };
}

function formatVenueAddress(addr: VenueAddress | undefined): string[] {
  if (!addr) return [];
  const lines = [...(addr.line ?? []), addr.town, addr.county, addr.postCode];
  return lines.filter((line): line is string => !!line && line.trim().length > 0);
}

interface CaseOutput {
  blockStart: string;
  caseNumber: string;
  defendantName: string;
  dateOfBirth: string;
  age: string;
  address: string;
  informant: string;
  offenceCode: string;
  offenceTitle: string;
  offenceSummary: string;
}

interface HearingOutput {
  case: CaseOutput[];
}

interface SittingOutput {
  hearing: HearingOutput[];
}

interface SessionOutput {
  formattedJudiciaries: string;
  sittings: SittingOutput[];
}

interface CourtRoomOutput {
  courtRoomName: string;
  session: SessionOutput[];
}

interface CourtListOutput {
  courtHouse: {
    courtRoom: CourtRoomOutput[];
  };
}

function transformToListData(jsonData: MagistratesAdultCourtListData, locale: string): { courtLists: CourtListOutput[] } {
  const courtLists = (jsonData.courtLists ?? []).map((courtList) => transformCourtList(courtList, locale));
  return { courtLists };
}

function transformCourtList(courtList: CourtList, locale: string): CourtListOutput {
  const courtRooms = (courtList.courtHouse.courtRoom ?? []).map((room) => transformCourtRoom(room, locale));
  return { courtHouse: { courtRoom: courtRooms } };
}

function transformCourtRoom(courtRoom: CourtRoom, locale: string): CourtRoomOutput {
  const sessions = (courtRoom.session ?? []).map((session) => transformSession(session, locale));
  return { courtRoomName: courtRoom.courtRoomName ?? "", session: sessions };
}

function transformSession(session: Session, locale: string): SessionOutput {
  const formattedJudiciaries = (session.judiciary ?? [])
    .map((j) => j.johKnownAs ?? "")
    .filter(Boolean)
    .join(", ");
  const sittings = (session.sittings ?? []).map((sitting) => transformSitting(sitting, locale));
  return { formattedJudiciaries, sittings };
}

function transformSitting(sitting: Sitting, locale: string): SittingOutput {
  const blockStart = formatSittingStart(sitting.sittingStart, locale);
  const hearings = (sitting.hearing ?? []).map((hearing) => transformHearing(hearing, blockStart, locale));
  return { hearing: hearings };
}

function transformHearing(hearing: Hearing, blockStart: string, locale: string): HearingOutput {
  const cases = (hearing.case ?? []).map((c) => transformCase(c, blockStart, locale));
  return { case: cases };
}

function transformCase(c: Case, blockStart: string, locale: string): CaseOutput {
  const parties = c.party ?? [];
  const defendantParty = parties.find((p) => p.partyRole === "DEFENDANT");
  const prosecutingParty = parties.find((p) => p.partyRole === "PROSECUTING_AUTHORITY");

  const defendantName = formatIndividualName(defendantParty?.individualDetails);
  const informant = prosecutingParty?.organisationDetails?.organisationName ?? formatIndividualName(prosecutingParty?.individualDetails);

  const offences = defendantParty?.offence ?? [];
  const offenceTitle = offences
    .map((o) => o.offenceTitle ?? "")
    .filter(Boolean)
    .join(", ");

  return {
    blockStart,
    caseNumber: c.caseUrn ?? "",
    defendantName,
    dateOfBirth: defendantParty?.individualDetails?.dateOfBirth ?? "",
    age: defendantParty?.individualDetails?.age ?? "",
    address: formatIndividualAddress(defendantParty?.individualDetails?.address),
    informant,
    offenceCode: "",
    offenceTitle,
    offenceSummary: ""
  };
}

function formatIndividualName(details: IndividualDetails | undefined): string {
  if (!details) return "";
  const parts = [details.individualForenames, details.individualSurname].filter(Boolean);
  return parts.join(" ");
}

function formatIndividualAddress(addr: VenueAddress | undefined): string {
  if (!addr) return "";
  const parts = [...(addr.line ?? []), addr.town, addr.county, addr.postCode];
  return parts.filter((p): p is string => !!p && p.trim().length > 0).join(", ");
}

function formatSittingStart(sittingStart: string | undefined, _locale: string): string {
  if (!sittingStart) return "";
  const date = new Date(sittingStart);
  if (Number.isNaN(date.getTime())) return sittingStart;
  const hours = date.getUTCHours();
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const suffix = hours < 12 ? "am" : "pm";
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes}${suffix}`;
}
