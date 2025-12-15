import { prisma } from "@hmcts/postgres";

interface MockListType {
  id: number;
  name: string;
  englishFriendlyName: string;
  welshFriendlyName: string;
  provenance: string;
  urlPath?: string;
  isNonStrategic: boolean;
}

const mockListTypes: MockListType[] = [
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
    welshFriendlyName: "Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Safonau Gofal",
    provenance: "MANUAL_UPLOAD",
    urlPath: "care-standards-tribunal-weekly-hearing-list",
    isNonStrategic: true
  }
];

async function migrateMockData() {
  console.log("Starting migration of mock list types to database...");

  const allSubJurisdictions = await prisma.subJurisdiction.findMany();

  if (allSubJurisdictions.length === 0) {
    console.error("No sub-jurisdictions found in database. Please ensure sub-jurisdictions are populated first.");
    return;
  }

  for (const mockListType of mockListTypes) {
    const existingListType = await prisma.listType.findUnique({
      where: { name: mockListType.name }
    });

    if (existingListType) {
      console.log(`List type "${mockListType.name}" already exists. Skipping...`);
      continue;
    }

    try {
      await prisma.listType.create({
        data: {
          name: mockListType.name,
          friendlyName: mockListType.englishFriendlyName,
          welshFriendlyName: mockListType.welshFriendlyName,
          shortenedFriendlyName: mockListType.englishFriendlyName,
          url: mockListType.urlPath || "",
          defaultSensitivity: "Public",
          allowedProvenance: mockListType.provenance,
          isNonStrategic: mockListType.isNonStrategic,
          subJurisdictions: {
            create: allSubJurisdictions.map((sj) => ({
              subJurisdictionId: sj.subJurisdictionId
            }))
          }
        }
      });

      console.log(`✓ Migrated list type: ${mockListType.name}`);
    } catch (error) {
      console.error(`✗ Failed to migrate list type "${mockListType.name}":`, error);
    }
  }

  console.log("Migration complete!");
}

migrateMockData()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
