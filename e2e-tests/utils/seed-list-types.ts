import { seedListTypes as seedListTypesApi } from "./test-support-api.js";

const BASE_LIST_TYPES = [
  {
    name: "CIVIL_DAILY_CAUSE_LIST",
    friendlyName: "Civil Daily Cause List",
    welshFriendlyName: "Civil Daily Cause List",
    url: "civil-daily-cause-list",
    defaultSensitivity: "Public",
    provenance: "CFT_IDAM",
    isNonStrategic: false
  },
  {
    name: "FAMILY_DAILY_CAUSE_LIST",
    friendlyName: "Family Daily Cause List",
    welshFriendlyName: "Family Daily Cause List",
    url: "family-daily-cause-list",
    defaultSensitivity: "Private",
    provenance: "CFT_IDAM",
    isNonStrategic: false
  },
  {
    name: "CRIME_DAILY_LIST",
    friendlyName: "Crime Daily List",
    welshFriendlyName: "Crime Daily List",
    url: "crime-daily-list",
    defaultSensitivity: "Public",
    provenance: "CRIME_IDAM",
    isNonStrategic: false
  },
  {
    name: "MAGISTRATES_PUBLIC_LIST",
    friendlyName: "Magistrates Public List",
    welshFriendlyName: "Magistrates Public List",
    url: "magistrates-public-list",
    defaultSensitivity: "Public",
    provenance: "CRIME_IDAM",
    isNonStrategic: false
  },
  {
    name: "CROWN_WARNED_LIST",
    friendlyName: "Crown Warned List",
    welshFriendlyName: "Crown Warned List",
    url: "crown-warned-list",
    defaultSensitivity: "Public",
    provenance: "CRIME_IDAM",
    isNonStrategic: false
  },
  {
    name: "CROWN_DAILY_LIST",
    friendlyName: "Crown Daily List",
    welshFriendlyName: "Crown Daily List",
    url: "crown-daily-cause-list",
    defaultSensitivity: "Public",
    provenance: "CRIME_IDAM",
    isNonStrategic: false
  },
  {
    name: "CROWN_FIRM_LIST",
    friendlyName: "Crown Firm List",
    welshFriendlyName: "Crown Firm List",
    url: "crown-firm-list",
    defaultSensitivity: "Public",
    provenance: "CRIME_IDAM",
    isNonStrategic: false
  },
  {
    name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
    friendlyName: "Civil and Family Daily Cause List",
    welshFriendlyName: "Rhestr Achos Dyddiol Sifil a Theulu",
    url: "civil-and-family-daily-cause-list",
    defaultSensitivity: "Public",
    provenance: "CFT_IDAM",
    isNonStrategic: false
  },
  {
    name: "CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST",
    friendlyName: "Care Standards Tribunal Weekly Hearing List",
    welshFriendlyName: "Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Safonau Gofal",
    url: "care-standards-tribunal-weekly-hearing-list",
    defaultSensitivity: "Public",
    provenance: "CFT_IDAM",
    isNonStrategic: true
  },
  {
    name: "LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
    friendlyName: "London Administrative Court Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Llys Gweinyddol Llundain",
    url: "london-administrative-court-daily-cause-list",
    defaultSensitivity: "Public",
    provenance: "CFT_IDAM",
    isNonStrategic: true
  },
  {
    name: "COURT_OF_APPEAL_CIVIL_DIVISION_DAILY_CAUSE_LIST",
    friendlyName: "Court of Appeal (Civil Division) Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol y Llys Apêl (Adran Sifil)",
    url: "court-of-appeal-civil-division-daily-cause-list",
    defaultSensitivity: "Public",
    provenance: "CFT_IDAM",
    isNonStrategic: true
  }
];

export async function seedListTypes(prefix: string) {
  console.log("Seeding list types...");

  try {
    // Seed base (unprefixed) list types first - required for API endpoints that use hardcoded list type names
    await seedListTypesApi(BASE_LIST_TYPES, true);

    // Seed prefixed list types for test isolation
    const prefixedListTypes = BASE_LIST_TYPES.map((lt) => ({
      ...lt,
      name: `${prefix}${lt.name}`,
      friendlyName: `${prefix}${lt.friendlyName}`
    }));

    const result = await seedListTypesApi(prefixedListTypes, true);
    console.log(`Seeded ${result.seeded} list types with prefix: ${prefix}`);
    return result;
  } catch (error) {
    console.error("Error seeding list types:", error);
    throw error;
  }
}
