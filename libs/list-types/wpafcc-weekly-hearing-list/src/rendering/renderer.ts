import { formatDdMmYyyyDate, formatDisplayDate, formatLastUpdatedDateTime } from "@hmcts/list-types-common";
import type { WpafccWeeklyHearing, WpafccWeeklyHearingList } from "../models/types.js";

export interface RenderOptions {
  locale: string;
  courtName: string;
  contentDate: Date;
  lastReceivedDate: string;
  listTitle: string;
}

export interface RenderedData {
  header: {
    listTitle: string;
    weekCommencingDate: string;
    lastUpdatedDate: string;
    lastUpdatedTime: string;
  };
  hearings: WpafccWeeklyHearing[];
}

export function renderWpafccWeeklyHearingListData(hearingList: WpafccWeeklyHearingList, options: RenderOptions): RenderedData {
  const weekCommencingDate = formatDisplayDate(options.contentDate, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);

  const renderedHearings = hearingList.map((hearing) => ({
    date: formatDdMmYyyyDate(hearing.date, options.locale),
    hearingTime: hearing.hearingTime,
    caseReferenceNumber: hearing.caseReferenceNumber,
    caseName: hearing.caseName,
    panel: hearing.panel,
    modeOfHearing: hearing.modeOfHearing,
    venue: hearing.venue,
    additionalInformation: hearing.additionalInformation
  }));

  return {
    header: {
      listTitle: options.listTitle,
      weekCommencingDate,
      lastUpdatedDate,
      lastUpdatedTime
    },
    hearings: renderedHearings
  };
}
