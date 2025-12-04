import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "@hmcts/postgres";
import { parseCsv as parseProductionCsv } from "../../libs/system-admin-pages/src/reference-data-upload/parsers/csv-parser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function seedLocationData(): Promise<void> {
  try {
    console.log("=== Starting Location Data Seeding ===");

    const csvPath = path.join(__dirname, "..", "fixtures", "test-reference-data.csv");
    console.log(`Reading CSV from: ${csvPath}`);

    const csvBuffer = fs.readFileSync(csvPath);
    const parseResult = parseProductionCsv(csvBuffer);

    if (!parseResult.success) {
      const errorMsg = `CSV parsing failed: ${parseResult.errors.join(", ")}`;
      console.error(`✗ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const locations = parseResult.data;

    console.log(`✓ Parsed ${locations.length} locations from CSV`);
    console.log(`Location IDs: ${locations.map(l => l.locationId).join(", ")}`);

    for (const location of locations) {
      try {
        console.log(`\nProcessing location ${location.locationId}: ${location.locationName}`);

        // Create location
        await (prisma as any).location.upsert({
          where: { locationId: location.locationId },
          create: {
            locationId: location.locationId,
            name: location.locationName,
            welshName: location.welshLocationName,
            email: location.email || null,
            contactNo: location.contactNo || null,
          },
          update: {
            name: location.locationName,
            welshName: location.welshLocationName,
            email: location.email || null,
            contactNo: location.contactNo || null,
          },
        });
        console.log(`  ✓ Created location record`);

        // Get sub-jurisdiction IDs
        const subJurisdictions = await (prisma as any).subJurisdiction.findMany({
          where: {
            name: {
              in: location.subJurisdictionNames,
            },
          },
          select: { subJurisdictionId: true, name: true },
        });
        console.log(`  ✓ Found ${subJurisdictions.length} sub-jurisdictions: ${subJurisdictions.map((sj: any) => sj.name).join(", ")}`);

        if (subJurisdictions.length !== location.subJurisdictionNames.length) {
          console.warn(`  ⚠ Warning: Expected ${location.subJurisdictionNames.length} sub-jurisdictions but found ${subJurisdictions.length}`);
        }

        // Create location-subJurisdiction relationships
        for (const subJurisdiction of subJurisdictions) {
          await (prisma as any).locationSubJurisdiction.upsert({
            where: {
              locationId_subJurisdictionId: {
                locationId: location.locationId,
                subJurisdictionId: subJurisdiction.subJurisdictionId,
              },
            },
            create: {
              locationId: location.locationId,
              subJurisdictionId: subJurisdiction.subJurisdictionId,
            },
            update: {},
          });
        }
        console.log(`  ✓ Created ${subJurisdictions.length} sub-jurisdiction relationships`);

        // Get region IDs
        const regions = await (prisma as any).region.findMany({
          where: {
            name: {
              in: location.regionNames,
            },
          },
          select: { regionId: true, name: true },
        });
        console.log(`  ✓ Found ${regions.length} regions: ${regions.map((r: any) => r.name).join(", ")}`);

        if (regions.length !== location.regionNames.length) {
          console.warn(`  ⚠ Warning: Expected ${location.regionNames.length} regions but found ${regions.length}`);
        }

        // Create location-region relationships
        for (const region of regions) {
          await (prisma as any).locationRegion.upsert({
            where: {
              locationId_regionId: {
                locationId: location.locationId,
                regionId: region.regionId,
              },
            },
            create: {
              locationId: location.locationId,
              regionId: region.regionId,
            },
            update: {},
          });
        }
        console.log(`  ✓ Created ${regions.length} region relationships`);
        console.log(`  ✓ Successfully seeded location ${location.locationId}`);
      } catch (error) {
        console.error(`  ✗ Error seeding location ${location.locationId}:`, error);
        throw error;
      }
    }

    console.log(`\n✓ Successfully seeded ${locations.length} locations`);

    // Seed artefacts for Single Justice Procedure court (locationId 9)
    // This is needed for the summary-of-publications page to have data to display
    console.log("\n=== Seeding Test Artefacts ===");
    await seedSjpArtefacts();

    console.log("\n=== Location Data Seeding Complete ===");
  } catch (error) {
    console.error("\n✗ Fatal error during location data seeding:", error);
    throw error;
  }
}

async function seedSjpArtefacts(): Promise<void> {
  try {
    const sjpLocationId = "9";
    console.log(`Seeding artefacts for locationId ${sjpLocationId} (Test SJP Court)`);

    // Create multiple test artefacts for different dates and list types
    // Use dates relative to now to ensure they're always visible
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekFromNow = new Date(today);
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    const testArtefacts = [
      {
        locationId: sjpLocationId,
        listTypeId: 6, // Crown Daily List (CRIME_IDAM)
        contentDate: yesterday,
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: oneWeekAgo,
        displayTo: oneWeekFromNow,
        isFlatFile: false,
        provenance: "CRIME_IDAM",
      },
      {
        locationId: sjpLocationId,
        listTypeId: 7, // Crown Firm List (CRIME_IDAM)
        contentDate: today,
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: oneWeekAgo,
        displayTo: oneWeekFromNow,
        isFlatFile: false,
        provenance: "CRIME_IDAM",
      },
      {
        locationId: sjpLocationId,
        listTypeId: 1, // Civil Daily Cause List (CFT_IDAM)
        contentDate: twoDaysAgo,
        sensitivity: "PRIVATE",
        language: "ENGLISH",
        displayFrom: oneWeekAgo,
        displayTo: oneWeekFromNow,
        isFlatFile: false,
        provenance: "CFT_IDAM",
      },
      {
        artefactId: "00000000-0000-0000-0000-000000000001", // Known ID for E2E testing
        locationId: sjpLocationId,
        listTypeId: 8, // Civil and Family Daily Cause List (CFT_IDAM) - CLASSIFIED
        contentDate: yesterday,
        sensitivity: "CLASSIFIED",
        language: "ENGLISH",
        displayFrom: oneWeekAgo,
        displayTo: oneWeekFromNow,
        isFlatFile: false,
        provenance: "CFT_IDAM",
      },
    ];

    console.log(`Creating ${testArtefacts.length} artefacts...`);

    for (const artefact of testArtefacts) {
      const created = await prisma.artefact.create({
        data: artefact,
      });
      console.log(`  ✓ Created artefact ${created.artefactId}: listType=${artefact.listTypeId}, date=${artefact.contentDate.toISOString().split('T')[0]}`);
    }

    console.log(`✓ Successfully seeded ${testArtefacts.length} artefacts for locationId ${sjpLocationId}`);
  } catch (error) {
    console.error("✗ Error seeding artefacts:", error);
    throw error;
  }
}
