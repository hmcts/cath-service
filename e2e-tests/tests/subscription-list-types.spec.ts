import AxeBuilder from "@axe-core/playwright";
import { prisma } from "@hmcts/postgres";
import { expect, test } from "@playwright/test";
import { loginWithCftIdam } from "../utils/cft-idam-helpers.js";

test.describe("Subscription List Types", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.CFT_VALID_TEST_ACCOUNT || !process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD) {
      throw new Error(
        "Missing required environment variables: CFT_VALID_TEST_ACCOUNT and CFT_VALID_TEST_ACCOUNT_PASSWORD."
      );
    }

    await page.goto("/sign-in");
    const hmctsRadio = page.getByRole("radio", { name: /with a myhmcts account/i });
    await hmctsRadio.check();
    await page.getByRole("button", { name: /continue/i }).click();

    await loginWithCftIdam(page, process.env.CFT_VALID_TEST_ACCOUNT, process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD);
    await expect(page).toHaveURL(/\/account-home/);
  });

  test.afterEach(async () => {
    // Clean up any list type subscriptions created during tests
    if (process.env.CFT_VALID_TEST_ACCOUNT) {
      const user = await prisma.user.findFirst({
        where: { email: process.env.CFT_VALID_TEST_ACCOUNT },
      });
      if (user) {
        await prisma.subscriptionListType.deleteMany({
          where: { userId: user.userId },
        });
      }
    }
  });

  test("verified user can subscribe to list types and edit them @nightly", async ({ page }) => {
    // Navigate to subscription management
    await page.goto("/subscription-management");
    await expect(page.getByRole("heading", { name: /your email subscriptions/i })).toBeVisible();

    // Verify Edit list types button is visible
    await expect(page.getByRole("button", { name: /edit list types/i })).toBeVisible();

    // Check accessibility on subscription management page
    let accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Click Edit list types to start the flow
    await page.getByRole("button", { name: /edit list types/i }).click();
    await expect(page).toHaveURL(/\/subscription-list-types/);

    // Verify list types page
    await expect(page.getByRole("heading", { name: /select list types/i })).toBeVisible();
    await expect(page.getByText(/choose the lists you will receive/i)).toBeVisible();

    // Test validation - no list types selected
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(/there is a problem/i)).toBeVisible();

    // Test Welsh translation
    await page.getByRole("link", { name: "Cymraeg" }).click();
    await expect(page.getByRole("heading", { name: /dewis mathau o restri/i })).toBeVisible();

    // Switch back to English
    await page.getByRole("link", { name: "English" }).click();

    // Check accessibility on list types page
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Test back link returns to subscription management
    await page.locator(".govuk-back-link").click();
    await expect(page).toHaveURL(/\/subscription-management/);

    // Go back to list types via Edit button
    await page.getByRole("button", { name: /edit list types/i }).click();
    await expect(page).toHaveURL(/\/subscription-list-types/);

    // Select list types
    await page.getByLabel("Civil Daily Cause List").check();
    await page.getByLabel("Family Daily Cause List").check();
    await page.getByRole("button", { name: /continue/i }).click();

    // Language selection page
    await expect(page).toHaveURL(/\/subscription-list-language/);
    await expect(page.getByRole("heading", { name: /what version of the list type/i })).toBeVisible();

    // Test validation - no language selected
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(/there is a problem/i)).toBeVisible();

    // Check accessibility on language page
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Select English and continue
    await page.getByLabel("English").check();
    await page.getByRole("button", { name: /continue/i }).click();

    // Confirmation page
    await expect(page).toHaveURL(/\/subscription-confirm/);
    await expect(page.getByRole("heading", { name: /confirm your email subscriptions/i })).toBeVisible();
    await expect(page.getByText("Civil Daily Cause List")).toBeVisible();
    await expect(page.getByText("Family Daily Cause List")).toBeVisible();
    await expect(page.getByText("English")).toBeVisible();

    // Test Welsh on confirmation page
    await page.getByRole("link", { name: "Cymraeg" }).click();
    await expect(page.getByRole("heading", { name: /cadarnhewch eich tanysgrifiadau/i })).toBeVisible();

    // Switch back to English
    await page.getByRole("link", { name: "English" }).click();

    // Check accessibility on confirmation page
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Confirm subscriptions
    await page.getByRole("button", { name: /confirm subscriptions/i }).click();

    // Success page
    await expect(page).toHaveURL(/\/subscription-confirmed/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: /subscription confirmation/i })).toBeVisible();

    // Check accessibility on success page
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Navigate back to subscription management
    await page.getByRole("link", { name: /manage.*subscriptions/i }).click();
    await expect(page).toHaveURL(/\/subscription-management/);

    // Edit list types - should pre-select existing subscriptions
    await page.getByRole("button", { name: /edit list types/i }).click();
    await expect(page).toHaveURL(/\/subscription-list-types/);

    // Verify existing subscriptions are pre-selected
    await expect(page.getByLabel("Civil Daily Cause List")).toBeChecked();
    await expect(page.getByLabel("Family Daily Cause List")).toBeChecked();

    // Verify the back link goes to subscription management (edit mode)
    await page.locator(".govuk-back-link").click();
    await expect(page).toHaveURL(/\/subscription-management/);
  });
});
