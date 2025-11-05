import fs from "node:fs";
import path from "node:path";
import { prisma } from "@hmcts/postgres";

const ARTEFACT_TRACKING_FILE = path.join(process.cwd(), ".test-artefacts.json");
const STORAGE_PATH = path.join(process.cwd(), "..", "apps", "web", "storage", "temp", "uploads");

async function globalTeardown() {
  try {
    console.log("Cleaning up E2E test data...");

    // Read existing artefact IDs that were present before tests
    let existingIds: string[] = [];
    if (fs.existsSync(ARTEFACT_TRACKING_FILE)) {
      existingIds = JSON.parse(fs.readFileSync(ARTEFACT_TRACKING_FILE, "utf-8"));
    }

    // Get all current artefact IDs
    const currentArtefacts = await prisma.artefact.findMany({
      select: { artefactId: true }
    });

    // Find artefacts created during tests (not in existing list)
    const newArtefactIds = currentArtefacts
      .map((a) => a.artefactId)
      .filter((id) => !existingIds.includes(id));

    // Clean up database records
    if (newArtefactIds.length > 0) {
      const result = await prisma.artefact.deleteMany({
        where: {
          artefactId: {
            in: newArtefactIds
          }
        }
      });
      console.log(`Deleted ${result.count} test artefact(s) from database`);
    } else {
      console.log("No test artefacts to delete from database");
    }

    // Clean up files - only delete files for test artefacts
    if (fs.existsSync(STORAGE_PATH) && newArtefactIds.length > 0) {
      const currentFiles = fs.readdirSync(STORAGE_PATH);

      // Only delete files that match test artefact IDs
      const testFilesToDelete = currentFiles.filter((file) => {
        // Extract artefactId from filename (remove extension)
        const fileNameWithoutExt = path.parse(file).name;
        // Check if this file belongs to a test artefact
        return newArtefactIds.includes(fileNameWithoutExt);
      });

      if (testFilesToDelete.length > 0) {
        for (const file of testFilesToDelete) {
          const filePath = path.join(STORAGE_PATH, file);
          fs.unlinkSync(filePath);
        }
        console.log(`Deleted ${testFilesToDelete.length} test file(s) from storage`);
      } else {
        console.log("No test files to delete from storage");
      }
    }

    // Clean up tracking file
    if (fs.existsSync(ARTEFACT_TRACKING_FILE)) {
      fs.unlinkSync(ARTEFACT_TRACKING_FILE);
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error("Error during teardown:", error);
    await prisma.$disconnect();
    throw error;
  }
}

export default globalTeardown;
