import { formatDisplayDate, formatLastUpdatedDateTime } from "@hmcts/list-types-common";
import type { SendDailyHearing, SendDailyHearingList } from "../models/types.js";

export interface RenderOptions {
  locale: string;
  contentDate: Date;
  lastReceivedDate: string;
  listTitle: string;
}

export interface RenderedData {
  header: {
    listTitle: string;
    listForDate: string;
    lastUpdatedDate: string;
    lastUpdatedTime: string;
  };
  hearings: SendDailyHearing[];
}

export function renderSendDailyHearingListData(hearingList: SendDailyHearingList, options: RenderOptions): RenderedData {
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);
  const listForDate = formatDisplayDate(options.contentDate, options.locale);

  return {
    header: {
      listTitle: options.listTitle,
      listForDate,
      lastUpdatedDate,
      lastUpdatedTime
    },
    hearings: hearingList.map((hearing) => ({ ...hearing }))
  };
}
