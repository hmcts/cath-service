import { formatDdMmYyyyDate } from "@hmcts/list-types-common";
import { DateTime } from "luxon";
import type { PhtHearing, PhtHearingList } from "../models/types.js";

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
  hearings: PhtHearing[];
}

function formatDate(date: Date, locale: string): string {
  const localeCode = locale === "cy" ? "cy-GB" : "en-GB";
  return date.toLocaleDateString(localeCode, {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function formatLastUpdatedDateTime(isoDateTime: string, locale: string): { date: string; time: string } {
  const dt = DateTime.fromISO(isoDateTime).setZone("Europe/London").setLocale(locale);

  const date = dt.toFormat("d MMMM yyyy");

  const hours = dt.hour;
  const minutes = dt.minute;
  const period = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 || 12;

  const minuteStr = minutes > 0 ? `:${minutes.toString().padStart(2, "0")}` : "";
  const time = `${hour12}${minuteStr}${period}`;

  return { date, time };
}

export function renderPhtData(hearingList: PhtHearingList, options: RenderOptions): RenderedData {
  const weekCommencingDate = formatDate(options.contentDate, options.locale);
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
