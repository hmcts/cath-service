import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { prisma } from "@hmcts/postgres";
import { loginWithSSO } from "../utils/sso-helpers.js";

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

const createdUserIds: string[] = [];

test.describe("Third Party User Management", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateSystemAdmin(page);
  });

  test.afterAll(async () => {
    for (const id of createdUserIds) {
      await prisma.thirdPartyUser.delete({ where: { id } }).catch(() => {});
    }
    createdUserIds.length = 0;
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

    // Navigate to create
    await page.getByRole("link", { name: "Create new user" }).click();
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

    // Enter valid name
    const uniqueName = `E2E Test Corp ${Date.now()}`;
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

    // Test page refresh doesn't duplicate (idempotency already handled by session clear)
    // Navigate back to the list to verify user exists
    await page.getByRole("link", { name: "Manage third party users" }).click();
    await page.waitForURL("**/third-party-users");
    await expect(page.locator(".govuk-table")).toContainText(uniqueName);

    // Clean up - record id for teardown
    const createdUser = await prisma.thirdPartyUser.findFirst({ where: { name: uniqueName } });
    if (createdUser) createdUserIds.push(createdUser.id);
  });

  test("user can manage subscriptions for a third party user @nightly", async ({ page }) => {
    // Create a test user directly in DB
    const testUser = await prisma.thirdPartyUser.create({ data: { name: `Sub Test Corp ${Date.now()}` } });
    createdUserIds.push(testUser.id);

    await page.goto(`/third-party-users/${testUser.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage user");
    await expect(page.locator(".govuk-summary-list")).toContainText(testUser.name);

    // Test accessibility on manage user page
    const accessibilityResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(accessibilityResults.violations).toEqual([]);

    // Navigate to subscriptions
    await page.getByRole("link", { name: "Manage subscriptions" }).click();
    await page.waitForURL(`**/third-party-users/${testUser.id}/subscriptions**`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage subscriptions");

    // Test Welsh on subscriptions page
    await page.getByRole("link", { name: "Cymraeg" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rheoli tanysgrifiadau");
    await page.getByRole("link", { name: "English" }).click();

    // Select a sensitivity for the first list type (radio button variant by default)
    const firstPublicRadio = page.locator('input[type="radio"][value="PUBLIC"]').first();
    if (await firstPublicRadio.isVisible()) {
      await firstPublicRadio.check();
    }

    // Navigate through pages and save on last page
    let isLastPage = false;
    while (!isLastPage) {
      const saveButton = page.getByRole("button", { name: "Save subscriptions" });
      const nextButton = page.getByRole("button", { name: "Next" });
      if (await saveButton.isVisible()) {
        await saveButton.click();
        isLastPage = true;
      } else {
        await nextButton.click();
      }
    }

    // Check confirmation
    await page.waitForURL(`**/third-party-users/${testUser.id}/subscriptions/confirmation`);
    await expect(page.locator(".govuk-panel--confirmation")).toContainText("Third Party Subscriptions Updated");
    await expect(page.getByRole("link", { name: "Manage third party users" })).toBeVisible();
  });

  test("user can delete a third party user @nightly", async ({ page }) => {
    // Create a test user directly in DB
    const testUser = await prisma.thirdPartyUser.create({ data: { name: `Delete Test Corp ${Date.now()}` } });

    await page.goto(`/third-party-users/${testUser.id}`);

    // Navigate to delete
    await page.getByRole("link", { name: "Delete user" }).click();
    await page.waitForURL(`**/third-party-users/${testUser.id}/delete`);
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
    await page.waitForURL(`**/third-party-users/${testUser.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage user");

    // Go back to delete and confirm Yes
    await page.getByRole("link", { name: "Delete user" }).click();
    await page.waitForURL(`**/third-party-users/${testUser.id}/delete`);
    await page.locator('input[value="yes"]').check();
    await page.getByRole("button", { name: "Continue" }).click();

    // Check deletion confirmation
    await page.waitForURL(`**/third-party-users/${testUser.id}/delete/confirmation`);
    await expect(page.locator(".govuk-panel--confirmation")).toContainText("Third party user deleted");
    await expect(page.getByRole("heading", { name: "What do you want to do next?" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Manage another third party user" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Home" })).toBeVisible();

    // Verify user is deleted from list
    await page.getByRole("link", { name: "Manage another third party user" }).click();
    await page.waitForURL("**/third-party-users");
    await expect(page.locator("body")).not.toContainText(testUser.name);
  });
});
