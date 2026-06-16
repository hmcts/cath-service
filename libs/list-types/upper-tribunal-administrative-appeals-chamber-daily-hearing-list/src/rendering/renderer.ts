import { formatDisplayDate, formatLastUpdatedDateTime } from "@hmcts/list-types-common";
import type { UtaacHearing, UtaacHearingList } from "../models/types.js";

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
  hearings: UtaacHearing[];
}

export function renderUtaacDailyHearingListData(hearingList: UtaacHearingList, options: RenderOptions): RenderedData {
  const hearingDate = formatDisplayDate(options.contentDate, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);

  const renderedHearings = hearingList.map((hearing) => ({
    time: hearing.time,
    appellant: hearing.appellant,
    caseReferenceNumber: hearing.caseReferenceNumber,
    judges: hearing.judges,
    members: hearing.members,
    modeOfHearing: hearing.modeOfHearing,
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
