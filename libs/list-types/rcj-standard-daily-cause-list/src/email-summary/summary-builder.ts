import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { StandardHearingList } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

export function extractCaseSummary(jsonData: StandardHearingList): CaseSummary[] {
  return jsonData.map((hearing) => [
    { label: "Time", value: hearing.time || "N/A" },
    { label: "Case number", value: hearing.caseNumber || "N/A" },
    { label: "Case details", value: hearing.caseDetails || "N/A" }
  ]);
}
