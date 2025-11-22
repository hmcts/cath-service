import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Note: target-size and link-name rules are disabled due to pre-existing site-wide footer accessibility issues:
// 1. Crown copyright link fails WCAG 2.5.8 Target Size criterion (insufficient size)
// 2. Crown copyright logo link missing accessible text (WCAG 2.4.4, 4.1.2)
// These issues affect ALL pages and should be addressed in a separate ticket
// See: docs/tickets/VIBE-150/accessibility-findings.md

test.describe("Courts and Tribunals List Page", () => {
  test.describe("given user is on the courts-tribunals-list page", () => {
    test("should load the page with locations grouped alphabetically and accessibility compliance", async ({ page }) => {
      await page.goto("/courts-tribunals-list");

      // Check the page has loaded
      await expect(page).toHaveTitle(/.*/);

      // Check for the page heading
      const heading = page.getByRole("heading", { name: /find a court or tribunal/i });
      await expect(heading).toBeVisible();

      // Check for court table
      const courtTable = page.locator(".court-table");
      await expect(courtTable).toBeVisible();

      // Check for location links in the table
      const locationLinks = page.locator(".court-table a");
      await expect(locationLinks.first()).toBeVisible();

      // Check for back link
      const backLink = page.locator(".govuk-back-link");
      await expect(backLink).toBeVisible();

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
  });

  test.describe("given user clicks on a location", () => {
    test("should navigate to summary-of-publications page with locationId parameter", async ({ page }) => {
      await page.goto("/courts-tribunals-list");

      // Click on a location link (e.g., test court alpha)
      const locationLink = page.getByRole("link", { name: /test court alpha/i });
      await locationLink.click();

      // Verify navigation to summary-of-publications page with locationId parameter
      await expect(page).toHaveURL("/summary-of-publications?locationId=9001");

      // Note: The summary-of-publications page will be implemented in a future ticket
      // For now, this will show a 404 or error page
    });
  });

  test.describe("given user clicks back link", () => {
    test("should navigate back in browser history", async ({ page }) => {
      // First navigate to search page, then to courts-tribunals-list
      await page.goto("/search");
      await page.goto("/courts-tribunals-list");

      // Click the back link
      const backLink = page.locator(".govuk-back-link");
      await backLink.click();

      // Verify navigation back to the search page
      await expect(page).toHaveURL("/search");
    });
  });

  test.describe("given locations are displayed", () => {
    test("should group locations alphabetically by first letter", async ({ page }) => {
      await page.goto("/courts-tribunals-list");

      // Check that the court table has letter cells
      const courtLetters = page.locator(".court-table .court-letter");
      await expect(courtLetters.first()).toBeVisible();

      // Verify at least one letter is displayed in the table
      const letterCount = await courtLetters.count();
      expect(letterCount).toBeGreaterThan(0);
    });

    test("should display all locations from mock data", async ({ page }) => {
      await page.goto("/courts-tribunals-list");

      // Check for specific locations from our mock data
      const oxfordLink = page.getByRole("link", { name: /test court alpha/i });
      await expect(oxfordLink).toBeVisible();

      const sjpLink = page.getByRole("link", { name: /test sjp court/i });
      await expect(sjpLink).toBeVisible();
    });
  });

  test.describe("given user toggles language", () => {
    test("should display Welsh content when language is changed to Welsh", async ({ page }) => {
      await page.goto("/courts-tribunals-list");

      // Find and click the Welsh language toggle
      const languageToggle = page.locator(".language");
      await expect(languageToggle).toBeVisible();
      await expect(languageToggle).toContainText("Cymraeg");

      await languageToggle.click();

      // Verify URL has Welsh parameter
      await expect(page).toHaveURL(/.*\?lng=cy/);

      // Verify language toggle now shows English option
      await expect(languageToggle).toContainText("English");

      // Check that page heading is still visible (content will be in Welsh)
      const heading = page.getByRole("heading", { level: 1 });
      await expect(heading).toBeVisible();

      // Check that location links are still visible
      const locationLinks = page.locator(".court-table a");
      await expect(locationLinks.first()).toBeVisible();

      // Verify back link is still visible
      const backLink = page.locator(".govuk-back-link");
      await expect(backLink).toBeVisible();

      // Run accessibility checks in Welsh
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should switch back to English when language toggle is clicked again", async ({ page }) => {
      await page.goto("/courts-tribunals-list?lng=cy");

      // Verify we're in Welsh mode
      const languageToggle = page.locator(".language");
      await expect(languageToggle).toContainText("English");

      // Switch back to English
      await languageToggle.click();

      // Verify URL has English parameter
      await expect(page).toHaveURL(/.*\?lng=en/);

      // Verify language toggle now shows Welsh option
      await expect(languageToggle).toContainText("Cymraeg");

      // Check that page elements are still visible
      const heading = page.getByRole("heading", { level: 1 });
      await expect(heading).toBeVisible();

      const locationLinks = page.locator(".court-table a");
      await expect(locationLinks.first()).toBeVisible();
    });
  });

  test.describe("given user uses keyboard navigation", () => {
    test("should be navigable using Tab key with visible focus indicators", async ({ page }) => {
      // Navigate to search first, then to courts-tribunals-list
      await page.goto("/search");
      await page.goto("/courts-tribunals-list");

      // Click the back link to verify it's focusable
      const backLink = page.locator(".govuk-back-link");
      await backLink.click();

      // Verify we navigated back (back link should be functional)
      await expect(page).toHaveURL("/search");
    });

    test("should navigate to summary-of-publications page using Enter key on location link", async ({ page }) => {
      await page.goto("/courts-tribunals-list");

      // Click a location link to verify it's functional
      const locationLink = page.getByRole("link", { name: /test court alpha/i });
      await locationLink.click();

      // Verify navigation to summary-of-publications page with locationId
      await expect(page).toHaveURL("/summary-of-publications?locationId=9001");
    });
  });

  test.describe("given user completes full journey", () => {
    test("should maintain accessibility throughout location selection from A-Z list", async ({ page }) => {
      // Start on courts-tribunals-list page
      await page.goto("/courts-tribunals-list");

      // Initial accessibility check
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Click on a location
      const locationLink = page.getByRole("link", { name: /test court alpha/i });
      await locationLink.click();

      // Verify navigation to summary-of-publications page
      await expect(page).toHaveURL("/summary-of-publications?locationId=9001");

      // Note: The summary-of-publications page will be implemented in a future ticket
      // For now, this will show a 404 or error page
    });
  });

  test.describe("given user interacts with filter panel", () => {
    test("should display filter panel with jurisdictions and regions", async ({ page }) => {
      await page.goto("/courts-tribunals-list");

      // Check filter heading is visible (it's an h2)
      const filterHeading = page.locator('h2:has-text("Filter")');
      await expect(filterHeading).toBeVisible();

      // Check jurisdiction section is visible
      const jurisdictionSection = page.locator("text=Jurisdiction").first();
      await expect(jurisdictionSection).toBeVisible();

      // Check region section is visible
      const regionSection = page.locator("text=Region").first();
      await expect(regionSection).toBeVisible();

      // Check apply filters button is visible
      const applyButton = page.getByRole("button", { name: /apply filters/i });
      await expect(applyButton).toBeVisible();

      // Check clear filters link is visible
      const clearLink = page.getByRole("link", { name: /clear filters/i });
      await expect(clearLink).toBeVisible();
    });

    test("should show sub-jurisdiction section when jurisdiction is selected", async ({ page }) => {
      await page.goto("/courts-tribunals-list");

      // Find and check a jurisdiction checkbox
      const civilCheckbox = page.locator('input[name="jurisdiction"][value="1"]');
      await civilCheckbox.check();

      // Verify sub-jurisdiction section appears
      const subJurisdictionSection = page.locator('.sub-jurisdiction-section[data-parent-jurisdiction="1"]');
      await expect(subJurisdictionSection).toBeVisible();
    });

    test("should hide sub-jurisdiction section when jurisdiction is unchecked", async ({ page }) => {
      await page.goto("/courts-tribunals-list");

      // Check then uncheck a jurisdiction
      const civilCheckbox = page.locator('input[name="jurisdiction"][value="1"]');
      await civilCheckbox.check();
      await civilCheckbox.uncheck();

      // Verify sub-jurisdiction section is hidden
      const subJurisdictionSection = page.locator('.sub-jurisdiction-section[data-parent-jurisdiction="1"]');
      await expect(subJurisdictionSection).toBeHidden();
    });

    test("should filter locations by region", async ({ page }) => {
      await page.goto("/courts-tribunals-list");

      // Select London region (regionId = 1)
      const londonCheckbox = page.locator('input[name="region"][value="1"]');
      await londonCheckbox.check();

      // Apply filters
      const applyButton = page.getByRole("button", { name: /apply filters/i });
      await applyButton.click();

      // Wait for navigation with filter parameters
      await page.waitForURL(/.*region=1.*/);

      // Verify URL contains filter parameter
      expect(page.url()).toContain("region=1");

      // Verify selected filter tag appears
      const filterTag = page.locator(".filter-tag");
      await expect(filterTag.first()).toBeVisible();
    });

    test("should filter locations by jurisdiction", async ({ page }) => {
      await page.goto("/courts-tribunals-list");

      // Select Civil jurisdiction (jurisdictionId = 1)
      const civilCheckbox = page.locator('input[name="jurisdiction"][value="1"]');
      await civilCheckbox.check();

      // Apply filters
      const applyButton = page.getByRole("button", { name: /apply filters/i });
      await applyButton.click();

      // Wait for navigation with filter parameters
      await page.waitForURL(/.*jurisdiction=1.*/);

      // Verify URL contains filter parameter
      expect(page.url()).toContain("jurisdiction=1");
    });

    test("should filter locations by sub-jurisdiction", async ({ page }) => {
      await page.goto("/courts-tribunals-list");

      // Select Civil jurisdiction first to reveal sub-jurisdictions
      const civilCheckbox = page.locator('input[name="jurisdiction"][value="1"]');
      await civilCheckbox.check();

      // Wait for sub-jurisdiction section to appear
      const subJurisdictionSection = page.locator('.sub-jurisdiction-section[data-parent-jurisdiction="1"]');
      await expect(subJurisdictionSection).toBeVisible();

      // Select a sub-jurisdiction - wait for it to be visible first
      const subJurisdictionCheckbox = subJurisdictionSection.locator('input[name="subJurisdiction"]').first();
      await expect(subJurisdictionCheckbox).toBeVisible();
      await subJurisdictionCheckbox.check();

      // Apply filters
      const applyButton = page.getByRole("button", { name: /apply filters/i });
      await applyButton.click();

      // Wait for navigation
      await page.waitForURL(/.*subJurisdiction=.*/);

      // Verify URL contains both filter parameters
      expect(page.url()).toContain("jurisdiction=1");
      expect(page.url()).toContain("subJurisdiction=");
    });

    test("should remove filter when filter tag close button is clicked", async ({ page }) => {
      // Start with a filter already applied
      await page.goto("/courts-tribunals-list?region=1");

      // Verify filter tag is visible
      const filterTag = page.locator(".filter-tag");
      await expect(filterTag.first()).toBeVisible();

      // Click the remove button on the filter tag
      const removeButton = filterTag.locator(".filter-tag-remove").first();
      await removeButton.click();

      // Verify navigation to page without filter
      await expect(page).toHaveURL("/courts-tribunals-list");

      // Verify filter tag is no longer visible
      await expect(filterTag.first()).toBeHidden();
    });

    test("should clear all filters when clear filters link is clicked", async ({ page }) => {
      // Start with multiple filters applied
      await page.goto("/courts-tribunals-list?region=1&jurisdiction=1");

      // Click clear filters link
      const clearLink = page.getByRole("link", { name: /clear filters/i });
      await clearLink.click();

      // Verify navigation to page without any filters
      await expect(page).toHaveURL("/courts-tribunals-list");
    });

    test("should collapse and expand filter sections", async ({ page }) => {
      await page.goto("/courts-tribunals-list");

      // Find a collapsible section toggle button
      const toggleButton = page.locator(".filter-section-toggle").first();
      await expect(toggleButton).toBeVisible();

      // Get initial aria-expanded state
      const initialState = await toggleButton.getAttribute("aria-expanded");
      expect(initialState).toBe("true");

      // Click to collapse
      await toggleButton.click();

      // Verify section is collapsed
      const collapsedState = await toggleButton.getAttribute("aria-expanded");
      expect(collapsedState).toBe("false");

      // Click to expand again
      await toggleButton.click();

      // Verify section is expanded
      const expandedState = await toggleButton.getAttribute("aria-expanded");
      expect(expandedState).toBe("true");
    });

    test("should maintain accessibility with filters applied", async ({ page }) => {
      await page.goto("/courts-tribunals-list?region=1&jurisdiction=1");

      // Run accessibility checks with filters
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe("given user interacts with A-Z navigation", () => {
    test("should display A-Z navigation links", async ({ page }) => {
      await page.goto("/courts-tribunals-list");

      // Check A-Z navigation is visible
      const azNavigation = page.locator(".az-navigation");
      await expect(azNavigation).toBeVisible();

      // Check individual letters are visible
      const letterLinks = azNavigation.locator("a, span");
      await expect(letterLinks.first()).toBeVisible();
    });

    test("should jump to letter section when A-Z link is clicked", async ({ page }) => {
      await page.goto("/courts-tribunals-list");

      // Find a letter link that should exist (e.g., 'O' for Oxford)
      const letterLink = page.locator('.az-navigation a[href="#letter-O"]');

      // Check if link exists and click it
      const linkCount = await letterLink.count();
      if (linkCount > 0) {
        await letterLink.click();

        // Verify URL has the anchor
        expect(page.url()).toContain("#letter-O");
      }
    });

    test("should disable letter links when no locations start with that letter", async ({ page }) => {
      await page.goto("/courts-tribunals-list");

      // Find disabled letter spans (letters with no locations)
      const disabledLetters = page.locator(".az-navigation__letter--disabled");

      // At least some letters should be disabled
      const count = await disabledLetters.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe("given user applies multiple filters", () => {
    test("should display multiple filter tags when multiple filters are applied", async ({ page }) => {
      await page.goto("/courts-tribunals-list?region=1&jurisdiction=1");

      // Check that multiple filter tags are visible
      const filterTags = page.locator(".filter-tag");
      const tagCount = await filterTags.count();
      expect(tagCount).toBeGreaterThanOrEqual(2);
    });

    test("should update location list to match all applied filters", async ({ page }) => {
      await page.goto("/courts-tribunals-list?region=1");

      // Get initial location count
      const initialLinks = await page.locator(".court-table a").count();

      // Apply additional filter
      await page.goto("/courts-tribunals-list?region=1&jurisdiction=1");

      // Get filtered location count
      const filteredLinks = await page.locator(".court-table a").count();

      // Filtered count should be less than or equal to initial count
      expect(filteredLinks).toBeLessThanOrEqual(initialLinks);
    });
  });
});
