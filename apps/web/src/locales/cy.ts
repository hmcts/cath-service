// Use the definition of the English translations to ensure the Welsh has the same structure
type Translations = typeof import("./en.js").content;

export const content: Translations = {
  welcome: "Croeso i Wasanaeth Monorepo Express",
  serviceName: "Gwrandawiadau llys a thribiwnlys",
  phase: "beta",
  govUk: "GOV.UK",
  back: "Yn ôl",
  navigation: {
    home: "Hafan",
    about: "Amdanom",
    contact: "Cysylltu â ni",
    signIn: "Mewngofnodi"
  },
  footer: {
    cookies: "Cwcis",
    privacyPolicy: "Preifatrwydd",
    accessibility: "Datganiad hygyrchedd",
    termsAndConditions: "Telerau ac amodau",
    contactUs: "Cysylltu"
  },
  language: {
    switch: "English",
    switchPhaseBanner: "English",
    current: "Cymraeg",
    ariaLabel: "Newid iaith i Saesneg"
  },
  feedback: {
    part1: "Mae hwn yn wasanaeth newydd – bydd eich ",
    part2: "adborth",
    part3: " yn ein helpu i'w wella.",
    ariaLabel: "Rhoi adborth am y dudalen hon",
    link: "https://www.smartsurvey.co.uk/s/FBSPI22/?pageurl="
  },
  oglAttribution: {
    text: 'Pan fyddwch yn defnyddio\'r wybodaeth hon o dan yr OGL, dylech gynnwys y briodoliad canlynol: Yn cynnwys gwybodaeth sector cyhoeddus wedi\'i thrwyddedu o dan y <a class="govuk-footer__link" href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/">Drwydded Llywodraeth Agored f3.0</a>',
    personalData:
      'Nid yw\'r <a class="govuk-footer__link" href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/">Drwydded Llywodraeth Agored f3.0</a> yn cwmpasu defnydd o unrhyw ddata personol yn y gwasanaeth Gwrandawiadau llys a thribiwnlys. Mae data personol yn destun deddfau diogelu data perthnasol.'
  },
  common: {
    email: "E-bost",
    telephone: "Ffôn",
    post: "Post",
    warning: "Rhybudd",
    findOutAboutCallCharges: "Darganfyddwch am gostau galwadau",
    callChargesLink: "https://www.gov.uk/call-charges"
  },
  serviceConfig: {
    contactEmail: "enquiries@hmcts.gsi.gov.uk",
    contactPhone: "0300 303 0642",
    openingHours: "Dydd Llun i ddydd Gwener, 10am i 6pm",
    postalAddress: ["CTSC (Canolfan Wasanaeth Llysoedd a Thribiwnlysoedd)", "C/o Gwasanaethau Digidol GLlTEF", "PO Box 13226", "Harlow", "CM20 9UG"],
    dataRetentionPeriod: "90 diwrnod",
    temporaryDataPeriod: "1 mis",
    contactFormUrl: "https://contact-us.form.service.justice.gov.uk/"
  }
};
