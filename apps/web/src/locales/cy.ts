// Use the definition of the English translations to ensure the Welsh has the same structure
type Translations = typeof import("./en.js").content;

export const content: Translations = {
  serviceName: "Gwrandawiadau llys a thribiwnlys",
  phase: "beta",
  govUk: "GOV.UK",
  back: "Yn ôl",
  navigation: {
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
    switchPhaseBanner: "English"
  },
  feedback: {
    part1: "Mae hwn yn wasanaeth newydd – bydd eich ",
    part2: "adborth",
    part3: " yn ein helpu i'w wella.",
    ariaLabel: "Rhoi adborth am y dudalen hon",
    link: "https://www.smartsurvey.co.uk/s/FBSPI22/?pageurl="
  },
  oglAttribution: {
    text: 'Pan fyddwch yn defnyddio\'r wybodaeth hon o dan yr OGL, dylech gynnwys y briodoliad canlynol: Yn cynnwys gwybodaeth sector cyhoeddus wedi\'i thrwyddedu o dan y <a class="govuk-footer__link" href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/">Drwydded Llywodraeth Agored f3.0</a>'
  }
};
