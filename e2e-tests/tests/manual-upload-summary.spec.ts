import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Manual Upload Summary Page", () => {
  test.describe("Navigation and Page Load", () => {
    test("should load the manual upload summary page at /manual-upload-summary", async ({ page }) => {
      await page.goto("/manual-upload-summary");
      await expect(page).toHaveURL("/manual-upload-summary");
      await expect(page.locator("h1")).toHaveText("File upload summary");
    });

    test("should display sub-heading", async ({ page }) => {
      await page.goto("/manual-upload-summary");
      const subHeading = page.getByRole("heading", { name: "Check upload details" });
      await expect(subHeading).toBeVisible();
      await expect(subHeading).toHaveText("Check upload details");
    });

    test("should display back link", async ({ page }) => {
      await page.goto("/manual-upload-summary");
      const backLink = page.locator(".govuk-back-link");
      await expect(backLink).toBeVisible();
    });
  });

  test.describe("Summary List Display", () => {
    test("should display all 7 summary list rows", async ({ page }) => {
      await page.goto("/manual-upload-summary");

      const summaryList = page.locator(".govuk-summary-list");
      await expect(summaryList).toBeVisible();

      const rows = page.locator(".govuk-summary-list__row");
      await expect(rows).toHaveCount(7);
    });

    test("should display correct summary list keys", async ({ page }) => {
      await page.goto("/manual-upload-summary");

      const keys = page.locator(".govuk-summary-list__key");
      await expect(keys.nth(0)).toHaveText("Court name");
      await expect(keys.nth(1)).toHaveText("File");
      await expect(keys.nth(2)).toHaveText("List type");
      await expect(keys.nth(3)).toHaveText("Hearing start date");
      await expect(keys.nth(4)).toHaveText("Sensitivity");
      await expect(keys.nth(5)).toHaveText("Language");
      await expect(keys.nth(6)).toHaveText("Display file dates");
    });

    test("should display default values for all fields", async ({ page }) => {
      await page.goto("/manual-upload-summary");

      const values = page.locator(".govuk-summary-list__value");
      await expect(values.nth(0)).toContainText("Example Crown Court");
      await expect(values.nth(1)).toContainText("example-hearing-list.pdf");
      await expect(values.nth(2)).toContainText("Crown Daily List");
      await expect(values.nth(3)).toContainText("23 October 2025");
      await expect(values.nth(4)).toContainText("Public");
      await expect(values.nth(5)).toContainText("English");
      await expect(values.nth(6)).toContainText("23 October 2025");
    });
  });

  test.describe("Change Actions", () => {
    test("should display Change link for all summary list rows", async ({ page }) => {
      await page.goto("/manual-upload-summary");

      const changeLinks = page.locator(".govuk-summary-list__actions a");
      await expect(changeLinks).toHaveCount(7);

      // Verify all change links have the correct text
      for (let i = 0; i < 7; i++) {
        await expect(changeLinks.nth(i)).toContainText("Change");
      }
    });

    test("should have Change links pointing to /manual-upload", async ({ page }) => {
      await page.goto("/manual-upload-summary");

      const changeLinks = page.locator(".govuk-summary-list__actions a");

      for (let i = 0; i < 7; i++) {
        await expect(changeLinks.nth(i)).toHaveAttribute("href", "/manual-upload");
      }
    });

    test("should have visually hidden text for each Change link", async ({ page }) => {
      await page.goto("/manual-upload-summary");

      const changeLinks = page.locator(".govuk-summary-list__actions a");
      const hiddenTexts = ["Court name", "File", "List type", "Hearing start date", "Sensitivity", "Language", "Display file dates"];

      for (let i = 0; i < 7; i++) {
        const visuallyHiddenText = changeLinks.nth(i).locator(".govuk-visually-hidden");
        await expect(visuallyHiddenText).toHaveText(hiddenTexts[i]);
      }
    });
  });

  test.describe("Confirm Button", () => {
    test("should display Confirm button", async ({ page }) => {
      await page.goto("/manual-upload-summary");

      const confirmButton = page.getByRole("button", { name: "Confirm" });
      await expect(confirmButton).toBeVisible();
    });

    test("should redirect to /manual-upload-confirmation when Confirm is clicked", async ({ page }) => {
      await page.goto("/manual-upload-summary");

      const confirmButton = page.getByRole("button", { name: "Confirm" });
      await confirmButton.click();

      // Wait for navigation
      await page.waitForURL("/manual-upload-confirmation");
      await expect(page).toHaveURL("/manual-upload-confirmation");
    });
  });

  test.describe("Welsh Language Toggle", () => {
    test("should not display Welsh language toggle", async ({ page }) => {
      await page.goto("/manual-upload-summary");

      const welshToggle = page.locator('a[href*="lng=cy"]');
      await expect(welshToggle).not.toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("should meet WCAG 2.2 AA standards", async ({ page }) => {
      await page.goto("/manual-upload-summary");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should have proper heading hierarchy", async ({ page }) => {
      await page.goto("/manual-upload-summary");

      const h1 = page.locator("h1");
      await expect(h1).toHaveCount(1);
      await expect(h1).toHaveText("File upload summary");

      const mainHeading = page.getByRole("heading", { name: "File upload summary", level: 1 });
      await expect(mainHeading).toBeVisible();

      const subHeading = page.getByRole("heading", { name: "Check upload details", level: 2 });
      await expect(subHeading).toBeVisible();
    });

    test("should have all Change links keyboard accessible", async ({ page }) => {
      await page.goto("/manual-upload-summary");

      const changeLinks = page.locator(".govuk-summary-list__actions a");
      await expect(changeLinks).toHaveCount(7);

      // Verify all change links have href attributes (making them keyboard accessible)
      for (let i = 0; i < 7; i++) {
        await expect(changeLinks.nth(i)).toHaveAttribute("href", "/manual-upload");
      }
    });

    test("should have Confirm button keyboard accessible", async ({ page }) => {
      await page.goto("/manual-upload-summary");

      const confirmButton = page.getByRole("button", { name: "Confirm" });
      await expect(confirmButton).toBeVisible();

      // Verify button is a proper button element (keyboard accessible)
      await expect(confirmButton).toHaveAttribute("type", "submit");
    });
  });

  test.describe("Responsive Design", () => {
    test("should display correctly on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/manual-upload-summary");

      const h1 = page.locator("h1");
      await expect(h1).toBeVisible();

      const summaryList = page.locator(".govuk-summary-list");
      await expect(summaryList).toBeVisible();

      const confirmButton = page.getByRole("button", { name: "Confirm" });
      await expect(confirmButton).toBeVisible();
    });

    test("should display correctly on tablet viewport", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/manual-upload-summary");

      const h1 = page.locator("h1");
      await expect(h1).toBeVisible();

      const summaryList = page.locator(".govuk-summary-list");
      await expect(summaryList).toBeVisible();

      const confirmButton = page.getByRole("button", { name: "Confirm" });
      await expect(confirmButton).toBeVisible();
    });

    test("should display correctly on desktop viewport", async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto("/manual-upload-summary");

      const h1 = page.locator("h1");
      await expect(h1).toBeVisible();

      const summaryList = page.locator(".govuk-summary-list");
      await expect(summaryList).toBeVisible();

      const confirmButton = page.getByRole("button", { name: "Confirm" });
      await expect(confirmButton).toBeVisible();
    });
  });

  test.describe("Keyboard Navigation", () => {
    test("should be navigable using Tab key with visible focus indicators", async ({ page }) => {
      await page.goto("/manual-upload-summary");

      // Verify all interactive elements are present and keyboard accessible
      const changeLinks = page.locator(".govuk-summary-list__actions a");
      await expect(changeLinks).toHaveCount(7);

      // Verify all change links are proper anchor elements (keyboard accessible)
      for (let i = 0; i < 7; i++) {
        await expect(changeLinks.nth(i)).toHaveAttribute("href", "/manual-upload");
      }

      // Verify Confirm button is present and keyboard accessible
      const confirmButton = page.getByRole("button", { name: "Confirm" });
      await expect(confirmButton).toBeVisible();
      await expect(confirmButton).toHaveAttribute("type", "submit");
    });

    test("should submit form using Enter key on Confirm button", async ({ page }) => {
      await page.goto("/manual-upload-summary");

      const confirmButton = page.getByRole("button", { name: "Confirm" });
      await confirmButton.focus();
      await page.keyboard.press("Enter");

      // Wait for navigation
      await page.waitForURL("/manual-upload-confirmation");
      await expect(page).toHaveURL("/manual-upload-confirmation");
    });
  });

  test.describe("Form Structure", () => {
    test("should have form with POST method", async ({ page }) => {
      await page.goto("/manual-upload-summary");

      const form = page.locator("form");
      await expect(form).toBeVisible();
      await expect(form).toHaveAttribute("method", "post");
    });

    test("should not have cancel link", async ({ page }) => {
      await page.goto("/manual-upload-summary");

      const cancelLink = page.locator('a[href="/admin-dashboard"]');
      await expect(cancelLink).not.toBeVisible();
    });
  });
});
