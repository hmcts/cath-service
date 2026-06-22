import { formatDisplayDate, formatLastUpdatedDateTime } from "@hmcts/list-types-common";
import type { UtiacStatutoryAppealHearing, UtiacStatutoryAppealHearingList } from "../models/types.js";

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
  hearings: UtiacStatutoryAppealHearing[];
}

export function renderUtiacStatutoryAppealDailyHearingListData(hearingList: UtiacStatutoryAppealHearingList, options: RenderOptions): RenderedData {
  const listForDate = formatDisplayDate(options.displayFrom, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);

  const renderedHearings = hearingList.map((hearing) => ({
    hearingTime: hearing.hearingTime,
    appellant: hearing.appellant,
    representative: hearing.representative,
    appealReferenceNumber: hearing.appealReferenceNumber,
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
