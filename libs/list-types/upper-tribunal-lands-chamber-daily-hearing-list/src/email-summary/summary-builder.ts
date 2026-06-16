import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { UtlcHearingList } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

export function extractCaseSummary(jsonData: UtlcHearingList): CaseSummary[] {
  return jsonData.map((hearing) => [
    { label: "Time", value: hearing.time || "" },
    { label: "Case Reference Number", value: hearing.caseReferenceNumber || "" },
    { label: "Case Name", value: hearing.caseName || "" }
  ]);
}
