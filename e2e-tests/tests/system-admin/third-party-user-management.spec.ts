import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../../utils/sso-helpers.js";
import { getTestPrefix } from "../../utils/test-prefix.js";
import {
  createTestThirdPartyUser,
  deleteTestThirdPartyUser,
  findTestThirdPartyUserByName
} from "../../utils/test-support-api.js";

function validateEnvVars() {
  const missing: string[] = [];
  if (!process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL) missing.push("SSO_TEST_SYSTEM_ADMIN_EMAIL");
  if (!process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD) missing.push("SSO_TEST_SYSTEM_ADMIN_PASSWORD");
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

async function authenticateSystemAdmin(page: Page) {
  validateEnvVars();
  await page.goto("/system-admin-dashboard");
  if (page.url().includes("login.microsoftonline.com")) {
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
  }
}

test.describe("Third Party User Management", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateSystemAdmin(page);
  });

  test("user can create a third party user @nightly", async ({ page }) => {
    await page.goto("/third-party-users");

    // Check English heading
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage third party users");

    // Test accessibility
    const accessibilityResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(accessibilityResults.violations).toEqual([]);

    // Test Welsh
    await page.getByRole("link", { name: "Cymraeg" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rheoli defnyddwyr trydydd parti");
    await page.getByRole("link", { name: "English" }).click();

    // Navigate to create (govukButton with href renders with role="button")
    await page.getByRole("button", { name: "Create new user" }).click();
    await page.waitForURL("**/third-party-users/create");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Create third party user");

    // Test validation - empty name
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator(".govuk-error-summary")).toBeVisible();
    await expect(page.locator(".govuk-error-message")).toContainText("Enter a name");

    // Test Welsh on create page
    await page.getByRole("link", { name: "Cymraeg" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Creu defnyddiwr trydydd parti");
    await page.getByRole("link", { name: "English" }).click();

    // Enter valid name with test prefix for cleanup
    // Replace underscores with hyphens since validation only allows letters, numbers, spaces, hyphens, apostrophes
    const uniqueName = `${getTestPrefix().replace(/_/g, "-")}Test Corp`;
    await page.getByLabel("Name").fill(uniqueName);
    await page.getByRole("button", { name: "Continue" }).click();

    // Check summary page
    await page.waitForURL("**/third-party-users/create/summary");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Create third party user summary");
    await expect(page.locator(".govuk-summary-list")).toContainText(uniqueName);

    // Test accessibility on summary
    const summaryAccessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(summaryAccessibility.violations).toEqual([]);

    // Test Change link
    await page.getByRole("link", { name: "Change" }).click();
    await page.waitForURL("**/third-party-users/create");
    await expect(page.getByLabel("Name")).toHaveValue(uniqueName);

    // Go back to summary and confirm
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL("**/third-party-users/create/summary");
    await page.getByRole("button", { name: "Confirm" }).click();

    // Check confirmation page
    await page.waitForURL("**/third-party-users/create/confirmation");
    await expect(page.locator(".govuk-panel--confirmation")).toBeVisible();
    await expect(page.locator(".govuk-panel--confirmation")).toContainText("Third party user created");
    await expect(page.locator(".govuk-panel--confirmation")).toContainText(uniqueName);

    // Navigate back to the list to verify user exists
    await page.getByRole("link", { name: "Manage third party users" }).click();
    await page.waitForURL("**/third-party-users");
    await expect(page.locator(".govuk-table")).toContainText(uniqueName);

    // Note: Cleanup handled by global teardown via test prefix
  });

  test("user can manage subscriptions for a third party user @nightly", async ({ page }) => {
    // Create a test user via API
    const uniqueName = `${getTestPrefix()}Sub Test Corp`;
    const testUser = await createTestThirdPartyUser({ name: uniqueName });

    await page.goto(`/third-party-users/${testUser.id}/manage`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage user");
    await expect(page.locator(".govuk-summary-list")).toContainText(testUser.name);

    // Test accessibility on manage user page
    const accessibilityResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(accessibilityResults.violations).toEqual([]);

    // Navigate to subscriptions (govukButton with href renders with role="button")
    await page.getByRole("button", { name: "Manage subscriptions" }).click();
    await page.waitForURL(`**/third-party-users/${testUser.id}/subscriptions**`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage subscriptions");

    // Test Welsh on subscriptions page
    await page.getByRole("link", { name: "Cymraeg" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rheoli tanysgrifiadau");
    await page.getByRole("link", { name: "English" }).click();
    // Wait for page to stabilize after language switch
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage subscriptions");

    // Select a sensitivity for the first list type (radio button variant by default)
    const firstPublicRadio = page.locator('input[type="radio"][value="PUBLIC"]').first();
    if (await firstPublicRadio.isVisible()) {
      await firstPublicRadio.check();
    }

    // Navigate through pages and save on last page
    // Use a max iterations guard to prevent infinite loops
    const maxPages = 10;
    for (let pageNum = 0; pageNum < maxPages; pageNum++) {
      const saveButton = page.getByRole("button", { name: "Save subscriptions" });
      const nextButton = page.getByRole("button", { name: "Next" });

      // Wait for either button to be visible
      await expect(saveButton.or(nextButton)).toBeVisible();

      if (await saveButton.isVisible()) {
        await saveButton.click();
        break;
      }
      await nextButton.click();
      // Wait for next page to load
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage subscriptions");
    }

    // Check confirmation
    await page.waitForURL(`**/third-party-users/${testUser.id}/subscriptions/confirmation`);
    await expect(page.locator(".govuk-panel--confirmation")).toContainText("Third Party Subscriptions Updated");
    await expect(page.getByRole("link", { name: "Manage third party users" })).toBeVisible();

    // Note: Cleanup handled by global teardown via test prefix
  });

  test("user can delete a third party user @nightly", async ({ page }) => {
    // Create a test user via API
    const uniqueName = `${getTestPrefix()}Delete Test Corp`;
    const testUser = await createTestThirdPartyUser({ name: uniqueName });

    await page.goto(`/third-party-users/${testUser.id}/manage`);

    // Navigate to delete (govukButton with href renders with role="button")
    await page.getByRole("button", { name: "Delete user" }).click();
    await page.waitForURL(`**/third-party-users/${testUser.id}/delete/confirmation`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Are you sure you want to delete");

    // Test accessibility
    const accessibilityResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(accessibilityResults.violations).toEqual([]);

    // Test Welsh on delete page
    await page.getByRole("link", { name: "Cymraeg" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Ydych chi'n siŵr");
    await page.getByRole("link", { name: "English" }).click();

    // Test validation - no radio selected
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator(".govuk-error-summary")).toBeVisible();

    // Select No - should redirect back to manage user
    await page.locator('input[value="no"]').check();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(`**/third-party-users/${testUser.id}/manage`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage user");

    // Go back to delete and confirm Yes
    await page.getByRole("button", { name: "Delete user" }).click();
    await page.waitForURL(`**/third-party-users/${testUser.id}/delete/confirmation`);
    await page.locator('input[value="yes"]').check();
    await page.getByRole("button", { name: "Continue" }).click();

    // Check deletion success
    await page.waitForURL(`**/third-party-users/${testUser.id}/delete/success`);
    await expect(page.locator(".govuk-panel--confirmation")).toContainText("Third party user deleted");
    await expect(page.getByRole("heading", { name: "What do you want to do next?" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Manage another third party user" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Home" })).toBeVisible();

    // Verify user is deleted from list
    await page.getByRole("link", { name: "Manage another third party user" }).click();
    await page.waitForURL("**/third-party-users");
    await expect(page.locator("body")).not.toContainText(testUser.name);

    // Note: User already deleted via UI, no cleanup needed
  });
});
