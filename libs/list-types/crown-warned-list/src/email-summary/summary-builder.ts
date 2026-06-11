import { type CaseSummary, createPartyDetails, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { CrownWarnedCase, CrownWarnedListData, Party } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

function extractDefendantNames(caseItem: CrownWarnedCase): string {
  const names: string[] = [];
  for (const party of caseItem.party ?? []) {
    if (party.partyRole === "DEFENDANT" || party.partyRole === "DEFENDANT_IN_CUSTODY") {
      const details = createPartyDetails(party as Party).trim();
      if (details) names.push(details);
    }
  }
  return names.join(", ");
}

export function extractCaseSummary(jsonData: CrownWarnedListData): CaseSummary[] {
  const summaries: CaseSummary[] = [];

  for (const courtList of jsonData.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        for (const sitting of session.sittings) {
          for (const hearing of sitting.hearing) {
            for (const caseItem of hearing.case) {
              const defendants = extractDefendantNames(caseItem);
              const fields: CaseSummary = [];

              if (defendants) {
                fields.push({ label: "Defendant", value: defendants });
              }
              fields.push({ label: "Case reference", value: caseItem.caseNumber || "" });
              fields.push({ label: "Prosecuting authority", value: caseItem.prosecutingAuthority || "" });

              summaries.push(fields);
            }
          }
        }
      }
    }
  }

  return summaries;
}
