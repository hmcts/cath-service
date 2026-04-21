import { prisma } from "@hmcts/postgres";

const CIVIL_FAMILY_JURISDICTION_IDS = [1, 2];
const CRIME_JURISDICTION_IDS = [3];

interface ListTypeData {
  id: number;
  name: string;
  englishFriendlyName: string;
  welshFriendlyName: string;
  provenance: string;
  urlPath?: string;
  isNonStrategic: boolean;
  defaultSensitivity: string;
}

const listTypes: ListTypeData[] = [
  {
    id: 1,
    name: "CIVIL_DAILY_CAUSE_LIST",
    englishFriendlyName: "Civil Daily Cause List",
    welshFriendlyName: "Civil Daily Cause List",
    provenance: "CFT_IDAM",
    urlPath: "civil-daily-cause-list",
    isNonStrategic: false,
    defaultSensitivity: "Public"
  },
  {
    id: 2,
    name: "FAMILY_DAILY_CAUSE_LIST",
    englishFriendlyName: "Family Daily Cause List",
    welshFriendlyName: "Family Daily Cause List",
    provenance: "CFT_IDAM",
    urlPath: "family-daily-cause-list",
    isNonStrategic: false,
    defaultSensitivity: "Private"
  },
  {
    id: 3,
    name: "CRIME_DAILY_LIST",
    englishFriendlyName: "Crime Daily List",
    welshFriendlyName: "Crime Daily List",
    provenance: "CRIME_IDAM",
    urlPath: "crime-daily-list",
    isNonStrategic: false,
    defaultSensitivity: "Public"
  },
  {
    id: 4,
    name: "MAGISTRATES_PUBLIC_LIST",
    englishFriendlyName: "Magistrates Public List",
    welshFriendlyName: "Magistrates Public List",
    provenance: "CRIME_IDAM,PI_AAD",
    urlPath: "magistrates-public-list",
    isNonStrategic: false,
    defaultSensitivity: "Public"
  },
  {
    id: 5,
    name: "CROWN_WARNED_LIST",
    englishFriendlyName: "Crown Warned List",
    welshFriendlyName: "Crown Warned List",
    provenance: "CRIME_IDAM",
    urlPath: "crown-warned-list",
    isNonStrategic: false,
    defaultSensitivity: "Public"
  },
  {
    id: 6,
    name: "CROWN_DAILY_LIST",
    englishFriendlyName: "Crown Daily List",
    welshFriendlyName: "Crown Daily List",
    provenance: "CRIME_IDAM",
    urlPath: "crown-daily-cause-list",
    isNonStrategic: false,
    defaultSensitivity: "Public"
  },
  {
    id: 7,
    name: "CROWN_FIRM_LIST",
    englishFriendlyName: "Crown Firm List",
    welshFriendlyName: "Crown Firm List",
    provenance: "CRIME_IDAM",
    urlPath: "crown-firm-list",
    isNonStrategic: false,
    defaultSensitivity: "Public"
  },
  {
    id: 8,
    name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
    englishFriendlyName: "Civil and Family Daily Cause List",
    welshFriendlyName: "Rhestr Achos Dyddiol Sifil a Theulu",
    provenance: "CFT_IDAM",
    urlPath: "civil-and-family-daily-cause-list",
    isNonStrategic: false,
    defaultSensitivity: "Public"
  },
  {
    id: 9,
    name: "CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST",
    englishFriendlyName: "Care Standards Tribunal Weekly Hearing List",
    welshFriendlyName: "Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Safonau Gofal",
    provenance: "CFT_IDAM",
    urlPath: "care-standards-tribunal-weekly-hearing-list",
    isNonStrategic: true,
    defaultSensitivity: "Public"
  }
];

function getJurisdictionIdsForProvenance(provenance: string): number[] {
  const ids: number[] = [];
  if (provenance.includes("CFT_IDAM")) ids.push(...CIVIL_FAMILY_JURISDICTION_IDS);
  if (provenance.includes("CRIME_IDAM")) ids.push(...CRIME_JURISDICTION_IDS);
  return ids;
}

export async function seedListTypes() {
  console.log("Seeding list types...");

  const allSubJurisdictions = await (prisma as any).subJurisdiction.findMany();

  if (allSubJurisdictions.length === 0) {
    throw new Error("No sub-jurisdictions found. Please ensure sub-jurisdictions are seeded first.");
  }

  let seededCount = 0;
  let skippedCount = 0;

  for (const listType of listTypes) {
    const existing = await (prisma as any).listType.findUnique({
      where: { name: listType.name }
    });

    if (existing) {
      // Update existing list type to ensure correct defaultSensitivity
      await (prisma as any).listType.update({
        where: { name: listType.name },
        data: {
          friendlyName: listType.englishFriendlyName,
          welshFriendlyName: listType.welshFriendlyName,
          shortenedFriendlyName: listType.englishFriendlyName,
          url: listType.urlPath || "",
          defaultSensitivity: listType.defaultSensitivity,
          allowedProvenance: listType.provenance,
          isNonStrategic: listType.isNonStrategic
        }
      });
      skippedCount++;
      continue;
    }

    try {
      const jurisdictionIds = getJurisdictionIdsForProvenance(listType.provenance);
      const relevantSubJurisdictions = allSubJurisdictions.filter((sj: any) => jurisdictionIds.includes(sj.jurisdictionId));

      await (prisma as any).listType.create({
        data: {
          name: listType.name,
          friendlyName: listType.englishFriendlyName,
          welshFriendlyName: listType.welshFriendlyName,
          shortenedFriendlyName: listType.englishFriendlyName,
          url: listType.urlPath || "",
          defaultSensitivity: listType.defaultSensitivity,
          allowedProvenance: listType.provenance,
          isNonStrategic: listType.isNonStrategic,
          subJurisdictions: {
            create: relevantSubJurisdictions.map((sj: any) => ({
              subJurisdictionId: sj.subJurisdictionId
            }))
          }
        }
      });

      seededCount++;
    } catch (error) {
      console.error(`Failed to seed list type "${listType.name}":`, error);
      throw error;
    }
  }

  console.log(`Seeded ${seededCount} list types (${skippedCount} already existed)`);
}
