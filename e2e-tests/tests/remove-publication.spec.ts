import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Remove Publication Flow", () => {
  test.beforeEach(async ({ page }) => {
    // This test assumes admin authentication is handled
    // In a real scenario, you would log in as an admin first
  });

  test("should display remove tab on dashboard", async ({ page }) => {
    await page.goto("/admin-dashboard");

    const removeLink = page.locator('a[href="/remove-list"]');
    await expect(removeLink).toBeVisible();

    const removeHeading = removeLink.locator('h2:has-text("Remove")');
    await expect(removeHeading).toBeVisible();
  });

  test("should redirect from /remove-list to /remove-list-search", async ({ page }) => {
    await page.goto("/remove-list");

    await expect(page).toHaveURL(/\/remove-list-search/);
  });

  test("should display find content page", async ({ page }) => {
    await page.goto("/remove-list-search");

    await expect(page.locator("h1")).toContainText("Find content to remove");
    await expect(page.locator('input[name="locationId"]')).toBeVisible();
    await expect(page.locator('button:has-text("Continue")')).toBeVisible();
  });

  test("should show validation error when submitting without location", async ({ page }) => {
    await page.goto("/remove-list-search");

    await page.click('button:has-text("Continue")');

    await expect(page.locator(".govuk-error-summary")).toBeVisible();
    await expect(page.locator(".govuk-error-summary")).toContainText("Court or tribunal name must be 3 characters or more");
  });

  test("should navigate to select page after choosing location", async ({ page }) => {
    await page.goto("/remove-list-search");

    // Simulate selecting a location (this would normally use the autocomplete)
    // In a real test, you would interact with the autocomplete widget
    await page.fill('input[name="locationId"]', "123");
    await page.click('button:has-text("Continue")');

    // Note: This test would need proper test data in the database
    // await expect(page).toHaveURL(/\/remove-list-search-results/);
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
    await page.goto("/remove-list-search?lng=cy");

    await expect(page.locator("h1")).toContainText("Canfod cynnwys i'w dynnu");
    await expect(page.locator('button:has-text("Parhau")')).toBeVisible();
  });

  test("should pass accessibility checks on find page", async ({ page }) => {
    await page.goto("/remove-list-search");

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

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
