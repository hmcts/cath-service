import { DateTime } from "luxon";
import type { StandardHearingList } from "../models/types.js";

export interface RenderOptions {
  locale: string;
  listTypeId: number;
  listTitle: string;
  displayFrom: Date;
  displayTo: Date;
  lastReceivedDate: string;
}

export interface RenderedHearing {
  venue: string;
  judge: string;
  time: string;
  caseNumber: string;
  caseDetails: string;
  hearingType: string;
  additionalInformation: string;
}

export interface RenderedData {
  header: {
    listTitle: string;
    listDate: string;
    lastUpdated: string;
  };
  hearings: RenderedHearing[];
}

function formatDisplayDate(date: Date, locale: string): string {
  const localeCode = locale === "cy" ? "cy-GB" : "en-GB";
  return date.toLocaleDateString(localeCode, {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function normalizeTime(time: string): string {
  return time.replace(".", ":");
}

function formatLastUpdated(isoDateTime: string, locale: string): string {
  const dt = DateTime.fromISO(isoDateTime).setZone("Europe/London").setLocale(locale);

  const dateStr = dt.toFormat("d MMMM yyyy");

  const hours = dt.hour;
  const minutes = dt.minute;
  const period = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 || 12;

  const minuteStr = minutes > 0 ? `:${minutes.toString().padStart(2, "0")}` : "";
  const timeStr = `${hour12}${minuteStr}${period}`;

  return `${dateStr} at ${timeStr}`;
}

export function renderStandardDailyCauseList(hearingList: StandardHearingList, options: RenderOptions): RenderedData {
  const listDate = `List for ${formatDisplayDate(options.displayFrom, options.locale)}`;
  const lastUpdated = `Last updated ${formatLastUpdated(options.lastReceivedDate, options.locale)}`;

  const renderedHearings = hearingList.map((hearing) => ({
    venue: hearing.venue,
    judge: hearing.judge,
    time: normalizeTime(hearing.time),
    caseNumber: hearing.caseNumber,
    caseDetails: hearing.caseDetails,
    hearingType: hearing.hearingType,
    additionalInformation: hearing.additionalInformation || ""
  }));

  return {
    header: {
      listTitle: options.listTitle,
      listDate,
      lastUpdated
    },
    hearings: renderedHearings
  };
}
