import { formatDisplayDate } from "@hmcts/list-types-common";
import { getLocationById } from "@hmcts/location";

export interface RenderOptions {
  locationId: string;
  contentDate: Date;
  locale: string;
}

interface DefendantAddress {
  line1?: string;
  line2?: string;
  line3?: string;
  line4?: string;
  line5?: string;
  pcode?: string;
}

interface OffenceData {
  code: string;
  title: string;
  cy_title?: string;
  sum: string;
  cy_sum?: string;
}

interface RawCaseData {
  caseno: string;
  def_name: string;
  def_dob?: string;
  def_age?: number;
  def_addr?: DefendantAddress;
  inf?: string;
  offences?: { offence?: OffenceData[] };
}

interface RawBlockData {
  bstart: string;
  cases?: { case?: RawCaseData[] };
}

interface RawSessionData {
  lja: string;
  court: string;
  room: number;
  sstart: string;
  blocks?: { block?: RawBlockData[] };
}

export interface MagistratesAdultCourtListData {
  document: {
    info?: { start_time?: string };
    data?: {
      job?: {
        printdate?: string;
        sessions?: { session?: RawSessionData[] };
      };
    };
  };
}

export async function renderMagistratesAdultCourtList(jsonData: MagistratesAdultCourtListData, options: RenderOptions) {
  const header = await buildHeader(jsonData, options);
  const listData = transformToListData(jsonData, options.locale);
  return { header, openJustice: null, listData };
}

async function buildHeader(jsonData: MagistratesAdultCourtListData, options: RenderOptions) {
  const location = await getLocationById(Number.parseInt(options.locationId, 10));
  const locationName = options.locale === "cy" && location?.welshName ? location.welshName : (location?.name ?? "");
  const printdate = jsonData.document.data?.job?.printdate ?? "";
  const startTime = jsonData.document.info?.start_time;

  return {
    locationName,
    contentDate: formatDisplayDate(options.contentDate, options.locale),
    publishedDate: formatPrintDate(printdate, options.locale),
    publishedTime: formatStartTime(startTime),
    venueAddress: [] as string[]
  };
}

function transformToListData(jsonData: MagistratesAdultCourtListData, locale: string) {
  const sessions = jsonData.document.data?.job?.sessions?.session ?? [];

  const courtListMap = new Map<string, { courtHouse: { courtRoom: CourtRoomOutput[] } }>();

  for (const session of sessions) {
    const key = `${session.lja}||${session.court}`;
    if (!courtListMap.has(key)) {
      courtListMap.set(key, { courtHouse: { courtRoom: [] } });
    }
    const courtList = courtListMap.get(key)!;
    courtList.courtHouse.courtRoom.push(transformSession(session, locale));
  }

  return { courtLists: Array.from(courtListMap.values()) };
}

interface CourtRoomOutput {
  courtRoomName: string;
  session: SessionOutput[];
}

interface SessionOutput {
  formattedJudiciaries: string;
  courtRoom: number;
  lja: string;
  sessionStart: string;
  sittings: SittingOutput[];
}

interface SittingOutput {
  hearing: HearingOutput[];
}

interface HearingOutput {
  case: CaseOutput[];
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

function transformSession(session: RawSessionData, locale: string): CourtRoomOutput {
  const sittings = (session.blocks?.block ?? []).map((block) => transformBlock(block, locale));

  return {
    courtRoomName: session.court,
    session: [{ formattedJudiciaries: "", courtRoom: session.room, lja: session.lja, sessionStart: formatStartTime(session.sstart), sittings }]
  };
}

function transformBlock(block: RawBlockData, locale: string): SittingOutput {
  const cases = (block.cases?.case ?? []).map((rawCase) => transformCase(rawCase, formatStartTime(block.bstart), locale));
  return { hearing: [{ case: cases }] };
}

function transformCase(rawCase: RawCaseData, blockStart: string, locale: string): CaseOutput {
  const offences = rawCase.offences?.offence ?? [];
  const baseCase = {
    blockStart,
    caseNumber: rawCase.caseno,
    defendantName: rawCase.def_name,
    dateOfBirth: rawCase.def_dob ?? "",
    age: rawCase.def_age !== undefined ? String(rawCase.def_age) : "",
    address: formatAddress(rawCase.def_addr),
    informant: rawCase.inf ?? ""
  };

  if (offences.length === 0) {
    return { ...baseCase, offenceCode: "", offenceTitle: "", offenceSummary: "" };
  }

  return {
    ...baseCase,
    offenceCode: offences.map((o) => o.code).join(", "),
    offenceTitle: offences.map((o) => (locale === "cy" && o.cy_title ? o.cy_title : o.title)).join(", "),
    offenceSummary: offences.map((o) => (locale === "cy" && o.cy_sum ? o.cy_sum : o.sum)).join(", ")
  };
}

function formatAddress(addr: DefendantAddress | undefined): string {
  if (!addr) return "";
  return [addr.line1, addr.line2, addr.line3, addr.line4, addr.line5, addr.pcode].filter(Boolean).join(", ");
}

function formatPrintDate(printdate: string, locale: string): string {
  const parts = printdate.split("/");
  if (parts.length !== 3) return printdate;
  const [day, month, year] = parts;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString(locale === "cy" ? "cy-GB" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function formatStartTime(startTime: string | undefined): string {
  if (!startTime) return "";
  const [hoursStr, minutesStr] = startTime.split(":");
  const hours = Number(hoursStr);
  const suffix = hours < 12 ? "am" : "pm";
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutesStr}${suffix}`;
}
