import { type CaseSummary, formatCaseSummaryForEmail } from "@hmcts/list-types-common";
import type { MagistratesAdultCourtListData } from "../rendering/renderer.js";

export { formatCaseSummaryForEmail };

export function extractCaseSummary(jsonData: MagistratesAdultCourtListData): CaseSummary[] {
  const summaries: CaseSummary[] = [];

  for (const courtList of jsonData.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        for (const sitting of session.sittings) {
          for (const hearing of sitting.hearing) {
            for (const caseItem of hearing.case ?? []) {
              summaries.push([
                { label: "Defendant Name", value: caseItem.defendantName ?? "" },
                { label: "Informant", value: caseItem.informant ?? "" },
                { label: "Case Number", value: caseItem.caseNumber ?? "" },
                { label: "Offence Title", value: caseItem.offenceTitle ?? "" }
              ]);
            }
          }
        }
      }
    }
  }

  return summaries;
}
