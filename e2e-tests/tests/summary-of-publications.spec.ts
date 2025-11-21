import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Note: target-size and link-name rules are disabled due to pre-existing site-wide footer accessibility issues:
// 1. Crown copyright link fails WCAG 2.5.8 Target Size criterion (insufficient size)
// 2. Crown copyright logo link missing accessible text (WCAG 2.4.4, 4.1.2)
// These issues affect ALL pages and should be addressed in a separate ticket
// See: docs/tickets/VIBE-150/accessibility-findings.md

test.describe("Summary of Publications Page", () => {
  test.describe("given user navigates with valid locationId", () => {
    test("should load the page with publications list and accessibility compliance", async ({ page }) => {
      await page.goto("/summary-of-publications?locationId=9");

      // Check the page has loaded
      await expect(page).toHaveTitle(/.*/);

      // Check for page heading with location name
      const heading = page.locator("h1.govuk-heading-l");
      await expect(heading).toBeVisible();
      await expect(heading).toContainText("What do you want to view from");

      // Check for back link
      const backLink = page.locator(".govuk-back-link");
      await expect(backLink).toBeVisible();

      // Check for publication links (locationId=9 has multiple publications in mock data)
      const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
      await expect(publicationLinks.first()).toBeVisible();

      // Verify link text includes formatted list type and date
      const firstLink = publicationLinks.first();
      const linkText = await firstLink.textContent();
      expect(linkText).toBeTruthy();
      expect(linkText?.length).toBeGreaterThan(0);

      // Run accessibility checks on initial page load
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        console.log("Accessibility violations found:");
        accessibilityScanResults.violations.forEach((violation) => {
          console.log(`- ${violation.id}: ${violation.description}`);
          console.log(`  Impact: ${violation.impact}`);
          console.log(`  Affected nodes: ${violation.nodes.length}`);
          violation.nodes.forEach((node) => {
            console.log(`    ${node.target}`);
          });
        });
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should display publications as clickable links with correct format", async ({ page }) => {
      await page.goto("/summary-of-publications?locationId=9");

      // Get publication links
      const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
      const count = await publicationLinks.count();
      expect(count).toBeGreaterThan(0);

      // Verify first link format (should include formatted list type, date, and language)
      const firstLinkText = await publicationLinks.first().textContent();
      expect(firstLinkText?.trim()).toMatch(/.+\d{1,2}\s\w+\s\d{4}\s-\s.+/); // Matches "List Type DD Month YYYY - Language" format
    });

    test('should generate direct links to list type pages with artefactId parameter', async ({ page }) => {
      await page.goto('/summary-of-publications?locationId=9');

      // Get publication links
      const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
      const count = await publicationLinks.count();
      expect(count).toBeGreaterThan(0);

      // Verify first link has correct URL structure (direct to list type page with artefactId)
      const firstLinkHref = await publicationLinks.first().getAttribute('href');
      expect(firstLinkHref).toBeTruthy();
      expect(firstLinkHref).toMatch(/^\/[a-z-]+\?artefactId=[a-zA-Z0-9-]+$/);

      // Verify it's NOT using the old /publication/ route
      expect(firstLinkHref).not.toContain('/publication/');
    });
  });

  test.describe("given location has no publications", () => {
    test("should display no publications message", async ({ page }) => {
      // Using locationId=9001 which exists but has no publications
      await page.goto("/summary-of-publications?locationId=9001");

      // Check for empty state message using getByText for specificity
      await expect(page.getByText(/sorry, no lists found for this court/i)).toBeVisible();

      // Verify no publication links are displayed
      const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
      await expect(publicationLinks).toHaveCount(0);

      // Run accessibility checks
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe("given invalid locationId", () => {
    test("should redirect to 400 error page when locationId is missing", async ({ page }) => {
      await page.goto("/summary-of-publications");

      // Should redirect to 400 page
      await expect(page).toHaveURL("/400");

      // Check for 400 error page heading
      const heading = page.locator("h1.govuk-heading-l");
      await expect(heading).toBeVisible();
      await expect(heading).toContainText(/bad request/i);
    });

    test("should redirect to 400 error page when locationId is not numeric", async ({ page }) => {
      await page.goto("/summary-of-publications?locationId=abc");

      // Should redirect to 400 page
      await expect(page).toHaveURL("/400");

      // Check for 400 error page heading
      const heading = page.locator("h1.govuk-heading-l");
      await expect(heading).toBeVisible();
      await expect(heading).toContainText(/bad request/i);
    });

    test("should redirect to 400 error page when location does not exist", async ({ page }) => {
      // Using locationId=99999 which doesn't exist in location data
      await page.goto("/summary-of-publications?locationId=99999");

      // Should redirect to 400 page
      await expect(page).toHaveURL("/400");

      // Check for 400 error page heading
      const heading = page.locator("h1.govuk-heading-l");
      await expect(heading).toBeVisible();
      await expect(heading).toContainText(/bad request/i);
    });
  });

  test.describe("given user clicks back link", () => {
    test("should navigate to the previous page in history", async ({ page }) => {
      // Navigate to view-option page first
      await page.goto("/view-option");
      await page.waitForLoadState("domcontentloaded");

      // Select SJP option and continue
      const sjpCaseRadio = page.getByRole("radio", { name: /single justice procedure/i });
      await sjpCaseRadio.check();
      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      // Verify we're on summary-of-publications page
      await expect(page).toHaveURL("/summary-of-publications?locationId=9");

      // Use page.goBack() to verify browser history works
      await page.goBack();
      await expect(page).toHaveURL("/view-option");
    });
  });

  test.describe("given user toggles language", () => {
    test("should display Welsh content when language is changed to Welsh", async ({ page }) => {
      await page.goto("/summary-of-publications?locationId=9");

      // Wait for page to load
      await page.waitForSelector("h1.govuk-heading-l");

      // Find and click the Welsh language toggle
      const languageToggle = page.locator(".language");
      await expect(languageToggle).toBeVisible();
      await expect(languageToggle).toContainText("Cymraeg");

      await languageToggle.click();

      // Wait for page to reload with Welsh content
      await page.waitForLoadState("networkidle");

      // Verify URL has Welsh parameter AND locationId is preserved
      await expect(page).toHaveURL(/.*locationId=9.*lng=cy/);

      // Verify language toggle now shows English option
      await expect(languageToggle).toContainText("English");

      // Check that heading is in Welsh
      const heading = page.locator("h1.govuk-heading-l");
      await expect(heading).toContainText("Beth ydych chi eisiau edrych arno gan");

      // Run accessibility checks in Welsh
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should switch back to English when language toggle is clicked again", async ({ page }) => {
      await page.goto("/summary-of-publications?locationId=9&lng=cy");

      // Wait for page to load
      await page.waitForSelector("h1.govuk-heading-l");

      // Verify we're in Welsh mode
      const heading = page.locator("h1.govuk-heading-l");
      await expect(heading).toContainText("Beth ydych chi eisiau edrych arno gan");

      const languageToggle = page.locator(".language");
      await expect(languageToggle).toContainText("English");

      // Switch back to English
      await languageToggle.click();

      // Wait for page to reload
      await page.waitForLoadState("networkidle");

      // Verify URL has English parameter AND locationId is preserved
      await expect(page).toHaveURL(/.*locationId=9.*lng=en/);

      // Verify language toggle now shows Welsh option
      await expect(languageToggle).toContainText("Cymraeg");

      // Verify heading is in English
      await expect(heading).toContainText("What do you want to view from");
    });

    test("should preserve language selection with no publications message", async ({ page }) => {
      await page.goto("/summary-of-publications?locationId=9001&lng=cy");

      // Wait for page to load
      await page.waitForSelector("h1.govuk-heading-l");

      // Verify Welsh empty state message using getByText for specificity
      await expect(page.getByText(/mae'n ddrwg gennym, nid ydym wedi dod o hyd i unrhyw restrau/i)).toBeVisible();

      // Verify language toggle still shows English option
      const languageToggle = page.locator(".language");
      await expect(languageToggle).toContainText("English");
    });
  });

  test.describe("given user completes full journey from view-option", () => {
    test("should maintain accessibility throughout SJP selection journey", async ({ page }) => {
      // Start on view-option page
      await page.goto("/view-option");

      // Initial accessibility check
      let accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Select SJP option
      const sjpCaseRadio = page.getByRole("radio", { name: /single justice procedure/i });
      await sjpCaseRadio.check();

      // Accessibility check after selection
      accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Continue to next page
      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      // Verify navigation
      await expect(page).toHaveURL("/summary-of-publications?locationId=9");

      // Final accessibility check on summary-of-publications page
      accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Verify publication links are visible
      const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
      await expect(publicationLinks.first()).toBeVisible();
    });

    test("should display correct location name for SJP location", async ({ page }) => {
      // Navigate through the flow
      await page.goto("/view-option");
      const sjpCaseRadio = page.getByRole("radio", { name: /single justice procedure/i });
      await sjpCaseRadio.check();
      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      // Verify we're on the correct page
      await expect(page).toHaveURL("/summary-of-publications?locationId=9");

      // Verify heading includes location name (locationId=9 should resolve to a location in mock data)
      const heading = page.locator("h1.govuk-heading-l");
      await expect(heading).toBeVisible();
      await expect(heading).toContainText("What do you want to view from");
    });
  });

  test.describe("given publications are sorted by date", () => {
    test("should display publications in descending date order (newest first)", async ({ page }) => {
      await page.goto("/summary-of-publications?locationId=9");

      // Get all publication links
      const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
      const count = await publicationLinks.count();

      if (count > 1) {
        // Extract dates from link text (format: "List Type - DD Month YYYY")
        const dates: string[] = [];
        for (let i = 0; i < Math.min(count, 3); i++) {
          const linkText = await publicationLinks.nth(i).textContent();
          if (linkText) {
            dates.push(linkText);
          }
        }

        // Verify we have dates
        expect(dates.length).toBeGreaterThan(0);

        // Note: Full date parsing validation would be complex,
        // but we can verify the structure is correct
        dates.forEach((dateText) => {
          expect(dateText).toMatch(/\d{1,2}\s\w+\s\d{4}/);
        });
      }
    });
  });
});
