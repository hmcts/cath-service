import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { ChdKbHearing, ChdKbHearingList } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

function mapHearingToSummary(hearing: ChdKbHearing): CaseSummary {
  return [
    { label: "Time", value: hearing.time || "" },
    { label: "Case number", value: hearing.caseNumber || "" },
    { label: "Case name", value: hearing.caseName || "" }
  ];
}

export function extractCaseSummary(jsonData: ChdKbHearingList): CaseSummary[] {
  return jsonData.map(mapHearingToSummary);
}
