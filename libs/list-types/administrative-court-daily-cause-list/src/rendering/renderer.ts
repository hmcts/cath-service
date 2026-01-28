import { formatDisplayDate, formatLastUpdatedDateTime, normalizeTime } from "@hmcts/list-types-common";
import type { AdministrativeCourtHearing, AdministrativeCourtHearingList } from "../models/types.js";

export interface RenderOptions {
  locale: string;
  listTypeId: number;
  listTitle: string;
  displayFrom: Date;
  displayTo: Date;
  lastReceivedDate: string;
}

export interface RenderedData {
  header: {
    listTitle: string;
    listDate: string;
    lastUpdatedDate: string;
    lastUpdatedTime: string;
  };
  hearings: AdministrativeCourtHearing[];
}

export function renderAdminCourt(hearingList: AdministrativeCourtHearingList, options: RenderOptions): RenderedData {
  const listDate = formatDisplayDate(options.displayFrom, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);

  const renderedHearings = hearingList.map((hearing) => ({
    venue: hearing.venue,
    judge: hearing.judge,
    time: normalizeTime(hearing.time),
    caseNumber: hearing.caseNumber,
    caseDetails: hearing.caseDetails,
    hearingType: hearing.hearingType,
    additionalInformation: hearing.additionalInformation || ""
  }));

  return {
    header: {
      listTitle: options.listTitle,
      listDate,
      lastUpdatedDate,
      lastUpdatedTime
    },
    hearings: renderedHearings
  };
}
