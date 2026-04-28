import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../../utils/sso-helpers.js";

test.describe
  .skip("Audit Log Viewer", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/system-admin-dashboard");
      await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
      await page.waitForURL("/system-admin-dashboard");
    });

    test("system admin can view audit log list and apply filters", async ({ page }) => {
      // Navigate from dashboard to audit log viewer
      await page.click('a:has-text("Audit Log Viewer")');
      await page.waitForURL("**/audit-log-list");

      // Verify page loaded with correct heading
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
      await expect(heading).toHaveText("Audit log viewer");

      // Verify table structure
      const table = page.locator("table.govuk-table");
      await expect(table).toBeVisible();
      await expect(page.locator("th:has-text('Timestamp')")).toBeVisible();
      await expect(page.locator("th:has-text('Email')")).toBeVisible();
      await expect(page.locator("th:has-text('Action')")).toBeVisible();
      await expect(page.locator("th:has-text('View')")).toBeVisible();

      // Verify filter panel
      const filterHeading = page.locator("h2:has-text('Filter')");
      await expect(filterHeading).toBeVisible();

      // Test filter functionality
      const emailInput = page.locator('input[name="email"]');
      await expect(emailInput).toBeVisible();
      await emailInput.fill(process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!);

      const applyButton = page.locator('button:has-text("Apply filters")');
      await applyButton.click();
      await page.waitForURL(/.*email=.*/);

      const emailParam = new URL(page.url()).searchParams.get("email");
      expect(emailParam).toBe(process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!);

      // Clear filters if link exists
      const clearLink = page.locator('a:has-text("Clear filters")');
      if ((await clearLink.count()) > 0) {
        await clearLink.click();
        await page.waitForURL(/audit-log-list/);
      }

      // Accessibility check
      const accessibilityResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(accessibilityResults.violations).toEqual([]);

      // Test keyboard navigation
      const skipLink = page.locator("a.govuk-skip-link");
      await skipLink.focus();
      await expect(skipLink).toBeFocused();
    });

    test("audit log viewer displays correctly in Welsh @nightly", async ({ page }) => {
      // Navigate to audit log viewer
      await page.click('a:has-text("Audit Log Viewer")');
      await page.waitForURL("**/audit-log-list");

      // Switch to Welsh
      await page.click('a:has-text("Cymraeg")');
      await page.waitForURL("**/audit-log-list?lng=cy");

      // Verify Welsh heading
      await expect(page.locator("h1")).toHaveText("Gwelydd log archwilio");

      // Verify Welsh filter labels
      await expect(page.locator("h2:has-text('Hidlo')")).toBeVisible();
      await expect(page.locator('button:has-text("Cymhwyso hidlyddion")')).toBeVisible();

      // Accessibility check in Welsh
      const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Switch back to English
      await page.click('a:has-text("English")');
      await expect(page.locator("h1")).toHaveText("Audit log viewer");
    });
  });
