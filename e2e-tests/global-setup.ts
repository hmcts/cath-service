import fs from "node:fs";
import path from "node:path";
import { prisma } from "@hmcts/postgres";

const ARTEFACT_TRACKING_FILE = path.join(process.cwd(), ".test-artefacts.json");
const LOCATION_TRACKING_FILE = path.join(process.cwd(), ".test-locations.json");

async function globalSetup() {
  try {
    // Query all existing artefact IDs before tests run
    const existingArtefacts = await prisma.artefact.findMany({
      select: { artefactId: true }
    });

    const existingIds = existingArtefacts.map((a) => a.artefactId);

    // Store existing IDs to tracking file
    fs.writeFileSync(ARTEFACT_TRACKING_FILE, JSON.stringify(existingIds, null, 2));
    console.log(`Stored ${existingIds.length} existing artefact(s) before E2E tests`);

    // Query all existing location IDs before tests run
    const existingLocations = await prisma.location.findMany({
      select: { locationId: true }
    });

    const existingLocationIds = existingLocations.map((l) => l.locationId);

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
