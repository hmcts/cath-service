import type { CauseListCase, Party } from "../models/types.js";

export function createPartyDetails(party: Party): string {
  if (party.individualDetails) {
    const details = party.individualDetails;
    const parts: string[] = [];

    if (details.title) parts.push(details.title);
    if (details.individualForenames) parts.push(details.individualForenames);
    if (details.individualMiddleName) parts.push(details.individualMiddleName);
    if (details.individualSurname) parts.push(details.individualSurname);

    return parts.filter((n) => n.length > 0).join(" ");
  }

  if (party.organisationDetails?.organisationName) {
    return party.organisationDetails.organisationName;
  }

  return "";
}

export function extractParty(caseItem: CauseListCase, targetRole: string): string {
  let result = "";

  caseItem.party?.forEach((party) => {
    const details = createPartyDetails(party).trim();

    if (!details) return;

    if (party.partyRole === targetRole) {
      if (result.length > 0) result += ", ";
      result += details;
    }
  });

  return result.replace(/,\s*$/, "").trim();
}
