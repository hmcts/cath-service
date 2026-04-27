import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginWithCftIdam } from "../../utils/cft-idam-helpers.js";
import { createUniqueTestLocation } from "../../utils/dynamic-test-data.js";
import { deleteTestSubscriptions, getTestSubscriptions } from "../../utils/test-support-api.js";

interface TestLocationData {
  locationId: number;
  name: string;
  welshName: string;
}

interface TestData {
  location1: TestLocationData;
  location2: TestLocationData;
  location3: TestLocationData;
}

const testDataMap = new Map<string, TestData>();

test.describe("Bulk Unsubscribe", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Create 3 prefixed test locations - cleanup handled by global teardown
    const [location1, location2, location3] = await Promise.all([
      createUniqueTestLocation({ namePrefix: "Bulk Unsub Court 1" }),
      createUniqueTestLocation({ namePrefix: "Bulk Unsub Court 2" }),
      createUniqueTestLocation({ namePrefix: "Bulk Unsub Court 3" })
    ]);

    testDataMap.set(testInfo.testId, { location1, location2, location3 });

    await page.goto("/sign-in");
    const hmctsRadio = page.getByRole("radio", { name: /with a myhmcts account/i });
    await hmctsRadio.check();
    const continueButton = page.getByRole("button", { name: /continue/i });
    await continueButton.click();

    await loginWithCftIdam(page, process.env.CFT_VALID_TEST_ACCOUNT!, process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD!);

    await expect(page).toHaveURL(/\/account-home/);
  });

  test.afterEach(async () => {
    // Only cleanup subscriptions - locations are prefixed and handled by global teardown
    const testData = testDataMap.get(test.info().testId);
    if (testData) {
      try {
        await deleteTestSubscriptions({
          searchType: "LOCATION_ID",
          searchValues: [String(testData.location1.locationId), String(testData.location2.locationId), String(testData.location3.locationId)]
        });
      } catch {
        // Ignore cleanup errors
      }
      testDataMap.delete(test.info().testId);
    }
  });

  test("Verified user can bulk unsubscribe", async ({ page }, testInfo) => {
    const testData = testDataMap.get(testInfo.testId);
    if (!testData) throw new Error("Test data not found");

    const { location1, location2, location3 } = testData;

    // STEP 1: Create multiple subscriptions to test bulk unsubscribe
    await page.goto("/account-home");
    const emailSubsTile = page.locator(".verified-tile").nth(2);
    await emailSubsTile.click();
    await expect(page).toHaveURL("/subscription-management");

    // Add first subscription
    await page.getByRole("button", { name: /add email subscription/i }).click();
    await page.waitForLoadState("networkidle");
    const location1Checkbox = page.locator(`#location-${location1.locationId}`);
    await location1Checkbox.check();
    await page
      .locator("form[method='post']")
      .getByRole("button", { name: /continue/i })
      .click();
    await page.getByRole("button", { name: /confirm/i }).click();
    await expect(page).toHaveURL("/subscription-confirmed", { timeout: 10000 });
    await page.getByRole("link", { name: /manage.*subscriptions/i }).click();

    // Add second subscription
    await page.getByRole("button", { name: /add email subscription/i }).click();
    await page.waitForLoadState("networkidle");
    const location2Checkbox = page.locator(`#location-${location2.locationId}`);
    await location2Checkbox.check();
    await page
      .locator("form[method='post']")
      .getByRole("button", { name: /continue/i })
      .click();
    await page.getByRole("button", { name: /confirm/i }).click();
    await expect(page).toHaveURL("/subscription-confirmed", { timeout: 10000 });
    await page.getByRole("link", { name: /manage.*subscriptions/i }).click();

    // Add third subscription
    await page.getByRole("button", { name: /add email subscription/i }).click();
    await page.waitForLoadState("networkidle");
    const location3Checkbox = page.locator(`#location-${location3.locationId}`);
    await location3Checkbox.check();
    await page
      .locator("form[method='post']")
      .getByRole("button", { name: /continue/i })
      .click();
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
    let accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 4: Test "All subscriptions" tab displays both tables
    const allTab = page.getByRole("tab", { name: /all subscriptions/i });
    const caseTab = page.getByRole("tab", { name: /subscriptions by case/i });
    const courtTab = page.getByRole("tab", { name: /subscriptions by court or tribunal/i });

    await expect(allTab).toBeVisible();
    await expect(caseTab).toBeVisible();
    await expect(courtTab).toBeVisible();

    // All subscriptions tab should be active by default
    await expect(allTab).toHaveAttribute("aria-selected", "true");

    // Verify subscriptions are displayed in the active tab panel
    const activeTabPanel = page.locator('[role="tabpanel"]:visible');
    await expect(activeTabPanel.getByRole("cell", { name: location1.name }).first()).toBeVisible();
    await expect(activeTabPanel.getByRole("cell", { name: location2.name }).first()).toBeVisible();
    await expect(activeTabPanel.getByRole("cell", { name: location3.name }).first()).toBeVisible();

    // STEP 5: Test keyboard navigation for tabs
    await allTab.focus();
    await page.keyboard.press("ArrowRight");
    await expect(caseTab).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(courtTab).toBeFocused();

    // STEP 6: Test "Subscriptions by court or tribunal" tab
    await courtTab.click();
    await expect(courtTab).toHaveAttribute("aria-selected", "true");
    const courtTabPanel = page.locator('[role="tabpanel"]:visible');
    await expect(courtTabPanel.getByRole("cell", { name: location1.name }).first()).toBeVisible();
    await expect(courtTabPanel.getByRole("cell", { name: location2.name }).first()).toBeVisible();
    await expect(courtTabPanel.getByRole("cell", { name: location3.name }).first()).toBeVisible();

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

    // STEP 9: Test select-all functionality
    const selectAllCheckbox = page.getByRole("checkbox", { name: /select all/i }).first();
    await selectAllCheckbox.check();

    // Verify all individual checkboxes are checked
    const checkbox1 = page.getByRole("checkbox", { name: new RegExp(`Select ${location1.name}`) }).first();
    const checkbox2 = page.getByRole("checkbox", { name: new RegExp(`Select ${location2.name}`) }).first();
    const checkbox3 = page.getByRole("checkbox", { name: new RegExp(`Select ${location3.name}`) }).first();

    await expect(checkbox1).toBeChecked();
    await expect(checkbox2).toBeChecked();
    await expect(checkbox3).toBeChecked();

    // Uncheck select-all
    await selectAllCheckbox.uncheck();
    await expect(checkbox1).not.toBeChecked();
    await expect(checkbox2).not.toBeChecked();
    await expect(checkbox3).not.toBeChecked();

    // STEP 10: Select specific subscriptions manually
    await checkbox1.check();
    await checkbox2.check();

    // STEP 11: Test tab switching
    // Note: Checkbox selections are not currently synchronized across tabs
    // Each tab maintains independent checkbox state
    await courtTab.click();
    await allTab.click();

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
    await expect(page.getByRole("cell", { name: location1.name }).first()).toBeVisible();
    await expect(page.getByRole("cell", { name: location2.name }).first()).toBeVisible();
    await expect(page.getByRole("cell", { name: location3.name }).first()).not.toBeVisible(); // Not selected

    // Check accessibility on confirmation page
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
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
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 20: Test Welsh translation on success page
    await page.goto("/bulk-unsubscribe-success?lng=cy");
    await expect(page.locator(".govuk-panel--confirmation")).toBeVisible();

    // STEP 21: Verify subscriptions were actually deleted from database
    const remainingSubscriptions1 = (await getTestSubscriptions({
      searchType: "LOCATION_ID",
      searchValue: location1.locationId.toString()
    })) as unknown[];

    const remainingSubscriptions2 = (await getTestSubscriptions({
      searchType: "LOCATION_ID",
      searchValue: location2.locationId.toString()
    })) as unknown[];

    expect(remainingSubscriptions1).toHaveLength(0);
    expect(remainingSubscriptions2).toHaveLength(0);

    // STEP 22: Verify non-deleted subscription still exists
    const subscription3 = (await getTestSubscriptions({
      searchType: "LOCATION_ID",
      searchValue: location3.locationId.toString()
    })) as unknown[];

    expect(subscription3.length).toBeGreaterThan(0);

    // Test completes successfully - bulk unsubscribe functionality verified
  });
});
