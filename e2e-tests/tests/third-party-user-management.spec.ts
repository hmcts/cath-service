import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../utils/sso-helpers.js";

test.describe("Third Party User Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/manage-third-party-users");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await page.waitForURL("/manage-third-party-users");
  });

  test("user can create a third party user with validation, Welsh, accessibility, and idempotency checks @nightly", async ({ page }) => {
    const uniqueName = `Test User ${Date.now()}`;

    // Verify the manage third party users page loads
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage third party users");

    // Accessibility check on list page
    let accessibilityResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibilityResults.violations).toEqual([]);

    // Navigate to create page
    await page.getByRole("link", { name: "Create new third party user" }).click();
    await page.waitForURL("**/create-third-party-user");

    // Verify create page loads
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Create third party user");

    // Test validation - submit empty form
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("There is a problem")).toBeVisible();
    await expect(page.getByText("Enter a name")).toBeVisible();

    // Accessibility check with validation errors displayed
    accessibilityResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibilityResults.violations).toEqual([]);

    // Test Welsh translation
    await page.goto("/create-third-party-user?lng=cy");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Creu defnyddiwr trydydd parti");
    await expect(page.getByRole("button", { name: "Parhau" })).toBeVisible();

    // Test Welsh validation error
    await page.getByRole("button", { name: "Parhau" }).click();
    await expect(page.getByText("Mae yna broblem")).toBeVisible();
    await expect(page.getByText("Rhowch enw")).toBeVisible();

    // Switch back to English and fill form correctly
    await page.goto("/create-third-party-user");
    await page.getByLabel("Name").fill(uniqueName);
    await page.getByRole("button", { name: "Continue" }).click();

    // Verify summary page
    await page.waitForURL("**/create-third-party-user-summary");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Check your answers before creating user");
    await expect(page.getByText(uniqueName)).toBeVisible();

    // Accessibility check on summary page
    accessibilityResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibilityResults.violations).toEqual([]);

    // Test back navigation preserves data
    await page.getByRole("link", { name: "Change" }).click();
    await page.waitForURL("**/create-third-party-user");
    await expect(page.getByLabel("Name")).toHaveValue(uniqueName);

    // Continue back to summary
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL("**/create-third-party-user-summary");

    // Confirm creation
    await page.getByRole("button", { name: "Confirm" }).click();

    // Verify confirmation page
    await page.waitForURL("**/third-party-user-created");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Third party user created");
    await expect(page.getByText("The third party user has been successfully created")).toBeVisible();

    // Test Welsh on confirmation page
    await page.goto("/third-party-user-created?lng=cy");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Crëwyd defnyddiwr trydydd parti");
    await expect(page.getByText("Mae'r defnyddiwr trydydd parti wedi'i greu'n llwyddiannus")).toBeVisible();

    // Accessibility check on confirmation page
    accessibilityResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibilityResults.violations).toEqual([]);

    // Test idempotency - refresh the confirmation page should not create duplicate
    await page.goto("/create-third-party-user-summary");
    await page.getByRole("button", { name: "Confirm" }).click();
    // Should redirect to confirmation without creating duplicate
    await page.waitForURL("**/third-party-user-created");

    // Navigate back to list and verify user was created
    await page.getByRole("link", { name: "Manage another third party user" }).click();
    await page.waitForURL("**/manage-third-party-users");
    await expect(page.getByText(uniqueName)).toBeVisible();
  });

  test("user can manage subscriptions for a third party user @nightly", async ({ page }) => {
    // First create a user to manage
    const uniqueName = `Subscription Test ${Date.now()}`;

    await page.getByRole("link", { name: "Create new third party user" }).click();
    await page.waitForURL("**/create-third-party-user");
    await page.getByLabel("Name").fill(uniqueName);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL("**/create-third-party-user-summary");
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.waitForURL("**/third-party-user-created");

    // Navigate back to manage users list
    await page.getByRole("link", { name: "Manage another third party user" }).click();
    await page.waitForURL("**/manage-third-party-users");

    // Click on the created user to manage
    await page.getByRole("link", { name: uniqueName }).click();
    await page.waitForURL(/manage-third-party-user\?id=/);

    // Verify manage user page loads
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage third party user");
    await expect(page.getByText(uniqueName)).toBeVisible();

    // Accessibility check on manage user page
    let accessibilityResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibilityResults.violations).toEqual([]);

    // Click manage subscriptions
    await page.getByRole("link", { name: "Manage subscriptions" }).click();
    await page.waitForURL(/manage-third-party-subscriptions\?id=/);

    // Verify manage subscriptions page loads
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage third party subscriptions");

    // Accessibility check on subscriptions page
    accessibilityResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibilityResults.violations).toEqual([]);

    // Test validation - submit without selecting sensitivity
    await page.getByRole("button", { name: "Save subscriptions" }).click();
    await expect(page.getByText("There is a problem")).toBeVisible();
    await expect(page.getByText("Select a sensitivity level")).toBeVisible();

    // Select sensitivity and submit
    await page.getByLabel("Public").check();
    await page.getByRole("button", { name: "Save subscriptions" }).click();

    // Verify confirmation page
    await page.waitForURL("**/third-party-subscriptions-updated");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Subscriptions updated");

    // Accessibility check on confirmation page
    accessibilityResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibilityResults.violations).toEqual([]);
  });

  test("user can delete a third party user @nightly", async ({ page }) => {
    // First create a user to delete
    const uniqueName = `Delete Test ${Date.now()}`;

    await page.getByRole("link", { name: "Create new third party user" }).click();
    await page.waitForURL("**/create-third-party-user");
    await page.getByLabel("Name").fill(uniqueName);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL("**/create-third-party-user-summary");
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.waitForURL("**/third-party-user-created");

    // Navigate back to manage users list
    await page.getByRole("link", { name: "Manage another third party user" }).click();
    await page.waitForURL("**/manage-third-party-users");

    // Click on the created user to manage
    await page.getByRole("link", { name: uniqueName }).click();
    await page.waitForURL(/manage-third-party-user\?id=/);

    // Verify manage user page loads
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage third party user");

    // Click delete user
    await page.getByRole("link", { name: "Delete user" }).click();
    await page.waitForURL(/delete-third-party-user\?id=/);

    // Verify delete confirmation page loads
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Are you sure you want to delete user");
    await expect(page.getByText(uniqueName)).toBeVisible();

    // Accessibility check on delete page
    let accessibilityResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibilityResults.violations).toEqual([]);

    // Test validation - submit without selecting yes/no
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("There is a problem")).toBeVisible();
    await expect(page.getByText("Select yes or no to continue")).toBeVisible();

    // Test "No" option - should return to manage user page
    await page.getByLabel("No").check();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/manage-third-party-user\?id=/);
    await expect(page.getByText(uniqueName)).toBeVisible();

    // Go back to delete page and confirm deletion
    await page.getByRole("link", { name: "Delete user" }).click();
    await page.waitForURL(/delete-third-party-user\?id=/);
    await page.getByLabel("Yes").check();
    await page.getByRole("button", { name: "Continue" }).click();

    // Verify deletion confirmation page
    await page.waitForURL("**/third-party-user-deleted");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Third party user deleted");
    await expect(page.getByText("The third party user and associated subscriptions have been removed")).toBeVisible();

    // Accessibility check on deletion confirmation page
    accessibilityResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibilityResults.violations).toEqual([]);

    // Navigate back to list and verify user was deleted
    await page.getByRole("link", { name: "Manage another third party user" }).click();
    await page.waitForURL("**/manage-third-party-users");
    await expect(page.getByText(uniqueName)).not.toBeVisible();
  });
});
