import { formatDdMmYyyyDate, formatDisplayDate, formatHHMMTime } from "@hmcts/list-types-common";
import { getLocationById } from "@hmcts/location";

export interface RenderOptions {
  locationId: string;
  contentDate: Date;
  locale: string;
}

interface CaseNode {
  caseno?: string;
  def_name?: string;
}

interface BlockNode {
  bstart?: string;
  cases?: { case?: CaseNode[] };
}

interface SessionNode {
  lja?: string;
  court?: string;
  room?: number;
  sstart?: string;
  blocks?: { block?: BlockNode[] };
}

export interface MagistratesPublicAdultCourtListData {
  document?: {
    info?: { start_time?: string };
    data?: {
      job?: {
        printdate?: string;
        sessions?: { session?: SessionNode[] };
      };
    };
  };
}

export interface ProcessedCase {
  blockStartTime: string;
  defendantName: string;
  caseNumber: string;
}

export interface ProcessedSession {
  lja: string;
  courtName: string;
  courtRoom: number | string;
  sessionStartTime: string;
  cases: ProcessedCase[];
}

export interface ListHeader {
  locationName: string;
  contentDate: string;
  publishedDate: string;
  publishedTime: string;
}

export async function renderMagistratesPublicAdultCourtListData(
  jsonData: MagistratesPublicAdultCourtListData,
  options: RenderOptions
): Promise<{ header: ListHeader; listData: ProcessedSession[] }> {
  const header = await buildHeader(jsonData, options);
  const listData = processSessions(jsonData);
  return { header, listData };
}

async function buildHeader(jsonData: MagistratesPublicAdultCourtListData, options: RenderOptions): Promise<ListHeader> {
  const location = await getLocationById(Number.parseInt(options.locationId, 10));
  const locationName = options.locale === "cy" && location?.welshName ? location.welshName : (location?.name ?? "");

  const printdate = jsonData.document?.data?.job?.printdate;
  const startTime = jsonData.document?.info?.start_time;

  const publishedDate = printdate ? formatDdMmYyyyDate(printdate, options.locale) : formatDisplayDate(options.contentDate, options.locale);
  const publishedTime = startTime ? formatHHMMTime(startTime.slice(0, 5)) : "";

  return {
    locationName,
    contentDate: formatDisplayDate(options.contentDate, options.locale),
    publishedDate,
    publishedTime
  };
}

function processSessions(jsonData: MagistratesPublicAdultCourtListData): ProcessedSession[] {
  const sessions = jsonData.document?.data?.job?.sessions?.session ?? [];
  return sessions.map((session) => ({
    lja: session.lja ?? "",
    courtName: session.court ?? "",
    courtRoom: session.room ?? "",
    sessionStartTime: formatHHMMTime(session.sstart ?? ""),
    cases: buildCases(session)
  }));
}

function buildCases(session: SessionNode): ProcessedCase[] {
  const cases: ProcessedCase[] = [];
  for (const block of session.blocks?.block ?? []) {
    for (const caseNode of block.cases?.case ?? []) {
      cases.push({
        blockStartTime: formatHHMMTime(block.bstart ?? ""),
        defendantName: caseNode.def_name ?? "",
        caseNumber: caseNode.caseno ?? ""
      });
    }
  }
  return cases;
}
