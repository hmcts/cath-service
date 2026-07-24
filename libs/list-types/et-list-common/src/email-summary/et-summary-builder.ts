import type { CaseSummary, CauseListData } from "@hmcts/list-types-common";
import { extractEtParty } from "../party-formatting.js";

// Employment Tribunal daily and fortnightly press lists share the same email summary fields:
// Claimant (applicant), Respondent, Case reference, and Hearing type — one entry per case.
export function extractEtCaseSummary(jsonData: CauseListData): CaseSummary[] {
  const summaries: CaseSummary[] = [];

  for (const courtList of jsonData.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        for (const sitting of session.sittings) {
          for (const hearing of sitting.hearing) {
            for (const caseItem of hearing.case) {
              summaries.push([
                { label: "Claimant", value: extractEtParty(caseItem, "APPLICANT_PETITIONER") },
                { label: "Respondent", value: extractEtParty(caseItem, "RESPONDENT") },
                { label: "Case reference", value: caseItem.caseNumber || "" },
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
