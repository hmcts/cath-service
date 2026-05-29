import { formatDisplayDate, formatLastUpdatedDateTime } from "@hmcts/list-types-common";
import type { UtccHearing, UtccHearingList } from "../models/types.js";

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
    hearingDate: string;
    lastUpdatedDate: string;
    lastUpdatedTime: string;
  };
  hearings: UtccHearing[];
}

export function renderUtccDailyHearingListData(hearingList: UtccHearingList, options: RenderOptions): RenderedData {
  const hearingDate = formatDisplayDate(options.contentDate, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);

  const renderedHearings = hearingList.map((hearing) => ({
    time: hearing.time,
    caseReference: hearing.caseReference,
    caseName: hearing.caseName,
    judges: hearing.judges,
    members: hearing.members,
    hearingType: hearing.hearingType,
    venue: hearing.venue,
    additionalInformation: hearing.additionalInformation
  }));

  return {
    header: {
      listTitle: options.listTitle,
      hearingDate,
      lastUpdatedDate,
      lastUpdatedTime
    },
    hearings: renderedHearings
  };
}
