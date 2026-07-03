import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { FttLrtHearingList } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

export function extractCaseSummary(jsonData: FttLrtHearingList): CaseSummary[] {
  return jsonData.map((hearing) => [
    { label: "Date", value: hearing.date || "" },
    { label: "Hearing time", value: hearing.hearingTime || "" },
    { label: "Case reference number", value: hearing.caseReferenceNumber || "" }
  ]);
}
