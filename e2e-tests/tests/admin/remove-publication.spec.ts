import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createUniqueTestLocation } from "../../utils/dynamic-test-data.js";
import { loginWithSSO } from "../../utils/sso-helpers.js";
import { getListTypeByName } from "../../utils/test-support-api.js";

const CIVIL_DAILY_CAUSE_LIST_NAME = "CIVIL_DAILY_CAUSE_LIST";

let listTypeId: number;
let testLocationId: number;
let testLocationName: string;

test.describe("Remove Publication Flow", () => {
  test.beforeAll(async () => {
    const testLocation = await createUniqueTestLocation({ namePrefix: "Remove Publication Court" });
    testLocationId = testLocation.locationId;
    testLocationName = testLocation.name;

    const listType = (await getListTypeByName(CIVIL_DAILY_CAUSE_LIST_NAME)) as { id: number };
    if (!listType?.id) {
      throw new Error(`List type ${CIVIL_DAILY_CAUSE_LIST_NAME} not found in database`);
    }
    listTypeId = listType.id;
  });

  // Upload test data before running remove tests
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();

    await page.goto("/admin-dashboard");
    if (page.url().includes("login.microsoftonline.com")) {
      await loginWithSSO(page, process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!, process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!);
    }

    // Upload a test publication for the dynamically created location
    await page.goto(`/manual-upload?locationId=${testLocationId}`);
    await page.waitForTimeout(1000);

    await page.locator('input[name="file"]').setInputFiles({
      name: "e2e-test-publication.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("E2E test content for remove-publication tests")
    });

    await page.selectOption('select[name="listType"]', listTypeId.toString());
    await page.fill('input[name="hearingStartDate-day"]', "15");
    await page.fill('input[name="hearingStartDate-month"]', "06");
    await page.fill('input[name="hearingStartDate-year"]', "2025");
    await page.selectOption('select[name="sensitivity"]', "PUBLIC");
    await page.selectOption('select[name="language"]', "ENGLISH");
    await page.fill('input[name="displayFrom-day"]', "10");
    await page.fill('input[name="displayFrom-month"]', "06");
    await page.fill('input[name="displayFrom-year"]', "2025");
    await page.fill('input[name="displayTo-day"]', "31");
    await page.fill('input[name="displayTo-month"]', "12");
    await page.fill('input[name="displayTo-year"]', "2030");

    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL(/manual-upload-summary/);
    await page.getByRole("button", { name: /confirm/i }).click();
    await page.waitForURL(/manual-upload-success/);

    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin-dashboard");
    if (page.url().includes("login.microsoftonline.com")) {
      await loginWithSSO(page, process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!, process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!);
    }
    await page.waitForURL("/admin-dashboard");
  });

  test("complete remove publication journey with validation, Welsh, and accessibility", async ({ page }) => {
    // STEP 1: Verify remove tab on dashboard
    const removeLink = page.locator('a[href="/remove-list-search"]');
    await expect(removeLink).toBeVisible();

    const removeHeading = removeLink.locator('h2:has-text("Remove")');
    await expect(removeHeading).toBeVisible();

    // STEP 2: Navigate to find content page
    await page.goto("/remove-list-search");
    if (page.url().includes("login.microsoftonline.com")) {
      await loginWithSSO(page, process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!, process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!);
      await page.waitForURL("/admin-dashboard");
      await page.goto("/remove-list-search");
    }

    await expect(page.locator("h1")).toContainText("Find content to remove");

    const autocompleteInput = page.getByRole("combobox", { name: /search by court or tribunal name/i });
    await autocompleteInput.waitFor({ state: "visible", timeout: 10000 });
    await expect(autocompleteInput).toBeVisible();
    await expect(page.locator('button:has-text("Continue")')).toBeVisible();

    // STEP 3: Test validation - empty submission
    await page.click('button:has-text("Continue")');
    await expect(page.locator(".govuk-error-summary")).toBeVisible();
    await expect(page.locator(".govuk-error-summary")).toContainText("Court or tribunal name must be 3 characters or more");

    // STEP 4: Test accessibility on find page with errors
    const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 5: Test Welsh on find page
    await page.goto("/remove-list-search?lng=cy");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toContainText("Canfod cynnwys i'w dynnu");
    await expect(page.locator('button:has-text("Parhau")')).toBeVisible();

    // STEP 6: Navigate back to English and select location
    await page.goto("/remove-list-search");
    if (page.url().includes("login.microsoftonline.com")) {
      await loginWithSSO(page, process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!, process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!);
      await page.waitForURL("/admin-dashboard");
      await page.goto("/remove-list-search");
    }

    const courtInput = page.getByRole("combobox", { name: /search by court or tribunal name/i });
    await courtInput.waitFor({ state: "visible", timeout: 10000 });
    await courtInput.fill(testLocationName);
    await page.waitForTimeout(500);

    // Select the first suggestion
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    await page.click('button:has-text("Continue")');

    // STEP 7: Should redirect to search results page
    await expect(page).toHaveURL(/\/remove-list-search-results/);
  });

  test("Local Admin can access remove publication from dashboard @nightly", async ({ page }) => {
    // Verify dashboard shows remove link
    const removeLink = page.locator('a[href="/remove-list-search"]');
    await expect(removeLink).toBeVisible();

    // Click and verify navigation
    await removeLink.click();
    await expect(page).toHaveURL("/remove-list-search");
    await expect(page.locator("h1")).toContainText("Find content to remove");

    // Test accessibility
    const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
