import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginWithCftIdam } from "../utils/cft-idam-helpers.js";
import { prisma } from "@hmcts/postgres";

interface TestData {
  locationId1: number;
  locationName1: string;
  locationWelshName1: string;
  locationId2: number;
  locationName2: string;
  locationWelshName2: string;
  locationId3: number;
  locationName3: string;
  locationWelshName3: string;
}

const testDataMap = new Map<string, TestData>();

async function createTestData(): Promise<TestData> {
  const timestamp = Date.now();
  const random = Math.random();

  const timestampPart = timestamp % 1000000000;
  const randomPart = Math.floor(random * 1000000000);
  const combined = timestampPart + randomPart;
  const baseLocationId = 1000000000 + (combined % 1000000000);

  const locationId1 = baseLocationId;
  const locationId2 = baseLocationId + 1;
  const locationId3 = baseLocationId + 2;

  const locationName1 = `E2E Bulk Test Location 1 ${timestamp}-${random}`;
  const locationWelshName1 = `Lleoliad Prawf Swmp E2E 1 ${timestamp}-${random}`;
  const locationName2 = `E2E Bulk Test Location 2 ${timestamp}-${random}`;
  const locationWelshName2 = `Lleoliad Prawf Swmp E2E 2 ${timestamp}-${random}`;
  const locationName3 = `E2E Bulk Test Location 3 ${timestamp}-${random}`;
  const locationWelshName3 = `Lleoliad Prawf Swmp E2E 3 ${timestamp}-${random}`;

  const subJurisdiction = await prisma.subJurisdiction.findFirst();
  const region = await prisma.region.findFirst();

  if (!subJurisdiction || !region) {
    throw new Error("No sub-jurisdiction or region found in database");
  }

  for (const [id, name, welshName] of [
    [locationId1, locationName1, locationWelshName1],
    [locationId2, locationName2, locationWelshName2],
    [locationId3, locationName3, locationWelshName3],
  ]) {
    await prisma.location.upsert({
      where: { locationId: id },
      create: {
        locationId: id,
        name: name,
        welshName: welshName,
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
        name: name,
        welshName: welshName,
        email: "test.location@test.hmcts.net",
        contactNo: "01234567890",
      },
    });
  }

  return {
    locationId1,
    locationName1,
    locationWelshName1,
    locationId2,
    locationName2,
    locationWelshName2,
    locationId3,
    locationName3,
    locationWelshName3,
  };
}

async function deleteTestData(testData: TestData): Promise<void> {
  try {
    await prisma.subscription.deleteMany({
      where: {
        searchType: "LOCATION_ID",
        searchValue: {
          in: [
            testData.locationId1.toString(),
            testData.locationId2.toString(),
            testData.locationId3.toString()
          ],
        },
      },
    });

    await prisma.location.deleteMany({
      where: {
        locationId: {
          in: [testData.locationId1, testData.locationId2, testData.locationId3],
        },
      },
    });
  } catch (error) {
    console.log("Test data cleanup:", error);
  }
}

test.describe("Bulk Unsubscribe", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Validate required environment variables
    if (!process.env.CFT_VALID_TEST_ACCOUNT || !process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD) {
      throw new Error(
        'Missing required environment variables: CFT_VALID_TEST_ACCOUNT and CFT_VALID_TEST_ACCOUNT_PASSWORD. ' +
        'Please run E2E tests using: node e2e-tests/run-with-credentials.js test bulk-unsubscribe.spec.ts'
      );
    }

    const testData = await createTestData();
    testDataMap.set(testInfo.testId, testData);

    await page.goto("/sign-in");
    const hmctsRadio = page.getByRole("radio", { name: /with a myhmcts account/i });
    await hmctsRadio.check();
    const continueButton = page.getByRole("button", { name: /continue/i });
    await continueButton.click();

    await loginWithCftIdam(
      page,
      process.env.CFT_VALID_TEST_ACCOUNT,
      process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD
    );

    await expect(page).toHaveURL(/\/account-home/);
  });

  test.afterEach(async ({}, testInfo) => {
    const testData = testDataMap.get(testInfo.testId);
    if (testData) {
      await deleteTestData(testData);
      testDataMap.delete(testInfo.testId);
    }
  });

  test("Verified user can bulk unsubscribe", async ({ page }, testInfo) => {
    const testData = testDataMap.get(testInfo.testId);
    if (!testData) throw new Error("Test data not found");

    // STEP 1: Create multiple subscriptions to test bulk unsubscribe
    await page.goto("/account-home");
    const emailSubsTile = page.locator(".verified-tile").nth(2);
    await emailSubsTile.click();
    await expect(page).toHaveURL("/subscription-management");

    // Add first subscription
    await page.getByRole("button", { name: /add email subscription/i }).click();
    await page.waitForLoadState("networkidle");
    // Select court or tribunal subscription method
    await page.getByRole("radio", { name: /court or tribunal/i }).check();
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForLoadState("networkidle");
    const location1Checkbox = page.locator(`#location-${testData.locationId1}`);
    await location1Checkbox.check();
    await page.locator("form[method='post']").getByRole("button", { name: /continue/i }).click();
    // Navigate through locations review
    await expect(page).toHaveURL("/subscription-locations-review");
    await page.getByRole("button", { name: /continue/i }).click();
    // Select a list type
    await expect(page).toHaveURL("/subscription-list-types");
    await page.locator('input[name="listTypes"]').first().check();
    await page.getByRole("button", { name: /continue/i }).click();
    // Select language
    await expect(page).toHaveURL("/subscription-list-language");
    await page.getByRole("radio", { name: /english/i }).check();
    await page.getByRole("button", { name: /continue/i }).click();
    // Confirm subscription
    await expect(page).toHaveURL("/subscription-confirm");
    await page.getByRole("button", { name: /confirm/i }).click();
    await expect(page).toHaveURL("/subscription-confirmed", { timeout: 10000 });
    await page.getByRole("link", { name: /manage.*subscriptions/i }).click();

    // Add second subscription
    await page.getByRole("button", { name: /add email subscription/i }).click();
    await page.waitForLoadState("networkidle");
    // Select court or tribunal subscription method
    await page.getByRole("radio", { name: /court or tribunal/i }).check();
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForLoadState("networkidle");
    const location2Checkbox = page.locator(`#location-${testData.locationId2}`);
    await location2Checkbox.check();
    await page.locator("form[method='post']").getByRole("button", { name: /continue/i }).click();
    // Navigate through locations review
    await expect(page).toHaveURL("/subscription-locations-review");
    await page.getByRole("button", { name: /continue/i }).click();
    // Select a list type
    await expect(page).toHaveURL("/subscription-list-types");
    await page.locator('input[name="listTypes"]').first().check();
    await page.getByRole("button", { name: /continue/i }).click();
    // Select language
    await expect(page).toHaveURL("/subscription-list-language");
    await page.getByRole("radio", { name: /english/i }).check();
    await page.getByRole("button", { name: /continue/i }).click();
    // Confirm subscription
    await expect(page).toHaveURL("/subscription-confirm");
    await page.getByRole("button", { name: /confirm/i }).click();
    await expect(page).toHaveURL("/subscription-confirmed", { timeout: 10000 });
    await page.getByRole("link", { name: /manage.*subscriptions/i }).click();

    // Add third subscription
    await page.getByRole("button", { name: /add email subscription/i }).click();
    await page.waitForLoadState("networkidle");
    // Select court or tribunal subscription method
    await page.getByRole("radio", { name: /court or tribunal/i }).check();
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForLoadState("networkidle");
    const location3Checkbox = page.locator(`#location-${testData.locationId3}`);
    await location3Checkbox.check();
    await page.locator("form[method='post']").getByRole("button", { name: /continue/i }).click();
    // Navigate through locations review
    await expect(page).toHaveURL("/subscription-locations-review");
    await page.getByRole("button", { name: /continue/i }).click();
    // Select a list type
    await expect(page).toHaveURL("/subscription-list-types");
    await page.locator('input[name="listTypes"]').first().check();
    await page.getByRole("button", { name: /continue/i }).click();
    // Select language
    await expect(page).toHaveURL("/subscription-list-language");
    await page.getByRole("radio", { name: /english/i }).check();
    await page.getByRole("button", { name: /continue/i }).click();
    // Confirm subscription
    await expect(page).toHaveURL("/subscription-confirm");
    await page.getByRole("button", { name: /confirm/i }).click();
    await expect(page).toHaveURL("/subscription-confirmed", { timeout: 10000 });
    await page.getByRole("link", { name: /manage.*subscriptions/i }).click();

    // STEP 2: Navigate to bulk unsubscribe from subscription management
    await expect(page).toHaveURL("/subscription-management");
    const bulkUnsubscribeButton = page.getByRole("button", { name: /bulk unsubscribe/i });
    await expect(bulkUnsubscribeButton).toBeVisible();
    await bulkUnsubscribeButton.click();
    await expect(page).toHaveURL("/bulk-unsubscribe");

    // STEP 3: Verify page structure and accessibility
    await expect(page.getByRole("heading", { name: /bulk unsubscribe/i, level: 1 })).toBeVisible();

    // Check accessibility on bulk unsubscribe page
    let accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["region"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 4: Test "All subscriptions" view displays both tables
    const allLink = page.getByRole("link", { name: /all subscriptions/i });
    const caseLink = page.getByRole("link", { name: /subscriptions by case/i });
    const courtLink = page.getByRole("link", { name: /subscriptions by court or tribunal/i });

    await expect(allLink).toBeVisible();
    await expect(caseLink).toBeVisible();
    await expect(courtLink).toBeVisible();

    // Verify both tables are displayed (all subscriptions view shows both)
    await expect(page.getByRole('cell', { name: testData.locationName1 }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: testData.locationName2 }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: testData.locationName3 }).first()).toBeVisible();

    // STEP 5: Test "Subscriptions by court or tribunal" view
    await courtLink.click();
    await expect(page).toHaveURL(/view=location/);
    await expect(page.getByRole('cell', { name: testData.locationName1 }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: testData.locationName2 }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: testData.locationName3 }).first()).toBeVisible();

    // STEP 6: Navigate back to all subscriptions
    await allLink.click();
    await expect(page).toHaveURL(/view=all/);

    // STEP 7: Test Welsh translation
    await page.goto("/bulk-unsubscribe?lng=cy");
    // Verify Welsh content appears (placeholder text as per spec)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Switch back to English
    await page.goto("/bulk-unsubscribe?lng=en");

    // STEP 8: Test validation - submitting with no checkboxes selected
    const bulkUnsubscribeSubmitButton = page.locator('form[method="post"]').getByRole("button", { name: /bulk unsubscribe/i });
    await bulkUnsubscribeSubmitButton.click();

    // Verify error summary and message
    const errorSummary = page.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(page.getByText(/at least one subscription must be selected/i)).toBeVisible();

    // STEP 9: Test select-all functionality for court subscriptions
    const selectAllCourtCheckbox = page.getByRole('checkbox', { name: /select all court subscriptions/i });
    await selectAllCourtCheckbox.check();

    // Verify all court subscription checkboxes are checked
    const checkbox1 = page.getByRole('checkbox', { name: new RegExp(`Select ${testData.locationName1}`) }).first();
    const checkbox2 = page.getByRole('checkbox', { name: new RegExp(`Select ${testData.locationName2}`) }).first();
    const checkbox3 = page.getByRole('checkbox', { name: new RegExp(`Select ${testData.locationName3}`) }).first();

    await expect(checkbox1).toBeChecked();
    await expect(checkbox2).toBeChecked();
    await expect(checkbox3).toBeChecked();

    // Uncheck select-all
    await selectAllCourtCheckbox.uncheck();
    await expect(checkbox1).not.toBeChecked();
    await expect(checkbox2).not.toBeChecked();
    await expect(checkbox3).not.toBeChecked();

    // STEP 10: Select specific subscriptions manually
    await checkbox1.check();
    await checkbox2.check();

    // STEP 11: Test view switching
    // Note: Checkbox selections are not currently synchronized across views
    // Each view maintains independent checkbox state
    await courtLink.click();
    await allLink.click();

    // STEP 12: Navigate back to subscription management
    await page.goto("/subscription-management");

    // Navigate back to bulk unsubscribe
    await page.getByRole("button", { name: /bulk unsubscribe/i }).click();
    await expect(page).toHaveURL("/bulk-unsubscribe");

    // Re-select subscriptions
    await checkbox1.check();
    await checkbox2.check();

    // STEP 13: Proceed to confirmation page
    await bulkUnsubscribeSubmitButton.click();
    await expect(page).toHaveURL(/\/confirm-bulk-unsubscribe/);

    // STEP 14: Verify confirmation page displays selected subscriptions
    await expect(page.getByRole("heading", { name: /are you sure you want to remove these subscriptions/i, level: 1 })).toBeVisible();
    await expect(page.getByRole('cell', { name: testData.locationName1 }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: testData.locationName2 }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: testData.locationName3 }).first()).not.toBeVisible(); // Not selected

    // Check accessibility on confirmation page
    accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["region"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 15: Test validation - submitting with no radio selected
    const continueButton = page.getByRole("button", { name: /continue/i });
    await continueButton.click();

    const errorSummaryConfirm = page.locator(".govuk-error-summary");
    await expect(errorSummaryConfirm).toBeVisible();
    await expect(page.getByText(/an option must be selected/i).first()).toBeVisible();

    // STEP 16: Test keyboard navigation for radio buttons
    const yesRadio = page.getByRole("radio", { name: /yes/i });
    const noRadio = page.getByRole("radio", { name: /no/i });

    await yesRadio.focus();
    await page.keyboard.press("ArrowDown");
    await expect(noRadio).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(yesRadio).toBeFocused();

    // STEP 17: Test "No" radio returns to subscription management
    await noRadio.check();
    await continueButton.click();
    await expect(page).toHaveURL("/subscription-management");

    // STEP 18: Complete full bulk unsubscribe flow - select "Yes"
    await page.getByRole("button", { name: /bulk unsubscribe/i }).click();
    await checkbox1.check();
    await checkbox2.check();
    await bulkUnsubscribeSubmitButton.click();
    await expect(page).toHaveURL(/\/confirm-bulk-unsubscribe/);

    await yesRadio.check();
    await continueButton.click();

    // STEP 19: Verify success page
    await expect(page).toHaveURL("/bulk-unsubscribe-success");

    const successPanel = page.locator(".govuk-panel--confirmation");
    await expect(successPanel).toBeVisible();
    await expect(page.getByRole("heading", { name: /email subscriptions updated/i })).toBeVisible();

    // Verify success page content
    await expect(page.getByText(/to continue, you can go to your account in order to/i)).toBeVisible();
    await expect(page.getByText(/add a new email subscription/i)).toBeVisible();
    await expect(page.getByText(/manage your current email subscriptions/i)).toBeVisible();
    await expect(page.getByText(/find a court or tribunal/i)).toBeVisible();

    // Check accessibility on success page
    accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["region"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 20: Test Welsh translation on success page
    await page.goto("/bulk-unsubscribe-success?lng=cy");
    await expect(page.locator(".govuk-panel--confirmation")).toBeVisible();

    // STEP 21: Verify subscriptions were actually deleted from database
    const remainingSubscriptions = await prisma.subscription.findMany({
      where: {
        searchType: "LOCATION_ID",
        searchValue: {
          in: [testData.locationId1.toString(), testData.locationId2.toString()],
        },
      },
    });

    expect(remainingSubscriptions).toHaveLength(0);

    // STEP 22: Verify non-deleted subscription still exists
    const subscription3 = await prisma.subscription.findFirst({
      where: {
        searchType: "LOCATION_ID",
        searchValue: testData.locationId3.toString(),
      },
    });

    expect(subscription3).not.toBeNull();

    // Test completes successfully - bulk unsubscribe functionality verified
  });
});
