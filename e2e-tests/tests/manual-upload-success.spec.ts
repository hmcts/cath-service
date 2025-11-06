import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginWithSSO } from "../utils/sso-helpers.js";

// Helper function to complete the full manual upload flow and reach success page
async function completeManualUploadFlow(page: Page) {
  // Authenticate as System Admin first (manual upload requires admin access)
  await page.goto("/system-admin-dashboard");

  // If we're redirected to Azure AD, login
  if (page.url().includes("login.microsoftonline.com")) {
    const systemAdminEmail = process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!;
    const systemAdminPassword = process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!;
    await loginWithSSO(page, systemAdminEmail, systemAdminPassword);
  }

  // Navigate to manual upload page
  await page.goto("/manual-upload?locationId=1");

  // Wait for autocomplete to initialize
  await page.waitForTimeout(1000);

  // Select list type (6 = Crown Daily List)
  await page.selectOption('select[name="listType"]', "6");

  // Fill hearing start date
  await page.fill('input[name="hearingStartDate-day"]', "23");
  await page.fill('input[name="hearingStartDate-month"]', "10");
  await page.fill('input[name="hearingStartDate-year"]', "2025");

  // Select sensitivity
  await page.selectOption('select[name="sensitivity"]', "PUBLIC");

  // Select language
  await page.selectOption('select[name="language"]', "ENGLISH");

  // Fill display dates
  await page.fill('input[name="displayFrom-day"]', "20");
  await page.fill('input[name="displayFrom-month"]', "10");
  await page.fill('input[name="displayFrom-year"]', "2025");

  await page.fill('input[name="displayTo-day"]', "30");
  await page.fill('input[name="displayTo-month"]', "10");
  await page.fill('input[name="displayTo-year"]', "2025");

  // Upload a test file
  const fileInput = page.locator('input[name="file"]');
  await fileInput.setInputFiles({
    name: "test-hearing-list.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nTest hearing list content")
  });

  // Submit the form
  await page.getByRole("button", { name: /continue/i }).click();

  // Wait for summary page
  await page.waitForURL(/\/manual-upload-summary\?uploadId=/, { timeout: 10000 });

  // Confirm upload
  await page.getByRole("button", { name: "Confirm" }).click();

  // Wait for success page
  await page.waitForURL("/manual-upload-success", { timeout: 10000 });
}

test.describe("Manual Upload Success Page", () => {
  test.describe("Navigation and Page Load", () => {
    test("should load the manual upload success page after completing upload", async ({ page }) => {
      await completeManualUploadFlow(page);
      await expect(page).toHaveURL("/manual-upload-success");
    });

    test("should redirect to manual-upload if accessed directly without upload session", async ({ page }) => {
      // Authenticate first
      await page.goto("/system-admin-dashboard");
      if (page.url().includes("login.microsoftonline.com")) {
        const systemAdminEmail = process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!;
        const systemAdminPassword = process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!;
        await loginWithSSO(page, systemAdminEmail, systemAdminPassword);
      }

      // Try to access success page directly without upload session
      await page.goto("/manual-upload-success");
      await expect(page).toHaveURL("/manual-upload");
    });

    test("should not display back link", async ({ page }) => {
      await completeManualUploadFlow(page);
      const backLink = page.locator(".govuk-back-link");
      await expect(backLink).not.toBeVisible();
    });
  });

  test.describe("Success Panel", () => {
    test("should display success panel", async ({ page }) => {
      await completeManualUploadFlow(page);

      const successPanel = page.locator(".govuk-panel");
      await expect(successPanel).toBeVisible();
    });

    test("should display correct success title", async ({ page }) => {
      await completeManualUploadFlow(page);

      const title = page.locator(".govuk-panel__title");
      await expect(title).toHaveText("File upload successful");
    });

    test("should display confirmation message", async ({ page }) => {
      await completeManualUploadFlow(page);

      const successPanel = page.locator(".govuk-panel");
      await expect(successPanel).toContainText("Your file has been uploaded");
    });

    test("should have blue background styling", async ({ page }) => {
      await completeManualUploadFlow(page);

      const successPanel = page.locator(".govuk-panel");
      await expect(successPanel).toHaveClass(/govuk-panel--confirmation/);
    });
  });

  test.describe("Next Steps Section", () => {
    test("should display next steps heading", async ({ page }) => {
      await completeManualUploadFlow(page);

      const heading = page.getByRole("heading", { name: "What do you want to do next?" });
      await expect(heading).toBeVisible();
    });

    test("should display Upload another file link", async ({ page }) => {
      await completeManualUploadFlow(page);

      const uploadLink = page.getByRole("link", { name: "Upload another file" });
      await expect(uploadLink).toBeVisible();
      await expect(uploadLink).toHaveAttribute("href", "/manual-upload");
    });

    test("should display Remove file link", async ({ page }) => {
      await completeManualUploadFlow(page);

      const removeLink = page.getByRole("link", { name: "Remove file" });
      await expect(removeLink).toBeVisible();
      await expect(removeLink).toHaveAttribute("href", "/remove-list-search");
    });

    test("should display Home link", async ({ page }) => {
      await completeManualUploadFlow(page);

      const homeLink = page.getByRole("link", { name: "Home" });
      await expect(homeLink).toBeVisible();
      await expect(homeLink).toHaveAttribute("href", "/admin-dashboard");
    });
  });

  test.describe("Navigation Actions", () => {
    test("should navigate to manual-upload when Upload another file is clicked", async ({ page }) => {
      await completeManualUploadFlow(page);

      const uploadLink = page.getByRole("link", { name: "Upload another file" });
      await uploadLink.click();

      await expect(page).toHaveURL("/manual-upload");
    });

    test("should navigate to remove-list-search when Remove file is clicked", async ({ page }) => {
      await completeManualUploadFlow(page);

      const removeLink = page.getByRole("link", { name: "Remove file" });
      await removeLink.click();

      await expect(page).toHaveURL("/remove-list-search");
    });

    test("should navigate to admin-dashboard when Home is clicked", async ({ page }) => {
      await completeManualUploadFlow(page);

      const homeLink = page.getByRole("link", { name: "Home" });
      await homeLink.click();

      await expect(page).toHaveURL("/admin-dashboard");
    });
  });

  test.describe("Welsh Language Support", () => {
    test("should not display Welsh language toggle", async ({ page }) => {
      await completeManualUploadFlow(page);

      const welshToggle = page.locator('a[href*="lng=cy"]');
      await expect(welshToggle).not.toBeVisible();
    });

    test("should display Welsh content when lng=cy query param is used", async ({ page }) => {
      // Complete flow and then change language
      await completeManualUploadFlow(page);
      await page.goto("/manual-upload-success?lng=cy");

      const title = page.locator(".govuk-panel__title");
      await expect(title).toHaveText("Wedi llwyddo i uwchlwytho ffeiliau");
    });

    test("should have Welsh translations for all navigation links", async ({ page }) => {
      await completeManualUploadFlow(page);
      await page.goto("/manual-upload-success?lng=cy");

      const heading = page.getByRole("heading", { name: "Beth yr ydych eisiau ei wneud nesaf?" });
      await expect(heading).toBeVisible();

      const uploadLink = page.getByRole("link", { name: "uwchlwytho ffeil arall" });
      await expect(uploadLink).toBeVisible();

      const removeLink = page.getByRole("link", { name: "Dileu ffeil" });
      await expect(removeLink).toBeVisible();

      const homeLink = page.getByRole("link", { name: "Tudalen hafan" });
      await expect(homeLink).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("should meet WCAG 2.2 AA standards", async ({ page }) => {
      await completeManualUploadFlow(page);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should have proper heading hierarchy", async ({ page }) => {
      await completeManualUploadFlow(page);

      const h1 = page.locator(".govuk-panel__title");
      await expect(h1).toBeVisible();

      const h2 = page.getByRole("heading", { name: "What do you want to do next?", level: 2 });
      await expect(h2).toBeVisible();
    });

    test("should have all links keyboard accessible", async ({ page }) => {
      await completeManualUploadFlow(page);

      const links = page.locator(".govuk-list a");
      await expect(links).toHaveCount(3);

      for (let i = 0; i < 3; i++) {
        const href = await links.nth(i).getAttribute("href");
        expect(href).toBeTruthy();
      }
    });
  });

  test.describe("Responsive Design", () => {
    test("should display correctly on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await completeManualUploadFlow(page);

      const successPanel = page.locator(".govuk-panel");
      await expect(successPanel).toBeVisible();

      const heading = page.getByRole("heading", { name: "What do you want to do next?" });
      await expect(heading).toBeVisible();

      const links = page.locator(".govuk-list a");
      await expect(links).toHaveCount(3);
    });

    test("should display correctly on tablet viewport", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await completeManualUploadFlow(page);

      const successPanel = page.locator(".govuk-panel");
      await expect(successPanel).toBeVisible();

      const heading = page.getByRole("heading", { name: "What do you want to do next?" });
      await expect(heading).toBeVisible();
    });

    test("should display correctly on desktop viewport", async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await completeManualUploadFlow(page);

      const successPanel = page.locator(".govuk-panel");
      await expect(successPanel).toBeVisible();

      const heading = page.getByRole("heading", { name: "What do you want to do next?" });
      await expect(heading).toBeVisible();
    });
  });

  test.describe("Keyboard Navigation", () => {
    test("should be navigable using Tab key", async ({ page }) => {
      await completeManualUploadFlow(page);

      const links = page.locator(".govuk-list a");
      await expect(links).toHaveCount(3);

      for (let i = 0; i < 3; i++) {
        const link = links.nth(i);
        await link.focus();
        await expect(link).toBeFocused();
      }
    });

    test("should navigate to Upload another file using Enter key", async ({ page }) => {
      await completeManualUploadFlow(page);

      const uploadLink = page.getByRole("link", { name: "Upload another file" });
      await uploadLink.focus();
      await page.keyboard.press("Enter");

      await expect(page).toHaveURL("/manual-upload");
    });
  });

  test.describe("Session Management", () => {
    test("should not allow access after refreshing the page", async ({ page }) => {
      await completeManualUploadFlow(page);

      // Refresh the page
      await page.reload();

      // Should redirect back to manual-upload
      await expect(page).toHaveURL("/manual-upload");
    });

    test("should allow multiple sequential uploads", async ({ page }) => {
      // Complete first upload
      await completeManualUploadFlow(page);
      await expect(page).toHaveURL("/manual-upload-success");

      // Click upload another file and navigate to manual-upload with locationId
      await page.goto("/manual-upload?locationId=1");

      // Wait for autocomplete to initialize
      await page.waitForTimeout(1000);

      // Complete second upload (7 = Crown Firm List)
      await page.selectOption('select[name="listType"]', "7");
      await page.fill('input[name="hearingStartDate-day"]', "25");
      await page.fill('input[name="hearingStartDate-month"]', "11");
      await page.fill('input[name="hearingStartDate-year"]', "2025");
      await page.selectOption('select[name="sensitivity"]', "PRIVATE");
      await page.selectOption('select[name="language"]', "WELSH");
      await page.fill('input[name="displayFrom-day"]', "24");
      await page.fill('input[name="displayFrom-month"]', "11");
      await page.fill('input[name="displayFrom-year"]', "2025");
      await page.fill('input[name="displayTo-day"]', "26");
      await page.fill('input[name="displayTo-month"]', "11");
      await page.fill('input[name="displayTo-year"]', "2025");

      const fileInput = page.locator('input[name="file"]');
      await fileInput.setInputFiles({
        name: "second-upload.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4\nSecond upload content")
      });

      await page.getByRole("button", { name: /continue/i }).click();
      await page.waitForURL(/\/manual-upload-summary\?uploadId=/);
      await page.getByRole("button", { name: "Confirm" }).click();
      await page.waitForURL("/manual-upload-success");

      await expect(page).toHaveURL("/manual-upload-success");
    });
  });
});
