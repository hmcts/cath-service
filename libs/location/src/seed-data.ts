import { prisma } from "@hmcts/postgres-prisma";
import { locationData } from "./location-data.js";
import { seedListTypes } from "./seed-list-types.js";

async function shouldSeed(): Promise<boolean> {
  // Skip seeding in production only — STG and other non-prod environments should be seeded.
  // Use ENVIRONMENT (set via Helm to the cluster environment name e.g. "stg", "prod")
  // rather than NODE_ENV, which is always "production" for any deployed Node.js server.
  if (process.env.ENVIRONMENT === "prod") {
    console.log("Skipping seed: ENVIRONMENT is prod");
    return false;
  }

  if (process.env.CI === "true") {
    console.log("Skipping seed: Running in CI environment");
    return false;
  }

  // Check if tables are empty
  const regionCount = await prisma.region.count();
  const jurisdictionCount = await prisma.jurisdiction.count();
  const subJurisdictionCount = await prisma.subJurisdiction.count();
  const locationCount = await prisma.location.count();

  // Only seed if all tables are empty — checking subJurisdiction prevents partial state issues
  const isEmpty = regionCount === 0 && jurisdictionCount === 0 && subJurisdictionCount === 0 && locationCount === 0;

  if (!isEmpty) {
    console.log("Skipping seed: Tables already contain data");
    return false;
  }

  return true;
}

// TODO: Remove this function once staging has been reseeded successfully
async function clearJurisdictionData() {
  if (process.env.ENVIRONMENT === "prod" || process.env.CI === "true") {
    return;
  }

  console.log("Clearing stale jurisdiction and sub-jurisdiction data...");
  await (prisma as any).listTypeSubJurisdiction.deleteMany({});
  await prisma.locationSubJurisdiction.deleteMany({});
  await prisma.subJurisdiction.deleteMany({});
  await prisma.jurisdiction.deleteMany({});
  console.log("Cleared jurisdiction data");
}

export async function seedLocationData() {
  console.log("Checking if location data seeding is needed...");

  await clearJurisdictionData();

  const needsSeeding = await shouldSeed();
  if (!needsSeeding) {
    // Seed list types even for existing DBs to pick up new entries added since initial seed
    await seedListTypes();
    return;
  }

  console.log("Seeding location reference data...");

  // Seed regions
  console.log("Seeding regions...");
  for (const region of locationData.regions) {
    await prisma.region.upsert({
      where: { regionId: region.regionId },
      create: {
        regionId: region.regionId,
        name: region.name,
        welshName: region.welshName
      },
      update: {
        name: region.name,
        welshName: region.welshName
      }
    });
  }
  console.log(`Seeded ${locationData.regions.length} regions`);

  // Seed jurisdictions
  console.log("Seeding jurisdictions...");
  for (const jurisdiction of locationData.jurisdictions) {
    await prisma.jurisdiction.upsert({
      where: { jurisdictionId: jurisdiction.jurisdictionId },
      create: {
        jurisdictionId: jurisdiction.jurisdictionId,
        name: jurisdiction.name,
        welshName: jurisdiction.welshName
      },
      update: {
        name: jurisdiction.name,
        welshName: jurisdiction.welshName
      }
    });
  }
  console.log(`Seeded ${locationData.jurisdictions.length} jurisdictions`);

  // Seed sub-jurisdictions
  console.log("Seeding sub-jurisdictions...");
  for (const subJurisdiction of locationData.subJurisdictions) {
    await prisma.subJurisdiction.upsert({
      where: { subJurisdictionId: subJurisdiction.subJurisdictionId },
      create: {
        subJurisdictionId: subJurisdiction.subJurisdictionId,
        name: subJurisdiction.name,
        welshName: subJurisdiction.welshName,
        jurisdictionId: subJurisdiction.jurisdictionId
      },
      update: {
        name: subJurisdiction.name,
        welshName: subJurisdiction.welshName,
        jurisdictionId: subJurisdiction.jurisdictionId
      }
    });
  }
  console.log(`Seeded ${locationData.subJurisdictions.length} sub-jurisdictions`);

  // Seed list types
  await seedListTypes();

  // Seed locations
  console.log("Seeding locations...");
  for (const location of locationData.locations) {
    await prisma.location.upsert({
      where: { locationId: location.locationId },
      create: {
        locationId: location.locationId,
        name: location.name,
        welshName: location.welshName,
        email: null,
        contactNo: null
      },
      update: {
        name: location.name,
        welshName: location.welshName
      }
    });

    // Delete existing junction records
    await prisma.locationRegion.deleteMany({
      where: { locationId: location.locationId }
    });

    await prisma.locationSubJurisdiction.deleteMany({
      where: { locationId: location.locationId }
    });

    // Create new junction records
    if (location.regions.length > 0) {
      await prisma.locationRegion.createMany({
        data: location.regions.map((regionId) => ({
          locationId: location.locationId,
          regionId
        }))
      });
    }

    if (location.subJurisdictions.length > 0) {
      await prisma.locationSubJurisdiction.createMany({
        data: location.subJurisdictions.map((subJurisdictionId) => ({
          locationId: location.locationId,
          subJurisdictionId
        }))
      });
    }

    await prisma.locationReference.deleteMany({
      where: { locationId: location.locationId }
    });

    await prisma.locationReference.create({
      data: {
        locationId: location.locationId,
        provenance: "SNL",
        provenanceLocationId: String(location.locationId + 100),
        provenanceLocationType: "VENUE"
      }
    });
  }
  console.log(`Seeded ${locationData.locations.length} locations`);

  console.log("Location reference data seeding completed successfully");
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedLocationData()
    .then(() => {
      console.log("Seed script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seed script failed:", error);
      process.exit(1);
    });
}
