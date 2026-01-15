import { DateTime } from "luxon";
import type { CourtOfAppealCivilData, FutureJudgment, StandardHearing } from "../models/types.js";

export interface RenderOptions {
  locale: string;
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

export interface RenderedFutureJudgment extends RenderedHearing {
  date: string; // Formatted date
}

export interface RenderedData {
  header: {
    listTitle: string;
    listDate: string;
    lastUpdatedDate: string;
    lastUpdatedTime: string;
  };
  dailyHearings: RenderedHearing[];
  futureJudgments: RenderedFutureJudgment[];
}

function formatDisplayDate(date: Date, locale: string): string {
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

function normalizeTime(time: string): string {
  return time.replace(".", ":");
}

function formatJudgmentDate(ddMMyyyyDate: string, locale: string): string {
  const [day, month, year] = ddMMyyyyDate.split("/");
  const date = new Date(Number.parseInt(year, 10), Number.parseInt(month, 10) - 1, Number.parseInt(day, 10));

  const localeCode = locale === "cy" ? "cy-GB" : "en-GB";
  return date.toLocaleDateString(localeCode, {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function renderStandardHearings(hearings: StandardHearing[]): RenderedHearing[] {
  return hearings.map((hearing) => ({
    venue: hearing.venue,
    judge: hearing.judge,
    time: normalizeTime(hearing.time),
    caseNumber: hearing.caseNumber,
    caseDetails: hearing.caseDetails,
    hearingType: hearing.hearingType,
    additionalInformation: hearing.additionalInformation || ""
  }));
}

function renderFutureJudgments(judgments: FutureJudgment[], locale: string): RenderedFutureJudgment[] {
  return judgments.map((judgment) => ({
    date: formatJudgmentDate(judgment.date, locale),
    venue: judgment.venue,
    judge: judgment.judge,
    time: normalizeTime(judgment.time),
    caseNumber: judgment.caseNumber,
    caseDetails: judgment.caseDetails,
    hearingType: judgment.hearingType,
    additionalInformation: judgment.additionalInformation || ""
  }));
}

export function renderCourtOfAppealCivil(data: CourtOfAppealCivilData, options: RenderOptions): RenderedData {
  const listDate = formatDisplayDate(options.displayFrom, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);

  return {
    header: {
      listTitle: options.locale === "cy" ? "Rhestr Achosion Dyddiol y Llys Apêl (Adran Sifil)" : "Court of Appeal (Civil Division) Daily Cause List",
      listDate,
      lastUpdatedDate,
      lastUpdatedTime
    },
    dailyHearings: renderStandardHearings(data.dailyHearings),
    futureJudgments: renderFutureJudgments(data.futureJudgments, options.locale)
  };
}
