import { formatDisplayDate } from "@hmcts/list-types-common";
import { getLocationById } from "@hmcts/location";

export interface RenderOptions {
  locationId: string;
  contentDate: Date;
  locale: string;
}

interface RawAddress {
  line1?: string;
  line2?: string;
  line3?: string;
  line4?: string;
  line5?: string;
  pcode?: string;
}

interface RawOffence {
  code?: string;
  title?: string;
  cy_title?: string;
  sum?: string;
  cy_sum?: string;
}

interface RawCase {
  caseno?: string;
  def_name?: string;
  def_dob?: string;
  def_age?: number;
  def_addr?: RawAddress;
  inf?: string;
  offences?: { offence?: RawOffence[] };
}

interface RawBlock {
  bstart?: string;
  cases?: { case?: RawCase[] };
}

interface RawSessionData {
  lja?: string;
  court?: string;
  room?: number;
  sstart?: string;
  blocks?: { block?: RawBlock[] };
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

interface SessionOutput {
  court: string;
  lja: string;
  room: number;
  sessionStart: string;
  cases: CaseOutput[];
}

export async function renderMagistratesAdultCourtList(jsonData: MagistratesAdultCourtListData, options: RenderOptions) {
  const header = await buildHeader(jsonData, options);
  const listData = transformToListData(jsonData, options.locale);
  return { header, openJustice: null, listData };
}

async function buildHeader(jsonData: MagistratesAdultCourtListData, options: RenderOptions) {
  const location = await getLocationById(Number.parseInt(options.locationId, 10));
  const locationName = options.locale === "cy" && location?.welshName ? location.welshName : (location?.name ?? "");
  const printdate = jsonData.document?.data?.job?.printdate;
  const startTime = jsonData.document?.info?.start_time;
  const publishedDate = formatPrintDate(printdate, options.locale);
  const publishedTime = formatPublishedTime(startTime);

  return {
    locationName,
    contentDate: formatDisplayDate(options.contentDate, options.locale),
    publishedDate,
    publishedTime,
    venueAddress: [] as string[]
  };
}

function formatPrintDate(printdate: string | undefined, locale: string): string {
  if (!printdate) return "";
  const [day, month, year] = printdate.split("/");
  if (!day || !month || !year) return "";
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale === "cy" ? "cy-GB" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function formatStartTime(hhmm: string): string {
  const [hoursStr, minutesStr] = hhmm.split(":");
  const hours = Number.parseInt(hoursStr, 10);
  const minutes = minutesStr ?? "00";
  if (Number.isNaN(hours)) return hhmm;
  const suffix = hours < 12 ? "am" : "pm";
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  if (minutes === "00") return `${hours12}${suffix}`;
  return `${hours12}:${minutes}${suffix}`;
}

function formatPublishedTime(hhmmss: string | undefined): string {
  if (!hhmmss) return "";
  const parts = hhmmss.split(":");
  const hhmm = `${parts[0]}:${parts[1] ?? "00"}`;
  return formatStartTime(hhmm);
}

function formatAddress(addr: RawAddress | undefined): string {
  if (!addr) return "";
  const parts = [addr.line1, addr.line2, addr.line3, addr.line4, addr.line5, addr.pcode];
  return parts.filter((p): p is string => !!p && p.trim().length > 0).join(", ");
}

function transformToListData(jsonData: MagistratesAdultCourtListData, locale: string): { sessions: SessionOutput[] } {
  const rawSessions = jsonData.document?.data?.job?.sessions?.session ?? [];
  const sessions = rawSessions.map((session) => transformSession(session, locale));
  return { sessions };
}

function transformSession(session: RawSessionData, locale: string): SessionOutput {
  const blocks = session.blocks?.block ?? [];
  const cases = blocks.flatMap((block) => transformBlock(block, locale));
  return {
    court: session.court ?? "",
    lja: session.lja ?? "",
    room: session.room ?? 0,
    sessionStart: session.sstart ? formatStartTime(session.sstart) : "",
    cases
  };
}

function transformBlock(block: RawBlock, locale: string): CaseOutput[] {
  const blockStart = block.bstart ? formatStartTime(block.bstart) : "";
  const cases = block.cases?.case ?? [];
  return cases.map((c) => transformCase(c, blockStart, locale));
}

function transformCase(c: RawCase, blockStart: string, locale: string): CaseOutput {
  const offences = c.offences?.offence ?? [];
  const offenceCode = offences
    .map((o) => o.code ?? "")
    .filter(Boolean)
    .join(", ");
  const offenceTitle = offences
    .map((o) => (locale === "cy" && o.cy_title ? o.cy_title : (o.title ?? "")))
    .filter(Boolean)
    .join(", ");
  const offenceSummary = offences
    .map((o) => (locale === "cy" && o.cy_sum ? o.cy_sum : (o.sum ?? "")))
    .filter(Boolean)
    .join(", ");

  return {
    blockStart,
    caseNumber: c.caseno ?? "",
    defendantName: c.def_name ?? "",
    dateOfBirth: c.def_dob ?? "",
    age: c.def_age !== undefined ? String(c.def_age) : "",
    address: formatAddress(c.def_addr),
    informant: c.inf ?? "",
    offenceCode,
    offenceTitle,
    offenceSummary
  };
}
