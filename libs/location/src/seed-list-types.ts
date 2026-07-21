import { listTypeData } from "@hmcts/list-types-common";
import { prisma } from "@hmcts/postgres-prisma";

export async function seedListTypes() {
  console.log("Checking if list type data seeding is needed...");

  // Skip seeding in production only — STG and other non-prod environments should be seeded.
  // Use ENVIRONMENT (set via Helm to the cluster environment name e.g. "stg", "prod")
  // rather than NODE_ENV, which is always "production" for any deployed Node.js server.
  if (process.env.ENVIRONMENT === "prod") {
    console.log("Skipping list type seed: ENVIRONMENT is prod");
    return;
  }

  if (process.env.CI === "true") {
    console.log("Skipping list type seed: Running in CI environment");
    return;
  }

  console.log("Seeding list types...");

  const allSubJurisdictions = await (prisma as any).subJurisdiction.findMany();

  if (allSubJurisdictions.length === 0) {
    throw new Error("No sub-jurisdictions found. Please ensure sub-jurisdictions are seeded first.");
  }

  for (const listType of listTypeData) {
    try {
      const relevantSubJurisdictions = allSubJurisdictions.filter((sj: any) => listType.subJurisdictionIds.includes(sj.subJurisdictionId));

      if (relevantSubJurisdictions.length === 0) {
        throw new Error(`No sub-jurisdictions resolved for list type "${listType.name}"`);
      }

      const upserted = await (prisma as any).listType.upsert({
        where: { name: listType.name },
        create: {
          name: listType.name,
          friendlyName: listType.englishFriendlyName,
          welshFriendlyName: listType.welshFriendlyName,
          shortenedFriendlyName: listType.shortenedFriendlyName ?? listType.englishFriendlyName,
          url: listType.urlPath || "",
          defaultSensitivity: listType.defaultSensitivity,
          allowedProvenance: listType.provenance,
          isNonStrategic: listType.isNonStrategic
        },
        update: {
          friendlyName: listType.englishFriendlyName,
          welshFriendlyName: listType.welshFriendlyName,
          shortenedFriendlyName: listType.shortenedFriendlyName ?? listType.englishFriendlyName,
          url: listType.urlPath || "",
          defaultSensitivity: listType.defaultSensitivity,
          allowedProvenance: listType.provenance,
          isNonStrategic: listType.isNonStrategic,
          // Re-activate a list type that was previously soft-deleted but re-added to listTypeData
          deletedAt: null
        }
      });

      for (const sj of relevantSubJurisdictions) {
        await (prisma as any).listTypeSubJurisdiction.upsert({
          where: {
            listTypeId_subJurisdictionId: {
              listTypeId: upserted.id,
              subJurisdictionId: sj.subJurisdictionId
            }
          },
          create: {
            listTypeId: upserted.id,
            subJurisdictionId: sj.subJurisdictionId
          },
          update: {}
        });
      }
    } catch (error) {
      console.error(`Failed to seed list type "${listType.name}":`, error);
      throw error;
    }
  }

  console.log(`Seeded ${listTypeData.length} list types`);

  // Reconcile removals: soft-delete any active list type no longer present in listTypeData
  // (e.g. CRIME_DAILY_LIST). Test list types live outside listTypeData and must be preserved.
  const activeNames = listTypeData.map((lt) => lt.name);
  const { count } = await (prisma as any).listType.updateMany({
    where: {
      deletedAt: null,
      name: { notIn: activeNames },
      NOT: [{ name: { startsWith: "TEST_" } }, { name: { startsWith: "E2E_" } }]
    },
    data: { deletedAt: new Date() }
  });
  console.log(`Soft-deleted ${count} list types no longer in listTypeData`);

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
