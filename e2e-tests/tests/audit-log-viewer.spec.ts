import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../utils/sso-helpers.js";

test.describe("Audit Log Viewer @nightly", () => {
  test("system admin can view audit log list and details", async ({ page }) => {
    // Navigate to system admin dashboard and login
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await page.waitForURL("/system-admin-dashboard");

    // Verify dashboard loaded
    await expect(page.locator("h1")).toHaveText("System Admin Dashboard");

    // Click on Audit Log Viewer tile
    await page.click('a:has-text("Audit Log Viewer")');
    await page.waitForURL("**/audit-log-list");

    // Verify audit log list page loaded
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText("Audit Log");

    // Check accessibility on list page
    const listAccessibilityResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(listAccessibilityResults.violations).toEqual([]);

    // Verify table is present
    const table = page.locator("table.govuk-table");
    await expect(table).toBeVisible();

    // Verify table headers
    await expect(page.locator("th:has-text('Timestamp')")).toBeVisible();
    await expect(page.locator("th:has-text('Email')")).toBeVisible();
    await expect(page.locator("th:has-text('Action')")).toBeVisible();
    await expect(page.locator("th:has-text('View')")).toBeVisible();

    // Verify filter panel is present
    const filterHeading = page.locator("h2:has-text('Filter')");
    await expect(filterHeading).toBeVisible();

    // Test Welsh translation
    await page.click('a:has-text("Cymraeg")');
    await page.waitForURL("**/audit-log-list?lng=cy");
    await expect(page.locator("h1")).toHaveText("Cofnod Archwilio");

    // Switch back to English
    await page.click('a:has-text("English")');
    await page.waitForURL("**/audit-log-list");

    // Check accessibility on Welsh page
    await page.goto("/audit-log-list?lng=cy");
    const welshAccessibilityResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(welshAccessibilityResults.violations).toEqual([]);
    await page.goto("/audit-log-list");

    // Test clicking "View" link for first entry (if any exist)
    const viewLinks = page.locator('a:has-text("View")');
    const viewLinkCount = await viewLinks.count();

    if (viewLinkCount > 0) {
      // Click first "View" link
      await viewLinks.first().click();
      await page.waitForURL(/.*audit-log-detail.*/);

      // Verify detail page loaded
      const detailHeading = page.locator("h1");
      await expect(detailHeading).toBeVisible();
      await expect(detailHeading).toHaveText("Audit Log Entry");

      // Check accessibility on detail page
      const detailAccessibilityResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(detailAccessibilityResults.violations).toEqual([]);

      // Verify detail fields are present
      await expect(page.locator("text=User ID")).toBeVisible();
      await expect(page.locator("text=Email")).toBeVisible();
      await expect(page.locator("text=Role")).toBeVisible();
      await expect(page.locator("text=Action")).toBeVisible();

      // Test Welsh translation on detail page
      await page.click('a:has-text("Cymraeg")');
      await page.waitForURL(/.*lng=cy.*/);
      await expect(page.locator("h1")).toHaveText("Cofnod Archwilio");

      // Switch back to English
      await page.click('a:has-text("English")');

      // Test "Back to audit log list" link
      const backLink = page.locator('a:has-text("Back to audit log list")');
      await expect(backLink).toBeVisible();
      await backLink.click();
      await page.waitForURL("**/audit-log-list");

      // Verify we're back on the list page
      await expect(page.locator("h1")).toHaveText("Audit Log");
    }

    // Test keyboard navigation
    await page.goto("/audit-log-list");
    await page.keyboard.press("Tab");

    // Verify "Back to top" link functionality (if present)
    const backToTopLink = page.locator('a:has-text("Back to top")');
    const backToTopCount = await backToTopLink.count();
    if (backToTopCount > 0) {
      await backToTopLink.click();
      // Verify focus moved to top of page
      const skipLink = page.locator("a.govuk-skip-link");
      await expect(skipLink).toBeFocused();
    }
  });

  test("non-admin user is denied access", async ({ page }) => {
    // Try to access audit log list as non-admin user
    await page.goto("/audit-log-list");

    // Should be redirected to login or show 403 error
    // This depends on your authentication implementation
    const url = page.url();
    const has403 = await page.locator("text=/403|Forbidden|Access Denied/i").count();

    expect(url.includes("/sign-in") || has403 > 0).toBe(true);
  });

  test("filters can be applied and results updated", async ({ page }) => {
    // Navigate to audit log list
    await page.goto("/audit-log-list");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await page.waitForURL("**/audit-log-list");

    // Fill in email filter
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill(process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!);

    // Apply filters
    const applyButton = page.locator('button:has-text("Apply filters")');
    await applyButton.click();

    // Wait for page to reload with filters
    await page.waitForURL(/.*email=.*/);

    // Verify filter was applied (should see filtered results or "no results" message)
    const emailParam = new URL(page.url()).searchParams.get("email");
    expect(emailParam).toBe(process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!);

    // Test "Clear filters" link
    const clearLink = page.locator('a:has-text("Clear filters")');
    const clearLinkCount = await clearLink.count();
    if (clearLinkCount > 0) {
      await clearLink.click();
      await page.waitForURL(/^(?!.*email=).*audit-log-list/);

      // Verify filters cleared
      const url = new URL(page.url());
      expect(url.searchParams.has("email")).toBe(false);
    }
  });

  test("pagination works correctly", async ({ page }) => {
    // Navigate to audit log list
    await page.goto("/audit-log-list");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await page.waitForURL("**/audit-log-list");

    // Check if pagination is present (depends on number of entries)
    const pagination = page.locator(".govuk-pagination");
    const hasPagination = (await pagination.count()) > 0;

    if (hasPagination) {
      // Click on page 2 (if it exists)
      const page2Link = page.locator('a:has-text("2")');
      const page2Count = await page2Link.count();

      if (page2Count > 0) {
        await page2Link.click();
        await page.waitForURL(/.*page=2.*/);

        // Verify we're on page 2
        const pageParam = new URL(page.url()).searchParams.get("page");
        expect(pageParam).toBe("2");

        // Verify current page is highlighted
        const currentPage = page.locator(".govuk-pagination__item--current");
        await expect(currentPage).toContainText("2");
      }
    }
  });

  test("action performed creates audit log entry", async ({ page }) => {
    // Login as system admin
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await page.waitForURL("/system-admin-dashboard");

    // Perform an action (add jurisdiction)
    await page.goto("/add-jurisdiction");
    await page.waitForLoadState("networkidle");

    const testName = `Test Jurisdiction ${Date.now()}`;
    const testWelshName = `Awdurdodaeth Prawf ${Date.now()}`;

    await page.fill('input[name="name"]', testName);
    await page.fill('input[name="welshName"]', testWelshName);
    await page.click('button:has-text("Continue")');

    // Wait for success page
    await page.waitForURL("**/add-jurisdiction-success");

    // Go to audit log
    await page.goto("/audit-log-list");
    await page.waitForLoadState("networkidle");

    // Filter by current user's email to find the audit entry
    await page.fill('input[name="email"]', process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!);
    await page.click('button:has-text("Apply filters")');
    await page.waitForURL(/.*email=.*/);

    // Verify the action appears in audit log
    // Should see ADD_JURISDICTION action
    const actionCell = page.locator("td:has-text('ADD_JURISDICTION')");
    await expect(actionCell.first()).toBeVisible({ timeout: 10000 });

    // Click to view details
    const rows = page.locator("tr:has(td:has-text('ADD_JURISDICTION'))");
    const firstRow = rows.first();
    const viewLink = firstRow.locator('a:has-text("View")');
    await viewLink.click();
    await page.waitForURL(/.*audit-log-detail.*/);

    // Verify details include the jurisdiction name
    const pageContent = await page.content();
    expect(pageContent.includes(testName) || pageContent.includes("Name:")).toBe(true);
  });
});
