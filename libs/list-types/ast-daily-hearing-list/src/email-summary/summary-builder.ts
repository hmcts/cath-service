import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { AstDailyHearingList } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

export function extractCaseSummary(jsonData: AstDailyHearingList): CaseSummary[] {
  return jsonData.map((hearing) => [
    { label: "Appellant", value: hearing.appellant || "" },
    { label: "Appeal reference number", value: hearing.appealReferenceNumber || "" },
    { label: "Hearing time", value: hearing.hearingTime || "" }
  ]);
}
