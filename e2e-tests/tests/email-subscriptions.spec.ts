import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginWithCftIdam } from "../utils/cft-idam-helpers.js";
import { prisma } from "@hmcts/postgres";

// Store test location ID per test
let testLocationId: number;
let testLocationName: string;
let testLocationWelshName: string;

async function createTestLocation(): Promise<void> {
  // Generate unique ID using timestamp and random number to avoid conflicts between parallel tests
  // Using Date.now() provides millisecond precision and a much larger namespace than the previous 9000 values
  testLocationId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  testLocationName = `E2E Test Location ${Date.now()}-${Math.random()}`;
  testLocationWelshName = `Lleoliad Prawf E2E ${Date.now()}-${Math.random()}`;

  // Get the first sub-jurisdiction and region to link to
  const subJurisdiction = await prisma.subJurisdiction.findFirst();
  const region = await prisma.region.findFirst();

  if (!subJurisdiction || !region) {
    throw new Error("No sub-jurisdiction or region found in database");
  }

  // Upsert test location to handle case where it already exists
  await prisma.location.upsert({
    where: { locationId: testLocationId },
    create: {
      locationId: testLocationId,
      name: testLocationName,
      welshName: testLocationWelshName,
      email: "test.location@test.hmcts.net",
      contactNo: "01234567890",
      locationSubJurisdictions: {
        create: {
          subJurisdictionId: subJurisdiction.subJurisdictionId,
        },
      },
      locationRegions: {
        create: {
          regionId: region.regionId,
        },
      },
    },
    update: {
      name: testLocationName,
      welshName: testLocationWelshName,
      email: "test.location@test.hmcts.net",
      contactNo: "01234567890",
      locationSubJurisdictions: {
        deleteMany: {},
        create: {
          subJurisdictionId: subJurisdiction.subJurisdictionId,
        },
      },
      locationRegions: {
        deleteMany: {},
        create: {
          regionId: region.regionId,
        },
      },
    },
  });
}

async function deleteTestLocation(): Promise<void> {
  try {
    if (!testLocationId) return;

    // Delete subscriptions first (if any)
    await prisma.subscription.deleteMany({
      where: { locationId: testLocationId },
    });

    // Delete location (cascade will handle relationships)
    await prisma.location.delete({
      where: { locationId: testLocationId },
    });
  } catch (error) {
    // Ignore if location doesn't exist
    console.log("Test location cleanup:", error);
  }
}

test.describe("Email Subscriptions", () => {
  // Create test location and authenticate before each test
  test.beforeEach(async ({ page }) => {
    // Create test location
    await createTestLocation();

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

  // Clean up test location after each test
  test.afterEach(async () => {
    await deleteTestLocation();
  });

  test.describe("Subscription Journey", () => {
    test("should complete subscription flow with accessibility checks and navigation", async ({ page }) => {
      // Start from account home
      await page.goto("/account-home");

      // Step 1: Navigate to subscription management
      const emailSubsTile = page.getByRole("link", { name: /email subscriptions/i }).last();
      await emailSubsTile.click();
      await expect(page).toHaveURL("/subscription-management");

      // Verify subscription management page
      await expect(page).toHaveTitle(/Your email subscriptions/i);
      await expect(page.getByRole("heading", { name: /your email subscriptions/i })).toBeVisible();

      await expect(page.getByRole("button", { name: /add email subscription/i })).toBeVisible();

      // Check accessibility on subscription management page
      let accessibilityScanResults = await new AxeBuilder({ page })
        .disableRules(["region"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Step 2: Navigate to location search
      await page.getByRole("button", { name: /add email subscription/i }).click();
      await expect(page).toHaveURL("/location-name-search");

      // Verify location search page
      await expect(page.getByRole("heading", { name: /subscribe by court or tribunal name/i })).toBeVisible();

      const jurisdictionLabel = page.getByText(/jurisdiction/i).first();
      await expect(jurisdictionLabel).toBeVisible();
      const regionLabel = page.getByText(/region/i).first();
      await expect(regionLabel).toBeVisible();

      // Check accessibility on location search page
      await page.waitForLoadState("networkidle");
      accessibilityScanResults = await new AxeBuilder({ page })
        .disableRules(["region"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Test back navigation from location search
      await page.locator(".govuk-back-link").click();
      await expect(page).toHaveURL("/subscription-management");

      // Navigate back to location search
      await page.getByRole("button", { name: /add email subscription/i }).click();
      await expect(page).toHaveURL("/location-name-search");

      // Step 3: Select the test location and continue
      await page.waitForLoadState("networkidle");
      const postForm = page.locator("form[method='post']");

      // Find checkbox for our specific test location by its ID
      const testLocationCheckbox = page.locator(`#location-${testLocationId}`);
      await testLocationCheckbox.waitFor({ state: "visible" });
      await testLocationCheckbox.check();
      await expect(testLocationCheckbox).toBeChecked();

      const continueButton = postForm.getByRole("button", { name: /continue/i });
      await continueButton.click();

      // Step 4: Verify pending subscriptions page
      await expect(page).toHaveURL("/pending-subscriptions");

      await expect(page.locator("h1")).toBeVisible();

      const confirmButton = page.getByRole("button", { name: /confirm/i });
      await expect(confirmButton).toBeVisible();

      const removeButtons = page.getByRole("button", { name: /remove/i });
      await expect(removeButtons.first()).toBeVisible();

      // Check accessibility on pending subscriptions page
      accessibilityScanResults = await new AxeBuilder({ page })
        .disableRules(["region"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Step 5: Confirm subscription
      await confirmButton.click();

      // Step 6: Verify confirmation page
      await expect(page).toHaveURL("/subscription-confirmed", { timeout: 10000 });

      const panel = page.locator(".govuk-panel--confirmation");
      await expect(panel).toBeVisible();

      const manageLink = page.getByRole("link", { name: /manage.*subscriptions/i });
      await expect(manageLink).toBeVisible();

      // Check accessibility on confirmation page
      accessibilityScanResults = await new AxeBuilder({ page })
        .disableRules(["region"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Navigate back to subscription management
      await manageLink.click();
      await expect(page).toHaveURL("/subscription-management");
    });
  });

  test.describe("Unsubscribe Journey", () => {
    test("should complete unsubscribe flow with validation and accessibility checks", async ({ page }) => {
      await page.goto("/subscription-management");

      const deleteLinks = page.getByRole("button", { name: /remove/i });
      const count = await deleteLinks.count();

      if (count > 0) {
        // Step 1: Navigate to delete subscription page
        await deleteLinks.first().click();
        await expect(page).toHaveURL(/\/delete-subscription/);

        // Verify delete subscription page elements
        const yesRadio = page.getByRole("radio", { name: /yes/i });
        const noRadio = page.getByRole("radio", { name: /no/i });
        await expect(yesRadio).toBeVisible();
        await expect(noRadio).toBeVisible();

        // Step 2: Test validation - continue without selecting should show error
        const continueButton = page.getByRole("button", { name: /continue/i });
        await continueButton.click();
        const errorMessage = page.getByText(/select yes if you want to remove this subscription/i);
        await expect(errorMessage).toBeVisible();

        // Step 3: Test "No" option - should return to subscription management
        await noRadio.check();
        await continueButton.click();
        await expect(page).toHaveURL("/subscription-management");

        // Step 4: Complete full unsubscribe flow - select "Yes" option
        const deleteLinksAgain = page.getByRole("button", { name: /remove/i });

        if ((await deleteLinksAgain.count()) > 0) {
          await deleteLinksAgain.first().click();
          await expect(page).toHaveURL(/\/delete-subscription/);

          await page.getByRole("radio", { name: /yes/i }).check();
          await page.getByRole("button", { name: /continue/i }).click();

          // Step 5: Verify unsubscribe confirmation page
          await expect(page).toHaveURL("/unsubscribe-confirmation");

          const panel = page.locator(".govuk-panel--confirmation");
          await expect(panel).toBeVisible();

          const manageLink = page.getByRole("link", { name: /manage.*subscriptions/i });
          await expect(manageLink).toBeVisible();

          // Check accessibility on confirmation page
          const accessibilityScanResults = await new AxeBuilder({ page })
            .disableRules(["region"])
            .analyze();
          expect(accessibilityScanResults.violations).toEqual([]);

          // Navigate back to subscription management
          await manageLink.click();
          await expect(page).toHaveURL("/subscription-management");
        }
      }
    });
  });

  test.describe("Authentication Protection", () => {
    test("should require authentication for all subscription pages", async ({ page, context }) => {
      await context.clearCookies();

      // Test all subscription pages redirect to sign-in when not authenticated
      const protectedPages = [
        "/subscription-management",
        "/location-name-search",
        "/pending-subscriptions",
        "/subscription-confirmed",
        "/delete-subscription?subscriptionId=550e8400-e29b-41d4-a716-446655440000",
        "/unsubscribe-confirmation",
      ];

      for (const url of protectedPages) {
        await page.goto(url);
        await expect(page).toHaveURL(/\/sign-in/);
      }
    });
  });
});
