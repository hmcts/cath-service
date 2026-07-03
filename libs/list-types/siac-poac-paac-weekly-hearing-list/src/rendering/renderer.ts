import { formatDdMmYyyyDate, formatDisplayDate, formatLastUpdatedDateTime } from "@hmcts/list-types-common";
import type { SiacPoacPaacHearing, SiacPoacPaacHearingList } from "../models/types.js";

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
  hearings: SiacPoacPaacHearing[];
}

export function renderSiacPoacPaacData(hearingList: SiacPoacPaacHearingList, options: RenderOptions): RenderedData {
  const weekCommencingDate = formatDisplayDate(options.contentDate, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);

  const renderedHearings = hearingList.map((hearing) => ({
    date: formatDdMmYyyyDate(hearing.date, options.locale),
    time: hearing.time,
    appellant: hearing.appellant,
    caseReferenceNumber: hearing.caseReferenceNumber,
    hearingType: hearing.hearingType,
    courtroom: hearing.courtroom,
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
