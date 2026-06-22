import { formatDisplayDate, formatLastUpdatedDateTime } from "@hmcts/list-types-common";
import type { UtiacJrCardiffHearing, UtiacJrCardiffHearingList } from "../models/types.js";

export interface RenderOptions {
  locale: string;
  courtName: string;
  displayFrom: Date;
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
  hearings: UtiacJrCardiffHearing[];
}

export function renderUtiacJrCardiffDailyHearingListData(hearingList: UtiacJrCardiffHearingList, options: RenderOptions): RenderedData {
  const listForDate = formatDisplayDate(options.displayFrom, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);

  const renderedHearings = hearingList.map((hearing) => ({
    venue: hearing.venue,
    judges: hearing.judges,
    hearingTime: hearing.hearingTime,
    caseReferenceNumber: hearing.caseReferenceNumber,
    caseTitle: hearing.caseTitle,
    hearingType: hearing.hearingType,
    additionalInformation: hearing.additionalInformation
  }));

  return {
    header: {
      listTitle: options.listTitle,
      listForDate,
      lastUpdatedDate,
      lastUpdatedTime
    },
    hearings: renderedHearings
  };
}
