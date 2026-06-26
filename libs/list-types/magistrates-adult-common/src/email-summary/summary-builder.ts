import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { MagistratesAdultListData, MagistratesParty } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

function formatDefendantName(party: MagistratesParty): string {
  const details = party.individualDetails;
  if (!details) return party.organisationDetails?.organisationName?.trim() || "";
  return [details.individualForenames, details.individualMiddleName, details.individualSurname]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part && part.length > 0))
    .join(" ");
}

export function extractCaseSummary(jsonData: MagistratesAdultListData): CaseSummary[] {
  const summaries: CaseSummary[] = [];

  for (const courtList of jsonData.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        for (const sitting of session.sittings) {
          for (const hearing of sitting.hearing) {
            for (const caseItem of hearing.case) {
              const defendants = (caseItem.party ?? []).filter((party) => party.partyRole === "DEFENDANT");
              const defendantName = defendants
                .map(formatDefendantName)
                .filter((name) => name.length > 0)
                .join(", ");
              const offenceTitles = defendants
                .flatMap((party) => party.offence ?? [])
                .map((offence) => offence.offenceTitle?.trim())
                .filter((title): title is string => Boolean(title && title.length > 0));

              const fields: CaseSummary = [];
              if (defendantName) {
                fields.push({ label: "Defendant", value: defendantName });
              }
              fields.push({ label: "Case number", value: caseItem.caseNumber || "" });
              if (offenceTitles.length > 0) {
                fields.push({ label: "Offence", value: offenceTitles.join(", ") });
              }

              summaries.push(fields);
            }
          }
        }
      }
    }
  }

  return summaries;
}
