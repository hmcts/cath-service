import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { MagistratesCase, MagistratesListData, Party } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

function createPartyDetails(party: Party): string {
  if (party.individualDetails) {
    const details = party.individualDetails;
    const parts: string[] = [];

    if (details.title) parts.push(details.title);
    if (details.individualForenames) parts.push(details.individualForenames);
    if (details.individualMiddleName) parts.push(details.individualMiddleName);
    if (details.individualSurname) parts.push(details.individualSurname);

    return parts.join(" ");
  }

  if (party.organisationDetails?.organisationName) {
    return party.organisationDetails.organisationName;
  }

  return "";
}

function extractDefendantName(caseItem: MagistratesCase): string {
  let defendantName = "";

  for (const party of caseItem.party ?? []) {
    if (party.partyRole === "DEFENDANT" || party.partyRole === "ACCUSED") {
      const details = createPartyDetails(party).trim();
      if (details) {
        if (defendantName.length > 0) defendantName += ", ";
        defendantName += details;
      }
    }
  }

  return defendantName.trim();
}

export function extractCaseSummary(jsonData: MagistratesListData): CaseSummary[] {
  const summaries: CaseSummary[] = [];

  for (const courtList of jsonData.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        for (const sitting of session.sittings) {
          for (const hearing of sitting.hearing) {
            for (const caseItem of hearing.case) {
              const defendantName = extractDefendantName(caseItem);
              const fields: CaseSummary = [];

              if (defendantName) {
                fields.push({ label: "Defendant name", value: defendantName });
              }
              fields.push({ label: "Case number", value: caseItem.caseNumber || "" });
              fields.push({ label: "Offence", value: caseItem.offence || "" });
              fields.push({ label: "Plea", value: caseItem.plea || "" });
              fields.push({ label: "Results", value: caseItem.results || "" });

              summaries.push(fields);
            }
          }
        }
      }
    }
  }

  return summaries;
}
