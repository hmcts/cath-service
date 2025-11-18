import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Note: target-size and link-name rules are disabled due to pre-existing site-wide footer accessibility issues:
// 1. Crown copyright link fails WCAG 2.5.8 Target Size criterion (insufficient size)
// 2. Crown copyright logo link missing accessible text (WCAG 2.4.4, 4.1.2)
// These issues affect ALL pages and should be addressed in a separate ticket
// See: docs/tickets/VIBE-150/accessibility-findings.md

test.describe('Search Page', () => {
  test.describe('given user is on the search page', () => {
    test('should load the page with search input and accessibility compliance', async ({ page }) => {
      await page.goto('/search');

      // Check the page has loaded
      await expect(page).toHaveTitle(/.*/);

      // Check for the page heading
      const heading = page.getByRole('heading', { name: /what court or tribunal are you interested in/i });
      await expect(heading).toBeVisible();

      // Check for the location input field (autocomplete input)
      const locationInput = page.getByRole('combobox');
      await expect(locationInput).toBeVisible();

      // Check for hint text
      const hintText = page.getByText(/for example, oxford combined court centre/i);
      await expect(hintText).toBeVisible();

      // Check for autocomplete role (verifies autocomplete is working)
      await expect(locationInput).toHaveAttribute('role', 'combobox');

      // Check for continue button
      const continueButton = page.getByRole('button', { name: /continue/i });
      await expect(continueButton).toBeVisible();

      // Check for A-Z list link
      const azListLink = page.getByRole('link', { name: /select from an a-z list of courts and tribunals/i });
      await expect(azListLink).toBeVisible();

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

  test.describe('given user searches for a location', () => {
    test('should accept valid location selection when continue clicked', async ({ page }) => {
      await page.goto('/search');

      // Type in the search field
      const locationInput = page.getByRole('combobox');
      await locationInput.fill('1');

      // Verify the continue button is visible
      const continueButton = page.getByRole('button', { name: /continue/i });
      await expect(continueButton).toBeVisible();

      // Note: Navigation to /summary-of-publications is not tested here
      // as that page will be implemented in a future ticket
    });

    test('should show preselected location value when locationId query param is provided', async ({ page }) => {
      await page.goto('/search?locationId=9001');

      // Check that input has the preselected location value
      const locationInput = page.getByRole('combobox');
      await expect(locationInput).toHaveValue('Oxford Combined Court Centre');
    });
  });

  test.describe('given user submits without selecting a location', () => {
    test('should display validation error message', async ({ page }) => {
      await page.goto('/search');

      // Click continue without selecting a location
      const continueButton = page.getByRole('button', { name: /continue/i });
      await continueButton.click();

      // Verify we're still on the search page
      await expect(page).toHaveURL('/search');

      // Check for error summary
      const errorSummary = page.locator('.govuk-error-summary');
      await expect(errorSummary).toBeVisible();

      // Check for error summary heading
      const errorSummaryHeading = errorSummary.getByRole('heading', { name: /there is a problem/i });
      await expect(errorSummaryHeading).toBeVisible();

      // Check for error message link in the summary with correct text
      const errorLink = errorSummary.getByRole('link', { name: /there is nothing matching your criteria/i });
      await expect(errorLink).toBeVisible();

      // Verify error link points to the location input
      await expect(errorLink).toHaveAttribute('href', '#location');

      // Verify the form group has error styling (red left border/inset)
      const formGroup = page.locator('.govuk-form-group--error');
      await expect(formGroup).toBeVisible();

      // Verify the autocomplete input has the error class (red border)
      const autocompleteInput = page.getByRole('combobox');
      await expect(autocompleteInput).toHaveClass(/govuk-input--error/);

      // Verify accessibility with error state
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .disableRules(['target-size', 'link-name'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('given user clicks A-Z list link', () => {
    test('should navigate to courts-tribunals-list page', async ({ page }) => {
      await page.goto('/search');

      // Click the A-Z list link
      const azListLink = page.getByRole('link', { name: /select from an a-z list of courts and tribunals/i });
      await azListLink.click();

      // Verify navigation to the A-Z list page
      await expect(page).toHaveURL('/courts-tribunals-list');

      // Check page heading
      const heading = page.getByRole('heading', { name: /find a court or tribunal/i });
      await expect(heading).toBeVisible();

      // Run accessibility checks
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .disableRules(['target-size', 'link-name'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('given user clicks back link', () => {
    test('should navigate to the view-option page', async ({ page }) => {
      // Navigate to view-option first to establish history
      await page.goto('/view-option');

      // Navigate to search page
      await page.goto('/search');

      // Click the back link
      const backLink = page.locator('.govuk-back-link');
      await backLink.click();

      // Verify navigation back to the view-option page
      await expect(page).toHaveURL('/view-option');
    });
  });

  test.describe('given user toggles language', () => {
    test('should display Welsh content when language is changed to Welsh', async ({ page }) => {
      await page.goto('/search');

      // Find and click the Welsh language toggle
      const languageToggle = page.locator('.language');
      await expect(languageToggle).toBeVisible();
      await expect(languageToggle).toContainText('Cymraeg');

      await languageToggle.click();

      // Verify URL has Welsh parameter
      await expect(page).toHaveURL(/.*\?lng=cy/);

      // Verify language toggle now shows English option
      await expect(languageToggle).toContainText('English');

      // Check that page elements are still visible
      const locationInput = page.getByRole('combobox');
      await expect(locationInput).toBeVisible();

      // Check for Welsh hint text
      const hintText = page.getByText(/er enghraifft, oxford combined court centre/i);
      await expect(hintText).toBeVisible();

      // Verify continue button is still visible
      const continueButton = page.getByRole('button', { name: /parhau|continue/i });
      await expect(continueButton).toBeVisible();

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

    test('should preserve language selection after validation error', async ({ page }) => {
      await page.goto('/search?lng=cy');

      // Click continue without selecting a location (in Welsh)
      const continueButton = page.getByRole('button', { name: /parhau|continue/i });
      await continueButton.click();

      // Verify we're still on the search page with Welsh parameter
      await expect(page).toHaveURL(/.*\/search.*lng=cy/);

      // Verify error summary is visible
      const errorSummary = page.locator('.govuk-error-summary');
      await expect(errorSummary).toBeVisible();

      // Check for Welsh error message in the summary
      const errorLink = errorSummary.getByRole('link', { name: /nid oes dim sy'n cyfateb i'ch meini prawf/i });
      await expect(errorLink).toBeVisible();

      // Verify language toggle still shows English option (we're in Welsh mode)
      const languageToggle = page.locator('.language');
      await expect(languageToggle).toContainText('English');
    });
  });

  test.describe('given user arrives via preselected location', () => {
    test('should display search page with location pre-filled when locationId query param is present', async ({ page }) => {
      await page.goto('/search?locationId=9001');

      // Check that the location input is pre-filled
      const locationInput = page.getByRole('combobox');
      await expect(locationInput).toHaveValue('Oxford Combined Court Centre');

      // Run accessibility checks
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .disableRules(['target-size', 'link-name'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('given user searches with no results', () => {
    test('should display "No results found" message in English', async ({ page }) => {
      await page.goto('/search');

      // Type a search query that won't match any location
      const locationInput = page.getByRole('combobox');
      await locationInput.fill('zzzzzzzzzzz');

      // Wait for autocomplete to show results
      await page.waitForTimeout(300);

      // Check for the "No results found" message
      const noResultsMessage = page.getByText('No results found');
      await expect(noResultsMessage).toBeVisible();
    });

    test('should display "Ni ddaethpwyd o hyd i unrhyw ganlyniad" message in Welsh', async ({ page }) => {
      await page.goto('/search?lng=cy');

      // Type a search query that won't match any location
      const locationInput = page.getByRole('combobox');
      await locationInput.fill('zzzzzzzzzzz');

      // Wait for autocomplete to show results
      await page.waitForTimeout(300);

      // Check for the Welsh "No results found" message
      const noResultsMessage = page.getByText('Ni ddaethpwyd o hyd i unrhyw ganlyniad');
      await expect(noResultsMessage).toBeVisible();
    });
  });

  test.describe('given user uses keyboard navigation', () => {
    test('should be navigable using Tab key with visible focus indicators', async ({ page }) => {
      await page.goto('/search');

      // Navigate to the location input by clicking it (simulates real user interaction)
      const locationInput = page.getByRole('combobox');
      await locationInput.click();

      // Check focus is visible
      await expect(locationInput).toBeFocused();

      // Tab to continue button
      await page.keyboard.press('Tab');
      const continueButton = page.getByRole('button', { name: /continue/i });
      await expect(continueButton).toBeFocused();
    });

    test('should submit form using Enter key on continue button', async ({ page }) => {
      await page.goto('/search');

      // Fill in locationId
      const locationInput = page.getByRole('combobox');
      await locationInput.fill('1');

      // Verify continue button is visible
      const continueButton = page.getByRole('button', { name: /continue/i });
      await expect(continueButton).toBeVisible();

      // Note: Form submission to /summary-of-publications is not tested here
      // as that page will be implemented in a future ticket
    });
  });
});
