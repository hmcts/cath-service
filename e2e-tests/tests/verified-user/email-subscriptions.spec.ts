import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginWithCftIdam } from "../../utils/cft-idam-helpers.js";
import { createUniqueTestLocation } from "../../utils/dynamic-test-data.js";
import { deleteTestSubscriptions } from "../../utils/test-support-api.js";

interface TestLocationData {
  locationId: number;
  name: string;
  welshName: string;
}

const testLocationMap = new Map<string, TestLocationData>();

test.describe("Email Subscriptions", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }, testInfo) => {
    // Create prefixed test location - cleanup handled by global teardown
    const locationData = await createUniqueTestLocation({ namePrefix: "Email Sub Court" });
    testLocationMap.set(testInfo.testId, locationData);

    await page.goto("/sign-in");
    const hmctsRadio = page.getByRole("radio", { name: /with a myhmcts account/i });
    await hmctsRadio.check();
    await page.getByRole("button", { name: /continue/i }).click();
    await loginWithCftIdam(page, process.env.CFT_VALID_TEST_ACCOUNT!, process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD!);
    await expect(page).toHaveURL(/\/account-home/);
  });

  test.afterEach(async ({ request: _ }, testInfo) => {
    // Only cleanup subscriptions - locations are prefixed and handled by global teardown
    const locationData = testLocationMap.get(testInfo.testId);
    if (locationData) {
      try {
        await deleteTestSubscriptions({ searchType: "LOCATION_ID", searchValues: [String(locationData.locationId)] });
      } catch {
        // Ignore cleanup errors
      }
      testLocationMap.delete(testInfo.testId);
    }
  });

  test("complete subscription journey with authentication protection and accessibility", async ({ page, context }, testInfo) => {
    const locationData = testLocationMap.get(testInfo.testId);
    if (!locationData) throw new Error("Test location data not found");

    // STEP 1: Test authentication protection (before login session)
    await context.clearCookies();
    const protectedPages = ["/subscription-management", "/location-name-search", "/pending-subscriptions", "/subscription-confirmed"];
    for (const url of protectedPages) {
      await page.goto(url);
      await expect(page).toHaveURL(/\/sign-in/);
    }

    // Re-authenticate after testing protection
    await page.goto("/sign-in");
    await page.getByRole("radio", { name: /with a myhmcts account/i }).check();
    await page.getByRole("button", { name: /continue/i }).click();
    await loginWithCftIdam(page, process.env.CFT_VALID_TEST_ACCOUNT!, process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD!);

    // STEP 2: Navigate to subscription management
    await page.goto("/account-home");
    const emailSubsTile = page.locator(".verified-tile").nth(2);
    await emailSubsTile.click();
    await expect(page).toHaveURL("/subscription-management");
    await expect(page).toHaveTitle(/Your email subscriptions/i);
    await expect(page.getByRole("heading", { name: /your email subscriptions/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /add email subscription/i })).toBeVisible();

    // Check accessibility on subscription management page
    let accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 3: Navigate to location search via subscription choice page
    await page.getByRole("button", { name: /add email subscription/i }).click();
    await expect(page).toHaveURL("/add-email-subscription");
    await page.getByRole("radio", { name: /by court or tribunal name/i }).check();
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL("/location-name-search");
    await expect(page.getByRole("heading", { name: /subscribe by court or tribunal name/i })).toBeVisible();
    await expect(page.getByText(/jurisdiction/i).first()).toBeVisible();
    await expect(page.getByText(/region/i).first()).toBeVisible();

    // Check accessibility on location search page
    await page.waitForLoadState("networkidle");
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 4: Test back navigation (JS history back goes to previous page in flow)
    await page.locator(".govuk-back-link").click();
    await expect(page).toHaveURL("/add-email-subscription");
    await page.getByRole("radio", { name: /by court or tribunal name/i }).check();
    await page.getByRole("button", { name: /continue/i }).click();

    // STEP 5: Select test location and continue
    await page.waitForLoadState("networkidle");
    const testLocationCheckbox = page.locator(`#location-${locationData.locationId}`);
    await testLocationCheckbox.waitFor({ state: "visible" });
    await testLocationCheckbox.check();
    await expect(testLocationCheckbox).toBeChecked();

    await page
      .locator("form[method='post']")
      .getByRole("button", { name: /continue/i })
      .click();

    // STEP 6: Verify pending subscriptions page
    await expect(page).toHaveURL("/pending-subscriptions");
    await expect(page.locator("h1")).toBeVisible();
    const confirmButton = page.getByRole("button", { name: /^continue$/i });
    await expect(confirmButton).toBeVisible();
    await expect(page.getByRole("button", { name: /remove/i }).first()).toBeVisible();

    // Check accessibility on pending subscriptions page
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 7: Proceed from pending subscriptions to list type selection
    await confirmButton.click();
    await expect(page).toHaveURL("/subscription-add-list");

    // STEP 8: Select list type and continue
    await page.waitForLoadState("networkidle");
    const firstListType = page.locator(".list-item").first();
    await firstListType.waitFor({ state: "visible" });
    await firstListType.check();
    await page
      .locator("form[method='post']")
      .getByRole("button", { name: /continue/i })
      .click();
    await expect(page).toHaveURL("/subscription-add-list-language");

    // STEP 9: Select language and continue
    await page.getByRole("radio", { name: /^english$/i }).check();
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL("/subscription-confirmation-preview");

    // STEP 10: Confirm subscriptions
    await page.getByRole("button", { name: /confirm subscriptions/i }).click();
    await expect(page).toHaveURL("/subscription-confirmed", { timeout: 10000 });

    // STEP 11: Verify confirmation page
    const panel = page.locator(".govuk-panel--confirmation");
    await expect(panel).toBeVisible();
    const manageLink = page.getByRole("link", { name: /manage.*subscriptions/i });
    await expect(manageLink).toBeVisible();

    // Check accessibility on confirmation page
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Navigate back to subscription management
    await manageLink.click();
    await expect(page).toHaveURL("/subscription-management");
  });

  test("complete unsubscribe journey with validation and accessibility @nightly", async ({ page }, testInfo) => {
    const locationData = testLocationMap.get(testInfo.testId);
    if (!locationData) throw new Error("Test location data not found");

    // STEP 1: First create a subscription to unsubscribe from
    await page.goto("/account-home");
    await page.locator(".verified-tile").nth(2).click();
    await page.getByRole("button", { name: /add email subscription/i }).click();
    await page.getByRole("radio", { name: /by court or tribunal name/i }).check();
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForLoadState("networkidle");
    await page.locator(`#location-${locationData.locationId}`).check();
    await page
      .locator("form[method='post']")
      .getByRole("button", { name: /continue/i })
      .click();
    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(page).toHaveURL("/subscription-add-list");
    await page.waitForLoadState("networkidle");
    await page.locator(".list-item").first().check();
    await page
      .locator("form[method='post']")
      .getByRole("button", { name: /continue/i })
      .click();
    await page.getByRole("radio", { name: /^english$/i }).check();
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByRole("button", { name: /confirm subscriptions/i }).click();
    await expect(page).toHaveURL("/subscription-confirmed", { timeout: 10000 });
    await page.getByRole("link", { name: /manage.*subscriptions/i }).click();

    // STEP 2: Navigate to delete subscription page
    await page.goto("/subscription-management");
    const removeButtonForTestLocation = page.getByRole("button", {
      name: `Unsubscribe from ${locationData.name}`
    });
    await removeButtonForTestLocation.click();
    await expect(page).toHaveURL(/\/delete-subscription/);

    // Verify delete subscription page elements
    const yesRadio = page.getByRole("radio", { name: /yes/i });
    const noRadio = page.getByRole("radio", { name: /no/i });
    await expect(yesRadio).toBeVisible();
    await expect(noRadio).toBeVisible();

    // STEP 3: Test validation - continue without selecting should show error
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(/select yes if you want to remove this subscription/i)).toBeVisible();

    // STEP 4: Test "No" option - should return to subscription management
    await noRadio.check();
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL("/subscription-management");

    // STEP 5: Complete full unsubscribe flow
    await page.getByRole("button", { name: `Unsubscribe from ${locationData.name}` }).click();
    await expect(page).toHaveURL(/\/delete-subscription/);

    await page.getByRole("radio", { name: /yes/i }).check();
    await page.getByRole("button", { name: /continue/i }).click();

    // STEP 6: Verify unsubscribe confirmation page
    await expect(page).toHaveURL("/unsubscribe-confirmation");
    const panel = page.locator(".govuk-panel--confirmation");
    await expect(panel).toBeVisible();
    const manageLink = page.getByRole("link", { name: /manage.*subscriptions/i });
    await expect(manageLink).toBeVisible();

    // Check accessibility on confirmation page
    const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Navigate back to subscription management
    await manageLink.click();
    await expect(page).toHaveURL("/subscription-management");
  });
});
