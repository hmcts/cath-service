import { formatDisplayDate, formatLastUpdatedDateTime } from "@hmcts/list-types-common";
import type { SscsDailyHearing, SscsDailyHearingList } from "../models/types.js";

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
    listDate: string;
    lastUpdatedDate: string;
    lastUpdatedTime: string;
  };
  hearings: SscsDailyHearing[];
}

export function renderSscsDailyHearingListData(hearingList: SscsDailyHearingList, options: RenderOptions): RenderedData {
  const listDate = formatDisplayDate(options.contentDate, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);

  return {
    header: {
      listTitle: options.listTitle,
      listDate,
      lastUpdatedDate,
      lastUpdatedTime
    },
    hearings: hearingList
  };
}
