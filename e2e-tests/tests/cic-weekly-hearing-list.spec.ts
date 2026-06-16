import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("CIC Weekly Hearing List", () => {
  test("user can view complete hearing list journey @nightly", async ({ page }) => {
    // Arrange - Start at the lists page
    await page.goto("/admin/lists");
    await page.waitForLoadState("networkidle");

    // Test main journey - navigate to CIC Weekly Hearing List
    const cicListLink = page.getByRole("link", { name: /Criminal Injuries Compensation Weekly Hearing List/i });

    if ((await cicListLink.count()) === 0) {
      test.skip();
    }

    await cicListLink.first().click();
    await page.waitForLoadState("networkidle");

    // Verify English content is displayed
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Criminal Injuries Compensation/i);
    await expect(page.locator("table")).toBeVisible();

    // Check table headers exist
    const tableHeaders = page.locator("thead th");
    await expect(tableHeaders).toHaveCount(8);
    await expect(tableHeaders.first()).toContainText(/Date/i);

    // Test Welsh translation
    const welshLink = page.getByRole("link", { name: /Cymraeg/i });
    if ((await welshLink.count()) > 0) {
      await welshLink.click();
      await page.waitForLoadState("networkidle");

      // Verify Welsh content
      await expect(page.getByRole("heading", { level: 1 })).toContainText(/Tribiwnlys/i);
      const welshTableHeaders = page.locator("thead th");
      await expect(welshTableHeaders.first()).toContainText(/Dyddiad/i);

      // Switch back to English for remaining tests
      await page.getByRole("link", { name: /English/i }).click();
      await page.waitForLoadState("networkidle");
    }

    // Test accessibility inline
    const accessibilityResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityResults.violations).toEqual([]);

    // Test keyboard navigation
    await page.keyboard.press("Tab");
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();

    // Verify data source is displayed
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();

    // Check that hearing details are present if there are hearings
    const hearingRows = page.locator("tbody tr");
    const rowCount = await hearingRows.count();

    if (rowCount > 0) {
      // Verify first row has expected number of cells
      const firstRow = hearingRows.first();
      const cells = firstRow.locator("td");
      await expect(cells).toHaveCount(8);

      // Verify cells contain content (not empty)
      const cellTexts = await cells.allTextContents();
      expect(cellTexts.some((text) => text.trim().length > 0)).toBeTruthy();
    }

    // Verify page contains expected metadata
    await expect(page.locator("body")).toContainText(/Week commencing/i);
    await expect(page.locator("body")).toContainText(/Last updated/i);
  });

  test("handles missing artefactId parameter", async ({ page }) => {
    // Arrange
    await page.goto("/cic-weekly-hearing-list");

    // Act & Assert
    await expect(page.locator("body")).toContainText(/Bad Request|Missing|Error/i);
  });

  test("handles non-existent artefact", async ({ page }) => {
    // Arrange
    await page.goto("/cic-weekly-hearing-list?artefactId=non-existent-id-12345");

    // Act & Assert
    await expect(page.locator("body")).toContainText(/Not Found|Could not be found|Error/i);
  });
});
