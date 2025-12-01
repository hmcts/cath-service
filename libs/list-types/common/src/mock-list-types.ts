export interface ListType {
  id: number;
  name: string;
  englishFriendlyName: string;
  welshFriendlyName: string;
  provenance: string;
  urlPath?: string;
}

export const mockListTypes: ListType[] = [
  {
    id: 1,
    name: "CIVIL_DAILY_CAUSE_LIST",
    englishFriendlyName: "Civil Daily Cause List",
    welshFriendlyName: "Civil Daily Cause List",
    provenance: "CFT_IDAM",
    urlPath: "civil-daily-cause-list"
  },
  {
    id: 2,
    name: "FAMILY_DAILY_CAUSE_LIST",
    englishFriendlyName: "Family Daily Cause List",
    welshFriendlyName: "Family Daily Cause List",
    provenance: "CFT_IDAM",
    urlPath: "family-daily-cause-list"
  },
  {
    id: 3,
    name: "CRIME_DAILY_LIST",
    englishFriendlyName: "Crime Daily List",
    welshFriendlyName: "Crime Daily List",
    provenance: "CFT_IDAM",
    urlPath: "crime-daily-list"
  },
  {
    id: 4,
    name: "MAGISTRATES_PUBLIC_LIST",
    englishFriendlyName: "Magistrates Public List",
    welshFriendlyName: "Magistrates Public List",
    provenance: "CFT_IDAM",
    urlPath: "magistrates-public-list"
  },
  {
    id: 5,
    name: "CROWN_WARNED_LIST",
    englishFriendlyName: "Crown Warned List",
    welshFriendlyName: "Crown Warned List",
    provenance: "CFT_IDAM",
    urlPath: "crown-warned-list"
  },
  {
    id: 6,
    name: "CROWN_DAILY_LIST",
    englishFriendlyName: "Crown Daily List",
    welshFriendlyName: "Crown Daily List",
    provenance: "CFT_IDAM",
    urlPath: "crown-daily-list"
  },
  {
    id: 7,
    name: "CROWN_FIRM_LIST",
    englishFriendlyName: "Crown Firm List",
    welshFriendlyName: "Crown Firm List",
    provenance: "CFT_IDAM",
    urlPath: "crown-firm-list"
  },
  {
    id: 8,
    name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
    englishFriendlyName: "Civil and Family Daily Cause List",
    welshFriendlyName: "Rhestr Achos Dyddiol Sifil a Theulu",
    provenance: "CFT_IDAM",
    urlPath: "civil-and-family-daily-cause-list"
  }
];
