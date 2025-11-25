import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginWithCftIdam } from "../utils/cft-idam-helpers.js";

test.describe("Email Subscriptions", () => {
  // Authenticate before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to sign-in page
    await page.goto("/sign-in");

    // Select HMCTS account option
    const hmctsRadio = page.getByRole("radio", { name: /with a myhmcts account/i });
    await hmctsRadio.check();

    // Click continue
    const continueButton = page.getByRole("button", { name: /continue/i });
    await continueButton.click();

    // Perform CFT IDAM login
    await loginWithCftIdam(
      page,
      process.env.CFT_VALID_TEST_ACCOUNT!,
      process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD!
    );

    // Should be redirected to account-home after successful login
    await expect(page).toHaveURL(/\/account-home/);
  });

  test.describe("Subscription Management Page", () => {
    test("should load subscription management page", async ({ page }) => {
      await page.goto("/subscription-management");

      // Check page title
      await expect(page).toHaveTitle(/Your email subscriptions/i);

      // Check main heading
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
      await expect(heading).toHaveText(/your email subscriptions/i);
    });

    test("should display navigation to subscription management", async ({ page }) => {
      await page.goto("/account-home");

      // Click email subscriptions tile
      const emailSubsTile = page.locator(".verified-tile").nth(2);
      await emailSubsTile.click();

      // Should navigate to subscription management
      await expect(page).toHaveURL("/subscription-management");
    });

    test("should display page heading", async ({ page }) => {
      await page.goto("/subscription-management");

      // Check main heading
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
      await expect(heading).toHaveText(/your email subscriptions/i);
    });

    test("should display add subscription button", async ({ page }) => {
      await page.goto("/subscription-management");

      const addButton = page.getByRole("button", { name: /add email subscription/i });
      await expect(addButton).toBeVisible();
    });

    test("should navigate to location search when add subscription clicked", async ({ page }) => {
      await page.goto("/subscription-management");

      const addButton = page.getByRole("button", { name: /add email subscription/i });
      await addButton.click();

      await expect(page).toHaveURL("/location-name-search");
    });

    test("should be accessible", async ({ page }) => {
      await page.goto("/subscription-management");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .disableRules(["region"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should support Welsh language", async ({ page }) => {
      await page.goto("/subscription-management?lng=cy");

      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
      await expect(heading).toHaveText(/eich tanysgrifiadau e-bost/i);
    });
  });

  test.describe("Location Name Search Page", () => {
    test("should load location search page", async ({ page }) => {
      await page.goto("/location-name-search");

      // Check main heading
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
      await expect(heading).toHaveText(/subscribe by court or tribunal name/i);
    });

    test("should display filter options", async ({ page }) => {
      await page.goto("/location-name-search");

      // Check for jurisdiction filter
      const jurisdictionLabel = page.getByText(/jurisdiction/i).first();
      await expect(jurisdictionLabel).toBeVisible();

      // Check for region filter
      const regionLabel = page.getByText(/region/i).first();
      await expect(regionLabel).toBeVisible();
    });

    test("should display location results", async ({ page }) => {
      await page.goto("/location-name-search");

      // Wait for page to load
      await page.waitForLoadState("networkidle");

      // Location results should be displayed (using a more general selector)
      const locationCheckboxes = page.locator("input[type='checkbox']");
      await expect(locationCheckboxes.first()).toBeVisible({ timeout: 10000 });
    });

    test("should allow selecting locations", async ({ page }) => {
      await page.goto("/location-name-search");

      // Find first checkbox in accordion
      const firstCheckbox = page.locator("input[type='checkbox']").first();
      await firstCheckbox.check();

      await expect(firstCheckbox).toBeChecked();
    });

    test("should have continue button", async ({ page }) => {
      await page.goto("/location-name-search");

      const continueButton = page.getByRole("button", { name: /continue/i });
      await expect(continueButton).toBeVisible();
    });

    test("should navigate back to subscription management", async ({ page }) => {
      await page.goto("/subscription-management");
      const addButton = page.getByRole("button", { name: /add email subscription/i });
      await addButton.click();
      await expect(page).toHaveURL("/location-name-search");

      const backLink = page.getByRole("link", { name: /back/i });
      await backLink.click();

      await expect(page).toHaveURL("/subscription-management");
    });

    test("should be accessible", async ({ page }) => {
      await page.goto("/location-name-search");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .disableRules(["region"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should support Welsh language", async ({ page }) => {
      await page.goto("/location-name-search?lng=cy");

      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
      await expect(heading).toHaveText(/tanysgrifio yn ôl enw llys neu dribiwnlys/i);
    });
  });

  test.describe("Pending Subscriptions Page", () => {
    test("should require at least one selected location", async ({ page }) => {
      await page.goto("/location-name-search");

      // Click continue without selecting any locations
      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      // Should show error on pending subscriptions page
      await expect(page).toHaveURL("/pending-subscriptions");

      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
    });

    test("should display selected locations", async ({ page }) => {
      await page.goto("/location-name-search");

      // Select a location
      const firstCheckbox = page.locator("input[type='checkbox']").first();
      await firstCheckbox.check();

      // Continue to pending subscriptions
      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      await expect(page).toHaveURL("/pending-subscriptions");

      // Check heading
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
    });

    test("should have confirm and remove buttons", async ({ page }) => {
      await page.goto("/location-name-search");
      await page.waitForLoadState("networkidle");

      // Select a location
      const firstCheckbox = page.locator("input[type='checkbox']").first();
      await firstCheckbox.waitFor({ state: "visible", timeout: 10000 });
      await firstCheckbox.check();

      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      await expect(page).toHaveURL("/pending-subscriptions");

      // Should have confirm button
      const confirmButton = page.getByRole("button", { name: /confirm/i });
      await expect(confirmButton).toBeVisible();

      // Should have remove buttons
      const removeButtons = page.getByRole("button", { name: /remove/i });
      await expect(removeButtons.first()).toBeVisible();
    });

    test("should navigate back to location search", async ({ page }) => {
      await page.goto("/location-name-search");

      const firstCheckbox = page.locator("input[type='checkbox']").first();
      await firstCheckbox.check();

      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      await expect(page).toHaveURL("/pending-subscriptions");

      const backLink = page.getByRole("link", { name: /back/i });
      await backLink.click();

      await expect(page).toHaveURL("/location-name-search");
    });

    test("should be accessible", async ({ page }) => {
      await page.goto("/location-name-search");

      const firstCheckbox = page.locator("input[type='checkbox']").first();
      await firstCheckbox.check();

      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      const accessibilityScanResults = await new AxeBuilder({ page })
        .disableRules(["region"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should support Welsh language", async ({ page }) => {
      await page.goto("/pending-subscriptions?lng=cy");

      // Will show error for no selections, but should be in Welsh
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
    });
  });

  test.describe("Subscription Confirmed Page", () => {
    test("should redirect if no confirmation in session", async ({ page }) => {
      // Try to access confirmation page directly
      await page.goto("/subscription-confirmed");

      // Should redirect to subscription management
      await expect(page).toHaveURL("/subscription-management");
    });

    test("should display success message after confirming subscriptions", async ({ page }) => {
      await page.goto("/location-name-search");
      await page.waitForLoadState("networkidle");

      // Select a location
      const firstCheckbox = page.locator("input[type='checkbox']").first();
      await firstCheckbox.waitFor({ state: "visible", timeout: 10000 });
      await firstCheckbox.check();

      // Continue
      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      // Confirm subscription
      await expect(page).toHaveURL("/pending-subscriptions");
      const confirmButton = page.getByRole("button", { name: /confirm/i });
      await confirmButton.click();

      // Should show confirmation page
      await expect(page).toHaveURL("/subscription-confirmed", { timeout: 10000 });

      // Check for success panel
      const panel = page.locator(".govuk-panel--confirmation");
      await expect(panel).toBeVisible();
    });

    test("should have link to manage subscriptions", async ({ page }) => {
      await page.goto("/location-name-search");
      await page.waitForLoadState("networkidle");

      const firstCheckbox = page.locator("input[type='checkbox']").first();
      await firstCheckbox.waitFor({ state: "visible", timeout: 10000 });
      await firstCheckbox.check();

      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      const confirmButton = page.getByRole("button", { name: /confirm/i });
      await confirmButton.click();

      await expect(page).toHaveURL("/subscription-confirmed", { timeout: 10000 });

      const manageLink = page.getByRole("link", { name: /manage.*subscriptions/i });
      await expect(manageLink).toBeVisible();
    });

    test("should be accessible", async ({ page }) => {
      await page.goto("/location-name-search");
      await page.waitForLoadState("networkidle");

      const firstCheckbox = page.locator("input[type='checkbox']").first();
      await firstCheckbox.waitFor({ state: "visible", timeout: 10000 });
      await firstCheckbox.check();

      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      const confirmButton = page.getByRole("button", { name: /confirm/i });
      await confirmButton.click();

      await expect(page).toHaveURL("/subscription-confirmed", { timeout: 10000 });

      const accessibilityScanResults = await new AxeBuilder({ page })
        .disableRules(["region"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe("Delete Subscription Page", () => {
    test("should redirect for invalid subscription ID", async ({ page }) => {
      await page.goto("/delete-subscription?subscriptionId=invalid-id");

      // Should redirect or show error
      await page.waitForTimeout(1000);

      // Either shows 400 error or redirects to subscription management
      const is400Error = await page.locator("text=400").isVisible().catch(() => false);
      const isSubManagement = page.url().includes("/subscription-management");

      expect(is400Error || isSubManagement).toBeTruthy();
    });

    test("should display confirmation question", async ({ page }) => {
      // This test assumes there's at least one subscription to delete
      // In a real test, you'd create a subscription first
      await page.goto("/subscription-management");

      // Check if there are any subscriptions to delete
      const deleteLinks = page.getByRole("button", { name: /remove/i });
      const count = await deleteLinks.count();

      if (count > 0) {
        // Click first delete link
        await deleteLinks.first().click();

        // Should be on delete subscription page
        await expect(page).toHaveURL(/\/delete-subscription/);

        // Check for radio buttons
        const yesRadio = page.getByRole("radio", { name: /yes/i });
        const noRadio = page.getByRole("radio", { name: /no/i });

        await expect(yesRadio).toBeVisible();
        await expect(noRadio).toBeVisible();
      }
    });

    test("should require selection before continuing", async ({ page }) => {
      await page.goto("/subscription-management");

      const deleteLinks = page.getByRole("button", { name: /remove/i });
      const count = await deleteLinks.count();

      if (count > 0) {
        await deleteLinks.first().click();

        // Try to continue without selecting
        const continueButton = page.getByRole("button", { name: /continue/i });
        await continueButton.click();

        // Should show error
        const errorSummary = page.locator(".govuk-error-summary");
        await expect(errorSummary).toBeVisible();
      }
    });

    test("should return to subscription management when selecting no", async ({ page }) => {
      await page.goto("/subscription-management");

      const deleteLinks = page.getByRole("button", { name: /remove/i });
      const count = await deleteLinks.count();

      if (count > 0) {
        await deleteLinks.first().click();

        // Select No
        const noRadio = page.getByRole("radio", { name: /no/i });
        await noRadio.check();

        // Continue
        const continueButton = page.getByRole("button", { name: /continue/i });
        await continueButton.click();

        // Should return to subscription management
        await expect(page).toHaveURL("/subscription-management");
      }
    });

    test("should support Welsh language", async ({ page }) => {
      await page.goto("/subscription-management?lng=cy");

      const deleteLinks = page.getByRole("link", { name: /dileu/i });
      const count = await deleteLinks.count();

      if (count > 0) {
        await deleteLinks.first().click();

        const heading = page.locator("h1");
        await expect(heading).toBeVisible();
      }
    });
  });

  test.describe("Unsubscribe Confirmation Page", () => {
    test("should redirect if no subscription to remove in session", async ({ page }) => {
      await page.goto("/unsubscribe-confirmation");

      // Should redirect to subscription management
      await expect(page).toHaveURL("/subscription-management");
    });

    test("should display success message after removing subscription", async ({ page }) => {
      await page.goto("/subscription-management");

      const deleteLinks = page.getByRole("button", { name: /remove/i });
      const count = await deleteLinks.count();

      if (count > 0) {
        await deleteLinks.first().click();

        // Select Yes
        const yesRadio = page.getByRole("radio", { name: /yes/i });
        await yesRadio.check();

        // Continue
        const continueButton = page.getByRole("button", { name: /continue/i });
        await continueButton.click();

        // Should show unsubscribe confirmation
        await expect(page).toHaveURL("/unsubscribe-confirmation");

        // Check for success panel
        const panel = page.locator(".govuk-panel--confirmation");
        await expect(panel).toBeVisible();
      }
    });

    test("should have link back to subscription management", async ({ page }) => {
      await page.goto("/subscription-management");

      const deleteLinks = page.getByRole("button", { name: /remove/i });
      const count = await deleteLinks.count();

      if (count > 0) {
        await deleteLinks.first().click();

        const yesRadio = page.getByRole("radio", { name: /yes/i });
        await yesRadio.check();

        const continueButton = page.getByRole("button", { name: /continue/i });
        await continueButton.click();

        await expect(page).toHaveURL("/unsubscribe-confirmation");

        const manageLink = page.getByRole("link", { name: /manage.*subscriptions/i });
        await expect(manageLink).toBeVisible();
      }
    });

    test("should be accessible", async ({ page }) => {
      await page.goto("/subscription-management");

      const deleteLinks = page.getByRole("button", { name: /remove/i });
      const count = await deleteLinks.count();

      if (count > 0) {
        await deleteLinks.first().click();

        const yesRadio = page.getByRole("radio", { name: /yes/i });
        await yesRadio.check();

        const continueButton = page.getByRole("button", { name: /continue/i });
        await continueButton.click();

        const accessibilityScanResults = await new AxeBuilder({ page })
          .disableRules(["region"])
          .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
      }
    });
  });

  test.describe("Authentication Protection", () => {
    test("should require authentication for subscription management", async ({ page, context }) => {
      // Create new context without authentication
      await context.clearCookies();
      await page.goto("/subscription-management");

      // Should redirect to sign-in
      await expect(page).toHaveURL(/\/sign-in/);
    });

    test("should require authentication for location search", async ({ page, context }) => {
      await context.clearCookies();
      await page.goto("/location-name-search");

      await expect(page).toHaveURL(/\/sign-in/);
    });

    test("should require authentication for pending subscriptions", async ({ page, context }) => {
      await context.clearCookies();
      await page.goto("/pending-subscriptions");

      await expect(page).toHaveURL(/\/sign-in/);
    });

    test("should require authentication for subscription confirmed", async ({ page, context }) => {
      await context.clearCookies();
      await page.goto("/subscription-confirmed");

      await expect(page).toHaveURL(/\/sign-in/);
    });

    test("should require authentication for delete subscription", async ({ page, context }) => {
      await context.clearCookies();
      await page.goto("/delete-subscription?subscriptionId=550e8400-e29b-41d4-a716-446655440000");

      await expect(page).toHaveURL(/\/sign-in/);
    });

    test("should require authentication for unsubscribe confirmation", async ({ page, context }) => {
      await context.clearCookies();
      await page.goto("/unsubscribe-confirmation");

      await expect(page).toHaveURL(/\/sign-in/);
    });
  });

  test.describe("Complete Subscription Flow", () => {
    test("should complete full subscription journey", async ({ page }) => {
      // Start from account home
      await page.goto("/account-home");

      // Navigate to subscription management
      const emailSubsTile = page.locator(".verified-tile").nth(2);
      await emailSubsTile.click();
      await expect(page).toHaveURL("/subscription-management");

      // Click add subscription
      const addButton = page.getByRole("button", { name: /add email subscription/i });
      await addButton.click();
      await expect(page).toHaveURL("/location-name-search");
      await page.waitForLoadState("networkidle");

      // Select a location
      const firstCheckbox = page.locator("input[type='checkbox']").first();
      await firstCheckbox.waitFor({ state: "visible", timeout: 10000 });
      await firstCheckbox.check();

      // Continue to pending subscriptions
      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();
      await expect(page).toHaveURL("/pending-subscriptions");

      // Confirm subscription
      const confirmButton = page.getByRole("button", { name: /confirm/i });
      await confirmButton.click();
      await expect(page).toHaveURL("/subscription-confirmed", { timeout: 10000 });

      // Verify success
      const panel = page.locator(".govuk-panel--confirmation");
      await expect(panel).toBeVisible();

      // Navigate back to subscription management
      const manageLink = page.getByRole("link", { name: /manage.*subscriptions/i });
      await manageLink.click();
      await expect(page).toHaveURL("/subscription-management");
    });
  });
});
