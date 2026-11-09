import { expect, type Page, test } from "@playwright/test";
import { axeCheck } from "../utils/axe-helper.js";
import { createUniqueTestLocation } from "../utils/dynamic-test-data.js";
import { loadListTypeFixture } from "../utils/publication-payloads.js";
import { uploadTestPublication } from "../utils/publication-upload.js";
import { loginWithSSO } from "../utils/sso-helpers.js";
import { createVerifiedTestUser, loginAsTestUser } from "../utils/verified-user-helpers.js";

// Each test publishes to its own court, one publication per sensitivity, so its assertions only see data it owns.
// CLASSIFIED access depends on the list type's allowed provenance (CFT_IDAM for Civil and Family), not the artefact's.
async function createCourtWithPublications(): Promise<CourtWithPublications> {
  const court = await createUniqueTestLocation({ namePrefix: "Publication Authorisation Court" });
  const publish = async (listTypeName: string, fixture: string, sensitivity: "PUBLIC" | "PRIVATE" | "CLASSIFIED") =>
    (await uploadTestPublication({ locationId: court.locationId, listTypeName, sensitivity, payload: loadListTypeFixture(fixture), mirrorJsonToWeb: true }))
      .artefactId;

  const [crownDaily, crownFirm, civilDailyPrivate, civilAndFamilyClassified] = await Promise.all([
    publish("CROWN_DAILY_PDDA_LIST", "crown-daily-pdda-list", "PUBLIC"),
    publish("CROWN_FIRM_PDDA_LIST", "crown-firm-pdda-list", "PUBLIC"),
    publish("CIVIL_DAILY_CAUSE_LIST", "civil-daily-cause-list", "PRIVATE"),
    publish("CIVIL_AND_FAMILY_DAILY_CAUSE_LIST", "civil-and-family-daily-cause-list", "CLASSIFIED")
  ]);

  return {
    summaryUrl: `/summary-of-publications?locationId=${court.locationId}`,
    publicArtefactIds: [crownDaily, crownFirm],
    privateArtefactId: civilDailyPrivate,
    classifiedArtefactId: civilAndFamilyClassified
  };
}

function publicationLink(page: Page, artefactId: string) {
  return page.locator(`.govuk-list a[href*="artefactId=${artefactId}"]`);
}

async function expectVisiblePublications(page: Page, court: CourtWithPublications, visible: { private: boolean; classified: boolean }) {
  for (const artefactId of court.publicArtefactIds) {
    await expect(publicationLink(page, artefactId)).toHaveCount(1);
  }
  await expect(publicationLink(page, court.privateArtefactId)).toHaveCount(visible.private ? 1 : 0);
  await expect(publicationLink(page, court.classifiedArtefactId)).toHaveCount(visible.classified ? 1 : 0);
}

async function tabToLink(page: Page, matches: (href: string) => boolean, maxTabs: number): Promise<boolean> {
  await page.locator("h1.govuk-heading-l").focus();
  for (let tabCount = 0; tabCount < maxTabs; tabCount++) {
    await page.keyboard.press("Tab");
    const href = await page.evaluate(() => (document.activeElement as HTMLAnchorElement)?.href || "");
    if (matches(href)) return true;
  }
  return false;
}

/**
 * E2E tests for publication authorisation based on sensitivity levels
 * Tests the implementation of VIBE-247: Role-based and provenance-based access control
 */

test.describe("Publication Authorisation - Summary of Publications", () => {
  test.describe("Unauthenticated users (PUBLIC access only)", () => {
    test("unauthenticated user can only see PUBLIC publications and is denied access to CLASSIFIED content", async ({ page }) => {
      const court = await createCourtWithPublications();

      // 1. Navigate to summary of publications page without authentication
      await page.goto(court.summaryUrl);
      await page.waitForSelector("h1.govuk-heading-l");

      // 2. Only the PUBLIC publications are listed; PRIVATE and CLASSIFIED are not
      await expectVisiblePublications(page, court, { private: false, classified: false });

      // 3. Test Welsh translation
      await page.goto(`${court.summaryUrl}&lng=cy`);
      await page.waitForSelector("h1.govuk-heading-l");
      const welshHeading = await page.locator("h1.govuk-heading-l").textContent();
      expect(welshHeading).toBeTruthy();

      // 4. Directly accessing the CLASSIFIED publication by URL is denied
      await page.goto(`/civil-and-family-daily-cause-list?artefactId=${court.classifiedArtefactId}`);
      await page.waitForSelector("h1");

      const heading = await page.locator("h1").textContent();
      const isAccessDenied = heading?.includes("Access Denied") || heading?.includes("Mynediad wedi'i Wrthod");
      expect(isAccessDenied).toBe(true);
    });
  });

  test.describe("CFT IDAM authenticated users (VERIFIED role with CFT provenance)", () => {
    test("CFT user can access PUBLIC, PRIVATE, and CLASSIFIED CFT publications with provenance filtering, maintains session, and loses access after logout", async ({
      page
    }) => {
      const court = await createCourtWithPublications();

      // 1. Log in as this test's own verified user with CFT_IDAM provenance
      await loginAsTestUser(page, await createVerifiedTestUser({ provenance: "CFT_IDAM", label: "cft-authorisation" }));

      // 2. Navigate to summary of publications
      await page.goto(court.summaryUrl);
      await page.waitForSelector("h1.govuk-heading-l");

      // Run accessibility check on authenticated summary page
      const summaryAccessibility = await axeCheck(page).disableRules(["target-size", "link-name", "region"]).analyze();
      expect(summaryAccessibility.violations).toEqual([]);

      // 3. CFT user sees PUBLIC, PRIVATE and CLASSIFIED (CFT provenance matches the list type)
      await expectVisiblePublications(page, court, { private: true, classified: true });
      const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
      const initialCount = await publicationLinks.count();

      // Keyboard navigation reaches a publication link and activates it
      const foundPublicationLink = await tabToLink(page, (href) => href.includes("artefactId="), 50);
      expect(foundPublicationLink).toBe(true);
      const focusedElement = page.locator(":focus");
      await expect(focusedElement).toBeVisible();
      // Use click() instead of keyboard Enter for more reliable navigation in CI
      await focusedElement.click();
      await page.waitForLoadState("networkidle");
      expect(page.url()).toContain("artefactId=");

      // 4. Provenance-based filtering: the CLASSIFIED CFT publication opens without a 403
      await page.goto(court.summaryUrl);
      await page.waitForSelector("h1.govuk-heading-l");
      await publicationLink(page, court.classifiedArtefactId).click();
      await page.waitForLoadState("networkidle");

      expect(page.url()).toMatch(/\/civil-and-family-daily-cause-list\?artefactId=/);
      expect(page.url()).not.toContain("/403");
      expect(page.url()).not.toContain("/sign-in");
      const classifiedBody = await page.locator("body").textContent();
      expect(classifiedBody).not.toContain("Access Denied");
      expect(classifiedBody).not.toContain("Mynediad wedi'i Wrthod");

      // 5. The PRIVATE publication opens too
      await page.goto(court.summaryUrl);
      await page.waitForSelector("h1.govuk-heading-l");
      await publicationLink(page, court.privateArtefactId).click();
      await page.waitForLoadState("networkidle");

      expect(page.url()).toMatch(/artefactId=/);
      expect(page.url()).not.toContain("/403");
      expect(page.url()).not.toContain("/sign-in");
      expect(await page.locator("body").textContent()).not.toContain("Access Denied");

      // 6. Test Welsh translation
      await page.goto(`${court.summaryUrl}&lng=cy`);
      await page.waitForSelector("h1.govuk-heading-l");
      const welshHeading = await page.locator("h1.govuk-heading-l").textContent();
      expect(welshHeading).toBeTruthy();

      // Run accessibility check on Welsh summary page
      const welshAccessibility = await axeCheck(page).disableRules(["target-size", "link-name", "region"]).analyze();
      expect(welshAccessibility.violations).toEqual([]);

      // 7. Session persists across reload and navigation
      await page.goto(court.summaryUrl);
      await page.waitForSelector("h1.govuk-heading-l");
      await page.reload();
      await page.waitForSelector("h1.govuk-heading-l");
      expect(await publicationLinks.count()).toBe(initialCount);

      await page.goto("/");
      await page.goto(court.summaryUrl);
      await page.waitForSelector("h1.govuk-heading-l");
      expect(await publicationLinks.count()).toBe(initialCount);

      // 8. Logout and verify loss of access to PRIVATE and CLASSIFIED publications
      // The local session is destroyed before /logout hands a CFT_IDAM user to IDAM endSession, so the IDAM leg is not waited for
      await page.goto("/logout");

      await page.goto(court.summaryUrl);
      await page.waitForSelector("h1.govuk-heading-l");

      // Run accessibility check on unauthenticated summary page after logout
      const logoutAccessibility = await axeCheck(page).disableRules(["target-size", "link-name", "region"]).analyze();
      expect(logoutAccessibility.violations).toEqual([]);

      await expectVisiblePublications(page, court, { private: false, classified: false });
    });
  });

  test.describe("System Admin users (SYSTEM_ADMIN role)", () => {
    test("System Admin has full access to all publications and can view actual publication data", async ({ page }) => {
      const court = await createCourtWithPublications();

      // 1. Authenticate via system admin dashboard (protected page)
      await page.goto("/system-admin-dashboard");
      await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
      await page.waitForURL("/system-admin-dashboard");

      // 2. Navigate to summary page
      await page.goto(court.summaryUrl);
      await page.waitForSelector("h1.govuk-heading-l");

      // Run accessibility check on summary page
      const summaryAccessibility = await axeCheck(page).disableRules(["target-size", "link-name", "region"]).analyze();
      expect(summaryAccessibility.violations).toEqual([]);

      // 3. System admin sees all publications including PRIVATE and CLASSIFIED
      await expectVisiblePublications(page, court, { private: true, classified: true });

      // 4. Can access the CLASSIFIED publication
      await publicationLink(page, court.classifiedArtefactId).click();
      await page.waitForLoadState("networkidle");

      // Run accessibility check on CLASSIFIED publication page
      const classifiedAccessibility = await axeCheck(page).disableRules(["target-size", "link-name", "region"]).analyze();
      expect(classifiedAccessibility.violations).toEqual([]);

      await expect(page).toHaveURL(/\/civil-and-family-daily-cause-list\?artefactId=/);
      expect(await page.locator("body").textContent()).not.toContain("Access Denied");

      // 5. Can view actual publication data (not just metadata)
      await page.goto(court.summaryUrl);
      await page.waitForSelector("h1.govuk-heading-l");
      await publicationLink(page, court.privateArtefactId).click();
      await page.waitForLoadState("networkidle");

      // Run accessibility check on publication data view page
      const publicationAccessibility = await axeCheck(page).disableRules(["target-size", "link-name", "region"]).analyze();
      expect(publicationAccessibility.violations).toEqual([]);

      const publicationBodyText = await page.locator("body").textContent();
      expect(publicationBodyText).not.toContain("You do not have permission to view the data for this publication");
      expect(publicationBodyText).not.toContain("You can view metadata only");
    });
  });

  test.describe("Internal Admin users (INTERNAL_ADMIN_CTSC and INTERNAL_ADMIN_LOCAL)", () => {
    const internalAdmins = [
      { title: "CTSC Admin", email: "SSO_TEST_CTSC_ADMIN_EMAIL", password: "SSO_TEST_CTSC_ADMIN_PASSWORD" },
      { title: "Local Admin", email: "SSO_TEST_LOCAL_ADMIN_EMAIL", password: "SSO_TEST_LOCAL_ADMIN_PASSWORD" }
    ];

    for (const admin of internalAdmins) {
      test(`${admin.title} can only see PUBLIC publications and view their data`, async ({ page }) => {
        const court = await createCourtWithPublications();

        // 1. Authenticate via admin dashboard (protected page)
        await page.goto("/admin-dashboard");
        await loginWithSSO(page, process.env[admin.email]!, process.env[admin.password]!);
        await page.waitForURL("/admin-dashboard");

        // 2. Navigate to summary page
        await page.goto(court.summaryUrl);
        await page.waitForSelector("h1.govuk-heading-l");

        // Run accessibility check on admin summary page
        const summaryAccessibility = await axeCheck(page).disableRules(["target-size", "link-name", "region"]).analyze();
        expect(summaryAccessibility.violations).toEqual([]);

        // 3. Internal admins see the PUBLIC publications only
        await expectVisiblePublications(page, court, { private: false, classified: false });

        // 4. Keyboard navigation reaches a PUBLIC publication link
        const isPublicLink = (href: string) => court.publicArtefactIds.some((artefactId) => href.includes(artefactId));
        expect(await tabToLink(page, isPublicLink, 30)).toBe(true);

        // Test activation of the link (use click for reliability)
        await page.locator(":focus").click();
        await page.waitForLoadState("networkidle");

        // Run accessibility check on PUBLIC publication page
        const publicationAccessibility = await axeCheck(page).disableRules(["target-size", "link-name", "region"]).analyze();
        expect(publicationAccessibility.violations).toEqual([]);

        // Should successfully access PUBLIC publication data
        const bodyText = await page.locator("body").textContent();
        expect(bodyText).not.toContain("Access Denied");
        expect(bodyText).not.toContain("You do not have permission to view the data");
      });
    }
  });

  test.describe("Keyboard Navigation Journey", () => {
    test("should support complete keyboard navigation through publication list and detail pages", async ({ page }) => {
      // 1. Create test data and navigate to summary page
      const testLocation = await createUniqueTestLocation({ namePrefix: "Keyboard Nav Court" });
      await uploadTestPublication({
        locationId: testLocation.locationId,
        listTypeName: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
        payload: loadListTypeFixture("civil-and-family-daily-cause-list"),
        mirrorJsonToWeb: true
      });

      await page.goto(`/summary-of-publications?locationId=${testLocation.locationId}`);
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
          hasBoxShadow: computedStyle.boxShadow !== "none"
        };
      });

      // Verify element is a link
      expect(focusedElementDetails.tagName).toBe("A");

      // 4. Test keyboard activation - Enter key should navigate
      // Use Promise.all to avoid race condition where navigation completes before waitForURL is registered
      await Promise.all([page.waitForURL(/artefactId=/, { timeout: 10000 }), page.keyboard.press("Enter")]);

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
      await page.goto(`/summary-of-publications?locationId=${testLocation.locationId}`);
      await page.waitForSelector("h1.govuk-heading-l");

      const focusOrder = [];
      await page.keyboard.press("Tab");

      for (let i = 0; i < 3; i++) {
        const elementInfo = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement;
          return {
            tagName: el.tagName,
            text: el.textContent?.trim().substring(0, 30) || "",
            href: (el as HTMLAnchorElement).href || null
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

interface CourtWithPublications {
  summaryUrl: string;
  publicArtefactIds: string[];
  privateArtefactId: string;
  classifiedArtefactId: string;
}
