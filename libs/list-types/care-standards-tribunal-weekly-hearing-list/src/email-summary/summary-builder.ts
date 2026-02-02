import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { CareStandardsTribunalHearingList } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

export function extractCaseSummary(jsonData: CareStandardsTribunalHearingList): CaseSummary[] {
  return jsonData.map((hearing) => [
    { label: "Date", value: hearing.date || "N/A" },
    { label: "Case name", value: hearing.caseName || "N/A" }
  ]);
}
