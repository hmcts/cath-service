import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { prisma } from "@hmcts/postgres";
import { expect, test } from "@playwright/test";
import { loginWithCftIdam } from "../utils/cft-idam-helpers.js";

interface TestCaseData {
  artefactId: string;
  caseNumber: string;
  caseName: string;
}

// Map to store test-specific case data, keyed by test ID
const testCaseDataMap = new Map<string, TestCaseData>();

async function createTestCaseData(): Promise<TestCaseData> {
  const artefactId = randomUUID();
  const caseNumber = `E2E-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const caseName = `E2E Test Case ${Date.now()}`;

  const now = new Date();
  const displayTo = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Ensure ListSearchConfig exists for listTypeId 1 (CIVIL_DAILY_CAUSE_LIST)
  // so that searchByCaseName can find results
  await prisma.listSearchConfig.upsert({
    where: { listTypeId: 1 },
    create: {
      listTypeId: 1,
      caseNumberFieldName: "case_number",
      caseNameFieldName: "case_name"
    },
    update: {}
  });

  // Create Artefact with displayFrom/displayTo window covering now
  await prisma.artefact.create({
    data: {
      artefactId,
      locationId: "1",
      listTypeId: 1,
      contentDate: now,
      sensitivity: "Public",
      language: "ENGLISH",
      displayFrom: now,
      displayTo,
      isFlatFile: false,
      provenance: "CFT_IDAM"
    }
  });

  // Create ArtefactSearch record linked to the artefact
  await prisma.artefactSearch.create({
    data: {
      artefactId,
      caseNumber,
      caseName
    }
  });

  return { artefactId, caseNumber, caseName };
}

async function deleteTestCaseData(data: TestCaseData): Promise<void> {
  try {
    // Delete subscriptions created for this test case
    await prisma.subscription.deleteMany({
      where: { caseNumber: data.caseNumber }
    });

    // Deleting the artefact cascades to artefactSearch
    await prisma.artefact.deleteMany({
      where: { artefactId: data.artefactId }
    });
  } catch (error) {
    console.log("Test case data cleanup:", error);
  }
}

test.describe("Case Subscriptions", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const caseData = await createTestCaseData();
    testCaseDataMap.set(testInfo.testId, caseData);

    await page.goto("/sign-in");

    const hmctsRadio = page.getByRole("radio", { name: /with a myhmcts account/i });
    await hmctsRadio.check();
    await page.getByRole("button", { name: /continue/i }).click();

    await loginWithCftIdam(page, process.env.CFT_VALID_TEST_ACCOUNT!, process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD!);

    await expect(page).toHaveURL(/\/account-home/);
  });

  test.afterEach(async ({}, testInfo) => {
    const caseData = testCaseDataMap.get(testInfo.testId);
    if (caseData) {
      await deleteTestCaseData(caseData);
      testCaseDataMap.delete(testInfo.testId);
    }
  });

  test("should complete case name subscription journey with accessibility checks", async ({ page }, testInfo) => {
    const caseData = testCaseDataMap.get(testInfo.testId);
    if (!caseData) throw new Error("Test case data not found");

    // Step 1: Navigate to add email subscription
    await page.goto("/add-email-subscription");
    await page.getByRole("radio", { name: /by case name/i }).check();
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL("/case-name-search");

    // Check accessibility on case name search page
    let accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Step 2: Validate - submit empty form shows error
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(/please enter a minimum of 3 characters/i)).toBeVisible();

    // Step 3: Search using part of the case name
    await page.getByLabel(/case name/i).fill("E2E Test");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL("/case-search-results");

    // Check accessibility on case search results page
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Step 4: Validate - submit without selecting a case shows error
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(/select a case/i)).toBeVisible();

    // Step 5: Select the test case by its case name
    await page.getByRole("checkbox", { name: new RegExp(caseData.caseName) }).check();
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL("/pending-subscriptions");

    // Step 6: Verify pending subscriptions page shows the case
    await expect(page.getByText(caseData.caseName)).toBeVisible();

    // Check Welsh translation on pending-subscriptions
    await page.getByRole("link", { name: /cymraeg/i }).click();
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    await page.getByRole("link", { name: /english/i }).click();

    // Check accessibility on pending subscriptions page
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Step 7: Confirm subscription
    await page.getByRole("button", { name: /confirm/i }).click();
    await expect(page).toHaveURL("/subscription-confirmed", { timeout: 10000 });

    // Verify confirmation panel
    const panel = page.locator(".govuk-panel--confirmation");
    await expect(panel).toBeVisible();

    // Check accessibility on confirmation page
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Navigate to subscription management
    await page.getByRole("link", { name: /manage.*subscriptions/i }).click();
    await expect(page).toHaveURL("/subscription-management");
  });

  test("should complete case reference number subscription journey with accessibility checks @nightly", async ({ page }, testInfo) => {
    const caseData = testCaseDataMap.get(testInfo.testId);
    if (!caseData) throw new Error("Test case data not found");

    // Step 1: Navigate to add email subscription
    await page.goto("/add-email-subscription");
    await page.getByRole("radio", { name: /by case reference number/i }).check();
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL("/case-reference-search");

    // Check accessibility on case reference search page
    let accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Step 2: Validate - submit empty form shows error
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(/enter a valid case reference number/i)).toBeVisible();

    // Step 3: Search using the exact case number
    await page.getByLabel(/reference number/i).fill(caseData.caseNumber);
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL("/case-search-results");

    // Check accessibility on case search results page
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Step 4: Select the test case
    await page.getByRole("checkbox", { name: new RegExp(caseData.caseName) }).check();
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL("/pending-subscriptions");

    // Step 5: Verify pending subscriptions page shows the case
    await expect(page.getByText(caseData.caseName)).toBeVisible();

    // Check accessibility on pending subscriptions page
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Step 6: Confirm subscription
    await page.getByRole("button", { name: /confirm/i }).click();
    await expect(page).toHaveURL("/subscription-confirmed", { timeout: 10000 });

    // Verify confirmation panel
    const panel = page.locator(".govuk-panel--confirmation");
    await expect(panel).toBeVisible();

    // Check accessibility on confirmation page
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Navigate to subscription management
    await page.getByRole("link", { name: /manage.*subscriptions/i }).click();
    await expect(page).toHaveURL("/subscription-management");
  });
});
