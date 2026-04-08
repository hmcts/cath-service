import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { LondonAdminCourtData, StandardHearing } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

function mapHearingToSummary(hearing: StandardHearing): CaseSummary {
  return [
    { label: "Time", value: hearing.time || "" },
    { label: "Case number", value: hearing.caseNumber || "" },
    { label: "Case details", value: hearing.caseDetails || "" }
  ];
}

export function extractCaseSummary(jsonData: LondonAdminCourtData): CaseSummary[] {
  const summaries: CaseSummary[] = [];

  for (const hearing of jsonData.mainHearings) {
    summaries.push(mapHearingToSummary(hearing));
  }

  for (const hearing of jsonData.planningCourt) {
    summaries.push(mapHearingToSummary(hearing));
  }

  return summaries;
}
