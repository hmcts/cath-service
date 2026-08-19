import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { IacDailyList } from "../models/types.js";
import { extractCaseParties } from "../rendering/renderer.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

// Mirrors pip-data-management's IacDailyListSummaryData: one entry per case with the
// Appellant/Applicant (claimant), Prosecuting authority, and Case reference fields.
export function extractCaseSummary(jsonData: IacDailyList): CaseSummary[] {
  const summaries: CaseSummary[] = [];

  for (const courtList of jsonData.courtLists ?? []) {
    for (const courtRoom of courtList.courtHouse.courtRoom ?? []) {
      for (const session of courtRoom.session ?? []) {
        for (const sitting of session.sittings ?? []) {
          for (const hearing of sitting.hearing ?? []) {
            for (const caseItem of hearing.case ?? []) {
              const parties = extractCaseParties(caseItem.party);
              summaries.push([
                { label: "Appellant/Applicant", value: parties.appellant },
                { label: "Prosecuting authority", value: parties.prosecutingAuthority },
                { label: "Case reference", value: caseItem.caseNumber ?? "" }
              ]);
            }
          }
        }
      }
    }
  }

  return summaries;
}
