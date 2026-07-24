import type { CauseListCase, Party } from "@hmcts/list-types-common";

// ET lists show party names as initials (e.g. "Mr J. Smith") rather than full forenames,
// mirroring pip-frontend's createIndividualDetails(..., initialised = true).
export function formatEtPartyName(party: Party): string {
  if (party.individualDetails) {
    const details = party.individualDetails;
    const title = details.title?.trim() ?? "";
    const forenameInitial = details.individualForenames?.trim().charAt(0) ?? "";
    const surname = details.individualSurname?.trim() ?? "";

    return `${title}${title.length > 0 ? " " : ""}${forenameInitial}${forenameInitial.length > 0 ? ". " : ""}${surname}`.trim();
  }

  if (party.organisationDetails?.organisationName) {
    return party.organisationDetails.organisationName;
  }

  return "";
}

// Joins all parties matching the given role, formatted as ET initialised names.
export function extractEtParty(caseItem: CauseListCase, targetRole: string): string {
  const names: string[] = [];

  for (const party of caseItem.party ?? []) {
    if (party.partyRole !== targetRole) continue;

    const name = formatEtPartyName(party).trim();
    if (name) names.push(name);
  }

  return names.join(", ");
}
