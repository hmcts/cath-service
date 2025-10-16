import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Note: target-size and link-name rules are disabled due to pre-existing site-wide footer accessibility issues:
// 1. Crown copyright link fails WCAG 2.5.8 Target Size criterion (insufficient size)
// 2. Crown copyright logo link missing accessible text (WCAG 2.4.4, 4.1.2)
// These issues affect ALL pages and should be addressed in a separate ticket
// See: docs/tickets/VIBE-150/accessibility-findings.md

test.describe('Courts and Tribunals List Page', () => {
  test.describe('given user is on the courts-tribunals-list page', () => {
    test('should load the page with locations grouped alphabetically and accessibility compliance', async ({ page }) => {
      await page.goto('/courts-tribunals-list');

      // Check the page has loaded
      await expect(page).toHaveTitle(/.*/);

      // Check for the page heading
      const heading = page.getByRole('heading', { name: /select a court or tribunal/i });
      await expect(heading).toBeVisible();

      // Check for alphabetical groupings
      const letterHeadings = page.locator('.govuk-heading-m');
      await expect(letterHeadings.first()).toBeVisible();

      // Check for location links
      const locationLinks = page.locator('.govuk-list a');
      await expect(locationLinks.first()).toBeVisible();

      // Check for back link
      const backLink = page.locator('.govuk-back-link');
      await expect(backLink).toBeVisible();

      // Run accessibility checks on initial page load
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .disableRules(['target-size', 'link-name'])
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        console.log('Accessibility violations found:');
        accessibilityScanResults.violations.forEach(violation => {
          console.log(`- ${violation.id}: ${violation.description}`);
          console.log(`  Impact: ${violation.impact}`);
          console.log(`  Affected nodes: ${violation.nodes.length}`);
          violation.nodes.forEach(node => {
            console.log(`    ${node.target}`);
          });
        });
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('given user clicks on a location', () => {
    test('should navigate back to search page with location pre-selected', async ({ page }) => {
      await page.goto('/courts-tribunals-list');

      // Click on a location link (e.g., Oxford Combined Court Centre)
      const locationLink = page.getByRole('link', { name: /oxford combined court centre/i });
      await locationLink.click();

      // Verify navigation to search page with locationId parameter
      await expect(page).toHaveURL('/search?locationId=1');

      // Verify the location is pre-filled in the search page
      const locationInput = page.getByLabel(/search for a court or tribunal/i);
      await expect(locationInput).toHaveValue('Oxford Combined Court Centre');

      // Run accessibility checks after navigation
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .disableRules(['target-size', 'link-name'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('given user clicks back link', () => {
    test('should navigate to the search page', async ({ page }) => {
      await page.goto('/courts-tribunals-list');

      // Click the back link
      const backLink = page.locator('.govuk-back-link');
      await backLink.click();

      // Verify navigation to the search page
      await expect(page).toHaveURL('/search');
    });
  });

  test.describe('given locations are displayed', () => {
    test('should group locations alphabetically by first letter', async ({ page }) => {
      await page.goto('/courts-tribunals-list');

      // Check that locations are grouped under letter headings
      // We should see letter headings like 'B', 'C', 'M', 'O', 'S', etc.
      const letterB = page.getByRole('heading', { name: 'B', exact: true });
      const letterC = page.getByRole('heading', { name: 'C', exact: true });
      const letterM = page.getByRole('heading', { name: 'M', exact: true });
      const letterO = page.getByRole('heading', { name: 'O', exact: true });
      const letterS = page.getByRole('heading', { name: 'S', exact: true });

      // At least some of these should be visible based on our mock data
      const visibleLetters = await Promise.all([
        letterB.isVisible().catch(() => false),
        letterC.isVisible().catch(() => false),
        letterM.isVisible().catch(() => false),
        letterO.isVisible().catch(() => false),
        letterS.isVisible().catch(() => false)
      ]);

      expect(visibleLetters.some(visible => visible)).toBe(true);
    });

    test('should display all locations from mock data', async ({ page }) => {
      await page.goto('/courts-tribunals-list');

      // Check for specific locations from our mock data
      const oxfordLink = page.getByRole('link', { name: /oxford combined court centre/i });
      await expect(oxfordLink).toBeVisible();

      const sjpLink = page.getByRole('link', { name: /single justice procedure/i });
      await expect(sjpLink).toBeVisible();
    });
  });

  test.describe('given user toggles language', () => {
    test('should display Welsh content when language is changed to Welsh', async ({ page }) => {
      await page.goto('/courts-tribunals-list');

      // Find and click the Welsh language toggle
      const languageToggle = page.locator('.language');
      await expect(languageToggle).toBeVisible();
      await expect(languageToggle).toContainText('Cymraeg');

      await languageToggle.click();

      // Verify URL has Welsh parameter
      await expect(page).toHaveURL(/.*\?lng=cy/);

      // Verify language toggle now shows English option
      await expect(languageToggle).toContainText('English');

      // Check that page heading is still visible (content will be in Welsh)
      const heading = page.getByRole('heading', { level: 1 });
      await expect(heading).toBeVisible();

      // Check that location links are still visible
      const locationLinks = page.locator('.govuk-list a');
      await expect(locationLinks.first()).toBeVisible();

      // Verify back link is still visible
      const backLink = page.locator('.govuk-back-link');
      await expect(backLink).toBeVisible();

      // Run accessibility checks in Welsh
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .disableRules(['target-size', 'link-name'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should switch back to English when language toggle is clicked again', async ({ page }) => {
      await page.goto('/courts-tribunals-list?lng=cy');

      // Verify we're in Welsh mode
      const languageToggle = page.locator('.language');
      await expect(languageToggle).toContainText('English');

      // Switch back to English
      await languageToggle.click();

      // Verify URL has English parameter
      await expect(page).toHaveURL(/.*\?lng=en/);

      // Verify language toggle now shows Welsh option
      await expect(languageToggle).toContainText('Cymraeg');

      // Check that page elements are still visible
      const heading = page.getByRole('heading', { level: 1 });
      await expect(heading).toBeVisible();

      const locationLinks = page.locator('.govuk-list a');
      await expect(locationLinks.first()).toBeVisible();
    });
  });

  test.describe('given user uses keyboard navigation', () => {
    test('should be navigable using Tab key with visible focus indicators', async ({ page }) => {
      await page.goto('/courts-tribunals-list');

      // Start navigation with Tab
      await page.keyboard.press('Tab');

      // Skip link should be focused first
      let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBe('A');

      // Continue tabbing to reach back link
      await page.keyboard.press('Tab'); // Skip link navigation
      await page.keyboard.press('Tab'); // First navigation item
      await page.keyboard.press('Tab'); // Language toggle
      await page.keyboard.press('Tab'); // Header navigation
      await page.keyboard.press('Tab'); // Back link should be focused

      focusedElement = await page.evaluate(() => document.activeElement?.className);
      expect(focusedElement).toContain('govuk-back-link');

      // Tab to first location link
      await page.keyboard.press('Tab');

      // Check focus is on a location link
      focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.tagName === 'A' && el.getAttribute('href')?.includes('locationId');
      });
      expect(focusedElement).toBe(true);
    });

    test('should navigate to search page using Enter key on location link', async ({ page }) => {
      await page.goto('/courts-tribunals-list');

      // Tab to first location link
      await page.keyboard.press('Tab'); // Skip link
      await page.keyboard.press('Tab'); // Navigation
      await page.keyboard.press('Tab'); // Language toggle
      await page.keyboard.press('Tab'); // Header
      await page.keyboard.press('Tab'); // Back link
      await page.keyboard.press('Tab'); // First location link

      // Press Enter to navigate
      await page.keyboard.press('Enter');

      // Verify navigation to search page with locationId
      await expect(page).toHaveURL(/\/search\?locationId=\d+/);
    });
  });

  test.describe('given user completes full journey', () => {
    test('should maintain accessibility throughout location selection from A-Z list', async ({ page }) => {
      // Start on courts-tribunals-list page
      await page.goto('/courts-tribunals-list');

      // Initial accessibility check
      let accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .disableRules(['target-size', 'link-name'])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Click on a location
      const locationLink = page.getByRole('link', { name: /oxford combined court centre/i });
      await locationLink.click();

      // Verify navigation to search page
      await expect(page).toHaveURL('/search?locationId=1');

      // Accessibility check on search page with pre-selected location
      accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .disableRules(['target-size', 'link-name'])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Continue to summary page
      const continueButton = page.getByRole('button', { name: /continue/i });
      await continueButton.click();

      // Verify navigation to summary page
      await expect(page).toHaveURL('/summary-of-publications?locationId=1');

      // Final accessibility check on destination page
      accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .disableRules(['target-size', 'link-name'])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });
});
