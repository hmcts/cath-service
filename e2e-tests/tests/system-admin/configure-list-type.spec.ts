import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../../utils/sso-helpers.js";

test.describe("Configure List Type", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await page.waitForURL("/system-admin-dashboard");
  });

  test("admin can navigate through configure list type form", async ({ page }) => {
    // Navigate to Configure List Type from dashboard
    await page.getByRole("link", { name: "Configure List Type" }).click();
    await expect(page).toHaveURL("/configure-list-type-enter-details");
    await expect(page.getByRole("heading", { name: "Enter list type details" })).toBeVisible();

    // Test validation - empty form submission
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator("#name-error")).toContainText("Enter a value for name");
    await expect(page.locator("#friendlyName-error")).toContainText("Enter a value for friendly name");

    // Accessibility check on form page
    const accessibilityResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityResults.violations).toEqual([]);

    // Test keyboard navigation
    await page.getByLabel("Name", { exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Friendly name", { exact: true })).toBeFocused();

    // Fill form with valid data
    const uniqueName = `TEST_LIST_TYPE_${Date.now()}`;
    await page.getByLabel("Name", { exact: true }).fill(uniqueName);
    await page.getByLabel("Friendly name", { exact: true }).fill("Test List Type");
    await page.getByLabel("Welsh friendly name").fill("Math Rhestr Prawf");
    await page.getByLabel("Shortened friendly name").fill("Test List");
    await page.getByLabel("URL").fill("/test-list");
    await page.getByLabel("Default sensitivity").selectOption("Public");
    await page.getByLabel("CFT_IDAM").check();
    await page.getByLabel("Yes", { exact: true }).check();

    // Continue to sub-jurisdictions page
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL("/configure-list-type-select-sub-jurisdictions");
    await expect(page.getByRole("heading", { name: "Select sub-jurisdictions" })).toBeVisible();

    // Test validation - no sub-jurisdictions selected
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator("#subJurisdictions-error")).toContainText("Select at least one sub-jurisdiction");

    // Select at least one sub-jurisdiction
    await page.getByRole("checkbox").first().check();

    // Accessibility check on sub-jurisdictions page
    const subJurisdictionsResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(subJurisdictionsResults.violations).toEqual([]);

    // Continue to preview page
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL("/configure-list-type-preview");
    await expect(page.getByRole("heading", { name: "Check list type details" })).toBeVisible();

    // Verify details displayed
    await expect(page.getByText(uniqueName)).toBeVisible();
    await expect(page.getByText("Test List Type")).toBeVisible();

    // Accessibility check on preview page
    const previewResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(previewResults.violations).toEqual([]);

    // Confirm to create
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page).toHaveURL("/configure-list-type-success");
    await expect(page.getByRole("heading", { name: "List type saved" })).toBeVisible();

    // Accessibility check on success page
    const successResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(successResults.violations).toEqual([]);

    // Verify return link
    const returnLink = page.getByRole("link", { name: "Return to System Admin dashboard" });
    await expect(returnLink).toBeVisible();
  });

  test("configure list type form displays correctly in Welsh @nightly", async ({ page }) => {
    // Navigate to Configure List Type from dashboard
    await page.getByRole("link", { name: "Configure List Type" }).click();
    await expect(page).toHaveURL("/configure-list-type-enter-details");

    // Switch to Welsh
    await page.getByRole("link", { name: "Cymraeg" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Rhowch fanylion math o restr");

    // Accessibility check in Welsh
    const accessibilityResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityResults.violations).toEqual([]);

    // Switch back to English
    await page.getByRole("link", { name: "English" }).click();
    await expect(page.getByRole("heading", { name: "Enter list type details" })).toBeVisible();
  });
});
