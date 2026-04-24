import { cleanupTestDataByPrefix } from "./utils/test-support-api.js";
import { clearTestPrefix, getTestPrefix } from "./utils/test-prefix.js";

async function globalTeardown() {
  try {
    console.log("\n=== Cleaning up E2E test data ===\n");

    let testPrefix: string;
    try {
      testPrefix = getTestPrefix();
    } catch {
      console.log("No test prefix found - skipping cleanup");
      return;
    }

    console.log(`Cleaning up data with prefix: ${testPrefix}`);

    try {
      const result = await cleanupTestDataByPrefix(testPrefix);
      console.log(`Cleanup complete: deleted ${result.deleted} records`);
      console.log("Details:", result.details);
    } catch (error) {
      console.error("Error during cleanup (non-fatal):", error);
    }

    // Clear the prefix file
    clearTestPrefix();

    console.log(`\n=== Teardown Complete: ${testPrefix} ===\n`);
  } catch (error) {
    console.error("Error during teardown:", error);
    // Don't throw - teardown errors shouldn't fail the test run
  }
}

export default globalTeardown;
