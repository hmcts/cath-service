/**
 * Dynamic Test Data Utilities
 *
 * These utilities enable fully isolated test data creation for parallel test execution.
 * Each test creates its own locations and artefacts using the test prefix from global-setup.
 * Cleanup happens automatically in global-teardown using the prefix.
 */

import { createTestLocation, getFirstSubJurisdiction } from "./test-support-api.js";
import { prefixName } from "./test-prefix.js";

/**
 * Generate a unique test identifier for this test instance.
 * Uses timestamp + random to ensure uniqueness across parallel workers.
 */
export function generateTestId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000);
  const workerId = process.env.TEST_WORKER_INDEX || "0";
  return `T${timestamp}_${random}_W${workerId}`;
}

interface TestLocationOptions {
  namePrefix?: string;
  welshNamePrefix?: string;
}

interface TestLocationResult {
  locationId: number;
  name: string;
  welshName: string;
}

/**
 * Create a unique test location using the test prefix.
 * The location is linked to existing sub-jurisdictions from reference data.
 * Cleanup happens automatically in global-teardown via prefix-based deletion.
 */
export async function createUniqueTestLocation(options: TestLocationOptions = {}): Promise<TestLocationResult> {
  const testId = generateTestId();
  const { namePrefix = "Test Court", welshNamePrefix = "Llys Prawf" } = options;

  // Use prefixName to ensure cleanup works
  const name = prefixName(`${namePrefix} ${testId}`);
  const welshName = prefixName(`${welshNamePrefix} ${testId}`);

  // Get a sub-jurisdiction to link to (from seeded reference data)
  const subJurisdiction = (await getFirstSubJurisdiction()) as { subJurisdictionId: number };

  const location = await createTestLocation({
    name,
    welshName,
    subJurisdictionIds: [subJurisdiction.subJurisdictionId]
  });

  return {
    locationId: location.locationId,
    name: location.name,
    welshName: location.welshName
  };
}
