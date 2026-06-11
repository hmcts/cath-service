import { type CaseSummary, createPartyDetails, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { CrownFirmCase, CrownFirmListData, Party } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

function extractDefendantNames(caseItem: CrownFirmCase): string {
  const names: string[] = [];
  for (const party of caseItem.party ?? []) {
    if (party.partyRole === "DEFENDANT") {
      const details = createPartyDetails(party as Party).trim();
      if (details) names.push(details);
    }
  }
  return names.join(", ");
}

export function extractCaseSummary(jsonData: CrownFirmListData): CaseSummary[] {
  const summaries: CaseSummary[] = [];

  for (const courtList of jsonData.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        for (const sitting of session.sittings) {
          for (const hearing of sitting.hearing) {
            for (const caseItem of hearing.case) {
              const defendants = extractDefendantNames(caseItem);
              const hearingType = hearing.hearingDescription || hearing.hearingType || "";
              const fields: CaseSummary = [];

              if (defendants) {
                fields.push({ label: "Defendant", value: defendants });
              }
              fields.push({ label: "Case number", value: caseItem.caseNumber || "" });
              fields.push({ label: "Prosecuting authority", value: caseItem.prosecutingAuthority || "" });
              fields.push({ label: "Hearing type", value: hearingType });

              summaries.push(fields);
            }
          }
        }
      }
    }
  }

  return summaries;
}
