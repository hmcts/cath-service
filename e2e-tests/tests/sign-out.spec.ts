import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Note: target-size and link-name rules are disabled due to pre-existing site-wide footer accessibility issues
// See: sign-in.spec.ts for details

test.describe("Sign Out Flow", () => {
  test.describe("given user visits the session logged out page", () => {
    test("should display signed out confirmation panel", async ({ page }) => {
      await page.goto("/session-logged-out");

      // Check for GOV.UK confirmation panel with signed out message
      const panel = page.locator(".govuk-panel--confirmation");
      await expect(panel).toBeVisible();

      // Check panel title
      const panelTitle = panel.locator(".govuk-panel__title");
      await expect(panelTitle).toContainText(/you have been signed out/i);
    });

    test("should pass accessibility checks @nightly", async ({ page }) => {
      await page.goto("/session-logged-out");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe("given user views page in Welsh", () => {
    test("should display Welsh signed out message @nightly", async ({ page }) => {
      await page.goto("/session-logged-out?lng=cy");

      // Check for Welsh confirmation panel
      const panel = page.locator(".govuk-panel--confirmation");
      await expect(panel).toBeVisible();

      // Check Welsh panel title
      const panelTitle = panel.locator(".govuk-panel__title");
      await expect(panelTitle).toContainText(/rydych wedi allgofnodi/i);
    });

    test("should pass accessibility checks in Welsh @nightly", async ({ page }) => {
      await page.goto("/session-logged-out?lng=cy");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe("given unauthenticated user visits logout endpoint", () => {
    test("should redirect to session logged out page @nightly", async ({ page }) => {
      // Visit logout endpoint without being authenticated
      await page.goto("/logout");

      // Should redirect to session-logged-out page
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/session-logged-out/);
    });
  });

  test.describe("given user relies on screen reader", () => {
    test("should have proper panel structure for announcements @nightly", async ({ page }) => {
      await page.goto("/session-logged-out");

      // Verify GOV.UK panel structure
      const panel = page.locator(".govuk-panel--confirmation");
      await expect(panel).toBeVisible();

      // Panel title should be a heading
      const panelTitle = panel.locator(".govuk-panel__title");
      await expect(panelTitle).toBeVisible();

      // Verify heading is properly marked up (h1)
      const heading = page.locator("h1");
      await expect(heading).toContainText(/you have been signed out/i);
    });
  });
});
