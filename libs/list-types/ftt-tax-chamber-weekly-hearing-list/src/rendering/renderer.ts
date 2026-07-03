import { formatDdMmYyyyDate, formatDisplayDate, formatLastUpdatedDateTime } from "@hmcts/list-types-common";
import type { FttTaxChamberHearing, FttTaxChamberHearingList } from "../models/types.js";

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
  hearings: FttTaxChamberHearing[];
}

export function renderFttTaxChamberData(hearingList: FttTaxChamberHearingList, options: RenderOptions): RenderedData {
  const weekCommencingDate = formatDisplayDate(options.contentDate, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);

  const renderedHearings = hearingList.map((hearing) => ({
    date: formatDdMmYyyyDate(hearing.date, options.locale),
    hearingTime: hearing.hearingTime,
    caseName: hearing.caseName,
    caseReferenceNumber: hearing.caseReferenceNumber,
    judges: hearing.judges,
    members: hearing.members,
    venuePlatform: hearing.venuePlatform
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
