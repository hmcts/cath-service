import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { CauseListData } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

/**
 * Builds an ungrouped list of case summaries for the COP Daily Cause List email.
 * Ports CopDailyCauseListSummaryData.java: one entry per case with four fields —
 * Case reference, Case details, Case type and Hearing type.
 */
export function extractCaseSummary(jsonData: CauseListData): CaseSummary[] {
  const summaries: CaseSummary[] = [];

  for (const courtList of jsonData.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        for (const sitting of session.sittings) {
          for (const hearing of sitting.hearing) {
            for (const caseItem of hearing.case) {
              summaries.push([
                { label: "Case reference", value: caseItem.caseNumber || "" },
                { label: "Case details", value: caseItem.caseName || "" },
                { label: "Case type", value: caseItem.caseType || "" },
                { label: "Hearing type", value: hearing.hearingType || "" }
              ]);
            }
          }
        }
      }
    }
  }

  return summaries;
}
