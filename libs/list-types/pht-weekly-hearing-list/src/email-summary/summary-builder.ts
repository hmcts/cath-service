import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { PhtHearingList } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

export function extractCaseSummary(jsonData: PhtHearingList): CaseSummary[] {
  return jsonData.map((hearing) => [
    { label: "Date", value: hearing.date || "" },
    { label: "Case name", value: hearing.caseName || "" }
  ]);
}
