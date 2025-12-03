export default {
  pageTitle: "Mae'r cais wedi'i wrthod",
  tableHeaders: {
    name: "Enw",
    email: "E-bost",
    employer: "Cyflogwr",
    dateApplied: "Dyddiad gwneud cais"
  },
  reasonsHeading: "Rhesymau Dros Wrthod",
  viewLinkText: "Gweld",
  reasons: {
    notAccredited: [
      "<strong>Nid yw'r ymgeisydd yn aelod achrededig o'r cyfryngau.</strong>",
      'Gallwch fewngofnodi gyda chyfrif MyHMCTS presennol. Neu gallwch gofrestru eich sefydliad yn <a href="https://www.gov.uk/guidance/myhmcts-online-case-management-for-legal-professionals" class="govuk-link" target="_blank" rel="noopener noreferrer">https://www.gov.uk/guidance/myhmcts-online-case-management-for-legal-professionals</a> (yn agor mewn ffenestr newydd)'
    ],
    invalidId: ["<strong>Mae'r ID a ddarparwyd wedi dod i ben neu nid yw'n ID i'r Wasg.</strong>", "Darparwch ID Gwasg dilys."],
    detailsMismatch: ["<strong>Nid yw'r manylion a ddarparwyd yn cyd-fynd.</strong>", "Nid yw'r enw, cyfeiriad e-bost ac ID y Wasg yn cyd-fynd â'i gilydd."]
  },
  whatHappensNextHeading: "Beth sy'n digwydd nesaf",
  whatHappensNextText:
    "Bydd yr ymgeisydd {applicantEmail} nawr yn cael e-bost i'w hysbysu pam na ellir bwrw ymlaen â'i gais a'i wahodd i ail-wneud cais unwaith y bydd y mater/materion wedi'u cywiro.",
  returnLink: "Dychwelyd i'r rhestr ceisiadau",
  errorMessages: {
    notFound: "Cais heb ei ddarganfod.",
    loadFailed: "Methu llwytho manylion y cais. Ceisiwch eto'n hwyrach."
  }
};
