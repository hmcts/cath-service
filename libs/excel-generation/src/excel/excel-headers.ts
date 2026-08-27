// Excel column headers for SJP lists, in English and Welsh.
// Welsh sourced from legacy pip-data-management templates
// (sjpPressList.json / sjpPublicList.json "tableHeaders").

type Locale = "en" | "cy";

const SJP_PUBLIC_LIST_HEADERS = {
  en: {
    name: "Name",
    postcode: "Postcode",
    offence: "Offence",
    prosecutor: "Prosecutor"
  },
  cy: {
    name: "Enw",
    postcode: "Cod post",
    offence: "Trosedd",
    prosecutor: "Erlynydd"
  }
};

const SJP_PRESS_LIST_HEADERS = {
  en: {
    address: "Address",
    caseUrn: "Case URN",
    dateOfBirth: "Date of Birth",
    defendantName: "Defendant Name",
    prosecutorName: "Prosecutor Name",
    offenceRestriction: (n: number) => `Offence ${n} Press Restriction Requested`,
    offenceTitle: (n: number) => `Offence ${n} Title`,
    offenceWording: (n: number) => `Offence ${n} Wording`
  },
  cy: {
    address: "Cyfeiriad",
    caseUrn: "Cyfeirnod yr achos",
    dateOfBirth: "Dyddiad geni",
    defendantName: "Enw'r diffynnydd",
    prosecutorName: "Enw'r erlynydd",
    offenceRestriction: (n: number) => `Gofynnwyd am gyfyngiad i'r wasg parthed y drosedd ${n}`,
    offenceTitle: (n: number) => `Teitl y drosedd ${n}`,
    offenceWording: (n: number) => `Geiriad y drosedd ${n}`
  }
};

export function getSjpPublicListHeaders(locale: Locale) {
  return locale === "cy" ? SJP_PUBLIC_LIST_HEADERS.cy : SJP_PUBLIC_LIST_HEADERS.en;
}

export function getSjpPressListHeaders(locale: Locale) {
  return locale === "cy" ? SJP_PRESS_LIST_HEADERS.cy : SJP_PRESS_LIST_HEADERS.en;
}
