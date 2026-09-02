import { type CaseSummary, extractPddaSittingsSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { CrownDailyListData } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

export function extractCaseSummary(jsonData: CrownDailyListData): CaseSummary[] {
  return extractPddaSittingsSummary(jsonData.DailyList.CourtLists);
}
