import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv as parseProductionCsv } from "../../libs/system-admin-pages/src/reference-data-upload/parsers/csv-parser.js";
import { seedLocationsFromCsv } from "./test-support-api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, "..", "fixtures", "test-reference-data.csv");

function parseSeedCsv() {
  const parseResult = parseProductionCsv(fs.readFileSync(CSV_PATH));
  if (!parseResult.success) {
    throw new Error(`CSV parsing failed: ${parseResult.errors.join(", ")}`);
  }
  return parseResult.data;
}

// The location IDs global setup seeds, so verification checks the fixture rather than a hard-coded count
export function getSeedLocationIds(): number[] {
  return parseSeedCsv().map((loc) => loc.locationId);
}

export async function seedLocationData(prefix: string): Promise<void> {
  try {
    console.log("=== Starting Location Data Seeding ===");
    console.log(`Reading CSV from: ${CSV_PATH}`);

    // Add prefix to location names for test isolation
    const locations = parseSeedCsv().map((loc) => ({
      ...loc,
      locationName: `${prefix}${loc.locationName}`,
      welshLocationName: `${prefix}${loc.welshLocationName || loc.locationName}`
    }));

    console.log(`✓ Parsed ${locations.length} locations from CSV`);
    console.log(`Location IDs: ${locations.map((l) => l.locationId).join(", ")}`);

    // Seed all locations via API
    const result = await seedLocationsFromCsv(locations);
    console.log(`✓ Successfully seeded ${result.seeded} locations via API with prefix: ${prefix}`);

    console.log("\n=== Location Data Seeding Complete ===");
  } catch (error) {
    console.error("\n✗ Fatal error during location data seeding:", error);
    throw error;
  }
}
