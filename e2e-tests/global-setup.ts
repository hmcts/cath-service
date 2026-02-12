import fs from "node:fs";
import path from "node:path";
import { prisma } from "@hmcts/postgres";
import { seedAllReferenceData } from "./utils/seed-reference-data.js";
import { seedListTypes } from "./utils/seed-list-types.js";
import { seedLocationData } from "./utils/seed-location-data.js";
import { verifySeedData } from "./utils/verify-seed-data.js";
import type { FullConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTEFACT_TRACKING_FILE = path.join(process.cwd(), ".test-artefacts.json");
const LOCATION_TRACKING_FILE = path.join(process.cwd(), ".test-locations.json");

async function globalSetup(config: FullConfig) {
  try {
    // Step 1: Wait for database connection
    console.log("Waiting for database connection...");
    const maxRetries = 30;
    let connected = false;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await prisma.$connect();
        console.log("Database connection established");
        connected = true;
        break;
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error(`Failed to connect to database after ${maxRetries} attempts`);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (!connected) {
      throw new Error("Could not establish database connection");
    }

    // Step 2: Wait for database migrations to complete by checking if tables exist
    console.log("Waiting for database migrations to complete...");
    let migrationsComplete = false;

    for (let i = 0; i < maxRetries; i++) {
      try {
        // Try to query the jurisdiction table to see if migrations are complete
        await (prisma as any).jurisdiction.findMany({ take: 1 });
        console.log("Database migrations completed");
        migrationsComplete = true;
        break;
      } catch (error) {
        if (i === maxRetries - 1) {
          console.error("Database migrations did not complete in time");
          throw new Error("Database migrations did not complete. Please ensure the web server is running and migrations have been applied.");
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    if (!migrationsComplete) {
      throw new Error("Database migrations did not complete");
    }

    // Step 3: Seed jurisdictions, sub-jurisdictions, and regions
    console.log("Seeding reference data (jurisdictions, sub-jurisdictions, regions)...");
    await seedAllReferenceData();

    // Step 4: Seed list types (required for VIBE-309 Configure List Type feature)
    console.log("Seeding list types...");
    await seedListTypes();

    // Step 5: Seed location data directly (avoids SSO issues in CI)
    console.log("Seeding test location data...");
    await seedLocationData();

    // Step 6: Verify all seed data is correct
    console.log("\nVerifying seed data...");
    const verificationResult = await verifySeedData();

    if (!verificationResult.success) {
      throw new Error(`Seed data verification failed:\n${verificationResult.errors.join("\n")}`);
    }

    if (verificationResult.warnings.length > 0) {
      console.warn("Seed data has warnings (non-fatal):", verificationResult.warnings);
    }

    // Step 7: Query all existing artefact IDs before tests run
    const existingArtefacts = await prisma.artefact.findMany({
      select: { artefactId: true }
    });

    const existingIds = existingArtefacts.map((a) => a.artefactId);

    // Store existing IDs to tracking file
    fs.writeFileSync(ARTEFACT_TRACKING_FILE, JSON.stringify(existingIds, null, 2));
    console.log(`Stored ${existingIds.length} existing artefact(s) before E2E tests`);

    // Step 8: Query all existing location IDs before tests run
    const existingLocations = await (prisma as any).location.findMany({
      select: { locationId: true }
    });

    const existingLocationIds = existingLocations.map((l: any) => l.locationId);

    // Store existing location IDs to tracking file
    fs.writeFileSync(LOCATION_TRACKING_FILE, JSON.stringify(existingLocationIds, null, 2));
    console.log(`Stored ${existingLocationIds.length} existing location(s) before E2E tests`);

    await prisma.$disconnect();
  } catch (error) {
    console.error("Error during setup:", error);
    await prisma.$disconnect();
    throw error;
  }
}

export default globalSetup;
