interface PartyNameData {
  individualDetails?: { individualForenames?: string; individualSurname?: string };
  organisationDetails?: { organisationName?: string };
}

export function buildPartyName(party: PartyNameData | undefined): string {
  if (!party) return "";
  if (party.organisationDetails?.organisationName) return party.organisationDetails.organisationName;
  if (party.individualDetails) {
    const { individualForenames, individualSurname } = party.individualDetails;
    if (individualSurname && individualForenames) return `${individualSurname}, ${individualForenames}`;
    return individualSurname ?? individualForenames ?? "";
  }
  return "";
}
