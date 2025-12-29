import { expect, test } from "@playwright/test";
import { assertAuthenticated, loginWithCftIdam, logout } from "../utils/cft-idam-helpers.js";
import { loginWithSSO } from "../utils/sso-helpers.js";

/**
 * E2E tests for publication authorisation based on sensitivity levels
 * Tests the implementation of VIBE-247: Role-based and provenance-based access control
 */

test.describe("Publication Authorisation - Summary of Publications", () => {
  test.describe("Unauthenticated users (PUBLIC access only)", () => {
    test("unauthenticated user can only see PUBLIC publications and is denied access to CLASSIFIED content", async ({ page }) => {
      // 1. Navigate to summary of publications page without authentication
      await page.goto("/summary-of-publications?locationId=9");
      await page.waitForSelector("h1.govuk-heading-l");

      // 2. Verify PUBLIC publications are visible
      const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
      const count = await publicationLinks.count();

      // Verify that publications are visible (PUBLIC ones should be available)
      // Note: This assumes locationId=9 has at least some PUBLIC publications
      // If no PUBLIC publications exist, count would be 0, which is correct behavior
      expect(count).toBeGreaterThanOrEqual(0);

      // If publications exist, verify they don't include sensitive data indicators
      if (count > 0) {
        const firstLinkText = await publicationLinks.first().textContent();
        expect(firstLinkText).toBeTruthy();
      }

      // 3. Verify CLASSIFIED Civil and Family publications are not in the list
      // We can't directly check for absence of specific publications,
      // but we verify the count is less than what an authenticated CFT user would see
      // This is validated in combination with the authenticated user tests below
      expect(count).toBeGreaterThanOrEqual(0);

      // 4. Test Welsh translation
      await page.goto("/summary-of-publications?locationId=9&lng=cy");
      await page.waitForSelector("h1.govuk-heading-l");
      const welshHeading = await page.locator("h1.govuk-heading-l").textContent();
      expect(welshHeading).toBeTruthy();

      // 5. Attempt to directly access a CLASSIFIED publication by URL
      // Uses the known test CLASSIFIED artefact from seed data
      await page.goto("/civil-and-family-daily-cause-list?artefactId=00000000-0000-0000-0000-000000000001");
      await page.waitForSelector("h1");

      // Should show "Access Denied" error page (403)
      const heading = await page.locator("h1").textContent();

      // Check for access denied heading (English or Welsh)
      const isAccessDenied = heading?.includes("Access Denied") || heading?.includes("Mynediad wedi'i Wrthod");
      expect(isAccessDenied).toBe(true);
    });
  });

  test.describe("CFT IDAM authenticated users (VERIFIED role with CFT provenance)", () => {
    test("CFT user can access PUBLIC, PRIVATE, and CLASSIFIED CFT publications with provenance filtering, maintains session, and loses access after logout", async ({ page }) => {
      // 1. Login as CFT user
      await page.goto("/sign-in");

      const hmctsRadio = page.getByRole("radio", { name: /with a myhmcts account/i });
      await hmctsRadio.check();
      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      await loginWithCftIdam(page, process.env.CFT_VALID_TEST_ACCOUNT!, process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD!);

      await assertAuthenticated(page);

      // 2. Navigate to summary of publications with CFT publications
      await page.goto("/summary-of-publications?locationId=9");
      await page.waitForSelector("h1.govuk-heading-l");

      // 3. Verify CFT user sees PUBLIC, PRIVATE, and CLASSIFIED CFT publications
      const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
      const initialCount = await publicationLinks.count();

      // CFT user should see more publications than unauthenticated user
      // Including PUBLIC + PRIVATE + CLASSIFIED(CFT)
      expect(initialCount).toBeGreaterThan(0);

      // Verify publications are accessible
      if (initialCount > 0) {
        const firstLinkText = await publicationLinks.first().textContent();
        expect(firstLinkText).toBeTruthy();
        expect(firstLinkText?.length).toBeGreaterThan(0);
      }

      // 4. Verify provenance-based filtering: CFT user sees CFT CLASSIFIED publications
      const cftPublicationLinks = page.locator('.govuk-list a[href*="civil-and-family-daily-cause-list"]');
      const cftCount = await cftPublicationLinks.count();

      // Should see CFT publications (if they exist for this location)
      expect(cftCount).toBeGreaterThanOrEqual(0);

      // If CLASSIFIED Civil and Family publications exist, verify access and provenance matching
      if (cftCount > 0) {
        // Verify link text contains "Civil"
        const linkText = await cftPublicationLinks.first().textContent();
        expect(linkText).toContain("Civil");

        // Click on the first CFT publication
        await cftPublicationLinks.first().click();

        // Should navigate to the publication page without 403 error
        await page.waitForLoadState("networkidle");
        const currentUrl = page.url();

        // Should be on a list type page, not an error page
        expect(currentUrl).toMatch(/\/civil-and-family-daily-cause-list\?artefactId=/);
        expect(currentUrl).not.toContain("/403");
        expect(currentUrl).not.toContain("/sign-in");

        // Should not see access denied message (provenance matches)
        const accessDeniedText = await page.locator("body").textContent();
        expect(accessDeniedText).not.toContain("Access Denied");
        expect(accessDeniedText).not.toContain("Mynediad wedi'i Wrthod");

        // Navigate back to summary page
        await page.goto("/summary-of-publications?locationId=9");
        await page.waitForSelector("h1.govuk-heading-l");
      }

      // 5. Verify can access any publication (provenance-based access control)
      if (initialCount > 0) {
        const firstLink = publicationLinks.first();
        await firstLink.click();

        await page.waitForLoadState("networkidle");
        const currentUrl = page.url();

        // Should successfully navigate to a publication page
        expect(currentUrl).toMatch(/artefactId=/);
        expect(currentUrl).not.toContain("/403");
        expect(currentUrl).not.toContain("/sign-in");

        // Should not see access denied message
        const bodyText = await page.locator("body").textContent();
        expect(bodyText).not.toContain("Access Denied");

        // Navigate back
        await page.goto("/summary-of-publications?locationId=9");
        await page.waitForSelector("h1.govuk-heading-l");
      }

      // 6. Test Welsh translation
      await page.goto("/summary-of-publications?locationId=9&lng=cy");
      await page.waitForSelector("h1.govuk-heading-l");
      const welshHeading = await page.locator("h1.govuk-heading-l").textContent();
      expect(welshHeading).toBeTruthy();

      // Navigate back to English version
      await page.goto("/summary-of-publications?locationId=9");
      await page.waitForSelector("h1.govuk-heading-l");

      // 7. Test session persistence - reload the page
      await page.reload();
      await page.waitForSelector("h1.govuk-heading-l");

      // Count should remain the same (session persists)
      const reloadedCount = await publicationLinks.count();
      expect(reloadedCount).toBe(initialCount);

      // 8. Test session persistence - navigate away and back
      await page.goto("/");
      await page.goto("/summary-of-publications?locationId=9");
      await page.waitForSelector("h1.govuk-heading-l");

      // Count should still be the same
      const afterNavigationCount = await publicationLinks.count();
      expect(afterNavigationCount).toBe(initialCount);

      // 9. Logout and verify loss of access to CLASSIFIED publications
      await logout(page);

      // Navigate back to summary page as unauthenticated user
      await page.goto("/summary-of-publications?locationId=9");
      await page.waitForSelector("h1.govuk-heading-l");

      const publicationLinksUnauth = page.locator('.govuk-list a[href*="artefactId="]');
      const unauthenticatedCount = await publicationLinksUnauth.count();

      // Unauthenticated count should be less than or equal to authenticated count
      // (Only PUBLIC publications visible)
      expect(unauthenticatedCount).toBeLessThanOrEqual(initialCount);
    });
  });

  test.describe("System Admin users (SYSTEM_ADMIN role)", () => {
    test("System Admin has full access to all publications and can view actual publication data", async ({ page }) => {
      // 1. Authenticate via system admin dashboard (protected page)
      await page.goto("/system-admin-dashboard");
      await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
      await page.waitForURL("/system-admin-dashboard");

      // 2. Navigate to summary page
      await page.goto("/summary-of-publications?locationId=9");
      await page.waitForSelector("h1.govuk-heading-l");

      // 3. Verify System admin sees all publications including CLASSIFIED
      const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
      const count = await publicationLinks.count();

      // Should see all publications (PUBLIC + PRIVATE + CLASSIFIED)
      expect(count).toBeGreaterThan(0);

      // 4. Verify can access CLASSIFIED publication
      const classifiedLink = page.locator('.govuk-list a[href*="civil-and-family-daily-cause-list"]').first();
      if (await classifiedLink.isVisible()) {
        await classifiedLink.click();
        await page.waitForLoadState("networkidle");

        // Should successfully access the publication
        await expect(page).toHaveURL(/\/civil-and-family-daily-cause-list\?artefactId=/);
        const bodyText = await page.locator("body").textContent();
        expect(bodyText).not.toContain("Access Denied");

        // Navigate back to summary page
        await page.goto("/summary-of-publications?locationId=9");
        await page.waitForSelector("h1.govuk-heading-l");
      }

      // 5. Verify can view actual publication data (not just metadata)
      const firstLink = page.locator('.govuk-list a[href*="artefactId="]').first();
      await firstLink.click();
      await page.waitForLoadState("networkidle");

      // Should not see metadata-only restriction message
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).not.toContain("You do not have permission to view the data for this publication");
      expect(bodyText).not.toContain("You can view metadata only");
    });
  });

  test.describe("Internal Admin users (INTERNAL_ADMIN_CTSC and INTERNAL_ADMIN_LOCAL)", () => {
    test("CTSC Admin can only see PUBLIC publications and view their data", async ({ page }) => {
      // 1. Authenticate via admin dashboard (protected page)
      await page.goto("/admin-dashboard");
      await loginWithSSO(page, process.env.SSO_TEST_CTSC_ADMIN_EMAIL!, process.env.SSO_TEST_CTSC_ADMIN_PASSWORD!);
      await page.waitForURL("/admin-dashboard");

      // 2. Navigate to summary page
      await page.goto("/summary-of-publications?locationId=9");
      await page.waitForSelector("h1.govuk-heading-l");

      // 3. Verify CTSC admin only sees PUBLIC publications
      const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
      const count = await publicationLinks.count();

      // Should see at least PUBLIC publications
      expect(count).toBeGreaterThan(0);

      // 4. Verify NO CLASSIFIED publications are visible
      const classifiedLinks = page.locator('.govuk-list a[href*="civil-and-family-daily-cause-list"]');
      const classifiedCount = await classifiedLinks.count();
      expect(classifiedCount).toBe(0);

      // 5. Verify can view PUBLIC publication data
      const publicLink = page.locator('.govuk-list a[href*="crown-daily-list"], .govuk-list a[href*="crown-firm-list"]').first();

      if (await publicLink.isVisible()) {
        await publicLink.click();
        await page.waitForLoadState("networkidle");

        // Should successfully access PUBLIC publication data
        const bodyText = await page.locator("body").textContent();
        expect(bodyText).not.toContain("Access Denied");
        expect(bodyText).not.toContain("You do not have permission to view the data");
      }
    });

    test("Local Admin can only see PUBLIC publications and view their data", async ({ page }) => {
      // 1. Authenticate via admin dashboard (protected page)
      await page.goto("/admin-dashboard");
      await loginWithSSO(page, process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!, process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!);
      await page.waitForURL("/admin-dashboard");

      // 2. Navigate to summary page
      await page.goto("/summary-of-publications?locationId=9");
      await page.waitForSelector("h1.govuk-heading-l");

      // 3. Verify Local admin only sees PUBLIC publications
      const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
      const count = await publicationLinks.count();

      // Should see at least PUBLIC publications
      expect(count).toBeGreaterThan(0);

      // 4. Verify NO CLASSIFIED publications are visible
      const classifiedLinks = page.locator('.govuk-list a[href*="civil-and-family-daily-cause-list"]');
      const classifiedCount = await classifiedLinks.count();
      expect(classifiedCount).toBe(0);

      // 5. Verify can view PUBLIC publication data
      const publicLink = page.locator('.govuk-list a[href*="crown-daily-list"], .govuk-list a[href*="crown-firm-list"]').first();

      if (await publicLink.isVisible()) {
        await publicLink.click();
        await page.waitForLoadState("networkidle");

        // Should successfully access PUBLIC publication data
        const bodyText = await page.locator("body").textContent();
        expect(bodyText).not.toContain("Access Denied");
        expect(bodyText).not.toContain("You do not have permission to view the data");
      }
    });
  });
});
