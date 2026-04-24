import type { FullConfig } from "@playwright/test";
import { seedListTypes } from "./utils/seed-list-types.js";
import { seedLocationData } from "./utils/seed-location-data.js";
import { seedAllReferenceData } from "./utils/seed-reference-data.js";
import { checkTestSupportHealth } from "./utils/test-support-api.js";
import { generateTestPrefix, setTestPrefix } from "./utils/test-prefix.js";
import { verifySeedData } from "./utils/verify-seed-data.js";

async function globalSetup(_config: FullConfig) {
  try {
    // Step 1: Generate and store test prefix for this run
    const testPrefix = generateTestPrefix();
    setTestPrefix(testPrefix);
    console.log(`\n=== E2E Test Run: ${testPrefix} ===\n`);

    // Step 2: Wait for API and database to be ready
    console.log("Waiting for API and database to be ready...");
    const maxRetries = 30;
    let ready = false;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const health = await checkTestSupportHealth();
        if (health.status === "healthy" && health.migrations === "complete") {
          console.log("API and database are ready");
          ready = true;
          break;
        }
        if (health.migrations === "pending") {
          console.log(`Attempt ${i + 1}/${maxRetries}: Database migrations pending...`);
        }
      } catch (_error) {
        console.log(`Attempt ${i + 1}/${maxRetries}: Waiting for API...`);
      }

      if (i === maxRetries - 1) {
        throw new Error("API or database did not become ready. Please ensure the API server is running and migrations have been applied.");
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (!ready) {
      throw new Error("API or database did not become ready");
    }

    // Step 3: Seed reference data (jurisdictions, sub-jurisdictions, regions)
    // These don't use the prefix as they're stable lookup data
    console.log("Seeding reference data (jurisdictions, sub-jurisdictions, regions)...");
    await seedAllReferenceData();

    // Step 4: Seed list types with test prefix
    console.log("Seeding list types...");
    await seedListTypes(testPrefix);

    // Step 5: Seed location data with test prefix
    console.log("Seeding test location data...");
    await seedLocationData(testPrefix);

    // Step 6: Verify all seed data is correct
    console.log("\nVerifying seed data...");
    const verificationResult = await verifySeedData();

    if (!verificationResult.success) {
      throw new Error(`Seed data verification failed:\n${verificationResult.errors.join("\n")}`);
    }

    if (verificationResult.warnings.length > 0) {
      console.warn("Seed data has warnings (non-fatal):", verificationResult.warnings);
    }

    console.log(`\n=== Setup Complete: ${testPrefix} ===\n`);
  } catch (error) {
    console.error("Error during setup:", error);
    throw error;
  }
}

export default globalSetup;
