import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Cookie Policy Page", () => {
  test("should display cookie policy page with all sections", async ({ page }) => {
    await page.goto("/cookies-policy");

    // Check page title
    await expect(page.locator("h1")).toHaveText("Cookie policy");

    // Check main heading
    await expect(page.locator("h2:has-text('How cookies are used')")).toBeVisible();

    // Check all subsections are visible (they are h3 headings)
    await expect(page.locator("h3:has-text('To measure website usage')")).toBeVisible();
    await expect(page.locator("h3:has-text('To turn our introductory message off')")).toBeVisible();
    await expect(page.locator("h3:has-text('To store the answers')")).toBeVisible();
    await expect(page.locator("h3:has-text('To identify you when you come back')")).toBeVisible();
    await expect(page.locator("h3:has-text('To make the service more secure')")).toBeVisible();
    await expect(page.locator("h3:has-text('To measure application performance')")).toBeVisible();

    // Check change settings section
    await expect(page.locator("h2:has-text('Change your cookie settings')")).toBeVisible();

    // Check introduction text
    await expect(page.locator("text=A cookie is a small piece of data")).toBeVisible();
  });

  test("should display cookie tables with correct information", async ({ page }) => {
    await page.goto("/cookies-policy");

    // Check analytics cookies (_ga, _gat, _gid)
    await expect(page.getByRole("cell", { name: "_ga", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "_gat", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "_gid", exact: true })).toBeVisible();

    // Check session cookies
    await expect(page.getByRole("cell", { name: "connect.sid", exact: true })).toBeVisible();

    // Check performance monitoring cookies
    await expect(page.getByRole("cell", { name: "dtCookie", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "rxVisitor", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "rxvt", exact: true })).toBeVisible();

    // Check authentication cookies
    await expect(page.getByRole("cell", { name: "__auth-token", exact: true })).toBeVisible();

    // Check security cookies
    await expect(page.getByRole("cell", { name: "__state", exact: true })).toBeVisible();
  });

  test("should save cookie preferences from policy page", async ({ page }) => {
    await page.goto("/cookies-policy");

    // Select analytics cookies enabled
    await page.locator('input[name="analytics"][value="on"]').check();

    // Select performance cookies disabled
    await page.locator('input[name="performance"][value="off"]').check();

    // Click save button
    await page.locator('button:has-text("Save")').click();

    // Should redirect with saved parameter
    await expect(page).toHaveURL(/\/cookies-policy\?saved=true/);

    // Success banner should be visible
    await expect(page.locator(".govuk-notification-banner--success")).toBeVisible();
    await expect(page.locator("text=Your cookie settings have been saved")).toBeVisible();
  });

  test("should preserve selected preferences after save", async ({ page }) => {
    await page.goto("/cookies-policy");

    // Enable analytics, disable performance
    await page.locator('input[name="analytics"][value="on"]').check();
    await page.locator('input[name="performance"][value="off"]').check();
    await page.locator('button:has-text("Save")').click();

    // Wait for redirect
    await page.waitForURL(/\/cookies-policy\?saved=true/);

    // Check that correct radios are still checked
    await expect(page.locator('input[name="analytics"][value="on"]')).toBeChecked();
    await expect(page.locator('input[name="performance"][value="off"]')).toBeChecked();
  });

  test("should display Welsh content on Welsh route", async ({ page }) => {
    await page.goto("/cookies-policy?lng=cy");

    // Should stay on Welsh route
    await expect(page).toHaveURL(/\/cookies-policy\?lng=cy/);

    // Check Welsh title
    await expect(page.locator("h1")).toHaveText("Polisi Cwcis");

    // Check Welsh section headings
    await expect(page.locator("h3:has-text('I fesur faint o bobl')")).toBeVisible();
  });

  test("should expand and collapse contact details", async ({ page }) => {
    await page.goto("/cookies-policy");

    // Find the details summary
    const detailsSummary = page.locator('summary:has-text("Contact us for help")');

    // Details should be collapsed initially
    const details = page.locator('details:has(summary:has-text("Contact us for help"))');
    await expect(details).not.toHaveAttribute("open");

    // Click to expand
    await detailsSummary.click();
    await expect(details).toHaveAttribute("open");

    // Contact details should be visible
    await expect(page.locator("text=0300 303 0656")).toBeVisible();
    await expect(page.locator("text=Monday to Friday 8am to 5pm")).toBeVisible();

    // Click to collapse
    await detailsSummary.click();
    await expect(details).not.toHaveAttribute("open");
  });

  test("should scroll to top when back to top link clicked", async ({ page }) => {
    await page.goto("/cookies-policy");

    // Scroll down the page
    await page.evaluate(() => window.scrollTo(0, 1000));

    // Wait a moment for scroll to complete
    await page.waitForTimeout(100);

    // Verify we scrolled
    let scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(500);

    // Click back to top link
    await page.locator('a:has-text("Back to top")').click();

    // Wait for scroll to reach top (smooth scroll can take variable time)
    await page.waitForFunction(() => window.scrollY < 100, { timeout: 2000 });

    // Verify we're at top
    scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeLessThan(100);
  });

  test("should be keyboard accessible", async ({ page }) => {
    await page.goto("/cookies-policy");

    // Find and focus the first analytics radio
    const analyticsOnRadio = page.locator('input[name="analytics"][value="on"]');
    await analyticsOnRadio.focus();

    // Verify it's focused
    await expect(analyticsOnRadio).toBeFocused();

    // Use space to select
    await page.keyboard.press("Space");
    await expect(analyticsOnRadio).toBeChecked();
  });

  test("should display form with default preferences", async ({ page }) => {
    await page.goto("/cookies-policy");

    // Check that at least one radio in each group is present
    await expect(page.locator('input[name="analytics"]')).toHaveCount(2);
    await expect(page.locator('input[name="performance"]')).toHaveCount(2);
  });

  test("should have proper ARIA attributes on form controls", async ({ page }) => {
    await page.goto("/cookies-policy");

    // Check fieldset and legend structure
    const analyticsFieldset = page
      .locator("fieldset")
      .filter({ has: page.locator('input[name="analytics"]') })
      .first();
    await expect(analyticsFieldset).toBeVisible();

    // Check radio buttons have proper structure
    await expect(page.locator('input[name="analytics"][value="on"]')).toHaveAttribute("type", "radio");
    await expect(page.locator('input[name="performance"][value="on"]')).toHaveAttribute("type", "radio");
  });

  test("should display success banner only after save", async ({ page }) => {
    await page.goto("/cookies-policy");

    // Success banner should not be visible initially
    await expect(page.locator(".govuk-notification-banner--success")).not.toBeVisible();

    // Save preferences
    await page.locator('input[name="analytics"][value="on"]').check();
    await page.locator('input[name="performance"][value="on"]').check();
    await page.locator('button:has-text("Save")').click();

    // Success banner should now be visible
    await expect(page.locator(".govuk-notification-banner--success")).toBeVisible();
  });

  test("should preserve Welsh language after saving preferences", async ({ page }) => {
    await page.goto("/cookies-policy?lng=cy");

    // Save preferences
    await page.locator('input[name="analytics"][value="on"]').check();
    await page.locator('input[name="performance"][value="off"]').check();
    await page.locator('button:has-text("Cadw")').click();

    // Should stay on Welsh route
    await expect(page).toHaveURL(/\/cookies-policy\?lng=cy&saved=true/);
    await expect(page.locator("h1")).toHaveText("Polisi Cwcis");
  });

  test("should not display back button", async ({ page }) => {
    await page.goto("/cookies-policy");

    // Back link should not be visible (page opens in new tab)
    const backLink = page.locator("a.govuk-back-link");
    await expect(backLink).not.toBeVisible();
  });

  test("should have responsive full-width layout", async ({ page }) => {
    await page.goto("/cookies-policy");

    // Content should use full width column
    const mainColumn = page.locator(".govuk-grid-column-full");
    await expect(mainColumn).toBeVisible();
  });

  test("should have links with correct attributes", async ({ page }) => {
    await page.goto("/cookies-policy");

    // Check manage cookies link
    const manageCookiesLink = page.locator('a:has-text("how to manage cookies")');
    await expect(manageCookiesLink).toHaveAttribute("href", "https://www.aboutcookies.org/");
    await expect(manageCookiesLink).toHaveAttribute("target", "_blank");

    // Check Google Privacy Policy link
    const privacyPolicyLink = page.locator('a:has-text("Privacy Policy")');
    await expect(privacyPolicyLink).toHaveAttribute("href", "https://policies.google.com/technologies/partner-sites");
    await expect(privacyPolicyLink).toHaveAttribute("target", "_blank");

    // Check opt out link
    const optOutLink = page.locator('a:has-text("opt out of Google Analytics")');
    await expect(optOutLink).toHaveAttribute("href", "https://tools.google.com/dlpage/gaoptout");
    await expect(optOutLink).toHaveAttribute("target", "_blank");
  });
});

test.describe("Cookie Policy Page - Footer Integration", () => {
  test("should have cookies link in footer", async ({ page }) => {
    await page.goto("/");

    // Check footer link exists (text is "Cookies" not "Cookie policy")
    const footerLink = page.locator('footer a:has-text("Cookies")');
    await expect(footerLink).toBeVisible();
    await expect(footerLink).toHaveAttribute("href", "/cookies-policy");
    await expect(footerLink).toHaveAttribute("target", "_blank");
    await expect(footerLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("should open cookie policy in new tab from footer", async ({ page, context }) => {
    await page.goto("/");

    // Click footer link and wait for new page
    const [newPage] = await Promise.all([context.waitForEvent("page"), page.locator('footer a:has-text("Cookies")').click()]);

    // Verify new page URL
    await expect(newPage).toHaveURL(/\/cookies-policy/);
    await expect(newPage.locator("h1")).toHaveText("Cookie policy");
  });
});

test.describe("Cookie Policy Page - Accessibility", () => {
  test("should not have accessibility violations", async ({ page }) => {
    await page.goto("/cookies-policy");

    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should have proper heading hierarchy", async ({ page }) => {
    await page.goto("/cookies-policy");

    // Should have exactly one h1
    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBe(1);

    // h1 should contain "Cookie policy"
    const h1Text = await page.locator("h1").textContent();
    expect(h1Text).toContain("Cookie policy");

    // Should have multiple heading levels
    const allHeadings = await page.locator("h1, h2").all();
    expect(allHeadings.length).toBeGreaterThan(1);
  });

  test("should have accessible form controls", async ({ page }) => {
    await page.goto("/cookies-policy");

    // All radio buttons should have associated labels
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
  });

  test("should have accessible tables", async ({ page }) => {
    await page.goto("/cookies-policy");

    // All tables should have headers
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

  test("should have proper fieldset and legend structure", async ({ page }) => {
    await page.goto("/cookies-policy");

    // Check analytics radio group has fieldset and legend
    const analyticsFieldset = page
      .locator("fieldset")
      .filter({
        has: page.locator('input[name="analytics"]')
      })
      .first();

    await expect(analyticsFieldset).toBeVisible();

    const analyticsLegend = analyticsFieldset.locator("legend");
    await expect(analyticsLegend).toBeVisible();
    await expect(analyticsLegend).toContainText("Allow cookies that measure website use");

    // Check performance radio group has fieldset and legend
    const performanceFieldset = page
      .locator("fieldset")
      .filter({
        has: page.locator('input[name="performance"]')
      })
      .first();

    await expect(performanceFieldset).toBeVisible();

    const performanceLegend = performanceFieldset.locator("legend");
    await expect(performanceLegend).toBeVisible();
    await expect(performanceLegend).toContainText("Allow cookies that measure website application performance");
  });

  test("should maintain accessibility in Welsh language", async ({ page }) => {
    await page.goto("/cookies-policy?lng=cy");

    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should support browser zoom up to 200%", async ({ page }) => {
    await page.goto("/cookies-policy");

    // Set viewport to simulate 200% zoom (half the width)
    await page.setViewportSize({ width: 640, height: 480 });

    // Content should still be visible and readable
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator('input[name="analytics"]').first()).toBeVisible();
    await expect(page.locator('button:has-text("Save")').first()).toBeVisible();

    // Form should still be functional
    await page.locator('input[name="analytics"][value="on"]').check();
    await expect(page.locator('input[name="analytics"][value="on"]')).toBeChecked();
  });
});
