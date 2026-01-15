import { formatDdMmYyyyDate, formatDisplayDate, formatLastUpdatedDateTime } from "@hmcts/list-types-common";
import type { CareStandardsTribunalHearingList } from "../models/types.js";

export interface RenderOptions {
  locale: string;
  courtName: string;
  displayFrom: Date;
  displayTo: Date;
  lastReceivedDate: string;
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
    duration: string;
    lastUpdated: string;
  };
  hearings: RenderedHearing[];
}

function formatLastUpdated(isoDateTime: string, locale: string): string {
  const { date, time } = formatLastUpdatedDateTime(isoDateTime, locale);
  return `${date} at ${time}`;
}

export function renderCareStandardsTribunalData(hearingList: CareStandardsTribunalHearingList, options: RenderOptions): RenderedData {
  const listTitle = "Care Standards Tribunal Weekly Hearing List";
  const duration = `List for week commencing ${formatDisplayDate(options.displayFrom, options.locale)}`;
  const lastUpdated = `Last updated ${formatLastUpdated(options.lastReceivedDate, options.locale)}`;

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
      listTitle,
      duration,
      lastUpdated
    },
    hearings: renderedHearings
  };
}
