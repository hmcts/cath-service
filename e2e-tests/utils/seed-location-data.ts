import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "@hmcts/postgres";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CsvLocation {
  locationId: number;
  locationName: string;
  welshLocationName: string;
  email: string;
  contactNo: string;
  subJurisdictionNames: string[];
  regionNames: string[];
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCsv(csvContent: string): CsvLocation[] {
  const lines = csvContent.split("\n").filter((line) => line.trim());
  const locations: CsvLocation[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);

    if (values.length < 7) continue;

    const [
      locationId,
      locationName,
      welshLocationName,
      email,
      contactNo,
      subJurisdictionNames,
      regionNames,
    ] = values;

    locations.push({
      locationId: Number.parseInt(locationId, 10),
      locationName,
      welshLocationName,
      email,
      contactNo,
      subJurisdictionNames: subJurisdictionNames
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean),
      regionNames: regionNames
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }

  return locations;
}

export async function seedLocationData(): Promise<void> {
  try {
    console.log("=== Starting Location Data Seeding ===");

    const csvPath = path.join(__dirname, "..", "fixtures", "test-reference-data.csv");
    console.log(`Reading CSV from: ${csvPath}`);

    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const locations = parseCsv(csvContent);

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

    // Seed artefacts for Single Justice Procedure court (locationId 9009)
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
    const sjpLocationId = "9009";
    console.log(`Seeding artefacts for locationId ${sjpLocationId} (Test SJP Court)`);

    // Create multiple test artefacts for different dates and list types
    const testArtefacts = [
      {
        locationId: sjpLocationId,
        listTypeId: 6, // Crown Daily List
        contentDate: new Date("2025-10-23"),
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: new Date("2025-10-20"),
        displayTo: new Date("2025-10-30"),
      },
      {
        locationId: sjpLocationId,
        listTypeId: 7, // Crown Warned List
        contentDate: new Date("2025-10-24"),
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: new Date("2025-10-21"),
        displayTo: new Date("2025-10-31"),
      },
      {
        locationId: sjpLocationId,
        listTypeId: 1, // Family Daily Cause List
        contentDate: new Date("2025-10-25"),
        sensitivity: "PRIVATE",
        language: "ENGLISH",
        displayFrom: new Date("2025-10-22"),
        displayTo: new Date("2025-11-01"),
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
