import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { prisma } from "@hmcts/postgres";
import { loginWithSSO } from "../utils/sso-helpers.js";

// Helper to validate required environment variables
function validateEnvVars() {
  const missing: string[] = [];

  if (!process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL) {
    missing.push("SSO_TEST_SYSTEM_ADMIN_EMAIL");
  }
  if (!process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD) {
    missing.push("SSO_TEST_SYSTEM_ADMIN_PASSWORD");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}. ` + "Please set these variables before running the tests.");
  }
}

// Helper function to authenticate as System Admin
async function authenticateSystemAdmin(page: Page) {
  validateEnvVars();

  await page.goto("/system-admin-dashboard");

  if (page.url().includes("login.microsoftonline.com")) {
    const systemAdminEmail = process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!;
    const systemAdminPassword = process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!;
    await loginWithSSO(page, systemAdminEmail, systemAdminPassword);
  }
}

// Helper to wait for autocomplete to complete and select option
async function selectAutocompleteOption(page: Page, searchText: string) {
  // Wait for the autocomplete API request to complete
  const responsePromise = page.waitForResponse((response) => response.url().includes("/locations?q=") && response.status() === 200, { timeout: 10000 });

  // Wait for the response to complete
  await responsePromise;

  // Wait for autocomplete dropdown menu to appear with results
  await page.waitForSelector(".autocomplete__menu", { state: "visible", timeout: 5000 });

  // Select from dropdown using keyboard
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");

  // Wait for the hidden locationId field to be populated
  await page.waitForFunction(
    () => {
      const hiddenInput = document.getElementById("court-searchId") as HTMLInputElement;
      return hiddenInput && hiddenInput.value !== "";
    },
    { timeout: 5000 }
  );
}

// Track created resources for cleanup
const createdCourts: number[] = [];
const createdUsers: string[] = [];

// Helper to create a test court for deletion
async function createTestCourt(name: string, welshName: string): Promise<number> {
  // Generate unique locationId using timestamp and random number
  const locationId = 90000 + Math.floor(Math.random() * 9000) + (Date.now() % 1000);

  // Create new court
  await prisma.location.create({
    data: {
      locationId,
      name,
      welshName,
      email: `${name.toLowerCase().replace(/\s+/g, "-")}@test.hmcts.net`,
      contactNo: "01234567890",
      locationRegions: {
        create: [{ regionId: 4 }] // North
      },
      locationSubJurisdictions: {
        create: [{ subJurisdictionId: 1 }] // Civil Court
      }
    }
  });

  createdCourts.push(locationId);
  return locationId;
}

test.describe("Delete Court Journey", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateSystemAdmin(page);
  });

  test.afterAll(async () => {
    // Clean up test users (this will cascade delete subscriptions)
    for (const userId of createdUsers) {
      await prisma.user
        .delete({
          where: { userId }
        })
        .catch(() => {
          // Ignore errors if already deleted
        });
    }
    createdUsers.length = 0;

    // Clean up any courts that weren't deleted during the test
    // (this will cascade delete artefacts and other related data)
    for (const locationId of createdCourts) {
      await prisma.location
        .delete({
          where: { locationId }
        })
        .catch(() => {
          // Ignore errors if court was already deleted during test
        });
    }
    createdCourts.length = 0;
  });

  test("user can complete delete court journey with validation checks", async ({ page }) => {
    // Create dedicated test courts for this test
    await createTestCourt("Delete Test Court A", "Llys Prawf Dileu A");
    await createTestCourt("Delete Test Court B", "Llys Prawf Dileu B");

    // Step 1: Navigate to Delete Court from dashboard
    await page.click('a:has-text("Delete Court")');
    await page.waitForURL("**/delete-court");

    // Verify page loaded correctly
    const heading = page.locator("h1");
    await expect(heading).toHaveText("Find the court to remove");

    // Step 2: Test validation - empty court name
    await page.click('button:has-text("Continue")');
    await expect(page.locator(".govuk-error-summary")).toBeVisible();
    await expect(page.locator(".govuk-error-message")).toContainText("Enter a court or tribunal name");

    // Step 3: Search for a valid test court (refresh page to clear validation state)
    await page.reload();
    await page.waitForURL("**/delete-court");
    const courtInput = page.getByRole("combobox", { name: /court or tribunal name/i });
    await courtInput.waitFor({ state: "visible", timeout: 10000 });
    await courtInput.fill("Delete Test Court A");

    // Wait for autocomplete to load and select option
    await selectAutocompleteOption(page, "Delete Test Court A");

    await page.click('button:has-text("Continue")');
    await page.waitForURL("**/delete-court-confirm");

    // Step 4: Verify confirmation page displays court details
    await expect(page.locator("h1")).toHaveText("Are you sure you want to delete this court?");

    // Check summary table has correct data
    const summaryList = page.locator(".govuk-summary-list");
    await expect(summaryList).toBeVisible();
    await expect(summaryList).toContainText("Delete Test Court A");
    await expect(summaryList).toContainText("Court or tribunal name");
    await expect(summaryList).toContainText("Location type");
    await expect(summaryList).toContainText("Jurisdiction");
    await expect(summaryList).toContainText("Region");

    // Step 5: Test radio buttons are inline
    const radios = page.locator(".govuk-radios");
    await expect(radios).toHaveClass(/govuk-radios--inline/);

    // Step 6: Test validation - no radio selected
    await page.click('button:has-text("Continue")');
    await expect(page.locator(".govuk-error-summary")).toBeVisible();
    await expect(page.locator(".govuk-error-message")).toContainText("Select yes or no to continue");

    // Step 7: Test "No" option redirects back to dashboard
    await page.click('input[value="no"]');
    await page.click('button:has-text("Continue")');
    await page.waitForURL("**/system-admin-dashboard");
    await expect(page.locator("h1")).toHaveText("System Admin Dashboard");

    // Step 8: Navigate back to delete court and search again
    await page.click('a:has-text("Delete Court")');
    await page.waitForURL("**/delete-court");
    const courtInput2 = page.getByRole("combobox", { name: /court or tribunal name/i });
    await courtInput2.fill("Delete Test Court B");

    // Wait for autocomplete to load and select option
    await selectAutocompleteOption(page, "Delete Test Court B");

    await page.click('button:has-text("Continue")');
    await page.waitForURL("**/delete-court-confirm");

    // Step 9: Test Welsh translation (using query parameter, admin users don't have language toggle)
    const currentUrl = page.url();
    const urlWithWelsh = currentUrl.includes("?") ? `${currentUrl}&lng=cy` : `${currentUrl}?lng=cy`;
    await page.goto(urlWithWelsh);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toHaveText("Ydych chi'n siŵr eich bod eisiau dileu'r llys hwn?");
    await expect(page.locator(".govuk-summary-list")).toContainText("Llys Prawf Dileu B"); // Welsh name

    // Switch back to English
    const urlWithEnglish = currentUrl.includes("?") ? `${currentUrl}&lng=en` : `${currentUrl}?lng=en`;
    await page.goto(urlWithEnglish);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toHaveText("Are you sure you want to delete this court?");

    // Step 10: Test accessibility
    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Step 11: Confirm deletion
    await page.click('input[value="yes"]');
    await page.click('button:has-text("Continue")');
    await page.waitForURL("**/delete-court-success");

    // Step 12: Verify success page
    await expect(page.locator("h1")).toHaveText("Delete successful");
    const successPanel = page.locator(".govuk-panel--confirmation");
    await expect(successPanel).toBeVisible();
    await expect(successPanel).toContainText("Court has been deleted");

    // Step 13: Verify next steps section
    await expect(page.getByRole("heading", { name: "What do you want to do next?" })).toBeVisible();
    await expect(page.locator('a:has-text("Remove another court")')).toBeVisible();
    await expect(page.locator('a:has-text("Upload Reference Data")')).toBeVisible();
    await expect(page.locator('a:has-text("Home")')).toBeVisible();

    // Step 14: Test Welsh on success page (using query parameter)
    const successUrl = page.url();
    const successUrlWithWelsh = successUrl.includes("?") ? `${successUrl}&lng=cy` : `${successUrl}?lng=cy`;
    await page.goto(successUrlWithWelsh);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toHaveText("Wedi llwyddo i ddileu");
    await expect(page.locator(".govuk-panel--confirmation")).toContainText("Mae'r llys wedi'i ddileu");
    await expect(page.getByRole("heading", { name: "Beth hoffech chi ei wneud nesaf?" })).toBeVisible();
    await expect(page.locator('a:has-text("Dileu llys arall")')).toBeVisible();

    // Step 15: Test accessibility on success page
    const successAccessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(successAccessibility.violations).toEqual([]);

    // Step 16: Verify navigation links work
    await page.click('a:has-text("Hafan")'); // Home in Welsh
    await page.waitForURL("**/system-admin-dashboard");
    await expect(page.locator("h1")).toContainText("System Admin");
  });

  test("should block deletion of court with active subscriptions", async ({ page }) => {
    // Create a dedicated test court with active data
    const courtName = "Delete Test Court With Subs";
    const courtWelshName = "Llys Prawf Dileu Gyda Thanysgrifiadau";
    const courtLocationId = await createTestCourt(courtName, courtWelshName);

    // Create a test user for the subscription
    const testUser = await prisma.user.create({
      data: {
        email: `test-delete-court-${Date.now()}@hmcts.net`,
        firstName: "Test",
        surname: "User",
        userProvenance: "PI_AAD",
        userProvenanceId: `test-${Date.now()}`,
        role: "VERIFIED"
      }
    });
    createdUsers.push(testUser.userId);

    // Create an active subscription for this court
    await prisma.subscription.create({
      data: {
        userId: testUser.userId,
        searchType: "LOCATION_ID",
        searchValue: courtLocationId.toString()
      }
    });

    // Create an active artefact for this court
    await prisma.artefact.create({
      data: {
        locationId: courtLocationId.toString(),
        listTypeId: 1, // Use a valid list type ID
        contentDate: new Date(),
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: new Date(),
        displayTo: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
        isFlatFile: false,
        provenance: "MANUAL_UPLOAD"
      }
    });

    // Navigate to delete court
    await page.click('a:has-text("Delete Court")');
    await page.waitForURL("**/delete-court");

    // Search for the test court
    const courtInput = page.getByRole("combobox", { name: /court or tribunal name/i });
    await courtInput.waitFor({ state: "visible", timeout: 10000 });
    await courtInput.fill(courtName);

    // Wait for autocomplete to load and select option
    await selectAutocompleteOption(page, courtName);

    await page.click('button:has-text("Continue")');
    await page.waitForURL("**/delete-court-confirm");

    // Confirm deletion
    await page.click('input[value="yes"]');
    await page.click('button:has-text("Continue")');

    // Should show error about active subscriptions or artefacts
    await expect(page.locator(".govuk-error-summary")).toBeVisible();

    // Error should be one of these
    const errorText = await page.locator(".govuk-error-summary__body").textContent();
    const hasExpectedError =
      errorText?.includes("There are active subscriptions for the given location") || errorText?.includes("There are active artefacts for the given location");

    expect(hasExpectedError).toBe(true);

    // Radio buttons should NOT be highlighted (no red border)
    const radioError = page.locator(".govuk-radios .govuk-form-group--error");
    await expect(radioError).not.toBeVisible();
  });

  test("should maintain keyboard navigation throughout journey @nightly", async ({ page }) => {
    // Create dedicated test court for this test
    await createTestCourt("Delete Test Court C", "Llys Prawf Dileu C");

    // Navigate to delete court
    await page.click('a:has-text("Delete Court")');
    await page.waitForURL("**/delete-court");

    // Focus on court input and verify keyboard interaction
    const courtInput = page.getByRole("combobox", { name: /court or tribunal name/i });
    await courtInput.waitFor({ state: "visible", timeout: 10000 });
    await courtInput.focus();
    await expect(courtInput).toBeFocused();

    // Fill and submit using keyboard and autocomplete
    await courtInput.fill("Delete Test Court C");

    // Wait for autocomplete to load and select option
    await selectAutocompleteOption(page, "Delete Test Court C");

    // Submit form
    await page.click('button:has-text("Continue")');
    await page.waitForURL("**/delete-court-confirm");

    // Focus on first radio button and select using keyboard
    const yesRadio = page.locator('input[value="yes"]');
    await yesRadio.focus();
    await expect(yesRadio).toBeFocused();
    await page.keyboard.press("Space");

    // Submit form
    await page.click('button:has-text("Continue")');
    await page.waitForURL("**/delete-court-success");
    await expect(page.locator("h1")).toHaveText("Delete successful");
  });
});
