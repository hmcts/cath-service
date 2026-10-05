import { formatDdMmYyyyDate, formatDisplayDate, formatLastUpdatedDateTime, normaliseHearing, normaliseHearings } from "@hmcts/list-types-common";
import type { CourtOfAppealCivilData, FutureJudgment, StandardHearing } from "../models/types.js";

export interface RenderOptions {
  locale: string;
  contentDate: Date;
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

export function renderCourtOfAppealCivil(data: CourtOfAppealCivilData, options: RenderOptions): RenderedData {
  const listDate = formatDisplayDate(options.contentDate, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);

  return {
    header: {
      listTitle: options.locale === "cy" ? "Rhestr Achosion Dyddiol y Llys Apêl (Adran Sifil)" : "Court of Appeal (Civil Division) Daily Cause List",
      listDate,
      lastUpdatedDate,
      lastUpdatedTime
    },
    dailyHearings: normaliseHearings(data.dailyHearings),
    futureJudgments: data.futureJudgments.map((judgment) => formatFutureJudgment(judgment, options.locale))
  };
}

export function formatFutureJudgment<T extends FormattableFutureJudgment>(judgment: T, locale: string): T {
  return {
    ...normaliseHearing(judgment),
    date: judgment.date ? formatDdMmYyyyDate(judgment.date, locale) : ""
  };
}

interface FormattableFutureJudgment {
  date?: string;
  time?: string;
  additionalInformation?: string;
}
