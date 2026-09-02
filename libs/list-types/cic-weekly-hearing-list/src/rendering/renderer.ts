import { formatDdMmYyyyDate, formatDisplayDate, formatLastUpdatedDateTime } from "@hmcts/list-types-common";
import type { CicWeeklyHearingList } from "../models/types.js";

export interface RenderOptions {
  locale: string;
  contentDate: Date;
  lastReceivedDate: string;
  listTitle: string;
}

export interface RenderedCicHearing {
  date: string;
  hearingTime: string;
  caseReferenceNumber: string;
  caseName: string;
  venuePlatform: string;
  judges: string;
  members: string;
  additionalInformation: string;
}

export interface RenderedData {
  header: {
    listTitle: string;
    weekCommencingDate: string;
    lastUpdatedDate: string;
    lastUpdatedTime: string;
  };
  hearings: RenderedCicHearing[];
}

export function renderCicWeeklyHearingListData(hearingList: CicWeeklyHearingList, options: RenderOptions): RenderedData {
  const weekCommencingDate = formatDisplayDate(options.contentDate, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);

  return {
    header: {
      listTitle: options.listTitle,
      weekCommencingDate,
      lastUpdatedDate,
      lastUpdatedTime
    },
    hearings: hearingList.map((hearing) => ({
      date: formatDdMmYyyyDate(hearing.date, options.locale),
      hearingTime: hearing.hearingTime,
      caseReferenceNumber: hearing.caseReferenceNumber,
      caseName: hearing.caseName,
      venuePlatform: hearing["venue/platform"],
      judges: hearing.judges,
      members: hearing.members,
      additionalInformation: hearing.additionalInformation
    }))
  };
}
