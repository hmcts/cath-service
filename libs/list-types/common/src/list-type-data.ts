export interface ListTypeData {
  name: string;
  englishFriendlyName: string;
  welshFriendlyName: string;
  provenance: string;
  urlPath?: string;
  isNonStrategic: boolean;
  defaultSensitivity: string | null;
  shortenedFriendlyName?: string;
  subJurisdictionIds: number[];
}

export const listTypeData: ListTypeData[] = [
  {
    name: "CIVIL_DAILY_CAUSE_LIST",
    englishFriendlyName: "Civil Daily Cause List",
    welshFriendlyName: "Civil Daily Cause List",
    provenance: "CFT_IDAM",
    urlPath: "civil-daily-cause-list",
    isNonStrategic: false,
    defaultSensitivity: "Public",
    subJurisdictionIds: [1]
  },
  {
    name: "FAMILY_DAILY_CAUSE_LIST",
    englishFriendlyName: "Family Daily Cause List",
    welshFriendlyName: "Family Daily Cause List",
    provenance: "CFT_IDAM",
    urlPath: "family-daily-cause-list",
    isNonStrategic: false,
    defaultSensitivity: "Private",
    subJurisdictionIds: [2]
  },
  {
    name: "MAGISTRATES_PUBLIC_LIST",
    englishFriendlyName: "Magistrates Public List",
    welshFriendlyName: "Magistrates Public List",
    provenance: "CRIME_IDAM,PI_AAD",
    urlPath: "magistrates-public-list",
    isNonStrategic: false,
    defaultSensitivity: "Public",
    subJurisdictionIds: [7]
  },
  {
    name: "CROWN_WARNED_LIST",
    englishFriendlyName: "Crown Warned List",
    welshFriendlyName: "Crown Warned List",
    provenance: "CRIME_IDAM",
    urlPath: "crown-warned-list",
    isNonStrategic: false,
    defaultSensitivity: "Classified",
    subJurisdictionIds: [4]
  },
  {
    name: "CROWN_DAILY_LIST",
    englishFriendlyName: "Crown Daily List",
    welshFriendlyName: "Crown Daily List",
    provenance: "CRIME_IDAM",
    urlPath: "crown-daily-cause-list",
    isNonStrategic: false,
    defaultSensitivity: "Public",
    subJurisdictionIds: [4]
  },
  {
    name: "CROWN_FIRM_LIST",
    englishFriendlyName: "Crown Firm List",
    welshFriendlyName: "Crown Firm List",
    provenance: "CRIME_IDAM",
    urlPath: "crown-firm-list",
    isNonStrategic: false,
    defaultSensitivity: "Classified",
    subJurisdictionIds: [4]
  },
  {
    name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
    englishFriendlyName: "Civil and Family Daily Cause List",
    welshFriendlyName: "Rhestr Achos Dyddiol Sifil a Theulu",
    provenance: "CFT_IDAM",
    urlPath: "civil-and-family-daily-cause-list",
    isNonStrategic: false,
    defaultSensitivity: "Public",
    subJurisdictionIds: [1, 2]
  },
  {
    name: "ET_DAILY_LIST",
    englishFriendlyName: "Employment Tribunals Daily List",
    welshFriendlyName: "Rhestr Ddyddiol y Tribiwnlysoedd Cyflogaeth",
    provenance: "CFT_IDAM",
    urlPath: "et-daily-list",
    isNonStrategic: false,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "ET Daily List",
    subJurisdictionIds: [3]
  },
  {
    name: "ET_FORTNIGHTLY_PRESS_LIST",
    englishFriendlyName: "Employment Tribunals Fortnightly Press List",
    welshFriendlyName: "Rhestr y Wasg Pob Pythefnos y Tribiwnlysoedd Cyflogaeth",
    provenance: "CFT_IDAM",
    urlPath: "et-fortnightly-list",
    isNonStrategic: false,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "ET Fortnightly List",
    subJurisdictionIds: [3]
  },
  {
    name: "CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST",
    englishFriendlyName: "Care Standards Tribunal Weekly Hearing List",
    welshFriendlyName: "Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Safonau Gofal",
    provenance: "CFT_IDAM",
    urlPath: "care-standards-tribunal-weekly-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [9]
  },
  // RCJ Standard Format
  {
    name: "CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST",
    englishFriendlyName: "Civil Courts at the RCJ Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Llys Sifil yn y Llysoedd Barn Brenhinol",
    provenance: "CFT_IDAM",
    urlPath: "civil-courts-rcj-daily-cause-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [1]
  },
  {
    name: "COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST",
    englishFriendlyName: "County Court at Central London Civil Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Sifil yn y Llys Sirol yng Nghanol Llundain",
    provenance: "CFT_IDAM",
    urlPath: "county-court-central-london-civil-daily-cause-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [1]
  },
  {
    name: "COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST",
    englishFriendlyName: "Court of Appeal (Criminal Division) Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol y Llys Apêl (Adran Troseddol)",
    provenance: "CRIME_IDAM",
    urlPath: "court-of-appeal-criminal-division-daily-cause-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [5]
  },
  {
    name: "FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST",
    englishFriendlyName: "Family Division of the High Court Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Adran Deulu yr Uchel Lys",
    provenance: "CFT_IDAM",
    urlPath: "family-division-high-court-daily-cause-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [2]
  },
  {
    name: "KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST",
    englishFriendlyName: "King's Bench Division Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Adran Mainc y Brenin",
    provenance: "CFT_IDAM",
    urlPath: "kings-bench-division-daily-cause-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [1]
  },
  {
    name: "KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST",
    englishFriendlyName: "King's Bench Masters Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Meistri Mainc y Brenin",
    provenance: "CFT_IDAM",
    urlPath: "kings-bench-masters-daily-cause-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [1]
  },
  {
    name: "MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST",
    englishFriendlyName: "Mayor & City Civil Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Llys Sifil y Maer a'r Ddinas",
    provenance: "CFT_IDAM",
    urlPath: "mayor-city-civil-daily-cause-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [1]
  },
  {
    name: "SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST",
    englishFriendlyName: "Senior Courts Costs Office Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Swyddfa Costau'r Uwchlysoedd",
    provenance: "CFT_IDAM",
    urlPath: "senior-courts-costs-office-daily-cause-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [1]
  },
  // RCJ Special Format - London Administrative Court
  {
    name: "LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
    englishFriendlyName: "London Administrative Court Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Llys Gweinyddol Llundain",
    provenance: "CFT_IDAM",
    urlPath: "london-administrative-court-daily-cause-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [1]
  },
  // RCJ Special Format - Court of Appeal Civil
  {
    name: "COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST",
    englishFriendlyName: "Court of Appeal (Civil Division) Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol y Llys Apêl (Adran Sifil)",
    provenance: "CFT_IDAM",
    urlPath: "court-of-appeal-civil-division-daily-cause-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [5]
  },
  // Administrative Courts
  {
    name: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
    englishFriendlyName: "Birmingham Administrative Court Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Llys Gweinyddol Birmingham",
    provenance: "CFT_IDAM",
    urlPath: "birmingham-administrative-court-daily-cause-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [1]
  },
  {
    name: "LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
    englishFriendlyName: "Leeds Administrative Court Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Llys Gweinyddol Leeds",
    provenance: "CFT_IDAM",
    urlPath: "leeds-administrative-court-daily-cause-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [1]
  },
  {
    name: "BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
    englishFriendlyName: "Bristol and Cardiff Administrative Court Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Llys Gweinyddol Bryste a Chaerdydd",
    provenance: "CFT_IDAM",
    urlPath: "bristol-cardiff-administrative-court-daily-cause-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [1]
  },
  {
    name: "MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
    englishFriendlyName: "Manchester Administrative Court Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Llys Gweinyddol Manceinion",
    provenance: "CFT_IDAM",
    urlPath: "manchester-administrative-court-daily-cause-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [1]
  },
  {
    name: "SJP_PRESS_LIST",
    englishFriendlyName: "Single Justice Procedure Press List (Full list)",
    welshFriendlyName: "Rhestr Wasg Gweithdrefn Ynad Sengl",
    provenance: "PI_AAD",
    urlPath: "sjp-press-list",
    isNonStrategic: false,
    defaultSensitivity: "Classified",
    shortenedFriendlyName: "SJP Press List (Full list)",
    subJurisdictionIds: [7]
  },
  {
    name: "SJP_PUBLIC_LIST",
    englishFriendlyName: "Single Justice Procedure Public List (Full list)",
    welshFriendlyName: "Rhestr Gyhoeddus Gweithdrefn Ynad Sengl",
    provenance: "PI_AAD",
    urlPath: "sjp-public-list",
    isNonStrategic: false,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "SJP Public List (Full list)",
    subJurisdictionIds: [7]
  },
  {
    name: "SJP_DELTA_PRESS_LIST",
    englishFriendlyName: "Single Justice Procedure Press List (New cases)",
    welshFriendlyName: "Rhestr Wasg Gweithdrefn Ynad Sengl (Achosion Newydd)",
    provenance: "PI_AAD",
    urlPath: "sjp-delta-press-list",
    isNonStrategic: false,
    defaultSensitivity: "Classified",
    shortenedFriendlyName: "SJP Press List (New cases)",
    subJurisdictionIds: [7]
  },
  {
    name: "SJP_DELTA_PUBLIC_LIST",
    englishFriendlyName: "Single Justice Procedure Public List (New cases)",
    welshFriendlyName: "Rhestr Gyhoeddus Gweithdrefn Ynad Sengl (Achosion Newydd)",
    provenance: "PI_AAD",
    urlPath: "sjp-delta-public-list",
    isNonStrategic: false,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "SJP Public List (New cases)",
    subJurisdictionIds: [7]
  },
  {
    name: "SIAC_WEEKLY_HEARING_LIST",
    englishFriendlyName: "Special Immigration Appeals Commission Weekly Hearing List",
    welshFriendlyName: "Special Immigration Appeals Commission Weekly Hearing List",
    provenance: "CFT_IDAM",
    urlPath: "siac-poac-paac-weekly-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "SIAC Weekly Hearing List",
    subJurisdictionIds: [25]
  },
  {
    name: "POAC_WEEKLY_HEARING_LIST",
    englishFriendlyName: "Proscribed Organisations Appeal Commission Weekly Hearing List",
    welshFriendlyName: "Proscribed Organisations Appeal Commission Weekly Hearing List",
    provenance: "CFT_IDAM",
    urlPath: "siac-poac-paac-weekly-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "POAC Weekly Hearing List",
    subJurisdictionIds: [23]
  },
  {
    name: "PAAC_WEEKLY_HEARING_LIST",
    englishFriendlyName: "Pathogens Access Appeal Commission Weekly Hearing List",
    welshFriendlyName: "Pathogens Access Appeal Commission Weekly Hearing List",
    provenance: "CFT_IDAM",
    urlPath: "siac-poac-paac-weekly-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "PACC Weekly Hearing List",
    subJurisdictionIds: [21]
  },
  {
    name: "FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST",
    englishFriendlyName: "First-tier Tribunal (Tax Chamber) Weekly Hearing List",
    welshFriendlyName: "First-tier Tribunal (Tax Chamber) Weekly Hearing List",
    provenance: "CFT_IDAM",
    urlPath: "ftt-tax-chamber-weekly-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "FFT Tax Weekly Hearing List",
    subJurisdictionIds: [16]
  },
  {
    name: "FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST",
    englishFriendlyName: "First-tier Tribunal (Land Registration Tribunal) Weekly Hearing List",
    welshFriendlyName: "First-tier Tribunal (Land Registration Tribunal) Weekly Hearing List",
    provenance: "CFT_IDAM",
    urlPath: "ftt-lands-registration-tribunal-weekly-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "FFT (LR) Weekly Hearing List",
    subJurisdictionIds: [15]
  },
  {
    name: "FTT_RPT_EASTERN_WEEKLY_HEARING_LIST",
    englishFriendlyName: "First-tier Tribunal (Residential Property Tribunal): Eastern region Weekly Hearing List",
    welshFriendlyName: "First-tier Tribunal (Residential Property Tribunal): Eastern region Weekly Hearing List",
    provenance: "CFT_IDAM",
    urlPath: "ftt-rpt-weekly-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "FTT (RPT) Eastern Weekly Hearing List",
    subJurisdictionIds: [24]
  },
  {
    name: "FTT_RPT_LONDON_WEEKLY_HEARING_LIST",
    englishFriendlyName: "First-tier Tribunal (Residential Property Tribunal): London region Weekly Hearing List",
    welshFriendlyName: "First-tier Tribunal (Residential Property Tribunal): London region Weekly Hearing List",
    provenance: "CFT_IDAM",
    urlPath: "ftt-rpt-weekly-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "FTT (RPT) London Weekly Hearing List",
    subJurisdictionIds: [24]
  },
  {
    name: "FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST",
    englishFriendlyName: "First-tier Tribunal (Residential Property Tribunal): Midlands region Weekly Hearing List",
    welshFriendlyName: "First-tier Tribunal (Residential Property Tribunal): Midlands region Weekly Hearing List",
    provenance: "CFT_IDAM",
    urlPath: "ftt-rpt-weekly-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "FTT (RPT) Midlands Weekly Hearing List",
    subJurisdictionIds: [24]
  },
  {
    name: "FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST",
    englishFriendlyName: "First-tier Tribunal (Residential Property Tribunal): Northern region Weekly Hearing List",
    welshFriendlyName: "First-tier Tribunal (Residential Property Tribunal): Northern region Weekly Hearing List",
    provenance: "CFT_IDAM",
    urlPath: "ftt-rpt-weekly-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "FTT (RPT) Northern Weekly Hearing List",
    subJurisdictionIds: [24]
  },
  {
    name: "FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST",
    englishFriendlyName: "First-tier Tribunal (Residential Property Tribunal): Southern region Weekly Hearing List",
    welshFriendlyName: "First-tier Tribunal (Residential Property Tribunal): Southern region Weekly Hearing List",
    provenance: "CFT_IDAM",
    urlPath: "ftt-rpt-weekly-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "FTT (RPT) Southern Weekly Hearing List",
    subJurisdictionIds: [24]
  },
  {
    name: "SEND_DAILY_HEARING_LIST",
    englishFriendlyName: "First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List",
    welshFriendlyName: "Rhestr Gwrandawiadau Dyddiol y Tribiwnlys Haen Gyntaf (Anghenion Addysgol Arbennig ac Anabledd)",
    provenance: "CFT_IDAM",
    urlPath: "send-daily-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Private",
    shortenedFriendlyName: "SEND Daily Hearing List",
    subJurisdictionIds: [18]
  },
  {
    name: "CIC_WEEKLY_HEARING_LIST",
    englishFriendlyName: "Criminal Injuries Compensation Weekly Hearing List",
    welshFriendlyName: "Rhestr Gwrandawiadau Wythnosol yr Iawndal am Anafiadau Troseddol",
    provenance: "CFT_IDAM",
    urlPath: "cic-weekly-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "CIC Weekly Hearing List",
    subJurisdictionIds: [14]
  },
  {
    name: "AST_DAILY_HEARING_LIST",
    englishFriendlyName: "Asylum Support Tribunal Daily Hearing List",
    welshFriendlyName: "Rhestr Gwrandawiadau Dyddiol y Tribiwnlys Cymorth Lloches",
    provenance: "CFT_IDAM",
    urlPath: "ast-daily-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "AST Daily Hearing List",
    subJurisdictionIds: [13]
  },
  {
    name: "GRC_WEEKLY_HEARING_LIST",
    englishFriendlyName: "General Regulatory Chamber Weekly Hearing List",
    welshFriendlyName: "Rhestr Wrandawiadau Wythnosol y Siambr Reoleiddio Gyffredinol",
    shortenedFriendlyName: "GRC Weekly Hearing List",
    provenance: "CFT_IDAM",
    urlPath: "grc-weekly-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [19]
  },
  {
    name: "WPAFCC_WEEKLY_HEARING_LIST",
    englishFriendlyName: "First-tier Tribunal (War Pensions and Armed Forces Compensation) Weekly Hearing List",
    welshFriendlyName: "Rhestr Wrandawiadau Wythnosol Siambr Pensiynau Rhyfel a Digollediad Lluoedd Arfog",
    shortenedFriendlyName: "WPAFCC Weekly Hearing List",
    provenance: "CFT_IDAM",
    urlPath: "wpafcc-weekly-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [17]
  },
  {
    name: "UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST",
    englishFriendlyName: "Upper Tribunal (Immigration and Asylum) Chamber Statutory Appeal Daily Hearing List",
    welshFriendlyName: "Uwch Dribiwnlys (Siambr Mewnfudo a Lloches) - Rhestr o Wrandawiadau Dyddiol - Apeliadau Statudol",
    shortenedFriendlyName: "UTIAC Statutory Appeal Daily Hearing List",
    provenance: "CFT_IDAM",
    urlPath: "utiac-statutory-appeal-daily-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [28]
  },
  {
    name: "UTIAC_JR_LONDON_DAILY_HEARING_LIST",
    englishFriendlyName: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: London Daily Hearing List",
    welshFriendlyName: "[WELSH TRANSLATION REQUIRED: 'Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: London Daily Hearing List']",
    shortenedFriendlyName: "UTIAC JR London Daily Hearing List",
    provenance: "CFT_IDAM",
    urlPath: "utiac-jr-daily-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [27]
  },
  {
    name: "UTIAC_JR_LEEDS_DAILY_HEARING_LIST",
    englishFriendlyName: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Leeds Daily Hearing List",
    welshFriendlyName: "[WELSH TRANSLATION REQUIRED: 'Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Leeds Daily Hearing List']",
    shortenedFriendlyName: "UTIAC JR Leeds Daily Hearing List",
    provenance: "CFT_IDAM",
    urlPath: "utiac-jr-daily-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [27]
  },
  {
    name: "UTIAC_JR_MANCHESTER_DAILY_HEARING_LIST",
    englishFriendlyName: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Manchester Daily Hearing List",
    welshFriendlyName: "[WELSH TRANSLATION REQUIRED: 'Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Manchester Daily Hearing List']",
    shortenedFriendlyName: "UTIAC JR Manchester Daily Hearing List",
    provenance: "CFT_IDAM",
    urlPath: "utiac-jr-daily-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [27]
  },
  {
    name: "UTIAC_JR_BIRMINGHAM_DAILY_HEARING_LIST",
    englishFriendlyName: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Birmingham Daily Hearing List",
    welshFriendlyName: "[WELSH TRANSLATION REQUIRED: 'Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Birmingham Daily Hearing List']",
    shortenedFriendlyName: "UTIAC JR Birmingham Daily Hearing List",
    provenance: "CFT_IDAM",
    urlPath: "utiac-jr-daily-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [27]
  },
  {
    name: "UTIAC_JR_CARDIFF_DAILY_HEARING_LIST",
    englishFriendlyName: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Cardiff Daily Hearing List",
    welshFriendlyName: "[WELSH TRANSLATION REQUIRED: 'Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Cardiff Daily Hearing List']",
    shortenedFriendlyName: "UTIAC JR Cardiff Daily Hearing List",
    provenance: "CFT_IDAM",
    urlPath: "utiac-jr-daily-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [27]
  },
  // SSCS Daily Hearing Lists
  {
    name: "SSCS_MIDLANDS_DAILY_HEARING_LIST",
    englishFriendlyName: "Midlands Social Security and Child Support Tribunal Daily Hearing List",
    welshFriendlyName: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Canolbarth Lloegr",
    provenance: "CFT_IDAM",
    urlPath: "sscs-daily-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "SSCS Midlands Daily Hearing List",
    subJurisdictionIds: [8]
  },
  {
    name: "SSCS_SOUTH_EAST_DAILY_HEARING_LIST",
    englishFriendlyName: "South East Social Security and Child Support Tribunal Daily Hearing List",
    welshFriendlyName: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant De Ddwyrain",
    provenance: "CFT_IDAM",
    urlPath: "sscs-daily-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "SSCS South East Daily Hearing List",
    subJurisdictionIds: [8]
  },
  {
    name: "SSCS_WALES_AND_SOUTH_WEST_DAILY_HEARING_LIST",
    englishFriendlyName: "Wales and South West Social Security and Child Support Tribunal Daily Hearing List",
    welshFriendlyName: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Cymru a De Orllewin Lloegr",
    provenance: "CFT_IDAM",
    urlPath: "sscs-daily-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "SSCS Wales and South West Daily Hearing List",
    subJurisdictionIds: [8]
  },
  {
    name: "SSCS_SCOTLAND_DAILY_HEARING_LIST",
    englishFriendlyName: "Scotland Social Security and Child Support Tribunal Daily Hearing List",
    welshFriendlyName: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Yr Alban",
    provenance: "CFT_IDAM",
    urlPath: "sscs-daily-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "SSCS Scotland Daily Hearing List",
    subJurisdictionIds: [8]
  },
  {
    name: "SSCS_NORTH_EAST_DAILY_HEARING_LIST",
    englishFriendlyName: "North East Social Security and Child Support Tribunal Daily Hearing List",
    welshFriendlyName: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Gogledd Ddwyrain Lloegr",
    provenance: "CFT_IDAM",
    urlPath: "sscs-daily-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "SSCS North East Daily Hearing List",
    subJurisdictionIds: [8]
  },
  {
    name: "SSCS_NORTH_WEST_DAILY_HEARING_LIST",
    englishFriendlyName: "North West Social Security and Child Support Tribunal Daily Hearing List",
    welshFriendlyName: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Gogledd Orllewin Lloegr",
    provenance: "CFT_IDAM",
    urlPath: "sscs-daily-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "SSCS North West Daily Hearing List",
    subJurisdictionIds: [8]
  },
  {
    name: "SSCS_LONDON_DAILY_HEARING_LIST",
    englishFriendlyName: "London Social Security and Child Support Tribunal Daily Hearing List",
    welshFriendlyName: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Llundain",
    provenance: "CFT_IDAM",
    urlPath: "sscs-daily-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "SSCS London Daily Hearing List",
    subJurisdictionIds: [8]
  },
  {
    name: "MAGISTRATES_STANDARD_LIST",
    englishFriendlyName: "Magistrates Standard List",
    welshFriendlyName: "Rhestr Safonol y Llys Ynadon",
    provenance: "CRIME_IDAM,PI_AAD",
    urlPath: "magistrates-standard-list",
    isNonStrategic: false,
    defaultSensitivity: "Classified",
    subJurisdictionIds: [7]
  },
  {
    name: "UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST",
    englishFriendlyName: "Upper Tribunal Tax and Chancery Chamber Daily Hearing List",
    welshFriendlyName: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Uwch Siambr Dreth a Siawnsri",
    provenance: "CFT_IDAM",
    urlPath: "upper-tribunal-tax-and-chancery-chamber-daily-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "UT (T and CC) Daily Hearing List",
    subJurisdictionIds: [30]
  },
  {
    name: "UT_LANDS_CHAMBER_DAILY_HEARING_LIST",
    englishFriendlyName: "Upper Tribunal (Lands Chamber) Daily Hearing List",
    welshFriendlyName: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Uwch (Siambr Tiroedd)",
    provenance: "CFT_IDAM",
    urlPath: "upper-tribunal-lands-chamber-daily-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "UT (LC) Daily Hearing List",
    subJurisdictionIds: [29]
  },
  {
    name: "UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST",
    englishFriendlyName: "Upper Tribunal (Administrative Appeals Chamber) Daily Hearing List",
    welshFriendlyName: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Uwch (Siambr Apeliadau Gweinyddol)",
    provenance: "CFT_IDAM",
    urlPath: "upper-tribunal-administrative-appeals-chamber-daily-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "UT (AAC) Daily Hearing List",
    subJurisdictionIds: [26]
  },
  {
    name: "PHT_WEEKLY_HEARING_LIST",
    englishFriendlyName: "Primary Health Tribunal Weekly Hearing List",
    welshFriendlyName: "Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Iechyd Sylfaenol",
    provenance: "MANUAL_UPLOAD",
    urlPath: "pht-weekly-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: null,
    shortenedFriendlyName: "PHT Weekly Hearing List",
    subJurisdictionIds: [22]
  },
  {
    name: "MAGISTRATES_ADULT_COURT_LIST_DAILY",
    englishFriendlyName: "Magistrates Adult Court List - Daily",
    welshFriendlyName: "Rhestr Llys Ynadon Oedolion - Dyddiol",
    provenance: "CRIME_IDAM",
    urlPath: "magistrates-adult-court-list",
    isNonStrategic: false,
    defaultSensitivity: "Classified",
    subJurisdictionIds: [7]
  },
  {
    name: "MAGISTRATES_ADULT_COURT_LIST_FUTURE",
    englishFriendlyName: "Magistrates Adult Court List - Future",
    welshFriendlyName: "Rhestr Llys Ynadon Oedolion – Dyfodol",
    provenance: "CRIME_IDAM",
    urlPath: "magistrates-adult-court-list",
    isNonStrategic: false,
    defaultSensitivity: "Classified",
    subJurisdictionIds: [7]
  },
  {
    name: "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY",
    englishFriendlyName: "Magistrates Public Adult Court List - Daily",
    welshFriendlyName: "Rhestr Achosion Cyhoeddus Llys Ynadon (Oedolion) - Dyddiol",
    provenance: "CRIME_IDAM",
    urlPath: "magistrates-public-adult-court-list",
    isNonStrategic: false,
    defaultSensitivity: "Public",
    subJurisdictionIds: [7]
  },
  {
    name: "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE",
    englishFriendlyName: "Magistrates Public Adult Court List - Future",
    welshFriendlyName: "Rhestr Achosion Cyhoeddus Llys Ynadon (Oedolion) - Dyfodol",
    provenance: "CRIME_IDAM",
    urlPath: "magistrates-public-adult-court-list",
    isNonStrategic: false,
    defaultSensitivity: "Public",
    subJurisdictionIds: [7]
  },
  // High Court flat-file daily cause lists (manual upload)
  {
    name: "BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST",
    englishFriendlyName: "Business & Property Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Busnes ac Eiddo",
    provenance: "CFT_IDAM",
    urlPath: "business-and-property-daily-list",
    isNonStrategic: false,
    defaultSensitivity: "Public",
    subJurisdictionIds: [10]
  },
  {
    name: "CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST",
    englishFriendlyName: "Circuit Commercial Court Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Llys Masnachol Cylchdaith",
    provenance: "CFT_IDAM",
    urlPath: "circuit-commercial-court-daily-list",
    isNonStrategic: false,
    defaultSensitivity: "Public",
    subJurisdictionIds: [10]
  },
  {
    name: "HIGH_COURT_CIVIL_DAILY_CAUSE_LIST",
    englishFriendlyName: "High Court Civil Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Sifil yr Uchel Lys",
    provenance: "CFT_IDAM",
    urlPath: "high-court-civil-daily-list",
    isNonStrategic: false,
    defaultSensitivity: "Public",
    subJurisdictionIds: [10]
  },
  {
    name: "HIGH_COURT_FAMILY_DAILY_CAUSE_LIST",
    englishFriendlyName: "High Court Family Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Teulu yr Uchel Lys",
    provenance: "CFT_IDAM",
    urlPath: "high-court-family-daily-list",
    isNonStrategic: false,
    defaultSensitivity: "Public",
    subJurisdictionIds: [11]
  }
];
