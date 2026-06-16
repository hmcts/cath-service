import { formatDisplayDate, formatLastUpdatedDateTime, normaliseHearings } from "@hmcts/list-types-common";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { LondonAdminCourtData, StandardHearing } from "../models/types.js";

export interface RenderOptions {
  locale: string;
  contentDate: Date;
  lastReceivedDate: string;
}

export interface RenderedData {
  header: {
    listTitle: string;
    listDate: string;
    lastUpdatedDate: string;
    lastUpdatedTime: string;
  };
  mainHearings: StandardHearing[];
  planningCourt: StandardHearing[];
}

export function renderLondonAdminCourt(data: LondonAdminCourtData, options: RenderOptions): RenderedData {
  const listDate = formatDisplayDate(options.contentDate, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);
  const t = options.locale === "cy" ? cy : en;

  return {
    header: {
      listTitle: t.pageTitle,
      listDate,
      lastUpdatedDate,
      lastUpdatedTime
    },
    mainHearings: normaliseHearings(data.mainHearings),
    planningCourt: normaliseHearings(data.planningCourt)
  };
}
