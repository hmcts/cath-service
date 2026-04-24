import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../../utils/sso-helpers.js";

test.describe("View List Types", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await page.waitForURL("/system-admin-dashboard");
  });

  test("system admin can view list types and navigate to edit page", async ({ page }) => {
    // Navigate from dashboard to view list types
    await page.click('a:has-text("Manage List Types")');
    await page.waitForURL("**/view-list-types");

    // Verify page heading
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText("View/Delete List Types");

    // Verify table structure
    const table = page.locator("table.govuk-table");
    await expect(table).toBeVisible();

    // Verify table headers
    await expect(page.getByRole("columnheader", { name: "Name", exact: true })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Friendly Name", exact: true })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Actions" })).toBeVisible();

    // Verify list types are displayed
    const rows = page.locator("tbody tr");
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Verify Edit and Delete links exist
    const editLinks = page.locator('a:has-text("Edit")');
    await expect(editLinks.first()).toBeVisible();
    const deleteLinks = page.locator('a:has-text("Delete")');
    await expect(deleteLinks.first()).toBeVisible();

    // Navigate to edit page
    await editLinks.first().click();
    await page.waitForURL(/.*configure-list-type-enter-details.*/);

    // Verify edit page loaded
    await expect(page.locator("h1")).toBeVisible();

    // Go back to list
    await page.goto("/view-list-types");

    // Verify back to dashboard link
    const backLink = page.locator('a:has-text("Back to System Admin Dashboard")');
    await expect(backLink).toBeVisible();

    // Accessibility check
    const accessibilityResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibilityResults.violations).toEqual([]);

    // Keyboard navigation
    const skipLink = page.locator("a.govuk-skip-link");
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
  });

  test("view list types page displays correctly in Welsh @nightly", async ({ page }) => {
    // Navigate to view list types
    await page.click('a:has-text("Manage List Types")');
    await page.waitForURL("**/view-list-types");

    // Switch to Welsh
    await page.click('a:has-text("Cymraeg")');
    await page.waitForURL("**/view-list-types?lng=cy");

    // Verify Welsh heading
    await expect(page.locator("h1")).toHaveText("Gweld/Dileu Mathau o Restrau");

    // Verify Welsh action links
    await expect(page.locator('a:has-text("Golygu")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Dileu")').first()).toBeVisible();

    // Accessibility check in Welsh
    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Switch back to English
    await page.click('a:has-text("English")');
    await expect(page.locator("h1")).toHaveText("View/Delete List Types");
  });
});
