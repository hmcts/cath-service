import { formatDisplayDate, formatLastUpdatedDateTime, normalizeTime } from "@hmcts/list-types-common";
import type { LondonAdminCourtData, StandardHearing } from "../models/types.js";
import { cy } from "../pages/cy.js";
import { en } from "../pages/en.js";

export interface RenderOptions {
  locale: string;
  displayFrom: Date;
  displayTo: Date;
  lastReceivedDate: string;
}

export interface RenderedHearing {
  venue: string;
  judge: string;
  time: string;
  caseNumber: string;
  caseDetails: string;
  hearingType: string;
  additionalInformation: string;
}

export interface RenderedData {
  header: {
    listTitle: string;
    listDate: string;
    lastUpdatedDate: string;
    lastUpdatedTime: string;
  };
  mainHearings: RenderedHearing[];
  planningCourt: RenderedHearing[];
}

function renderHearings(hearings: StandardHearing[]): RenderedHearing[] {
  return hearings.map((hearing) => ({
    venue: hearing.venue,
    judge: hearing.judge,
    time: normalizeTime(hearing.time),
    caseNumber: hearing.caseNumber,
    caseDetails: hearing.caseDetails,
    hearingType: hearing.hearingType,
    additionalInformation: hearing.additionalInformation || ""
  }));
}

export function renderLondonAdminCourt(data: LondonAdminCourtData, options: RenderOptions): RenderedData {
  const listDate = formatDisplayDate(options.displayFrom, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);
  const t = options.locale === "cy" ? cy : en;

  return {
    header: {
      listTitle: t.pageTitle,
      listDate,
      lastUpdatedDate,
      lastUpdatedTime
    },
    mainHearings: renderHearings(data.mainHearings),
    planningCourt: renderHearings(data.planningCourt)
  };
}
