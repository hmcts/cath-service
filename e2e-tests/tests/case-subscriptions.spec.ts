import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginWithCftIdam } from "../utils/cft-idam-helpers.js";
import { prisma } from "@hmcts/postgres";

// Store test data per test to avoid parallel test conflicts
interface TestCaseData {
  caseName: string;
  caseNumber: string;
  artefactId: string;
}

const testDataMap = new Map<string, TestCaseData>();

async function createTestCaseData(): Promise<TestCaseData> {
  const timestamp = Date.now();
  const randomId = Math.floor(Math.random() * 1000000);
  const testCaseName = `Test Case ${timestamp}-${randomId}`;
  const testCaseNumber = `TC-${timestamp}-${randomId}`;
  const testArtefactId = `test-artefact-${timestamp}-${randomId}`;

  // Create a test artefact in artefact_search table
  // This assumes VIBE-316 is complete and artefact_search table exists
  await prisma.artefactSearch.create({
    data: {
      artefactId: testArtefactId,
      caseName: testCaseName,
      caseNumber: testCaseNumber,
      locationId: 1 // Use first location from seed data
    }
  });

  return {
    caseName: testCaseName,
    caseNumber: testCaseNumber,
    artefactId: testArtefactId
  };
}

async function deleteTestCaseData(caseData: TestCaseData): Promise<void> {
  try {
    // Delete subscriptions first
    await prisma.subscription.deleteMany({
      where: {
        OR: [{ caseName: caseData.caseName }, { caseNumber: caseData.caseNumber }]
      }
    });

    // Delete artefact search data
    await prisma.artefactSearch.deleteMany({
      where: { artefactId: caseData.artefactId }
    });
  } catch (error) {
    console.log("Test case data cleanup:", error);
  }
}

test.describe("Case Subscriptions", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Create test case data and store in map
    const caseData = await createTestCaseData();
    testDataMap.set(testInfo.testId, caseData);

    // Navigate to sign-in page
    await page.goto("/sign-in");

    // Select HMCTS account option
    const hmctsRadio = page.getByRole("radio", { name: /with a myhmcts account/i });
    await hmctsRadio.check();

    // Click continue
    const continueButton = page.getByRole("button", { name: /continue/i });
    await continueButton.click();

    // Perform CFT IDAM login
    await loginWithCftIdam(page, process.env.CFT_VALID_TEST_ACCOUNT!, process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD!);

    // Should be redirected to account-home after successful login
    await expect(page).toHaveURL(/\/account-home/);
  });

  test.afterEach(async ({}, testInfo) => {
    const caseData = testDataMap.get(testInfo.testId);
    if (caseData) {
      await deleteTestCaseData(caseData);
      testDataMap.delete(testInfo.testId);
    }
  });

  test.describe("Subscribe by Case Name Journey", () => {
    test("should complete subscription by case name with validation, Welsh, and accessibility @nightly", async ({ page }, testInfo) => {
      const caseData = testDataMap.get(testInfo.testId);
      if (!caseData) throw new Error("Test case data not found");

      // Step 1: Navigate to subscription management
      await page.goto("/account-home");
      const emailSubsTile = page.locator(".verified-tile").nth(2);
      await emailSubsTile.click();
      await expect(page).toHaveURL("/subscription-management");

      // Verify subscription management page
      await expect(page.getByRole("heading", { name: /your email subscriptions/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /add email subscription/i })).toBeVisible();

      // Test accessibility on subscription management page
      let accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Step 2: Navigate to subscription method selection
      await page.getByRole("button", { name: /add email subscription/i }).click();
      await expect(page).toHaveURL("/subscription-add");

      // Verify subscription method selection page
      await expect(page.getByRole("heading", { name: /how do you want to subscribe/i })).toBeVisible();

      // Test validation - continue without selection
      await page.getByRole("button", { name: /continue/i }).click();
      await expect(page.getByText(/select how you want to subscribe/i)).toBeVisible();

      // Test Welsh translation
      await page.getByRole("link", { name: "Cymraeg" }).click();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.getByRole("link", { name: "English" }).click();

      // Test accessibility on subscription method page
      accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Select case name option
      const caseNameRadio = page.getByRole("radio", { name: /by case name/i });
      await caseNameRadio.check();
      await page.getByRole("button", { name: /continue/i }).click();

      // Step 3: Case name search page
      await expect(page).toHaveURL("/case-name-search");
      await expect(page.getByRole("heading", { name: /subscribe by case name/i })).toBeVisible();

      // Test validation - submit without entering case name
      await page.getByRole("button", { name: /search/i }).click();
      await expect(page.getByText(/enter a case name/i)).toBeVisible();

      // Test keyboard navigation
      await page.getByLabel(/case name/i).fill("");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Enter");
      await expect(page.getByText(/enter a case name/i)).toBeVisible();

      // Test accessibility on case name search page
      accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Enter valid case name and search
      await page.getByLabel(/case name/i).fill(caseData.caseName);
      await page.getByRole("button", { name: /search/i }).click();

      // Step 4: Search results page
      await expect(page).toHaveURL("/case-name-search-results");
      await expect(page.getByRole("heading", { name: /subscription case search results/i })).toBeVisible();

      // Verify results table with case name and reference number
      await expect(page.getByText(caseData.caseName)).toBeVisible();
      await expect(page.getByText(caseData.caseNumber)).toBeVisible();

      // Test validation - continue without selecting a case
      await page.getByRole("button", { name: /continue/i }).click();
      await expect(page.getByText(/select at least one case/i)).toBeVisible();

      // Test Welsh on results page
      await page.getByRole("link", { name: "Cymraeg" }).click();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.getByRole("link", { name: "English" }).click();

      // Test accessibility on search results page
      accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Select the case
      const caseCheckbox = page.getByRole("checkbox").first();
      await caseCheckbox.check();
      await expect(caseCheckbox).toBeChecked();
      await page.getByRole("button", { name: /continue/i }).click();

      // Step 5: Pending subscriptions page
      await expect(page).toHaveURL("/pending-subscriptions");
      await expect(page.locator("h1")).toBeVisible();

      // Verify case subscription is shown in table
      await expect(page.getByText(caseData.caseName)).toBeVisible();
      await expect(page.getByText(caseData.caseNumber)).toBeVisible();

      // Test accessibility on pending subscriptions page
      accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Confirm subscription
      const confirmButton = page.getByRole("button", { name: /confirm/i });
      await confirmButton.click();

      // Step 6: Confirmation page
      await expect(page).toHaveURL("/subscription-confirmed", { timeout: 10000 });
      const panel = page.locator(".govuk-panel--confirmation");
      await expect(panel).toBeVisible();

      // Test accessibility on confirmation page
      accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Navigate back to subscription management
      const manageLink = page.getByRole("link", { name: /manage.*subscriptions/i });
      await manageLink.click();
      await expect(page).toHaveURL("/subscription-management");

      // Verify subscription appears in the list
      await expect(page.getByText(caseData.caseName)).toBeVisible();
    });
  });

  test.describe("Subscribe by Case Reference Journey", () => {
    test("should complete subscription by case reference with validation, Welsh, and accessibility @nightly", async ({ page }, testInfo) => {
      const caseData = testDataMap.get(testInfo.testId);
      if (!caseData) throw new Error("Test case data not found");

      // Step 1: Navigate to subscription management
      await page.goto("/subscription-management");
      await expect(page.getByRole("heading", { name: /your email subscriptions/i })).toBeVisible();

      // Step 2: Navigate to subscription method selection
      await page.getByRole("button", { name: /add email subscription/i }).click();
      await expect(page).toHaveURL("/subscription-add");

      // Test accessibility
      let accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Select case reference option
      const caseRefRadio = page.getByRole("radio", { name: /by case reference/i });
      await caseRefRadio.check();
      await page.getByRole("button", { name: /continue/i }).click();

      // Step 3: Case reference search page
      await expect(page).toHaveURL("/case-number-search");
      await expect(page.getByRole("heading", { name: /subscribe by case reference/i })).toBeVisible();

      // Test validation - submit without entering reference
      await page.getByRole("button", { name: /search/i }).click();
      await expect(page.getByText(/enter a case reference/i)).toBeVisible();

      // Test Welsh translation
      await page.getByRole("link", { name: "Cymraeg" }).click();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.getByRole("link", { name: "English" }).click();

      // Test accessibility
      accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Enter valid case reference and search
      await page.getByLabel(/case reference/i).fill(caseData.caseNumber);
      await page.getByRole("button", { name: /search/i }).click();

      // Step 4: Search results page
      await expect(page).toHaveURL("/case-number-search-results");
      await expect(page.getByRole("heading", { name: /subscription case search results/i })).toBeVisible();

      // Verify results
      await expect(page.getByText(caseData.caseName)).toBeVisible();
      await expect(page.getByText(caseData.caseNumber)).toBeVisible();

      // Test accessibility
      accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Select the case
      const caseCheckbox = page.getByRole("checkbox").first();
      await caseCheckbox.check();
      await page.getByRole("button", { name: /continue/i }).click();

      // Step 5: Pending subscriptions and confirmation
      await expect(page).toHaveURL("/pending-subscriptions");
      await expect(page.getByText(caseData.caseName)).toBeVisible();

      const confirmButton = page.getByRole("button", { name: /confirm/i });
      await confirmButton.click();

      await expect(page).toHaveURL("/subscription-confirmed", { timeout: 10000 });
      const panel = page.locator(".govuk-panel--confirmation");
      await expect(panel).toBeVisible();
    });
  });

  test.describe("Multiple Search Results Journey", () => {
    test("should handle multiple search results selection @nightly", async ({ page }, testInfo) => {
      // Create additional test cases
      const caseData1 = testDataMap.get(testInfo.testId);
      if (!caseData1) throw new Error("Test case data not found");

      const timestamp = Date.now();
      const caseData2 = {
        caseName: `Test Case ${timestamp}-2`,
        caseNumber: `TC-${timestamp}-2`,
        artefactId: `test-artefact-${timestamp}-2`
      };

      // Create second test case with similar name for multiple results
      await prisma.artefactSearch.create({
        data: {
          artefactId: caseData2.artefactId,
          caseName: caseData2.caseName,
          caseNumber: caseData2.caseNumber,
          locationId: 1
        }
      });

      try {
        // Navigate to case name search
        await page.goto("/subscription-management");
        await page.getByRole("button", { name: /add email subscription/i }).click();
        const caseNameRadio = page.getByRole("radio", { name: /by case name/i });
        await caseNameRadio.check();
        await page.getByRole("button", { name: /continue/i }).click();

        // Search with partial name that returns multiple results
        await page.getByLabel(/case name/i).fill("Test Case");
        await page.getByRole("button", { name: /search/i }).click();

        // Verify multiple results displayed
        await expect(page).toHaveURL("/case-name-search-results");
        const checkboxes = page.getByRole("checkbox");
        await expect(checkboxes).not.toHaveCount(0);

        // Test accessibility
        const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
        expect(accessibilityScanResults.violations).toEqual([]);

        // Select multiple cases
        await checkboxes.first().check();
        await checkboxes.nth(1).check();

        // Continue to pending subscriptions
        await page.getByRole("button", { name: /continue/i }).click();
        await expect(page).toHaveURL("/pending-subscriptions");

        // Verify both cases are listed
        const pendingTable = page.locator("table");
        await expect(pendingTable).toBeVisible();

        // Test removing one subscription from pending
        const removeButtons = page.getByRole("button", { name: /remove/i });
        await removeButtons.first().click();

        // Confirm remaining subscription
        await page.getByRole("button", { name: /confirm/i }).click();
        await expect(page).toHaveURL("/subscription-confirmed", { timeout: 10000 });
      } finally {
        // Clean up second test case
        await prisma.subscription.deleteMany({
          where: { caseName: caseData2.caseName }
        });
        await prisma.artefactSearch.deleteMany({
          where: { artefactId: caseData2.artefactId }
        });
      }
    });
  });

  test.describe("No Results Found Journey", () => {
    test("should handle no search results with validation and accessibility @nightly", async ({ page }) => {
      // Navigate to case name search
      await page.goto("/subscription-management");
      await page.getByRole("button", { name: /add email subscription/i }).click();
      const caseNameRadio = page.getByRole("radio", { name: /by case name/i });
      await caseNameRadio.check();
      await page.getByRole("button", { name: /continue/i }).click();

      // Search for non-existent case
      await page.getByLabel(/case name/i).fill("NonExistentCase123456789");
      await page.getByRole("button", { name: /search/i }).click();

      // Should stay on search page with error message
      await expect(page).toHaveURL("/case-name-search");
      await expect(page.getByText(/no results found/i)).toBeVisible();

      // Test Welsh translation of error
      await page.getByRole("link", { name: "Cymraeg" }).click();
      await expect(page.getByText(/dim canlyniadau/i)).toBeVisible();
      await page.getByRole("link", { name: "English" }).click();

      // Test accessibility with error message
      const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Test same for case reference search
      await page.goto("/subscription-management");
      await page.getByRole("button", { name: /add email subscription/i }).click();
      const caseRefRadio = page.getByRole("radio", { name: /by case reference/i });
      await caseRefRadio.check();
      await page.getByRole("button", { name: /continue/i }).click();

      await page.getByLabel(/case reference/i).fill("NOEXIST-999");
      await page.getByRole("button", { name: /search/i }).click();

      await expect(page).toHaveURL("/case-number-search");
      await expect(page.getByText(/no results found/i)).toBeVisible();
    });
  });

  test.describe("View Subscriptions by Case Journey", () => {
    test("should view and manage case subscriptions with tabs and accessibility @nightly", async ({ page }, testInfo) => {
      const caseData = testDataMap.get(testInfo.testId);
      if (!caseData) throw new Error("Test case data not found");

      // First create a case subscription
      await page.goto("/subscription-management");
      await page.getByRole("button", { name: /add email subscription/i }).click();
      const caseNameRadio = page.getByRole("radio", { name: /by case name/i });
      await caseNameRadio.check();
      await page.getByRole("button", { name: /continue/i }).click();
      await page.getByLabel(/case name/i).fill(caseData.caseName);
      await page.getByRole("button", { name: /search/i }).click();
      await page.getByRole("checkbox").first().check();
      await page.getByRole("button", { name: /continue/i }).click();
      await page.getByRole("button", { name: /confirm/i }).click();
      await expect(page).toHaveURL("/subscription-confirmed", { timeout: 10000 });

      // Navigate back to subscription management
      const manageLink = page.getByRole("link", { name: /manage.*subscriptions/i });
      await manageLink.click();
      await expect(page).toHaveURL("/subscription-management");

      // Verify tabs are present (All, By case, By court/tribunal)
      await expect(page.getByRole("link", { name: /all/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /by case/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /by court.*tribunal/i })).toBeVisible();

      // Test Welsh translation of tabs
      await page.getByRole("link", { name: "Cymraeg" }).click();
      await expect(page.getByRole("link", { name: /pob/i })).toBeVisible();
      await page.getByRole("link", { name: "English" }).click();

      // Test accessibility with tabs
      let accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Click "By case" tab
      await page.getByRole("link", { name: /by case/i }).click();
      await expect(page).toHaveURL(/view=case/);

      // Verify case subscription is displayed
      await expect(page.getByText(caseData.caseName)).toBeVisible();
      await expect(page.getByText(caseData.caseNumber)).toBeVisible();

      // Test accessibility on case view
      accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Test removing case subscription
      const removeButton = page.getByRole("button", {
        name: `Remove subscription for ${caseData.caseName}`
      });
      await removeButton.click();
      await expect(page).toHaveURL(/\/delete-subscription/);

      // Confirm removal
      await page.getByRole("radio", { name: /yes/i }).check();
      await page.getByRole("button", { name: /continue/i }).click();
      await expect(page).toHaveURL("/unsubscribe-confirmation");

      // Navigate back to subscription management
      await page.getByRole("link", { name: /manage.*subscriptions/i }).click();

      // Verify case subscription is removed
      await page.getByRole("link", { name: /by case/i }).click();
      await expect(page.getByText(caseData.caseName)).not.toBeVisible();
    });
  });

  test.describe("Authentication Protection", () => {
    test("should require authentication for case subscription pages @nightly", async ({ page, context }) => {
      await context.clearCookies();

      // Test all case subscription pages redirect to sign-in when not authenticated
      const protectedPages = ["/subscription-add", "/case-name-search", "/case-name-search-results", "/case-number-search", "/case-number-search-results"];

      for (const url of protectedPages) {
        await page.goto(url);
        await expect(page).toHaveURL(/\/sign-in/);
      }
    });
  });
});
