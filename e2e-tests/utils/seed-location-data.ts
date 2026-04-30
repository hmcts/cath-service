import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv as parseProductionCsv } from "../../libs/system-admin-pages/src/reference-data-upload/parsers/csv-parser.js";
import { createTestArtefact, getListTypeByName, seedLocationsFromCsv } from "./test-support-api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function seedLocationData(prefix: string): Promise<void> {
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

    // Add prefix to location names for test isolation
    const locations = parseResult.data.map((loc) => ({
      ...loc,
      locationName: `${prefix}${loc.locationName}`,
      welshLocationName: `${prefix}${loc.welshLocationName || loc.locationName}`
    }));

    console.log(`✓ Parsed ${locations.length} locations from CSV`);
    console.log(`Location IDs: ${locations.map((l) => l.locationId).join(", ")}`);

    // Seed all locations via API
    const result = await seedLocationsFromCsv(locations);
    console.log(`✓ Successfully seeded ${result.seeded} locations via API with prefix: ${prefix}`);

    // Seed artefacts for Single Justice Procedure court (locationId 9)
    console.log("\n=== Seeding Test Artefacts ===");
    await seedSjpArtefacts(prefix);

    console.log("\n=== Location Data Seeding Complete ===");
  } catch (error) {
    console.error("\n✗ Fatal error during location data seeding:", error);
    throw error;
  }
}

async function seedSjpArtefacts(prefix: string): Promise<void> {
  try {
    const sjpLocationId = "9";
    console.log(`Seeding artefacts for locationId ${sjpLocationId} (Test SJP Court)`);

    // Look up list type IDs dynamically using prefixed names
    const listTypeNames = [
      { name: "CROWN_DAILY_LIST", sensitivity: "PUBLIC", provenance: "CRIME_IDAM" },
      { name: "CROWN_FIRM_LIST", sensitivity: "PUBLIC", provenance: "CRIME_IDAM" },
      { name: "CIVIL_DAILY_CAUSE_LIST", sensitivity: "PRIVATE", provenance: "CFT_IDAM" },
      { name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST", sensitivity: "CLASSIFIED", provenance: "CFT_IDAM" }
    ];

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

    const contentDates = [yesterday, today, twoDaysAgo, yesterday];
    let createdCount = 0;

    for (let i = 0; i < listTypeNames.length; i++) {
      const { name, sensitivity, provenance } = listTypeNames[i];
      const prefixedName = `${prefix}${name}`;

      try {
        const listType = (await getListTypeByName(prefixedName)) as { id: number } | null;
        if (!listType) {
          console.log(`  ⚠ List type ${prefixedName} not found, skipping artefact`);
          continue;
        }

        const artefact = {
          locationId: sjpLocationId,
          listTypeId: listType.id,
          contentDate: contentDates[i].toISOString(),
          sensitivity,
          language: "ENGLISH",
          displayFrom: oneWeekAgo.toISOString(),
          displayTo: oneWeekFromNow.toISOString(),
          isFlatFile: false,
          provenance
        };

        const created = await createTestArtefact(artefact);
        console.log(`  ✓ Created artefact ${created.artefactId}: listType=${name}`);
        createdCount++;
      } catch (error) {
        console.log(`  ⚠ Failed to create artefact for ${name}:`, error);
      }
    }

    console.log(`✓ Successfully seeded ${createdCount} artefacts for locationId ${sjpLocationId}`);
  } catch (error) {
    console.error("✗ Error seeding artefacts:", error);
    throw error;
  }
}
