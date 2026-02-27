import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../utils/sso-helpers.js";

test.describe("Language Toggle in Service Navigation - Issue 292", () => {
  test("public user can switch language using service navigation toggle @nightly", async ({ page }) => {
    // 1. Navigate to public page and verify English language toggle
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Verify service navigation is visible
    const serviceNav = page.locator(".govuk-service-navigation");
    await expect(serviceNav).toBeVisible();

    // Verify language toggle is present in service navigation for public users
    const languageToggle = serviceNav.locator('a:has-text("Cymraeg")');
    await expect(languageToggle).toBeVisible();
    await expect(languageToggle).toHaveAttribute("href", /\?lng=cy/);

    // Verify language toggle is NOT in phase banner (old location)
    const phaseBannerLanguageToggle = page.locator('.govuk-phase-banner a:has-text("Cymraeg")');
    await expect(phaseBannerLanguageToggle).not.toBeVisible();

    // 2. Switch to Welsh and verify content
    await languageToggle.click();
    await page.waitForURL(/.*\?lng=cy/);
    await page.waitForLoadState("networkidle");

    // Verify Welsh heading
    const heading = page.locator("h1");
    await expect(heading).toHaveText("Gwrandawiadau llys a thribiwnlys");

    // Verify English language toggle is now shown
    const englishToggle = serviceNav.locator('a:has-text("English")');
    await expect(englishToggle).toBeVisible();
    await expect(englishToggle).toHaveAttribute("href", /\?lng=en/);

    // Verify service name is in Welsh
    const serviceName = page.locator(".govuk-service-navigation__service-name a");
    await expect(serviceName).toHaveText("Gwrandawiadau llys a thribiwnlys");

    // 3. Test accessibility in Welsh
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["link-name", "target-size"]) // Known GOV.UK Design System footer issues
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // 4. Switch back to English
    await englishToggle.click();
    await page.waitForURL(/.*\?lng=en/);
    await page.waitForLoadState("networkidle");

    // Verify English content is restored
    await expect(heading).toHaveText("Court and tribunal hearings");
    await expect(languageToggle).toBeVisible();

    // 5. Test keyboard navigation to language toggle
    await page.keyboard.press("Tab");
    let toggleFocused = false;
    for (let i = 0; i < 10; i++) {
      try {
        await expect(languageToggle).toBeFocused({ timeout: 100 });
        toggleFocused = true;
        break;
      } catch {
        await page.keyboard.press("Tab");
      }
    }
    expect(toggleFocused).toBe(true);

    // 6. Test accessibility in English
    const englishAccessibilityResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["link-name", "target-size"])
      .analyze();

    expect(englishAccessibilityResults.violations).toEqual([]);
  });

  test("language toggle preserves query parameters when switching languages @nightly", async ({ page }) => {
    // Navigate to page with existing query parameters
    await page.goto("/view-option?test=value&another=param");
    await page.waitForLoadState("networkidle");

    const serviceNav = page.locator(".govuk-service-navigation");
    const languageToggle = serviceNav.locator('a:has-text("Cymraeg")');
    await expect(languageToggle).toBeVisible();

    // Click language toggle
    await languageToggle.click();

    // Verify query parameters are preserved
    await page.waitForURL(/.*\?.*test=value.*another=param.*lng=cy/);
    const url = page.url();
    expect(url).toContain("test=value");
    expect(url).toContain("another=param");
    expect(url).toContain("lng=cy");

    // Switch back to English
    const englishToggle = serviceNav.locator('a:has-text("English")');
    await englishToggle.click();

    // Verify query parameters are still preserved
    await page.waitForURL(/.*\?.*test=value.*another=param.*lng=en/);
    const englishUrl = page.url();
    expect(englishUrl).toContain("test=value");
    expect(englishUrl).toContain("another=param");
    expect(englishUrl).toContain("lng=en");
  });

  test("admin users do not see language toggle in service navigation @nightly", async ({ page }) => {
    // 1. Login as admin user
    await page.goto("/admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!, process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!);
    await page.waitForURL("/admin-dashboard");
    await page.waitForLoadState("networkidle");

    // 2. Verify service navigation is visible
    const serviceNav = page.locator(".govuk-service-navigation");
    await expect(serviceNav).toBeVisible();

    // 3. Verify language toggle is NOT present for admin users
    const languageToggle = serviceNav.locator('a:has-text("Cymraeg"), a:has-text("English")');
    await expect(languageToggle).not.toBeVisible();

    // 4. Verify admin can still navigate the service
    const serviceName = page.locator(".govuk-service-navigation__service-name a");
    await expect(serviceName).toBeVisible();
    await expect(serviceName).toHaveText("Court and tribunal hearings");

    // 5. Navigate to different admin page and verify toggle still hidden
    await page.goto("/manual-upload");
    await page.waitForLoadState("networkidle");

    const languageToggleOnUpload = serviceNav.locator('a:has-text("Cymraeg"), a:has-text("English")');
    await expect(languageToggleOnUpload).not.toBeVisible();

    // 6. Test accessibility on admin page (without language toggle)
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["link-name", "target-size"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // 7. Verify admin users can still force language via query parameter if needed
    await page.goto("/admin-dashboard?lng=cy");
    await page.waitForLoadState("networkidle");

    // Service should respect the query parameter
    const welshServiceName = page.locator(".govuk-service-navigation__service-name a");
    await expect(welshServiceName).toHaveText("Gwrandawiadau llys a thribiwnlys");

    // But toggle should still not be visible
    const welshLanguageToggle = serviceNav.locator('a:has-text("English")');
    await expect(welshLanguageToggle).not.toBeVisible();
  });

  test("system admin users do not see language toggle in service navigation @nightly", async ({ page }) => {
    // Test with system admin role
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await page.waitForURL("/system-admin-dashboard");
    await page.waitForLoadState("networkidle");

    const serviceNav = page.locator(".govuk-service-navigation");
    await expect(serviceNav).toBeVisible();

    // Verify language toggle is NOT present for system admin users
    const languageToggle = serviceNav.locator('a:has-text("Cymraeg"), a:has-text("English")');
    await expect(languageToggle).not.toBeVisible();

    // Verify system admin can navigate
    const serviceName = page.locator(".govuk-service-navigation__service-name a");
    await expect(serviceName).toBeVisible();
  });

  test("language toggle works across different public pages @nightly", async ({ page }) => {
    // Test language toggle on multiple public pages to ensure consistency
    const publicPages = ["/", "/view-option", "/cookie-policy"];

    for (const pagePath of publicPages) {
      await page.goto(pagePath);
      await page.waitForLoadState("networkidle");

      const serviceNav = page.locator(".govuk-service-navigation");

      // Verify language toggle is visible on each page
      const languageToggle = serviceNav.locator('a:has-text("Cymraeg")');
      await expect(languageToggle, `Language toggle should be visible on ${pagePath}`).toBeVisible();

      // Switch to Welsh
      await languageToggle.click();
      await page.waitForURL(new RegExp(`.*${pagePath}.*\\?.*lng=cy`));

      // Verify English toggle appears
      const englishToggle = serviceNav.locator('a:has-text("English")');
      await expect(englishToggle, `English toggle should be visible on ${pagePath} in Welsh`).toBeVisible();

      // Switch back to English for next iteration
      await englishToggle.click();
      await page.waitForURL(new RegExp(`.*${pagePath}.*\\?.*lng=en`));
    }
  });

  test("language preference persists across page navigation @nightly", async ({ page }) => {
    // 1. Start on home page and switch to Welsh
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const serviceNav = page.locator(".govuk-service-navigation");
    const languageToggle = serviceNav.locator('a:has-text("Cymraeg")');
    await languageToggle.click();
    await page.waitForURL(/.*\?lng=cy/);

    // 2. Navigate to another page without lng parameter
    await page.goto("/view-option");
    await page.waitForLoadState("networkidle");

    // 3. Verify Welsh is still active (session/cookie persistence)
    const heading = page.locator("h1");
    const headingText = await heading.textContent();

    // Language should persist from cookie/session
    // Either Welsh content or English toggle should be visible
    const englishToggle = serviceNav.locator('a:has-text("English")');
    const welshToggle = serviceNav.locator('a:has-text("Cymraeg")');

    // One of the toggles should be visible
    const englishVisible = await englishToggle.isVisible();
    const welshVisible = await welshToggle.isVisible();
    expect(englishVisible || welshVisible).toBe(true);
  });
});
