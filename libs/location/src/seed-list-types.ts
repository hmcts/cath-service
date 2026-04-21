import { prisma } from "@hmcts/postgres";
import { listTypeData } from "./list-type-data.js";

const CIVIL_FAMILY_JURISDICTION_IDS = [1, 2];
const CRIME_JURISDICTION_IDS = [3];

async function shouldSeed(): Promise<boolean> {
  // Only seed in local development, not in CI or production
  if (process.env.NODE_ENV === "production") {
    console.log("Skipping list type seed: NODE_ENV is production");
    return false;
  }

  if (process.env.CI === "true") {
    console.log("Skipping list type seed: Running in CI environment");
    return false;
  }

  // Check if list types table is empty
  const listTypeCount = await (prisma as any).listType.count();

  // Only seed if table is empty
  if (listTypeCount > 0) {
    console.log("Skipping list type seed: Table already contains data");
    return false;
  }

  return true;
}

function getJurisdictionIdsForProvenance(provenance: string): number[] {
  const ids: number[] = [];
  if (provenance.includes("CFT_IDAM")) ids.push(...CIVIL_FAMILY_JURISDICTION_IDS);
  if (provenance.includes("CRIME_IDAM")) ids.push(...CRIME_JURISDICTION_IDS);
  return ids;
}

export async function seedListTypes() {
  console.log("Checking if list type data seeding is needed...");

  const needsSeeding = await shouldSeed();
  if (!needsSeeding) {
    return;
  }

  console.log("Seeding list types...");

  // Get all sub-jurisdictions to link list types
  const allSubJurisdictions = await (prisma as any).subJurisdiction.findMany();

  if (allSubJurisdictions.length === 0) {
    throw new Error("No sub-jurisdictions found. Please ensure sub-jurisdictions are seeded first.");
  }

  let seededCount = 0;

  for (const listType of listTypeData) {
    try {
      const relevantSubJurisdictions = listType.subJurisdictionIds
        ? allSubJurisdictions.filter((sj: any) => listType.subJurisdictionIds!.includes(sj.subJurisdictionId))
        : allSubJurisdictions.filter((sj: any) => getJurisdictionIdsForProvenance(listType.provenance).includes(sj.jurisdictionId));

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

  console.log(`Seeded ${listTypeData.length} list types`);
  console.log("List type seeding completed successfully");
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await seedListTypes();
    console.log("Seed script completed");
    process.exit(0);
  } catch (error) {
    console.error("Seed script failed:", error);
    process.exit(1);
  }
}
