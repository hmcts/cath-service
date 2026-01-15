export interface ListType {
  id: number;
  name: string;
  englishFriendlyName: string;
  welshFriendlyName: string;
  provenance: string;
  urlPath?: string;
  isNonStrategic: boolean;
}

export const mockListTypes: ListType[] = [
  {
    id: 1,
    name: "CIVIL_DAILY_CAUSE_LIST",
    englishFriendlyName: "Civil Daily Cause List",
    welshFriendlyName: "Civil Daily Cause List",
    provenance: "CFT_IDAM",
    urlPath: "civil-daily-cause-list",
    isNonStrategic: false
  },
  {
    id: 2,
    name: "FAMILY_DAILY_CAUSE_LIST",
    englishFriendlyName: "Family Daily Cause List",
    welshFriendlyName: "Family Daily Cause List",
    provenance: "CFT_IDAM",
    urlPath: "family-daily-cause-list",
    isNonStrategic: false
  },
  {
    id: 3,
    name: "CRIME_DAILY_LIST",
    englishFriendlyName: "Crime Daily List",
    welshFriendlyName: "Crime Daily List",
    provenance: "CFT_IDAM",
    urlPath: "crime-daily-list",
    isNonStrategic: false
  },
  {
    id: 4,
    name: "MAGISTRATES_PUBLIC_LIST",
    englishFriendlyName: "Magistrates Public List",
    welshFriendlyName: "Magistrates Public List",
    provenance: "CFT_IDAM",
    urlPath: "magistrates-public-list",
    isNonStrategic: false
  },
  {
    id: 5,
    name: "CROWN_WARNED_LIST",
    englishFriendlyName: "Crown Warned List",
    welshFriendlyName: "Crown Warned List",
    provenance: "CFT_IDAM",
    urlPath: "crown-warned-list",
    isNonStrategic: false
  },
  {
    id: 6,
    name: "CROWN_DAILY_LIST",
    englishFriendlyName: "Crown Daily List",
    welshFriendlyName: "Crown Daily List",
    provenance: "CFT_IDAM",
    urlPath: "crown-daily-cause-list",
    isNonStrategic: false
  },
  {
    id: 7,
    name: "CROWN_FIRM_LIST",
    englishFriendlyName: "Crown Firm List",
    welshFriendlyName: "Crown Firm List",
    provenance: "CFT_IDAM",
    urlPath: "crown-firm-list",
    isNonStrategic: false
  },
  {
    id: 8,
    name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
    englishFriendlyName: "Civil and Family Daily Cause List",
    welshFriendlyName: "Rhestr Achos Dyddiol Sifil a Theulu",
    provenance: "CFT_IDAM",
    urlPath: "civil-and-family-daily-cause-list",
    isNonStrategic: false
  },
  {
    id: 9,
    name: "CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST",
    englishFriendlyName: "Care Standards Tribunal Weekly Hearing List",
    welshFriendlyName: "Welsh placeholder",
    provenance: "MANUAL_UPLOAD",
    urlPath: "care-standards-tribunal-weekly-hearing-list",
    isNonStrategic: true
  },
  // RCJ Standard Format
  {
    id: 10,
    name: "CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST",
    englishFriendlyName: "Civil Courts at the RCJ Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol y Llysoedd Sifil yn y Llys Barn Brenhinol",
    provenance: "MANUAL_UPLOAD",
    urlPath: "civil-courts-rcj-daily-cause-list",
    isNonStrategic: true
  },
  {
    id: 11,
    name: "COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST",
    englishFriendlyName: "County Court at Central London Civil Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Sifil Llys Sirol Canolog Llundain",
    provenance: "MANUAL_UPLOAD",
    urlPath: "county-court-central-london-civil-daily-cause-list",
    isNonStrategic: true
  },
  {
    id: 12,
    name: "COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST",
    englishFriendlyName: "Court of Appeal (Criminal Division) Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol y Llys Apêl (Adran Droseddol)",
    provenance: "MANUAL_UPLOAD",
    urlPath: "court-of-appeal-criminal-division-daily-cause-list",
    isNonStrategic: true
  },
  {
    id: 13,
    name: "FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST",
    englishFriendlyName: "Family Division of the High Court Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Adran Deulu'r Uchel Lys",
    provenance: "MANUAL_UPLOAD",
    urlPath: "family-division-high-court-daily-cause-list",
    isNonStrategic: true
  },
  {
    id: 14,
    name: "KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST",
    englishFriendlyName: "King's Bench Division Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Adran Mainc y Brenin",
    provenance: "MANUAL_UPLOAD",
    urlPath: "kings-bench-division-daily-cause-list",
    isNonStrategic: true
  },
  {
    id: 15,
    name: "KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST",
    englishFriendlyName: "King's Bench Masters Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Meistri Mainc y Brenin",
    provenance: "MANUAL_UPLOAD",
    urlPath: "kings-bench-masters-daily-cause-list",
    isNonStrategic: true
  },
  {
    id: 16,
    name: "MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST",
    englishFriendlyName: "Mayor & City Civil Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Sifil Dyddiol y Maer a'r Ddinas",
    provenance: "MANUAL_UPLOAD",
    urlPath: "mayor-city-civil-daily-cause-list",
    isNonStrategic: true
  },
  {
    id: 17,
    name: "SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST",
    englishFriendlyName: "Senior Courts Costs Office Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Swyddfa Costau'r Uchel Lysoedd",
    provenance: "MANUAL_UPLOAD",
    urlPath: "senior-courts-costs-office-daily-cause-list",
    isNonStrategic: true
  },
  // RCJ Special Format - London Administrative Court
  {
    id: 18,
    name: "LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
    englishFriendlyName: "London Administrative Court Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Llys Gweinyddol Llundain",
    provenance: "MANUAL_UPLOAD",
    urlPath: "london-administrative-court-daily-cause-list",
    isNonStrategic: true
  },
  // RCJ Special Format - Court of Appeal Civil
  {
    id: 19,
    name: "COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST",
    englishFriendlyName: "Court of Appeal (Civil Division) Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol y Llys Apêl (Adran Sifil)",
    provenance: "MANUAL_UPLOAD",
    urlPath: "court-of-appeal-civil-division-daily-cause-list",
    isNonStrategic: true
  },
  // Administrative Courts
  {
    id: 20,
    name: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
    englishFriendlyName: "Birmingham Administrative Court Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol y Llys Gweinyddol Birmingham",
    provenance: "MANUAL_UPLOAD",
    urlPath: "birmingham-administrative-court-daily-cause-list",
    isNonStrategic: true
  },
  {
    id: 21,
    name: "LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
    englishFriendlyName: "Leeds Administrative Court Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol y Llys Gweinyddol Leeds",
    provenance: "MANUAL_UPLOAD",
    urlPath: "leeds-administrative-court-daily-cause-list",
    isNonStrategic: true
  },
  {
    id: 22,
    name: "BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
    englishFriendlyName: "Bristol and Cardiff Administrative Court Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol y Llys Gweinyddol Bryste a Chaerdydd",
    provenance: "MANUAL_UPLOAD",
    urlPath: "bristol-cardiff-administrative-court-daily-cause-list",
    isNonStrategic: true
  },
  {
    id: 23,
    name: "MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
    englishFriendlyName: "Manchester Administrative Court Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol y Llys Gweinyddol Manceinion",
    provenance: "MANUAL_UPLOAD",
    urlPath: "manchester-administrative-court-daily-cause-list",
    isNonStrategic: true
  }
];
