import { formatDdMmYyyyDate, formatDisplayDate, formatLastUpdatedDateTime, normalizeTime } from "@hmcts/list-types-common";
import type { CourtOfAppealCivilData, FutureJudgment, StandardHearing } from "../models/types.js";

export interface RenderOptions {
  locale: string;
  displayFrom: Date;
  displayTo: Date;
  lastReceivedDate: string;
}

export interface RenderedData {
  header: {
    listTitle: string;
    listDate: string;
    lastUpdatedDate: string;
    lastUpdatedTime: string;
  };
  dailyHearings: StandardHearing[];
  futureJudgments: FutureJudgment[];
}

function renderStandardHearings(hearings: StandardHearing[]): StandardHearing[] {
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

function renderFutureJudgments(judgments: FutureJudgment[], locale: string): FutureJudgment[] {
  return judgments.map((judgment) => ({
    date: formatDdMmYyyyDate(judgment.date, locale),
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
