import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Note: target-size and link-name rules are disabled due to pre-existing site-wide footer accessibility issues
// See: sign-in.spec.ts for details

test.describe("Session Expired Page", () => {
  test.describe("given user visits the session expired page", () => {
    test("should display session expired message with sign in link", async ({ page }) => {
      await page.goto("/session-expired");

      // Check the page heading
      const heading = page.getByRole("heading", { name: /you have been signed out/i });
      await expect(heading).toBeVisible();

      // Check body text
      const bodyText = page.getByText(/your session has expired because you have been inactive/i);
      await expect(bodyText).toBeVisible();

      // Check sign in again link
      const signInLink = page.getByRole("link", { name: /sign in again/i });
      await expect(signInLink).toBeVisible();
      await expect(signInLink).toHaveAttribute("href", "/sign-in");
    });

    test("should pass accessibility checks @nightly", async ({ page }) => {
      await page.goto("/session-expired");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should navigate to sign in page when clicking sign in link", async ({ page }) => {
      await page.goto("/session-expired");

      const signInLink = page.getByRole("link", { name: /sign in again/i });
      await signInLink.click();

      await expect(page).toHaveURL("/sign-in");
    });
  });

  test.describe("given user views page in Welsh", () => {
    test("should display Welsh content @nightly", async ({ page }) => {
      await page.goto("/session-expired?lng=cy");

      // Check Welsh heading
      const heading = page.getByRole("heading", { name: /rydych wedi cael eich allgofnodi/i });
      await expect(heading).toBeVisible();

      // Check Welsh body text
      const bodyText = page.getByText(/mae eich sesiwn wedi dod i ben/i);
      await expect(bodyText).toBeVisible();

      // Check Welsh sign in link
      const signInLink = page.getByRole("link", { name: /mewngofnodi eto/i });
      await expect(signInLink).toBeVisible();
    });

    test("should pass accessibility checks in Welsh @nightly", async ({ page }) => {
      await page.goto("/session-expired?lng=cy");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe("given user relies on keyboard navigation", () => {
    test("should allow keyboard navigation to sign in link @nightly", async ({ page }) => {
      await page.goto("/session-expired");

      // Tab through interactive elements to reach sign in link
      let focused = false;
      for (let i = 0; i < 10 && !focused; i++) {
        await page.keyboard.press("Tab");
        const signInLink = page.getByRole("link", { name: /sign in again/i });
        try {
          await expect(signInLink).toBeFocused({ timeout: 100 });
          focused = true;
        } catch {
          // Continue tabbing
        }
      }

      // Verify sign in link can be focused
      const signInLink = page.getByRole("link", { name: /sign in again/i });
      await expect(signInLink).toBeFocused();

      // Verify pressing Enter navigates to sign in
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL("/sign-in");
    });
  });

  test.describe("given user relies on screen reader", () => {
    test("should have proper ARIA attributes and accessible names @nightly", async ({ page }) => {
      await page.goto("/session-expired");

      // Verify heading has proper structure
      const heading = page.getByRole("heading", { name: /you have been signed out/i });
      await expect(heading).toBeVisible();

      // Verify sign in link has accessible name
      const signInLink = page.getByRole("link", { name: /sign in again/i });
      await expect(signInLink).toHaveAccessibleName(/sign in again/i);
    });
  });
});
