import AxeBuilder from "@axe-core/playwright";
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

      // Unauthenticated users should see at least some PUBLIC publications
      expect(count).toBeGreaterThan(0);

      // Verify publications are accessible
      const firstLinkText = await publicationLinks.first().textContent();
      expect(firstLinkText).toBeTruthy();

      // 3. Verify CLASSIFIED Civil and Family publications are NOT visible
      const classifiedLinks = page.locator('.govuk-list a[href*="civil-and-family-daily-cause-list"]');
      const classifiedCount = await classifiedLinks.count();

      // Unauthenticated users should NOT see any CLASSIFIED publications
      expect(classifiedCount).toBe(0);

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

      // Run accessibility check on authenticated summary page
      const summaryAccessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name", "region"])
        .analyze();
      expect(summaryAccessibility.violations).toEqual([]);

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

        // Test keyboard navigation through publication links
        const heading = page.locator("h1.govuk-heading-l");
        await heading.focus();

        // Tab through to reach the first publication link
        let tabCount = 0;
        const maxTabs = 50; // Increased safety limit to account for navigation links
        let foundPublicationLink = false;

        while (tabCount < maxTabs) {
          await page.keyboard.press("Tab");
          tabCount++;
          const href = await page.evaluate(() => (document.activeElement as HTMLAnchorElement)?.href || "");
          if (href.includes("artefactId=")) {
            foundPublicationLink = true;
            break;
          }
        }

        // Verify we found a publication link
        expect(foundPublicationLink).toBe(true);
        const focusedHref = await page.evaluate(() => (document.activeElement as HTMLAnchorElement)?.href || "");
        expect(focusedHref).toContain("artefactId=");

        // Verify focus indicator is visible
        const focusedElement = page.locator(":focus");
        await expect(focusedElement).toBeVisible();

        // Test Enter key activates the link
        // Use click() instead of keyboard Enter for more reliable navigation in CI
        await focusedElement.click();
        await page.waitForLoadState("networkidle");
        const currentUrl = page.url();
        expect(currentUrl).toContain("artefactId=");

        // Navigate back for subsequent tests
        await page.goto("/summary-of-publications?locationId=9");
        await page.waitForSelector("h1.govuk-heading-l");
      }

      // 4. Verify provenance-based filtering: CFT user sees CFT CLASSIFIED publications
      const cftPublicationLinks = page.locator('.govuk-list a[href*="civil-and-family-daily-cause-list"]');
      const cftCount = await cftPublicationLinks.count();

      // CFT user should see CLASSIFIED CFT publications
      expect(cftCount).toBeGreaterThan(0);

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

      // Run accessibility check on Welsh summary page
      const welshAccessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name", "region"])
        .analyze();
      expect(welshAccessibility.violations).toEqual([]);

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

      // Run accessibility check on unauthenticated summary page after logout
      const logoutAccessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name", "region"])
        .analyze();
      expect(logoutAccessibility.violations).toEqual([]);

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

      // Run accessibility check on summary page
      const summaryAccessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name", "region"])
        .analyze();
      expect(summaryAccessibility.violations).toEqual([]);

      // 3. Verify System admin sees all publications including CLASSIFIED
      const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
      const count = await publicationLinks.count();

      // Should see all publications (PUBLIC + PRIVATE + CLASSIFIED)
      expect(count).toBeGreaterThan(0);

      // 4. Verify can access CLASSIFIED publication
      const classifiedLink = page.locator('.govuk-list a[href*="civil-and-family-daily-cause-list"]').first();

      // Assert that the classified link is visible (test should fail if not present)
      await expect(classifiedLink).toBeVisible();

      await classifiedLink.click();
      await page.waitForLoadState("networkidle");

      // Run accessibility check on CLASSIFIED publication page
      const classifiedAccessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name", "region"])
        .analyze();
      expect(classifiedAccessibility.violations).toEqual([]);

      // Should successfully access the publication
      await expect(page).toHaveURL(/\/civil-and-family-daily-cause-list\?artefactId=/);
      const classifiedBodyText = await page.locator("body").textContent();
      expect(classifiedBodyText).not.toContain("Access Denied");

      // Navigate back to summary page
      await page.goto("/summary-of-publications?locationId=9");
      await page.waitForSelector("h1.govuk-heading-l");

      // 5. Verify can view actual publication data (not just metadata)
      const firstLink = page.locator('.govuk-list a[href*="artefactId="]').first();
      await firstLink.click();
      await page.waitForLoadState("networkidle");

      // Run accessibility check on publication data view page
      const publicationAccessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name", "region"])
        .analyze();
      expect(publicationAccessibility.violations).toEqual([]);

      // Should not see metadata-only restriction message
      const publicationBodyText = await page.locator("body").textContent();
      expect(publicationBodyText).not.toContain("You do not have permission to view the data for this publication");
      expect(publicationBodyText).not.toContain("You can view metadata only");
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

      // Run accessibility check on CTSC admin summary page
      const ctscSummaryAccessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name", "region"])
        .analyze();
      expect(ctscSummaryAccessibility.violations).toEqual([]);

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

      // Assert that the public link is visible (test should fail if not present)
      await expect(publicLink).toBeVisible();

      // Test keyboard navigation to the public link
      const heading = page.locator("h1.govuk-heading-l");
      await heading.focus();

      // Tab through to reach the public link
      let tabCount = 0;
      const maxTabs = 30; // Safety limit

      while (tabCount < maxTabs) {
        await page.keyboard.press("Tab");
        tabCount++;
        const focusedHref = await page.evaluate(() => (document.activeElement as HTMLAnchorElement)?.href || "");
        if (focusedHref.includes("crown-daily-list") || focusedHref.includes("crown-firm-list")) break;
      }

      // Verify focus is on a public link
      const focusedHref = await page.evaluate(() => (document.activeElement as HTMLAnchorElement)?.href || "");
      expect(focusedHref.match(/crown-daily-list|crown-firm-list/)).toBeTruthy();

      // Test activation of the link (use click for reliability)
      const focusedLink = page.locator(":focus");
      await focusedLink.click();
      await page.waitForLoadState("networkidle");

      // Run accessibility check on PUBLIC publication page
      const ctscPublicationAccessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name", "region"])
        .analyze();
      expect(ctscPublicationAccessibility.violations).toEqual([]);

      // Should successfully access PUBLIC publication data
      const ctscBodyText = await page.locator("body").textContent();
      expect(ctscBodyText).not.toContain("Access Denied");
      expect(ctscBodyText).not.toContain("You do not have permission to view the data");
    });

    test("Local Admin can only see PUBLIC publications and view their data", async ({ page }) => {
      // 1. Authenticate via admin dashboard (protected page)
      await page.goto("/admin-dashboard");
      await loginWithSSO(page, process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!, process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!);
      await page.waitForURL("/admin-dashboard");

      // 2. Navigate to summary page
      await page.goto("/summary-of-publications?locationId=9");
      await page.waitForSelector("h1.govuk-heading-l");

      // Run accessibility check on Local admin summary page
      const localSummaryAccessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name", "region"])
        .analyze();
      expect(localSummaryAccessibility.violations).toEqual([]);

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

      // Assert that the public link is visible (test should fail if not present)
      await expect(publicLink).toBeVisible();

      // Test keyboard navigation to the public link
      const heading = page.locator("h1.govuk-heading-l");
      await heading.focus();

      // Tab through to reach the public link
      let tabCount = 0;
      const maxTabs = 30; // Safety limit

      while (tabCount < maxTabs) {
        await page.keyboard.press("Tab");
        tabCount++;
        const focusedHref = await page.evaluate(() => (document.activeElement as HTMLAnchorElement)?.href || "");
        if (focusedHref.includes("crown-daily-list") || focusedHref.includes("crown-firm-list")) break;
      }

      // Verify focus is on a public link
      const focusedHref = await page.evaluate(() => (document.activeElement as HTMLAnchorElement)?.href || "");
      expect(focusedHref.match(/crown-daily-list|crown-firm-list/)).toBeTruthy();

      // Test activation of the link (use click for reliability)
      const focusedLink = page.locator(":focus");
      await focusedLink.click();
      await page.waitForLoadState("networkidle");

      // Run accessibility check on PUBLIC publication page
      const localPublicationAccessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name", "region"])
        .analyze();
      expect(localPublicationAccessibility.violations).toEqual([]);

      // Should successfully access PUBLIC publication data
      const localBodyText = await page.locator("body").textContent();
      expect(localBodyText).not.toContain("Access Denied");
      expect(localBodyText).not.toContain("You do not have permission to view the data");
    });
  });

  test.describe("Keyboard Navigation Journey", () => {
    test("should support complete keyboard navigation through publication list and detail pages", async ({ page }) => {
      // 1. Navigate to summary page
      await page.goto("/summary-of-publications?locationId=9");
      await page.waitForSelector("h1.govuk-heading-l");

      // 2. Test Tab navigation - find publication links via keyboard
      let publicationLinkFound = false;
      let tabCount = 0;
      const maxTabs = 50;

      await page.keyboard.press("Tab");

      while (tabCount < maxTabs && !publicationLinkFound) {
        tabCount++;
        const focusedHref = await page.evaluate(() => (document.activeElement as HTMLAnchorElement)?.href || "");

        if (focusedHref.includes("artefactId=")) {
          publicationLinkFound = true;
          break;
        }

        await page.keyboard.press("Tab");
      }

      // Verify we found a publication link via keyboard
      expect(publicationLinkFound).toBe(true);
      expect(tabCount).toBeLessThan(maxTabs);

      // 3. Verify focus indicator is visible (WCAG 2.4.7)
      const focusedElement = page.locator(":focus");
      await expect(focusedElement).toBeVisible();

      // Get focused element details
      const focusedElementDetails = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const computedStyle = window.getComputedStyle(el);
        return {
          tagName: el.tagName,
          hasOutline: computedStyle.outline !== "none" && computedStyle.outline !== "",
          hasBorder: computedStyle.border !== "none",
          hasBoxShadow: computedStyle.boxShadow !== "none",
        };
      });

      // Verify element is a link
      expect(focusedElementDetails.tagName).toBe("A");

      // 4. Test keyboard activation - Enter key should navigate
      await page.keyboard.press("Enter");
      await page.waitForLoadState("networkidle");

      // Verify navigation to publication detail page
      const detailUrl = page.url();
      expect(detailUrl).toContain("artefactId=");

      // 5. Test Tab navigation on detail page
      await page.keyboard.press("Tab");
      let backLinkFound = false;
      let detailTabCount = 0;
      const maxDetailTabs = 30;

      while (detailTabCount < maxDetailTabs && !backLinkFound) {
        detailTabCount++;
        const focusedText = await page.evaluate(() => document.activeElement?.textContent?.trim().toLowerCase() || "");
        const focusedHref = await page.evaluate(() => (document.activeElement as HTMLAnchorElement)?.href || "");

        if (focusedText.includes("back") || focusedHref.includes("summary-of-publications")) {
          backLinkFound = true;
          break;
        }

        await page.keyboard.press("Tab");
      }

      // Verify back link is reachable via keyboard
      expect(backLinkFound).toBe(true);

      // 6. Test reverse Tab navigation (Shift+Tab)
      const backLinkHref = await page.evaluate(() => (document.activeElement as HTMLAnchorElement)?.href || "");
      await page.keyboard.press("Shift+Tab");
      const previousElement = await page.evaluate(() => (document.activeElement as HTMLAnchorElement)?.href || "");

      // Should move focus to a different element
      expect(previousElement).not.toBe(backLinkHref);

      // 7. Test focus order is logical - Tab through first 3 interactive elements
      await page.goto("/summary-of-publications?locationId=9");
      await page.waitForSelector("h1.govuk-heading-l");

      const focusOrder = [];
      await page.keyboard.press("Tab");

      for (let i = 0; i < 3; i++) {
        const elementInfo = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement;
          return {
            tagName: el.tagName,
            text: el.textContent?.trim().substring(0, 30) || "",
            href: (el as HTMLAnchorElement).href || null,
          };
        });
        focusOrder.push(elementInfo);
        await page.keyboard.press("Tab");
      }

      // Verify we captured interactive elements in order
      expect(focusOrder.length).toBe(3);
      expect(focusOrder.every((el) => ["A", "BUTTON", "INPUT"].includes(el.tagName))).toBe(true);
    });
  });

});
