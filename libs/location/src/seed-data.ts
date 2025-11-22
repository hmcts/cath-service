import { prisma } from "@hmcts/postgres";
import { locationData } from "./location-data.js";

export async function seedLocationData() {
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
