import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { UtiacJrManchesterHearingList } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

export function extractCaseSummary(jsonData: UtiacJrManchesterHearingList): CaseSummary[] {
  return jsonData.map((hearing) => [
    { label: "Hearing time", value: hearing.hearingTime || "" },
    { label: "Case reference number", value: hearing.caseReferenceNumber || "" }
  ]);
}
