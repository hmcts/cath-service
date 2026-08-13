import { formatDisplayDate, formatLastUpdatedDateTime } from "@hmcts/list-types-common";
import type { ChdKbHearing, ChdKbHearingList } from "../models/types.js";

export interface ChdKbRenderOptions {
  locale: string;
  contentDate: Date;
  lastReceivedDate: string;
  listTitle: string;
}

export interface ChdKbRenderedData {
  header: {
    listTitle: string;
    listDate: string;
    lastUpdatedDate: string;
    lastUpdatedTime: string;
  };
  hearings: ChdKbHearing[];
}

export function renderChdKbHearingList(hearingList: ChdKbHearingList, options: ChdKbRenderOptions): ChdKbRenderedData {
  const listDate = formatDisplayDate(options.contentDate, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);

  return {
    header: {
      listTitle: options.listTitle,
      listDate,
      lastUpdatedDate,
      lastUpdatedTime
    },
    hearings: hearingList.map((hearing) => ({ ...hearing }))
  };
}
