import { formatDisplayDate } from "@hmcts/list-types-common";
import { getLocationById } from "@hmcts/location";

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

interface CaseData {
  blockStart?: string;
  defendantName?: string;
  dateOfBirth?: string;
  address?: string;
  age?: string;
  informant?: string;
  caseNumber?: string;
  offenceCode?: string;
  offenceTitle?: string;
  offenceSummary?: string;
}

interface HearingData {
  hearingType?: string;
  case?: CaseData[];
}

interface SittingData {
  sittingStart?: string;
  hearing: HearingData[];
  time?: string;
}

interface SessionData {
  judiciary?: { johKnownAs?: string; isPresiding?: boolean }[];
  sittings: SittingData[];
  formattedJudiciaries?: string;
}

interface CourtRoomData {
  courtRoomName: string;
  session: SessionData[];
}

export interface MagistratesAdultCourtListData {
  document: { publicationDate: string };
  venue?: { venueAddress?: AddressData };
  courtLists: { courtHouse: { courtRoom: CourtRoomData[] } }[];
}

export async function renderMagistratesAdultCourtList(jsonData: MagistratesAdultCourtListData, options: RenderOptions) {
  const header = await buildHeader(jsonData, options);
  processCourtLists(jsonData);
  return { header, openJustice: null, listData: jsonData };
}

async function buildHeader(jsonData: MagistratesAdultCourtListData, options: RenderOptions) {
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

function processCourtLists(jsonData: MagistratesAdultCourtListData): void {
  for (const courtList of jsonData.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        session.formattedJudiciaries = formatJudiciaries(session.judiciary ?? []);
        for (const sitting of session.sittings) {
          sitting.time = formatSittingTime(sitting.sittingStart);
        }
      }
    }
  }
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
  return raw.replace(/\s+(am|pm)$/i, (_, suffix: string) => suffix.toLowerCase());
}

function formatSittingTime(sittingStart: string | undefined): string {
  if (!sittingStart) return "";
  return formatPublicationTime(sittingStart);
}
