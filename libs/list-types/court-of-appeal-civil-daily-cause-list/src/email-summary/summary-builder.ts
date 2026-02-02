import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { CourtOfAppealCivilData, StandardHearing } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

function mapHearingToSummary(hearing: StandardHearing): CaseSummary {
  return [
    { label: "Time", value: hearing.time || "N/A" },
    { label: "Case number", value: hearing.caseNumber || "N/A" },
    { label: "Case details", value: hearing.caseDetails || "N/A" }
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
