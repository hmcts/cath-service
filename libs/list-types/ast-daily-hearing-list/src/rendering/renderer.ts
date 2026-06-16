import { formatDisplayDate, formatLastUpdatedDateTime } from "@hmcts/list-types-common";
import type { AstDailyHearingList } from "../models/types.js";

export interface RenderOptions {
  locale: string;
  contentDate: Date;
  lastReceivedDate: string;
  listTitle: string;
}

export interface RenderedData {
  header: {
    listTitle: string;
    contentDate: string;
    lastUpdatedDate: string;
    lastUpdatedTime: string;
  };
  hearings: Array<{
    appellant: string;
    appealReferenceNumber: string;
    caseType: string;
    hearingType: string;
    hearingTime: string;
    additionalInformation: string;
  }>;
}

export function renderAstDailyHearingListData(hearingList: AstDailyHearingList, options: RenderOptions): RenderedData {
  const contentDate = formatDisplayDate(options.contentDate, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);

  const renderedHearings = hearingList.map((hearing) => ({
    appellant: hearing.appellant,
    appealReferenceNumber: hearing.appealReferenceNumber,
    caseType: hearing.caseType,
    hearingType: hearing.hearingType,
    hearingTime: hearing.hearingTime,
    additionalInformation: hearing.additionalInformation
  }));

  return {
    header: {
      listTitle: options.listTitle,
      contentDate,
      lastUpdatedDate,
      lastUpdatedTime
    },
    hearings: renderedHearings
  };
}
