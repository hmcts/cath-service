import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { createUniqueTestLocation } from "../../utils/dynamic-test-data.js";
import { loadListTypeFixture } from "../../utils/publication-payloads.js";
import { uploadTestPublication } from "../../utils/publication-upload.js";
import { prefixName } from "../../utils/test-prefix.js";
import { getListSearchConfig } from "../../utils/test-support-api.js";
import { createVerifiedTestUser, loginAsTestUser, type VerifiedTestUser } from "../../utils/verified-user-helpers.js";

const CASE_LIST_TYPE = "CIVIL_DAILY_CAUSE_LIST";

interface TestLocationData {
  locationId: number;
  name: string;
  welshName: string;
}

interface TestCaseData {
  artefactId: string;
  caseNumber: string;
  caseName: string;
}

const testLocationMap = new Map<string, TestLocationData>();
const testUserMap = new Map<string, VerifiedTestUser>();
const testCaseDataMap = new Map<string, TestCaseData>();

// The case is published through real ingestion, which only extracts case search data when the list type has a
// list_search_config; that config is an environment prerequisite, so its absence fails here rather than being created
async function createTestCaseData(): Promise<TestCaseData> {
  const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  // Use prefixed names so global teardown can clean up automatically
  const caseNumber = prefixName(`E2E-${uniqueSuffix}`);
  const caseName = prefixName(`E2E Test Case ${uniqueSuffix}`);

  const searchConfig = await getListSearchConfig(CASE_LIST_TYPE);

  // Create unique location for test isolation - cleanup handled by global teardown
  const location = await createUniqueTestLocation({ namePrefix: "Case Sub Court" });

  const payload = loadListTypeFixture("civil-daily-cause-list") as CivilDailyCauseListFixture;
  const caseEntry = payload.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
  caseEntry[searchConfig.caseNumberFieldName] = caseNumber;
  caseEntry[searchConfig.caseNameFieldName] = caseName;

  const { artefactId } = await uploadTestPublication({ locationId: location.locationId, listTypeName: CASE_LIST_TYPE, payload });

  return { artefactId, caseNumber, caseName };
}

async function loginAsOwnUser(page: Page, testId: string): Promise<void> {
  const user = testUserMap.get(testId) ?? (await createVerifiedTestUser({ label: "email-subscriptions" }));
  testUserMap.set(testId, user);
  await loginAsTestUser(page, user);
  await page.goto("/account-home");
}

// Note: Cleanup is handled by global teardown via prefix-based deletion

test.describe("Email Subscriptions - Location", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const locationData = await createUniqueTestLocation({ namePrefix: "Email Sub Court" });
    testLocationMap.set(testInfo.testId, locationData);

    await loginAsOwnUser(page, testInfo.testId);
    await expect(page).toHaveURL(/\/account-home/);
  });

  // Note: Cleanup handled by global teardown - locations are prefixed, subscriptions deleted by locationId

  test("complete subscription journey with authentication protection and accessibility", async ({ page, context }, testInfo) => {
    const locationData = testLocationMap.get(testInfo.testId);
    if (!locationData) throw new Error("Test location data not found");

    // STEP 1: Test authentication protection (before login session)
    await context.clearCookies();
    const protectedPages = ["/subscription-management", "/location-name-search", "/pending-subscriptions", "/subscription-confirmed"];
    for (const url of protectedPages) {
      await page.goto(url);
      await expect(page).toHaveURL(/\/sign-in/, { timeout: 10000 });
    }

    // Re-authenticate after testing protection
    await loginAsOwnUser(page, testInfo.testId);

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

  test("complete edit list type journey with validation, Welsh, and accessibility @nightly", async ({ page }, testInfo) => {
    const locationData = testLocationMap.get(testInfo.testId);
    if (!locationData) throw new Error("Test location data not found");

    // STEP 1: First create a location subscription (required to access edit list type)
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

    // STEP 2: Navigate to subscription management and find Edit list type button
    await page.getByRole("link", { name: /manage.*subscriptions/i }).click();
    await expect(page).toHaveURL("/subscription-management");
    await page.waitForLoadState("networkidle");

    // Verify Edit list type button is visible (only appears when court subscriptions exist)
    // Note: govukButton with href renders as <a role="button">
    const editListTypeButton = page.getByRole("button", { name: /edit list type/i });
    await expect(editListTypeButton).toBeVisible();

    // STEP 3: Navigate to edit list type page
    await editListTypeButton.click();
    await expect(page).toHaveURL("/subscription-configure-list");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Check accessibility on edit list type page
    let accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 4: Test validation - uncheck all and submit should show error
    // First uncheck any pre-selected list types
    const checkedItems = page.locator(".list-item:checked");
    const checkedCount = await checkedItems.count();
    for (let i = 0; i < checkedCount; i++) {
      await checkedItems.nth(0).uncheck();
    }

    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.locator(".govuk-error-summary")).toBeVisible();
    await expect(page.getByText(/please select a list type/i)).toBeVisible();

    // STEP 5: Select list types and continue
    await page.locator(".list-item").first().check();
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL("/subscription-configure-list-language");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Check accessibility on language selection page
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 6: Test language validation - submit without selection should show error
    // First uncheck any pre-selected language
    const englishRadio = page.getByRole("radio", { name: /^english$/i });
    const welshRadio = page.getByRole("radio", { name: /^welsh$/i });
    const bothRadio = page.getByRole("radio", { name: /english and welsh/i });

    // Check if any is pre-selected (from existing subscription)
    const isEnglishChecked = await englishRadio.isChecked();
    const isWelshChecked = await welshRadio.isChecked();
    const isBothChecked = await bothRadio.isChecked();

    // If pre-selected, test that it's correctly pre-selected, then continue
    if (isEnglishChecked || isWelshChecked || isBothChecked) {
      // Language is pre-selected from existing subscription - verify and continue
      await page.getByRole("button", { name: /continue/i }).click();
    } else {
      // No pre-selection - test validation
      await page.getByRole("button", { name: /continue/i }).click();
      await expect(page.locator(".govuk-error-summary")).toBeVisible();
      await expect(page.getByText(/please select.*version/i)).toBeVisible();

      // Select a language and continue
      await englishRadio.check();
      await page.getByRole("button", { name: /continue/i }).click();
    }

    await expect(page).toHaveURL("/subscription-configure-list-preview");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Check accessibility on preview page
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 7: Verify preview page shows selected list types
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Verify change language link is present
    const changeLanguageButton = page.getByRole("button", { name: /change/i }).first();
    await expect(changeLanguageButton).toBeVisible();

    // STEP 8: Test Welsh translation on preview page
    await page.goto("/subscription-configure-list-preview?lng=cy");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Switch back to English
    await page.goto("/subscription-configure-list-preview?lng=en");

    // STEP 9: Test change language functionality
    await changeLanguageButton.click();
    await expect(page).toHaveURL("/subscription-configure-list-language");

    // Select Welsh and return to preview
    await welshRadio.check();
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL("/subscription-configure-list-preview");

    // STEP 10: Confirm the changes
    await page.getByRole("button", { name: /confirm/i }).click();
    await expect(page).toHaveURL("/subscription-configure-list-confirmed", { timeout: 10000 });

    // STEP 11: Verify success page
    const successPanel = page.locator(".govuk-panel--confirmation");
    await expect(successPanel).toBeVisible();

    // Check accessibility on success page
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 12: Test Welsh on success page
    await page.goto("/subscription-configure-list-confirmed?lng=cy");
    await expect(page.locator(".govuk-panel--confirmation")).toBeVisible();

    // Navigate back to subscription management
    await page
      .getByRole("link", { name: /manage|rheoli/i })
      .first()
      .click();
    await expect(page).toHaveURL("/subscription-management");
  });
});

test.describe("Email Subscriptions - Case", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const caseData = await createTestCaseData();
    testCaseDataMap.set(testInfo.testId, caseData);

    await loginAsOwnUser(page, testInfo.testId);

    await expect(page).toHaveURL(/\/account-home/);
  });

  // Note: Cleanup handled by global teardown - case names/numbers are prefixed

  test("should complete case name subscription journey with accessibility checks", async ({ page }, testInfo) => {
    const caseData = testCaseDataMap.get(testInfo.testId);
    if (!caseData) throw new Error("Test case data not found");

    // Step 1: Navigate to add email subscription
    await page.goto("/add-email-subscription");
    await page.getByRole("radio", { name: /by case name/i }).check();
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL("/case-name-search");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Check accessibility on case name search page
    let accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Step 2: Validate - submit empty form shows error
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByRole("link", { name: /please enter a minimum of 3 characters/i })).toBeVisible();

    // Step 3: Search using part of the case name
    await page.getByLabel(/case name/i).fill("E2E Test");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL("/case-search-results");
    // toHaveURL resolves before the new document renders; scanning then reports no main landmark or h1
    await expect(page.getByRole("heading", { level: 1, name: /case search results/i })).toBeVisible();

    // Check accessibility on case search results page
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Step 4: Validate - submit without selecting a case shows error
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByRole("link", { name: /select a case/i })).toBeVisible();

    // Step 5: Select the test case by its case name
    const caseCheckbox = page.getByRole("checkbox", { name: new RegExp(caseData.caseName) });
    await caseCheckbox.waitFor({ state: "visible", timeout: 10000 });
    await caseCheckbox.check();
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL("/pending-subscriptions", { timeout: 10000 });

    // Step 6: Verify pending subscriptions page shows the case
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(caseData.caseName)).toBeVisible({ timeout: 10000 });

    // Check Welsh translation on pending-subscriptions using URL approach
    // (language toggle link not available on this page)
    await page.goto("/pending-subscriptions?lng=cy");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    await page.goto("/pending-subscriptions?lng=en");

    // Check accessibility on pending subscriptions page
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Step 7: Confirm subscription
    await page.getByRole("button", { name: /confirm/i }).click();
    await expect(page).toHaveURL("/subscription-confirmed", { timeout: 10000 });
    await page.waitForLoadState("networkidle");

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
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Check accessibility on case reference search page
    let accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Step 2: Validate - submit empty form shows error
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByRole("link", { name: /there is nothing matching your criteria/i })).toBeVisible();

    // Step 3: Search using the exact case number
    await page.getByLabel(/reference number/i).fill(caseData.caseNumber);
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL("/case-search-results");
    // toHaveURL resolves before the new document renders; scanning then reports no main landmark or h1
    await expect(page.getByRole("heading", { level: 1, name: /case search results/i })).toBeVisible();

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

interface CivilDailyCauseListFixture {
  courtLists: { courtHouse: { courtRoom: { session: { sittings: { hearing: { case: Record<string, string>[] }[] }[] }[] }[] } }[];
}
