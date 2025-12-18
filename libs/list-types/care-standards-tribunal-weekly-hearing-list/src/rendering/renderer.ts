import { DateTime } from "luxon";
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

function formatDisplayDate(date: Date, locale: string): string {
  const localeCode = locale === "cy" ? "cy-GB" : "en-GB";
  return date.toLocaleDateString(localeCode, {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
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

function formatHearingDate(ddMMyyyyDate: string, locale: string): string {
  const [day, month, year] = ddMMyyyyDate.split("/");
  const date = new Date(Number.parseInt(year, 10), Number.parseInt(month, 10) - 1, Number.parseInt(day, 10));

  const localeCode = locale === "cy" ? "cy-GB" : "en-GB";
  return date.toLocaleDateString(localeCode, {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

export function renderCareStandardsTribunalData(hearingList: CareStandardsTribunalHearingList, options: RenderOptions): RenderedData {
  const listTitle = "Care Standards Tribunal Weekly Hearing List";
  const duration = `List for week commencing ${formatDisplayDate(options.displayFrom, options.locale)}`;
  const lastUpdated = `Last updated ${formatLastUpdated(options.lastReceivedDate, options.locale)}`;

  const renderedHearings = hearingList.map((hearing) => ({
    date: formatHearingDate(hearing.date, options.locale),
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
