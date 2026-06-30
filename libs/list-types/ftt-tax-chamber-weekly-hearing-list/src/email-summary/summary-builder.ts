import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { FttTaxChamberHearingList } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

export function extractCaseSummary(jsonData: FttTaxChamberHearingList): CaseSummary[] {
  return jsonData.map((hearing) => [
    { label: "Date", value: hearing.date || "" },
    { label: "Hearing Time", value: hearing.hearingTime || "" },
    { label: "Case Reference Number", value: hearing.caseReferenceNumber || "" }
  ]);
}
