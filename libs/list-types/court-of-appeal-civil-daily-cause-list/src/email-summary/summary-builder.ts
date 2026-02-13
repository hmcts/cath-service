import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { CourtOfAppealCivilData, StandardHearing } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

function mapHearingToSummary(hearing: StandardHearing): CaseSummary {
  return [
    { label: "Time", value: hearing.time || "" },
    { label: "Case number", value: hearing.caseNumber || "" },
    { label: "Case details", value: hearing.caseDetails || "" }
  ];
}

export function extractCaseSummary(jsonData: CourtOfAppealCivilData): CaseSummary[] {
  const summaries: CaseSummary[] = [];

  for (const hearing of jsonData.dailyHearings) {
    summaries.push(mapHearingToSummary(hearing));
  }

  for (const judgment of jsonData.futureJudgments) {
    summaries.push(mapHearingToSummary(judgment));
  }

  return summaries;
}
