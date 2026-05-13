import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../../utils/sso-helpers.js";

test.describe
  .skip("Blob Explorer", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/system-admin-dashboard");
      await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
      await page.waitForURL("/system-admin-dashboard");
    });

    test("System admin can browse blob explorer locations and publications @nightly", async ({ page }) => {
      // STEP 1: Navigate from dashboard to Blob Explorer Locations
      await expect(page.getByRole("heading", { name: /System Admin Dashboard/i })).toBeVisible();

      // Find and click Blob Explorer tile
      const blobExplorerTile = page.locator('a.admin-tile[href="/blob-explorer-locations"]');
      await expect(blobExplorerTile).toBeVisible();
      await expect(blobExplorerTile).toContainText("Blob Explorer");
      await blobExplorerTile.click();

      // STEP 2: Verify Blob Explorer Locations page
      await expect(page).toHaveURL("/blob-explorer-locations");
      await expect(page.getByRole("heading", { name: /Blob Explorer Locations/i, level: 1 })).toBeVisible();

      // Check accessibility on locations page
      let accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Test Welsh translation on locations page
      await page.getByRole("link", { name: /Cymraeg/i }).click();
      await page.waitForURL(/lng=cy/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      // Switch back to English
      await page.getByRole("link", { name: /English/i }).click();
      await page.waitForURL(/lng=en/);

      // STEP 3: Verify table structure
      const locationTable = page.locator("table.govuk-table");
      await expect(locationTable).toBeVisible();

      // Check table headers
      await expect(page.getByRole("columnheader", { name: "Location" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Number of publications per venue" })).toBeVisible();

      // Test keyboard navigation
      await page.keyboard.press("Tab");

      // STEP 4: Select first location with publications (any location displayed has publications)
      const locationLinks = page.locator('a[href*="/blob-explorer-publications?locationId="]');
      const locationCount = await locationLinks.count();

      if (locationCount > 0) {
        await locationLinks.first().click();

        // STEP 5: Verify Publications page
        await expect(page).toHaveURL(/blob-explorer-publications.*locationId=/);
        await expect(page.getByRole("heading", { name: /Blob Explorer Publications/i })).toBeVisible();

        // Check accessibility on publications page
        accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
        expect(accessibilityScanResults.violations).toEqual([]);

        // Test Welsh on publications page
        await page.getByRole("link", { name: /Cymraeg/i }).click();
        await page.waitForURL(/lng=cy/);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await page.getByRole("link", { name: /English/i }).click();
        await page.waitForURL(/lng=en/);

        // STEP 6: Verify publications table
        const publicationsTable = page.locator("table.govuk-table");
        await expect(publicationsTable).toBeVisible();

        // Check for artefact links
        const artefactLinks = page.locator('a[href*="/blob-explorer-json-file?artefactId="]');
        const artefactCount = await artefactLinks.count();

        if (artefactCount > 0) {
          // STEP 7: Click first artefact to view JSON file page
          await artefactLinks.first().click();

          await expect(page).toHaveURL(/blob-explorer-json-file.*artefactId=/);
          await expect(page.getByRole("heading", { name: /Blob Explorer – JSON file/i })).toBeVisible();

          // Verify metadata table is visible
          const metadataTable = page.locator("table.govuk-table").first();
          await expect(metadataTable).toBeVisible();

          // Verify Re-submit subscription button exists
          const resubmitButton = page.getByRole("button", { name: /Re-submit subscription/i });
          await expect(resubmitButton).toBeVisible();

          // Check accessibility on JSON file page
          accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
          expect(accessibilityScanResults.violations).toEqual([]);

          // Test Welsh on JSON file page
          await page.getByRole("link", { name: /Cymraeg/i }).click();
          await page.waitForURL(/lng=cy/);
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
          await page.getByRole("link", { name: /English/i }).click();
          await page.waitForURL(/lng=en/);
        }
      }

      // Navigate back to locations
      await page.goto("/blob-explorer-locations");
      await expect(page).toHaveURL("/blob-explorer-locations");
    });
  });
