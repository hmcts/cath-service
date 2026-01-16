import { formatDdMmYyyyDate, formatDisplayDate, formatLastUpdatedDateTime } from "@hmcts/list-types-common";
import type { CareStandardsTribunalHearingList } from "../models/types.js";

export interface RenderOptions {
  locale: string;
  courtName: string;
  displayFrom: Date;
  displayTo: Date;
  lastReceivedDate: string;
  listTitle: string;
}

export interface RenderedHearing {
  date: string;
  caseName: string;
  hearingLength: string;
  hearingType: string;
  venue: string;
  additionalInformation: string;
}

export interface RenderedData {
  header: {
    listTitle: string;
    weekCommencingDate: string;
    lastUpdatedDate: string;
    lastUpdatedTime: string;
  };
  hearings: RenderedHearing[];
}

export function renderCareStandardsTribunalData(hearingList: CareStandardsTribunalHearingList, options: RenderOptions): RenderedData {
  const weekCommencingDate = formatDisplayDate(options.displayFrom, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);

  const renderedHearings = hearingList.map((hearing) => ({
    date: formatDdMmYyyyDate(hearing.date, options.locale),
    caseName: hearing.caseName,
    hearingLength: hearing.hearingLength,
    hearingType: hearing.hearingType,
    venue: hearing.venue,
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
