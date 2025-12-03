export default {
  pageTitle: "A ydych yn siŵr eich bod am wrthod y cais hwn?",
  subheading: "Manylion yr ymgeisydd",
  reasonsHeading: "Rhesymau dros wrthod",
  tableHeaders: {
    name: "Enw",
    email: "E-bost",
    employer: "Cyflogwr",
    dateApplied: "Dyddiad gwneud cais",
    proofOfId: "Prawf o ID"
  },
  reasons: {
    notAccredited: [
      "Nid yw'r ymgeisydd yn aelod achrededig o'r cyfryngau.",
      "Gallwch fewngofnodi gyda chyfrif MyHMCTS presennol. Neu gallwch gofrestru eich sefydliad yn https://www.gov.uk/guidance/myhmcts-online-case-management-for-legal-professionals (yn agor mewn ffenestr newydd)"
    ],
    invalidId: ["Mae'r ID a ddarparwyd wedi dod i ben neu nid yw'n ID i'r Wasg.", "Darparwch ID Gwasg dilys."],
    detailsMismatch: ["Nid yw'r manylion a ddarparwyd yn cyd-fynd.", "Nid yw'r enw, cyfeiriad e-bost ac ID y Wasg yn cyd-fynd â'i gilydd."]
  },
  radioLegend: "Cadarnhau gwrthod",
  radioOptions: {
    yes: "Ie",
    no: "Na"
  },
  continueButton: "Parhau",
  errorMessages: {
    selectOption: "Dewiswch ie neu na cyn parhau.",
    notFound: "Cais heb ei ddarganfod.",
    loadFailed: "Methu llwytho manylion yr ymgeisydd. Ceisiwch eto'n hwyrach."
  }
};
