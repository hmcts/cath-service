// Use the definition of the English translations to ensure the Welsh has the same structure
type Translations = typeof import("./en.js").content;

export const content: Translations = {
  common: {
    email: "E-bost",
    telephone: "Ffôn",
    post: "Post",
    findOutAboutCallCharges: "Darganfyddwch am gostau galwadau",
    callChargesLink: "https://www.gov.uk/call-charges"
  },
  serviceConfig: {
    contactEmail: "enquiries@hmcts.gsi.gov.uk",
    contactPhone: "0300 303 0642",
    openingHours: "Dydd Llun i ddydd Gwener, 10am i 6pm",
    postalAddress: ["CTSC (Canolfan Wasanaeth Llysoedd a Thribiwnlysoedd)", "C/o Gwasanaethau Digidol GLlTEF", "PO Box 13226", "Harlow", "CM20 9UG"],
    contactFormUrl: "https://contact-us.form.service.justice.gov.uk/"
  }
};
