import { type CaseSummary, extractPddaSittingsSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { CrownFirmListData } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

export function extractCaseSummary(jsonData: CrownFirmListData): CaseSummary[] {
  return extractPddaSittingsSummary(jsonData.FirmList.CourtLists);
}
