import { formatDisplayDate, formatLastUpdatedDateTime } from "@hmcts/list-types-common";
import type { UtiacJrLondonHearing, UtiacJrLondonHearingList } from "../models/types.js";
import type { RenderedLondonData, RenderOptions } from "./renderer.js";

export function renderUtiacJrLondonDailyHearingListData(hearingList: UtiacJrLondonHearingList, options: RenderOptions): RenderedLondonData {
  const listForDate = formatDisplayDate(options.contentDate, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);

  const renderedHearings: UtiacJrLondonHearing[] = hearingList.map((hearing) => ({
    hearingTime: hearing.hearingTime,
    caseTitle: hearing.caseTitle,
    representative: hearing.representative,
    caseReferenceNumber: hearing.caseReferenceNumber,
    judges: hearing.judges,
    hearingType: hearing.hearingType,
    location: hearing.location,
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
