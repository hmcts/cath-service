import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { AdministrativeCourtHearingList } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

export function extractCaseSummary(jsonData: AdministrativeCourtHearingList): CaseSummary[] {
  return jsonData.map((hearing) => [
    { label: "Time", value: hearing.time || "" },
    { label: "Case number", value: hearing.caseNumber || "" },
    { label: "Hearing type", value: hearing.hearingType || "" },
    { label: "Case details", value: hearing.caseDetails || "" }
  ]);
}
