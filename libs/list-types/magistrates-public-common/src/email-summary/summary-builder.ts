import { extractParty } from "@hmcts/daily-cause-list-common";
import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { MagistratesPublicListData } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

export function extractCaseSummary(jsonData: MagistratesPublicListData): CaseSummary[] {
  const summaries: CaseSummary[] = [];

  for (const courtList of jsonData.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        for (const sitting of session.sittings) {
          for (const hearing of sitting.hearing) {
            for (const caseItem of hearing.case) {
              const defendant = extractParty(caseItem, "DEFENDANT");
              const fields: CaseSummary = [];

              if (defendant) {
                fields.push({ label: "Defendant", value: defendant });
              }
              fields.push({ label: "Case number", value: caseItem.caseNumber || "" });

              summaries.push(fields);
            }
          }
        }
      }
    }
  }

  return summaries;
}
