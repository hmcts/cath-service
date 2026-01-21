import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Cookie Policy Page", () => {
  test("should complete full cookie policy user journey", async ({ page, context }) => {
    // Start from home page and verify footer link
    await page.goto("/");

    // Check footer link exists
    const footerLink = page.locator('footer a:has-text("Cookies")');
    await expect(footerLink).toBeVisible();
    await expect(footerLink).toHaveAttribute("href", "/cookie-policy");
    await expect(footerLink).toHaveAttribute("target", "_blank");
    await expect(footerLink).toHaveAttribute("rel", "noopener noreferrer");

    // Click footer link and verify it opens in new tab
    const [newPage] = await Promise.all([context.waitForEvent("page"), footerLink.click()]);
    await expect(newPage).toHaveURL(/\/cookie-policy/);

    // Continue journey on the new page
    await expect(newPage.locator("h1")).toHaveText("Cookie policy");

    // Verify back button is not displayed (page opens in new tab)
    const backLink = newPage.locator("a.govuk-back-link");
    await expect(backLink).not.toBeVisible();

    // Check main heading
    await expect(newPage.locator("h2:has-text('How cookies are used')")).toBeVisible();

    // Check all subsections are visible
    await expect(newPage.locator("h3:has-text('To measure website usage')")).toBeVisible();
    await expect(newPage.locator("h3:has-text('To turn our introductory message off')")).toBeVisible();
    await expect(newPage.locator("h3:has-text('To store the answers')")).toBeVisible();
    await expect(newPage.locator("h3:has-text('To identify you when you come back')")).toBeVisible();
    await expect(newPage.locator("h3:has-text('To make the service more secure')")).toBeVisible();
    await expect(newPage.locator("h3:has-text('To measure application performance')")).toBeVisible();

    // Check introduction text
    await expect(newPage.locator("text=A cookie is a small piece of data")).toBeVisible();

    // Verify cookie tables with correct information
    await expect(newPage.getByRole("cell", { name: "_ga", exact: true })).toBeVisible();
    await expect(newPage.getByRole("cell", { name: "_gat", exact: true })).toBeVisible();
    await expect(newPage.getByRole("cell", { name: "_gid", exact: true })).toBeVisible();
    await expect(newPage.getByRole("cell", { name: "connect.sid", exact: true })).toBeVisible();
    await expect(newPage.getByRole("cell", { name: "dtCookie", exact: true })).toBeVisible();
    await expect(newPage.getByRole("cell", { name: "rxVisitor", exact: true })).toBeVisible();
    await expect(newPage.getByRole("cell", { name: "rxvt", exact: true })).toBeVisible();
    await expect(newPage.getByRole("cell", { name: "__auth-token", exact: true })).toBeVisible();
    await expect(newPage.getByRole("cell", { name: "__state", exact: true })).toBeVisible();

    // Verify external links have correct attributes
    const manageCookiesLink = newPage.locator('a:has-text("how to manage cookies")');
    await expect(manageCookiesLink).toHaveAttribute("href", "https://www.aboutcookies.org/");
    await expect(manageCookiesLink).toHaveAttribute("target", "_blank");

    const privacyPolicyLink = newPage.locator('a:has-text("Privacy Policy")');
    await expect(privacyPolicyLink).toHaveAttribute("href", "https://policies.google.com/technologies/partner-sites");
    await expect(privacyPolicyLink).toHaveAttribute("target", "_blank");

    const optOutLink = newPage.locator('a:has-text("opt out of Google Analytics")');
    await expect(optOutLink).toHaveAttribute("href", "https://tools.google.com/dlpage/gaoptout");
    await expect(optOutLink).toHaveAttribute("target", "_blank");

    // Verify contact details can be expanded and collapsed
    const detailsSummary = newPage.locator('summary:has-text("Contact us for help")');
    const details = newPage.locator('details:has(summary:has-text("Contact us for help"))');
    await expect(details).not.toHaveAttribute("open");

    await detailsSummary.click();
    await expect(details).toHaveAttribute("open");
    await expect(newPage.locator("text=0300 303 0656")).toBeVisible();
    await expect(newPage.locator("text=Monday to Friday 8am to 5pm")).toBeVisible();

    await detailsSummary.click();
    await expect(details).not.toHaveAttribute("open");

    // Scroll down and test back to top functionality
    await newPage.evaluate(() => window.scrollTo(0, 1000));
    await newPage.waitForTimeout(100);
    let scrollY = await newPage.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(500);

    await newPage.locator('a:has-text("Back to top")').click();
    await newPage.waitForFunction(() => window.scrollY < 100, { timeout: 2000 });
    scrollY = await newPage.evaluate(() => window.scrollY);
    expect(scrollY).toBeLessThan(100);

    // Check change settings section
    await expect(newPage.locator("h2:has-text('Change your cookie settings')")).toBeVisible();

    // Verify form with default preferences
    await expect(newPage.locator('input[name="analytics"]')).toHaveCount(2);
    await expect(newPage.locator('input[name="performance"]')).toHaveCount(2);

    // Success banner should not be visible initially
    await expect(newPage.locator(".govuk-notification-banner--success")).not.toBeVisible();

    // Select and save cookie preferences
    await newPage.locator('input[name="analytics"][value="on"]').check();
    await newPage.locator('input[name="performance"][value="off"]').check();
    await newPage.locator('button:has-text("Save")').click();

    // Verify redirect with saved parameter
    await expect(newPage).toHaveURL(/\/cookie-policy\?saved=true/);

    // Success banner should now be visible
    await expect(newPage.locator(".govuk-notification-banner--success")).toBeVisible();
    await expect(newPage.locator("text=Your cookie settings have been saved")).toBeVisible();

    // Verify selected preferences are preserved after save
    await expect(newPage.locator('input[name="analytics"][value="on"]')).toBeChecked();
    await expect(newPage.locator('input[name="performance"][value="off"]')).toBeChecked();
  });

  test("should display Welsh content and save preferences in Welsh", async ({ page }) => {
    await page.goto("/cookie-policy?lng=cy");

    // Should stay on Welsh route
    await expect(page).toHaveURL(/\/cookie-policy\?lng=cy/);

    // Check Welsh title
    await expect(page.locator("h1")).toHaveText("Polisi Cwcis");

    // Check Welsh section headings
    await expect(page.locator("h3:has-text('I fesur faint o bobl')")).toBeVisible();

    // Check accessibility in Welsh
    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Save preferences in Welsh
    await page.locator('input[name="analytics"][value="on"]').check();
    await page.locator('input[name="performance"][value="off"]').check();
    await page.locator('button:has-text("Cadw")').click();

    // Should stay on Welsh route after save
    await expect(page).toHaveURL(/\/cookie-policy\?lng=cy&saved=true/);
    await expect(page.locator("h1")).toHaveText("Polisi Cwcis");

    // Check that correct radios are still checked after save
    await expect(page.locator('input[name="analytics"][value="on"]')).toBeChecked();
    await expect(page.locator('input[name="performance"][value="off"]')).toBeChecked();
  });

  test("should be keyboard accessible", async ({ page }) => {
    await page.goto("/cookie-policy");

    // Find and focus the first analytics radio
    const analyticsOnRadio = page.locator('input[name="analytics"][value="on"]');
    await analyticsOnRadio.focus();

    // Verify it's focused
    await expect(analyticsOnRadio).toBeFocused();

    // Use space to select
    await page.keyboard.press("Space");
    await expect(analyticsOnRadio).toBeChecked();
  });

});


test.describe("Cookie Policy Page - Accessibility", () => {
  test("should be fully accessible and meet WCAG standards", async ({ page }) => {
    await page.goto("/cookie-policy");

    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Verify all radio buttons have associated labels
    const radios = page.locator("input[type='radio']");
    const radioCount = await radios.count();
    expect(radioCount).toBeGreaterThan(0);

    for (let i = 0; i < radioCount; i++) {
      const radio = radios.nth(i);
      const id = await radio.getAttribute("id");
      expect(id).toBeTruthy();

      const label = page.locator(`label[for="${id}"]`);
      await expect(label).toBeVisible();
    }

    // Verify all tables have headers
    const tables = page.locator("table");
    const tableCount = await tables.count();
    expect(tableCount).toBeGreaterThan(0);

    for (let i = 0; i < tableCount; i++) {
      const table = tables.nth(i);
      const headers = table.locator("th");
      const headerCount = await headers.count();

      // Each table should have headers
      expect(headerCount).toBeGreaterThan(0);

      // Check headers are visible
      const firstHeader = headers.first();
      await expect(firstHeader).toBeVisible();
    }
  });

});
