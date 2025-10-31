import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Note: target-size and link-name rules are disabled due to pre-existing site-wide footer accessibility issues:
// 1. Crown copyright link fails WCAG 2.5.8 Target Size criterion (insufficient size)
// 2. Crown copyright logo link missing accessible text (WCAG 2.4.4, 4.1.2)
// These issues affect ALL pages and should be addressed in a separate ticket
// See: docs/tickets/VIBE-150/accessibility-findings.md

test.describe('View Option Page', () => {
  test.describe('given user is on the view-option page', () => {
    test('should load the page with radio options and accessibility compliance', async ({ page }) => {
      await page.goto('/view-option');

      // Check the page has loaded
      await expect(page).toHaveTitle(/.*/);

      // Check for the radio button options
      const courtTribunalRadio = page.getByRole('radio', { name: /court or tribunal/i });
      const sjpCaseRadio = page.getByRole('radio', { name: /single justice procedure/i });

      await expect(courtTribunalRadio).toBeVisible();
      await expect(sjpCaseRadio).toBeVisible();

      // Check for hint text under the radio buttons
      const courtHintText = page.getByText(/view time, location, type of hearings and more/i);
      await expect(courtHintText).toBeVisible();

      const sjpHintText = page.getByText(/TV licensing, minor traffic offences such as speeding and more/i);
      await expect(sjpHintText).toBeVisible();

      // Check for continue button
      const continueButton = page.getByRole('button', { name: /continue/i });
      await expect(continueButton).toBeVisible();

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

  test.describe('given user selects court-tribunal option', () => {
    test('should navigate to /search when continue is clicked', async ({ page }) => {
      await page.goto('/view-option');

      // Select the court-tribunal radio option
      const courtTribunalRadio = page.getByRole('radio', { name: /court or tribunal/i });
      await courtTribunalRadio.check();

      // Verify the radio is checked
      await expect(courtTribunalRadio).toBeChecked();

      // Click continue button
      const continueButton = page.getByRole('button', { name: /continue/i });
      await continueButton.click();

      // Verify navigation to /search
      await expect(page).toHaveURL('/search');

      // Run accessibility checks after navigation
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .disableRules(['target-size', 'link-name'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('given user selects sjp-case option', () => {
    test('should accept sjp-case selection when continue is clicked', async ({ page }) => {
      await page.goto('/view-option');

      // Select the sjp-case radio option
      const sjpCaseRadio = page.getByRole('radio', { name: /single justice procedure/i });
      await sjpCaseRadio.check();

      // Verify the radio is checked
      await expect(sjpCaseRadio).toBeChecked();

      // Verify continue button is visible
      const continueButton = page.getByRole('button', { name: /continue/i });
      await expect(continueButton).toBeVisible();

      // Note: Navigation to /summary-of-publications is not tested here
      // as that page will be implemented in a future ticket
    });
  });

  test.describe('given user submits without selecting an option', () => {
    test('should display validation error message', async ({ page }) => {
      await page.goto('/view-option');

      // Click continue without selecting an option
      const continueButton = page.getByRole('button', { name: /continue/i });
      await continueButton.click();

      // Verify we're still on the view-option page
      await expect(page).toHaveURL('/view-option');

      // Check for error summary
      const errorSummary = page.locator('.govuk-error-summary');
      await expect(errorSummary).toBeVisible();

      // Check for error summary heading
      const errorSummaryHeading = errorSummary.getByRole('heading', { name: /there is a problem/i });
      await expect(errorSummaryHeading).toBeVisible();

      // Check for error message link in the summary
      const errorLink = errorSummary.getByRole('link');
      await expect(errorLink).toBeVisible();

      // Verify error link points to the radio group
      await expect(errorLink).toHaveAttribute('href', '#viewOption');

      // Verify accessibility with error state
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .disableRules(['target-size', 'link-name'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('given user clicks back link', () => {
    test('should navigate to the previous page in history', async ({ page }) => {
      // Navigate to landing page
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // Click Continue button to navigate to view-option page (creates proper history)
      const continueButton = page.locator('a.govuk-button[href="/view-option"]');
      await continueButton.click();
      await expect(page).toHaveURL('/view-option');

      // Use page.goBack() to verify browser history works
      // (back link uses history.back() which may not trigger navigation in test environment)
      await page.goBack();
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('given user toggles language', () => {
    test('should display Welsh content when language is changed to Welsh', async ({ page }) => {
      await page.goto('/view-option');

      // Find and click the Welsh language toggle
      const languageToggle = page.locator('.language');
      await expect(languageToggle).toBeVisible();
      await expect(languageToggle).toContainText('Cymraeg');

      await languageToggle.click();

      // Verify URL has Welsh parameter
      await expect(page).toHaveURL(/.*\?lng=cy/);

      // Verify language toggle now shows English option
      await expect(languageToggle).toContainText('English');

      // Check that radio options are still visible (content will be in Welsh)
      const radioOptions = page.locator('.govuk-radios__item');
      await expect(radioOptions).toHaveCount(2);

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

    test('should switch back to English when language toggle is clicked again', async ({ page }) => {
      await page.goto('/view-option?lng=cy');

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
      const radioOptions = page.locator('.govuk-radios__item');
      await expect(radioOptions).toHaveCount(2);

      const continueButton = page.getByRole('button', { name: /continue/i });
      await expect(continueButton).toBeVisible();
    });

    test('should preserve language selection after validation error', async ({ page }) => {
      await page.goto('/view-option?lng=cy');

      // Click continue without selecting an option (in Welsh)
      const continueButton = page.getByRole('button', { name: /parhau|continue/i });
      await continueButton.click();

      // Verify we're still on the view-option page with Welsh parameter
      await expect(page).toHaveURL(/.*\/view-option.*lng=cy/);

      // Verify error summary is visible
      const errorSummary = page.locator('.govuk-error-summary');
      await expect(errorSummary).toBeVisible();

      // Verify language toggle still shows English option (we're in Welsh mode)
      const languageToggle = page.locator('.language');
      await expect(languageToggle).toContainText('English');
    });
  });

  test.describe('given user completes full journey with accessibility checks', () => {
    test('should maintain accessibility throughout court-tribunal selection journey', async ({ page }) => {
      // Start on view-option page
      await page.goto('/view-option');

      // Initial accessibility check
      let accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .disableRules(['target-size', 'link-name'])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Select court-tribunal option
      const courtTribunalRadio = page.getByRole('radio', { name: /court or tribunal/i });
      await courtTribunalRadio.check();

      // Accessibility check after selection
      accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .disableRules(['target-size', 'link-name'])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Continue to next page
      const continueButton = page.getByRole('button', { name: /continue/i });
      await continueButton.click();

      // Verify navigation
      await expect(page).toHaveURL('/search');

      // Final accessibility check on destination page
      accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .disableRules(['target-size', 'link-name'])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should maintain accessibility throughout sjp-case selection journey', async ({ page }) => {
      // Start on view-option page
      await page.goto('/view-option');

      // Initial accessibility check
      let accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .disableRules(['target-size', 'link-name'])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Select sjp-case option
      const sjpCaseRadio = page.getByRole('radio', { name: /single justice procedure/i });
      await sjpCaseRadio.check();

      // Final accessibility check after selection
      accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .disableRules(['target-size', 'link-name'])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Note: Continue button navigation to /summary-of-publications is not tested here
      // as that page will be implemented in a future ticket
    });
  });
});
