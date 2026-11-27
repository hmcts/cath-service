import { expect, test } from "@playwright/test";
import { axeCheck } from "../../utils/axe-helper.js";
import { switchLanguage } from "../../utils/language-helpers.js";
import { loginWithSSO } from "../../utils/sso-helpers.js";

test.describe("Audit Log Viewer", () => {
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
    const filterHeading = page.getByRole("heading", { level: 2, name: "Filter", exact: true });
    await expect(filterHeading).toBeVisible();

    // Test filter functionality
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill(process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!);

    // Apply is after the last filter option and described by the hint at the top of the panel,
    // so keyboard users reach it by tabbing forwards from the filters
    const hint = "Select one or more filters and then select the apply filters button";
    await expect(page.locator(".moj-filter__options #filter-hint")).toHaveText(hint);
    const applyButton = page.getByRole("button", { name: "Apply filters", exact: true });
    await expect(applyButton).toHaveAccessibleDescription(hint);
    await expect(page.locator(".moj-filter__options > button.govuk-button").last()).toHaveText("Apply filters");
    await emailInput.focus();
    let isApplyFocused = false;
    for (let i = 0; i < 40 && !isApplyFocused; i++) {
      await page.keyboard.press("Tab");
      isApplyFocused = await applyButton.evaluate((el) => el === document.activeElement);
    }
    expect(isApplyFocused).toBe(true);
    await page.keyboard.press("Enter");
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
    const accessibilityResults = await axeCheck(page).analyze();
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
    await switchLanguage(page, "cy");

    // Verify Welsh heading
    await expect(page.locator("h1")).toHaveText("Gwelydd log archwilio");

    // Verify Welsh filter labels
    await expect(page.getByRole("heading", { level: 2, name: "Hidlo", exact: true })).toBeVisible();
    await expect(page.locator('button:has-text("Cymhwyso hidlyddion")')).toBeVisible();
    await expect(page.locator(".moj-filter__options").locator("#filter-hint")).toBeVisible();
    await expect(page.locator(".moj-filter__options > button.govuk-button").last()).toHaveText("Cymhwyso hidlyddion");

    // Accessibility check in Welsh
    const accessibilityScanResults = await axeCheck(page).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Switch back to English
    await switchLanguage(page, "en");
    await expect(page.locator("h1")).toHaveText("Audit log viewer");
  });
});
