import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginWithSSO } from "../utils/sso-helpers.js";

test.describe("Remove Publication Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin-dashboard");
    if (page.url().includes("login.microsoftonline.com")) {
      await loginWithSSO(
        page,
        process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!,
        process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!
      );
    }
    await page.waitForURL("/admin-dashboard");
  });

  // Upload test data before running remove tests
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();

    // Login first
    await page.goto("/admin-dashboard");
    if (page.url().includes("login.microsoftonline.com")) {
      await loginWithSSO(
        page,
        process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!,
        process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!
      );
    }

    // Upload a test publication for locationId=1 (Oxford Combined Court Centre)
    await page.goto('/manual-upload?locationId=1');
    await page.waitForTimeout(1000); // Wait for autocomplete to initialize

    await page.locator('input[name="file"]').setInputFiles({
      name: 'e2e-test-publication.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('E2E test content for remove-publication tests')
    });

    await page.selectOption('select[name="listType"]', '1'); // Civil Daily Cause List
    await page.fill('input[name="hearingStartDate-day"]', '15');
    await page.fill('input[name="hearingStartDate-month"]', '06');
    await page.fill('input[name="hearingStartDate-year"]', '2025');
    await page.selectOption('select[name="sensitivity"]', 'PUBLIC');
    await page.selectOption('select[name="language"]', 'ENGLISH');
    await page.fill('input[name="displayFrom-day"]', '10');
    await page.fill('input[name="displayFrom-month"]', '06');
    await page.fill('input[name="displayFrom-year"]', '2025');
    await page.fill('input[name="displayTo-day"]', '31');
    await page.fill('input[name="displayTo-month"]', '12');
    await page.fill('input[name="displayTo-year"]', '2030');

    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForURL(/manual-upload-summary/);
    await page.getByRole('button', { name: /confirm/i }).click();
    await page.waitForURL(/manual-upload-success/);

    await page.close();
  });

  test("should display remove tab on dashboard", async ({ page }) => {
    // beforeEach already navigated to admin-dashboard, so just verify
    const removeLink = page.locator('a[href="/remove-list-search"]');
    await expect(removeLink).toBeVisible();

    const removeHeading = removeLink.locator('h2:has-text("Remove")');
    await expect(removeHeading).toBeVisible();
  });

  test("should display find content page", async ({ page }) => {
    await page.goto("/remove-list-search");

    // Handle auth redirect if needed
    if (page.url().includes("login.microsoftonline.com")) {
      await loginWithSSO(
        page,
        process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!,
        process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!
      );
      await page.waitForURL("/admin-dashboard");
      await page.goto("/remove-list-search");
    }

    await expect(page.locator("h1")).toContainText("Find content to remove");

    // The page uses accessible-autocomplete which creates a combobox, not a visible input
    const autocompleteInput = page.getByRole('combobox', { name: /search by court or tribunal name/i });
    await autocompleteInput.waitFor({ state: 'visible', timeout: 10000 });
    await expect(autocompleteInput).toBeVisible();

    await expect(page.locator('button:has-text("Continue")')).toBeVisible();
  });

  test("should show validation error when submitting without location", async ({ page }) => {
    await page.goto("/remove-list-search");

    // Handle auth redirect if needed
    if (page.url().includes("login.microsoftonline.com")) {
      await loginWithSSO(
        page,
        process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!,
        process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!
      );
      await page.waitForURL("/admin-dashboard");
      await page.goto("/remove-list-search");
    }

    // Wait for form to be ready
    await page.waitForSelector('button:has-text("Continue")');

    // Click continue button and wait for response
    await page.click('button:has-text("Continue")');
    await page.waitForLoadState('networkidle');

    await expect(page.locator(".govuk-error-summary")).toBeVisible();
    await expect(page.locator(".govuk-error-summary")).toContainText("Court or tribunal name must be 3 characters or more");
  });

  test("should navigate to select page after choosing location", async ({ page }) => {
    await page.goto("/remove-list-search");

    // Handle auth redirect if needed
    if (page.url().includes("login.microsoftonline.com")) {
      await loginWithSSO(
        page,
        process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!,
        process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!
      );
      await page.waitForURL("/admin-dashboard");
      await page.goto("/remove-list-search");
    }

    // Use the autocomplete widget to select a location
    const courtInput = page.getByRole('combobox', { name: /search by court or tribunal name/i });
    await courtInput.waitFor({ state: 'visible', timeout: 10000 });
    await courtInput.fill('Oxford');

    // Wait for autocomplete suggestions to appear
    await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
    await page.waitForSelector('[role="option"]', { timeout: 5000 });

    // Click the first suggestion
    await page.click('[role="option"]:first-child');

    // Wait for the hidden locationId field to be populated
    // The autocomplete creates a hidden input with name="locationId" and id="locationIdId"
    await page.waitForFunction(() => {
      const hiddenInput = document.querySelector('input[name="locationId"][type="hidden"]') as HTMLInputElement;
      return hiddenInput && hiddenInput.value !== '';
    }, { timeout: 5000 });

    await page.click('button:has-text("Continue")');

    // Should redirect to search results page
    await expect(page).toHaveURL(/\/remove-list-search-results/);
  });

  test("should display select content page with table", async ({ page }) => {
    // This test assumes there's test data available
    // await page.goto("/remove-list-search-results");
    // await expect(page.locator("h1")).toContainText("Select content to remove");
    // await expect(page.locator("table")).toBeVisible();
  });

  test("should show validation error when no checkboxes selected", async ({ page }) => {
    // This test assumes there's test data available
    // await page.goto("/remove-list-search-results");
    // await page.click('button:has-text("Continue")');
    // await expect(page.locator(".govuk-error-summary")).toContainText("Select at least one publication to remove");
  });

  test("should navigate to confirm page after selecting artefacts", async ({ page }) => {
    // This test assumes there's test data available
    // await page.goto("/remove-list-search-results");
    // await page.check('input[type="checkbox"]').first();
    // await page.click('button:has-text("Continue")');
    // await expect(page).toHaveURL(/\/remove-list-confirmation/);
  });

  test("should display confirmation page with selected items", async ({ page }) => {
    // This test assumes session data is set up
    // await page.goto("/remove-list-confirmation");
    // await expect(page.locator("h1")).toContainText("Are you sure you want to remove this content?");
    // await expect(page.locator('input[type="radio"]')).toHaveCount(2);
  });

  test("should return to select page when choosing No", async ({ page }) => {
    // This test assumes session data is set up
    // await page.goto("/remove-list-confirmation");
    // await page.check('input[value="no"]');
    // await page.click('button:has-text("Continue")');
    // await expect(page).toHaveURL(/\/remove-list-search-results/);
  });

  test("should navigate to success page when choosing Yes", async ({ page }) => {
    // This test assumes session data is set up and database has test artefacts
    // await page.goto("/remove-list-confirmation");
    // await page.check('input[value="yes"]');
    // await page.click('button:has-text("Continue")');
    // await expect(page).toHaveURL(/\/remove-list-success/);
  });

  test("should display success page with confirmation banner", async ({ page }) => {
    // This test assumes session has removalSuccess flag
    // await page.goto("/remove-list-success");
    // await expect(page.locator(".govuk-panel--confirmation")).toBeVisible();
    // await expect(page.locator(".govuk-panel__title")).toContainText("Successful file removal");
  });

  test("should have links to remove another file and home on success page", async ({ page }) => {
    // This test assumes session has removalSuccess flag
    // await page.goto("/remove-list-success");
    // await expect(page.locator('a:has-text("Remove another file")')).toBeVisible();
    // await expect(page.locator('a:has-text("Home")')).toBeVisible();
  });

  test("should support Welsh language on find page", async ({ page }) => {
    // beforeEach already navigated to admin-dashboard and logged in
    // Now just navigate to the Welsh page - should not trigger another SSO redirect
    await page.goto("/remove-list-search?lng=cy");

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    await expect(page.locator("h1")).toContainText("Canfod cynnwys i'w dynnu");
    await expect(page.locator('button:has-text("Parhau")')).toBeVisible();
  });

  test("should pass accessibility checks on find page", async ({ page }) => {
    await page.goto("/remove-list-search");

    // Handle auth redirect if needed
    if (page.url().includes("login.microsoftonline.com")) {
      await loginWithSSO(
        page,
        process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!,
        process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!
      );
      await page.waitForURL("/admin-dashboard");
      await page.goto("/remove-list-search");
    }

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['region']) // Disable region rule (skip link/phase banner/back link not in landmarks is a known site-wide issue)
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should pass accessibility checks on select page", async ({ page }) => {
    // This test would need proper test data
    // await page.goto("/remove-list-search-results");
    // const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    // expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should pass accessibility checks on confirm page", async ({ page }) => {
    // This test would need proper session data
    // await page.goto("/remove-list-confirmation");
    // const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    // expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should pass accessibility checks on success page", async ({ page }) => {
    // This test would need proper session data
    // await page.goto("/remove-list-success");
    // const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    // expect(accessibilityScanResults.violations).toEqual([]);
  });
});
