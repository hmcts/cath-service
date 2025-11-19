import fs from "node:fs";
import path from "node:path";
import { prisma } from "@hmcts/postgres";
import { seedAllReferenceData } from "./utils/seed-reference-data.js";
import { loginWithSSO } from "./utils/sso-helpers.js";
import { chromium, type FullConfig } from "@playwright/test";
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

    // Step 4: Upload location data through the UI (required for proper location setup)
    console.log("Setting up test locations through reference data upload...");
    const browser = await chromium.launch();
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    // Wait for the web server to be ready
    const baseURL = config.projects[0].use?.baseURL || "https://localhost:8080";
    for (let i = 0; i < maxRetries; i++) {
      try {
        await page.goto(`${baseURL}/`, { timeout: 5000 });
        break;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Authenticate as System Admin
    await page.goto(`${baseURL}/system-admin-dashboard`);

    if (page.url().includes("login.microsoftonline.com")) {
      const systemAdminEmail = process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!;
      const systemAdminPassword = process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!;
      await loginWithSSO(page, systemAdminEmail, systemAdminPassword);
    }

    // Navigate to reference data upload page
    await page.goto(`${baseURL}/reference-data-upload`);
    await page.waitForSelector("h1:has-text('Upload reference data')");

    // Upload the CSV file
    const csvPath = path.join(__dirname, "fixtures", "test-reference-data.csv");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Submit the form
    const continueButton = page.getByRole("button", { name: /continue/i });
    await continueButton.click();

    // Wait for upload summary page
    await page.waitForURL(/\/reference-data-upload-summary/, { timeout: 10000 });

    // Confirm the upload
    const confirmButton = page.getByRole("button", { name: /confirm/i });
    await confirmButton.click();

    // Wait for confirmation page
    await page.waitForURL("/reference-data-upload-confirmation", { timeout: 10000 });

    await browser.close();
    console.log("Location data uploaded successfully (locations 9001-9010 are now available)");

    // Step 5: Query all existing artefact IDs before tests run
    const existingArtefacts = await prisma.artefact.findMany({
      select: { artefactId: true }
    });

    const existingIds = existingArtefacts.map((a) => a.artefactId);

    // Store existing IDs to tracking file
    fs.writeFileSync(ARTEFACT_TRACKING_FILE, JSON.stringify(existingIds, null, 2));
    console.log(`Stored ${existingIds.length} existing artefact(s) before E2E tests`);

    // Step 6: Query all existing location IDs before tests run
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
