export const SJP_PUBLIC_LIST_HEADERS = {
  name: "Name",
  postcode: "Postcode",
  offence: "Offence",
  prosecutor: "Prosecutor"
};

export const SJP_PRESS_LIST_HEADERS = {
  address: "Address",
  caseUrn: "Case URN",
  dateOfBirth: "Date of Birth",
  defendantName: "Defendant Name",
  prosecutorName: "Prosecutor Name",
  offenceRestriction: (n: number) => `Offence ${n} Press Restriction Requested`,
  offenceTitle: (n: number) => `Offence ${n} Title`,
  offenceWording: (n: number) => `Offence ${n} Wording`
};
