export const cy = {
  pageTitle: "Mae'r cais wedi cael ei wrthod",
  tableHeaders: {
    name: "Enw",
    email: "E-bost",
    employer: "Cyflogwr",
    dateApplied: "Dyddiad ymgeisio"
  },
  reasonsHeading: "Rhesymau dros Wrthod",
  viewLinkText: "Gweld",
  reasons: {
    notAccredited: [
      "<strong>Nid yw'r ymgeisydd yn aelod achrededig o'r cyfryngau.</strong>",
      'Gallwch fewngofnodi gyda chyfrif MyHMCTS presennol. Neu gallwch gofrestru eich sefydliad yn <a href="https://www.gov.uk/guidance/myhmcts-online-case-management-for-legal-professionals" class="govuk-link" target="_blank" rel="noopener noreferrer">https://www.gov.uk/guidance/myhmcts-online-case-management-for-legal-professionals</a> (yn agor mewn ffenestr newydd)'
    ],
    invalidId: ["<strong>Mae'r ID a ddarparwyd wedi dod i ben neu nid yw'n ID Wasg.</strong>", "Darparwch ID Wasg dilys."],
    detailsMismatch: ["<strong>Nid yw'r manylion a ddarparwyd yn cyd-fynd.</strong>", "Nid yw'r enw, cyfeiriad e-bost ac ID Wasg yn cyd-fynd â'i gilydd."]
  },
  whatHappensNextHeading: "Beth sy'n digwydd nesaf",
  whatHappensNextText:
    "Bydd yr ymgeisydd {applicantEmail} bellach yn cael e-bost i'w hysbysu pam na ellir bwrw ymlaen â'u cais a'u gwahodd i ailymgeisio unwaith y bydd y mater(ion) wedi'u cywiro.",
  returnLink: "Dychwelyd i'r rhestr ceisiadau",
  errorMessages: {
    notFound: "Heb ddod o hyd i'r cais.",
    loadFailed: "Methu llwytho manylion y cais. Rhowch gynnig arall arni yn nes ymlaen."
  }
};
