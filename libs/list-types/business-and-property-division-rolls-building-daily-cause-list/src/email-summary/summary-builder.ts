import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { BusinessAndPropertyRollsData, ChdKbHearing } from "../models/types.js";
import { SECTIONS } from "../sections.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

function mapHearingToSummary(hearing: ChdKbHearing): CaseSummary {
  return [
    { label: "Time", value: hearing.time || "" },
    { label: "Case number", value: hearing.caseNumber || "" },
    { label: "Case name", value: hearing.caseName || "" }
  ];
}

export function extractCaseSummary(jsonData: BusinessAndPropertyRollsData): CaseSummary[] {
  const summaries: CaseSummary[] = [];

  for (const section of SECTIONS) {
    for (const hearing of jsonData[section.key] ?? []) {
      summaries.push(mapHearingToSummary(hearing));
    }
  }

  return summaries;
}
